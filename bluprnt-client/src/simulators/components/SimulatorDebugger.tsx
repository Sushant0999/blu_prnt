import React from 'react';
import { Play, Pause, SkipForward, FastForward, RotateCcw, Bug, Activity, Layers } from 'lucide-react';

interface SimulatorDebuggerProps {
  isStepMode: boolean;
  onToggleStepMode: (stepMode: boolean) => void;
  onStepForward: (count?: number) => void;
  onReset: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
  currentStepCount: number;
}

export const SimulatorDebugger: React.FC<SimulatorDebuggerProps> = ({
  isStepMode,
  onToggleStepMode,
  onStepForward,
  onReset,
  isPaused,
  onTogglePause,
  currentStepCount,
}) => {
  return (
    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md">
      {/* Mode Segmented Switch: Auto-Stream vs Interactive Step Debugger */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onToggleStepMode(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 transition ${
              !isStepMode
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Continuous Stream</span>
          </button>
          <button
            onClick={() => onToggleStepMode(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 transition ${
              isStepMode
                ? 'bg-indigo-950 text-indigo-300 border border-indigo-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Step-by-Step Debugger</span>
          </button>
        </div>

        {isStepMode && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-800/80 font-bold uppercase">
            Frame #{currentStepCount}
          </span>
        )}
      </div>

      {/* Debugger Playback Actions */}
      <div className="flex items-center space-x-2">
        {isStepMode ? (
          <>
            <button
              onClick={() => onStepForward(1)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-indigo-500/20 transition active:scale-95"
              title="Process single discrete request frame"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Step 1 Frame</span>
            </button>
            <button
              onClick={() => onStepForward(10)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono font-bold text-xs flex items-center space-x-1 transition active:scale-95"
              title="Fast forward 10 discrete request frames"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>+10</span>
            </button>
          </>
        ) : (
          <button
            onClick={onTogglePause}
            className={`px-3 py-1.5 rounded-lg font-mono font-bold text-xs flex items-center space-x-1.5 border transition ${
              isPaused
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900/60'
                : 'bg-amber-950 text-amber-300 border-amber-800 hover:bg-amber-900/60'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>
        )}

        <button
          onClick={onReset}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
          title="Reset Simulation State"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
