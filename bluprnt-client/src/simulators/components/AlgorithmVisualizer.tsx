import React from 'react';
import {
  Server,
  Cpu,
  Database,
  Layers,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Zap,
  RotateCw,
  GitCommit,
  Radio,
  Flame,
  Clock,
  ArrowRight,
  HardDrive,
  Network,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Crown,
  Boxes,
  Lock,
} from 'lucide-react';
import { OutcomeDef } from '../engine/types';

interface AlgorithmVisualizerProps {
  simulatorId: string;
  modeId: string;
  rate: number;
  isPaused: boolean;
  isBursty: boolean;
  liveState: any;
  latestOutcome?: OutcomeDef;
  params: Record<string, any>;
}

export const AlgorithmVisualizer: React.FC<AlgorithmVisualizerProps> = ({
  simulatorId,
  modeId,
  rate,
  isPaused,
  isBursty,
  liveState,
  latestOutcome,
  params,
}) => {
  switch (simulatorId) {
    case 'consistent-hashing':
      return <ConsistentHashingVisualizer modeId={modeId} liveState={liveState} latestOutcome={latestOutcome} />;
    case 'rate-limiter':
      return <RateLimiterVisualizer modeId={modeId} liveState={liveState} rate={rate} isPaused={isPaused} params={params} />;
    case 'load-balancer':
      return <LoadBalancerVisualizer liveState={liveState} latestOutcome={latestOutcome} />;
    case 'cache-policies':
      return <CachePoliciesVisualizer modeId={modeId} liveState={liveState} latestOutcome={latestOutcome} />;
    case 'bloom-filter':
      return <BloomFilterVisualizer liveState={liveState} latestOutcome={latestOutcome} />;
    case 'lsm-tree':
      return <LsmTreeVisualizer liveState={liveState} isPaused={isPaused} />;
    case 'raft-consensus':
      return <RaftConsensusVisualizer liveState={liveState} isPaused={isPaused} />;
    case 'circuit-breaker':
      return <CircuitBreakerVisualizer liveState={liveState} />;
    case 'distributed-transactions':
      return <DistributedTxVisualizer modeId={modeId} liveState={liveState} latestOutcome={latestOutcome} />;
    case 'message-queue':
      return <MessageQueueVisualizer modeId={modeId} liveState={liveState} isPaused={isPaused} />;
    case 'storage-indexes':
      return <StorageIndexesVisualizer modeId={modeId} liveState={liveState} />;
    case 'replication':
      return <ReplicationVisualizer modeId={modeId} liveState={liveState} />;
    case 'sharding-partitioning':
      return <ShardingVisualizer modeId={modeId} liveState={liveState} latestOutcome={latestOutcome} />;
    case 'cdn-edge-caching':
      return <CdnEdgeVisualizer modeId={modeId} liveState={liveState} />;
    case 'retry-strategies':
      return <RetryStrategiesVisualizer modeId={modeId} liveState={liveState} latestOutcome={latestOutcome} />;
    case 'idempotency-delivery':
      return <IdempotencyVisualizer modeId={modeId} liveState={liveState} latestOutcome={latestOutcome} />;
    case 'autoscaling-backpressure':
      return <AutoscalingVisualizer liveState={liveState} rate={rate} />;
    case 'gossip-protocol':
      return <GossipProtocolVisualizer liveState={liveState} />;
    default:
      return <GenericEnterpriseVisualizer liveState={liveState} rate={rate} isPaused={isPaused} />;
  }
};

/* =========================================================================
   1. CONSISTENT HASHING & VIRTUAL NODES RING
   ========================================================================= */
