import React, { useState } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { X, Network } from 'lucide-react';
import { InterServiceProtocol, PROTOCOL_REGISTRY } from '../../core/types/protocols';

export interface AnimatedEdgeData {
  trafficRps?: number;
  latencyMs?: number;
  status?: 'normal' | 'congested' | 'dropped';
  protocol?: InterServiceProtocol;
  onDeleteEdge?: () => void;
  onUpdateProtocol?: (protocol: InterServiceProtocol) => void;
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
  const [showProtocolPicker, setShowProtocolPicker] = useState(false);

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
  const protocol = data?.protocol ?? 'rest';
  const protocolDef = PROTOCOL_REGISTRY[protocol] || PROTOCOL_REGISTRY.rest;

  // Particle color based on congestion or protocol
  const particleColor =
    status === 'dropped'
      ? '#f43f5e'
      : status === 'congested'
      ? '#fbbf24'
      : protocolDef.color;

  const strokeColor =
    status === 'dropped' ? '#881337' : status === 'congested' ? '#78350f' : '#1e293b';

  // Animation duration scales with traffic (higher traffic = faster packet streams)
  const animDuration = traffic > 10000 ? '1.2s' : traffic > 2000 ? '2s' : '3.5s';

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
          stroke: selected ? protocolDef.color : strokeColor,
          strokeWidth: selected ? 3.5 : traffic > 0 ? 2.5 : 1.5,
          filter: selected ? `drop-shadow(0 0 6px ${protocolDef.color}80)` : undefined,
          strokeDasharray: protocolDef.dashArray,
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
            strokeDasharray={protocolDef.dashArray || '6 8'}
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

      {/* Live Edge Traffic, Protocol & Latency Label */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -100%) translate(${labelX}px,${labelY - (isShortEdge ? 14 : 10)}px)`,
            pointerEvents: 'all',
            zIndex: showProtocolPicker ? 50 : 30,
          }}
          className="nodrag nopan select-none group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
          }}
        >
          <div className="relative flex flex-col items-center">
            <div
              className={`rounded-full font-mono font-bold border shadow-lg backdrop-blur-md flex items-center whitespace-nowrap transition-all ${
                isShortEdge ? 'px-1.5 py-0.5 text-[8.5px] gap-1' : 'px-2 py-0.5 text-[9px] gap-1.5'
              } ${
                selected
                  ? 'bg-slate-950/95 text-white border-cyan-400 ring-2 ring-cyan-500/50 shadow-cyan-950/60'
                  : status === 'dropped'
                  ? 'bg-rose-950/95 text-rose-300 border-rose-600/90 shadow-rose-950/50'
                  : status === 'congested'
                  ? 'bg-amber-950/95 text-amber-300 border-amber-600/90 shadow-amber-950/50'
                  : 'bg-slate-900/95 text-slate-200 border-slate-700/80 shadow-slate-950/50'
              }`}
            >
              {/* Protocol Badge (Clickable to switch protocol) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProtocolPicker(!showProtocolPicker);
                }}
                className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider transition hover:opacity-80 flex items-center gap-0.5"
                style={{
                  backgroundColor: `${protocolDef.color}25`,
                  color: protocolDef.color,
                  border: `1px solid ${protocolDef.color}60`,
                }}
                title={`Communication Protocol: ${protocolDef.label} (Click to change)`}
              >
                <span>{protocolDef.badge}</span>
              </button>

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

            {/* In-Place Protocol Picker Dropdown */}
            {showProtocolPicker && (
              <div
                className="absolute top-full mt-1.5 bg-slate-900/95 border border-slate-700 rounded-xl p-1.5 shadow-2xl backdrop-blur-md flex flex-col gap-1 min-w-[170px] z-50 text-left animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5 border-b border-slate-800">
                  Inter-Service Protocol
                </div>
                {(Object.keys(PROTOCOL_REGISTRY) as InterServiceProtocol[]).map((protoKey) => {
                  const p = PROTOCOL_REGISTRY[protoKey];
                  const isCurrent = p.id === protocol;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        data?.onUpdateProtocol?.(p.id);
                        setShowProtocolPicker(false);
                      }}
                      className={`flex items-center justify-between px-2 py-1 rounded-lg text-[10px] font-mono transition text-left ${
                        isCurrent
                          ? 'bg-cyan-950/80 text-cyan-300 font-bold border border-cyan-800/80'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        <span>{p.badge}</span>
                      </span>
                      <span className="text-[9px] opacity-60">
                        {p.id === 'grpc' ? 'Low Latency' : p.id === 'event' ? 'Async' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
