import React, { useState, useEffect } from 'react';
import { Node, Edge } from 'reactflow';
import { SystemNodeData } from './SystemCustomNode';
import { TopologySimulationResult } from '../../core/algorithms/bottleneck';
import { DagLatencyResult } from '../../core/algorithms/dagLatency';
import {
  X,
  Trash2,
  Cpu,
  Clock,
  Layers,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  Activity,
  ArrowRight,
  ArrowDownRight,
  Sliders,
  Copy,
  Info,
  Server,
  Zap,
  DollarSign,
  Award,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { MACHINE_TIERS, MachineTierId } from '../../core/types/machineTiers';
import { ArchitectureAuditReport } from '../../core/algorithms/architectureLinter';
import { ArchitectureCostEstimate } from '../../core/algorithms/costEstimator';

interface PlaygroundRightSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedNode: Node<SystemNodeData> | null;
  allNodes: Node<SystemNodeData>[];
  allEdges: Edge[];
  simulationResult?: TopologySimulationResult | null;
  dagResult?: DagLatencyResult | null;
  auditReport?: ArchitectureAuditReport | null;
  costEstimate?: ArchitectureCostEstimate | null;
  targetRps: number;
  onUpdateLabel: (id: string, label: string) => void;
  onUpdateReplicas: (id: string, delta: number, absolute?: number) => void;
  onUpdateCapacity: (id: string, capacity: number) => void;
  onUpdateLatency: (id: string, latency: number) => void;
  onUpdateMachineTier?: (id: string, tier: MachineTierId) => void;
  onDeleteNode: (id: string) => void;
  onDisconnectNodes?: (sourceId: string, targetId: string) => void;
  onSelectNodeById: (id: string) => void;
  onClearSelection: () => void;
}

