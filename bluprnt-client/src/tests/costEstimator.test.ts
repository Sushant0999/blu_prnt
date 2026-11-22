import { describe, it, expect } from 'vitest';
import { estimateArchitectureCost } from '../core/algorithms/costEstimator';
import { Node } from 'reactflow';
import { SystemNodeData } from '../components/playground/SystemCustomNode';

describe('Cost Estimator', () => {
  it('calculates monthly cloud infrastructure bill with compute, storage, and egress', () => {
    const nodes: Node<SystemNodeData>[] = [
      {
        id: 'node-std',
        position: { x: 0, y: 0 },
        data: {
          label: 'API Gateway',
          category: 'Ingress & Clients',
          icon: 'DoorOpen',
          replicas: 2,
          capacityQps: 5000,
          latencyMs: 5,
          machineTier: 'standard', // $65/mo * 2 = $130
        },
      },
      {
        id: 'node-db',
        position: { x: 300, y: 0 },
        data: {
          label: 'PostgreSQL Primary',
          category: 'Database',
          icon: 'Database',
          replicas: 2,
          capacityQps: 25000,
          latencyMs: 15,
          machineTier: 'memory', // $680/mo * 2 = $1360 + $50*2 storage = $1460
        },
      },
    ];

    const estimate = estimateArchitectureCost(nodes, 10000);

    expect(estimate.totalMonthlyUsd).toBeGreaterThan(0);
    expect(estimate.computeCostUsd).toBe(2 * 65 + 2 * 680); // $1490
    expect(estimate.storageCostUsd).toBe(100); // 2 * $50 for database
    expect(estimate.costPerMillionRequests).toBeGreaterThan(0);
    expect(estimate.nodeBreakdowns.length).toBe(2);
  });

  it('correctly scales compute cost when upgrading machine tiers', () => {
    const microNode: Node<SystemNodeData>[] = [
      {
        id: 'n1',
        position: { x: 0, y: 0 },
        data: {
          label: 'Service',
          category: 'Compute',
          icon: 'Server',
          replicas: 1,
          capacityQps: 500,
          latencyMs: 10,
          machineTier: 'micro',
        },
      },
    ];

    const metalNode: Node<SystemNodeData>[] = [
      {
        id: 'n1',
        position: { x: 0, y: 0 },
        data: {
          label: 'Service',
          category: 'Compute',
          icon: 'Server',
          replicas: 1,
          capacityQps: 60000,
          latencyMs: 2,
          machineTier: 'metal',
        },
      },
    ];

    const microEst = estimateArchitectureCost(microNode, 1000);
    const metalEst = estimateArchitectureCost(metalNode, 1000);

    expect(metalEst.computeCostUsd).toBeGreaterThan(microEst.computeCostUsd);
    expect(microEst.computeCostUsd).toBe(15);
    expect(metalEst.computeCostUsd).toBe(1650);
  });
});