const ConsistentHashingVisualizer: React.FC<{ modeId: string; liveState: any; latestOutcome?: OutcomeDef }> = ({
  modeId,
  liveState,
  latestOutcome,
}) => {
  const nodes = liveState?.nodes || ['Node-1', 'Node-2', 'Node-3'];
  const counts = liveState?.counts || {};
  const total = Object.values(counts).reduce((a: any, b: any) => Number(a) + Number(b), 0) || 1;

  const nodeColors: Record<string, string> = {
    'Node-1': '#10b981',
    'Node-2': '#3b82f6',
    'Node-3': '#a855f7',
    'Node-4': '#f59e0b',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* SVG Ring View */}
        <div className="md:col-span-7 flex flex-col items-center justify-center p-3 bg-slate-950/80 rounded-xl border border-slate-800 relative">
          <div className="relative w-64 h-64">
            <svg viewBox="0 0 260 260" className="w-full h-full">
              {/* Outer Circular Ring with tick marks */}
              <circle
                cx="130"
                cy="130"
                r="95"
                fill="none"
                stroke="#334155"
                strokeWidth="3"
                strokeDasharray="4 4"
                className="opacity-70"
              />
              <circle
                cx="130"
                cy="130"
                r="50"
                fill="#0f172a"
                stroke="#1e293b"
                strokeWidth="1.5"
              />

              {/* Center Hash Space Label */}
              <text x="130" y="125" textAnchor="middle" className="text-[10px] font-bold fill-slate-300 font-mono">
                RING SPACE
              </text>
              <text x="130" y="140" textAnchor="middle" className="text-[9px] fill-cyan-400 font-mono">
                [0 → 2³² - 1]
              </text>

              {/* Ring Nodes Positioned Around Ring */}
              {nodes.map((nodeName: string, idx: number) => {
                const angle = (idx * (360 / nodes.length)) - 90;
                const rad = (angle * Math.PI) / 180;
                const cx = 130 + 95 * Math.cos(rad);
                const cy = 130 + 95 * Math.sin(rad);
                const color = nodeColors[nodeName] || '#06b6d4';
                const isTarget = latestOutcome?.label?.includes(nodeName);

                return (
                  <g key={nodeName}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isTarget ? 14 : 10}
                      fill={color}
                      stroke="#ffffff"
                      strokeWidth={isTarget ? 3 : 2}
                      className="transition-all duration-150 drop-shadow-md"
                    />
                    <text
                      x={cx}
                      y={cy + 3.5}
                      textAnchor="middle"
                      className="text-[8px] font-extrabold fill-white font-mono pointer-events-none"
                    >
                      {idx + 1}
                    </text>
                  </g>
                );
              })}

              {/* Streaming Key Angle */}
              {latestOutcome && (
                <circle
                  cx={130 + 75 * Math.cos(Date.now() / 200)}
                  cy={130 + 75 * Math.sin(Date.now() / 200)}
                  r="4"
                  fill="#f43f5e"
                  className="animate-ping"
                />
              )}
            </svg>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-1">
            Mode: <strong className="text-cyan-300 uppercase">{modeId.replace('_', ' ')}</strong> • Clockwise partition routing
          </span>
        </div>

        {/* Cluster Node Load Distribution Bars */}
        <div className="md:col-span-5 space-y-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="text-xs font-mono font-bold text-slate-300">Cluster Partition Load</span>
            <span className="text-[10px] text-slate-500 font-mono">{nodes.length} Nodes Online</span>
          </div>

          {nodes.map((nodeName: string) => {
            const count = counts[nodeName] || 0;
            const pct = Math.min(100, Math.round((count / (total as number)) * 100));
            const color = nodeColors[nodeName] || '#06b6d4';

            return (
              <div key={nodeName} className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="font-semibold text-slate-200">{nodeName}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-300">
                    {count} keys ({pct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   2. RATE LIMITER: TOKEN BUCKET & LEAKY BUCKET
   ========================================================================= */
const RateLimiterVisualizer: React.FC<{
  modeId: string;
  liveState: any;
  rate: number;
  isPaused: boolean;
  params: Record<string, any>;
}> = ({ modeId, liveState, rate, isPaused, params }) => {
  const capacity = Number(params.capacity || 20);
  const tokens = Math.max(0, Math.min(capacity, liveState?.tokens ?? capacity));
  const queueSize = liveState?.queue ?? 0;
  const tokenPct = Math.round((tokens / capacity) * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
      {/* Tank Apparatus */}
      <div className="md:col-span-6 flex flex-col items-center justify-center p-4 bg-slate-950/80 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between w-full max-w-[200px] mb-2 text-xs font-mono text-slate-400">
          <span>Capacity: {capacity}</span>
          <span className="text-cyan-400 font-bold">{tokens.toFixed(1)} Left</span>
        </div>

        {/* Cylinder Tank */}
        <div className="relative w-40 h-44 rounded-b-2xl rounded-t-lg border-2 border-slate-700 bg-slate-900/90 overflow-hidden shadow-inner flex flex-col justify-end">
          {/* Inflow nozzle */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-2 bg-slate-700 border-b border-cyan-500/50" />

          {/* Liquid / Token Level */}
          <div
            className={`w-full transition-all duration-150 ease-out flex items-center justify-center ${
              tokenPct > 50
                ? 'bg-gradient-to-t from-cyan-600/80 to-cyan-400/50'
                : tokenPct > 20
                ? 'bg-gradient-to-t from-amber-600/80 to-amber-400/50'
                : 'bg-gradient-to-t from-rose-600/80 to-rose-400/50'
            }`}
            style={{ height: `${tokenPct}%` }}
          >
            <div className="text-xs font-mono font-extrabold text-white drop-shadow">
              {tokens.toFixed(0)} Tokens
            </div>
          </div>

          {/* Grid lines inside cylinder */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-2 px-1 opacity-20">
            <div className="border-b border-white w-full" />
            <div className="border-b border-white w-full" />
            <div className="border-b border-white w-full" />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Refill: {Number(params.refill_rate || 5)} tokens/s</span>
        </div>
      </div>

      {/* Metrics & Queue Telemetry */}
      <div className="md:col-span-6 space-y-3">
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-slate-400 uppercase">Algorithm Mode</span>
            <span className="font-bold text-cyan-300 font-mono uppercase">{modeId.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-slate-400">Ingress Pressure</span>
            <span className="font-mono text-slate-200">{rate} req/s</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-slate-400">Queue Buffer</span>
            <span className="font-mono text-amber-400">{queueSize} in-flight</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/60">
            <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Passed (200 OK)</div>
            <div className="text-lg font-bold font-mono text-emerald-200 mt-0.5">
              {liveState?.allowed ?? 0}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/60">
            <div className="text-[10px] font-mono uppercase text-rose-400 font-bold">Throttled (429)</div>
            <div className="text-lg font-bold font-mono text-rose-200 mt-0.5">
              {liveState?.throttled ?? 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   3. LOAD BALANCER: CLUSTER SERVERS & ACTIVE CONNS
   ========================================================================= */
const LoadBalancerVisualizer: React.FC<{ liveState: any; latestOutcome?: OutcomeDef }> = ({
  liveState,
  latestOutcome,
}) => {
  const servers = liveState?.servers || [
    { id: 1, name: 'Server A', activeConns: 5, weight: 3, healthy: true },
    { id: 2, name: 'Server B', activeConns: 8, weight: 2, healthy: true },
    { id: 3, name: 'Server C', activeConns: 2, weight: 1, healthy: true },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {servers.map((s: any, idx: number) => {
          const isTarget = latestOutcome?.label?.includes(s.name);
          const maxConns = s.maxConns || 25;
          const connPct = Math.min(100, Math.round(((s.activeConns || 0) / maxConns) * 100));

          return (
            <div
              key={s.id || idx}
              className={`p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                isTarget
                  ? 'bg-slate-800/90 border-cyan-500 shadow-md shadow-cyan-500/20 scale-[1.02]'
                  : 'bg-slate-950/70 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Server className={`w-4 h-4 ${isTarget ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className="font-bold text-xs text-white">{s.name}</span>
                </div>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                    s.healthy !== false
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  {s.healthy !== false ? 'Healthy' : '503 Fail'}
                </span>
              </div>

              <div className="space-y-1.5 my-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>In-flight Conns</span>
                  <span className="font-bold text-slate-200">{s.activeConns || 0}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${
                      connPct > 80 ? 'bg-rose-500' : connPct > 50 ? 'bg-amber-400' : 'bg-cyan-400'
                    }`}
                    style={{ width: `${Math.max(8, connPct)}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Weight: {s.weight || 1}x</span>
                <span>Served: {s.served || 0}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* =========================================================================
   4. CACHE POLICIES: MEMORY SLOTS TABLE
   ========================================================================= */
const CachePoliciesVisualizer: React.FC<{ modeId: string; liveState: any; latestOutcome?: OutcomeDef }> = ({
  modeId,
  liveState,
  latestOutcome,
}) => {
  const size = liveState?.size || 0;
  const isHit = latestOutcome?.id?.includes('hit');
  const isEviction = latestOutcome?.id?.includes('evicted');

  const dummySlots = Array.from({ length: 8 }).map((_, i) => ({
    id: i,
    occupied: i < size,
    tag: i < size ? `slot:${i + 1}` : 'empty',
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-mono font-bold text-slate-300">
          RAM Cache Line Slots (Policy: <strong className="text-cyan-400 uppercase">{modeId}</strong>)
        </span>
        <div className="flex items-center gap-2">
          {isHit && (
            <span className="text-[11px] font-mono font-bold text-emerald-400 animate-pulse flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> CACHE HIT
            </span>
          )}
          {isEviction && (
            <span className="text-[11px] font-mono font-bold text-rose-400 animate-pulse flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> EVICTED
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {dummySlots.map((slot) => (
          <div
            key={slot.id}
            className={`p-2.5 rounded-lg border text-center transition-all ${
              slot.occupied
                ? 'bg-slate-900 border-cyan-800/80 shadow-sm'
                : 'bg-slate-950/40 border-slate-800 border-dashed opacity-50'
            }`}
          >
            <div className="text-[10px] font-mono text-slate-500">#{slot.id}</div>
            <div className={`text-xs font-mono font-bold mt-1 ${slot.occupied ? 'text-cyan-300' : 'text-slate-600'}`}>
              {slot.occupied ? 'OCC' : 'FREE'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* =========================================================================
   5. BLOOM FILTER: BIT ARRAY MATRIX
   ========================================================================= */
const BloomFilterVisualizer: React.FC<{ liveState: any; latestOutcome?: OutcomeDef }> = ({
  liveState,
  latestOutcome,
}) => {
  const bitSize = 32;
  const known = liveState?.known || 0;
  const fp = liveState?.fp || 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-slate-300 font-bold">Bit Array ($k=3$ Hash Functions)</span>
        <span className="text-cyan-400 font-mono">{known} Elements Indexed</span>
      </div>

      {/* 32-bit Cell Grid */}
      <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
        {Array.from({ length: bitSize }).map((_, i) => {
          const isSet = (i * 7 + known * 3) % 4 !== 0;
          return (
            <div
              key={i}
              className={`h-7 rounded flex items-center justify-center font-mono text-[10px] font-bold border ${
                isSet
                  ? 'bg-cyan-950/80 border-cyan-500/70 text-cyan-300 shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-900/60 border-slate-800 text-slate-600'
              }`}
            >
              {isSet ? '1' : '0'}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
        <span>False Positives: <strong className="text-rose-400">{fp}</strong></span>
        <span>Guaranteed 0% False Negatives</span>
      </div>
    </div>
  );
};

/* =========================================================================
   6. LSM-TREE STORAGE: MEMTABLE & SSTABLE COMPACTION
   ========================================================================= */
const LsmTreeVisualizer: React.FC<{ liveState: any; isPaused: boolean }> = ({ liveState }) => {
  const memtable = liveState?.memtable || 0;
  const l0 = liveState?.l0 || 0;
  const l1 = liveState?.l1 || 0;
  const memPct = Math.min(100, (memtable % 10) * 10);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* MemTable RAM */}
      <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-300">
          <span>MemTable (RAM)</span>
          <Database className="w-3.5 h-3.5" />
        </div>
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full bg-cyan-400 rounded-full transition-all duration-150" style={{ width: `${memPct}%` }} />
        </div>
        <div className="text-[10px] font-mono text-slate-400">
          SkipList Ingestion • Flush at 100%
        </div>
      </div>

      {/* Level 0 Disk */}
      <div className="p-3 rounded-xl bg-slate-950/80 border border-indigo-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono font-bold text-indigo-300">
          <span>Level 0 SSTables</span>
          <HardDrive className="w-3.5 h-3.5" />
        </div>
        <div className="text-base font-bold font-mono text-white">{l0} Files</div>
        <div className="text-[10px] font-mono text-slate-400">
          Overlapping key ranges
        </div>
      </div>

      {/* Level 1 Disk */}
      <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono font-bold text-purple-300">
          <span>Level 1 (Compacted)</span>
          <Layers className="w-3.5 h-3.5" />
        </div>
        <div className="text-base font-bold font-mono text-white">{l1} Files</div>
        <div className="text-[10px] font-mono text-slate-400">
          Merged & deduplicated runs
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   7. RAFT CONSENSUS: 5-NODE MESH
   ========================================================================= */
const RaftConsensusVisualizer: React.FC<{ liveState: any; isPaused: boolean }> = ({ liveState }) => {
  const term = liveState?.term || 1;
  const leaderId = liveState?.leader || 1;
  const isPartitioned = Boolean(liveState?.partitioned);

  const nodes = [1, 2, 3, 4, 5];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="font-bold text-slate-300">Raft Quorum Mesh (5 Nodes)</span>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-bold">Term #{term}</span>
          {isPartitioned && (
            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
              PARTITIONED
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {nodes.map((id) => {
          const isLeader = id === leaderId && !isPartitioned;

          return (
            <div
              key={id}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                isLeader
                  ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-500/20 scale-105'
                  : 'bg-slate-950/80 border-slate-800'
              }`}
            >
              {isLeader ? (
                <Crown className="w-5 h-5 text-amber-400 mb-1 animate-bounce" />
              ) : (
                <Server className="w-5 h-5 text-slate-400 mb-1" />
              )}
              <span className="text-xs font-bold font-mono text-white">Node {id}</span>
              <span className="text-[9px] font-mono text-slate-400 mt-0.5">
                {isLeader ? 'LEADER' : 'FOLLOWER'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* =========================================================================
   8. CIRCUIT BREAKER: TRI-STATE FINITE STATE MACHINE
   ========================================================================= */
const CircuitBreakerVisualizer: React.FC<{ liveState: any }> = ({ liveState }) => {
  const state = liveState?.state || 'CLOSED';

  const states = [
    { id: 'CLOSED', label: 'CLOSED (Healthy)', color: 'text-emerald-400', bg: 'bg-emerald-950/50 border-emerald-600' },
    { id: 'HALF_OPEN', label: 'HALF-OPEN (Probe)', color: 'text-amber-400', bg: 'bg-amber-950/50 border-amber-600' },
    { id: 'OPEN', label: 'OPEN (Tripped 503)', color: 'text-rose-400', bg: 'bg-rose-950/50 border-rose-600' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-slate-300 font-bold">Finite State Machine</span>
        <span className="text-slate-400">Failures: {liveState?.failures || 0}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {states.map((st) => {
          const isActive = state === st.id;
          return (
            <div
              key={st.id}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                isActive ? `${st.bg} shadow-lg scale-105` : 'bg-slate-950/40 border-slate-800 opacity-40'
              }`}
            >
              <Activity className={`w-4 h-4 mb-1 ${isActive ? st.color : 'text-slate-500'}`} />
              <span className={`text-xs font-mono font-bold ${isActive ? st.color : 'text-slate-500'}`}>
                {st.id}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* =========================================================================
   9. DISTRIBUTED TRANSACTIONS: SAGA VS 2PC
   ========================================================================= */
const DistributedTxVisualizer: React.FC<{ modeId: string; liveState: any; latestOutcome?: OutcomeDef }> = ({
  modeId,
  liveState,
}) => {
  const steps = ['Order Service', 'Payment Gateway', 'Inventory Service', 'Delivery Service'];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-slate-300 font-bold">
          Multi-Service Protocol: <strong className="text-cyan-400 uppercase">{modeId}</strong>
        </span>
        <span className="text-slate-400 font-mono">Committed: {liveState?.committed || 0}</span>
      </div>

      <div className="flex items-center justify-between gap-1 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
        {steps.map((step, idx) => (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center flex-1">
              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-xs font-bold text-cyan-300 font-mono">
                {idx + 1}
              </div>
              <span className="text-[10px] font-medium text-slate-300 mt-1.5 text-center truncate max-w-[70px]">
                {step}
              </span>
            </div>
            {idx < steps.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

/* =========================================================================
   10. MESSAGE QUEUE & STREAMING PARTITIONS
   ========================================================================= */
const MessageQueueVisualizer: React.FC<{ modeId: string; liveState: any; isPaused: boolean }> = ({
  liveState,
}) => {
  const backlog = liveState?.backlog || 0;
  const partitions = [0, 1, 2];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-slate-300 font-bold">Partitioned Topic Offsets</span>
        <span className="text-cyan-400 font-mono">Lag: {backlog} msgs</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {partitions.map((p) => (
          <div key={p} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Partition #{p}</span>
              <span className="text-cyan-300 font-bold">Offset {100 + p * 40}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full"
                style={{ width: `${Math.min(100, 20 + p * 30)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* =========================================================================
   REMAINING 8 SIMULATOR DOMAIN VISUALIZERS
   ========================================================================= */
const StorageIndexesVisualizer: React.FC<{ modeId: string; liveState: any }> = ({ modeId, liveState }) => (
  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-2">
    <div className="flex items-center justify-between text-slate-300 font-bold">
      <span>Index Structure: <strong className="text-cyan-400 uppercase">{modeId}</strong></span>
      <span>Total Ops: {liveState?.total || 0}</span>
    </div>
    <div className="text-[11px] text-slate-400">
      Visualizing internal pointer nodes, page splits, and binary key search bounds.
    </div>
  </div>
);

const ReplicationVisualizer: React.FC<{ modeId: string; liveState: any }> = ({ modeId, liveState }) => (
  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-2">
    <div className="flex items-center justify-between text-slate-300 font-bold">
      <span>Leader-Follower Quorum ({modeId})</span>
      <span className="text-amber-400">Lag: {liveState?.lag || 0}ms</span>
    </div>
    <div className="text-[11px] text-slate-400">
      Synchronous commit acknowledgement barrier ($W+R &gt; N$) vs asynchronous streaming.
    </div>
  </div>
);

const ShardingVisualizer: React.FC<{ modeId: string; liveState: any; latestOutcome?: OutcomeDef }> = ({
  liveState,
}) => (
  <div className="grid grid-cols-4 gap-2">
    {[1, 2, 3, 4].map((s) => (
      <div key={s} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-center font-mono">
        <div className="text-[10px] text-slate-400">Shard #{s}</div>
        <div className="text-xs font-bold text-cyan-300 mt-1">Slot range</div>
      </div>
    ))}
  </div>
);

const CdnEdgeVisualizer: React.FC<{ modeId: string; liveState: any }> = ({ liveState }) => (
  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-2">
    <div className="flex items-center justify-between text-slate-300 font-bold">
      <span>Global Edge POPs</span>
      <span className="text-emerald-400">Edge Hits: {liveState?.edge || 0}</span>
    </div>
    <div className="text-[11px] text-slate-400">
      Origin Shield offloading database traffic at continental edge locations.
    </div>
  </div>
);

const RetryStrategiesVisualizer: React.FC<{ modeId: string; liveState: any; latestOutcome?: OutcomeDef }> = ({
  modeId,
  liveState,
}) => (
  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-2">
    <div className="flex items-center justify-between text-slate-300 font-bold">
      <span>Retry Backoff: <strong className="text-cyan-400 uppercase">{modeId}</strong></span>
      <span>Attempts: {liveState?.wire || 0}</span>
    </div>
    <div className="text-[11px] text-slate-400">
      Jitter randomization preventing thundering herd retry storm harmonics.
    </div>
  </div>
);

const IdempotencyVisualizer: React.FC<{ modeId: string; liveState: any; latestOutcome?: OutcomeDef }> = ({
  liveState,
}) => (
  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-2">
    <div className="flex items-center justify-between text-slate-300 font-bold">
      <span>Idempotency-Key Deduplication Engine</span>
      <span className="text-emerald-400">Safely Deduped: {liveState?.deduped || 0}</span>
    </div>
    <div className="text-[11px] text-slate-400">
      Atomic hash checking guaranteeing strictly effectively-once transaction semantics.
    </div>
  </div>
);

const AutoscalingVisualizer: React.FC<{ liveState: any; rate: number }> = ({ liveState, rate }) => {
  const replicas = liveState?.replicas || 2;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-slate-300 font-bold">Kubernetes Horizontal Pod Fleet</span>
        <span className="text-cyan-400 font-mono">{replicas} Active Pods</span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {Array.from({ length: 8 }).map((_, i) => {
          const isAlive = i < replicas;
          return (
            <div
              key={i}
              className={`p-2 rounded-lg border text-center font-mono ${
                isAlive ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-sm' : 'bg-slate-950/40 border-slate-800 opacity-30 text-slate-600'
              }`}
            >
              <div className="text-[9px]">pod-{i + 1}</div>
              <div className="text-xs font-bold mt-0.5">{isAlive ? 'UP' : 'OFF'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const GossipProtocolVisualizer: React.FC<{ liveState: any }> = ({ liveState }) => (
  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-2">
    <div className="flex items-center justify-between text-slate-300 font-bold">
      <span>Epidemic P2P Rumor Mesh</span>
      <span className="text-cyan-400">Rounds: {liveState?.rounds || 0}</span>
    </div>
    <div className="text-[11px] text-slate-400">
      Decentralized gossip infection rounds converging node cluster states without single points of failure.
    </div>
  </div>
);

const GenericEnterpriseVisualizer: React.FC<{ liveState: any; rate: number; isPaused: boolean }> = ({
  liveState,
  rate,
  isPaused,
}) => (
  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-2">
    <div className="flex items-center justify-between text-slate-300 font-bold">
      <span>Enterprise Stream Engine</span>
      <span className="text-cyan-400">{isPaused ? 'PAUSED' : `${rate} req/s`}</span>
    </div>
    <div className="text-[11px] text-slate-400">
      Continuous high-throughput distributed algorithm streaming simulation.
    </div>
  </div>
);
