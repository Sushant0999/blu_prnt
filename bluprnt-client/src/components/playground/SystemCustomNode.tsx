import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Server,
  Globe,
  Smartphone,
  Cpu,
  Compass,
  Cloud,
  GitBranch,
  DoorOpen,
  Layers,
  KeyRound,
  CreditCard,
  Search,
  Cog,
  Zap,
  Sparkles,
  Network,
  HardDrive,
  Radio,
  CircleDot,
  Database,
  Copy,
  FileCode2,
  Columns3,
  Sparkle,
  BarChart3,
  Share2,
  Activity,
  Mail,
  Inbox,
  Sliders,
  Shuffle,
  HardDriveDownload,
  FolderTree,
  Archive,
  Shield,
  PowerOff,
  Gauge,
  Lock,
  AlertTriangle,
  Clock,
  Skull,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Server,
  Globe,
  Smartphone,
  Cpu,
  Compass,
  Cloud,
  GitBranch,
  DoorOpen,
  Layers,
  KeyRound,
  CreditCard,
  Search,
  Cog,
  Zap,
  Sparkles,
  Network,
  HardDrive,
  Radio,
  CircleDot,
  Database,
  Copy,
  FileCode2,
  Columns3,
  Sparkle,
  BarChart3,
  Share2,
  Activity,
  Mail,
  Inbox,
  Sliders,
  Shuffle,
  HardDriveDownload,
  FolderTree,
  Archive,
  Shield,
  PowerOff,
  Gauge,
  Lock,
  Skull,
};
import { MACHINE_TIERS, MachineTierId } from '../../core/types/machineTiers';

const TIER_ORDER: MachineTierId[] = ['micro', 'standard', 'compute', 'memory', 'metal'];

export interface SystemNodeData {
  label: string;
  category: string;
  icon: string;
  replicas: number;
  capacityQps: number;
  latencyMs: number;
  machineTier?: MachineTierId;
  isDead?: boolean;
  // Simulation results injected dynamically
  simulationMetric?: {
    totalCapacityQps: number;
    incomingRps: number;
    servedRps: number;
    droppedRps: number;
    utilizationPct: number;
    status: 'healthy' | 'warning' | 'bottleneck';
    recommendation?: string;
  };
  remoteSelectedBy?: { name: string; color: string };
  onUpdateReplicas?: (delta: number) => void;
  onUpdateCapacity?: (capacity: number) => void;
  onUpdateLatency?: (latency: number) => void;
  onUpdateMachineTier?: (tier: MachineTierId) => void;
  onUpdateLabel?: (label: string) => void;
  onDeleteNode?: () => void;
}

