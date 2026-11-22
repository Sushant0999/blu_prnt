import { Node } from 'reactflow';
import { SystemNodeData } from '../../components/playground/SystemCustomNode';
import { MACHINE_TIERS, MachineTierId } from '../types/machineTiers';

export interface NodeCostBreakdown {
  nodeId: string;
  nodeLabel: string;
  tierId: MachineTierId;
  tierName: string;
  replicas: number;
  monthlyComputeUsd: number;
  monthlyStorageUsd: number;
  monthlyTotalUsd: number;
}

export interface ArchitectureCostEstimate {
  totalMonthlyUsd: number;
  computeCostUsd: number;
  storageCostUsd: number;
  networkEgressUsd: number;
  monthlyTotalRequests: number;
  costPerMillionRequests: number;
  nodeBreakdowns: NodeCostBreakdown[];
}

export function estimateArchitectureCost(
  nodes: Node<SystemNodeData>[],
  targetRps: number = 30000
): ArchitectureCostEstimate {
  let computeCostUsd = 0;
  let storageCostUsd = 0;
  const nodeBreakdowns: NodeCostBreakdown[] = [];

  nodes.forEach((n) => {
    const tierId: MachineTierId = (n.data.machineTier as MachineTierId) || 'standard';
    const tierDef = MACHINE_TIERS[tierId] || MACHINE_TIERS.standard;
    const replicas = Math.max(1, n.data.replicas || 1);

    const monthlyCompute = replicas * tierDef.monthlyCostUsd;

    // Estimate storage provisioned for stateful components (Databases, Queues, Storage)
    const isStateful =
      (n.data.category || '').toLowerCase().includes('database') ||
      (n.data.category || '').toLowerCase().includes('storage') ||
      (n.data.category || '').toLowerCase().includes('queue') ||
      (n.data.category || '').toLowerCase().includes('stream') ||
      (n.data.label || '').toLowerCase().includes('sql') ||
      (n.data.label || '').toLowerCase().includes('postgres') ||
      (n.data.label || '').toLowerCase().includes('kafka');

    // Provisioned 500GB gp3 SSD + high IOPS allowance: $50/replica
    const monthlyStorage = isStateful ? replicas * 50 : 0;
    const monthlyTotal = monthlyCompute + monthlyStorage;

    computeCostUsd += monthlyCompute;
    storageCostUsd += monthlyStorage;

    nodeBreakdowns.push({
      nodeId: n.id,
      nodeLabel: n.data.label,
      tierId,
      tierName: tierDef.name,
      replicas,
      monthlyComputeUsd: monthlyCompute,
      monthlyStorageUsd: monthlyStorage,
      monthlyTotalUsd: monthlyTotal,
    });
  });

  // Network Egress: Average 2.5 KB per HTTP transaction, $0.085 per GB egress on AWS/Cloudflare
  const secondsInMonth = 30 * 24 * 3600; // 2,592,000 seconds
  const monthlyTotalRequests = targetRps * secondsInMonth;
  const gigabytesEgress = (monthlyTotalRequests * 2.5) / (1024 * 1024);
  const networkEgressUsd = Math.round(gigabytesEgress * 0.085);

  const totalMonthlyUsd = Math.round(computeCostUsd + storageCostUsd + networkEgressUsd);
  const costPerMillionRequests =
    monthlyTotalRequests > 0
      ? Number(((totalMonthlyUsd / monthlyTotalRequests) * 1_000_000).toFixed(2))
      : 0;

  return {
    totalMonthlyUsd,
    computeCostUsd: Math.round(computeCostUsd),
    storageCostUsd: Math.round(storageCostUsd),
    networkEgressUsd,
    monthlyTotalRequests,
    costPerMillionRequests,
    nodeBreakdowns,
  };
}
