import React from 'react';
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
} from 'reactflow';
import type { ClassEdgeData } from '../../core/types/lld';

export const RelationEdge: React.FC<EdgeProps<ClassEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    targetX,
    targetY,
  });

  const kind = data?.kind || 'association';
  const label = data?.label;
  const sourceMult = data?.sourceMultiplicity;
  const targetMult = data?.targetMultiplicity;

  const isDashed = kind === 'implementation' || kind === 'dependency';

  // SVG Marker selection
  // In UML:
  // inheritance: solid line + hollow triangle marker at target
  // implementation: dashed line + hollow triangle marker at target
  // composition: solid line + filled diamond marker at source
  // aggregation: solid line + hollow diamond marker at source
  // association: solid line + open arrow at target
  // dependency: dashed line + open arrow at target
  let markerEnd = '';
  let markerStart = '';

  switch (kind) {
    case 'inheritance':
      markerEnd = 'url(#marker-hollow-triangle)';
      break;
    case 'implementation':
      markerEnd = 'url(#marker-hollow-triangle)';
      break;
    case 'association':
      markerEnd = 'url(#marker-open-arrow)';
      break;
    case 'dependency':
      markerEnd = 'url(#marker-open-arrow)';
      break;
    case 'composition':
      markerStart = 'url(#marker-filled-diamond)';
      break;
    case 'aggregation':
      markerStart = 'url(#marker-hollow-diamond)';
      break;
    default:
      markerEnd = 'url(#marker-open-arrow)';
  }

  return (
    <>
      <path
        id={id}
        className={`react-flow__edge-path transition-colors ${
          selected
            ? '!stroke-cyan-500 !stroke-[2.5px]'
            : '!stroke-slate-500 dark:!stroke-slate-400 !stroke-[1.75px]'
        }`}
        d={edgePath}
        strokeDasharray={isDashed ? '5 5' : undefined}
        markerEnd={markerEnd}
        markerStart={markerStart}
      />

      <EdgeLabelRenderer>
        {/* Relation Text Label */}
        {label && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-700 dark:text-slate-300 shadow-sm"
          >
            {label}
          </div>
        )}

        {/* Source Multiplicity */}
        {sourceMult && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${sourceX + (labelX - sourceX) * 0.25}px,${
                sourceY + (labelY - sourceY) * 0.25 - 8
              }px)`,
              pointerEvents: 'none',
            }}
            className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 px-1 rounded"
          >
            {sourceMult}
          </div>
        )}

        {/* Target Multiplicity */}
        {targetMult && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${targetX + (labelX - targetX) * 0.25}px,${
                targetY + (labelY - targetY) * 0.25 - 8
              }px)`,
              pointerEvents: 'none',
            }}
            className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 px-1 rounded"
          >
            {targetMult}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
};
