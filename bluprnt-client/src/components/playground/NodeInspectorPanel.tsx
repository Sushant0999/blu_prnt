import React, { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { SystemNodeData } from './SystemCustomNode';
import { X, Trash2, Cpu, Clock, Layers, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface NodeInspectorPanelProps {
  node: Node<SystemNodeData> | null;
  onUpdateLabel: (id: string, label: string) => void;
  onUpdateReplicas: (id: string, delta: number, absolute?: number) => void;
  onUpdateCapacity: (id: string, capacity: number) => void;
  onUpdateLatency: (id: string, latency: number) => void;
  onDeleteNode: (id: string) => void;
  onClose: () => void;
}

export const NodeInspectorPanel: React.FC<NodeInspectorPanelProps> = ({
  node,
  onUpdateLabel,
  onUpdateReplicas,
  onUpdateCapacity,
  onUpdateLatency,
  onDeleteNode,
  onClose,
}) => {
  if (!node) return null;

  const data = node.data;
  const metric = data.simulationMetric;

  const [label, setLabel] = useState(data.label);
  const [replicas, setReplicas] = useState(data.replicas);
  const [capacity, setCapacity] = useState(data.capacityQps);
  const [latency, setLatency] = useState(data.latencyMs);

  useEffect(() => {
    setLabel(data.label);
    setReplicas(data.replicas);
    setCapacity(data.capacityQps);
    setLatency(data.latencyMs);
  }, [data.label, data.replicas, data.capacityQps, data.latencyMs, node.id]);

  const handleLabelBlur = () => {
    if (label.trim() && label !== data.label) {
      onUpdateLabel(node.id, label.trim());
    }
  };

  const handleCapacityBlur = () => {
    const val = Number(capacity);
    if (!isNaN(val) && val > 0 && val !== data.capacityQps) {
      onUpdateCapacity(node.id, val);
    }
  };

  const handleLatencyBlur = () => {
    const val = Number(latency);
    if (!isNaN(val) && val >= 0 && val !== data.latencyMs) {
      onUpdateLatency(node.id, val);
    }
  };

  const handleReplicasChange = (newVal: number) => {
    const safe = Math.max(1, newVal);
    setReplicas(safe);
    onUpdateReplicas(node.id, 0, safe);
  };

  return (
    <div className="absolute top-4 right-4 z-30 w-80 bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md space-y-4 animate-in fade-in slide-in-from-right-4 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/80">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              {data.category}
            </span>
            <h4 className="text-xs font-bold text-white">Node Inspector</h4>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Editable Fields */}
      <div className="space-y-3">
        {/* Label */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-400">Node Name</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleLabelBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleLabelBlur()}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 font-medium"
          />
        </div>

        {/* Replicas */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-400">Replicas</span>
            <span className="text-[10px] font-mono text-cyan-400">{replicas} active</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleReplicasChange(replicas - 1)}
              disabled={replicas <= 1}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold font-mono"
            >
              -
            </button>
            <input
              type="number"
              min="1"
              max="200"
              value={replicas}
              onChange={(e) => handleReplicasChange(Number(e.target.value))}
              className="w-full text-center text-xs px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 font-mono font-bold"
            />
            <button
              onClick={() => handleReplicasChange(replicas + 1)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold font-mono"
            >
              +
            </button>
          </div>
        </div>

        {/* Capacity QPS per replica */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-400">Capacity per Replica</span>
            <span className="text-[10px] font-mono text-cyan-400">
              Total: {(replicas * Number(capacity || 0)).toLocaleString()} QPS
            </span>
          </div>
          <div className="relative">
            <input
              type="number"
              step="500"
              min="100"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              onBlur={handleCapacityBlur}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500">
              QPS
            </span>
          </div>
        </div>

        {/* Latency */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-400">Processing Latency</span>
            <span className="text-[10px] font-mono text-slate-500">Hop Delay</span>
          </div>
          <div className="relative">
            <input
              type="number"
              step="1"
              min="0"
              value={latency}
              onChange={(e) => setLatency(Number(e.target.value))}
              onBlur={handleLatencyBlur}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500">
              ms
            </span>
          </div>
        </div>
      </div>

      {/* Live Simulation Metric Status */}
      {metric && (
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-400">Simulation Status</span>
            {metric.status === 'bottleneck' ? (
              <span className="inline-flex items-center space-x-1 text-rose-400 font-bold text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Bottleneck</span>
              </span>
            ) : metric.status === 'warning' ? (
              <span className="inline-flex items-center space-x-1 text-amber-400 font-bold text-[11px]">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Heavy Load</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 text-emerald-400 font-bold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Healthy</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono p-2 rounded-xl bg-slate-950/70 border border-slate-800">
            <div>
              <span className="text-slate-500 block text-[9px] uppercase">Incoming</span>
              <span className="text-white font-bold">{metric.incomingRps.toLocaleString()} RPS</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase">Utilization</span>
              <span
                className={`font-bold ${
                  metric.utilizationPct > 100
                    ? 'text-rose-400'
                    : metric.utilizationPct > 70
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {metric.utilizationPct}%
              </span>
            </div>
          </div>

          {metric.droppedRps > 0 && (
            <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-[11px] font-mono">
              ⚠️ Dropping <strong>{metric.droppedRps.toLocaleString()} RPS</strong>! Scale replicas to resolve.
            </div>
          )}
        </div>
      )}

      {/* Delete Action */}
      <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
        <button
          onClick={() => onDeleteNode(node.id)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/60 border border-rose-800/80 text-rose-300 hover:bg-rose-900/80 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Node</span>
        </button>
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
        >
          Done
        </button>
      </div>
    </div>
  );
};
