import { describe, it, expect } from 'vitest';
import {
  exportDiagramToJson,
  importDiagramFromJson,
  diagramToMermaid,
} from '../core/lld/diagramSerialization';
import type { LldDiagram } from '../core/types/lld';

describe('diagramSerialization', () => {
  const sampleDiagram: LldDiagram = {
    nodes: {
      n1: {
        id: 'n1',
        position: { x: 20, y: 30 },
        data: {
          name: 'Car',
          kind: 'class',
          fields: [{ id: 'f1', visibility: '-', name: 'speed', type: 'int' }],
          methods: [{ id: 'm1', visibility: '+', name: 'drive', type: 'void', params: 'fast: boolean' }],
        },
      },
      n2: {
        id: 'n2',
        position: { x: 200, y: 150 },
        data: {
          name: 'Engine',
          kind: 'class',
          fields: [{ id: 'f2', visibility: '-', name: 'hp', type: 'int' }],
          methods: [],
        },
      },
    },
    edges: {
      e1: {
        id: 'e1',
        source: 'n1',
        target: 'n2',
        data: {
          kind: 'composition',
          sourceMultiplicity: '1',
          targetMultiplicity: '1',
          label: 'has',
        },
      },
    },
  };

  it('exports to JSON and imports back identically', () => {
    const json = exportDiagramToJson(sampleDiagram);
    const restored = importDiagramFromJson(json);
    expect(restored).toEqual(sampleDiagram);
  });

  it('generates valid Mermaid classDiagram string with correct relations', () => {
    const mermaid = diagramToMermaid(sampleDiagram);
    expect(mermaid).toContain('classDiagram');
    expect(mermaid).toContain('class Car {');
    expect(mermaid).toContain('-speed: int');
    expect(mermaid).toContain('+drive(fast: boolean) void');
    expect(mermaid).toContain('class Engine {');
    expect(mermaid).toContain('Car "1" *-- "1" Engine : has');
  });
});
