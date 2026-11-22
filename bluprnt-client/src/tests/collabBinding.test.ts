import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';

// Helper to simulate Yjs <-> React Flow state derivation
function syncReactFlowFromYjs(doc: Y.Doc) {
  const nodesMap = doc.getMap('nodes');
  const edgesMap = doc.getMap('edges');

  const nodes: any[] = [];
  nodesMap.forEach((val: any, id: string) => {
    // Supports either plain object or nested Y.Map
    const nodeObj = val instanceof Y.Map ? val.toJSON() : val;
    nodes.push({
      id,
      position: { x: nodeObj.x, y: nodeObj.y },
      data: {
        label: nodeObj.label,
        replicas: nodeObj.replicas,
        capacityQps: nodeObj.capacityQps,
        latencyMs: nodeObj.latencyMs,
      },
    });
  });

  const edges: any[] = [];
  edgesMap.forEach((val: any, id: string) => {
    const edgeObj = val instanceof Y.Map ? val.toJSON() : val;
    edges.push({
      id,
      source: edgeObj.source,
      target: edgeObj.target,
    });
  });

  return { nodes, edges };
}

describe('Yjs <-> React Flow Collaborative Binding', () => {
  it('correctly derives React Flow nodes and edges from Y.Doc maps', () => {
    const doc = new Y.Doc();
    const nodesMap = doc.getMap('nodes');
    const edgesMap = doc.getMap('edges');

    doc.transact(() => {
      nodesMap.set('node-1', {
        id: 'node-1',
        label: 'API Gateway',
        replicas: 3,
        capacityQps: 10000,
        latencyMs: 15,
        x: 100,
        y: 200,
      });
      edgesMap.set('edge-1', {
        id: 'edge-1',
        source: 'client',
        target: 'node-1',
      });
    });

    const { nodes, edges } = syncReactFlowFromYjs(doc);
    expect(nodes.length).toBe(1);
    expect(nodes[0].id).toBe('node-1');
    expect(nodes[0].data.label).toBe('API Gateway');
    expect(nodes[0].data.replicas).toBe(3);
    expect(nodes[0].position).toEqual({ x: 100, y: 200 });

    expect(edges.length).toBe(1);
    expect(edges[0].id).toBe('edge-1');
    expect(edges[0].source).toBe('client');
    expect(edges[0].target).toBe('node-1');
  });

  it('updates position when node moves in Yjs transaction', () => {
    const doc = new Y.Doc();
    const nodesMap = doc.getMap('nodes');

    nodesMap.set('app', { id: 'app', label: 'App', replicas: 2, capacityQps: 5000, latencyMs: 20, x: 50, y: 50 });

    doc.transact(() => {
      const existing: any = nodesMap.get('app');
      nodesMap.set('app', { ...existing, x: 250, y: 350 });
    });

    const { nodes } = syncReactFlowFromYjs(doc);
    expect(nodes[0].position).toEqual({ x: 250, y: 350 });
  });

  it('correctly tracks scoped origins in UndoManager without undoing peer changes', () => {
    const doc = new Y.Doc();
    const nodesMap = doc.getMap('nodes');

    const myOrigin = Symbol('local-user');
    const peerOrigin = Symbol('peer-user');

    // Model node attributes as Y.Map for granular CRDT property-level tracking
    const cacheNode = new Y.Map<any>();
    nodesMap.set('cache', cacheNode);

    cacheNode.set('replicas', 1);
    cacheNode.set('capacityQps', 20000);

    const undoManager = new Y.UndoManager([cacheNode], {
      trackedOrigins: new Set([myOrigin]),
    });

    // My edit (tracked)
    doc.transact(() => {
      cacheNode.set('replicas', 4);
    }, myOrigin);

    expect(cacheNode.get('replicas')).toBe(4);

    // Peer edit to different property (untracked)
    doc.transact(() => {
      cacheNode.set('capacityQps', 35000);
    }, peerOrigin);

    expect(cacheNode.get('capacityQps')).toBe(35000);

    // Undo my edit: should revert replicas back to 1, while preserving peer's capacityQps!
    undoManager.undo();
    expect(cacheNode.get('replicas')).toBe(1);
    expect(cacheNode.get('capacityQps')).toBe(35000);
  });
});

describe('Collaborative Role & Permission Checks', () => {
  interface User {
    id: string;
    role: 'owner' | 'editor' | 'viewer';
  }

  function canMutateTopology(user: User): boolean {
    return user.role === 'owner' || user.role === 'editor';
  }

  function canManageRoom(user: User): boolean {
    return user.role === 'owner';
  }

  it('allows owner and editor to mutate topology', () => {
    expect(canMutateTopology({ id: 'u1', role: 'owner' })).toBe(true);
    expect(canMutateTopology({ id: 'u2', role: 'editor' })).toBe(true);
  });

  it('rejects mutation attempts from viewers', () => {
    expect(canMutateTopology({ id: 'u3', role: 'viewer' })).toBe(false);
  });

  it('restricts administrative management to room owner', () => {
    expect(canManageRoom({ id: 'u1', role: 'owner' })).toBe(true);
    expect(canManageRoom({ id: 'u2', role: 'editor' })).toBe(false);
    expect(canManageRoom({ id: 'u3', role: 'viewer' })).toBe(false);
  });
});
