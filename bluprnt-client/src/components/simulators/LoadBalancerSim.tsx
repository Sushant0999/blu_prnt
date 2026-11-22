import React, { useState } from 'react';
import { Server, Send, RotateCcw, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface BackendServer {
  id: number;
  name: string;
  weight: number;
  activeConnections: number;
  totalServed: number;
  isHealthy: boolean;
}

export const LoadBalancerSim: React.FC = () => {
  const [algorithm, setAlgorithm] = useState<'round-robin' | 'least-conn' | 'weighted'>('round-robin');
  const [servers, setServers] = useState<BackendServer[]>([
    { id: 1, name: 'Server A (Fast / 8 vCPU)', weight: 3, activeConnections: 2, totalServed: 0, isHealthy: true },
    { id: 2, name: 'Server B (Standard / 4 vCPU)', weight: 2, activeConnections: 5, totalServed: 0, isHealthy: true },
    { id: 3, name: 'Server C (Eco / 2 vCPU)', weight: 1, activeConnections: 1, totalServed: 0, isHealthy: true },
  ]);
  const [rrIndex, setRrIndex] = useState(0);
  const [lastRoutedTo, setLastRoutedTo] = useState<string | null>(null);

  const routeRequest = () => {
    const healthyServers = servers.filter((s) => s.isHealthy);
    if (healthyServers.length === 0) {
      setLastRoutedTo('HTTP 503 No healthy upstream servers!');
      return;
    }

    let targetId = healthyServers[0].id;

    if (algorithm === 'round-robin') {
      const target = healthyServers[rrIndex % healthyServers.length];
      targetId = target.id;
      setRrIndex((prev) => prev + 1);
    } else if (algorithm === 'least-conn') {
      // Find server with minimum active connections
      const sorted = [...healthyServers].sort((a, b) => a.activeConnections - b.activeConnections);
      targetId = sorted[0].id;
    } else if (algorithm === 'weighted') {
      // Weighted random or weighted round robin
      const totalWeight = healthyServers.reduce((sum, s) => sum + s.weight, 0);
      let rand = Math.random() * totalWeight;
      for (const s of healthyServers) {
        if (rand < s.weight) {
          targetId = s.id;
          break;
        }
        rand -= s.weight;
      }
    }

    // Update target server stats
    setServers((prev) =>
      prev.map((s) => {
        if (s.id === targetId) {
          return {
            ...s,
            totalServed: s.totalServed + 1,
            activeConnections: s.activeConnections + 1,
          };
        }
        // randomly finish some existing connection
        return {
          ...s,
          activeConnections: Math.max(0, s.activeConnections - (Math.random() > 0.6 ? 1 : 0)),
        };
      })
    );

    const chosen = servers.find((s) => s.id === targetId);
    setLastRoutedTo(`Routed to ${chosen?.name}`);
  };

  const sendBurst = () => {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => routeRequest(), i * 120);
    }
  };

  const toggleHealthy = (id: number) => {
    setServers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isHealthy: !s.isHealthy, activeConnections: 0 } : s))
    );
  };

  const reset = () => {
    setServers((prev) =>
      prev.map((s) => ({ ...s, totalServed: 0, activeConnections: Math.floor(Math.random() * 3) }))
    );
    setLastRoutedTo(null);
    setRrIndex(0);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <h4 className="font-bold text-slate-900 dark:text-slate-100">Load Balancer Dispatch Strategies</h4>
        <p className="text-xs text-slate-500 mt-1">
          Compare how Round Robin, Least Connections, and Weighted algorithms balance traffic across heterogeneous backend pools and handle sudden server health failures.
        </p>
      </div>

      {/* Algorithm Selector & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={() => setAlgorithm('round-robin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              algorithm === 'round-robin'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Round Robin
          </button>
          <button
            onClick={() => setAlgorithm('least-conn')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              algorithm === 'least-conn'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Least Connections
          </button>
          <button
            onClick={() => setAlgorithm('weighted')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              algorithm === 'weighted'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Weighted (Capacity-aware)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={routeRequest}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-sm"
          >
            <Send className="w-3.5 h-3.5" /> 1 Request
          </button>
          <button
            onClick={sendBurst}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm"
          >
            Burst (6 Req)
          </button>
          <button
            onClick={reset}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {lastRoutedTo && (
        <div className="px-4 py-2 rounded-lg bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900 text-xs font-mono text-brand-700 dark:text-brand-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-brand-600" />
          <span>{lastRoutedTo}</span>
        </div>
      )}

      {/* Backend Pool */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {servers.map((s) => {
          return (
            <div
              key={s.id}
              className={`p-5 rounded-2xl border transition-all ${
                !s.isHealthy
                  ? 'border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 opacity-75'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Server className={`w-5 h-5 ${s.isHealthy ? 'text-brand-600' : 'text-rose-500'}`} />
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{s.name}</span>
                </div>
                <button
                  onClick={() => toggleHealthy(s.id)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    s.isHealthy
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-rose-100 hover:text-rose-700'
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {s.isHealthy ? 'Healthy' : 'Down'}
                </button>
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Weight / Spec:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{s.weight}x</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Conns:</span>
                  <span className="font-bold text-brand-600 dark:text-brand-400 font-mono">
                    {s.activeConnections}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Requests Served:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{s.totalServed}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
