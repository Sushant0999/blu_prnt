import { SimulatorDefinition, SimulatorLogic, OutcomeDef, StatTileDef, RequestPayload } from '../engine/types';

export const LB_OUTCOMES: OutcomeDef[] = [
  { id: 'node_a', label: 'Routed to Server A', color: '#06b6d4', shape: 'circle' },
  { id: 'node_b', label: 'Routed to Server B', color: '#3b82f6', shape: 'square' },
  { id: 'node_c', label: 'Routed to Server C', color: '#8b5cf6', shape: 'diamond' },
  { id: 'overloaded', label: 'Server Overloaded (503)', color: '#ef4444', shape: 'cross' },
];

export interface ServerNode {
  id: string; // 'A', 'B', 'C'
  label: string; // 'srv1', 'srv2', 'srv3'
  weight: number;
  activeConns: number;
  pendingConns: number;
  doneCount: number;
  latencyMs: number;
  isDead: boolean;
  isSlow: boolean;
  capacity: number;
}

export interface InFlightPacket {
  id: number;
  targetServerId: string;
  targetServerLabel: string;
  stage: 'client_to_balancer' | 'balancer_to_server';
  progress: number;
  elapsedMs: number;
}

interface ServerJob {
  serverId: string;
  remainingMs: number;
}

class DeterministicPrng {
  private state: number;

  constructor(seed = 1337) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }

  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }
}

export class LoadBalancerLogic implements SimulatorLogic {
  private mode: string = 'round_robin';
  private rrIndex: number = 0;
  private totalReqs: number = 0;
  private routedCounts: Record<string, number> = { A: 0, B: 0, C: 0 };
  private droppedCount: number = 0;
  private prng: DeterministicPrng = new DeterministicPrng(1337);

  private inFlightPackets: InFlightPacket[] = [];
  private activeJobs: ServerJob[] = [];

  private servers: ServerNode[] = [
    { id: 'A', label: 'srv1', weight: 1, activeConns: 0, pendingConns: 0, doneCount: 0, latencyMs: 35, isDead: false, isSlow: false, capacity: 10 },
    { id: 'B', label: 'srv2', weight: 3, activeConns: 0, pendingConns: 0, doneCount: 0, latencyMs: 35, isDead: false, isSlow: false, capacity: 10 },
    { id: 'C', label: 'srv3', weight: 2, activeConns: 0, pendingConns: 0, doneCount: 0, latencyMs: 35, isDead: false, isSlow: false, capacity: 10 },
  ];

  init(params: Record<string, any>, modeId: string, seed: number = 1337): any {
    this.mode = modeId;
    this.prng = new DeterministicPrng(seed);
    this.reset();
    return this.getState();
  }

