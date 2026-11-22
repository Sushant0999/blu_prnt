import { SimulatorDefinition, SimulatorLogic, OutcomeDef, StatTileDef, RequestPayload } from '../engine/types';

export const RAFT_OUTCOMES: OutcomeDef[] = [
  { id: 'heartbeat_ok', label: 'Leader Heartbeat Acked (Quorum OK)', color: '#10b981', shape: 'circle' },
  { id: 'log_committed', label: 'Log Entry Committed to State Machine', color: '#3b82f6', shape: 'square' },
  { id: 'vote_granted', label: 'Candidate Received Quorum Vote', color: '#a855f7', shape: 'diamond' },
  { id: 'quorum_lost', label: 'Quorum Lost (Minority Partition)', color: '#ef4444', shape: 'cross' },
];

export class RaftLogic implements SimulatorLogic {
  private mode: string = 'replication';
  private term: number = 1;
  private leaderId: string = 'Node-1';
  private commitIndex: number = 0;
  private isPartitioned: boolean = false;
  private electionTimer: number = 1500; // ms
  private timeSinceHeartbeat: number = 0;
  private totalCommands: number = 0;

  init(params: Record<string, any>, modeId: string): any {
    this.mode = modeId;
    this.reset();
    return this.getState();
  }

  reset(): void {
    this.term = 1;
    this.leaderId = 'Node-1';
    this.commitIndex = 0;
    this.isPartitioned = false;
    this.timeSinceHeartbeat = 0;
    this.totalCommands = 0;
  }

  onRequest(req: RequestPayload, now: number): OutcomeDef {
    this.totalCommands++;

    if (this.isPartitioned) {
      return RAFT_OUTCOMES[3]; // Quorum lost!
    }

    if (this.mode === 'election') {
      if (req.id % 4 === 0) {
        this.term++;
        this.leaderId = `Node-${(this.term % 3) + 1}`;
        return RAFT_OUTCOMES[2]; // Vote granted / new leader
      }
      return RAFT_OUTCOMES[0];
    }

    // Replication
    this.commitIndex++;
    return RAFT_OUTCOMES[1]; // Log entry committed
  }

  tick(dtMs: number, now: number): void {
    this.timeSinceHeartbeat += dtMs;
    if (this.timeSinceHeartbeat >= 300) {
      this.timeSinceHeartbeat = 0;
    }
  }

  getCenterMetric(): { label: string; value: string | number; percentage?: number } {
    return {
      label: 'Raft Term',
      value: `Term ${this.term}`,
      percentage: this.isPartitioned ? 25 : 100,
    };
  }

  getStats(): [StatTileDef, StatTileDef, StatTileDef] {
    return [
      { label: 'Active Leader', value: this.isPartitioned ? 'Split-Brain Prevented' : this.leaderId, color: this.isPartitioned ? '#ef4444' : '#10b981' },
      { label: 'Log Commit Index', value: `#${this.commitIndex}`, color: '#38bdf8' },
      { label: 'Quorum Health', value: this.isPartitioned ? 'Degraded (2/5)' : 'Healthy (5/5)', trend: this.isPartitioned ? 'down' : 'up', color: this.isPartitioned ? '#ef4444' : '#10b981' },
    ];
  }

  getState(): any {
    return { term: this.term, leader: this.leaderId, commitIndex: this.commitIndex, partitioned: this.isPartitioned };
  }

  applyFailure(actionId: string): void {
    if (actionId === 'crash_leader') {
      this.term++;
      this.leaderId = `Node-${(this.term % 3) + 1}`;
    } else if (actionId === 'isolate_partition') {
      this.isPartitioned = !this.isPartitioned;
    }
  }
}

export const raftConsensusDefinition: SimulatorDefinition = {
  id: 'raft-consensus',
  title: 'Consensus: Raft Protocol',
  description: 'Step through leader elections, heartbeat leases, term increments, quorum majorities, and split-brain prevention.',
  linkedLessonId: 'raft-consensus',
  defaultRate: 15,
  maxRate: 40,
  modes: [
    {
      id: 'replication',
      label: 'Log Replication',
      explanation: 'Clients write to the leader; the leader appends entries to its log and commits once replicated to a majority.',
    },
    {
      id: 'election',
      label: 'Leader Election',
      explanation: 'Followers transition to Candidate on heartbeat timeout, incrementing term and requesting votes across the cluster.',
    },
    {
      id: 'partition',
      label: 'Partition Isolation',
      explanation: 'Isolates minority sub-clusters. The minority rejects writes due to lack of quorum, preventing data divergence.',
    },
  ],
  params: [],
  outcomes: RAFT_OUTCOMES,
  failureActions: [
    { id: 'crash_leader', label: 'Crash Current Leader (Trigger Term Election)', apply: (s) => {} },
    { id: 'isolate_partition', label: 'Toggle Minority Network Partition (Quorum Loss)', apply: (s) => {} },
  ],
  createLogic: () => new RaftLogic(),
};
