import { describe, it, expect } from 'vitest';
import { computeCriticalPathLatency, DagNode, DagEdge } from '../core/algorithms/dagLatency';

describe('DAG Latency Engine (Lus1.a Reconstructed)', () => {
  it('computes correct linear pipeline critical path latency', () => {
    // Client (0ms) -> CDN (10ms) -> Gateway (15ms) -> API (30ms) -> DB (25ms) = 80ms
    const nodes: DagNode[] = [
      { id: 'client', latencyMs: 0 },
      { id: 'cdn', latencyMs: 10 },
      { id: 'gw', latencyMs: 15 },
      { id: 'api', latencyMs: 30 },
      { id: 'db', latencyMs: 25 },
    ];
    const edges: DagEdge[] = [
      { id: 'e1', source: 'client', target: 'cdn' },
      { id: 'e2', source: 'cdn', target: 'gw' },
      { id: 'e3', source: 'gw', target: 'api' },
      { id: 'e4', source: 'api', target: 'db' },
    ];

    const result = computeCriticalPathLatency(nodes, edges);
    expect(result.criticalPathLatencyMs).toBe(80);
    expect(result.criticalPathNodeIds).toEqual(['client', 'cdn', 'gw', 'api', 'db']);
    expect(result.hasCycle).toBe(false);
  });

  it('selects the longest latency branch in a bifurcated DAG', () => {
    // API branches to Cache (3ms) and Database (50ms)
    const nodes: DagNode[] = [
      { id: 'api', latencyMs: 20 },
      { id: 'cache', latencyMs: 3 },
      { id: 'db', latencyMs: 50 },
    ];
    const edges: DagEdge[] = [
      { id: 'e1', source: 'api', target: 'cache' },
      { id: 'e2', source: 'api', target: 'db' },
    ];

    const result = computeCriticalPathLatency(nodes, edges);
    // API (20) + DB (50) = 70ms > API (20) + Cache (3) = 23ms
    expect(result.criticalPathLatencyMs).toBe(70);
    expect(result.criticalPathNodeIds).toEqual(['api', 'db']);
  });

  it('safely detects and handles topology cycles without infinite recursion', () => {
    // Cycle: A -> B -> C -> A
    const nodes: DagNode[] = [
      { id: 'a', latencyMs: 10 },
      { id: 'b', latencyMs: 20 },
      { id: 'c', latencyMs: 30 },
    ];
    const edges: DagEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
      { id: 'e3', source: 'c', target: 'a' },
    ];

    const result = computeCriticalPathLatency(nodes, edges);
    expect(result.hasCycle).toBe(true);
    expect(result.cycleNodeIds).toBeDefined();
    expect(result.cycleNodeIds?.length).toBeGreaterThan(0);
    // Latency computation must terminate safely
    expect(typeof result.criticalPathLatencyMs).toBe('number');
  });

  it('handles empty topology cleanly', () => {
    const result = computeCriticalPathLatency([], []);
    expect(result.criticalPathLatencyMs).toBe(0);
    expect(result.criticalPathNodeIds).toEqual([]);
    expect(result.hasCycle).toBe(false);
  });
});
