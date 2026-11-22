import { Node, Edge } from 'reactflow';
import { SystemNodeData } from '../../components/playground/SystemCustomNode';
import { TopologySimulationResult } from './bottleneck';

export interface AuditIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'info';
  title: string;
  description: string;
  recommendation: string;
  affectedNodeId?: string;
  affectedNodeLabel?: string;
}

export interface ArchitectureAuditReport {
  score: number; // 0 - 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  issues: AuditIssue[];
  summary: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    infoCount: number;
  };
}

export function auditArchitecture(
  nodes: Node<SystemNodeData>[],
  edges: Edge[],
  simulationResult?: TopologySimulationResult | null
): ArchitectureAuditReport {
  const issues: AuditIssue[] = [];

  if (nodes.length === 0) {
    return {
      score: 100,
      grade: 'A+',
      issues: [],
      summary: { criticalCount: 0, highCount: 0, mediumCount: 0, infoCount: 0 },
    };
  }

  // Map incoming and outgoing connections
  const incomingMap = new Map<string, string[]>();
  const outgoingMap = new Map<string, string[]>();
  nodes.forEach((n) => {
    incomingMap.set(n.id, []);
    outgoingMap.set(n.id, []);
  });

  edges.forEach((e) => {
    outgoingMap.get(e.source)?.push(e.target);
    incomingMap.get(e.target)?.push(e.source);
  });

  // Check 1: Dead / Offline nodes
  nodes.forEach((n) => {
    if ((n.data as any).isDead) {
      issues.push({
        id: `offline-${n.id}`,
        severity: 'critical',
        title: `Service Offline (${n.data.label})`,
        description: `Node '${n.data.label}' is marked dead or killed by chaos injection. All connected traffic will fail.`,
        recommendation: 'Restore the instance or activate automated failover.',
        affectedNodeId: n.id,
        affectedNodeLabel: n.data.label,
      });
    }
  });

  // Check 2: Bottlenecks & Dropped Traffic
  if (simulationResult) {
    simulationResult.bottleneckNodeIds.forEach((id) => {
      const metric = simulationResult.nodeMetrics[id];
      const node = nodes.find((n) => n.id === id);
      if (node && metric && metric.droppedRps > 0) {
        issues.push({
          id: `bottleneck-${id}`,
          severity: 'critical',
          title: `Capacity Exceeded: Dropping ${metric.droppedRps.toLocaleString()} RPS`,
          description: `'${node.data.label}' receives ${metric.incomingRps.toLocaleString()} RPS but can only process ${metric.totalCapacityQps.toLocaleString()} QPS.`,
          recommendation: `Scale out to at least ${Math.ceil(metric.incomingRps / (node.data.capacityQps || 5000))} replicas or upgrade machine tier.`,
          affectedNodeId: id,
          affectedNodeLabel: node.data.label,
        });
      }
    });
  }

  // Check 3: Single Point of Failure (SPOF) on Stateful Databases / Storage
  const databaseCategories = ['database', 'storage', 'sql', 'nosql', 'rdbms'];
  nodes.forEach((n) => {
    const isStateful =
      databaseCategories.some((cat) => (n.data.category || '').toLowerCase().includes(cat)) ||
      (n.data.label || '').toLowerCase().includes('database') ||
      (n.data.label || '').toLowerCase().includes('sql') ||
      (n.data.label || '').toLowerCase().includes('db') ||
      (n.data.label || '').toLowerCase().includes('postgres') ||
      (n.data.label || '').toLowerCase().includes('mysql');

    if (isStateful && (n.data.replicas || 1) <= 1) {
      issues.push({
        id: `spof-db-${n.id}`,
        severity: 'high',
        title: `Single Point of Failure: Stateful DB without Replicas`,
        description: `'${n.data.label}' has only 1 active replica. In case of host crash or hardware fault, the entire system faces total outage and data unavailability.`,
        recommendation: 'Increase replicas to >= 2 with primary-replica replication or multi-AZ clustering.',
        affectedNodeId: n.id,
        affectedNodeLabel: n.data.label,
      });
    }
  });

  // Check 4: Un-cached Database Reads Under Heavy Traffic
  const cacheCategories = ['cache', 'redis', 'memcached'];
  const hasCache = nodes.some(
    (n) =>
      cacheCategories.some((cat) => (n.data.category || '').toLowerCase().includes(cat)) ||
      (n.data.label || '').toLowerCase().includes('cache') ||
      (n.data.label || '').toLowerCase().includes('redis')
  );

  const databases = nodes.filter((n) => {
    const isStateful =
      databaseCategories.some((cat) => (n.data.category || '').toLowerCase().includes(cat)) ||
      (n.data.label || '').toLowerCase().includes('database') ||
      (n.data.label || '').toLowerCase().includes('db') ||
      (n.data.label || '').toLowerCase().includes('sql');
    return isStateful;
  });

  if (!hasCache && databases.length > 0 && simulationResult && (simulationResult.systemThroughputRps || 0) > 3000) {
    issues.push({
      id: 'missing-cache-tier',
      severity: 'medium',
      title: 'Missing In-Memory Caching Tier',
      description: `Direct database access observed under load (${simulationResult.systemThroughputRps.toLocaleString()} RPS) without Redis/Memcached cache layer. Database I/O saturation imminent.`,
      recommendation: 'Introduce a distributed Redis/Memcached cluster in front of primary databases with 80%+ cache hit ratio.',
    });
  }

  // Check 5: Clients Connecting Directly to Compute Without API Gateway / Load Balancer
  const clientNodes = nodes.filter((n) => {
    const cat = (n.data.category || '').toLowerCase();
    const lbl = (n.data.label || '').toLowerCase();
    return cat.includes('ingress') || lbl.includes('client') || lbl.includes('app') || lbl.includes('mobile') || lbl.includes('web');
  });

  const gatewayNodes = nodes.filter((n) => {
    const cat = (n.data.category || '').toLowerCase();
    const lbl = (n.data.label || '').toLowerCase();
    return cat.includes('gateway') || lbl.includes('gateway') || lbl.includes('load balancer') || lbl.includes('nlb') || lbl.includes('alb') || lbl.includes('envoy');
  });

  clientNodes.forEach((c) => {
    const outTargets = outgoingMap.get(c.id) || [];
    outTargets.forEach((targetId) => {
      const targetNode = nodes.find((n) => n.id === targetId);
      if (targetNode) {
        const isTargetGateway = gatewayNodes.some((g) => g.id === targetId);
        const isTargetCDN = (targetNode.data.category || '').toLowerCase().includes('cdn') || (targetNode.data.label || '').toLowerCase().includes('cdn');
        if (!isTargetGateway && !isTargetCDN) {
          issues.push({
            id: `direct-client-access-${c.id}-${targetId}`,
            severity: 'medium',
            title: `Unshielded Backend Exposure (${c.data.label} → ${targetNode.data.label})`,
            description: `Client communicates directly with internal backend '${targetNode.data.label}' without passing through an API Gateway or Load Balancer.`,
            recommendation: 'Route client ingress through an API Gateway (Envoy/Kong) or L7 Load Balancer for SSL termination, rate limiting, and auth.',
            affectedNodeId: targetId,
            affectedNodeLabel: targetNode.data.label,
          });
        }
      }
    });
  });

  // Check 6: Synchronous Direct Downstream to Third-Party Services
  const thirdPartyNodes = nodes.filter((n) => {
    const lbl = (n.data.label || '').toLowerCase();
    return lbl.includes('stripe') || lbl.includes('payment') || lbl.includes('email') || lbl.includes('sms') || lbl.includes('notification');
  });

  const queueNodes = nodes.filter((n) => {
    const cat = (n.data.category || '').toLowerCase();
    const lbl = (n.data.label || '').toLowerCase();
    return cat.includes('queue') || cat.includes('stream') || lbl.includes('kafka') || lbl.includes('sqs') || lbl.includes('rabbitmq');
  });

  thirdPartyNodes.forEach((tp) => {
    const sources = incomingMap.get(tp.id) || [];
    const hasQueueSource = sources.some((sId) => queueNodes.some((q) => q.id === sId));
    if (sources.length > 0 && !hasQueueSource) {
      issues.push({
        id: `sync-third-party-${tp.id}`,
        severity: 'info',
        title: `Synchronous Coupling to External Service (${tp.data.label})`,
        description: `External service '${tp.data.label}' is invoked synchronously. If the provider latency spikes, calling threads will block and cascade upstream.`,
        recommendation: 'Decouple with an asynchronous message queue (e.g., Kafka or SQS) with retry dead-letter queues.',
        affectedNodeId: tp.id,
        affectedNodeLabel: tp.data.label,
      });
    }
  });

  // Calculate Reliability Score
  let score = 100;
  issues.forEach((issue) => {
    if (issue.severity === 'critical') score -= 25;
    else if (issue.severity === 'high') score -= 15;
    else if (issue.severity === 'medium') score -= 8;
    else if (issue.severity === 'info') score -= 3;
  });
  score = Math.max(0, Math.min(100, score));

  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'A+';
  if (score >= 95) grade = 'A+';
  else if (score >= 85) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 55) grade = 'C';
  else if (score >= 40) grade = 'D';
  else grade = 'F';

  const summary = {
    criticalCount: issues.filter((i) => i.severity === 'critical').length,
    highCount: issues.filter((i) => i.severity === 'high').length,
    mediumCount: issues.filter((i) => i.severity === 'medium').length,
    infoCount: issues.filter((i) => i.severity === 'info').length,
  };

  return { score, grade, issues, summary };
}
