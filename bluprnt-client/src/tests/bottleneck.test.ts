import { describe, it, expect } from 'vitest';
import { evaluateBottlenecks, SystemNodeData, SystemEdgeData } from '../core/algorithms/bottleneck';

describe('Bottleneck & Traffic Propagation Engine', () => {
  it('correctly calculates healthy node utilization under light traffic', () => {
    // Server capacity = 4 replicas * 2,500 QPS = 10,000 QPS
    // Traffic = 3,000 RPS -> 30% utilization (healthy)
    const nodes: SystemNodeData[] = [
      { id: 'client', type: 'client', label: 'Client', replicas: 1, capacityQps: 50000, latencyMs: 0 },
      { id: 'app', type: 'app', label: 'App Server', replicas: 4, capacityQps: 2500, latencyMs: 20 },
    ];
    const edges: SystemEdgeData[] = [{ id: 'e1', source: 'client', target: 'app' }];

    const result = evaluateBottlenecks(nodes, edges, 3000);
    expect(result.isSystemOverloaded).toBe(false);
    expect(result.totalDroppedRps).toBe(0);
    expect(result.systemThroughputRps).toBe(3000);

    const appMetric = result.nodeMetrics['app'];
    expect(appMetric.totalCapacityQps).toBe(10000);
    expect(appMetric.incomingRps).toBe(3000);
    expect(appMetric.utilizationPct).toBe(30);
    expect(appMetric.status).toBe('healthy');
  });

  it('identifies bottlenecks and calculates dropped RPS when traffic exceeds capacity', () => {
    // DB capacity = 1 replica * 1,000 QPS = 1,000 QPS
    // Traffic = 5,000 RPS -> 500% utilization, 4,000 dropped RPS
    const nodes: SystemNodeData[] = [
      { id: 'client', type: 'client', label: 'Client', replicas: 1, capacityQps: 50000, latencyMs: 0 },
      { id: 'db', type: 'db', label: 'Database', replicas: 1, capacityQps: 1000, latencyMs: 25 },
    ];
    const edges: SystemEdgeData[] = [{ id: 'e1', source: 'client', target: 'db' }];

    const result = evaluateBottlenecks(nodes, edges, 5000);
    expect(result.isSystemOverloaded).toBe(true);
    expect(result.bottleneckNodeIds).toContain('db');
    expect(result.totalDroppedRps).toBe(4000);
    expect(result.systemThroughputRps).toBe(1000);

    const dbMetric = result.nodeMetrics['db'];
    expect(dbMetric.status).toBe('bottleneck');
    expect(dbMetric.utilizationPct).toBe(500);
    expect(dbMetric.recommendation).toContain('Scale from 1 to 5 replicas');
  });

  it('marks node with warning status between 70% and 100% saturation', () => {
    // Capacity = 10,000 QPS. Traffic = 8,000 RPS -> 80% utilization
    const nodes: SystemNodeData[] = [
      { id: 'client', type: 'client', label: 'Client', replicas: 1, capacityQps: 50000, latencyMs: 0 },
      { id: 'gw', type: 'gw', label: 'Gateway', replicas: 2, capacityQps: 5000, latencyMs: 10 },
    ];
    const edges: SystemEdgeData[] = [{ id: 'e1', source: 'client', target: 'gw' }];

    const result = evaluateBottlenecks(nodes, edges, 8000);
    expect(result.isSystemOverloaded).toBe(false);
    expect(result.nodeMetrics['gw'].status).toBe('warning');
    expect(result.nodeMetrics['gw'].utilizationPct).toBe(80);
  });
});
