import React from 'react';
import { Activity, Radio, Cpu, Layers } from 'lucide-react';
import { OutcomeDef } from '../engine/types';
import { AlgorithmVisualizer } from './AlgorithmVisualizer';

interface VisualCardProps {
  simulatorId: string;
  moduleTitle: string;
  modeId: string;
  rate: number;
  isPaused: boolean;
  isBursty: boolean;
  centerMetric: {
    label: string;
    value: string | number;
    percentage?: number;
  };
  liveState: any;
  latestOutcome?: OutcomeDef;
  params: Record<string, any>;
  onTriggerFailure?: (actionId: string) => void;
  children?: React.ReactNode;
}

export const VisualCard: React.FC<VisualCardProps> = ({
  simulatorId,
  moduleTitle,
  modeId,
  rate,
  isPaused,
  isBursty,
  centerMetric,
  liveState,
  latestOutcome,
  params,
  onTriggerFailure,
  children,
}) => {
  const percentage = Math.min(100, Math.max(0, centerMetric.percentage ?? 50));
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
      {/* Background ambient lighting */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Telemetry HUD Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base text-white tracking-tight">
                {moduleTitle}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-800">
                {modeId.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                  }`}
                />
                <span className={isPaused ? 'text-amber-400' : 'text-emerald-400 font-semibold'}>
                  {isPaused ? 'STREAM PAUSED' : 'LIVE STREAM ACTIVE'}
                </span>
              </span>
              <span>•</span>
              <span className="text-cyan-300 font-semibold">
                {isPaused ? '0' : rate} req/s
              </span>
              {isBursty && (
                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-950 text-amber-400 border border-amber-800">
                  BURSTY
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Circular KPI Gauge */}
        <div className="flex items-center gap-3 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800/90 self-start sm:self-auto">
          <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r={radius}
                className="text-slate-800"
                strokeWidth="5"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="40"
                cy="40"
                r={radius}
                className={`transition-all duration-300 ease-out ${
                  percentage > 85 ? 'text-rose-500' : percentage > 60 ? 'text-amber-500' : 'text-cyan-400'
                }`}
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div className="flex flex-col pr-1">
            <span className="text-sm font-bold font-mono text-white tracking-tight">
              {centerMetric.value}
            </span>
            <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-slate-400">
              {centerMetric.label}
            </span>
          </div>
        </div>
      </div>

      {/* Main Algorithm Visualization Engine */}
      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
        <AlgorithmVisualizer
          simulatorId={simulatorId}
          modeId={modeId}
          rate={rate}
          isPaused={isPaused}
          isBursty={isBursty}
          liveState={liveState}
          latestOutcome={latestOutcome}
          params={params}
          onTriggerFailure={onTriggerFailure}
        />
      </div>

      {/* Custom visualizer slot if provided */}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};
