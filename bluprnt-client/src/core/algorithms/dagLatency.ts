/**
 * Memoized Recursive DAG Critical-Path Latency Calculation Engine.
 * Reconstructed from the reverse-engineered Android engine (Lus1.a).
 * Fully cycle-safe using 3-color DFS state tracking:
 * 0 = Unvisited, 1 = Visiting (Active on stack -> Cycle detected), 2 = Visited (Memoized).
 */

export interface DagNode {
  id: string;
  latencyMs: number;
}

export interface DagEdge {
  id: string;
  source: string;
  target: string;
}

export interface DagLatencyResult {
  criticalPathLatencyMs: number;
  criticalPathNodeIds: string[];
  hasCycle: boolean;
  cycleNodeIds?: string[];
  nodeDistances: Record<string, number>;
}

export function computeCriticalPathLatency(
  nodes: DagNode[],
  edges: DagEdge[]
): DagLatencyResult {
  const nodeMap = new Map<string, DagNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  // Build adjacency list: node -> outgoing target IDs
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach((n) => {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  });

  edges.forEach((e) => {
    if (adj.has(e.source) && inDegree.has(e.target)) {
      adj.get(e.source)!.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
  });

  // Cycle detection via DFS color state
  const state = new Map<string, 0 | 1 | 2>();
  nodes.forEach((n) => state.set(n.id, 0));

  let hasCycle = false;
  const cycleNodes: string[] = [];

  function detectCycle(nodeId: string, path: string[]): boolean {
    state.set(nodeId, 1);
    const neighbors = adj.get(nodeId) || [];

    for (const next of neighbors) {
      const neighborState = state.get(next) ?? 0;
      if (neighborState === 1) {
        // Cycle detected
        hasCycle = true;
        const cycleStartIndex = path.indexOf(next);
        cycleNodes.push(...path.slice(cycleStartIndex), next);
        return true;
      }
      if (neighborState === 0) {
        if (detectCycle(next, [...path, next])) {
          return true;
        }
      }
    }

    state.set(nodeId, 2);
    return false;
  }

  for (const n of nodes) {
    if (state.get(n.id) === 0) {
      if (detectCycle(n.id, [n.id])) break;
    }
  }

  // Memoization table: nodeId -> { maxDownstreamLatency: number, bestDownstreamPath: string[] }
  const memo = new Map<string, { latency: number; path: string[] }>();

  // If a cycle is detected, we guard against infinite recursion by limiting depth
  const visitingSet = new Set<string>();

  function dfsMaxPath(nodeId: string): { latency: number; path: string[] } {
    if (memo.has(nodeId)) {
      return memo.get(nodeId)!;
    }

    if (visitingSet.has(nodeId)) {
      // Guard against cycle loop
      return { latency: 0, path: [] };
    }

    visitingSet.add(nodeId);
    const currNode = nodeMap.get(nodeId);
    const currLatency = currNode?.latencyMs || 0;
    const neighbors = adj.get(nodeId) || [];

    let maxChildLatency = 0;
    let maxChildPath: string[] = [];

    for (const childId of neighbors) {
      const childResult = dfsMaxPath(childId);
      if (childResult.latency > maxChildLatency) {
        maxChildLatency = childResult.latency;
        maxChildPath = childResult.path;
      }
    }

    visitingSet.delete(nodeId);

    const result = {
      latency: currLatency + maxChildLatency,
      path: [nodeId, ...maxChildPath],
    };

    memo.set(nodeId, result);
    return result;
  }

  // Identify sources (in-degree == 0), or if all have in-degree > 0, consider all nodes
  const sourceNodeIds = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0).map((n) => n.id);
  const startNodes = sourceNodeIds.length > 0 ? sourceNodeIds : nodes.map((n) => n.id);

  let overallMaxLatency = 0;
  let overallBestPath: string[] = [];

  for (const startId of startNodes) {
    const res = dfsMaxPath(startId);
    if (res.latency > overallMaxLatency) {
      overallMaxLatency = res.latency;
      overallBestPath = res.path;
    }
  }

  const nodeDistances: Record<string, number> = {};
  memo.forEach((val, key) => {
    nodeDistances[key] = val.latency;
  });

  return {
    criticalPathLatencyMs: overallMaxLatency,
    criticalPathNodeIds: overallBestPath,
    hasCycle,
    cycleNodeIds: hasCycle ? Array.from(new Set(cycleNodes)) : undefined,
    nodeDistances,
  };
}
