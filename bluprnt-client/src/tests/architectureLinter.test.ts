import { describe, it, expect } from 'vitest';
import { auditArchitecture } from '../core/algorithms/architectureLinter';
import { Node, Edge } from 'reactflow';
import { SystemNodeData } from '../components/playground/SystemCustomNode';

describe('Architecture Linter & SPOF Auditor', () => {
  it('returns perfect score for empty or robust multi-replica architecture', () => {
    const nodes: Node<SystemNodeData>[] = [
      {
        id: 'gw-1',
        position: { x: 0, y: 0 },
        data: {
          label: 'Kong API Gateway',
          category: 'Gateway',
          icon: 'DoorOpen',
          replicas: 3,
          capacityQps: 20000,
          latencyMs: 5,
        },
      },
      {
        id: 'db-1',
        position: { x: 300, y: 0 },
        data: {
          label: 'PostgreSQL Primary/Replica',
          category: 'Database',
          icon: 'Database',
          replicas: 3,
          capacityQps: 10000,
          latencyMs: 15,
        },
      },
      {
        id: 'cache-1',
        position: { x: 300, y: 150 },
        data: {
          label: 'Redis Cluster',
          category: 'Cache',
          icon: 'Zap',
          replicas: 3,
          capacityQps: 50000,
          latencyMs: 1,
        },
      },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'gw-1', target: 'cache-1' },
      { id: 'e2', source: 'cache-1', target: 'db-1' },
    ];

    const report = auditArchitecture(nodes, edges);
    expect(report.score).toBeGreaterThanOrEqual(95);
    expect(report.grade).toBe('A+');
    expect(report.summary.criticalCount).toBe(0);
  });

  it('detects Single Point of Failure (SPOF) on database with only 1 replica', () => {
    const nodes: Node<SystemNodeData>[] = [
      {
        id: 'db-spof',
        position: { x: 0, y: 0 },
        data: {
          label: 'PostgreSQL Single Instance',
          category: 'Database',
          icon: 'Database',
          replicas: 1,
          capacityQps: 2500,
          latencyMs: 20,
        },
      },
    ];

    const report = auditArchitecture(nodes, []);
    expect(report.score).toBeLessThan(100);
    expect(report.summary.highCount).toBeGreaterThanOrEqual(1);
    expect(report.issues.some((i) => i.id.startsWith('spof-db'))).toBe(true);
  });

  it('detects unshielded client accessing backend directly without gateway', () => {
    const nodes: Node<SystemNodeData>[] = [
      {
        id: 'client-1',
        position: { x: 0, y: 0 },
        data: {
          label: 'Mobile iOS Client',
          category: 'Ingress & Clients',
          icon: 'Smartphone',
          replicas: 1,
          capacityQps: 50000,
          latencyMs: 0,
        },
      },
      {
        id: 'backend-1',
        position: { x: 300, y: 0 },
        data: {
          label: 'User Auth Service',
          category: 'Compute & APIs',
          icon: 'Server',
          replicas: 2,
          capacityQps: 5000,
          latencyMs: 10,
        },
      },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'client-1', target: 'backend-1' },
    ];

    const report = auditArchitecture(nodes, edges);
    expect(report.issues.some((i) => i.id.startsWith('direct-client-access'))).toBe(true);
  });

  it('detects dead nodes under chaos fault injection as critical issues', () => {
    const nodes: Node<SystemNodeData>[] = [
      {
        id: 'node-dead',
        position: { x: 0, y: 0 },
        data: {
          label: 'Payment Service',
          category: 'Compute',
          icon: 'CreditCard',
          replicas: 2,
          capacityQps: 5000,
          latencyMs: 10,
          isDead: true,
        },
      },
    ];

    const report = auditArchitecture(nodes, []);
    expect(report.summary.criticalCount).toBeGreaterThanOrEqual(1);
    expect(report.issues.some((i) => i.id.startsWith('offline-'))).toBe(true);
  });
});
