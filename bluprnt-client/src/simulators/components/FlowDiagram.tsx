import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface FlowNode {
  id: string;
  label: string;
  kind: 'source' | 'hub' | 'card' | 'ring' | 'mesh' | string;
  position?: { x: number; y: number };
  sublabel?: string;
  color?: string; // e.g. '#2e6930', '#0ea5e9', '#8b5cf6', '#f59e0b', etc.
  icon?: string; // 'globe' | 'split' | 'bucket' | 'ring' | 'circuit' | 'cache' | 'filter' | 'queue' | 'cloud' | 'shard' | 'replica' | 'raft' | 'txn' | 'retry' | 'lock' | 'cpu' | 'database' | 'tree' | 'mesh' | React.ReactNode;
  badge?: string; // e.g. "HPA", "2PC", "TTL", "k=3", "16KB"
  detail?: string; // bottom text override e.g. "3 active · 5 done" or custom domain metric
  shape?: 'circle' | 'rect' | 'cylinder' | 'hexagon' | 'diamond' | 'card';
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  style?: 'solid' | 'dashed' | 'dotted';
  color?: string;
}

export interface FlowPacket {
  id: string | number;
  edgeId: string;
  progress: number; // 0 to 1
  color?: string;
}

export interface FlowNodeStatus {
  active?: number;
  done?: number;
  load?: number; // 0 to 1
  state?: 'normal' | 'slow' | 'overloaded' | 'failed' | string;
  stateLabel?: string; // e.g. "SLOW"
}

export interface FlowStats {
  handled: number;
  inFlight: number;
  imbalance: number;
}

export interface FlowStatItem {
  label: string;
  value: number | string;
}

export interface FlowDiagramProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  packets?: FlowPacket[];
  nodeStatus?: Record<string, FlowNodeStatus>;
  stats?: FlowStats | FlowStatItem[];
  isPaused?: boolean;
  className?: string;
  ariaLabel?: string;
  topology?: string;
  onToggleNodeSlow?: (nodeId: string) => void;
}

interface Point {
  x: number;
  y: number;
}

interface EdgeGeometry {
  id: string;
  source: string;
  target: string;
  start: Point;
  end: Point;
  label?: string;
  style?: 'solid' | 'dashed' | 'dotted';
  color?: string;
}

/**
 * Calculates layout coordinates for nodes and edge connector endpoints.
 */
