import React from 'react';
import { ModeDef } from '../engine/types';
import { Info } from 'lucide-react';

interface ModeSelectorProps {
  modes: ModeDef[];
  currentModeId: string;
  onSelectMode: (modeId: string) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  modes,
  currentModeId,
  onSelectMode,
}) => {
  const activeMode = modes.find((m) => m.id === currentModeId) || modes[0];

  return (
    <div className="flex flex-col space-y-2.5">
      {/* Mode Buttons */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg">
        {modes.map((mode, idx) => {
          const isSelected = mode.id === currentModeId;
          return (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              className={`flex-1 min-w-[120px] px-3 py-2 rounded-md text-xs font-semibold transition-all duration-150 flex items-center justify-center space-x-1.5 ${
                isSelected
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <span className="font-mono text-[10px] opacity-70">[{idx + 1}]</span>
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic 1-line plain-language explanation */}
      {activeMode && (
        <div className="flex items-center space-x-2 text-xs text-slate-300 bg-slate-950/70 border border-cyan-900/40 rounded-lg px-3 py-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{activeMode.explanation}</span>
        </div>
      )}
    </div>
  );
};
