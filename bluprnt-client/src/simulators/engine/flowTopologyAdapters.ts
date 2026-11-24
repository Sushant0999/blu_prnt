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

function createSyntheticPackets(
  latestOutcome: OutcomeDef | undefined,
  targetEdgeId: string,
  totalEdges: FlowEdge[],
  packetColor: string = '#2e6930'
): FlowPacket[] {
  const packets: FlowPacket[] = [];
  const now = Date.now();

  const clientEdge = totalEdges.find((e) => e.source.includes('src') || e.source === 'clients' || e.source === 'client');
  if (clientEdge) {
    const p1 = (now % 600) / 600;
    packets.push({
      id: 'pkt-client',
      edgeId: clientEdge.id,
      progress: p1,
      color: packetColor,
    });
  }

  if (targetEdgeId) {
    const p2 = ((now + 300) % 600) / 600;
    const isError = latestOutcome?.id?.includes('fail') || latestOutcome?.id?.includes('throttle') || latestOutcome?.id?.includes('drop') || latestOutcome?.id?.includes('dlq');
    packets.push({
      id: 'pkt-target',
      edgeId: targetEdgeId,
      progress: p2,
      color: isError ? '#ef4444' : packetColor,
    });
  }

  return packets;
}

export function getFlowDiagramProps(ctx: AdapterContext): FlowDiagramProps {
  const { simulatorId, modeId, liveState, latestOutcome, onTriggerFailure, isPaused } = ctx;

  // 1. LOAD BALANCER: Forest Green, Fork icon, Servers srv1/srv2/srv3
  if (simulatorId === 'load-balancer') {
    const nodes: FlowNode[] = liveState?.nodes || [
      { id: 'clients', label: 'Clients', kind: 'source', icon: 'globe', color: '#2e6930' },
      { id: 'balancer', label: 'Balancer', kind: 'hub', icon: 'split', color: '#2e6930', badge: modeId.toUpperCase() },
      { id: 'srv1', label: 'srv1', kind: 'card', color: '#2e7d32', badge: '1x WT' },
      { id: 'srv2', label: 'srv2', kind: 'card', color: '#2e7d32', badge: '3x WT' },
      { id: 'srv3', label: 'srv3', kind: 'card', color: '#2e7d32', badge: '2x WT' },
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

  // 2. RATE LIMITER: Vivid Cyan, Bucket icon, Allowed vs Queue vs Throttled
  if (simulatorId === 'rate-limiter') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Client Ingress', kind: 'source', color: '#0ea5e9', sublabel: `${ctx.rate} req/s` },
      { id: 'limiter', label: 'Token Bucket', kind: 'hub', icon: 'bucket', color: '#0284c7', badge: modeId.replace('_', ' ').toUpperCase() },
      { id: 'allowed', label: 'Allowed (200 OK)', kind: 'card', color: '#10b981', badge: 'PASS' },
      { id: 'queue', label: 'Leaky Queue', kind: 'card', color: '#f59e0b', badge: 'DELAY' },
      { id: 'throttled', label: 'Rejected (429)', kind: 'card', color: '#ef4444', badge: 'DROP' },
    ];
    const edges: FlowEdge[] = [
      { id: 'e-client-limiter', source: 'client', target: 'limiter', label: 'Stream' },
      { id: 'e-limiter-allowed', source: 'limiter', target: 'allowed', label: 'Tokens ≥ 1', color: '#10b981' },
      { id: 'e-limiter-queue', source: 'limiter', target: 'queue', label: 'Buffered', color: '#f59e0b' },
      { id: 'e-limiter-throttled', source: 'limiter', target: 'throttled', label: 'Depleted', color: '#ef4444' },
    ];

    const allowed = liveState?.allowed ?? 0;
    const throttled = liveState?.throttled ?? 0;
    const queueSize = liveState?.queue ?? 0;
    const tokens = liveState?.tokens ?? 20;
    const capacity = ctx.params?.capacity || 20;

    let targetEdge = 'e-limiter-allowed';
    if (latestOutcome?.id === 'throttled') targetEdge = 'e-limiter-throttled';
    if (latestOutcome?.id === 'queued') targetEdge = 'e-limiter-queue';

    const packets = createSyntheticPackets(latestOutcome, targetEdge, edges, '#0ea5e9');

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

  // 3. CONSISTENT HASHING: Deep Violet, Ring icon, Murmur3 Partition Buckets
  if (simulatorId === 'consistent-hashing') {
    const rawNodes = liveState?.nodes || ['Node-1', 'Node-2', 'Node-3', 'Node-4'];
    const counts = liveState?.counts || {};
    const total = Object.values(counts).reduce((a: any, b: any) => Number(a) + Number(b), 0) || 1;

    const nodes: FlowNode[] = [
      { id: 'client', label: 'Key Generator', kind: 'source', color: '#8b5cf6', sublabel: 'Murmur3 Hash' },
      { id: 'hash_ring', label: 'Hash Ring Space', kind: 'hub', icon: 'ring', color: '#7c3aed', badge: '[0..2³²-1]' },
      { id: 'Node-1', label: 'Cluster Node 1', kind: 'card', color: '#10b981', badge: 'PART-0', detail: `${counts['Node-1'] || 0} keys · ${Math.round(((counts['Node-1'] || 0) / (total as number)) * 100)}% load` },
      { id: 'Node-2', label: 'Cluster Node 2', kind: 'card', color: '#3b82f6', badge: 'PART-1', detail: `${counts['Node-2'] || 0} keys · ${Math.round(((counts['Node-2'] || 0) / (total as number)) * 100)}% load` },
      { id: 'Node-3', label: 'Cluster Node 3', kind: 'card', color: '#a855f7', badge: 'PART-2', detail: `${counts['Node-3'] || 0} keys · ${Math.round(((counts['Node-3'] || 0) / (total as number)) * 100)}% load` },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-ring', source: 'client', target: 'hash_ring', label: 'Hash(key)' },
      { id: 'e-ring-Node-1', source: 'hash_ring', target: 'Node-1', label: 'Arc 0°-120°', color: '#10b981' },
      { id: 'e-ring-Node-2', source: 'hash_ring', target: 'Node-2', label: 'Arc 120°-240°', color: '#3b82f6' },
      { id: 'e-ring-Node-3', source: 'hash_ring', target: 'Node-3', label: 'Arc 240°-360°', color: '#a855f7' },
    ];

    const targetNode = rawNodes.find((n: string) => latestOutcome?.label?.includes(n)) || 'Node-1';
    const targetEdge = `e-ring-${targetNode}`;
    const packets = createSyntheticPackets(latestOutcome, targetEdge, edges, '#8b5cf6');

    const nodeStatus: Record<string, FlowNodeStatus> = {
      'Node-1': { active: 1, done: counts['Node-1'] || 0, load: Math.min(1, (counts['Node-1'] || 0) / (total as number)), state: 'normal' },
      'Node-2': { active: 1, done: counts['Node-2'] || 0, load: Math.min(1, (counts['Node-2'] || 0) / (total as number)), state: 'normal' },
      'Node-3': { active: 1, done: counts['Node-3'] || 0, load: Math.min(1, (counts['Node-3'] || 0) / (total as number)), state: 'normal' },
    };

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
      onToggleNodeSlow: () => onTriggerFailure?.('kill_node_3'),
    };
  }

  // 4. CACHE POLICIES: Sky Blue, Cache RAM icon, RAM Hits vs DB Misses vs Eviction
  if (simulatorId === 'cache-policies') {
    const hits = liveState?.hits ?? 0;
    const misses = liveState?.misses ?? 0;
    const evictions = liveState?.evictions ?? 0;
    const size = liveState?.size ?? 0;
    const capacity = liveState?.capacity ?? 20;

    const nodes: FlowNode[] = [
      { id: 'client', label: 'App Queries', kind: 'source', color: '#06b6d4', sublabel: 'Read/Write' },
      { id: 'cache_ctrl', label: 'Cache Engine', kind: 'hub', icon: 'cache', color: '#0891b2', badge: modeId.toUpperCase() },
      { id: 'ram_hits', label: 'L1 RAM Cache', kind: 'card', color: '#10b981', badge: '1ms HIT', detail: `${hits} hits · ${size}/${capacity} slots` },
      { id: 'db_misses', label: 'Postgres DB', kind: 'card', color: '#f59e0b', badge: '50ms MISS', detail: `${misses} misses · Disk seek` },
      { id: 'evictions', label: 'Evicted Pool', kind: 'card', color: '#8b5cf6', badge: 'EVICT', detail: `${evictions} purged entries` },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-cache', source: 'client', target: 'cache_ctrl', label: 'Get(key)' },
      { id: 'e-cache-hits', source: 'cache_ctrl', target: 'ram_hits', label: 'Cache HIT', color: '#10b981' },
      { id: 'e-cache-misses', source: 'cache_ctrl', target: 'db_misses', label: 'Cache MISS', color: '#f59e0b' },
      { id: 'e-cache-evict', source: 'cache_ctrl', target: 'evictions', label: 'Eviction', color: '#8b5cf6' },
    ];

    const isHit = latestOutcome?.id?.includes('hit');
    const targetEdge = isHit ? 'e-cache-hits' : 'e-cache-misses';
    const packets = createSyntheticPackets(latestOutcome, targetEdge, edges, '#06b6d4');

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

  // 5. BLOOM FILTER: Emerald Green, Filter Sieve icon, Fast Bypassed vs Probable
  if (simulatorId === 'bloom-filter') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Key Stream', kind: 'source', color: '#10b981', sublabel: 'Set Check' },
      { id: 'bloom_hashes', label: 'k-Hash Sieve', kind: 'hub', icon: 'filter', color: '#059669', badge: 'k=3 HASH' },
      { id: 'filter_saved', label: 'Disk Bypass', kind: 'card', color: '#10b981', badge: '0% DISK', detail: `${liveState?.filteredCount ?? 45} filtered (0 I/O)` },
      { id: 'probable_hit', label: 'Probable Set', kind: 'card', color: '#3b82f6', badge: 'SEEK', detail: `${liveState?.truePositiveCount ?? 12} found in set` },
      { id: 'false_pos', label: 'False Positive', kind: 'card', color: '#f59e0b', badge: 'COLLISION', detail: `${liveState?.fpCount ?? 0} wasted I/O` },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-bloom', source: 'client', target: 'bloom_hashes', label: 'Lookup' },
      { id: 'e-bloom-saved', source: 'bloom_hashes', target: 'filter_saved', label: 'Zero Bit', color: '#10b981' },
      { id: 'e-bloom-hit', source: 'bloom_hashes', target: 'probable_hit', label: 'All Bits 1', color: '#3b82f6' },
      { id: 'e-bloom-fp', source: 'bloom_hashes', target: 'false_pos', label: 'Hash Clash', color: '#f59e0b' },
    ];

    const isFilter = latestOutcome?.id === 'def_not_in_set';
    const targetEdge = isFilter ? 'e-bloom-saved' : 'e-bloom-hit';
    const packets = createSyntheticPackets(latestOutcome, targetEdge, edges, '#10b981');

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

  // 6. CIRCUIT BREAKER: Electric Red/Amber, Circuit Switch icon, Upstream vs Fallback vs Fast-Fail
  if (simulatorId === 'circuit-breaker') {
    const cbState = liveState?.state || 'CLOSED';
    const isTripped = cbState === 'OPEN';

    const nodes: FlowNode[] = [
      { id: 'client', label: 'API Gateway', kind: 'source', color: '#f59e0b', sublabel: 'Downstream' },
      { id: 'breaker', label: 'Circuit Breaker', kind: 'hub', icon: 'circuit', color: isTripped ? '#dc2626' : '#16a34a', badge: cbState },
      { id: 'upstream', label: 'Main Upstream', kind: 'card', color: '#10b981', badge: 'LIVE', detail: 'Primary Microservice' },
      { id: 'fallback', label: 'Cached Fallback', kind: 'card', color: '#8b5cf6', badge: 'DEGRADED', detail: 'Local Redis Snapshot' },
      { id: 'fast_fail', label: 'Fast-Fail 503', kind: 'card', color: '#ef4444', badge: 'TRIPPED', detail: `${liveState?.fastFails ?? 0} fast rejections` },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-breaker', source: 'client', target: 'breaker', label: 'Call' },
      { id: 'e-breaker-upstream', source: 'breaker', target: 'upstream', label: 'Closed (OK)', color: '#10b981' },
      { id: 'e-breaker-fallback', source: 'breaker', target: 'fallback', label: 'Degraded', color: '#8b5cf6' },
      { id: 'e-breaker-fastfail', source: 'breaker', target: 'fast_fail', label: 'Open (503)', color: '#ef4444', style: 'dashed' },
    ];

    const targetEdge = isTripped ? 'e-breaker-fastfail' : 'e-breaker-upstream';
    const packets = createSyntheticPackets(latestOutcome, targetEdge, edges, isTripped ? '#ef4444' : '#10b981');

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

  // 7. MESSAGE QUEUE: Royal Blue, Queue conveyor icon, Consumer Pods & DLQ
  if (simulatorId === 'message-queue') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Producers', kind: 'source', color: '#3b82f6', sublabel: 'JSON Events' },
      { id: 'broker', label: 'Kafka Topic', kind: 'hub', icon: 'queue', color: '#2563eb', badge: 'PART-3' },
      { id: 'c1', label: 'Consumer Pod 1', kind: 'card', color: '#3b82f6', badge: 'GRP-A', detail: `${liveState?.processed ?? 25} processed · 0 lag` },
      { id: 'c2', label: 'Consumer Pod 2', kind: 'card', color: '#3b82f6', badge: 'GRP-B', detail: `${liveState?.processed ?? 20} processed · 1ms lag` },
      { id: 'dlq', label: 'DLQ Poison Queue', kind: 'card', color: '#ef4444', badge: 'ERR-DLQ', detail: '0 dead-letters' },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-broker', source: 'client', target: 'broker', label: 'Produce' },
      { id: 'e-broker-c1', source: 'broker', target: 'c1', label: 'Poll P0', color: '#3b82f6' },
      { id: 'e-broker-c2', source: 'broker', target: 'c2', label: 'Poll P1', color: '#3b82f6' },
      { id: 'e-broker-dlq', source: 'broker', target: 'dlq', label: 'Max Retries', color: '#ef4444', style: 'dashed' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-broker-c1', edges, '#3b82f6');

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

  // 8. CDN EDGE CACHING: Warm Orange, Cloud icon, Edge POPs vs Origin DC
  if (simulatorId === 'cdn-edge-caching') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Global Users', kind: 'source', color: '#f97316', sublabel: 'Worldwide' },
      { id: 'anycast', label: 'Cloudflare Edge', kind: 'hub', icon: 'cloud', color: '#ea580c', badge: 'ANYCAST' },
      { id: 'edge_pop', label: 'Edge POP (Tokyo)', kind: 'card', color: '#10b981', badge: '1-5ms', detail: `${liveState?.edgeHits ?? 30} hits · 0 origin egress` },
      { id: 'shield', label: 'Origin Shield (US)', kind: 'card', color: '#3b82f6', badge: '35ms', detail: '8 hits · Regional Cache' },
      { id: 'origin_dc', label: 'Origin DC (Frankfurt)', kind: 'card', color: '#ef4444', badge: '150ms', detail: `${liveState?.originFetches ?? 4} fetches · DB seek` },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-dns', source: 'client', target: 'anycast', label: 'Geo-Routing' },
      { id: 'e-dns-pop', source: 'anycast', target: 'edge_pop', label: 'Edge Hit (92%)', color: '#10b981' },
      { id: 'e-dns-shield', source: 'anycast', target: 'shield', label: 'Shield', color: '#3b82f6' },
      { id: 'e-dns-origin', source: 'anycast', target: 'origin_dc', label: 'Origin Fetch', color: '#ef4444' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-dns-pop', edges, '#f97316');

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

  // 9. SHARDING: Indigo, Shard Matrix icon, Range Partition Buckets
  if (simulatorId === 'sharding-partitioning') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Client App', kind: 'source', color: '#6366f1', sublabel: 'Tenant Key' },
      { id: 'router', label: 'Shard Director', kind: 'hub', icon: 'shard', color: '#4f46e5', badge: 'RANGE' },
      { id: 'shard_a', label: 'Shard A (0-100)', kind: 'card', color: '#6366f1', badge: 'P-A', detail: '18 keys stored · 35% utilization' },
      { id: 'shard_b', label: 'Shard B (101-200)', kind: 'card', color: '#6366f1', badge: 'P-B', detail: '22 keys stored · 45% utilization' },
      { id: 'shard_c', label: 'Shard C (201-300)', kind: 'card', color: '#6366f1', badge: 'P-C', detail: '14 keys stored · 25% utilization' },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-router', source: 'client', target: 'router', label: 'Key Hash' },
      { id: 'e-router-sa', source: 'router', target: 'shard_a', label: 'Range [0..100]', color: '#6366f1' },
      { id: 'e-router-sb', source: 'router', target: 'shard_b', label: 'Range [101..200]', color: '#6366f1' },
      { id: 'e-router-sc', source: 'router', target: 'shard_c', label: 'Range [201..300]', color: '#6366f1' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-router-sb', edges, '#6366f1');

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

  // 10. REPLICATION: Teal, Replica icon, Primary vs Replicas
  if (simulatorId === 'replication') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Client Writes', kind: 'source', color: '#14b8a6', sublabel: 'ACID Writes' },
      { id: 'primary', label: 'Primary DB (WAL)', kind: 'hub', icon: 'replica', color: '#0d9488', badge: 'PRIMARY' },
      { id: 'rep_1', label: 'Replica A (Sync)', kind: 'card', color: '#10b981', badge: 'SYNC', detail: '0 lag · Quorum Ack' },
      { id: 'rep_2', label: 'Replica B (Async)', kind: 'card', color: '#14b8a6', badge: 'ASYNC', detail: `${liveState?.masterLag ?? 4}ms binlog lag` },
      { id: 'rep_3', label: 'Replica C (Read-Pool)', kind: 'card', color: '#06b6d4', badge: 'READ-ONLY', detail: 'Read replica pool' },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-primary', source: 'client', target: 'primary', label: 'Commit' },
      { id: 'e-primary-r1', source: 'primary', target: 'rep_1', label: 'Sync Ack', color: '#10b981' },
      { id: 'e-primary-r2', source: 'primary', target: 'rep_2', label: 'Binlog Stream', color: '#14b8a6' },
      { id: 'e-primary-r3', source: 'primary', target: 'rep_3', label: 'Read Replicas', color: '#06b6d4' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-primary-r1', edges, '#14b8a6');

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

  // 11. RAFT CONSENSUS: Crimson Rose, Crown icon, Leader vs Follower Quorum
  if (simulatorId === 'raft-consensus') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Client Proposal', kind: 'source', color: '#e11d48', sublabel: 'Set(X=42)' },
      { id: 'leader', label: 'Raft Leader', kind: 'hub', icon: 'raft', color: '#be123c', badge: `TERM ${liveState?.term ?? 1}` },
      { id: 'f1', label: 'Follower Node 1', kind: 'card', color: '#e11d48', badge: 'QUORUM', detail: `MatchIdx: ${liveState?.commitIndex ?? 12} · Acked` },
      { id: 'f2', label: 'Follower Node 2', kind: 'card', color: '#e11d48', badge: 'QUORUM', detail: `MatchIdx: ${liveState?.commitIndex ?? 12} · Acked` },
      { id: 'f3', label: 'Follower Node 3', kind: 'card', color: '#f59e0b', badge: 'SYNC', detail: `MatchIdx: ${(liveState?.commitIndex ?? 12) - 1} · Heartbeat` },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-leader', source: 'client', target: 'leader', label: 'Propose' },
      { id: 'e-leader-f1', source: 'leader', target: 'f1', label: 'AppendEntries', color: '#e11d48' },
      { id: 'e-leader-f2', source: 'leader', target: 'f2', label: 'AppendEntries', color: '#e11d48' },
      { id: 'e-leader-f3', source: 'leader', target: 'f3', label: 'Heartbeat', color: '#f59e0b' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-leader-f1', edges, '#e11d48');

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

  // 12. DISTRIBUTED TRANSACTIONS: Cobalt Blue, 2PC Handshake icon, Participants
  if (simulatorId === 'distributed-transactions') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Order Checkout', kind: 'source', color: '#2563eb', sublabel: '$120 Cart' },
      { id: 'coordinator', label: '2PC Coordinator', kind: 'hub', icon: 'txn', color: '#1d4ed8', badge: 'SAGA/2PC' },
      { id: 'pay', label: 'Stripe Payment Svc', kind: 'card', color: '#2563eb', badge: 'PARTICIPANT', detail: 'Phase 1: Prepared · Phase 2: Committed' },
      { id: 'order', label: 'Order Records Svc', kind: 'card', color: '#2563eb', badge: 'PARTICIPANT', detail: 'Phase 1: Prepared · Phase 2: Committed' },
      { id: 'inv', label: 'Warehouse Stock Svc', kind: 'card', color: '#2563eb', badge: 'PARTICIPANT', detail: 'Phase 1: Prepared · Phase 2: Committed' },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-coord', source: 'client', target: 'coordinator', label: 'BeginTx' },
      { id: 'e-coord-pay', source: 'coordinator', target: 'pay', label: 'VoteCommit', color: '#2563eb' },
      { id: 'e-coord-order', source: 'coordinator', target: 'order', label: 'VoteCommit', color: '#2563eb' },
      { id: 'e-coord-inv', source: 'coordinator', target: 'inv', label: 'VoteCommit', color: '#2563eb' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-coord-pay', edges, '#2563eb');

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

  // 13. RETRY STRATEGIES: Electric Purple, Retry Loop icon, 200 OK vs Backoff vs DLQ
  if (simulatorId === 'retry-strategies') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Client Calls', kind: 'source', color: '#7c3aed', sublabel: 'Flaky Network' },
      { id: 'retry_policy', label: 'Backoff Engine', kind: 'hub', icon: 'retry', color: '#6d28d9', badge: 'JITTER' },
      { id: 'success_200', label: 'First-Try (200 OK)', kind: 'card', color: '#10b981', badge: 'INSTANT', detail: `${liveState?.successes ?? 28} clean responses` },
      { id: 'recovered', label: 'Retry Recovered', kind: 'card', color: '#f59e0b', badge: 'BACKOFF', detail: `${liveState?.retries ?? 6} recovered with jitter` },
      { id: 'dlq_drop', label: 'Dead Letter Queue', kind: 'card', color: '#ef4444', badge: 'MAX 3x', detail: `${liveState?.dlq ?? 1} dropped to DLQ` },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-retry', source: 'client', target: 'retry_policy', label: 'Invoke' },
      { id: 'e-retry-s200', source: 'retry_policy', target: 'success_200', label: 'Success (1x)', color: '#10b981' },
      { id: 'e-retry-recov', source: 'retry_policy', target: 'recovered', label: 'Retry Loop', color: '#f59e0b' },
      { id: 'e-retry-dlq', source: 'retry_policy', target: 'dlq_drop', label: 'Exhausted', color: '#ef4444', style: 'dashed' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-retry-s200', edges, '#7c3aed');

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

  // 14. IDEMPOTENCY: Emerald Teal, Lock icon, Processed vs Cached vs Duplicate
  if (simulatorId === 'idempotency-delivery') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Payment Orders', kind: 'source', color: '#059669', sublabel: 'Idem-Key: UUID' },
      { id: 'idem_guard', label: 'Idempotency Gate', kind: 'hub', icon: 'lock', color: '#047857', badge: 'EXACTLY-1' },
      { id: 'proc_new', label: 'Fresh Execution', kind: 'card', color: '#10b981', badge: 'FIRST SEEN', detail: `${liveState?.uniqueProcessed ?? 32} newly executed` },
      { id: 'dedup_safe', label: 'Cached Replay', kind: 'card', color: '#3b82f6', badge: 'SAFE 200', detail: `${liveState?.deduplicated ?? 14} safe replays` },
      { id: 'dropped_dup', label: 'Duplicate Dropped', kind: 'card', color: '#ef4444', badge: 'CONFLICT', detail: `${liveState?.dropped ?? 0} race conflicts` },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-idem', source: 'client', target: 'idem_guard', label: 'POST /charge' },
      { id: 'e-idem-new', source: 'idem_guard', target: 'proc_new', label: 'Lock & Exec', color: '#10b981' },
      { id: 'e-idem-dedup', source: 'idem_guard', target: 'dedup_safe', label: 'Read Cache', color: '#3b82f6' },
      { id: 'e-idem-drop', source: 'idem_guard', target: 'dropped_dup', label: 'Collision', color: '#ef4444', style: 'dashed' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-idem-new', edges, '#059669');

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

  // 15. AUTOSCALING: Amber/Orange, CPU icon, Worker Pod Fleet
  if (simulatorId === 'autoscaling-backpressure') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Ingress Traffic', kind: 'source', color: '#ea580c', sublabel: `${ctx.rate} req/s` },
      { id: 'hpa', label: 'K8s HPA Controller', kind: 'hub', icon: 'cpu', color: '#c2410c', badge: 'AUTOSCALE' },
      { id: 'pod1', label: 'Worker Pod 1', kind: 'card', color: '#ea580c', badge: 'CPU 65%', detail: '20 handled · 4 active conns' },
      { id: 'pod2', label: 'Worker Pod 2', kind: 'card', color: '#ea580c', badge: 'CPU 55%', detail: '18 handled · 3 active conns' },
      { id: 'pod3', label: 'Worker Pod 3 (Spawned)', kind: 'card', color: '#10b981', badge: 'SCALE-OUT', detail: '12 handled · 2 active conns' },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-hpa', source: 'client', target: 'hpa', label: 'Surge' },
      { id: 'e-hpa-p1', source: 'hpa', target: 'pod1', label: 'Pod 1', color: '#ea580c' },
      { id: 'e-hpa-p2', source: 'hpa', target: 'pod2', label: 'Pod 2', color: '#ea580c' },
      { id: 'e-hpa-p3', source: 'hpa', target: 'pod3', label: 'Spawn Pod', color: '#10b981' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-hpa-p1', edges, '#ea580c');

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

  // 16. STORAGE INDEXES: Amber, B+ Tree icon, Leaf vs Clustered Page vs Split
  if (simulatorId === 'storage-indexes') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'SQL Query Plan', kind: 'source', color: '#d97706', sublabel: 'SELECT WHERE' },
      { id: 'idx_router', label: 'B+ Tree Index', kind: 'hub', icon: 'tree', color: '#b45309', badge: '16KB PAGE' },
      { id: 'btree_leaf', label: 'Primary Leaf Node', kind: 'card', color: '#10b981', badge: 'O(log N)', detail: '35 index seeks · Leaf scan' },
      { id: 'data_page', label: 'Clustered Data Page', kind: 'card', color: '#3b82f6', badge: 'ROW LOOKUP', detail: '35 direct row retrievals' },
      { id: 'page_split', label: 'Leaf Page Split', kind: 'card', color: '#ef4444', badge: 'SPLIT 50/50', detail: `${liveState?.events ?? 2} page overflow splits` },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-idx', source: 'client', target: 'idx_router', label: 'Query' },
      { id: 'e-idx-leaf', source: 'idx_router', target: 'btree_leaf', label: 'Index Traverse', color: '#10b981' },
      { id: 'e-idx-page', source: 'idx_router', target: 'data_page', label: 'Heap Fetch', color: '#3b82f6' },
      { id: 'e-idx-split', source: 'idx_router', target: 'page_split', label: 'Page Full', color: '#ef4444', style: 'dashed' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-idx-leaf', edges, '#d97706');

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

  // 17. LSM TREE: Steel Slate, Strata icon, MemTable vs Level 0 vs Compaction
  if (simulatorId === 'lsm-tree') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Write Ahead Log', kind: 'source', color: '#475569', sublabel: 'WAL Sync' },
      { id: 'memtable', label: 'MemTable (Skiplist)', kind: 'hub', icon: 'lsm', color: '#334155', badge: 'RAM BUFFER' },
      { id: 'sstable_l0', label: 'SSTable Level 0', kind: 'card', color: '#475569', badge: 'UNSORTED', detail: `${liveState?.l0Count ?? 4} flushed files (Keys Overlap)` },
      { id: 'sstable_l1', label: 'SSTable Level 1', kind: 'card', color: '#0ea5e9', badge: 'SORTED', detail: `${liveState?.l1Count ?? 8} non-overlapping tables` },
      { id: 'compactions', label: 'Compaction Merge', kind: 'card', color: '#10b981', badge: 'MERGE-SORT', detail: `${liveState?.compactions ?? 2} background merges` },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-mem', source: 'client', target: 'memtable', label: 'Sequential' },
      { id: 'e-mem-l0', source: 'memtable', target: 'sstable_l0', label: 'Flush (L0)', color: '#475569' },
      { id: 'e-mem-l1', source: 'memtable', target: 'sstable_l1', label: 'Tiered L1', color: '#0ea5e9' },
      { id: 'e-mem-comp', source: 'memtable', target: 'compactions', label: 'Compaction', color: '#10b981' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-mem-l0', edges, '#475569');

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

  // 18. GOSSIP PROTOCOL: Fuchsia, Peer Mesh icon, Anti-Entropy Dissemination
  if (simulatorId === 'gossip-protocol') {
    const nodes: FlowNode[] = [
      { id: 'client', label: 'Seed State', kind: 'source', color: '#c026d3', sublabel: 'Membership' },
      { id: 'broadcaster', label: 'Anti-Entropy', kind: 'hub', icon: 'mesh', color: '#a21caf', badge: 'RUMOR P2P' },
      { id: 'peer_1', label: 'Peer Node 1', kind: 'card', color: '#c026d3', badge: 'INFECTED', detail: 'Round 4 · State converged' },
      { id: 'peer_2', label: 'Peer Node 2', kind: 'card', color: '#c026d3', badge: 'INFECTED', detail: 'Round 4 · State converged' },
      { id: 'peer_3', label: 'Peer Node 3', kind: 'card', color: '#f59e0b', badge: 'SUSPECT', detail: 'Round 3 · Heartbeat sync' },
    ];

    const edges: FlowEdge[] = [
      { id: 'e-client-broadcaster', source: 'client', target: 'broadcaster', label: 'Inject' },
      { id: 'e-broad-p1', source: 'broadcaster', target: 'peer_1', label: 'Gossip Push', color: '#c026d3' },
      { id: 'e-broad-p2', source: 'broadcaster', target: 'peer_2', label: 'Gossip Push', color: '#c026d3' },
      { id: 'e-broad-p3', source: 'broadcaster', target: 'peer_3', label: 'Pull-Sync', color: '#f59e0b' },
    ];

    const packets = createSyntheticPackets(latestOutcome, 'e-broad-p1', edges, '#c026d3');

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

  // Fallback
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
