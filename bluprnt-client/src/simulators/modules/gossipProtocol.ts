import { SimulatorDefinition, SimulatorLogic, OutcomeDef, StatTileDef, RequestPayload } from '../engine/types';

export const GOSSIP_OUTCOMES: OutcomeDef[] = [
  { id: 'disseminated', label: 'Push Rumor Sent to Random Peer', color: '#10b981', shape: 'circle' },
  { id: 'merged', label: 'State Reconciled / Digest Updated', color: '#3b82f6', shape: 'square' },
  { id: 'heartbeat_phi', label: 'Accrual Heartbeat Sampled', color: '#06b6d4', shape: 'diamond' },
  { id: 'suspected_dead', label: 'Peer Suspected Dead (Phi > 8)', color: '#ef4444', shape: 'cross' },
];

export class GossipProtocolLogic implements SimulatorLogic {
  private mode: string = 'push_pull';
  private totalRounds: number = 0;
  private infectedNodes: number = 1;
  private totalNodes: number = 20;
  private suspectedNodes: number = 0;
  private peerDead: boolean = false;

  init(params: Record<string, any>, modeId: string): any {
    this.mode = modeId;
    this.reset();
    return this.getState();
  }

  reset(): void {
    this.totalRounds = 0;
    this.infectedNodes = 1;
    this.totalNodes = 20;
    this.suspectedNodes = 0;
    this.peerDead = false;
  }

  onRequest(req: RequestPayload, now: number): OutcomeDef {
    this.totalRounds++;

    if (this.peerDead) {
      this.suspectedNodes = 2;
      return GOSSIP_OUTCOMES[3]; // Suspected dead!
    }

    // Gossip infection spreading
    if (this.infectedNodes < this.totalNodes) {
      const spreadMultiplier = this.mode === 'push_pull' ? 3 : 2;
      this.infectedNodes = Math.min(this.totalNodes, this.infectedNodes + Math.floor(Math.random() * spreadMultiplier) + 1);
    }

    if (this.mode === 'phi_accrual') {
      return GOSSIP_OUTCOMES[2];
    }

    if (req.id % 2 === 0) {
      return GOSSIP_OUTCOMES[1]; // merged
    }

    return GOSSIP_OUTCOMES[0]; // disseminated
  }

  tick(dtMs: number, now: number): void {}

  getCenterMetric(): { label: string; value: string | number; percentage?: number } {
    const convergence = Math.round((this.infectedNodes / this.totalNodes) * 100);
    return {
      label: 'Convergence',
      value: `${convergence}%`,
      percentage: convergence,
    };
  }

  getStats(): [StatTileDef, StatTileDef, StatTileDef] {
    const convergence = Math.round((this.infectedNodes / this.totalNodes) * 100);
    return [
      { label: 'Cluster Size', value: `${this.totalNodes} Nodes`, color: '#38bdf8' },
      { label: 'State Convergence', value: `${convergence}%`, trend: convergence === 100 ? 'up' : 'neutral', color: convergence === 100 ? '#10b981' : '#f59e0b' },
      { label: 'Suspected Dead Nodes', value: this.suspectedNodes, trend: this.suspectedNodes === 0 ? 'neutral' : 'down', color: this.suspectedNodes === 0 ? '#10b981' : '#ef4444' },
    ];
  }

  getState(): any {
    return { rounds: this.totalRounds, infected: this.infectedNodes, suspected: this.suspectedNodes };
  }

  applyFailure(actionId: string): void {
    if (actionId === 'kill_peer') {
      this.peerDead = !this.peerDead;
    }
  }
}

export const gossipProtocolDefinition: SimulatorDefinition = {
  id: 'gossip-protocol',
  title: 'Gossip Protocols & Failure Detection',
  description: 'Visualize epidemic dissemination, state reconciliation, and Cassandra-style Phi Accrual failure detection.',
  linkedLessonId: 'gossip-failure-detection',
  defaultRate: 15,
  maxRate: 50,
  modes: [
    {
      id: 'push_pull',
      label: 'Push-Pull Gossip',
      explanation: 'Nodes exchange state digests. Missing keys are pushed and pulled simultaneously for exponential O(log N) convergence.',
    },
    {
      id: 'push_only',
      label: 'Push Gossip (Rumor Mongering)',
      explanation: 'Informed nodes randomly broadcast updates to peers. Fast initial spread, but leaves a tail of un-updated nodes.',
    },
    {
      id: 'phi_accrual',
      label: 'Phi (φ) Accrual Failure Detector',
      explanation: 'Maintains historical inter-arrival heartbeat distribution. Outputs continuous suspicion metric φ instead of binary up/down.',
    },
  ],
  params: [],
  outcomes: GOSSIP_OUTCOMES,
  failureActions: [
    { id: 'kill_peer', label: 'Drop Heartbeats on Peer 4 (Observe Phi Spikes)', apply: (s) => {} },
  ],
  createLogic: () => new GossipProtocolLogic(),
};
