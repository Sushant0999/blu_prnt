import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';

describe('Multi-Client Collaborative CRDT Convergence', () => {
  it('converges two clients making concurrent topology edits into an identical state', () => {
    // Client A and Client B represent two browser clients
    const docA = new Y.Doc();
    const docB = new Y.Doc();

    const nodesA = docA.getMap('nodes');
    const edgesA = docA.getMap('edges');
    const settingsA = docA.getMap('settings');

    const nodesB = docB.getMap('nodes');
    const edgesB = docB.getMap('edges');
    const settingsB = docB.getMap('settings');

    // Initial common sync: Client A creates initial gateway node
    docA.transact(() => {
      nodesA.set('gw', {
        id: 'gw',
        label: 'API Gateway',
        replicas: 2,
        capacityQps: 5000,
        latencyMs: 15,
        x: 100,
        y: 100,
      });
    });

    // Sync A -> B
    const initialUpdate = Y.encodeStateAsUpdate(docA);
    Y.applyUpdate(docB, initialUpdate);

    expect(nodesB.has('gw')).toBe(true);

    // Concurrent split: Client A and Client B make changes concurrently without communicating yet
    // Client A adds an Auth microservice and an edge
    docA.transact(() => {
      nodesA.set('auth', {
        id: 'auth',
        label: 'Auth Service',
        replicas: 3,
        capacityQps: 4000,
        latencyMs: 20,
        x: 300,
        y: 100,
      });
      edgesA.set('e1', {
        id: 'e1',
        source: 'gw',
        target: 'auth',
      });
      settingsA.set('targetRps', 25000);
    });

    // Client B concurrently scales the Gateway to 6 replicas and adds a Redis Cache node
    docB.transact(() => {
      const ex: any = nodesB.get('gw');
      nodesB.set('gw', {
        ...ex,
        replicas: 6,
      });
      nodesB.set('redis', {
        id: 'redis',
        label: 'Redis Cache',
        replicas: 2,
        capacityQps: 30000,
        latencyMs: 3,
        x: 300,
        y: 250,
      });
    });

    // Now synchronize A -> B and B -> A
    const updateFromA = Y.encodeStateAsUpdate(docA);
    const updateFromB = Y.encodeStateAsUpdate(docB);

    Y.applyUpdate(docB, updateFromA);
    Y.applyUpdate(docA, updateFromB);

    // Verify Strong Eventual Consistency (SEC):
    // Both docs must hold the exact same keys and identical node/edge configurations!
    expect(nodesA.size).toBe(3); // gw, auth, redis
    expect(nodesB.size).toBe(3);

    // Check gw node
    const gwA: any = nodesA.get('gw');
    const gwB: any = nodesB.get('gw');
    expect(gwA).toEqual(gwB);
    expect(gwA.replicas).toBe(6); // scale from B preserved

    // Check auth node
    const authA: any = nodesA.get('auth');
    const authB: any = nodesB.get('auth');
    expect(authA).toEqual(authB);

    // Check redis node
    const redisA: any = nodesA.get('redis');
    const redisB: any = nodesB.get('redis');
    expect(redisA).toEqual(redisB);

    // Check edges
    expect(edgesA.size).toBe(1);
    expect(edgesB.size).toBe(1);
    expect(edgesA.get('e1')).toEqual(edgesB.get('e1'));

    // Check settings
    expect(settingsA.get('targetRps')).toBe(25000);
    expect(settingsB.get('targetRps')).toBe(25000);
  });
});
