import React from 'react';
import { AlertTriangle, CheckCircle2, Zap, Clock, ArrowRight, ShieldAlert, Cpu } from 'lucide-react';
import { TopologySimulationResult } from '../../core/algorithms/bottleneck';
import { DagLatencyResult } from '../../core/algorithms/dagLatency';

interface SimulationResultsPanelProps {
  simulationResult: TopologySimulationResult | null;
  dagResult: DagLatencyResult | null;
  onClose: () => void;
}

export const SimulationResultsPanel: React.FC<SimulationResultsPanelProps> = ({
  simulationResult,
  dagResult,
  onClose,
}) => {
  if (!simulationResult && !dagResult) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 md:p-6 shadow-2xl max-h-80 overflow-y-auto">
      {/* Top Header Metrics */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            System Telemetry Report
          </span>
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Simulation Results
            {simulationResult?.isSystemOverloaded ? (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800">
                <AlertTriangle className="w-3.5 h-3.5" /> Bottleneck Detected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" /> All Nodes Healthy
              </span>
            )}
          </h3>
        </div>

        <button
          onClick={onClose}
          className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold"
        >
          Dismiss Panel
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Target Traffic</span>
          <div className="text-xl font-extrabold text-slate-800 dark:text-slate-200 font-mono mt-0.5">
            {simulationResult?.targetRps.toLocaleString()} RPS
          </div>
        </div>

        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
            Effective Throughput
          </span>
          <div className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200 font-mono mt-0.5">
            {simulationResult?.systemThroughputRps.toLocaleString()} RPS
          </div>
        </div>

        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800">
          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase">Dropped RPS</span>
          <div className="text-xl font-extrabold text-rose-900 dark:text-rose-200 font-mono mt-0.5">
            {simulationResult?.totalDroppedRps.toLocaleString()} RPS
          </div>
        </div>

        <div className="p-3 bg-brand-50 dark:bg-brand-950/40 rounded-xl border border-brand-200 dark:border-brand-800">
          <span className="text-[10px] font-bold text-brand-700 dark:text-brand-400 uppercase">
            Critical Path Latency
          </span>
          <div className="text-xl font-extrabold text-brand-900 dark:text-brand-200 font-mono mt-0.5 flex items-center gap-1">
            <Clock className="w-4 h-4 text-brand-600" />
            {dagResult?.criticalPathLatencyMs} ms
          </div>
        </div>
      </div>

      {/* Cycle Detection Alert */}
      {dagResult?.hasCycle && (
        <div className="p-3 mb-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Cycle Detected in Graph Topology!</strong> The DAG engine identified a circular dependency loop (
            <span className="font-mono">{dagResult.cycleNodeIds?.join(' → ')}</span>). Cyclic loops can cause request
            cascades in production.
          </div>
        </div>
      )}

      {/* Bottlenecks & Recommendations */}
      {simulationResult && simulationResult.bottleneckNodeIds.length > 0 && (
        <div className="space-y-2 mt-4">
          <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block">
            Actionable Optimization Recommendations:
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {simulationResult.bottleneckNodeIds.map((id) => {
              const m = simulationResult.nodeMetrics[id];
              return (
                <div
                  key={id}
                  className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-xs flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      Node: <span className="font-mono">{id}</span> ({m.utilizationPct}% Saturation)
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">{m.recommendation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
