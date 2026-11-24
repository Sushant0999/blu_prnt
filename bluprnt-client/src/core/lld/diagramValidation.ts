import type { LldDiagram, ClassKind, RelationKind } from '../types/lld';

export interface ValidationWarning {
  id: string;
  type: 'empty-name' | 'duplicate-name' | 'inheritance-cycle' | 'invalid-implementation' | 'invalid-inheritance' | 'interface-fields';
  message: string;
  nodeIds?: string[];
  edgeIds?: string[];
}

export function validateLldDiagram(diagram: LldDiagram): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const nodeEntries = Object.entries(diagram.nodes);
  const nameMap = new Map<string, string[]>();

  // 1. Check empty & duplicate names
  for (const [id, node] of nodeEntries) {
    const rawName = node.data?.name || '';
    const trimmed = rawName.trim();
    if (!trimmed) {
      warnings.push({
        id: `empty-name-${id}`,
        type: 'empty-name',
        message: `A node has an empty name.`,
        nodeIds: [id],
      });
    } else {
      const lower = trimmed.toLowerCase();
      const existing = nameMap.get(lower) || [];
      existing.push(id);
      nameMap.set(lower, existing);
    }

    // 5. Interface with fields warning
    if (node.data?.kind === 'interface') {
      if (node.data.fields && node.data.fields.length > 0) {
        warnings.push({
          id: `interface-fields-${id}`,
          type: 'interface-fields',
          message: `Interface '${trimmed || id}' defines instance fields. UML interfaces typically only define method contracts or constants.`,
          nodeIds: [id],
        });
      }
    }
  }

  for (const [name, ids] of nameMap.entries()) {
    if (ids.length > 1) {
      warnings.push({
        id: `duplicate-name-${name}`,
        type: 'duplicate-name',
        message: `Multiple classes or interfaces share the name '${name}'.`,
        nodeIds: ids,
      });
    }
  }

  // 3 & 4. Relation type checks (source -> target)
  // In UML:
  // SubClass --inheritance--> SuperClass
  // Class --implementation--> Interface
  const edgeEntries = Object.entries(diagram.edges);
  const inheritanceAdjacency = new Map<string, string[]>();

  for (const [edgeId, edge] of edgeEntries) {
    const sourceNode = diagram.nodes[edge.source];
    const targetNode = diagram.nodes[edge.target];

    if (!sourceNode || !targetNode) continue;

    const sourceKind: ClassKind = sourceNode.data?.kind || 'class';
    const targetKind: ClassKind = targetNode.data?.kind || 'class';
    const sourceName = sourceNode.data?.name || edge.source;
    const targetName = targetNode.data?.name || edge.target;

    if (edge.data?.kind === 'implementation') {
      if (targetKind !== 'interface') {
        warnings.push({
          id: `invalid-impl-${edgeId}`,
          type: 'invalid-implementation',
          message: `'${sourceName}' implements '${targetName}', but '${targetName}' is a ${targetKind}, not an interface.`,
          nodeIds: [edge.source, edge.target],
          edgeIds: [edgeId],
        });
      }
    }

    if (edge.data?.kind === 'inheritance') {
      if (targetKind === 'interface') {
        warnings.push({
          id: `invalid-inh-${edgeId}`,
          type: 'invalid-inheritance',
          message: `'${sourceName}' inherits from '${targetName}', which is an interface. Did you mean implementation?`,
          nodeIds: [edge.source, edge.target],
          edgeIds: [edgeId],
        });
      }

      // Add to inheritance graph for cycle detection
      const list = inheritanceAdjacency.get(edge.source) || [];
      list.push(edge.target);
      inheritanceAdjacency.set(edge.source, list);
    }
  }

  // 2. Inheritance cycles (DFS cycle detection)
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function checkCycle(curr: string, path: string[]): boolean {
    visited.add(curr);
    recStack.add(curr);

    const neighbors = inheritanceAdjacency.get(curr) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (checkCycle(neighbor, [...path, neighbor])) return true;
      } else if (recStack.has(neighbor)) {
        // Cycle detected
        const cyclePath = [...path, neighbor];
        warnings.push({
          id: `cycle-${curr}-${neighbor}`,
          type: 'inheritance-cycle',
          message: `Inheritance cycle detected: ${cyclePath.map(id => diagram.nodes[id]?.data?.name || id).join(' -> ')}`,
          nodeIds: cyclePath,
        });
        return true;
      }
    }

    recStack.delete(curr);
    return false;
  }

  for (const nodeId of Object.keys(diagram.nodes)) {
    if (!visited.has(nodeId)) {
      checkCycle(nodeId, [nodeId]);
    }
  }

  return warnings;
}