  reset(): void {
    this.rrIndex = 0;
    this.totalReqs = 0;
    this.routedCounts = { A: 0, B: 0, C: 0 };
    this.droppedCount = 0;
    this.inFlightPackets = [];
    this.activeJobs = [];
    this.servers.forEach((s) => {
      s.activeConns = 0;
      s.pendingConns = 0;
      s.doneCount = 0;
      s.isDead = false;
      s.isSlow = false;
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
      chosen = [...aliveServers].sort((a, b) => (a.activeConns + a.pendingConns) - (b.activeConns + b.pendingConns))[0];
    } else if (this.mode === 'least_time') {
      chosen = [...aliveServers].sort((a, b) => {
        const factorA = a.isSlow ? 5 : 1;
        const factorB = b.isSlow ? 5 : 1;
        const scoreA = (a.latencyMs * factorA) * (a.activeConns + a.pendingConns + 1);
        const scoreB = (b.latencyMs * factorB) * (b.activeConns + b.pendingConns + 1);
        return scoreA - scoreB;
      })[0];
    } else if (this.mode === 'ip_hash') {
      const hash = (req.id * 2654435761) >>> 0;
      chosen = aliveServers[hash % aliveServers.length];
    } else if (this.mode === 'power_of_two') {
      const idx1 = Math.floor(this.prng.next() * aliveServers.length);
      const idx2 = (idx1 + 1 + Math.floor(this.prng.next() * (aliveServers.length - 1))) % aliveServers.length;
      const s1 = aliveServers[idx1];
      const s2 = aliveServers[idx2];
      chosen = (s1.activeConns + s1.pendingConns) <= (s2.activeConns + s2.pendingConns) ? s1 : s2;
    }

    // Assign connection
    chosen.pendingConns++;
    this.routedCounts[chosen.id] = (this.routedCounts[chosen.id] || 0) + 1;

    // Spawn animated packet: Clients -> Balancer (300ms) -> Chosen Server (300ms)
    this.inFlightPackets.push({
      id: req.id,
      targetServerId: chosen.id,
      targetServerLabel: chosen.label,
      stage: 'client_to_balancer',
      progress: 0,
      elapsedMs: 0,
    });

    if (chosen.id === 'A') return LB_OUTCOMES[0];
    if (chosen.id === 'B') return LB_OUTCOMES[1];
    return LB_OUTCOMES[2];
  }

  tick(dtMs: number, now: number): void {
    // 1. Advance in-flight packets along travel path (600ms total)
    for (let i = 0; i < this.inFlightPackets.length; i++) {
      const p = this.inFlightPackets[i];
      p.elapsedMs += dtMs;

      if (p.elapsedMs < 300) {
        p.stage = 'client_to_balancer';
        p.progress = Math.min(1, p.elapsedMs / 300);
      } else if (p.elapsedMs < 600) {
        p.stage = 'balancer_to_server';
        p.progress = Math.min(1, (p.elapsedMs - 300) / 300);
      } else {
        // Packet arrived at server!
        p.progress = 1;
        const targetServer = this.servers.find((s) => s.id === p.targetServerId);
        if (targetServer) {
          targetServer.pendingConns = Math.max(0, targetServer.pendingConns - 1);
          targetServer.activeConns++;

          // A slow server takes much longer to process requests (2500ms vs 350ms)
          const serviceLatencyMs = targetServer.isSlow ? 2500 : 350;
          const carryOverMs = p.elapsedMs - 600;

          this.activeJobs.push({
            serverId: targetServer.id,
            remainingMs: Math.max(0, serviceLatencyMs - carryOverMs),
          });
        }
      }
    }

    // Retain only travelling packets
    this.inFlightPackets = this.inFlightPackets.filter((p) => p.elapsedMs < 600);

    // 2. Advance server jobs: when finished, active goes down, done goes up
    const remainingJobs: ServerJob[] = [];
    for (const job of this.activeJobs) {
      job.remainingMs -= dtMs;
      if (job.remainingMs <= 0) {
        const s = this.servers.find((srv) => srv.id === job.serverId);
        if (s) {
          s.activeConns = Math.max(0, s.activeConns - 1);
          s.doneCount++;
        }
      } else {
        remainingJobs.push(job);
      }
    }
    this.activeJobs = remainingJobs;
  }

  getHandled(): number {
    return this.servers.reduce((sum, s) => sum + s.doneCount, 0);
  }

  getInFlight(): number {
    return this.servers.reduce((sum, s) => sum + s.activeConns, 0);
  }

  getImbalance(): number {
    const actives = this.servers.map((s) => s.activeConns);
    return Math.max(...actives) - Math.min(...actives);
  }

  getCenterMetric(): { label: string; value: string | number; percentage?: number } {
    const inFlight = this.getInFlight();
    const maxCapacity = 30; // 3 servers * 10
    const pct = Math.min(100, Math.round((inFlight / maxCapacity) * 100));
    return {
      label: 'Active In-Flight',
      value: `${inFlight} conns`,
      percentage: pct,
    };
  }

  getStats(): [StatTileDef, StatTileDef, StatTileDef] {
    const handled = this.getHandled();
    const inFlight = this.getInFlight();
    const imbalance = this.getImbalance();

    return [
      { label: 'Handled', value: handled, color: '#38bdf8' },
      { label: 'In flight', value: inFlight, trend: inFlight > 10 ? 'up' : 'neutral', color: inFlight > 10 ? '#f59e0b' : '#10b981' },
      { label: 'Imbalance', value: imbalance, trend: imbalance <= 2 ? 'neutral' : 'up', color: imbalance <= 2 ? '#10b981' : '#ef4444' },
    ];
  }

  getState(): any {
    const nodes = [
      { id: 'clients', label: 'Clients', kind: 'source' },
      { id: 'balancer', label: 'Balancer', kind: 'hub' },
      ...this.servers.map((s) => ({
        id: s.label,
        label: s.label,
        kind: 'card',
      })),
    ];

    const edges = [
      { id: 'edge-client-balancer', source: 'clients', target: 'balancer' },
      ...this.servers.map((s) => ({
        id: `edge-balancer-${s.label}`,
        source: 'balancer',
        target: s.label,
      })),
    ];

    const nodeStatus: Record<string, any> = {};
    this.servers.forEach((s) => {
      nodeStatus[s.label] = {
        active: s.activeConns,
        done: s.doneCount,
        load: Math.min(1, s.activeConns / s.capacity),
        state: s.isDead ? 'failed' : s.isSlow ? 'slow' : s.activeConns >= s.capacity ? 'overloaded' : 'normal',
        stateLabel: s.isSlow ? 'SLOW' : undefined,
      };
    });

    const packets = this.inFlightPackets.map((p) => ({
      id: p.id,
      edgeId: p.stage === 'client_to_balancer' ? 'edge-client-balancer' : `edge-balancer-${p.targetServerLabel}`,
      progress: Math.min(1, Math.max(0, p.progress)),
      color: '#2e6930',
    }));

    return {
      servers: this.servers,
      nodes,
      edges,
      packets,
      nodeStatus,
      stats: {
        handled: this.getHandled(),
        inFlight: this.getInFlight(),
        imbalance: this.getImbalance(),
      },
      total: this.totalReqs,
    };
  }

  applyFailure(actionId: string): void {
    if (actionId === 'toggle_slow_srv1' || actionId === 'slow_srv1') {
      const s = this.servers.find((srv) => srv.id === 'A' || srv.label === 'srv1');
      if (s) s.isSlow = !s.isSlow;
    } else if (actionId === 'toggle_slow_srv2' || actionId === 'slow_srv2' || actionId === 'slow_server_b') {
      const s = this.servers.find((srv) => srv.id === 'B' || srv.label === 'srv2');
      if (s) s.isSlow = !s.isSlow;
    } else if (actionId === 'toggle_slow_srv3' || actionId === 'slow_srv3' || actionId === 'slow_server_c') {
      const s = this.servers.find((srv) => srv.id === 'C' || srv.label === 'srv3');
      if (s) s.isSlow = !s.isSlow;
    } else if (actionId === 'kill_server_b') {
      const s = this.servers.find((srv) => srv.id === 'B' || srv.label === 'srv2');
      if (s) s.isDead = !s.isDead;
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
    { id: 'toggle_slow_srv2', label: 'Toggle SLOW on srv2', apply: (s) => {} },
    { id: 'toggle_slow_srv1', label: 'Toggle SLOW on srv1', apply: (s) => {} },
    { id: 'toggle_slow_srv3', label: 'Toggle SLOW on srv3', apply: (s) => {} },
    { id: 'kill_server_b', label: 'Kill / Revive srv2 (Failure)', apply: (s) => {} },
    { id: 'slow_server_c', label: 'Toggle Degradation on srv3', apply: (s) => {} },
  ],
  createLogic: () => new LoadBalancerLogic(),
};
