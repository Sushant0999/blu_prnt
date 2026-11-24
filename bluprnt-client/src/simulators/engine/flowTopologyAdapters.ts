import { FlowNode, FlowEdge, FlowPacket, FlowNodeStatus, FlowStatItem, FlowDiagramProps } from '../components/FlowDiagram';
import { OutcomeDef } from './types';

interface AdapterContext {
  simulatorId: string;
  modeId: string;
  liveState: any;
  latestOutcome?: OutcomeDef;
  rate: number;
  params: Record<string, any>;
  onTriggerFailure?: (actionId: string) => void;
  isPaused?: boolean;
}

/**
 * Creates dynamic animated packets based on traffic rate and latest outcome.
 */
function createSyntheticPackets(
  latestOutcome: OutcomeDef | undefined,
  targetEdgeId: string,
  totalEdges: FlowEdge[]
): FlowPacket[] {
  const packets: FlowPacket[] = [];
  const now = Date.now();

  // Packet on client to hub edge
  const clientEdge = totalEdges.find((e) => e.source === 'client');
  if (clientEdge) {
    const p1 = (now % 600) / 600;
    packets.push({
      id: 'pkt-client',
      edgeId: clientEdge.id,
      progress: p1,
      color: '#2e6930',
    });
  }

  // Packet on target edge based on outcome
  if (targetEdgeId) {
    const p2 = ((now + 300) % 600) / 600;
    packets.push({
      id: 'pkt-target',
      edgeId: targetEdgeId,
      progress: p2,
      color: latestOutcome?.id?.includes('fail') || latestOutcome?.id?.includes('throttle') || latestOutcome?.id?.includes('drop') ? '#ef4444' : '#2e6930',
    });
  }

  return packets;
}

