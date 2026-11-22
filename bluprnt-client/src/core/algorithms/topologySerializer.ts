import LZString from 'lz-string';
import { Node, Edge } from 'reactflow';
import { SystemNodeData } from '../../components/playground/SystemCustomNode';

export interface SerializedTopology {
  version: 1;
  nodes: Array<{
    id: string;
    label: string;
    category?: string;
    icon?: string;
    replicas?: number;
    capacityQps?: number;
    latencyMs?: number;
    tier?: string;
    x: number;
    y: number;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
  }>;
  targetRps?: number;
}

/**
 * Compresses an architecture canvas state into a URL-safe encoded string.
 */
export function serializeTopology(
  nodes: Node<SystemNodeData>[],
  edges: Edge[],
  targetRps?: number
): string {
  const payload: SerializedTopology = {
    version: 1,
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.data.label,
      category: n.data.category,
      icon: n.data.icon,
      replicas: n.data.replicas,
      capacityQps: n.data.capacityQps,
      latencyMs: n.data.latencyMs,
      tier: n.data.machineTier,
      x: Math.round(n.position.x),
      y: Math.round(n.position.y),
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    })),
    targetRps,
  };

  const json = JSON.stringify(payload);
  return LZString.compressToEncodedURIComponent(json);
}

/**
 * Decompresses and validates a URL-safe encoded topology string back into React Flow nodes & edges.
 */
export function deserializeTopology(compressed: string): {
  nodes: Node<SystemNodeData>[];
  edges: Edge[];
  targetRps?: number;
} | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;

    const data: SerializedTopology = JSON.parse(json);
    if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
      return null;
    }

    const nodes: Node<SystemNodeData>[] = data.nodes.map((n) => ({
      id: n.id,
      type: 'systemNode',
      position: { x: n.x, y: n.y },
      data: {
        label: n.label,
        category: n.category || 'Compute & APIs',
        icon: n.icon || 'Layers',
        replicas: n.replicas || 1,
        capacityQps: n.capacityQps || 5000,
        latencyMs: n.latencyMs || 20,
        machineTier: (n.tier as any) || 'standard',
      },
    }));

    const edges: Edge[] = data.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: true,
      type: 'animatedEdge',
    }));

    return {
      nodes,
      edges,
      targetRps: data.targetRps,
    };
  } catch (err) {
    console.error('[BluPrnt] Failed to deserialize shared topology:', err);
    return null;
  }
}
