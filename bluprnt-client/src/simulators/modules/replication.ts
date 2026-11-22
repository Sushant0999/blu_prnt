import { SimulatorDefinition, SimulatorLogic, OutcomeDef, StatTileDef, RequestPayload } from '../engine/types';

export const REPLICATION_OUTCOMES: OutcomeDef[] = [
  { id: 'committed_sync', label: 'Sync Write Committed to Quorum', color: '#10b981', shape: 'circle' },
  { id: 'ack_async', label: 'Async Write Acked (In-Flight to Replicas)', color: '#06b6d4', shape: 'square' },
  { id: 'stale_read', label: 'Stale Read on Lagging Follower', color: '#f59e0b', shape: 'diamond' },
  { id: 'replication_blocked', label: 'Write Stalled / Timeout (Lag Exceeded)', color: '#ef4444', shape: 'cross' },
];

export class ReplicationLogic implements SimulatorLogic {
  private mode: string = 'single_leader_async';
  private totalOps: number = 0;
  private replicaLagMs: number = 15;
  private staleReadsCount: number = 0;
  private blockedWrites: number = 0;
  private followerLagMultiplier: number = 1;

  init(params: Record<string, any>, modeId: string): any {
    this.mode = modeId;
    this.reset();
    return this.getState();
  }

  reset(): void {
    this.totalOps = 0;
    this.replicaLagMs = this.mode === 'single_leader_async' ? 35 : 5;
    this.staleReadsCount = 0;
    this.blockedWrites = 0;
    this.followerLagMultiplier = 1;
  }

  onRequest(req: RequestPayload, now: number): OutcomeDef {
    this.totalOps++;
    const isRead = req.id % 2 === 0;

    if (isRead) {
      if (this.replicaLagMs > 80 && (this.mode === 'single_leader_async' || this.mode === 'semi_sync')) {
        this.staleReadsCount++;
        return REPLICATION_OUTCOMES[2]; // stale read
      }
      return REPLICATION_OUTCOMES[0];
    }

    // Write operation
    if (this.mode === 'single_leader_async') {
      return REPLICATION_OUTCOMES[1]; // async acked instantly
    }

    if (this.mode === 'single_leader_sync') {
      if (this.followerLagMultiplier > 3) {
        this.blockedWrites++;
        return REPLICATION_OUTCOMES[3]; // blocked
      }
      return REPLICATION_OUTCOMES[0]; // committed sync
    }

    if (this.mode === 'quorum') {
      // W + R > N (e.g. N=3, W=2, R=2)
      return REPLICATION_OUTCOMES[0]; // strict quorum commit
    }

    // semi_sync: leader + 1 sync follower
    return REPLICATION_OUTCOMES[0];
  }

  tick(dtMs: number, now: number): void {
    // Dynamic simulated lag fluctuation
    const base = this.mode === 'single_leader_async' ? 30 : this.mode === 'single_leader_sync' ? 8 : 12;
    this.replicaLagMs = Math.round(base * this.followerLagMultiplier + Math.sin(now / 500) * 10);
  }

  getCenterMetric(): { label: string; value: string | number; percentage?: number } {
    const lag = Math.max(0, this.replicaLagMs);
    const pct = Math.min(100, Math.round((lag / 150) * 100));
    return {
      label: 'Follower Lag',
      value: `${lag} ms`,
      percentage: pct,
    };
  }

  getStats(): [StatTileDef, StatTileDef, StatTileDef] {
    return [
      { label: 'Replication Stream', value: `${this.totalOps} msgs`, color: '#38bdf8' },
      { label: 'Replication Lag', value: `${this.replicaLagMs} ms`, trend: this.replicaLagMs < 40 ? 'down' : 'up', color: this.replicaLagMs < 40 ? '#10b981' : '#f59e0b' },
      { label: 'Stale Read Incidents', value: this.staleReadsCount, trend: this.staleReadsCount === 0 ? 'neutral' : 'down', color: this.staleReadsCount === 0 ? '#10b981' : '#ef4444' },
    ];
  }

  getState(): any {
    return { lag: this.replicaLagMs, stale: this.staleReadsCount, blocked: this.blockedWrites };
  }

  applyFailure(actionId: string): void {
    if (actionId === 'induce_network_lag') {
      this.followerLagMultiplier = this.followerLagMultiplier > 1 ? 1 : 4.5;
    }
  }
}

export const replicationDefinition: SimulatorDefinition = {
  id: 'replication',
  title: 'Replication Strategies & Consistency',
  description: 'Simulate single-leader async, synchronous, semi-sync, and quorum replication under fluctuating follower lag.',
  linkedLessonId: 'replication-models',
  defaultRate: 20,
  maxRate: 50,
  modes: [
    {
      id: 'single_leader_async',
      label: 'Single-Leader Async',
      explanation: 'Primary acknowledges writes immediately and sends replication streams asynchronously. Risk of stale reads and failover data loss.',
    },
    {
      id: 'single_leader_sync',
      label: 'Single-Leader Sync',
      explanation: 'Primary halts until all followers confirm disk write. Zero data loss, but one slow follower blocks the entire system.',
    },
    {
      id: 'semi_sync',
      label: 'Semi-Synchronous',
      explanation: 'Primary waits for at least 1 follower to acknowledge before returning. Best balance of latency and durability.',
    },
    {
      id: 'quorum',
      label: 'Quorum (W + R > N)',
      explanation: 'Leaderless / Dynamo style: Writes wait for W nodes, reads query R nodes. Guarantees overlap and latest version retrieval.',
    },
  ],
  params: [],
  outcomes: REPLICATION_OUTCOMES,
  failureActions: [
    { id: 'induce_network_lag', label: 'Toggle Follower Network Partition / Lag Spike', apply: (s) => {} },
  ],
  createLogic: () => new ReplicationLogic(),
};
