/**
 * System Design Playground Bottleneck and Traffic Propagation Engine.
 * Evaluates node capacity ($C = \text{replicas} \times \text{capacityQps}$),
 * propagates target RPS from source ingress through topology edges,
 * computes utilization, identifies bottlenecks, and calculates dropped RPS.
 */

export interface SystemNodeData {
  id: string;
  type: string;
  label: string;
  replicas: number;
  capacityQps: number;
  latencyMs: number;
}

export interface SystemEdgeData {
  id: string;
  source: string;
  target: string;
}

export interface NodeHealthMetric {
  nodeId: string;
  totalCapacityQps: number;
  incomingRps: number;
  servedRps: number;
  droppedRps: number;
  utilizationPct: number;
  status: 'healthy' | 'warning' | 'bottleneck'; // green < 70%, yellow 70-100%, red > 100%
  recommendation?: string;
  // Enterprise Discrete-Event Queuing & Tail Latency Metrics
  queueDepth: number;
  activeWorkers: number;
  maxWorkers: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  cascadingRisk: 'low' | 'moderate' | 'high' | 'severe';
}

export interface EdgeTrafficMetric {
  edgeId: string;
  source: string;
  target: string;
  trafficRps: number;
  latencyMs: number;
  status: 'normal' | 'congested' | 'dropped';
}

export interface TopologySimulationResult {
  targetRps: number;
  systemThroughputRps: number;
  totalDroppedRps: number;
  isSystemOverloaded: boolean;
  nodeMetrics: Record<string, NodeHealthMetric>;
  edgeMetrics: Record<string, EdgeTrafficMetric>;
  bottleneckNodeIds: string[];
  overallP50LatencyMs: number;
  overallP95LatencyMs: number;
  overallP99LatencyMs: number;
}

