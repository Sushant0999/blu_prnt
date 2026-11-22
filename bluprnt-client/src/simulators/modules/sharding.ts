import { SimulatorDefinition, SimulatorLogic, OutcomeDef, StatTileDef, RequestPayload } from '../engine/types';

export const SHARDING_OUTCOMES: OutcomeDef[] = [
  { id: 'shard_1', label: 'Single Shard 1 Routed', color: '#10b981', shape: 'circle' },
  { id: 'shard_2', label: 'Single Shard 2 Routed', color: '#3b82f6', shape: 'square' },
  { id: 'shard_3', label: 'Single Shard 3 Routed', color: '#8b5cf6', shape: 'diamond' },
  { id: 'scatter_gather', label: 'Cross-Shard Scatter-Gather Query', color: '#f59e0b', shape: 'triangle' },
  { id: 'hotspot', label: 'Shard Hotspot Overload', color: '#ef4444', shape: 'cross' },
];

export class ShardingLogic implements SimulatorLogic {
  private mode: string = 'hash_sharding';
  private totalOps: number = 0;
  private shardCounts: [number, number, number] = [0, 0, 0];
  private crossShardCount: number = 0;
  private hotspotTriggered: boolean = false;

  init(params: Record<string, any>, modeId: string): any {
    this.mode = modeId;
    this.reset();
    return this.getState();
  }

  reset(): void {
    this.totalOps = 0;
    this.shardCounts = [0, 0, 0];
    this.crossShardCount = 0;
    this.hotspotTriggered = false;
  }

  onRequest(req: RequestPayload, now: number): OutcomeDef {
    this.totalOps++;

    // Scatter-gather query (e.g. range scan or non-partition key search)
    if (req.id % 8 === 0) {
      this.crossShardCount++;
      this.shardCounts[0]++;
      this.shardCounts[1]++;
      this.shardCounts[2]++;
      return SHARDING_OUTCOMES[3]; // scatter-gather
    }

    let target = 0;
    if (this.hotspotTriggered || (this.mode === 'range_sharding' && req.id % 3 === 0)) {
      // Hotspot condition
      target = 0;
      this.shardCounts[0]++;
      if (this.shardCounts[0] > (this.shardCounts[1] + this.shardCounts[2]) * 1.5) {
        return SHARDING_OUTCOMES[4]; // hotspot overload
      }
      return SHARDING_OUTCOMES[0];
    }

    if (this.mode === 'hash_sharding') {
      target = (req.id * 2654435761) >>> 0 % 3;
    } else if (this.mode === 'geo') {
      target = req.id % 3; // mapped by region
    } else {
      // directory
      target = (req.id * 7) % 3;
    }

    this.shardCounts[target]++;
    if (target === 0) return SHARDING_OUTCOMES[0];
    if (target === 1) return SHARDING_OUTCOMES[1];
    return SHARDING_OUTCOMES[2];
  }

  tick(dtMs: number, now: number): void {}

  getCenterMetric(): { label: string; value: string | number; percentage?: number } {
    const total = this.shardCounts[0] + this.shardCounts[1] + this.shardCounts[2];
    const maxShard = Math.max(...this.shardCounts, 1);
    const maxShare = total > 0 ? Math.round((maxShard / total) * 100) : 33;

    return {
      label: 'Max Shard Load',
      value: `${maxShare}%`,
      percentage: maxShare,
    };
  }

  getStats(): [StatTileDef, StatTileDef, StatTileDef] {
    const total = this.shardCounts[0] + this.shardCounts[1] + this.shardCounts[2];
    const crossPct = this.totalOps > 0 ? Math.round((this.crossShardCount / this.totalOps) * 100) : 0;

    return [
      { label: 'Total Queries', value: this.totalOps, color: '#38bdf8' },
      { label: 'Cross-Shard Queries', value: `${crossPct}%`, trend: crossPct < 15 ? 'down' : 'up', color: crossPct < 15 ? '#10b981' : '#f59e0b' },
      { label: 'Shard Distribution', value: `${this.shardCounts[0]} / ${this.shardCounts[1]} / ${this.shardCounts[2]}`, color: '#a855f7' },
    ];
  }

  getState(): any {
    return { counts: this.shardCounts, total: this.totalOps };
  }

  applyFailure(actionId: string): void {
    if (actionId === 'create_hotspot') {
      this.hotspotTriggered = !this.hotspotTriggered;
    }
  }
}

export const shardingDefinition: SimulatorDefinition = {
  id: 'sharding-partitioning',
  title: 'Database Sharding & Partitioning',
  description: 'Evaluate Hash Sharding, Range Sharding, and Directory Lookup; observe cross-shard joins and partition hotspots.',
  linkedLessonId: 'database-sharding',
  defaultRate: 20,
  maxRate: 60,
  modes: [
    {
      id: 'hash_sharding',
      label: 'Hash-Based Sharding',
      explanation: 'Applies cryptographic hash to shard key (hash(id) % 3) for uniform data distribution without hotspot clustering.',
    },
    {
      id: 'range_sharding',
      label: 'Range-Based Sharding',
      explanation: 'Divides rows into contiguous key ranges (A-H, I-P, Q-Z). Efficient for range queries, but sequential IDs overload the highest shard.',
    },
    {
      id: 'directory',
      label: 'Directory / Lookup Service',
      explanation: 'Central coordinator maps keys to shard locations. Maximum flexibility for resharding, but directory is a query bottleneck.',
    },
    {
      id: 'geo',
      label: 'Geographic Sharding',
      explanation: 'Partitions customers to the nearest physical datacenter based on location metadata for low-latency compliance.',
    },
  ],
  params: [],
  outcomes: SHARDING_OUTCOMES,
  failureActions: [
    { id: 'create_hotspot', label: 'Toggle Celebrity / Monotonic Key Hotspot', apply: (s) => {} },
  ],
  createLogic: () => new ShardingLogic(),
};
