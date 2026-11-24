import { describe, it, expect } from 'vitest';
import { validateLldDiagram } from '../core/lld/diagramValidation';
import type { LldDiagram } from '../core/types/lld';

describe('diagramValidation', () => {
  it('detects empty class names', () => {
    const diagram: LldDiagram = {
      nodes: {
        node_1: {
          id: 'node_1',
          position: { x: 0, y: 0 },
          data: { name: '   ', kind: 'class', fields: [], methods: [] },
        },
      },
      edges: {},
    };
    const warnings = validateLldDiagram(diagram);
    expect(warnings.some((w) => w.type === 'empty-name')).toBe(true);
  });

  it('detects duplicate class names', () => {
    const diagram: LldDiagram = {
      nodes: {
        node_1: {
          id: 'node_1',
          position: { x: 0, y: 0 },
          data: { name: 'User', kind: 'class', fields: [], methods: [] },
        },
        node_2: {
          id: 'node_2',
          position: { x: 100, y: 100 },
          data: { name: 'user', kind: 'class', fields: [], methods: [] },
        },
      },
      edges: {},
    };
    const warnings = validateLldDiagram(diagram);
    expect(warnings.some((w) => w.type === 'duplicate-name')).toBe(true);
  });

  it('detects inheritance from an interface (should be implementation)', () => {
    const diagram: LldDiagram = {
      nodes: {
        node_class: {
          id: 'node_class',
          position: { x: 0, y: 0 },
          data: { name: 'PaymentService', kind: 'class', fields: [], methods: [] },
        },
        node_interface: {
          id: 'node_interface',
          position: { x: 100, y: 100 },
          data: { name: 'IPayment', kind: 'interface', fields: [], methods: [] },
        },
      },
      edges: {
        e1: {
          id: 'e1',
          source: 'node_class',
          target: 'node_interface',
          data: { kind: 'inheritance' },
        },
      },
    };
    const warnings = validateLldDiagram(diagram);
    expect(warnings.some((w) => w.type === 'invalid-inheritance')).toBe(true);
  });

  it('detects implementation of a concrete class', () => {
    const diagram: LldDiagram = {
      nodes: {
        node_class_a: {
          id: 'node_class_a',
          position: { x: 0, y: 0 },
          data: { name: 'Dog', kind: 'class', fields: [], methods: [] },
        },
        node_class_b: {
          id: 'node_class_b',
          position: { x: 100, y: 100 },
          data: { name: 'Animal', kind: 'class', fields: [], methods: [] },
        },
      },
      edges: {
        e1: {
          id: 'e1',
          source: 'node_class_a',
          target: 'node_class_b',
          data: { kind: 'implementation' },
        },
      },
    };
    const warnings = validateLldDiagram(diagram);
    expect(warnings.some((w) => w.type === 'invalid-implementation')).toBe(true);
  });

  it('detects inheritance cycles', () => {
    const diagram: LldDiagram = {
      nodes: {
        node_a: {
          id: 'node_a',
          position: { x: 0, y: 0 },
          data: { name: 'ClassA', kind: 'class', fields: [], methods: [] },
        },
        node_b: {
          id: 'node_b',
          position: { x: 100, y: 100 },
          data: { name: 'ClassB', kind: 'class', fields: [], methods: [] },
        },
      },
      edges: {
        e1: {
          id: 'e1',
          source: 'node_a',
          target: 'node_b',
          data: { kind: 'inheritance' },
        },
        e2: {
          id: 'e2',
          source: 'node_b',
          target: 'node_a',
          data: { kind: 'inheritance' },
        },
      },
    };
    const warnings = validateLldDiagram(diagram);
    expect(warnings.some((w) => w.type === 'inheritance-cycle')).toBe(true);
  });

  it('warns when interface defines fields', () => {
    const diagram: LldDiagram = {
      nodes: {
        node_iface: {
          id: 'node_iface',
          position: { x: 0, y: 0 },
          data: {
            name: 'IDataSource',
            kind: 'interface',
            fields: [{ id: 'f1', visibility: '-', name: 'data', type: 'String' }],
            methods: [],
          },
        },
      },
      edges: {},
    };
    const warnings = validateLldDiagram(diagram);
    expect(warnings.some((w) => w.type === 'interface-fields')).toBe(true);
  });
});
