import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Cpu, Search, Sparkles, Layers, ArrowRight, Play, Tag } from 'lucide-react';
import { SIMULATOR_REGISTRY, getSimulatorById } from '../simulators/registry';
import { SimulatorScreen } from '../simulators/components/SimulatorScreen';

export const SimulatorsPage: React.FC = () => {
  const { simulatorId } = useParams<{ simulatorId?: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // If a specific simulatorId is present in URL, render the active auto-streaming screen directly!
  if (simulatorId) {
    const activeDef = getSimulatorById(simulatorId);
    if (activeDef) {
      return <SimulatorScreen definition={activeDef} />;
    }
  }

  const filteredSims = SIMULATOR_REGISTRY.filter((sim) => {
    const q = searchQuery.toLowerCase();
    return (
      sim.title.toLowerCase().includes(q) ||
      sim.description.toLowerCase().includes(q) ||
      sim.modes.some((m) => m.label.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-cyan-950/70 text-cyan-300 border border-cyan-800/80 mb-2 font-mono">
            <Cpu className="w-3.5 h-3.5" />
            Live Auto-Streaming Lab
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Distributed Systems Simulators
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl">
            18 continuous auto-streaming simulation algorithms. Requests flow immediately upon opening — tune request rates, inject faults, and observe live metrics.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search simulators & algorithms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-200 placeholder-slate-500"
          />
        </div>
      </div>

      {/* Flagship Playground Spotlight Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-950/50 via-slate-900 to-indigo-950/50 border border-cyan-800/60 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-900/60 text-cyan-300 border border-cyan-700/60">
              <Layers className="w-3.5 h-3.5" />
              <span>Flagship Workspace</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Interactive System Design Playground & Live Whiteboard
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Drag-and-drop 40+ infrastructure node types, simulate end-to-end traffic propagation, detect bottlenecks, and collaborate live in real-time with multi-user CRDT awareness.
            </p>
          </div>
          <Link
            to="/playground"
            className="px-5 py-3 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center space-x-2 transition shadow-lg shadow-cyan-500/20 shrink-0"
          >
            <span>Launch Playground</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Simulator Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Auto-Streaming Algorithmic Modules ({filteredSims.length})
          </h3>
          <span className="text-xs text-slate-500">Zero click-to-send • Continuous traffic</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSims.map((sim, idx) => (
            <div
              key={sim.id}
              onClick={() => navigate(`/simulators/${sim.id}`)}
              className="group p-5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-900 hover:border-cyan-500/50 cursor-pointer transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-cyan-950/40 hover:-translate-y-0.5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700 font-semibold">
                    Module {idx + 1}
                  </span>
                  <div className="flex items-center space-x-1 text-emerald-400 text-[11px] font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>{sim.defaultRate} req/s</span>
                  </div>
                </div>

                <h4 className="font-bold text-base text-white group-hover:text-cyan-300 transition-colors">
                  {sim.title}
                </h4>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {sim.description}
                </p>

                {/* Modes chips */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {sim.modes.slice(0, 3).map((mode) => (
                    <span
                      key={mode.id}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/50"
                    >
                      {mode.label}
                    </span>
                  ))}
                  {sim.modes.length > 3 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-400">
                      +{sim.modes.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800/70 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">
                  {sim.modes.length} algorithms
                </span>
                <span className="inline-flex items-center space-x-1 text-cyan-400 font-semibold group-hover:translate-x-1 transition-transform">
                  <span>Stream Live</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
