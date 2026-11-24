import type { LldDiagram, RelationKind } from '../types/lld';

/**
 * Converts an LldDiagram to Mermaid classDiagram syntax.
 */
export function diagramToMermaid(diagram: LldDiagram): string {
  const lines: string[] = ['classDiagram'];

  // 1. Nodes
  for (const [id, node] of Object.entries(diagram.nodes)) {
    const rawName = node.data?.name?.trim() || id;
    const safeName = rawName.replace(/[^a-zA-Z0-9_]/g, '_');

    if (node.data?.kind === 'interface') {
      lines.push(`  class ${safeName} {`);
      lines.push(`    <<interface>>`);
    } else if (node.data?.kind === 'abstract') {
      lines.push(`  class ${safeName} {`);
      lines.push(`    <<abstract>>`);
    } else if (node.data?.kind === 'enum') {
      lines.push(`  class ${safeName} {`);
      lines.push(`    <<enumeration>>`);
      if (node.data.enumValues) {
        for (const val of node.data.enumValues) {
          lines.push(`    ${val}`);
        }
      }
    } else {
      lines.push(`  class ${safeName} {`);
    }

    if (node.data?.fields) {
      for (const field of node.data.fields) {
        lines.push(`    ${field.visibility}${field.name}: ${field.type}`);
      }
    }

    if (node.data?.methods) {
      for (const method of node.data.methods) {
        const params = method.params ? `(${method.params})` : '()';
        lines.push(`    ${method.visibility}${method.name}${params} ${method.type}`);
      }
    }

    lines.push('  }');
  }

  // 2. Edges
  // Mermaid relations:
  // Inheritance: <|--
  // Implementation: <|..
  // Composition: *--
  // Aggregation: o--
  // Association: -->
  // Dependency: ..>
  for (const edge of Object.values(diagram.edges)) {
    const sourceNode = diagram.nodes[edge.source];
    const targetNode = diagram.nodes[edge.target];
    if (!sourceNode || !targetNode) continue;

    const sourceName = (sourceNode.data?.name?.trim() || edge.source).replace(/[^a-zA-Z0-9_]/g, '_');
    const targetName = (targetNode.data?.name?.trim() || edge.target).replace(/[^a-zA-Z0-9_]/g, '_');

    const srcMult = edge.data?.sourceMultiplicity ? ` "${edge.data.sourceMultiplicity}" ` : ' ';
    const tgtMult = edge.data?.targetMultiplicity ? ` "${edge.data.targetMultiplicity}" ` : ' ';
    const label = edge.data?.label ? ` : ${edge.data.label}` : '';

    let arrow = '--';
    switch (edge.data?.kind) {
      case 'inheritance':
        // Target is parent: Target <|-- Source
        arrow = `${targetName}${tgtMult}<|--${srcMult}${sourceName}${label}`;
        lines.push(`  ${arrow}`);
        continue;
      case 'implementation':
        // Target is interface: Target <|.. Source
        arrow = `${targetName}${tgtMult}<|..${srcMult}${sourceName}${label}`;
        lines.push(`  ${arrow}`);
        continue;
      case 'composition':
        arrow = `${sourceName}${srcMult}*--${tgtMult}${targetName}${label}`;
        lines.push(`  ${arrow}`);
        continue;
      case 'aggregation':
        arrow = `${sourceName}${srcMult}o--${tgtMult}${targetName}${label}`;
        lines.push(`  ${arrow}`);
        continue;
      case 'association':
        arrow = `${sourceName}${srcMult}-->${tgtMult}${targetName}${label}`;
        lines.push(`  ${arrow}`);
        continue;
      case 'dependency':
        arrow = `${sourceName}${srcMult}..>${tgtMult}${targetName}${label}`;
        lines.push(`  ${arrow}`);
        continue;
      default:
        arrow = `${sourceName}${srcMult}-->${tgtMult}${targetName}${label}`;
        lines.push(`  ${arrow}`);
        continue;
    }
  }

  return lines.join('\n');
}

/**
 * Validates and parses JSON into an LldDiagram.
 */
export function importDiagramFromJson(jsonString: string): LldDiagram {
  const parsed = JSON.parse(jsonString);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid JSON format: root must be an object');
  }

  const nodes = parsed.nodes && typeof parsed.nodes === 'object' ? parsed.nodes : {};
  const edges = parsed.edges && typeof parsed.edges === 'object' ? parsed.edges : {};

  // Basic normalization
  const normalizedDiagram: LldDiagram = {
    nodes: {},
    edges: {},
  };

  for (const [id, node] of Object.entries<any>(nodes)) {
    if (!node || !node.id) continue;
    normalizedDiagram.nodes[id] = {
      id: node.id,
      position: node.position || { x: 100, y: 100 },
      data: {
        name: node.data?.name || 'Class',
        kind: node.data?.kind || 'class',
        fields: Array.isArray(node.data?.fields) ? node.data.fields : [],
        methods: Array.isArray(node.data?.methods) ? node.data.methods : [],
        enumValues: Array.isArray(node.data?.enumValues) ? node.data.enumValues : undefined,
      },
    };
  }

  for (const [id, edge] of Object.entries<any>(edges)) {
    if (!edge || !edge.id || !edge.source || !edge.target) continue;
    normalizedDiagram.edges[id] = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data: {
        kind: edge.data?.kind || 'association',
        label: edge.data?.label,
        sourceMultiplicity: edge.data?.sourceMultiplicity,
        targetMultiplicity: edge.data?.targetMultiplicity,
      },
    };
  }

  return normalizedDiagram;
}

export function exportDiagramToJson(diagram: LldDiagram): string {
  return JSON.stringify(diagram, null, 2);
}
