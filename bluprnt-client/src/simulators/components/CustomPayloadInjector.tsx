import React, { useState } from 'react';
import { Send, Terminal, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, CornerDownRight } from 'lucide-react';
import { RequestPayload, OutcomeDef } from '../engine/types';

interface CustomPayloadInjectorProps {
  simulatorId: string;
  onInject: (payload: RequestPayload) => OutcomeDef | void;
  latestTrace?: {
    key: string;
    action: string;
    details: string;
    status: 'ok' | 'throttled' | 'miss' | 'hit' | 'error';
  } | null;
}

export const CustomPayloadInjector: React.FC<CustomPayloadInjectorProps> = ({
  simulatorId,
  onInject,
  latestTrace,
}) => {
  const [customKey, setCustomKey] = useState<string>('user:4099');
  const [customPayload, setCustomPayload] = useState<string>('{"event": "checkout", "amount": 149.99}');
  const [activeTab, setActiveTab] = useState<'key' | 'json'>('key');

  const handleFire = (e: React.FormEvent) => {
    e.preventDefault();
    const req: RequestPayload = {
      id: Math.floor(Math.random() * 100000) + 1,
      key: customKey.trim() || `key-${Date.now()}`,
      timestamp: Date.now(),
      sizeBytes: customPayload.length,
    };
    onInject(req);
  };

  const getPlaceholderKey = () => {
    switch (simulatorId) {
      case 'consistent-hashing':
        return 'user:session:tok_9912';
      case 'bloom-filter':
        return 'fraud_ip:198.51.100.42';
      case 'cache-policies':
        return 'catalog:item:prod_882';
      case 'lsm-tree':
        return 'order:txn_55018';
      case 'rate-limiter':
        return 'client_ip:192.168.1.100';
      case 'idempotency-delivery':
        return 'idem-uuid-9f8e-7d6c';
      default:
        return 'req:key_1001';
    }
  };

  return (
    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            Custom Payload & Key Injection
          </span>
        </div>
        <div className="flex items-center space-x-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('key')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
              activeTab === 'key' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800' : 'text-slate-400'
            }`}
          >
            Key
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
              activeTab === 'json' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800' : 'text-slate-400'
            }`}
          >
            Payload JSON
          </button>
        </div>
      </div>

      <form onSubmit={handleFire} className="space-y-2.5">
        {activeTab === 'key' ? (
          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
              Target Key String
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder={getPlaceholderKey()}
                className="flex-1 text-xs font-mono px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 focus:outline-none focus:border-cyan-500 placeholder-slate-600"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-cyan-500/20 transition active:scale-95 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Inject</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
              Request Payload (JSON)
            </label>
            <div className="space-y-2">
              <textarea
                rows={2}
                value={customPayload}
                onChange={(e) => setCustomPayload(e.target.value)}
                className="w-full text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-cyan-500/20 transition active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Inject Custom Payload</span>
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Execution Trace Result Box */}
      {latestTrace && (
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/90 space-y-1 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
              <CornerDownRight className="w-3 h-3 text-cyan-400" />
              <span>Trace Result</span>
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                latestTrace.status === 'ok' || latestTrace.status === 'hit'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : latestTrace.status === 'throttled' || latestTrace.status === 'error'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}
            >
              {latestTrace.status}
            </span>
          </div>
          <div className="text-slate-200 font-semibold">{latestTrace.action}</div>
          <div className="text-[11px] text-slate-400 leading-relaxed">{latestTrace.details}</div>
        </div>
      )}
    </div>
  );
};