function computeLayout(nodes: FlowNode[], edges: FlowEdge[]) {
  const nodeMap = new Map<string, FlowNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const cardNodes = nodes.filter((n) => n.kind === 'card');
  const sourceNodes = nodes.filter((n) => n.kind === 'source');
  const hubNodes = nodes.filter((n) => n.kind === 'hub');

  const nodePositions = new Map<string, Point>();
  const cardBounds = new Map<string, { x: number; y: number; width: number; height: number }>();

  // Center vertical line for source and hub
  const cy = 135;

  // 1. Source nodes (Clients / Ingress)
  sourceNodes.forEach((node, idx) => {
    if (node.position) {
      nodePositions.set(node.id, node.position);
    } else {
      nodePositions.set(node.id, { x: 75, y: cy });
    }
  });

  // 2. Hub nodes (Router / Controller / Filter / Buffer)
  hubNodes.forEach((node, idx) => {
    if (node.position) {
      nodePositions.set(node.id, node.position);
    } else {
      nodePositions.set(node.id, { x: 195, y: cy });
    }
  });

  // 3. Card nodes stacked vertically on the right
  const cardWidth = 160;
  const cardHeight = 56;
  const cardX = 310;
  const cardGap = 16;
  const totalCardsHeight = cardNodes.length * cardHeight + Math.max(0, cardNodes.length - 1) * cardGap;
  const startY = Math.max(25, cy - totalCardsHeight / 2 + cardHeight / 2);

  cardNodes.forEach((node, idx) => {
    if (node.position) {
      nodePositions.set(node.id, node.position);
      cardBounds.set(node.id, {
        x: node.position.x - cardWidth / 2,
        y: node.position.y - cardHeight / 2,
        width: cardWidth,
        height: cardHeight,
      });
    } else {
      const topY = startY + idx * (cardHeight + cardGap) - cardHeight / 2;
      const centerY = topY + cardHeight / 2;
      nodePositions.set(node.id, { x: cardX + cardWidth / 2, y: centerY });
      cardBounds.set(node.id, {
        x: cardX,
        y: topY,
        width: cardWidth,
        height: cardHeight,
      });
    }
  });

  // Compute clean edge endpoints touching node borders
  const edgeGeometries: EdgeGeometry[] = [];

  edges.forEach((edge) => {
    const srcNode = nodeMap.get(edge.source);
    const tgtNode = nodeMap.get(edge.target);
    if (!srcNode || !tgtNode) return;

    const srcPos = nodePositions.get(edge.source) || { x: 0, y: 0 };
    const tgtPos = nodePositions.get(edge.target) || { x: 0, y: 0 };

    let start: Point = { ...srcPos };
    let end: Point = { ...tgtPos };

    // Source node is circle
    if (srcNode.kind === 'source') {
      const r = 26;
      start = { x: srcPos.x + r, y: srcPos.y };
    } else if (srcNode.kind === 'hub') {
      const r = 34;
      const dx = tgtPos.x - srcPos.x;
      const dy = tgtPos.y - srcPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      start = {
        x: srcPos.x + (dx / dist) * r,
        y: srcPos.y + (dy / dist) * r,
      };
    }

    // Target node is hub or card
    if (tgtNode.kind === 'hub') {
      const r = 34;
      end = { x: tgtPos.x - r, y: tgtPos.y };
    } else if (tgtNode.kind === 'card') {
      const bounds = cardBounds.get(tgtNode.id);
      if (bounds) {
        end = { x: bounds.x, y: bounds.y + bounds.height / 2 };
      } else {
        end = { x: tgtPos.x - cardWidth / 2, y: tgtPos.y };
      }
    }

    edgeGeometries.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      start,
      end,
      label: edge.label,
      style: edge.style,
      color: edge.color,
    });
  });

  return {
    nodePositions,
    cardBounds,
    edgeGeometries,
    viewBox: '0 0 520 280',
  };
}

/**
 * Renders distinct SVG icons for different architecture patterns.
 */
