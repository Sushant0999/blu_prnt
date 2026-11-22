import { SimulatorDefinition, SimulatorLogic, OutcomeDef, StatTileDef, RequestPayload } from '../engine/types';

export const HASHING_OUTCOMES: OutcomeDef[] = [
  { id: 'node_1', label: 'Mapped to Node 1', color: '#10b981', shape: 'circle' },
  { id: 'node_2', label: 'Mapped to Node 2', color: '#3b82f6', shape: 'square' },
  { id: 'node_3', label: 'Mapped to Node 3', color: '#a855f7', shape: 'diamond' },
  { id: 'node_4', label: 'Mapped to Node 4', color: '#f59e0b', shape: 'triangle' },
  { id: 'remapped', label: 'Key Remapped (Cache Miss)', color: '#ef4444', shape: 'cross' },
];

function murmurHash(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class ConsistentHashingLogic implements SimulatorLogic {
  private mode: string = 'consistent_ring';
  private totalReqs: number = 0;
  private nodeKeysCount: Record<string, number> = { 'Node-1': 0, 'Node-2': 0, 'Node-3': 0, 'Node-4': 0 };
  private remappedCount: number = 0;
  private ring: { hash: number; nodeId: string }[] = [];
  private numNodes: number = 3;
  private vnodesPerNode: number = 10;
  private activeNodes: string[] = ['Node-1', 'Node-2', 'Node-3'];
  private previousKeyAssignments: Map<number, string> = new Map();

  init(params: Record<string, any>, modeId: string): any {
    this.mode = modeId;
    this.vnodesPerNode = Number(params.vnodes || 15);
    this.reset();
    return this.getState();
  }

  reset(): void {
    this.totalReqs = 0;
    this.remappedCount = 0;
    this.nodeKeysCount = { 'Node-1': 0, 'Node-2': 0, 'Node-3': 0, 'Node-4': 0 };
    this.previousKeyAssignments.clear();
    this.rebuildRing();
  }

  private rebuildRing(): void {
    this.ring = [];
    if (this.mode === 'modulo') {
      return; // Uses simple hash(key) % N
    }

    if (this.mode === 'consistent_ring') {
      // 1 position per node
      for (const node of this.activeNodes) {
        this.ring.push({ hash: murmurHash(node), nodeId: node });
      }
    } else if (this.mode === 'virtual_nodes') {
      // V virtual nodes per physical node
      for (const node of this.activeNodes) {
        for (let i = 0; i < this.vnodesPerNode; i++) {
          this.ring.push({ hash: murmurHash(`${node}#vnode-${i}`), nodeId: node });
        }
      }
    }
    this.ring.sort((a, b) => a.hash - b.hash);
  }

  onRequest(req: RequestPayload, now: number): OutcomeDef {
    this.totalReqs++;
    const keyStr = `user-key-${req.id % 200}`;
    const keyHash = murmurHash(keyStr);
    let targetNode = 'Node-1';

    if (this.mode === 'modulo') {
      const idx = keyHash % this.activeNodes.length;
      targetNode = this.activeNodes[idx];
    } else if (this.mode === 'rendezvous') {
      // Highest Random Weight (HRW)
      let maxScore = -1;
      for (const node of this.activeNodes) {
        const score = murmurHash(`${keyStr}:${node}`);
        if (score > maxScore) {
          maxScore = score;
          targetNode = node;
        }
      }
    } else {
      // Ring lookup: find first node whose hash >= keyHash
      const found = this.ring.find((entry) => entry.hash >= keyHash);
      targetNode = found ? found.nodeId : (this.ring[0]?.nodeId || 'Node-1');
    }

    // Check if key was previously on another node (cache disruption)
    const prevNode = this.previousKeyAssignments.get(req.id % 200);
    if (prevNode && prevNode !== targetNode) {
      this.remappedCount++;
    }
    this.previousKeyAssignments.set(req.id % 200, targetNode);
    this.nodeKeysCount[targetNode] = (this.nodeKeysCount[targetNode] || 0) + 1;

    if (prevNode && prevNode !== targetNode) {
      return HASHING_OUTCOMES[4]; // remapped
    }

    if (targetNode === 'Node-1') return HASHING_OUTCOMES[0];
    if (targetNode === 'Node-2') return HASHING_OUTCOMES[1];
    if (targetNode === 'Node-3') return HASHING_OUTCOMES[2];
    return HASHING_OUTCOMES[3];
  }

  tick(dtMs: number, now: number): void {}

  getCenterMetric(): { label: string; value: string | number; percentage?: number } {
    const totalKeys = Object.values(this.nodeKeysCount).reduce((a, b) => a + b, 0);
    const avg = totalKeys / (this.activeNodes.length || 1);
    const max = Math.max(...this.activeNodes.map((n) => this.nodeKeysCount[n] || 0), 1);
    const balancePct = Math.min(100, Math.round((avg / max) * 100));

    return {
      label: 'Balance Score',
      value: `${balancePct}%`,
      percentage: balancePct,
    };
  }

  getStats(): [StatTileDef, StatTileDef, StatTileDef] {
    const counts = this.activeNodes.map((n) => this.nodeKeysCount[n] || 0);
    const maxVal = Math.max(...counts, 1);
    const minVal = Math.min(...counts);
    const spread = maxVal - minVal;

    return [
      { label: 'Active Cluster Nodes', value: `${this.activeNodes.length} Nodes`, color: '#38bdf8' },
      { label: 'Key Spread (Max-Min)', value: `${spread} keys`, trend: spread < 50 ? 'down' : 'up', color: spread < 50 ? '#10b981' : '#f59e0b' },
      { label: 'Cache Remappings', value: this.remappedCount, trend: this.remappedCount === 0 ? 'neutral' : 'down', color: this.remappedCount === 0 ? '#10b981' : '#ef4444' },
    ];
  }

  getState(): any {
    return {
      nodes: this.activeNodes,
      counts: this.nodeKeysCount,
      ringSize: this.ring.length,
    };
  }

  applyFailure(actionId: string): void {
    if (actionId === 'toggle_node_4') {
      if (this.activeNodes.includes('Node-4')) {
        this.activeNodes = this.activeNodes.filter((n) => n !== 'Node-4');
      } else {
        this.activeNodes.push('Node-4');
      }
      this.rebuildRing();
    } else if (actionId === 'drop_node_2') {
      if (this.activeNodes.includes('Node-2')) {
        this.activeNodes = this.activeNodes.filter((n) => n !== 'Node-2');
      } else {
        this.activeNodes.push('Node-2');
      }
      this.rebuildRing();
    }
  }
}

export const consistentHashingDefinition: SimulatorDefinition = {
  id: 'consistent-hashing',
  title: 'Consistent Hashing & Ring Distribution',
  description: 'Evaluate partition distribution, virtual nodes, and minimal remapping on node additions/failures.',
  linkedLessonId: 'consistent-hashing',
  defaultRate: 20,
  maxRate: 60,
  modes: [
    {
      id: 'consistent_ring',
      label: 'Ring (1 Node / Slot)',
      explanation: 'Places physical nodes on a 32-bit hash ring. Prone to non-uniform hotspot clusters without virtual nodes.',
    },
    {
      id: 'virtual_nodes',
      label: 'Virtual Nodes (Vnodes)',
      explanation: 'Slices each server into multiple virtual tokens across the ring, balancing key load evenly.',
      params: [
        { id: 'vnodes', label: 'Vnodes per Server', type: 'stepper', min: 2, max: 50, default: 15, unit: 'vnodes' },
      ],
    },
    {
      id: 'modulo',
      label: 'Modulo Hash % N',
      explanation: 'Traditional hash(key) % N. Catastrophic: almost 100% of keys are reshuffled when N changes.',
    },
    {
      id: 'rendezvous',
      label: 'Rendezvous (HRW)',
      explanation: 'Highest Random Weight hashing. Computes hash(key, node) and routes to maximum; zero ring storage required.',
    },
  ],
  params: [],
  outcomes: HASHING_OUTCOMES,
  failureActions: [
    { id: 'toggle_node_4', label: 'Add / Remove Node 4 (Observe Remaps)', apply: (s) => {} },
    { id: 'drop_node_2', label: 'Crash / Restore Node 2', apply: (s) => {} },
  ],
  createLogic: () => new ConsistentHashingLogic(),
};
