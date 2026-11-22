import { SimulatorDefinition, SimulatorLogic, OutcomeDef, StatTileDef, RequestPayload } from '../engine/types';

export const LB_OUTCOMES: OutcomeDef[] = [
  { id: 'node_a', label: 'Routed to Server A', color: '#06b6d4', shape: 'circle' },
  { id: 'node_b', label: 'Routed to Server B', color: '#3b82f6', shape: 'square' },
  { id: 'node_c', label: 'Routed to Server C', color: '#8b5cf6', shape: 'diamond' },
  { id: 'overloaded', label: 'Server Overloaded (503)', color: '#ef4444', shape: 'cross' },
];

interface ServerNode {
  id: string;
  weight: number;
  activeConns: number;
  latencyMs: number;
  isDead: boolean;
}

export class LoadBalancerLogic implements SimulatorLogic {
  private mode: string = 'round_robin';
  private rrIndex: number = 0;
  private totalReqs: number = 0;
  private routedCounts: Record<string, number> = { A: 0, B: 0, C: 0 };
  private droppedCount: number = 0;

  private servers: ServerNode[] = [
    { id: 'A', weight: 1, activeConns: 0, latencyMs: 25, isDead: false },
    { id: 'B', weight: 3, activeConns: 0, latencyMs: 40, isDead: false },
    { id: 'C', weight: 2, activeConns: 0, latencyMs: 65, isDead: false },
  ];

  init(params: Record<string, any>, modeId: string): any {
    this.mode = modeId;
    this.reset();
    return this.getState();
  }

  reset(): void {
    this.rrIndex = 0;
    this.totalReqs = 0;
    this.routedCounts = { A: 0, B: 0, C: 0 };
    this.droppedCount = 0;
    this.servers.forEach((s) => {
      s.activeConns = 0;
      s.isDead = false;
    });
  }

  onRequest(req: RequestPayload, now: number): OutcomeDef {
    this.totalReqs++;
    const aliveServers = this.servers.filter((s) => !s.isDead);

    if (aliveServers.length === 0) {
      this.droppedCount++;
      return LB_OUTCOMES[3];
    }

    let chosen: ServerNode = aliveServers[0];

    if (this.mode === 'round_robin') {
      chosen = aliveServers[this.rrIndex % aliveServers.length];
      this.rrIndex++;
    } else if (this.mode === 'weighted_rr') {
      // Weighted selection
      const totalWeight = aliveServers.reduce((sum, s) => sum + s.weight, 0);
      let rand = (this.rrIndex % totalWeight) + 1;
      this.rrIndex++;
      for (const s of aliveServers) {
        rand -= s.weight;
        if (rand <= 0) {
          chosen = s;
          break;
        }
      }
    } else if (this.mode === 'least_conns') {
      chosen = [...aliveServers].sort((a, b) => a.activeConns - b.activeConns)[0];
    } else if (this.mode === 'least_time') {
      chosen = [...aliveServers].sort((a, b) => (a.latencyMs * (a.activeConns + 1)) - (b.latencyMs * (b.activeConns + 1)))[0];
    } else if (this.mode === 'ip_hash') {
      const hash = (req.id * 2654435761) >>> 0;
      chosen = aliveServers[hash % aliveServers.length];
    } else if (this.mode === 'power_of_two') {
      const idx1 = Math.floor(Math.random() * aliveServers.length);
      const idx2 = (idx1 + 1 + Math.floor(Math.random() * (aliveServers.length - 1))) % aliveServers.length;
      const s1 = aliveServers[idx1];
      const s2 = aliveServers[idx2];
      chosen = s1.activeConns <= s2.activeConns ? s1 : s2;
    }

    // Assign connection
    chosen.activeConns++;
    this.routedCounts[chosen.id] = (this.routedCounts[chosen.id] || 0) + 1;

    if (chosen.id === 'A') return LB_OUTCOMES[0];
    if (chosen.id === 'B') return LB_OUTCOMES[1];
    return LB_OUTCOMES[2];
  }