export const SystemCustomNode = memo(({ data, selected }: NodeProps<SystemNodeData>) => {
  const IconComponent = ICON_MAP[data.icon] || Server;
  const metric = data.simulationMetric;

  let statusRingClass = 'border-slate-800 bg-slate-900/95 text-slate-100';
  if (selected) {
    statusRingClass = 'border-cyan-500 ring-2 ring-cyan-500/50 bg-slate-900 shadow-xl shadow-cyan-500/10';
  }
  if (metric) {
    if (metric.status === 'bottleneck') {
      statusRingClass = 'border-rose-500 ring-2 ring-rose-500/80 bg-rose-950/20 shadow-xl shadow-rose-500/20';
    } else if (metric.status === 'warning') {
      statusRingClass = 'border-amber-500 ring-2 ring-amber-500/60 bg-amber-950/20 shadow-lg shadow-amber-500/10';
    } else {
      statusRingClass = 'border-emerald-500/80 ring-1 ring-emerald-500/40 bg-slate-900';
    }
  }
  if (data.isDead) {
    statusRingClass = 'border-rose-600 ring-2 ring-rose-500/90 bg-rose-950/50 text-rose-200 opacity-75';
  }

  const handleMinus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onUpdateReplicas) data.onUpdateReplicas(-1);
  };

  const handlePlus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onUpdateReplicas) data.onUpdateReplicas(1);
  };

  const currentTier = data.machineTier || 'standard';
  const tierDef = MACHINE_TIERS[currentTier] || MACHINE_TIERS.standard;

  const handleCycleTier = (e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = TIER_ORDER.indexOf(currentTier);
    const nextTier = TIER_ORDER[(idx + 1) % TIER_ORDER.length];
    if (data.onUpdateMachineTier) {
      data.onUpdateMachineTier(nextTier);
    }
  };

  const utilization = metric ? Math.min(100, Math.round(metric.utilizationPct)) : 0;

  return (
    <div
      className={`relative rounded-2xl border-2 transition-all p-3.5 w-[280px] shadow-lg select-none ${statusRingClass}`}
      style={
        data.remoteSelectedBy
          ? { borderColor: data.remoteSelectedBy.color, boxShadow: `0 0 0 2px ${data.remoteSelectedBy.color}80` }
          : undefined
      }
    >
      {/* Offline / Dead Chaos Injected Badge */}
      {data.isDead && (
        <div className="absolute -top-3 right-3 px-2 py-0.5 rounded text-[9px] font-bold bg-rose-600 text-white shadow-md flex items-center gap-1 z-20 animate-pulse">
          <Skull className="w-2.5 h-2.5" />
          <span>OFFLINE (FAULT)</span>
        </div>
      )}

      {/* Remote Selection Badge */}
      {data.remoteSelectedBy && (
        <div
          className="absolute -top-3 left-3 px-2 py-0.5 rounded text-[9px] font-bold text-white shadow-sm flex items-center gap-1 z-20"
          style={{ backgroundColor: data.remoteSelectedBy.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>{data.remoteSelectedBy.name}</span>
        </div>
      )}

      {/* Target connection point (left & top) */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3.5 h-3.5 !bg-cyan-500 border-2 border-slate-950 !-left-2 z-30 transition-transform hover:scale-125"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="w-3.5 h-3.5 !bg-cyan-500 border-2 border-slate-950 !-top-2 z-30 transition-transform hover:scale-125"
      />

      {/* Header: Icon, Category & Node Label */}
      <div className="flex items-start gap-2.5">
        <div
          className={`p-2 rounded-xl text-white shrink-0 shadow-sm ${
            metric?.status === 'bottleneck'
              ? 'bg-rose-600'
              : metric?.status === 'warning'
              ? 'bg-amber-600'
              : selected
              ? 'bg-cyan-600'
              : 'bg-slate-800'
          }`}
        >
          <IconComponent className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="block text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-400 truncate">
            {data.category}
          </span>
          <h4 className="text-xs font-bold text-white truncate tracking-tight mt-0.5" title={data.label}>
            {data.label}
          </h4>
        </div>
      </div>

      {/* Machine Tier Spec Chip */}
      <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono">
        <span className="text-slate-500 uppercase tracking-wider text-[9px]">Tier:</span>
        <button
          onClick={handleCycleTier}
          className="px-2 py-0.5 rounded-md bg-slate-950/80 border border-slate-800 hover:border-cyan-500 text-cyan-300 font-bold transition flex items-center gap-1"
          title="Click to cycle machine tier (Micro → Standard → Compute → Memory → Metal)"
        >
          <span>{tierDef.badge}</span>
        </button>
      </div>

      {/* Row 1: Horizontal Replicas Stepper */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <span className="text-[10px] font-mono font-semibold uppercase text-slate-400">
          Replicas
        </span>
        <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 font-mono">
          <button
            onClick={handleMinus}
            disabled={data.replicas <= 1}
            className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition"
            title="Decrease replica count"
          >
            -
          </button>
          <span className="w-6 text-center font-bold text-white text-[11px]">
            {data.replicas}
          </span>
          <button
            onClick={handlePlus}
            className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Increase replica count"
          >
            +
          </button>
        </div>
      </div>

      {/* Row 2: Capacity & Latency Specs Chips */}
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] font-mono">
        <button
          onClick={(e) => {
            e.stopPropagation();
            const val = window.prompt('Enter Capacity QPS per replica:', String(data.capacityQps));
            if (val && !isNaN(Number(val)) && data.onUpdateCapacity) {
              data.onUpdateCapacity(Number(val));
            }
          }}
          className="p-1.5 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/60 text-slate-300 hover:text-cyan-300 flex items-center justify-between transition group/cap"
          title="Click to edit capacity QPS"
        >
          <span className="text-slate-500 text-[9px] uppercase">Cap:</span>
          <span className="font-bold">{data.capacityQps.toLocaleString()}</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            const val = window.prompt('Enter Latency in ms:', String(data.latencyMs));
            if (val !== null && !isNaN(Number(val)) && data.onUpdateLatency) {
              data.onUpdateLatency(Number(val));
            }
          }}
          className="p-1.5 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/60 text-slate-300 hover:text-cyan-300 flex items-center justify-between transition group/lat"
          title="Click to edit latency (ms)"
        >
          <span className="text-slate-500 text-[9px] uppercase">Lat:</span>
          <span className="font-bold">{data.latencyMs}ms</span>
        </button>
      </div>

      {/* Row 3: Live Telemetry & Health Metric (when simulated) */}
      {metric && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400">
              {metric.incomingRps.toLocaleString()} / {metric.totalCapacityQps.toLocaleString()} QPS
            </span>
            <span
              className={`font-bold ${
                metric.status === 'bottleneck'
                  ? 'text-rose-400'
                  : metric.status === 'warning'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {metric.utilizationPct}%
            </span>
          </div>

          {/* Mini Utilization Progress Bar */}
          <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800/60">
            <div
              className={`h-full transition-all duration-300 ${
                metric.status === 'bottleneck'
                  ? 'bg-rose-500'
                  : metric.status === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, utilization)}%` }}
            />
          </div>

          {metric.droppedRps > 0 && (
            <div className="mt-1 flex items-center justify-between px-2 py-1 rounded bg-rose-950/70 border border-rose-800 text-rose-300 text-[10px] font-mono font-bold animate-pulse">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                <span>Dropped:</span>
              </span>
              <span>{metric.droppedRps.toLocaleString()} RPS</span>
            </div>
          )}
        </div>
      )}

      {/* Source connection point (right & bottom) */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3.5 h-3.5 !bg-indigo-500 border-2 border-slate-950 !-right-2 z-30 transition-transform hover:scale-125"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3.5 h-3.5 !bg-indigo-500 border-2 border-slate-950 !-bottom-2 z-30 transition-transform hover:scale-125"
      />
    </div>
  );
});

SystemCustomNode.displayName = 'SystemCustomNode';
