import React from 'react';
import { ParamDef } from '../engine/types';
import { Sliders, Zap, Plus, Minus } from 'lucide-react';

interface TrafficPanelProps {
  rate: number;
  maxRate: number;
  isBursty: boolean;
  onRateChange: (rate: number) => void;
  onBurstyChange: (bursty: boolean) => void;
  params: Record<string, any>;
  paramDefs: ParamDef[];
  onParamChange: (paramId: string, val: any) => void;
}

export const TrafficPanel: React.FC<TrafficPanelProps> = ({
  rate,
  maxRate,
  isBursty,
  onRateChange,
  onBurstyChange,
  params,
  paramDefs,
  onParamChange,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center space-x-2 text-slate-300 font-semibold text-sm">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>Traffic & Parameters</span>
        </div>
      </div>

      {/* Rate Slider & Steppers */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Request Rate</span>
          <span className="text-cyan-400 font-bold text-sm">{rate} req/s</span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onRateChange(Math.max(1, rate - 5))}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Decrease rate by 5"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <input
            type="range"
            min={1}
            max={maxRate}
            value={rate}
            onChange={(e) => onRateChange(Number(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />

          <button
            onClick={() => onRateChange(Math.min(maxRate, rate + 5))}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Increase rate by 5"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>1 req/s</span>
          <span>{maxRate} req/s</span>
        </div>
      </div>

      {/* Bursty Traffic Toggle */}
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
        <div className="flex items-center space-x-2">
          <Zap className={`w-4 h-4 ${isBursty ? 'text-amber-400' : 'text-slate-500'}`} />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-200">Bursty Traffic</span>
            <span className="text-[10px] text-slate-500">Alternating calm & 4x spikes</span>
          </div>
        </div>
        <button
          onClick={() => onBurstyChange(!isBursty)}
          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
            isBursty ? 'bg-amber-500' : 'bg-slate-800'
          }`}
        >
          <div
            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
              isBursty ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Module / Mode Parameters */}
      {paramDefs.length > 0 && (
        <div className="pt-2 border-t border-slate-800/80 space-y-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Configuration
          </span>
          {paramDefs.map((p) => {
            const currentValue = params[p.id] ?? p.default;

            if (p.type === 'toggle') {
              return (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">{p.label}</span>
                  <button
                    onClick={() => onParamChange(p.id, !currentValue)}
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                      currentValue ? 'bg-cyan-500' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        currentValue ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            }

            if (p.type === 'stepper') {
              const step = p.step || 1;
              const min = p.min ?? 1;
              const max = p.max ?? 100;
              return (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">{p.label}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onParamChange(p.id, Math.max(min, Number(currentValue) - step))}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono text-cyan-400 font-semibold w-10 text-center">
                      {currentValue} {p.unit || ''}
                    </span>
                    <button
                      onClick={() => onParamChange(p.id, Math.min(max, Number(currentValue) + step))}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            }

            if (p.type === 'slider') {
              const min = p.min ?? 1;
              const max = p.max ?? 100;
              const step = p.step ?? 1;
              return (
                <div key={p.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">{p.label}</span>
                    <span className="font-mono text-cyan-400 font-semibold">
                      {currentValue} {p.unit || ''}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={currentValue}
                    onChange={(e) => onParamChange(p.id, Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                  />
                </div>
              );
            }

            if (p.type === 'select' && p.options) {
              return (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">{p.label}</span>
                  <select
                    value={currentValue}
                    onChange={(e) => onParamChange(p.id, e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
                  >
                    {p.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
};
