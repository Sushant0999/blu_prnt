import React, { useState } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { X } from 'lucide-react';

export interface AnimatedEdgeData {
  trafficRps?: number;
  latencyMs?: number;
  status?: 'normal' | 'congested' | 'dropped';
  onDeleteEdge?: () => void;
}

export const AnimatedEdge: React.FC<EdgeProps<AnimatedEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
  selected,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const traffic = data?.trafficRps ?? 0;
  const status = data?.status ?? 'normal';
  const latency = data?.latencyMs ?? 0;

  // Particle color based on congestion
  const particleColor =
    status === 'dropped' ? '#f43f5e' : status === 'congested' ? '#fbbf24' : '#22d3ee';

  const strokeColor =
    status === 'dropped' ? '#881337' : status === 'congested' ? '#78350f' : '#1e293b';

  // Animation duration scales with traffic (higher traffic = faster packet streams)
  const animDuration = traffic > 10000 ? '1.2s' : traffic > 2000 ? '2s' : '3.5s';

  // Distance between handles to handle compact spacing
  const edgeDist = Math.hypot(targetX - sourceX, targetY - sourceY);
  const isShortEdge = edgeDist < 140;

  return (
    <>
      {/* Invisible wider hit path for easy clicking, selecting & hovering */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth="28"
        className="cursor-pointer pointer-events-stroke"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Background Track with Selection Highlight */}
      <path
        id={id}
        style={{
          ...style,
          stroke: selected ? '#22d3ee' : strokeColor,
          strokeWidth: selected ? 3.5 : traffic > 0 ? 2.5 : 1.5,
          filter: selected ? 'drop-shadow(0 0 6px #22d3ee80)' : undefined,
          transition: 'stroke 0.2s ease, stroke-width 0.2s ease',
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />

      {/* Animated Glowing Packet Flow */}
      {traffic > 0 && (
        <>
          {/* Animated Dashed Overlay */}
          <path
            d={edgePath}
            fill="none"
            stroke={particleColor}
            strokeWidth="2"
            strokeDasharray="6 8"
            className="opacity-75 animate-[dash_1s_linear_infinite]"
            style={{
              animation: `dash ${animDuration} linear infinite`,
            }}
          />

          {/* Animated Particle Packet */}
          <circle r="3.5" fill={particleColor} className="drop-shadow-md">
            <animateMotion dur={animDuration} repeatCount="indefinite" path={edgePath} />
          </circle>
        </>
      )}

      {/* Live Edge Traffic & Latency Label with Disconnect Action */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -100%) translate(${labelX}px,${labelY - (isShortEdge ? 14 : 10)}px)`,
            pointerEvents: 'all',
            zIndex: 30,
          }}
          className="nodrag nopan select-none group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            className={`rounded-full font-mono font-bold border shadow-lg backdrop-blur-md flex items-center whitespace-nowrap transition-all ${
              isShortEdge ? 'px-1.5 py-0.5 text-[8.5px] gap-1' : 'px-2 py-0.5 text-[9px] gap-1.5'
            } ${
              selected
                ? 'bg-cyan-950/95 text-cyan-200 border-cyan-400 ring-2 ring-cyan-500/50 shadow-cyan-950/60'
                : status === 'dropped'
                ? 'bg-rose-950/95 text-rose-300 border-rose-600/90 shadow-rose-950/50'
                : status === 'congested'
                ? 'bg-amber-950/95 text-amber-300 border-amber-600/90 shadow-amber-950/50'
                : 'bg-slate-900/95 text-cyan-300 border-cyan-800/80 shadow-slate-950/50'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                status === 'dropped'
                  ? 'bg-rose-500 animate-ping'
                  : status === 'congested'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-cyan-400'
              }`}
            />
            <span>{traffic >= 1000 ? `${(traffic / 1000).toFixed(1)}k` : traffic} RPS</span>
            {latency > 0 && <span className="opacity-70 font-normal">{isShortEdge ? '' : '•'} {latency}ms</span>}

            {/* Instant Disconnect Button on Badge Hover or Selection */}
            {data?.onDeleteEdge && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  data.onDeleteEdge!();
                }}
                className={`ml-0.5 p-0.5 rounded-full text-slate-400 hover:text-white hover:bg-rose-600 transition flex items-center justify-center ${
                  isHovered || selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                title="Disconnect edge (or press Backspace/Delete)"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
