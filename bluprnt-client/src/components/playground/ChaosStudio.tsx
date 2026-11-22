import React, { useState } from 'react';
import {
  Flame,
  Skull,
  Split,
  Timer,
  RotateCcw,
  AlertTriangle,
  Zap,
  ChevronLeft,
} from 'lucide-react';

export interface ChaosState {
  isSpikeActive: boolean;
  spikeFactor: number;
  deadNodeIds: string[];
  severedEdgeIds: string[];
  jitterMs: number;
}

interface ChaosStudioProps {
  chaosState: ChaosState;
  onTriggerSpike: () => void;
  onKillRandomNode: () => void;
  onSeverRandomEdge: () => void;
  onToggleJitter: () => void;
  onHealAll: () => void;
  hasNodes: boolean;
  hasEdges: boolean;
}

export const ChaosStudio: React.FC<ChaosStudioProps> = ({
  chaosState,
  onTriggerSpike,
  onKillRandomNode,
  onSeverRandomEdge,
  onToggleJitter,
  onHealAll,
  hasNodes,
  hasEdges,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const isAnyChaosActive =
    chaosState.isSpikeActive ||
    chaosState.deadNodeIds.length > 0 ||
    chaosState.severedEdgeIds.length > 0 ||
    chaosState.jitterMs > 0;

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl text-xs font-mono text-slate-300 hover:text-white hover:border-slate-700 transition"
        title="Open Chaos Studio Controls"
      >
        <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span className="font-bold text-[11px]">Chaos Studio</span>
        {isAnyChaosActive && (
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping ml-1" />
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-2xl text-xs font-mono select-none overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800 text-slate-300 shrink-0">
        <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span className="font-bold text-[11px] tracking-tight">Chaos Studio</span>
        <button
          onClick={() => setIsExpanded(false)}
          className="ml-1 p-0.5 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800"
          title="Minimize Chaos Studio"
        >
          <ChevronLeft className="w-3 h-3" />
        </button>
      </div>

      {/* 10x Traffic Spike */}
      <button
        onClick={onTriggerSpike}
        className={`px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-[11px] font-semibold transition ${
          chaosState.isSpikeActive
            ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 animate-pulse'
            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white'
        }`}
        title="Spike incoming traffic by 3x to simulate viral avalanche load"
      >
        <Flame className="w-3.5 h-3.5 text-rose-400" />
        <span>{chaosState.isSpikeActive ? 'Spike (Active)' : '3x Spike'}</span>
      </button>

      {/* Kill Random Node */}
      <button
        onClick={onKillRandomNode}
        disabled={!hasNodes}
        className={`px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-[11px] font-semibold transition disabled:opacity-40 ${
          chaosState.deadNodeIds.length > 0
            ? 'bg-rose-950/80 border border-rose-600 text-rose-300'
            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white'
        }`}
        title="Simulate sudden hardware fault by killing a random node"
      >
        <Skull className="w-3.5 h-3.5 text-rose-400" />
        <span>
          Kill Node
          {chaosState.deadNodeIds.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-600 text-[9px] text-white">
              {chaosState.deadNodeIds.length}
            </span>
          )}
        </span>
      </button>

      {/* Sever Random Edge */}
      <button
        onClick={onSeverRandomEdge}
        disabled={!hasEdges}
        className={`px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-[11px] font-semibold transition disabled:opacity-40 ${
          chaosState.severedEdgeIds.length > 0
            ? 'bg-amber-950/80 border border-amber-600 text-amber-300'
            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white'
        }`}
        title="Simulate network wire cut / cross-rack switch failure"
      >
        <Split className="w-3.5 h-3.5 text-amber-400" />
        <span>
          Sever Link
          {chaosState.severedEdgeIds.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-600 text-[9px] text-white">
              {chaosState.severedEdgeIds.length}
            </span>
          )}
        </span>
      </button>

      {/* Jitter +250ms */}
      <button
        onClick={onToggleJitter}
        className={`px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-[11px] font-semibold transition ${
          chaosState.jitterMs > 0
            ? 'bg-indigo-950/80 border border-indigo-500 text-indigo-300'
            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white'
        }`}
        title="Inject +250ms WAN network latency jitter across downstream calls"
      >
        <Timer className="w-3.5 h-3.5 text-indigo-400" />
        <span>{chaosState.jitterMs > 0 ? '+250ms Active' : '+250ms Jitter'}</span>
      </button>

      {/* Heal All */}
      {isAnyChaosActive && (
        <button
          onClick={onHealAll}
          className="ml-1 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 text-[11px] font-semibold shadow-md shadow-emerald-600/30 transition animate-bounce"
          title="Restore all nodes, edges, and normal traffic parameters"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Heal All</span>
        </button>
      )}
    </div>
  );
};