  tick(dtMs: number, now: number): void {
    // Bleed off connections over time based on latency
    this.servers.forEach((s) => {
      if (s.activeConns > 0) {
        const drain = Math.max(1, Math.floor((dtMs / s.latencyMs) * 1.5));
        s.activeConns = Math.max(0, s.activeConns - drain);
      }
    });
  }

  getCenterMetric(): { label: string; value: string | number; percentage?: number } {
    const totalActive = this.servers.reduce((sum, s) => sum + s.activeConns, 0);
    const maxCapacity = 60;
    const pct = Math.min(100, Math.round((totalActive / maxCapacity) * 100));
    return {
      label: 'Active In-Flight',
      value: `${totalActive} conns`,
      percentage: pct,
    };
  }

  getStats(): [StatTileDef, StatTileDef, StatTileDef] {
    const maxRouted = Math.max(...Object.values(this.routedCounts), 1);
    const minRouted = Math.min(...Object.values(this.routedCounts));
    const varianceRatio = Math.round(((maxRouted - minRouted) / maxRouted) * 100);

    return [
      { label: 'Total Dispatched', value: this.totalReqs, color: '#38bdf8' },
      { label: 'Cluster Imbalance', value: `${varianceRatio}%`, trend: varianceRatio < 25 ? 'down' : 'up', color: varianceRatio < 25 ? '#10b981' : '#f59e0b' },
      { label: 'Dropped (503)', value: this.droppedCount, trend: this.droppedCount === 0 ? 'neutral' : 'down', color: this.droppedCount === 0 ? '#10b981' : '#ef4444' },
    ];
  }

  getState(): any {
    return { servers: this.servers, total: this.totalReqs };
  }

  applyFailure(actionId: string): void {
    if (actionId === 'kill_server_b') {
      const b = this.servers.find((s) => s.id === 'B');
      if (b) b.isDead = !b.isDead;
    } else if (actionId === 'slow_server_c') {
      const c = this.servers.find((s) => s.id === 'C');
      if (c) c.latencyMs = c.latencyMs > 100 ? 65 : 300;
    }
  }
}

export const loadBalancerDefinition: SimulatorDefinition = {
  id: 'load-balancer',
  title: 'Load Balancer Algorithms',
  description: 'Dispatch requests across server pools with Round Robin, Weighted, Least Connections, Latency, and Power-of-Two.',
  linkedLessonId: 'load-balancing',
  defaultRate: 20,
  maxRate: 60,
  modes: [
    {
      id: 'round_robin',
      label: 'Round Robin',
      explanation: 'Sequentially loops through all available healthy backend servers regardless of capacity or load.',
    },
    {
      id: 'weighted_rr',
      label: 'Weighted Round Robin',
      explanation: 'Dispatches traffic proportionally according to each server spec capacity (Server B=3x, C=2x, A=1x).',
    },
    {
      id: 'least_conns',
      label: 'Least Connections',
      explanation: 'Directs the next request to the node with the fewest active pending concurrent connections.',
    },
    {
      id: 'least_time',
      label: 'Least Response Time',
      explanation: 'Combines current active in-flight count with historical response latency to minimize client wait time.',
    },
    {
      id: 'ip_hash',
      label: 'IP Hash (Affinity)',
      explanation: 'Hashes client identifier to ensure persistent routing to the same backend server (session affinity).',
    },
    {
      id: 'power_of_two',
      label: 'Power of Two Choices',
      explanation: 'Picks two servers at random and dispatches to the one with lower load; avoids herd behavior with zero coordination overhead.',
    },
  ],
  params: [],
  outcomes: LB_OUTCOMES,
  failureActions: [
    { id: 'kill_server_b', label: 'Kill / Revive Server B (High Weight)', apply: (s) => {} },
    { id: 'slow_server_c', label: 'Toggle 300ms Degradation on Server C', apply: (s) => {} },
  ],
  createLogic: () => new LoadBalancerLogic(),
};