export function evaluateBottlenecks(
  nodes: SystemNodeData[],
  edges: SystemEdgeData[],
  targetRps: number
): TopologySimulationResult {
  const nodeMap = new Map<string, SystemNodeData>();
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach((n) => {
    nodeMap.set(n.id, n);
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  });

  edges.forEach((e) => {
    if (adj.has(e.source) && inDegree.has(e.target)) {
      adj.get(e.source)!.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
  });

  // Calculate each node's total capacity C = replicas * capacityQps
  const capacityMap = new Map<string, number>();
  nodes.forEach((n) => {
    const totalCap = Math.max(1, n.replicas * Math.max(1, n.capacityQps));
    capacityMap.set(n.id, totalCap);
  });

  // Traffic propagation: BFS / Topological level traversal
  // Find source nodes (in-degree == 0, e.g. Clients / Route53)
  const incomingTrafficMap = new Map<string, number>();
  nodes.forEach((n) => incomingTrafficMap.set(n.id, 0));

  const sourceNodes = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0);
  const effectiveSources = sourceNodes.length > 0 ? sourceNodes : [nodes[0]];

  // Inject targetRps distributed evenly across source nodes
  const rpsPerSource = targetRps / Math.max(1, effectiveSources.length);
  effectiveSources.forEach((s) => {
    incomingTrafficMap.set(s.id, rpsPerSource);
  });

  // Simple topological queue
  const queue: string[] = effectiveSources.map((s) => s.id);
  const processed = new Set<string>();

  // Guard against infinite loop in case of cycles
  let iterations = 0;
  const maxIterations = nodes.length * 10;

  // Track edge traffic flows for dynamic edge particle animations
  const edgeTrafficMap = new Map<string, number>();
  edges.forEach((e) => edgeTrafficMap.set(e.id, 0));

  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const currId = queue.shift()!;
    processed.add(currId);

    const incoming = incomingTrafficMap.get(currId) || 0;
    const capacity = capacityMap.get(currId) || 1;
    // Served traffic is min(incoming, capacity)
    const served = Math.min(incoming, capacity);

    const outgoingEdges = edges.filter((e) => e.source === currId);
    if (outgoingEdges.length > 0) {
      // Distribute served traffic evenly across outgoing edges
      const trafficPerEdge = served / outgoingEdges.length;
      outgoingEdges.forEach((edge) => {
        edgeTrafficMap.set(edge.id, (edgeTrafficMap.get(edge.id) || 0) + trafficPerEdge);
        const targetId = edge.target;
        const existing = incomingTrafficMap.get(targetId) || 0;
        incomingTrafficMap.set(targetId, existing + trafficPerEdge);
        if (!queue.includes(targetId) && !processed.has(targetId)) {
          queue.push(targetId);
        }
      });
    }
  }

  // Build per-node metrics with discrete-event queuing and latency percentiles
  const nodeMetrics: Record<string, NodeHealthMetric> = {};
  const bottleneckNodeIds: string[] = [];
  let totalDroppedRps = 0;
  let maxP50 = 0;
  let maxP95 = 0;
  let maxP99 = 0;

  nodes.forEach((n) => {
    const incoming = Math.round(incomingTrafficMap.get(n.id) || 0);
    const capacity = capacityMap.get(n.id) || 1;
    const served = Math.min(incoming, capacity);
    const dropped = Math.max(0, incoming - capacity);
    const utilizationPct = Math.round((incoming / capacity) * 100);

    totalDroppedRps += dropped;

    let status: 'healthy' | 'warning' | 'bottleneck' = 'healthy';
    let recommendation: string | undefined = undefined;

    const maxWorkers = Math.max(10, n.replicas * 100);
    let activeWorkers = 0;
    let queueDepth = 0;
    let p50LatencyMs = n.latencyMs;
    let p95LatencyMs = Math.round(n.latencyMs * 1.25);
    let p99LatencyMs = Math.round(n.latencyMs * 1.6 + 2);
    let cascadingRisk: 'low' | 'moderate' | 'high' | 'severe' = 'low';

    if (utilizationPct > 100) {
      status = 'bottleneck';
      bottleneckNodeIds.push(n.id);
      const neededReplicas = Math.ceil(incoming / Math.max(1, n.capacityQps));
      recommendation = `Node is saturated (${utilizationPct}%). Scale from ${n.replicas} to ${neededReplicas} replicas to handle load.`;

      activeWorkers = maxWorkers;
      queueDepth = n.replicas * 500;
      p50LatencyMs = n.latencyMs * 2 + 80;
      p95LatencyMs = n.latencyMs * 3 + 350;
      p99LatencyMs = n.latencyMs * 5 + 1000;
      cascadingRisk = utilizationPct > 150 ? 'severe' : 'high';
    } else if (utilizationPct >= 70) {
      status = 'warning';
      recommendation = `High load (${utilizationPct}%). Consider horizontal autoscale or caching upstream.`;

      const rho = utilizationPct / 100;
      const wq = Math.round(n.latencyMs * (Math.pow(rho, 2) / (2 * (1 - rho * 0.95 + 0.05))));
      activeWorkers = Math.min(maxWorkers, Math.round(maxWorkers * rho));
      queueDepth = Math.min(n.replicas * 500, Math.round(incoming * (wq / 1000)));
      p50LatencyMs = n.latencyMs + Math.round(wq * 0.35);
      p95LatencyMs = Math.round(n.latencyMs * 1.5 + wq * 1.6);
      p99LatencyMs = Math.round(n.latencyMs * 2.2 + wq * 2.8 + 8);
      cascadingRisk = 'moderate';
    } else {
      activeWorkers = Math.round(maxWorkers * (utilizationPct / 100));
      queueDepth = 0;
      cascadingRisk = 'low';
    }

    maxP50 = Math.max(maxP50, p50LatencyMs);
    maxP95 = Math.max(maxP95, p95LatencyMs);
    maxP99 = Math.max(maxP99, p99LatencyMs);

    nodeMetrics[n.id] = {
      nodeId: n.id,
      totalCapacityQps: capacity,
      incomingRps: incoming,
      servedRps: served,
      droppedRps: dropped,
      utilizationPct,
      status,
      recommendation,
      queueDepth,
      activeWorkers,
      maxWorkers,
      p50LatencyMs,
      p95LatencyMs,
      p99LatencyMs,
      cascadingRisk,
    };
  });

  // Build edge traffic metrics
  const edgeMetrics: Record<string, EdgeTrafficMetric> = {};
  edges.forEach((e) => {
    const traffic = Math.round(edgeTrafficMap.get(e.id) || 0);
    const targetMetric = nodeMetrics[e.target];
    const sourceMetric = nodeMetrics[e.source];
    const avgLatency = (sourceMetric?.p50LatencyMs || 0) + (targetMetric?.p50LatencyMs || 0);
    let edgeStatus: 'normal' | 'congested' | 'dropped' = 'normal';
    if (targetMetric?.status === 'bottleneck') edgeStatus = 'dropped';
    else if (targetMetric?.status === 'warning') edgeStatus = 'congested';

    edgeMetrics[e.id] = {
      edgeId: e.id,
      source: e.source,
      target: e.target,
      trafficRps: traffic,
      latencyMs: avgLatency,
      status: edgeStatus,
    };
  });

  const systemThroughputRps = Math.max(0, targetRps - totalDroppedRps);

  return {
    targetRps,
    systemThroughputRps,
    totalDroppedRps,
    isSystemOverloaded: bottleneckNodeIds.length > 0,
    nodeMetrics,
    edgeMetrics,
    bottleneckNodeIds,
    overallP50LatencyMs: maxP50,
    overallP95LatencyMs: maxP95,
    overallP99LatencyMs: maxP99,
  };
}