export function getFlowDiagramProps(ctx: AdapterContext): FlowDiagramProps {
  const { simulatorId, modeId, liveState, latestOutcome, onTriggerFailure, isPaused } = ctx;

  // 1. LOAD BALANCER (Uses native logic state directly)
  if (simulatorId === 'load-balancer') {
    const nodes: FlowNode[] = liveState?.nodes || [
      { id: 'clients', label: 'Clients', kind: 'source' },
      { id: 'balancer', label: 'Balancer', kind: 'hub' },
      { id: 'srv1', label: 'srv1', kind: 'card' },
      { id: 'srv2', label: 'srv2', kind: 'card' },
      { id: 'srv3', label: 'srv3', kind: 'card' },
    ];
    const edges: FlowEdge[] = liveState?.edges || [
      { id: 'edge-client-balancer', source: 'clients', target: 'balancer' },
      { id: 'edge-balancer-srv1', source: 'balancer', target: 'srv1' },
      { id: 'edge-balancer-srv2', source: 'balancer', target: 'srv2' },
      { id: 'edge-balancer-srv3', source: 'balancer', target: 'srv3' },
    ];
    const packets: FlowPacket[] = liveState?.packets || [];
    const nodeStatus: Record<string, FlowNodeStatus> = liveState?.nodeStatus || {
      srv1: { active: 3, done: 5, load: 0.3, state: 'normal' },
      srv2: { active: 7, done: 0, load: 0.7, state: 'slow', stateLabel: 'SLOW' },
      srv3: { active: 3, done: 4, load: 0.3, state: 'normal' },
    };
    const stats: FlowStatItem[] = [
      { label: 'Handled', value: liveState?.stats?.handled ?? 0 },
      { label: 'In flight', value: liveState?.stats?.inFlight ?? 0 },
      { label: 'Imbalance', value: liveState?.stats?.imbalance ?? 0 },
    ];

    return {
      nodes,
      edges,
      packets,
      nodeStatus,
      stats,
      isPaused,
      onToggleNodeSlow: (nodeId) => onTriggerFailure?.(`toggle_slow_${nodeId}`),
    };
  }

  // 2. RATE LIMITER
  if (simulatorId === 'rate-limiter') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Clients', kind: 'source' },
      { id: 'limiter', label: 'Rate Limiter', kind: 'hub' },
      { id: 'allowed', label: '200 OK (Allowed)', kind: 'card' },
      { id: 'queue', label: 'Burst Queue', kind: 'card' },
      { id: 'throttled', label: '429 Throttled', kind: 'card' },
    ];
    const edges: FlowEdge[] = [
      { id: 'e-client-limiter', source: 'client', target: 'limiter' },
      { id: 'e-limiter-allowed', source: 'limiter', target: 'allowed' },
      { id: 'e-limiter-queue', source: 'limiter', target: 'queue' },
      { id: 'e-limiter-throttled', source: 'limiter', target: 'throttled' },
    ];

    const allowed = liveState?.allowed ?? 0;
    const throttled = liveState?.throttled ?? 0;
    const queueSize = liveState?.queue ?? 0;
    const tokens = liveState?.tokens ?? 20;
    const capacity = ctx.params?.capacity || 20;

    let targetEdge = 'e-limiter-allowed';
    if (latestOutcome?.id === 'throttled') targetEdge = 'e-limiter-throttled';
    if (latestOutcome?.id === 'queued') targetEdge = 'e-limiter-queue';

    const packets = createSyntheticPackets(latestOutcome, targetEdge, edges);

    const nodeStatus: Record<string, FlowNodeStatus> = {
      allowed: { active: 1, done: allowed, load: Math.min(1, tokens / capacity), state: 'normal' },
      queue: { active: queueSize, done: allowed, load: Math.min(1, queueSize / 25), state: queueSize > 15 ? 'slow' : 'normal' },
      throttled: { active: 0, done: throttled, load: Math.min(1, throttled / 50), state: throttled > 0 ? 'slow' : 'normal', stateLabel: throttled > 0 ? 'SLOW' : undefined },
    };

    const stats: FlowStatItem[] = [
      { label: 'Passed (200)', value: allowed },
      { label: 'Tokens Left', value: Math.round(tokens) },
      { label: 'Throttled (429)', value: throttled },
    ];

    return {
      nodes,
      edges,
      packets,
      nodeStatus,
      stats,
      isPaused,
      onToggleNodeSlow: () => onTriggerFailure?.('exhaust_tokens'),
    };
  }

  // 3. CONSISTENT HASHING
  if (simulatorId === 'consistent-hashing') {
    const rawNodes = liveState?.nodes || ['Node-1', 'Node-2', 'Node-3', 'Node-4'];
    const counts = liveState?.counts || {};
    const total = Object.values(counts).reduce((a: any, b: any) => Number(a) + Number(b), 0) || 1;

    const nodes: FlowNode[] = [
      { id: 'client', label: 'Clients', kind: 'source' },
      { id: 'hash_ring', label: 'Hash Ring', kind: 'hub' },
      ...rawNodes.slice(0, 3).map((n: string) => ({ id: n, label: n, kind: 'card' })),
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-ring', source: 'client', target: 'hash_ring' },
      ...rawNodes.slice(0, 3).map((n: string) => ({ id: `e-ring-${n}`, source: 'hash_ring', target: n })),
    ];

    const targetNode = rawNodes.find((n: string) => latestOutcome?.label?.includes(n)) || rawNodes[0];
    const targetEdge = `e-ring-${targetNode}`;
    const packets = createSyntheticPackets(latestOutcome, targetEdge, edges);

    const nodeStatus: Record<string, FlowNodeStatus> = {};
    rawNodes.slice(0, 3).forEach((n: string) => {
      const c = counts[n] || 0;
      nodeStatus[n] = {
        active: 1,
        done: c,
        load: Math.min(1, c / (total as number)),
        state: 'normal',
      };
    });

    const stats: FlowStatItem[] = [
      { label: 'Keys Dispatched', value: total },
      { label: 'Cluster Nodes', value: rawNodes.length },
      { label: 'Remapped Keys', value: liveState?.remappedCount ?? 0 },
    ];

    return {
      nodes,
      edges,
      packets,
      nodeStatus,
      stats,
      isPaused,
      onToggleNodeSlow: (n) => onTriggerFailure?.('kill_node_3'),
    };
  }

  // 4. CACHE POLICIES
  if (simulatorId === 'cache-policies') {
    const hits = liveState?.hits ?? 0;
    const misses = liveState?.misses ?? 0;
    const evictions = liveState?.evictions ?? 0;
    const size = liveState?.size ?? 0;
    const capacity = liveState?.capacity ?? 20;

    const nodes: FlowNode[] = [
      { id: 'client', label: 'Client App', kind: 'source' },
      { id: 'cache_ctrl', label: 'Cache Engine', kind: 'hub' },
      { id: 'ram_hits', label: 'RAM Hit (1ms)', kind: 'card' },
      { id: 'db_misses', label: 'Disk Miss (50ms)', kind: 'card' },
      { id: 'evictions', label: 'Eviction Pool', kind: 'card' },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-cache', source: 'client', target: 'cache_ctrl' },
      { id: 'e-cache-hits', source: 'cache_ctrl', target: 'ram_hits' },
      { id: 'e-cache-misses', source: 'cache_ctrl', target: 'db_misses' },
      { id: 'e-cache-evict', source: 'cache_ctrl', target: 'evictions' },
    ];

    const isHit = latestOutcome?.id?.includes('hit');
    const targetEdge = isHit ? 'e-cache-hits' : 'e-cache-misses';
    const packets = createSyntheticPackets(latestOutcome, targetEdge, edges);

    const nodeStatus: Record<string, FlowNodeStatus> = {
      ram_hits: { active: 1, done: hits, load: Math.min(1, size / capacity), state: 'normal' },
      db_misses: { active: 0, done: misses, load: Math.min(1, misses / 50), state: misses > 10 ? 'slow' : 'normal' },
      evictions: { active: 0, done: evictions, load: Math.min(1, evictions / 30), state: evictions > 5 ? 'slow' : 'normal', stateLabel: evictions > 5 ? 'SLOW' : undefined },
    };

    const stats: FlowStatItem[] = [
      { label: 'Cache Hits', value: hits },
      { label: 'Cache Misses', value: misses },
      { label: 'Evictions', value: evictions },
    ];

    return {
      nodes,
      edges,
      packets,
      nodeStatus,
      stats,
      isPaused,
      onToggleNodeSlow: () => onTriggerFailure?.('trigger_stampede'),
    };
  }

  // 5. BLOOM FILTER
  if (simulatorId === 'bloom-filter') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Key Query', kind: 'source' },
      { id: 'bloom_hashes', label: 'Bloom Hash', kind: 'hub' },
      { id: 'filter_saved', label: 'Def. Not in Set', kind: 'card' },
      { id: 'probable_hit', label: 'Probable Member', kind: 'card' },
      { id: 'false_pos', label: 'False Positive', kind: 'card' },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-bloom', source: 'client', target: 'bloom_hashes' },
      { id: 'e-bloom-saved', source: 'bloom_hashes', target: 'filter_saved' },
      { id: 'e-bloom-hit', source: 'bloom_hashes', target: 'probable_hit' },
      { id: 'e-bloom-fp', source: 'bloom_hashes', target: 'false_pos' },
    ];

    const isFilter = latestOutcome?.id === 'def_not_in_set';
    const targetEdge = isFilter ? 'e-bloom-saved' : 'e-bloom-hit';
    const packets = createSyntheticPackets(latestOutcome, targetEdge, edges);

    const nodeStatus: Record<string, FlowNodeStatus> = {
      filter_saved: { active: 1, done: liveState?.filteredCount ?? 45, load: 0.8, state: 'normal' },
      probable_hit: { active: 1, done: liveState?.truePositiveCount ?? 12, load: 0.4, state: 'normal' },
      false_pos: { active: 0, done: liveState?.fpCount ?? 0, load: 0.1, state: 'normal' },
    };

    const stats: FlowStatItem[] = [
      { label: 'Disk Bypassed', value: liveState?.filteredCount ?? 45 },
      { label: 'Hash Lookups', value: liveState?.totalQueries ?? 60 },
      { label: 'False Positives', value: liveState?.fpCount ?? 0 },
    ];

    return {
      nodes,
      edges,
      packets,
      nodeStatus,
      stats,
      isPaused,
      onToggleNodeSlow: () => onTriggerFailure?.('saturate_filter'),
    };
  }

  // 6. CIRCUIT BREAKER
  if (simulatorId === 'circuit-breaker') {
    const cbState = liveState?.state || 'CLOSED';
    const isTripped = cbState === 'OPEN';
    const isHalfOpen = cbState === 'HALF_OPEN';

    const nodes: FlowNode[] = [
      { id: 'client', label: 'Clients', kind: 'source' },
      { id: 'breaker', label: `Breaker (${cbState})`, kind: 'hub' },
      { id: 'upstream', label: 'Upstream (200)', kind: 'card' },
      { id: 'fallback', label: 'Fallback Cache', kind: 'card' },
      { id: 'fast_fail', label: 'Fast-Fail (503)', kind: 'card' },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-breaker', source: 'client', target: 'breaker' },
      { id: 'e-breaker-upstream', source: 'breaker', target: 'upstream' },
      { id: 'e-breaker-fallback', source: 'breaker', target: 'fallback' },
      { id: 'e-breaker-fastfail', source: 'breaker', target: 'fast_fail' },
    ];

    const targetEdge = isTripped ? 'e-breaker-fastfail' : 'e-breaker-upstream';
    const packets = createSyntheticPackets(latestOutcome, targetEdge, edges);

    const nodeStatus: Record<string, FlowNodeStatus> = {
      upstream: { active: isTripped ? 0 : 2, done: liveState?.calls ?? 10, load: isTripped ? 0 : 0.4, state: isTripped ? 'slow' : 'normal' },
      fallback: { active: 1, done: 4, load: 0.2, state: 'normal' },
      fast_fail: {
        active: isTripped ? 8 : 0,
        done: liveState?.fastFails ?? 0,
        load: isTripped ? 1 : 0,
        state: isTripped ? 'slow' : 'normal',
        stateLabel: isTripped ? 'SLOW' : undefined,
      },
    };

    const stats: FlowStatItem[] = [
      { label: 'Circuit State', value: cbState },
      { label: 'Fast-Failed', value: liveState?.fastFails ?? 0 },
      { label: 'Trips Count', value: liveState?.trips ?? 0 },
    ];

    return {
      nodes,
      edges,
      packets,
      nodeStatus,
      stats,
      isPaused,
      onToggleNodeSlow: () => onTriggerFailure?.('crash_downstream'),
    };
  }

  // 7. MESSAGE QUEUE
  if (simulatorId === 'message-queue') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Producers', kind: 'source' },
      { id: 'broker', label: 'Broker Topic', kind: 'hub' },
      { id: 'c1', label: 'Consumer Pod 1', kind: 'card' },
      { id: 'c2', label: 'Consumer Pod 2', kind: 'card' },
      { id: 'dlq', label: 'Dead Letter Queue', kind: 'card' },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-broker', source: 'client', target: 'broker' },
      { id: 'e-broker-c1', source: 'broker', target: 'c1' },
      { id: 'e-broker-c2', source: 'broker', target: 'c2' },
      { id: 'e-broker-dlq', source: 'broker', target: 'dlq' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-broker-c1', edges);

    const nodeStatus: Record<string, FlowNodeStatus> = {
      c1: { active: 3, done: liveState?.processed ?? 25, load: 0.35, state: 'normal' },
      c2: { active: 2, done: liveState?.processed ?? 20, load: 0.25, state: 'normal' },
      dlq: { active: 0, done: 0, load: 0, state: 'normal' },
    };

    const stats: FlowStatItem[] = [
      { label: 'Processed', value: liveState?.processed ?? 45 },
      { label: 'Queue Depth', value: liveState?.queueLength ?? 5 },
      { label: 'Consumer Lag', value: `${liveState?.lag ?? 2} ms` },
    ];

    return {
      nodes,
      edges,
      packets,
      nodeStatus,
      stats,
      isPaused,
      onToggleNodeSlow: () => onTriggerFailure?.('stall_consumer_1'),
    };
  }

  // 8. CDN EDGE CACHING
  if (simulatorId === 'cdn-edge-caching') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Global Users', kind: 'source' },
      { id: 'anycast', label: 'Anycast DNS', kind: 'hub' },
      { id: 'edge_pop', label: 'Edge POP (1ms)', kind: 'card' },
      { id: 'shield', label: 'Origin Shield', kind: 'card' },
      { id: 'origin_dc', label: 'Origin DC (150ms)', kind: 'card' },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-dns', source: 'client', target: 'anycast' },
      { id: 'e-dns-pop', source: 'anycast', target: 'edge_pop' },
      { id: 'e-dns-shield', source: 'anycast', target: 'shield' },
      { id: 'e-dns-origin', source: 'anycast', target: 'origin_dc' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-dns-pop', edges);

    const nodeStatus: Record<string, FlowNodeStatus> = {
      edge_pop: { active: 2, done: liveState?.edgeHits ?? 30, load: 0.4, state: 'normal' },
      shield: { active: 1, done: 8, load: 0.2, state: 'normal' },
      origin_dc: { active: 0, done: liveState?.originFetches ?? 4, load: 0.1, state: 'normal' },
    };

    const stats: FlowStatItem[] = [
      { label: 'Edge Hits', value: liveState?.edgeHits ?? 30 },
      { label: 'Cache Hit %', value: `${liveState?.hitRatio ?? 88}%` },
      { label: 'Origin Misses', value: liveState?.originFetches ?? 4 },
    ];

    return {
      nodes,
      edges,
      packets,
      nodeStatus,
      stats,
      isPaused,
      onToggleNodeSlow: () => onTriggerFailure?.('purge_edge_cache'),
    };
  }

  // 9. SHARDING & PARTITIONING
  if (simulatorId === 'sharding-partitioning') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Client App', kind: 'source' },
      { id: 'router', label: 'Shard Router', kind: 'hub' },
      { id: 'shard_a', label: 'Shard A (0-100)', kind: 'card' },
      { id: 'shard_b', label: 'Shard B (101-200)', kind: 'card' },
      { id: 'shard_c', label: 'Shard C (201-300)', kind: 'card' },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-router', source: 'client', target: 'router' },
      { id: 'e-router-sa', source: 'router', target: 'shard_a' },
      { id: 'e-router-sb', source: 'router', target: 'shard_b' },
      { id: 'e-router-sc', source: 'router', target: 'shard_c' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-router-sb', edges);

    const nodeStatus: Record<string, FlowNodeStatus> = {
      shard_a: { active: 2, done: 18, load: 0.35, state: 'normal' },
      shard_b: { active: 3, done: 22, load: 0.45, state: 'normal' },
      shard_c: { active: 1, done: 14, load: 0.25, state: 'normal' },
    };

    const stats: FlowStatItem[] = [
      { label: 'Keys Sharded', value: liveState?.totalKeys ?? 54 },
      { label: 'Partitions', value: 3 },
      { label: 'Rebalanced', value: liveState?.rebalanced ?? 0 },
    ];

    return {
      nodes,
      edges,
      packets,
      nodeStatus,
      stats,
      isPaused,
      onToggleNodeSlow: () => onTriggerFailure?.('hotspot_shard_b'),
    };
  }

  // 10. REPLICATION
  if (simulatorId === 'replication') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Client Writes', kind: 'source' },
      { id: 'primary', label: 'Primary Node', kind: 'hub' },
      { id: 'rep_1', label: 'Replica A (Sync)', kind: 'card' },
      { id: 'rep_2', label: 'Replica B (Async)', kind: 'card' },
      { id: 'rep_3', label: 'Replica C (Read)', kind: 'card' },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-primary', source: 'client', target: 'primary' },
      { id: 'e-primary-r1', source: 'primary', target: 'rep_1' },
      { id: 'e-primary-r2', source: 'primary', target: 'rep_2' },
      { id: 'e-primary-r3', source: 'primary', target: 'rep_3' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-primary-r1', edges);

    const nodeStatus: Record<string, FlowNodeStatus> = {
      rep_1: { active: 1, done: 24, load: 0.3, state: 'normal' },
      rep_2: { active: 2, done: 22, load: 0.4, state: 'normal' },
      rep_3: { active: 1, done: 24, load: 0.3, state: 'normal' },
    };

    const stats: FlowStatItem[] = [
      { label: 'Committed', value: liveState?.committed ?? 24 },
      { label: 'Replica Acks', value: liveState?.replicaAcks ?? 3 },
      { label: 'Replication Lag', value: `${liveState?.masterLag ?? 4} ms` },
    ];

    return {
      nodes,
      edges,
      packets,
      nodeStatus,
      stats,
      isPaused,
      onToggleNodeSlow: () => onTriggerFailure?.('delay_replica_2'),
    };
  }

  // 11. RAFT CONSENSUS
  if (simulatorId === 'raft-consensus') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Client Proposal', kind: 'source' },
      { id: 'leader', label: 'Raft Leader', kind: 'hub' },
      { id: 'f1', label: 'Follower 1', kind: 'card' },
      { id: 'f2', label: 'Follower 2', kind: 'card' },
      { id: 'f3', label: 'Follower 3', kind: 'card' },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-leader', source: 'client', target: 'leader' },
      { id: 'e-leader-f1', source: 'leader', target: 'f1' },
      { id: 'e-leader-f2', source: 'leader', target: 'f2' },
      { id: 'e-leader-f3', source: 'leader', target: 'f3' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-leader-f1', edges);

    const nodeStatus: Record<string, FlowNodeStatus> = {
      f1: { active: 1, done: liveState?.commitIndex ?? 12, load: 0.4, state: 'normal' },
      f2: { active: 1, done: liveState?.commitIndex ?? 12, load: 0.4, state: 'normal' },
      f3: { active: 1, done: liveState?.commitIndex ?? 11, load: 0.35, state: 'normal' },
    };

    const stats: FlowStatItem[] = [
      { label: 'Commit Index', value: liveState?.commitIndex ?? 12 },
      { label: 'Current Term', value: liveState?.term ?? 1 },
      { label: 'Quorum Peers', value: liveState?.peers ?? '3 / 3' },
    ];

    return {
      nodes,
      edges,
      packets,
      nodeStatus,
      stats,
      isPaused,
      onToggleNodeSlow: () => onTriggerFailure?.('isolate_partition'),
    };
  }

  // 12. DISTRIBUTED TRANSACTIONS
  if (simulatorId === 'distributed-transactions') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Checkout', kind: 'source' },
      { id: 'coordinator', label: '2PC Coordinator', kind: 'hub' },
      { id: 'pay', label: 'Payment Svc', kind: 'card' },
      { id: 'order', label: 'Order Svc', kind: 'card' },
      { id: 'inv', label: 'Inventory Svc', kind: 'card' },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-coord', source: 'client', target: 'coordinator' },
      { id: 'e-coord-pay', source: 'coordinator', target: 'pay' },
      { id: 'e-coord-order', source: 'coordinator', target: 'order' },
      { id: 'e-coord-inv', source: 'coordinator', target: 'inv' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-coord-pay', edges);

    const nodeStatus: Record<string, FlowNodeStatus> = {
      pay: { active: 1, done: liveState?.committed ?? 15, load: 0.3, state: 'normal' },
      order: { active: 1, done: liveState?.committed ?? 15, load: 0.3, state: 'normal' },
      inv: { active: 1, done: liveState?.committed ?? 15, load: 0.3, state: 'normal' },
    };

    const stats: FlowStatItem[] = [
      { label: 'Committed (2PC)', value: liveState?.committed ?? 15 },
      { label: 'Active Tx', value: liveState?.activeTxs ?? 2 },
      { label: 'Aborted / Rollback', value: liveState?.aborted ?? 0 },
    ];

    return {
      nodes,
      edges,
      packets,
      nodeStatus,
      stats,
      isPaused,
      onToggleNodeSlow: () => onTriggerFailure?.('fail_participant'),
    };
  }

  // 13. RETRY STRATEGIES
  if (simulatorId === 'retry-strategies') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Requests', kind: 'source' },
      { id: 'retry_policy', label: 'Retry Policy', kind: 'hub' },
      { id: 'success_200', label: 'Immediate (200)', kind: 'card' },
      { id: 'recovered', label: 'Recovered Retry', kind: 'card' },
      { id: 'dlq_drop', label: 'Exhausted (DLQ)', kind: 'card' },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-retry', source: 'client', target: 'retry_policy' },
      { id: 'e-retry-s200', source: 'retry_policy', target: 'success_200' },
      { id: 'e-retry-recov', source: 'retry_policy', target: 'recovered' },
      { id: 'e-retry-dlq', source: 'retry_policy', target: 'dlq_drop' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-retry-s200', edges);

    const nodeStatus: Record<string, FlowNodeStatus> = {
      success_200: { active: 2, done: liveState?.successes ?? 28, load: 0.4, state: 'normal' },
      recovered: { active: 1, done: liveState?.retries ?? 6, load: 0.25, state: 'normal' },
      dlq_drop: { active: 0, done: liveState?.dlq ?? 1, load: 0.1, state: 'normal' },
    };

    const stats: FlowStatItem[] = [
      { label: 'Successes (200)', value: liveState?.successes ?? 28 },
      { label: 'Retries Active', value: liveState?.retries ?? 6 },
      { label: 'Dead Letter DLQ', value: liveState?.dlq ?? 1 },
    ];

    return {
      nodes,
      edges,
      packets,
      nodeStatus,
      stats,
      isPaused,
      onToggleNodeSlow: () => onTriggerFailure?.('outage_spike'),
    };
  }

  // 14. IDEMPOTENCY & DELIVERY
  if (simulatorId === 'idempotency-delivery') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'API Calls', kind: 'source' },
      { id: 'idem_guard', label: 'Idempotency Key', kind: 'hub' },
      { id: 'proc_new', label: 'Processed Fresh', kind: 'card' },
      { id: 'dedup_safe', label: 'Deduped (Cached)', kind: 'card' },
      { id: 'dropped_dup', label: 'Duplicate Drop', kind: 'card' },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-idem', source: 'client', target: 'idem_guard' },
      { id: 'e-idem-new', source: 'idem_guard', target: 'proc_new' },
      { id: 'e-idem-dedup', source: 'idem_guard', target: 'dedup_safe' },
      { id: 'e-idem-drop', source: 'idem_guard', target: 'dropped_dup' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-idem-new', edges);

    const nodeStatus: Record<string, FlowNodeStatus> = {
      proc_new: { active: 1, done: liveState?.uniqueProcessed ?? 32, load: 0.4, state: 'normal' },
      dedup_safe: { active: 1, done: liveState?.deduplicated ?? 14, load: 0.3, state: 'normal' },
      dropped_dup: { active: 0, done: liveState?.dropped ?? 0, load: 0, state: 'normal' },
    };

    const stats: FlowStatItem[] = [
      { label: 'Fresh Processed', value: liveState?.uniqueProcessed ?? 32 },
      { label: 'Deduped Safely', value: liveState?.deduplicated ?? 14 },
      { label: 'Duplicates', value: liveState?.dropped ?? 0 },
    ];

    return {
      nodes,
      edges,
      packets,
      nodeStatus,
      stats,
      isPaused,
      onToggleNodeSlow: () => onTriggerFailure?.('burst_duplicates'),
    };
  }

  // 15. AUTOSCALING & BACKPRESSURE
  if (simulatorId === 'autoscaling-backpressure') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Ingress Stream', kind: 'source' },
      { id: 'hpa', label: 'Autoscaler (HPA)', kind: 'hub' },
      { id: 'pod1', label: 'Worker Pod 1', kind: 'card' },
      { id: 'pod2', label: 'Worker Pod 2', kind: 'card' },
      { id: 'pod3', label: 'Worker Pod 3', kind: 'card' },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-hpa', source: 'client', target: 'hpa' },
      { id: 'e-hpa-p1', source: 'hpa', target: 'pod1' },
      { id: 'e-hpa-p2', source: 'hpa', target: 'pod2' },
      { id: 'e-hpa-p3', source: 'hpa', target: 'pod3' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-hpa-p1', edges);

    const nodeStatus: Record<string, FlowNodeStatus> = {
      pod1: { active: 4, done: 20, load: 0.65, state: 'normal' },
      pod2: { active: 3, done: 18, load: 0.55, state: 'normal' },
      pod3: { active: 2, done: 12, load: 0.35, state: 'normal' },
    };

    const stats: FlowStatItem[] = [
      { label: 'Active Pods', value: liveState?.currentInstances ?? 3 },
      { label: 'Cluster CPU', value: `${liveState?.cpuLoad ?? 58}%` },
      { label: 'Queue Buffer', value: liveState?.queuedRequests ?? 6 },
    ];

    return {
      nodes,
      edges,
      packets,
      nodeStatus,
      stats,
      isPaused,
      onToggleNodeSlow: () => onTriggerFailure?.('surge_pressure'),
    };
  }

  // 16. STORAGE ENGINES & INDEXES
  if (simulatorId === 'storage-indexes') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Query Engine', kind: 'source' },
      { id: 'idx_router', label: 'Index Selector', kind: 'hub' },
      { id: 'btree_leaf', label: 'B+ Tree Leaf', kind: 'card' },
      { id: 'data_page', label: 'Clustered Page', kind: 'card' },
      { id: 'page_split', label: 'Page Splits', kind: 'card' },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-idx', source: 'client', target: 'idx_router' },
      { id: 'e-idx-leaf', source: 'idx_router', target: 'btree_leaf' },
      { id: 'e-idx-page', source: 'idx_router', target: 'data_page' },
      { id: 'e-idx-split', source: 'idx_router', target: 'page_split' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-idx-leaf', edges);

    const nodeStatus: Record<string, FlowNodeStatus> = {
      btree_leaf: { active: 1, done: liveState?.total ?? 35, load: 0.45, state: 'normal' },
      data_page: { active: 1, done: liveState?.total ?? 35, load: 0.45, state: 'normal' },
      page_split: { active: 0, done: liveState?.events ?? 2, load: 0.1, state: 'normal' },
    };

    const stats: FlowStatItem[] = [
      { label: 'Index Searches', value: liveState?.total ?? 35 },
      { label: 'Leaf Splits', value: liveState?.events ?? 2 },
      { label: 'Read Latency', value: '1.2 ms' },
    ];

    return {
      nodes,
      edges,
      packets,
      nodeStatus,
      stats,
      isPaused,
      onToggleNodeSlow: () => onTriggerFailure?.('force_split'),
    };
  }

  // 17. LSM TREE
  if (simulatorId === 'lsm-tree') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Write Stream', kind: 'source' },
      { id: 'memtable', label: 'MemTable (WAL)', kind: 'hub' },
      { id: 'sstable_l0', label: 'SSTable Level 0', kind: 'card' },
      { id: 'sstable_l1', label: 'SSTable Level 1', kind: 'card' },
      { id: 'compactions', label: 'Compaction Pool', kind: 'card' },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-mem', source: 'client', target: 'memtable' },
      { id: 'e-mem-l0', source: 'memtable', target: 'sstable_l0' },
      { id: 'e-mem-l1', source: 'memtable', target: 'sstable_l1' },
      { id: 'e-mem-comp', source: 'memtable', target: 'compactions' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-mem-l0', edges);

    const nodeStatus: Record<string, FlowNodeStatus> = {
      sstable_l0: { active: 2, done: liveState?.l0Count ?? 4, load: 0.4, state: 'normal' },
      sstable_l1: { active: 1, done: liveState?.l1Count ?? 8, load: 0.3, state: 'normal' },
      compactions: { active: 1, done: liveState?.compactions ?? 2, load: 0.2, state: 'normal' },
    };

    const stats: FlowStatItem[] = [
      { label: 'Flushed Records', value: liveState?.flushed ?? 40 },
      { label: 'L0 SSTables', value: liveState?.l0Count ?? 4 },
      { label: 'Compactions', value: liveState?.compactions ?? 2 },
    ];

    return {
      nodes,
      edges,
      packets,
      nodeStatus,
      stats,
      isPaused,
      onToggleNodeSlow: () => onTriggerFailure?.('force_compaction'),
    };
  }

  // 18. GOSSIP PROTOCOL
  if (simulatorId === 'gossip-protocol') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Seed Gossip', kind: 'source' },
      { id: 'broadcaster', label: 'Anti-Entropy', kind: 'hub' },
      { id: 'peer_1', label: 'Peer Node 1', kind: 'card' },
      { id: 'peer_2', label: 'Peer Node 2', kind: 'card' },
      { id: 'peer_3', label: 'Peer Node 3', kind: 'card' },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-broadcaster', source: 'client', target: 'broadcaster' },
      { id: 'e-broad-p1', source: 'broadcaster', target: 'peer_1' },
      { id: 'e-broad-p2', source: 'broadcaster', target: 'peer_2' },
      { id: 'e-broad-p3', source: 'broadcaster', target: 'peer_3' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-broad-p1', edges);

    const nodeStatus: Record<string, FlowNodeStatus> = {
      peer_1: { active: 1, done: 16, load: 0.8, state: 'normal' },
      peer_2: { active: 1, done: 16, load: 0.8, state: 'normal' },
      peer_3: { active: 1, done: 14, load: 0.7, state: 'normal' },
    };

    const stats: FlowStatItem[] = [
      { label: 'Converged Nodes', value: `${liveState?.infectedNodes ?? 7} / ${liveState?.totalNodes ?? 8}` },
      { label: 'Rounds Survived', value: liveState?.rounds ?? 4 },
      { label: 'Convergence %', value: `${liveState?.convergencePct ?? 87}%` },
    ];

    return {
      nodes,
      edges,
      packets,
      nodeStatus,
      stats,
      isPaused,
      onToggleNodeSlow: () => onTriggerFailure?.('partition_cluster'),
    };
  }

  // Fallback for any other custom simulator
  const nodes: FlowNode[] = [
    { id: 'client', label: 'Client Ingress', kind: 'source' },
    { id: 'engine', label: 'Processing Engine', kind: 'hub' },
    { id: 'n1', label: 'Node 1', kind: 'card' },
    { id: 'n2', label: 'Node 2', kind: 'card' },
    { id: 'n3', label: 'Node 3', kind: 'card' },
  ];
  const edges: FlowEdge[] = [
    { id: 'e-in', source: 'client', target: 'engine' },
    { id: 'e-1', source: 'engine', target: 'n1' },
    { id: 'e-2', source: 'engine', target: 'n2' },
    { id: 'e-3', source: 'engine', target: 'n3' },
  ];

  return {
    nodes,
    edges,
    packets: createSyntheticPackets(latestOutcome, 'e-1', edges),
    nodeStatus: {
      n1: { active: 1, done: 10, load: 0.3, state: 'normal' },
      n2: { active: 2, done: 12, load: 0.4, state: 'normal' },
      n3: { active: 0, done: 8, load: 0.2, state: 'normal' },
    },
    stats: [
      { label: 'Dispatched', value: 30 },
      { label: 'Active', value: 3 },
      { label: 'Imbalance', value: 2 },
    ],
    isPaused,
  };
}