export const PlaygroundRightSidebar: React.FC<PlaygroundRightSidebarProps> = ({
  isOpen,
  onToggle,
  selectedNode,
  allNodes,
  allEdges,
  simulationResult,
  dagResult,
  auditReport,
  costEstimate,
  targetRps,
  onUpdateLabel,
  onUpdateReplicas,
  onUpdateCapacity,
  onUpdateLatency,
  onUpdateMachineTier,
  onDeleteNode,
  onDisconnectNodes,
  onSelectNodeById,
  onClearSelection,
}) => {
  // Local state for selected node fields
  const [nodeName, setNodeName] = useState('');
  const [replicas, setReplicas] = useState(1);
  const [capacity, setCapacity] = useState(5000);
  const [latency, setLatency] = useState(10);

  useEffect(() => {
    if (selectedNode) {
      setNodeName(selectedNode.data.label || '');
      setReplicas(selectedNode.data.replicas || 1);
      setCapacity(selectedNode.data.capacityQps || 5000);
      setLatency(selectedNode.data.latencyMs || 0);
    }
  }, [selectedNode]);

  // Connected upstream & downstream nodes
  const upstreamNodes = selectedNode
    ? allEdges
        .filter((e) => e.target === selectedNode.id)
        .map((e) => allNodes.find((n) => n.id === e.source))
        .filter(Boolean) as Node<SystemNodeData>[]
    : [];

  const downstreamNodes = selectedNode
    ? allEdges
        .filter((e) => e.source === selectedNode.id)
        .map((e) => allNodes.find((n) => n.id === e.target))
        .filter(Boolean) as Node<SystemNodeData>[]
    : [];

  const metric = selectedNode ? simulationResult?.nodeMetrics[selectedNode.id] : null;

  // Total cluster metrics
  const totalCapacityQps = allNodes.reduce(
    (sum, n) => sum + (n.data.replicas || 1) * (n.data.capacityQps || 5000),
    0
  );
  const totalBottlenecks = simulationResult ? simulationResult.bottleneckNodeIds.length : 0;

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="absolute top-4 right-0 z-20 flex items-center justify-center w-8 h-12 bg-slate-900 border-l border-y border-slate-800 rounded-l-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800 shadow-xl transition"
        title="Open Properties & Telemetry Inspector"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="w-80 sm:w-88 h-full bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 z-20 shadow-2xl transition-all duration-200 select-none">
      {/* Sidebar Header */}
      <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/95">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800/80 text-cyan-400">
            {selectedNode ? <Cpu className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              {selectedNode ? 'Node Inspector' : 'System Overview'}
            </h3>
            <span className="text-[10px] text-slate-400">
              {selectedNode ? selectedNode.data.category : 'Architecture Topology'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {selectedNode && (
            <button
              onClick={onClearSelection}
              className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white transition"
              title="Deselect Node"
            >
              Overview
            </button>
          )}
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Collapse Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sidebar Content (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {selectedNode ? (
          /* ================= SELECTED NODE VIEW ================= */
          <div className="space-y-4">
            {/* Component Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Component Name
              </label>
              <input
                type="text"
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
                onBlur={() => {
                  if (nodeName.trim() && nodeName !== selectedNode.data.label) {
                    onUpdateLabel(selectedNode.id, nodeName.trim());
                  }
                }}
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            {/* Vertical Scaling Tier */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Machine Tier (Vertical)</span>
                <span className="font-mono text-cyan-400 font-bold text-[11px]">
                  {MACHINE_TIERS[(selectedNode.data.machineTier as MachineTierId) || 'standard']?.badge || '4 vCPU • 8GB'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(MACHINE_TIERS) as MachineTierId[]).map((tierKey) => {
                  const t = MACHINE_TIERS[tierKey];
                  const isCurrent = (selectedNode.data.machineTier || 'standard') === tierKey;
                  return (
                    <button
                      key={tierKey}
                      onClick={() => {
                        if (onUpdateMachineTier) {
                          onUpdateMachineTier(selectedNode.id, tierKey);
                        }
                      }}
                      className={`p-2 rounded-lg border text-left transition flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-cyan-950/60 border-cyan-500 text-white ring-1 ring-cyan-500/50'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-bold font-mono uppercase">{tierKey}</span>
                        <span className="text-[9px] font-mono text-cyan-400">${t.monthlyCostUsd}/mo</span>
                      </div>
                      <span className="text-[9px] text-slate-400 truncate mt-0.5">{t.badge}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Replicas Stepper */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Horizontal Replicas</span>
                <span className="font-mono text-cyan-400 font-bold">{replicas} Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const next = Math.max(1, replicas - 1);
                    setReplicas(next);
                    onUpdateReplicas(selectedNode.id, -1);
                  }}
                  disabled={replicas <= 1}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-sm flex items-center justify-center transition border border-slate-700"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={replicas}
                  onChange={(e) => {
                    const next = Math.max(1, Number(e.target.value));
                    setReplicas(next);
                    onUpdateReplicas(selectedNode.id, 0, next);
                  }}
                  className="flex-1 text-center font-mono font-bold text-sm bg-slate-900 border border-slate-800 rounded-lg py-1 text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={() => {
                    const next = replicas + 1;
                    setReplicas(next);
                    onUpdateReplicas(selectedNode.id, 1);
                  }}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center transition border border-slate-700"
                >
                  +
                </button>
              </div>
            </div>

            {/* Capacity & Latency Controls */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <label className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block truncate">
                  Capacity / Rep
                </label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    step="500"
                    min="100"
                    value={capacity}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setCapacity(next);
                      onUpdateCapacity(selectedNode.id, next);
                    }}
                    className="w-full text-xs font-mono font-bold bg-transparent text-white focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-slate-500">QPS</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <label className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block truncate">
                  Processing Latency
                </label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={latency}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setLatency(next);
                      onUpdateLatency(selectedNode.id, next);
                    }}
                    className="w-full text-xs font-mono font-bold bg-transparent text-white focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-slate-500">ms</span>
                </div>
              </div>
            </div>

            {/* Total Max Node Capacity Calculation */}
            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/60 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono uppercase text-cyan-400 block font-bold">
                  Total Node Throughput
                </span>
                <span className="text-sm font-mono font-bold text-white">
                  {(replicas * capacity).toLocaleString()} QPS
                </span>
              </div>
              <Zap className="w-5 h-5 text-cyan-400 opacity-80" />
            </div>

            {/* Live Telemetry Health Gauge */}
            {metric && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
                    Live Telemetry
                  </span>
                  {metric.status === 'bottleneck' ? (
                    <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Bottleneck</span>
                    </span>
                  ) : metric.status === 'warning' ? (
                    <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                      <ShieldAlert className="w-3 h-3" />
                      <span>High Load</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Healthy</span>
                    </span>
                  )}
                </div>

                {/* Utilization Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Utilization</span>
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
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        metric.status === 'bottleneck'
                          ? 'bg-rose-500'
                          : metric.status === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, metric.utilizationPct)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                  <div>
                    <span className="text-slate-500 block">INCOMING</span>
                    <span className="text-white font-bold">{metric.incomingRps.toLocaleString()} RPS</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">SERVED</span>
                    <span className="text-white font-bold">{metric.servedRps.toLocaleString()} RPS</span>
                  </div>
                </div>

                {/* Discrete-Event Queuing & Thread Pool Concurrency */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Worker Thread Pool</span>
                    <span className="text-cyan-300 font-bold">
                      {metric.activeWorkers ?? (replicas * 35)} / {metric.maxWorkers ?? (replicas * 100)} Threads
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            ((metric.activeWorkers ?? (replicas * 35)) /
                              (metric.maxWorkers ?? (replicas * 100))) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Queue Buffer Depth</span>
                    <span
                      className={`font-bold ${
                        (metric.queueDepth ?? 0) > 0 ? 'text-amber-400' : 'text-slate-300'
                      }`}
                    >
                      {metric.queueDepth ?? 0} Pending
                    </span>
                  </div>

                  {/* Tail Latency Distribution Percentiles */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-mono">
                    <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                      <div className="text-[9px] text-slate-500">p50</div>
                      <div className="text-[11px] font-bold text-slate-200">
                        {metric.p50LatencyMs ?? latency}ms
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                      <div className="text-[9px] text-slate-500">p95</div>
                      <div className="text-[11px] font-bold text-amber-300">
                        {metric.p95LatencyMs ?? Math.round(latency * 1.3)}ms
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                      <div className="text-[9px] text-slate-500">p99</div>
                      <div className="text-[11px] font-bold text-rose-300">
                        {metric.p99LatencyMs ?? Math.round(latency * 1.8)}ms
                      </div>
                    </div>
                  </div>

                  {/* Cascading Risk Level */}
                  <div className="flex items-center justify-between text-[10px] font-mono pt-1">
                    <span className="text-slate-500">Cascading Risk:</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                        metric.cascadingRisk === 'severe' || metric.cascadingRisk === 'high'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : metric.cascadingRisk === 'moderate'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}
                    >
                      {metric.cascadingRisk ?? 'low'}
                    </span>
                  </div>
                </div>

                {metric.droppedRps > 0 && (
                  <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-[11px] font-mono flex items-start space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Dropping {metric.droppedRps.toLocaleString()} RPS</strong>
                      <p className="text-[10px] text-rose-400/80 mt-0.5">
                        Add {Math.ceil(metric.droppedRps / capacity)} more replicas to satisfy demand.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Dependency Connections */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Connected Topology
              </span>

              {/* Upstream Sources */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500">Upstream Ingress:</span>
                {upstreamNodes.length === 0 ? (
                  <span className="text-[11px] text-slate-600 italic block pl-1">None (Root entry point)</span>
                ) : (
                  upstreamNodes.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => onSelectNodeById(n.id)}
                      className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 cursor-pointer flex items-center justify-between text-xs text-slate-300 transition group/link"
                    >
                      <span className="truncate flex-1">{n.data.label}</span>
                      <div className="flex items-center space-x-1 shrink-0 ml-1.5">
                        {onDisconnectNodes && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDisconnectNodes(n.id, selectedNode.id);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/60 transition"
                            title={`Disconnect link from ${n.data.label}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        <ArrowRight className="w-3 h-3 text-slate-500 group-hover/link:text-cyan-400" />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Downstream Targets */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-slate-500">Downstream Egress:</span>
                {downstreamNodes.length === 0 ? (
                  <span className="text-[11px] text-slate-600 italic block pl-1">None (Leaf destination)</span>
                ) : (
                  downstreamNodes.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => onSelectNodeById(n.id)}
                      className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 cursor-pointer flex items-center justify-between text-xs text-slate-300 transition group/link"
                    >
                      <span className="truncate flex-1">{n.data.label}</span>
                      <div className="flex items-center space-x-1 shrink-0 ml-1.5">
                        {onDisconnectNodes && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDisconnectNodes(selectedNode.id, n.id);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/60 transition"
                            title={`Disconnect link to ${n.data.label}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        <ArrowRight className="w-3 h-3 text-slate-500 group-hover/link:text-cyan-400" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Delete Node Action */}
            <div className="pt-3 border-t border-slate-800">
              <button
                onClick={() => onDeleteNode(selectedNode.id)}
                className="w-full py-2 rounded-xl text-xs font-semibold bg-rose-950/60 border border-rose-800/80 text-rose-300 hover:bg-rose-900/80 transition flex items-center justify-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Component</span>
              </button>
            </div>
          </div>
        ) : (
          /* ================= GLOBAL ARCHITECTURE VIEW ================= */
          <div className="space-y-5">
            {/* Status Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Cluster Health
                </span>
                {totalBottlenecks > 0 ? (
                  <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{totalBottlenecks} Bottlenecks</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>All Healthy</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Click any component node on the canvas to inspect its replicas, individual capacity, and dependency connections.
              </p>
            </div>

            {/* Core KPIs */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                System Telemetry
              </span>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono uppercase text-slate-500 block">Total Topology Size</span>
                  <span className="text-xs font-mono font-bold text-white">
                    {allNodes.length} Nodes • {allEdges.length} Edges
                  </span>
                </div>
                <Layers className="w-4 h-4 text-cyan-400" />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono uppercase text-slate-500 block">Critical Path Latency</span>
                  <span className="text-xs font-mono font-bold text-white">
                    {dagResult ? `${dagResult.criticalPathLatencyMs} ms` : '0 ms'}
                  </span>
                </div>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono uppercase text-slate-500 block">Cluster Total Capacity</span>
                  <span className="text-xs font-mono font-bold text-white">
                    {totalCapacityQps.toLocaleString()} QPS
                  </span>
                </div>
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>

              {/* End-to-End Tail Latency SLA Profile */}
              {simulationResult && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400 font-bold uppercase">SLA Latency Percentiles</span>
                    <span className="text-cyan-400 font-semibold">End-to-End</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
                    <div className="p-1.5 rounded bg-slate-900 border border-slate-800/80">
                      <div className="text-[9px] text-slate-500">p50</div>
                      <div className="text-xs font-bold text-slate-200">
                        {simulationResult.overallP50LatencyMs ?? 25}ms
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-slate-900 border border-slate-800/80">
                      <div className="text-[9px] text-slate-500">p95</div>
                      <div className="text-xs font-bold text-amber-300">
                        {simulationResult.overallP95LatencyMs ?? 65}ms
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-slate-900 border border-slate-800/80">
                      <div className="text-[9px] text-slate-500">p99</div>
                      <div className="text-xs font-bold text-rose-300">
                        {simulationResult.overallP99LatencyMs ?? 140}ms
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cycle Detection */}
            {dagResult?.hasCycle && (
              <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-800/80 text-amber-200 text-xs space-y-1.5 font-mono">
                <div className="flex items-center space-x-1.5 font-bold text-amber-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Cyclic Topology Loop!</span>
                </div>
                <p className="text-[11px] text-amber-300/80">
                  Cycle path: {dagResult.cycleNodeIds?.join(' ➔ ')}
                </p>
              </div>
            )}

            {/* Reliability & SPOF Audit Card */}
            {auditReport && (
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300">
                      Reliability & SPOF Audit
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-xs ${
                        auditReport.grade === 'A+' || auditReport.grade === 'A'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : auditReport.grade === 'B'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : auditReport.grade === 'C'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      Grade {auditReport.grade}
                    </span>
                    <span className="text-xs font-bold text-white">{auditReport.score}%</span>
                  </div>
                </div>

                {/* Audit Issues Summary Badges */}
                <div className="grid grid-cols-4 gap-1 text-center font-mono text-[9px]">
                  <div className="p-1 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block">CRIT</span>
                    <span className={`font-bold ${auditReport.summary.criticalCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {auditReport.summary.criticalCount}
                    </span>
                  </div>
                  <div className="p-1 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block">HIGH</span>
                    <span className={`font-bold ${auditReport.summary.highCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {auditReport.summary.highCount}
                    </span>
                  </div>
                  <div className="p-1 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block">MED</span>
                    <span className="text-slate-300 font-bold">{auditReport.summary.mediumCount}</span>
                  </div>
                  <div className="p-1 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block">INFO</span>
                    <span className="text-slate-400 font-bold">{auditReport.summary.infoCount}</span>
                  </div>
                </div>

                {/* Issues List */}
                {auditReport.issues.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-slate-800/80 max-h-48 overflow-y-auto">
                    {auditReport.issues.slice(0, 4).map((issue) => (
                      <div
                        key={issue.id}
                        className={`p-2 rounded-lg border text-[11px] space-y-1 ${
                          issue.severity === 'critical'
                            ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                            : issue.severity === 'high'
                            ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span className="truncate">{issue.title}</span>
                          <span className="uppercase text-[8px] font-mono font-bold tracking-wider opacity-80 shrink-0 ml-1">
                            {issue.severity}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-snug">{issue.recommendation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Cloud Infrastructure Cost Card */}
            {costEstimate && (
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300">
                      Cloud Cost Estimator
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    ${costEstimate.totalMonthlyUsd.toLocaleString()} / mo
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 font-mono text-[9px] text-center">
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block">COMPUTE</span>
                    <span className="font-bold text-slate-200">${costEstimate.computeCostUsd}</span>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block">STORAGE</span>
                    <span className="font-bold text-slate-200">${costEstimate.storageCostUsd}</span>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block">EGRESS</span>
                    <span className="font-bold text-slate-200">${costEstimate.networkEgressUsd}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Unit Economics:</span>
                  <span className="font-bold text-cyan-400">
                    ${costEstimate.costPerMillionRequests} / 1M Requests
                  </span>
                </div>
              </div>
            )}

            {/* Quick Tips */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1.5">
              <div className="flex items-center space-x-1 text-slate-300 font-semibold">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>Playground Tips</span>
              </div>
              <ul className="text-[11px] space-y-1 text-slate-400 list-disc list-inside">
                <li>Drag nodes from the left catalog directly onto the canvas.</li>
                <li>Connect node output dots to inputs to route simulated traffic.</li>
                <li>Tweak Load RPS in the toolbar to stress-test your design.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
