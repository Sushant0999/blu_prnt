import React from 'react';
import { OutcomeDef, OutcomeShape } from '../engine/types';

interface RequestStripProps {
  outcomes: OutcomeDef[]; // up to 44 items (newest at end)
  availableOutcomes?: OutcomeDef[];
}

export const ShapeIcon: React.FC<{ shape: OutcomeShape; className?: string }> = ({ shape, className = 'w-3 h-3' }) => {
  switch (shape) {
    case 'circle':
      return (
        <svg viewBox="0 0 14 14" className={className}>
          <circle cx="7" cy="7" r="4.5" fill="currentColor" />
        </svg>
      );
    case 'square':
      return (
        <svg viewBox="0 0 14 14" className={className}>
          <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
        </svg>
      );
    case 'triangle':
      return (
        <svg viewBox="0 0 14 14" className={className}>
          <polygon points="7,2 12,12 2,12" fill="currentColor" />
        </svg>
      );
    case 'diamond':
      return (
        <svg viewBox="0 0 14 14" className={className}>
          <polygon points="7,2 12,7 7,12 2,7" fill="currentColor" />
        </svg>
      );
    case 'cross':
      return (
        <svg viewBox="0 0 14 14" className={className}>
          <path d="M3,3 L11,11 M11,3 L3,11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 14 14" className={className}>
          <polygon points="7,1 8.8,5.2 13.3,5.5 9.8,8.5 11,13 7,10.5 3,13 4.2,8.5 0.7,5.5 5.2,5.2" fill="currentColor" />
        </svg>
      );
    case 'slash':
      return (
        <svg viewBox="0 0 14 14" className={className}>
          <line x1="3" y1="11" x2="11" y2="3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 14 14" className={className}>
          <circle cx="7" cy="7" r="4" fill="currentColor" />
        </svg>
      );
  }
};

export const RequestStrip: React.FC<RequestStripProps> = ({ outcomes, availableOutcomes = [] }) => {
  const TOTAL_SLOTS = 44;
  // Pad with empty slots on the left if fewer than 44 items
  const paddedOutcomes: (OutcomeDef | null)[] = Array(TOTAL_SLOTS).fill(null);
  const startIdx = Math.max(0, TOTAL_SLOTS - outcomes.length);
  const sliceFrom = Math.max(0, outcomes.length - TOTAL_SLOTS);
  const displayItems = outcomes.slice(sliceFrom);

  displayItems.forEach((item, i) => {
    paddedOutcomes[startIdx + i] = item;
  });

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-lg p-3 shadow-inner">
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
        <span>Request Flow Strip (Oldest)</span>
        <span className="text-cyan-400 font-semibold">Last 44 Requests (Newest ➔)</span>
      </div>

      {/* 44-slot grid/flex strip */}
      <div
        className="w-full gap-1 p-1 bg-slate-950/70 rounded border border-slate-800/80 items-center overflow-x-auto"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(44, minmax(0, 1fr))' }}
      >
        {paddedOutcomes.map((item, idx) => {
          if (!item) {
            return (
              <div
                key={`empty-${idx}`}
                className="h-7 rounded flex items-center justify-center bg-slate-900/50 border border-dashed border-slate-800 text-slate-700"
              >
                <span className="w-1 h-1 rounded-full bg-slate-800" />
              </div>
            );
          }

          return (
            <div
              key={`outcome-${idx}`}
              title={`${item.label}`}
              className="h-7 rounded flex items-center justify-center transition-all duration-150 transform hover:scale-125 hover:z-10 shadow-sm"
              style={{
                backgroundColor: `${item.color}22`,
                borderColor: item.color,
                borderWidth: '1px',
                color: item.color,
              }}
            >
              <ShapeIcon shape={item.shape} className="w-3.5 h-3.5" />
            </div>
          );
        })}
      </div>

      {/* Accessible Legend */}
      {availableOutcomes.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/60 text-xs">
          <span className="text-slate-400 font-medium">Legend:</span>
          {availableOutcomes.map((outcome) => (
            <div key={outcome.id} className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-slate-800/50 border border-slate-700/50">
              <span style={{ color: outcome.color }} className="flex items-center">
                <ShapeIcon shape={outcome.shape} className="w-3 h-3" />
              </span>
              <span className="text-slate-300">{outcome.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
