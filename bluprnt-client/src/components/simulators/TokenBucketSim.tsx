import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

export const TokenBucketSim: React.FC = () => {
  const [capacity, setCapacity] = useState(10);
  const [refillRate, setRefillRate] = useState(2); // tokens per second
  const [tokens, setTokens] = useState(10);
  const [stats, setStats] = useState({ accepted: 0, dropped: 0 });
  const [log, setLog] = useState<{ id: number; action: string; status: 'ok' | 'dropped'; time: string }[]>([]);
  const nextLogId = useRef(1);

  // Background timer to refill tokens
  useEffect(() => {
    const interval = setInterval(() => {
      setTokens((prev) => Math.min(capacity, prev + refillRate));
    }, 1000);
    return () => clearInterval(interval);
  }, [capacity, refillRate]);

  const handleRequest = (cost = 1) => {
    const timeStr = new Date().toLocaleTimeString();
    if (tokens >= cost) {
      setTokens((prev) => prev - cost);
      setStats((prev) => ({ ...prev, accepted: prev.accepted + 1 }));
      setLog((prev) => [
        { id: nextLogId.current++, action: `Request (cost: ${cost})`, status: 'ok', time: timeStr },
        ...prev.slice(0, 9),
      ]);
    } else {
      setStats((prev) => ({ ...prev, dropped: prev.dropped + 1 }));
      setLog((prev) => [
        { id: nextLogId.current++, action: `HTTP 429 Too Many Requests`, status: 'dropped', time: timeStr },
        ...prev.slice(0, 9),
      ]);
    }
  };

  const handleBurst = () => {
    for (let i = 0; i < 5; i++) {
      handleRequest(1);
    }
  };

  const reset = () => {
    setTokens(capacity);
    setStats({ accepted: 0, dropped: 0 });
    setLog([]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <h4 className="font-bold text-slate-900 dark:text-slate-100">Token Bucket Rate Limiter</h4>
        <p className="text-xs text-slate-500 mt-1">
          Tokens accumulate at a constant refill rate up to maximum capacity. Incoming bursts consume tokens immediately; once depleted, requests are throttled with HTTP 429.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Bucket Visualizer */}
        <div className="md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            Bucket Reservoir: {tokens} / {capacity} Tokens
          </div>

          <div className="relative w-48 h-64 border-4 border-t-0 border-slate-300 dark:border-slate-700 rounded-b-3xl bg-slate-50 dark:bg-slate-950/60 overflow-hidden flex flex-col-reverse p-2">
            {/* Liquid / Token indicator */}
            <div
              className="w-full bg-gradient-to-t from-brand-600 to-indigo-500 rounded-b-2xl transition-all duration-300 relative flex items-center justify-center shadow-lg"
              style={{ height: `${(tokens / capacity) * 100}%` }}
            >
              {tokens > 0 && (
                <span className="text-white text-xs font-extrabold font-mono drop-shadow">
                  {tokens} Available
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => handleRequest(1)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition-colors shadow-sm"
            >
              <Zap className="w-3.5 h-3.5" /> 1 Request
            </button>
            <button
              onClick={handleBurst}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5" /> Burst (5 Req)
            </button>
            <button
              onClick={reset}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Controls & Metrics */}
        <div className="md:col-span-6 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Bucket Capacity (Bursts allowed):</span>
                <span className="font-mono text-brand-600">{capacity}</span>
              </div>
              <input
                type="range"
                min="2"
                max="25"
                value={capacity}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCapacity(val);
                  setTokens((prev) => Math.min(val, prev));
                }}
                className="w-full accent-brand-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Refill Rate:</span>
                <span className="font-mono text-brand-600">{refillRate} tokens/sec</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={refillRate}
                onChange={(e) => setRefillRate(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
              <div>
                <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Accepted</div>
                <div className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200">{stats.accepted}</div>
              </div>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
              <div>
                <div className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400">Throttled (429)</div>
                <div className="text-xl font-extrabold text-rose-900 dark:text-rose-200">{stats.dropped}</div>
              </div>
            </div>
          </div>

          {/* Request Log */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Live Gateway Stream</span>
            <div className="space-y-1.5 max-h-40 overflow-y-auto font-mono text-[11px]">
              {log.length === 0 ? (
                <div className="text-slate-400 text-xs py-2 italic text-center">No traffic yet. Send requests above.</div>
              ) : (
                log.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between px-2.5 py-1 rounded ${
                      item.status === 'ok'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold'
                    }`}
                  >
                    <span>{item.action}</span>
                    <span className="text-[10px] opacity-75">{item.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
