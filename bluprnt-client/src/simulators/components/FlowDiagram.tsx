import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface FlowNode {
  id: string;
  label: string;
  kind: 'source' | 'hub' | 'card' | string;
  position?: { x: number; y: number };
  sublabel?: string;
  icon?: 'globe' | 'split' | 'server' | React.ReactNode;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
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

  // 1. Source nodes (Clients)
  sourceNodes.forEach((node, idx) => {
    if (node.position) {
      nodePositions.set(node.id, node.position);
    } else {
      nodePositions.set(node.id, { x: 75, y: cy });
    }
  });

  // 2. Hub nodes (Balancer)
  hubNodes.forEach((node, idx) => {
    if (node.position) {
      nodePositions.set(node.id, node.position);
    } else {
      nodePositions.set(node.id, { x: 195, y: cy });
    }
  });

  // 3. Card nodes (Servers) stacked vertically on the right
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
 * Animated packet layer with requestAnimationFrame for smooth 60fps motion.
 * Updates DOM attributes directly to avoid re-rendering the whole React tree.
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

  // Update animated packet positions smoothly
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

          // Smooth interpolation towards current packet progress (600ms full travel)
          const currentVisual = visualProgressRef.current.get(p.id) ?? p.progress;
          const target = p.progress;
          // Interpolate with slight smoothing or snap
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
      {edgeGeometries.map((edge) => (
        <line
          key={edge.id}
          x1={edge.start.x}
          y1={edge.start.y}
          x2={edge.end.x}
          y2={edge.end.y}
          stroke="#cbd5e1"
          strokeWidth="1.5"
          className="dark:stroke-slate-700 transition-colors"
        />
      ))}
    </g>
  );
});

/**
 * Source (Clients) and Hub (Balancer) nodes.
 */
const NodesLayer: React.FC<{
  nodes: FlowNode[];
  nodePositions: Map<string, Point>;
}> = React.memo(({ nodes, nodePositions }) => {
  const sourceNodes = nodes.filter((n) => n.kind === 'source');
  const hubNodes = nodes.filter((n) => n.kind === 'hub');

  return (
    <g className="flow-nodes">
      {/* Source nodes (Clients) */}
      {sourceNodes.map((node) => {
        const pos = nodePositions.get(node.id) || { x: 75, y: 135 };
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
            {/* Globe icon */}
            <g transform={`translate(${pos.x - 11}, ${pos.y - 11})`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2e6930" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="dark:stroke-emerald-400">
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
          </g>
        );
      })}

      {/* Hub nodes (Balancer) */}
      {hubNodes.map((node) => {
        const pos = nodePositions.get(node.id) || { x: 195, y: 135 };
        return (
          <g key={node.id} className="select-none">
            {/* Large filled green circle */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r="34"
              fill="#2e6930"
              className="dark:fill-emerald-800 shadow-md"
            />
            {/* Split / Fork icon matching screenshot */}
            <g transform={`translate(${pos.x}, ${pos.y})`}>
              {/* Trunk */}
              <line x1="0" y1="11" x2="0" y2="1" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
              {/* Left arrow branch */}
              <path d="M 0,1 C 0,-4 -5,-8 -9,-10" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
              <polyline points="-11,-6 -9,-10 -5,-10" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {/* Right arrow branch */}
              <path d="M 0,1 C 0,-4 5,-8 9,-10" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
              <polyline points="5,-10 9,-10 11,-6" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            {/* Node label */}
            <text
              x={pos.x}
              y={pos.y + 50}
              textAnchor="middle"
              className="text-xs font-semibold fill-[#2e6930] dark:fill-emerald-400 font-sans tracking-tight"
            >
              {node.label}
            </text>
          </g>
        );
      })}
    </g>
  );
});

/**
 * Server Cards stacked vertically on the right.
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

            {/* Server name */}
            <text
              x={bounds.x + 14}
              y={bounds.y + 20}
              className="text-sm font-semibold fill-slate-800 dark:fill-slate-100 font-sans tracking-tight"
            >
              {node.label}
            </text>

            {/* SLOW label for accessibility and clear state */}
            {isSlow && (
              <text
                x={bounds.x + 56}
                y={bounds.y + 19}
                className="text-[10px] font-bold fill-amber-600 dark:fill-amber-500 font-sans tracking-wider"
              >
                SLOW
              </text>
            )}

            {/* Status dot / shape for accessible color-independent state */}
            {isAbnormal ? (
              <g transform={`translate(${bounds.x + bounds.width - 16}, ${bounds.y + 16})`}>
                {/* Red dot */}
                <circle cx="0" cy="0" r="4.5" fill="#ef4444" />
                {/* Distinct shape for accessibility (square or exclamation) */}
                <circle cx="0" cy="0" r="2" fill="#ffffff" />
              </g>
            ) : (
              <circle
                cx={bounds.x + bounds.width - 16}
                cy={bounds.y + 16}
                r="4.5"
                fill="#2e7d32"
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
              fill={isAbnormal ? '#ef4444' : '#2e7d32'}
              className="transition-all duration-200"
            />

            {/* Counter text: X active · Y done */}
            <text
              x={bounds.x + 14}
              y={bounds.y + 44}
              className="text-[10px] fill-slate-500 dark:fill-slate-400 font-sans tracking-tight"
            >
              {`${active} active · ${done} done`}
            </text>
          </g>
        );
      })}
    </g>
  );
});

/**
 * 3 Footer Stat Tiles matching screenshot:
 * Handled, In flight, Imbalance
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
 * Driven entirely by props and rendered via clean SVG + CSS.
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

          {/* Clients & Balancer Nodes */}
          <NodesLayer nodes={nodes} nodePositions={nodePositions} />

          {/* Server Cards */}
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
