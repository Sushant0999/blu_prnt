import { SimulatorDefinition, SimulatorLogic, OutcomeDef, StatTileDef, RequestPayload } from '../engine/types';

export const TX_OUTCOMES: OutcomeDef[] = [
  { id: 'commit_success', label: 'Transaction Committed Successfully', color: '#10b981', shape: 'circle' },
  { id: 'prepared', label: 'Prepare Phase Verified (Locks Held)', color: '#3b82f6', shape: 'square' },
  { id: 'saga_compensated', label: 'Saga Compensating Rollback Executed', color: '#f59e0b', shape: 'diamond' },
  { id: 'coordinator_abort', label: 'Coordinator Abort / Timeout', color: '#ef4444', shape: 'cross' },
];

export class DistributedTxLogic implements SimulatorLogic {
  private mode: string = 'saga_orchestration';
  private totalTx: number = 0;
  private committedTx: number = 0;
  private compensatedTx: number = 0;
  private abortedTx: number = 0;
  private failureRate: number = 10; // %

  init(params: Record<string, any>, modeId: string): any {
    this.mode = modeId;
    this.failureRate = Number(params.failureRate || 10);
    this.reset();
    return this.getState();
  }

  reset(): void {
    this.totalTx = 0;
    this.committedTx = 0;
    this.compensatedTx = 0;
    this.abortedTx = 0;
  }

  onRequest(req: RequestPayload, now: number): OutcomeDef {
    this.totalTx++;
    const hasParticipantFailure = req.id % 8 === 0;

    if (this.mode === 'two_phase_commit') {
      if (hasParticipantFailure) {
        this.abortedTx++;
        return TX_OUTCOMES[3]; // Abort
      }
      this.committedTx++;
      return TX_OUTCOMES[0]; // Commit
    }

    if (this.mode === 'three_phase_commit') {
      if (hasParticipantFailure) {
        this.abortedTx++;
        return TX_OUTCOMES[3];
      }
      this.committedTx++;
      return TX_OUTCOMES[0];
    }

    // Saga Choreography & Saga Orchestration
    if (hasParticipantFailure) {
      this.compensatedTx++;
      return TX_OUTCOMES[2]; // Compensating transaction
    }

    this.committedTx++;
    return TX_OUTCOMES[0];
  }

  tick(dtMs: number, now: number): void {}

  getCenterMetric(): { label: string; value: string | number; percentage?: number } {
    const successRate = this.totalTx > 0 ? Math.round((this.committedTx / this.totalTx) * 100) : 100;
    return {
      label: 'Success Rate',
      value: `${successRate}%`,
      percentage: successRate,
    };
  }

  getStats(): [StatTileDef, StatTileDef, StatTileDef] {
    const successRate = this.totalTx > 0 ? Math.round((this.committedTx / this.totalTx) * 100) : 100;
    return [
      { label: 'Total Executions', value: this.totalTx, color: '#38bdf8' },
      { label: 'Success Rate', value: `${successRate}%`, trend: successRate >= 85 ? 'up' : 'down', color: successRate >= 85 ? '#10b981' : '#f59e0b' },
      { label: 'Saga Compensations', value: this.compensatedTx, trend: this.compensatedTx === 0 ? 'neutral' : 'down', color: this.compensatedTx === 0 ? '#10b981' : '#f59e0b' },
    ];
  }

  getState(): any {
    return { total: this.totalTx, committed: this.committedTx, rollbacks: this.compensatedTx + this.abortedTx };
  }

  applyFailure(actionId: string): void {
    if (actionId === 'induce_participant_timeout') {
      this.abortedTx += 5;
    }
  }
}

export const distributedTxDefinition: SimulatorDefinition = {
  id: 'distributed-transactions',
  title: 'Distributed Transactions: 2PC vs Saga',
  description: 'Examine atomic commit protocols (Two-Phase Commit, 3PC) versus eventually consistent Sagas with compensating actions.',
  linkedLessonId: 'distributed-transactions',
  defaultRate: 15,
  maxRate: 40,
  modes: [
    {
      id: 'saga_orchestration',
      label: 'Saga Orchestration',
      explanation: 'A central coordinator invokes service endpoints in sequence. If a step fails, explicit compensating steps roll back state.',
    },
    {
      id: 'saga_choreography',
      label: 'Saga Choreography',
      explanation: 'Services react to domain events published to a message broker with no single coordinator. Decentralized and decoupled.',
    },
    {
      id: 'two_phase_commit',
      label: 'Two-Phase Commit (2PC)',
      explanation: 'Prepare phase locks row resources across all nodes; Commit phase finalizes. Strictly atomic, but blocks during coordinator crashes.',
    },
    {
      id: 'three_phase_commit',
      label: 'Three-Phase Commit (3PC)',
      explanation: 'Adds a Pre-Commit timeout state to eliminate blocking states in 2PC across non-partitioned networks.',
    },
  ],
  params: [],
  outcomes: TX_OUTCOMES,
  failureActions: [
    { id: 'induce_participant_timeout', label: 'Induce Participant Disk Failure / Timeout', apply: (s) => {} },
  ],
  createLogic: () => new DistributedTxLogic(),
};