function renderArchitectureIcon(icon: string | undefined, color: string = '#ffffff') {
  switch (icon) {
    case 'bucket': // Rate Limiter
      return (
        <g stroke={color} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M-9,-8 L9,-8 L6,9 L-6,9 Z" />
          <path d="M-6,0 C-3,2 3,2 6,0" strokeDasharray="2 2" />
          <line x1="0" y1="-11" x2="0" y2="-8" />
        </g>
      );
    case 'ring': // Consistent Hashing Ring
      return (
        <g stroke={color} fill="none" strokeWidth="1.8">
          <circle cx="0" cy="0" r="10" strokeDasharray="3 3" />
          <circle cx="0" cy="-10" r="2" fill={color} />
          <circle cx="8" cy="5" r="2" fill={color} />
          <circle cx="-8" cy="5" r="2" fill={color} />
        </g>
      );
    case 'cache': // Cache Controller Memory RAM
      return (
        <g stroke={color} fill="none" strokeWidth="1.8" strokeLinecap="round">
          <rect x="-8" y="-8" width="16" height="16" rx="2" />
          <circle cx="0" cy="0" r="2" fill={color} />
          <line x1="-8" y1="-4" x2="-11" y2="-4" />
          <line x1="-8" y1="4" x2="-11" y2="4" />
          <line x1="8" y1="-4" x2="11" y2="-4" />
          <line x1="8" y1="4" x2="11" y2="4" />
        </g>
      );
    case 'filter': // Bloom Filter Matrix
      return (
        <g stroke={color} fill="none" strokeWidth="1.8" strokeLinecap="round">
          <polygon points="-10,-8 10,-8 4,2 4,9 -4,9 -4,2" />
          <circle cx="0" cy="-3" r="1" fill={color} />
        </g>
      );
    case 'circuit': // Circuit Breaker Switch
      return (
        <g stroke={color} fill="none" strokeWidth="2" strokeLinecap="round">
          <circle cx="-7" cy="0" r="2" fill={color} />
          <circle cx="7" cy="0" r="2" fill={color} />
          <line x1="-5" y1="0" x2="3" y2="-8" />
        </g>
      );
    case 'queue': // Message Queue Conveyor
      return (
        <g stroke={color} fill="none" strokeWidth="1.8">
          <rect x="-10" y="-5" width="20" height="10" rx="2" />
          <line x1="-4" y1="-5" x2="-4" y2="5" />
          <line x1="2" y1="-5" x2="2" y2="5" />
        </g>
      );
    case 'cloud': // CDN Anycast Cloud
      return (
        <g stroke={color} fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M-6,4 C-9,4 -10,1 -8,-1 C-9,-4 -5,-7 -2,-5 C0,-8 5,-7 6,-4 C9,-4 10,-1 8,2 C10,4 8,6 5,6 L-5,6" />
        </g>
      );
    case 'shard': // Sharding Partitions
      return (
        <g stroke={color} fill="none" strokeWidth="1.8">
          <rect x="-9" y="-9" width="8" height="8" rx="1" />
          <rect x="1" y="-9" width="8" height="8" rx="1" />
          <rect x="-9" y="1" width="8" height="8" rx="1" />
          <rect x="1" y="1" width="8" height="8" rx="1" fill={color} />
        </g>
      );
    case 'replica': // Database Replication
      return (
        <g stroke={color} fill="none" strokeWidth="1.8">
          <ellipse cx="-4" cy="-4" rx="5" ry="2" />
          <path d="M-9,-4 L-9,4 A5,2 0 0,0 1,4 L1,-4" />
          <ellipse cx="4" cy="2" rx="4" ry="1.5" />
          <path d="M0,2 L0,7 A4,1.5 0 0,0 8,7 L8,2" />
        </g>
      );
    case 'raft': // Raft Consensus Crown
      return (
        <g stroke={color} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="-8,7 8,7 10,-5 4,0 0,-7 -4,0 -10,-5" fill="none" />
          <circle cx="0" cy="2" r="1.5" fill={color} />
        </g>
      );
    case 'txn': // Distributed Transactions 2PC
      return (
        <g stroke={color} fill="none" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="-5" cy="-2" r="4" />
          <circle cx="5" cy="2" r="4" />
          <line x1="-2" y1="-2" x2="2" y2="2" />
        </g>
      );
    case 'retry': // Retry Loop Backoff
      return (
        <g stroke={color} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M-3,-7 A7,7 0 1,1 -7,-1" />
          <polyline points="-8,-6 -3,-7 -4,-2" />
        </g>
      );
    case 'lock': // Idempotency Padlock
      return (
        <g stroke={color} fill="none" strokeWidth="1.8" strokeLinecap="round">
          <rect x="-6" y="-1" width="12" height="10" rx="2" />
          <path d="M-4,-1 L-4,-5 A4,4 0 0,1 4,-5 L4,-1" />
          <circle cx="0" cy="4" r="1" fill={color} />
        </g>
      );
    case 'cpu': // Autoscaling CPU
      return (
        <g stroke={color} fill="none" strokeWidth="1.8" strokeLinecap="round">
          <rect x="-7" y="-7" width="14" height="14" rx="2" />
          <line x1="-3" y1="-7" x2="-3" y2="-10" />
          <line x1="3" y1="-7" x2="3" y2="-10" />
          <line x1="-3" y1="7" x2="-3" y2="10" />
          <line x1="3" y1="7" x2="3" y2="10" />
          <circle cx="0" cy="0" r="2" fill={color} />
        </g>
      );
    case 'tree': // Storage Indexes B+ Tree
      return (
        <g stroke={color} fill="none" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="0" cy="-6" r="3" fill={color} />
          <circle cx="-6" cy="5" r="2.5" />
          <circle cx="6" cy="5" r="2.5" />
          <line x1="-1.5" y1="-3.5" x2="-4.5" y2="2.5" />
          <line x1="1.5" y1="-3.5" x2="4.5" y2="2.5" />
        </g>
      );
    case 'lsm': // LSM Tree Strata
      return (
        <g stroke={color} fill="none" strokeWidth="1.8">
          <rect x="-8" y="-8" width="16" height="4" rx="1" fill={color} />
          <rect x="-9" y="-2" width="18" height="4" rx="1" />
          <rect x="-10" y="4" width="20" height="4" rx="1" />
        </g>
      );
    case 'mesh': // Gossip Peer Mesh
      return (
        <g stroke={color} fill="none" strokeWidth="1.8">
          <circle cx="-6" cy="-4" r="2" fill={color} />
          <circle cx="6" cy="-4" r="2" fill={color} />
          <circle cx="0" cy="6" r="2" fill={color} />
          <line x1="-4" y1="-4" x2="4" y2="-4" />
          <line x1="-5" y1="-2" x2="-1" y2="4" />
          <line x1="5" y1="-2" x2="1" y2="4" />
        </g>
      );
    case 'split': // Load Balancer Fork
    default:
      return (
        <g>
          {/* Trunk */}
          <line x1="0" y1="11" x2="0" y2="1" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          {/* Left arrow branch */}
          <path d="M 0,1 C 0,-4 -5,-8 -9,-10" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <polyline points="-11,-6 -9,-10 -5,-10" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {/* Right arrow branch */}
          <path d="M 0,1 C 0,-4 5,-8 9,-10" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <polyline points="5,-10 9,-10 11,-6" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
  }
}

/**
 * Animated packet layer with requestAnimationFrame for smooth 60fps motion.
 */
const PacketLayer: React.FC<{
  packets: FlowPacket[];
  edgeGeometries: EdgeGeometry[];
  isPaused?: boolean;
}> = React.memo(({ packets, edgeGeometries, isPaused = false }) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const circleRefs = useRef<Map<string | number, SVGCircleElement>>(new Map());
  const visualProgressRef = useRef<Map<string | number, number>>(new Map());
  const rafId = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  const edgeMap = useMemo(() => {
    const map = new Map<string, EdgeGeometry>();
    edgeGeometries.forEach((e) => map.set(e.id, e));
    return map;
  }, [edgeGeometries]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const animate = (currentTime: number) => {
      const dt = Math.min(100, currentTime - lastTimeRef.current);
      lastTimeRef.current = currentTime;

      if (!isPaused) {
        packets.forEach((p) => {
          const circle = circleRefs.current.get(p.id);
          const edge = edgeMap.get(p.edgeId);
          if (!circle || !edge) return;

          const currentVisual = visualProgressRef.current.get(p.id) ?? p.progress;
          const target = p.progress;
          const diff = target - currentVisual;
          const nextVisual = Math.abs(diff) < 0.005 ? target : currentVisual + diff * Math.min(1, dt / 40);
          visualProgressRef.current.set(p.id, nextVisual);

          const cx = edge.start.x + (edge.end.x - edge.start.x) * nextVisual;
          const cy = edge.start.y + (edge.end.y - edge.start.y) * nextVisual;
          circle.setAttribute('cx', cx.toFixed(2));
          circle.setAttribute('cy', cy.toFixed(2));
        });
      }

      rafId.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    rafId.current = requestAnimationFrame(animate);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [packets, edgeMap, isPaused, prefersReducedMotion]);

  return (
    <g className="flow-packets pointer-events-none" aria-hidden="true">
      {packets.map((packet) => {
        const edge = edgeMap.get(packet.edgeId);
        if (!edge) return null;

        const pVal = prefersReducedMotion ? packet.progress : (visualProgressRef.current.get(packet.id) ?? packet.progress);
        const cx = edge.start.x + (edge.end.x - edge.start.x) * pVal;
        const cy = edge.start.y + (edge.end.y - edge.start.y) * pVal;

        return (
          <circle
            key={packet.id}
            ref={(el) => {
              if (el) circleRefs.current.set(packet.id, el);
              else circleRefs.current.delete(packet.id);
            }}
            cx={cx}
            cy={cy}
            r="4.5"
            fill={packet.color || '#2e6930'}
            className="transition-opacity duration-150"
          />
        );
      })}
    </g>
  );
});

/**
 * Connector lines between nodes. Memoized to avoid re-rendering.
 */
const EdgesLayer: React.FC<{ edgeGeometries: EdgeGeometry[] }> = React.memo(({ edgeGeometries }) => {
  return (
    <g className="flow-edges pointer-events-none" aria-hidden="true">
      {edgeGeometries.map((edge) => {
        const midX = (edge.start.x + edge.end.x) / 2;
        const midY = (edge.start.y + edge.end.y) / 2;

        return (
          <g key={edge.id}>
            <line
              x1={edge.start.x}
              y1={edge.start.y}
              x2={edge.end.x}
              y2={edge.end.y}
              stroke={edge.color || '#cbd5e1'}
              strokeWidth="1.5"
              strokeDasharray={edge.style === 'dashed' ? '4 4' : undefined}
              className="dark:stroke-slate-700 transition-colors"
            />
            {edge.label && (
              <g transform={`translate(${midX}, ${midY})`}>
                <rect x="-24" y="-8" width="48" height="14" rx="4" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" className="dark:fill-slate-900 dark:stroke-slate-700" />
                <text x="0" y="2.5" textAnchor="middle" className="text-[8px] font-mono fill-slate-500 dark:fill-slate-400">
                  {edge.label}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
});

/**
 * Source (Clients) and Hub (Router / Controller / Filter / Buffer) nodes.
 */
const NodesLayer: React.FC<{
  nodes: FlowNode[];
  nodePositions: Map<string, Point>;
}> = React.memo(({ nodes, nodePositions }) => {
  const sourceNodes = nodes.filter((n) => n.kind === 'source');
  const hubNodes = nodes.filter((n) => n.kind === 'hub');

  return (
    <g className="flow-nodes">
      {/* Source nodes (Clients / Ingress) */}
      {sourceNodes.map((node) => {
        const pos = nodePositions.get(node.id) || { x: 75, y: 135 };
        const iconColor = node.color || '#2e6930';

        return (
          <g key={node.id} className="select-none">
            {/* White outer circle with thin border */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r="26"
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth="1.5"
              className="dark:fill-slate-800 dark:stroke-slate-700 shadow-sm"
            />
            {/* Source Icon */}
            <g transform={`translate(${pos.x - 11}, ${pos.y - 11})`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="dark:stroke-emerald-400">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </g>
            {/* Node label */}
            <text
              x={pos.x}
              y={pos.y + 42}
              textAnchor="middle"
              className="text-xs font-medium fill-slate-600 dark:fill-slate-400 font-sans tracking-tight"
            >
              {node.label}
            </text>
            {node.sublabel && (
              <text x={pos.x} y={pos.y + 54} textAnchor="middle" className="text-[9px] fill-slate-400 font-mono">
                {node.sublabel}
              </text>
            )}
          </g>
        );
      })}

      {/* Hub nodes (Router / Controller / Filter / Buffer) */}
      {hubNodes.map((node) => {
        const pos = nodePositions.get(node.id) || { x: 195, y: 135 };
        const hubColor = node.color || '#2e6930';

        return (
          <g key={node.id} className="select-none">
            {/* Hub Circle */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r="34"
              fill={hubColor}
              className="shadow-md transition-colors"
            />
            {/* Distinct Pattern Icon */}
            <g transform={`translate(${pos.x}, ${pos.y})`}>
              {renderArchitectureIcon(node.icon, '#ffffff')}
            </g>
            {/* Node badge if present */}
            {node.badge && (
              <g transform={`translate(${pos.x}, ${pos.y - 28})`}>
                <rect x="-20" y="-7" width="40" height="14" rx="7" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" className="dark:fill-slate-900 dark:stroke-slate-700 shadow-xs" />
                <text x="0" y="3.5" textAnchor="middle" className="text-[8px] font-bold fill-slate-700 dark:fill-slate-200 font-mono">
                  {node.badge}
                </text>
              </g>
            )}
            {/* Node label */}
            <text
              x={pos.x}
              y={pos.y + 50}
              textAnchor="middle"
              className="text-xs font-semibold font-sans tracking-tight"
              fill={hubColor}
            >
              {node.label}
            </text>
            {node.sublabel && (
              <text x={pos.x} y={pos.y + 62} textAnchor="middle" className="text-[9px] fill-slate-400 font-mono">
                {node.sublabel}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
});

/**
 * Server & Destination Cards stacked vertically on the right.
 */
const CardsLayer: React.FC<{
  nodes: FlowNode[];
  cardBounds: Map<string, { x: number; y: number; width: number; height: number }>;
  nodeStatus?: Record<string, FlowNodeStatus>;
  onToggleNodeSlow?: (nodeId: string) => void;
}> = React.memo(({ nodes, cardBounds, nodeStatus = {}, onToggleNodeSlow }) => {
  const cardNodes = nodes.filter((n) => n.kind === 'card');

  return (
    <g className="flow-cards">
      {cardNodes.map((node) => {
        const bounds = cardBounds.get(node.id) || { x: 310, y: 50, width: 160, height: 56 };
        const status = nodeStatus[node.id] || {};
        const isSlow = status.state === 'slow' || status.state === 'overloaded';
        const isFailed = status.state === 'failed';
        const isAbnormal = isSlow || isFailed;

        const active = status.active ?? 0;
        const done = status.done ?? 0;
        const load = Math.max(0, Math.min(1, status.load ?? (active > 0 ? active / 10 : 0)));

        const loadBarWidth = Math.max(0, (bounds.width - 28) * load);
        const cardAccent = node.color || (isAbnormal ? '#ef4444' : '#2e7d32');

        return (
          <g
            key={node.id}
            tabIndex={onToggleNodeSlow ? 0 : undefined}
            role={onToggleNodeSlow ? 'button' : undefined}
            aria-label={`${node.label}${isSlow ? ' (SLOW)' : ''}: ${active} active, ${done} done`}
            onClick={() => onToggleNodeSlow?.(node.id)}
            onKeyDown={(e) => {
              if (onToggleNodeSlow && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onToggleNodeSlow(node.id);
              }
            }}
            className={onToggleNodeSlow ? 'cursor-pointer focus:outline-none' : ''}
          >
            {/* Card Background */}
            <rect
              x={bounds.x}
              y={bounds.y}
              width={bounds.width}
              height={bounds.height}
              rx="12"
              fill="#ffffff"
              stroke={isAbnormal ? '#ef4444' : '#e2e8f0'}
              strokeWidth={isAbnormal ? '2' : '1.5'}
              className="dark:fill-slate-800 dark:stroke-slate-700 transition-colors shadow-sm"
            />

            {/* Destination Name */}
            <text
              x={bounds.x + 14}
              y={bounds.y + 20}
              className="text-sm font-semibold fill-slate-800 dark:fill-slate-100 font-sans tracking-tight"
            >
              {node.label}
            </text>

            {/* Badge or Domain tag if present */}
            {node.badge && !isSlow && (
              <text
                x={bounds.x + 14 + Math.min(80, node.label.length * 8)}
                y={bounds.y + 19}
                className="text-[9px] font-mono font-bold fill-slate-400 tracking-tight"
              >
                {node.badge}
              </text>
            )}

            {/* SLOW label for accessibility and clear state */}
            {isSlow && (
              <text
                x={bounds.x + 56}
                y={bounds.y + 19}
                className="text-[10px] font-bold fill-amber-600 dark:fill-amber-500 font-sans tracking-wider"
              >
                {status.stateLabel || 'SLOW'}
              </text>
            )}

            {/* Status dot / shape for accessible color-independent state */}
            {isAbnormal ? (
              <g transform={`translate(${bounds.x + bounds.width - 16}, ${bounds.y + 16})`}>
                <circle cx="0" cy="0" r="4.5" fill="#ef4444" />
                <circle cx="0" cy="0" r="2" fill="#ffffff" />
              </g>
            ) : (
              <circle
                cx={bounds.x + bounds.width - 16}
                cy={bounds.y + 16}
                r="4.5"
                fill={cardAccent}
              />
            )}

            {/* Thin Load Bar Track */}
            <rect
              x={bounds.x + 14}
              y={bounds.y + 27}
              width={bounds.width - 28}
              height="3.5"
              rx="1.75"
              fill="#e2e8f0"
              className="dark:fill-slate-700"
            />

            {/* Thin Load Bar Fill */}
            <rect
              x={bounds.x + 14}
              y={bounds.y + 27}
              width={loadBarWidth}
              height="3.5"
              rx="1.75"
              fill={isAbnormal ? '#ef4444' : cardAccent}
              className="transition-all duration-200"
            />

            {/* Detail counter text */}
            <text
              x={bounds.x + 14}
              y={bounds.y + 44}
              className="text-[10px] fill-slate-500 dark:fill-slate-400 font-sans tracking-tight"
            >
              {node.detail || `${active} active · ${done} done`}
            </text>
          </g>
        );
      })}
    </g>
  );
});

/**
 * 3 Footer Stat Tiles matching screenshot.
 */
const StatsFooter: React.FC<{
  stats?: FlowStats | FlowStatItem[];
}> = React.memo(({ stats }) => {
  let tiles: FlowStatItem[] = [];

  if (!stats) {
    tiles = [
      { label: 'Handled', value: 0 },
      { label: 'In flight', value: 0 },
      { label: 'Imbalance', value: 0 },
    ];
  } else if (Array.isArray(stats)) {
    tiles = stats;
  } else {
    tiles = [
      { label: 'Handled', value: stats.handled },
      { label: 'In flight', value: stats.inFlight },
      { label: 'Imbalance', value: stats.imbalance },
    ];
  }

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 divide-x divide-slate-200/80 dark:divide-slate-800 pt-5 px-3">
      {tiles.slice(0, 3).map((tile, idx) => (
        <div key={idx} className="flex flex-col px-3">
          <span className="text-3xl font-bold text-slate-900 dark:text-slate-100 font-sans tracking-tight">
            {tile.value}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400 font-sans mt-0.5 font-normal">
            {tile.label}
          </span>
        </div>
      ))}
    </div>
  );
});

/**
 * Generic Reusable FlowDiagram Component.
 */
export const FlowDiagram: React.FC<FlowDiagramProps> = ({
  nodes,
  edges,
  packets = [],
  nodeStatus = {},
  stats,
  isPaused = false,
  className = '',
  ariaLabel = 'Interactive Flow Diagram',
  onToggleNodeSlow,
}) => {
  const { nodePositions, cardBounds, edgeGeometries, viewBox } = useMemo(
    () => computeLayout(nodes, edges),
    [nodes, edges]
  );

  // Throttled aria-live announcement (updated at most once per second)
  const [ariaLiveStats, setAriaLiveStats] = useState<string>('');
  const lastAriaUpdateRef = useRef<number>(0);
  const pendingAriaUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let statText = '';
    if (stats) {
      if (Array.isArray(stats)) {
        statText = stats.map((s) => `${s.value} ${s.label}`).join(', ');
      } else {
        statText = `${stats.handled} Handled, ${stats.inFlight} In flight, ${stats.imbalance} Imbalance`;
      }
    }

    const now = Date.now();
    const elapsed = now - lastAriaUpdateRef.current;

    if (elapsed >= 1000) {
      lastAriaUpdateRef.current = now;
      setAriaLiveStats(statText);
    } else {
      if (pendingAriaUpdateRef.current) clearTimeout(pendingAriaUpdateRef.current);
      pendingAriaUpdateRef.current = setTimeout(() => {
        lastAriaUpdateRef.current = Date.now();
        setAriaLiveStats(statText);
      }, 1000 - elapsed);
    }

    return () => {
      if (pendingAriaUpdateRef.current) clearTimeout(pendingAriaUpdateRef.current);
    };
  }, [stats]);

  return (
    <div
      className={`relative w-full rounded-3xl bg-[#f7f8fa] dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 p-6 md:p-8 shadow-sm transition-colors ${className}`}
      aria-label={ariaLabel}
    >
      {/* Throttled screen reader telemetry */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ariaLiveStats}
      </div>

      {/* Main Diagram Area */}
      <div className="w-full relative aspect-[520/280] min-h-[220px]">
        <svg
          viewBox={viewBox}
          className="w-full h-full overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Connector Lines */}
          <EdgesLayer edgeGeometries={edgeGeometries} />

          {/* Animated Packets */}
          <PacketLayer packets={packets} edgeGeometries={edgeGeometries} isPaused={isPaused} />

          {/* Source & Hub Nodes */}
          <NodesLayer nodes={nodes} nodePositions={nodePositions} />

          {/* Server & Destination Cards */}
          <CardsLayer
            nodes={nodes}
            cardBounds={cardBounds}
            nodeStatus={nodeStatus}
            onToggleNodeSlow={onToggleNodeSlow}
          />
        </svg>
      </div>

      {/* Footer 3 Stat Tiles */}
      <StatsFooter stats={stats} />
    </div>
  );
};
