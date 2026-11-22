import React from 'react';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Layers,
  X,
} from 'lucide-react';
import { Node, Edge } from 'reactflow';
import { SystemNodeData } from './SystemCustomNode';
import { TopologySimulationResult } from '../../core/algorithms/bottleneck';
import { ArchitectureAuditReport } from '../../core/algorithms/architectureLinter';
import { DagLatencyResult } from '../../core/algorithms/dagLatency';

export interface ArchitectureChallenge {
  id: string;
  title: string;
  badge: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Staff Engineer';
  description: string;
  targetRps: number;
  initialTemplateKey: string;
  objectives: {
    id: string;
    description: string;
    validator: (ctx: ChallengeValidationContext) => boolean;
  }[];
}

export interface ChallengeValidationContext {
  nodes: Node<SystemNodeData>[];
  edges: Edge[];
  simulationResult?: TopologySimulationResult | null;
  auditReport?: ArchitectureAuditReport | null;
  dagResult?: DagLatencyResult | null;
}

export const ARCHITECTURE_CHALLENGES: ArchitectureChallenge[] = [
  {
    id: 'black-friday',
    title: 'Black Friday Stampede',
    badge: 'Traffic Avalanche',
    difficulty: 'Intermediate',
    description:
      'The e-commerce checkout pipeline is getting hit with 50,000 RPS flash sale demand. Eliminate all dropped requests by scaling out replicas or upgrading machine tiers without running out of capacity.',
    targetRps: 50000,
    initialTemplateKey: 'ecommerce',
    objectives: [
      {
        id: 'no-dropped',
        description: 'Zero dropped requests (0 dropped RPS across all nodes)',
        validator: (ctx) => {
          if (!ctx.simulationResult) return false;
          return ctx.simulationResult.totalDroppedRps === 0;
        },
      },
      {
        id: 'handled-target',
        description: 'Handle at least 45,000 served RPS',
        validator: (ctx) => {
          if (!ctx.simulationResult) return false;
          return ctx.simulationResult.systemThroughputRps >= 45000;
        },
      },
      {
        id: 'no-severe-bottlenecks',
        description: 'No node at >100% capacity utilization',
        validator: (ctx) => {
          if (!ctx.simulationResult) return false;
          return ctx.simulationResult.bottleneckNodeIds.length === 0;
        },
      },
    ],
  },
  {
    id: 'zero-spof',
    title: 'Zero SPOF Financial Ledger',
    badge: 'Enterprise HA',
    difficulty: 'Staff Engineer',
    description:
      'Audit the Stripe-style payment ledger. Re-architect the topology to eliminate single points of failure in databases, achieve a Reliability Audit score of 90+%, and establish multi-replica redundancy.',
    targetRps: 35000,
    initialTemplateKey: 'stripe-payments',
    objectives: [
      {
        id: 'high-audit-score',
        description: 'Reliability Audit Score of 90% or higher',
        validator: (ctx) => {
          if (!ctx.auditReport) return false;
          return ctx.auditReport.score >= 90;
        },
      },
      {
        id: 'all-dbs-redundant',
        description: 'All database and storage nodes have >= 2 replicas',
        validator: (ctx) => {
          const dbNodes = ctx.nodes.filter(
            (n) =>
              (n.data.category || '').toLowerCase().includes('database') ||
              (n.data.label || '').toLowerCase().includes('sql') ||
              (n.data.label || '').toLowerCase().includes('ledger') ||
              (n.data.label || '').toLowerCase().includes('db')
          );
          if (dbNodes.length === 0) return true;
          return dbNodes.every((n) => (n.data.replicas || 1) >= 2);
        },
      },
      {
        id: 'zero-critical-issues',
        description: 'Zero Critical security/availability audit warnings',
        validator: (ctx) => {
          if (!ctx.auditReport) return false;
          return ctx.auditReport.summary.criticalCount === 0;
        },
      },
    ],
  },
  {
    id: 'tail-latency',
    title: 'Ultra-Low Latency Geospatial Dispatch',
    badge: 'p99 Tamer',
    difficulty: 'Intermediate',
    description:
      'Uber dispatch drivers and riders demand instant matching. Optimize node tiers and edge connections to achieve critical path latency under 35ms while serving 40,000 requests per second.',
    targetRps: 40000,
    initialTemplateKey: 'uber-dispatch',
    objectives: [
      {
        id: 'low-p99',
        description: 'Critical path SLA latency <= 35ms',
        validator: (ctx) => {
          if (!ctx.dagResult) return false;
          return ctx.dagResult.criticalPathLatencyMs <= 35;
        },
      },
      {
        id: 'throughput-met',
        description: 'Cluster serves >= 35,000 RPS',
        validator: (ctx) => {
          if (!ctx.simulationResult) return false;
          return ctx.simulationResult.systemThroughputRps >= 35000;
        },
      },
      {
        id: 'high-performance-tiers',
        description: 'Upgrade dispatch and matching engines to Compute or Memory tier',
        validator: (ctx) => {
          return ctx.nodes.some(
            (n) =>
              n.data.machineTier === 'compute' ||
              n.data.machineTier === 'memory' ||
              n.data.machineTier === 'metal'
          );
        },
      },
    ],
  },
];

interface ArchitectureChallengesModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeChallenge: ArchitectureChallenge | null;
  onSelectChallenge: (challenge: ArchitectureChallenge) => void;
  nodes: Node<SystemNodeData>[];
  edges: Edge[];
  simulationResult?: TopologySimulationResult | null;
  auditReport?: ArchitectureAuditReport | null;
  dagResult?: DagLatencyResult | null;
}

export const ArchitectureChallengesModal: React.FC<ArchitectureChallengesModalProps> = ({
  isOpen,
  onClose,
  activeChallenge,
  onSelectChallenge,
  nodes,
  edges,
  simulationResult,
  auditReport,
  dagResult,
}) => {
  if (!isOpen) return null;

  const context: ChallengeValidationContext = {
    nodes,
    edges,
    simulationResult,
    auditReport,
    dagResult,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Architecture Challenge Arena</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono">
                  Interactive Hands-On
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Fix production incidents and optimize enterprise architectures under real workload constraints.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ARCHITECTURE_CHALLENGES.map((ch) => {
              const isSelected = activeChallenge?.id === ch.id;
              const allPassed =
                isSelected && ch.objectives.every((obj) => obj.validator(context));

              return (
                <div
                  key={ch.id}
                  className={`relative rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-950/20 ring-1 ring-cyan-500/50'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
                        {ch.difficulty}
                      </span>
                      {allPassed && (
                        <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 animate-pulse">
                          <CheckCircle2 className="w-3 h-3" /> Solved
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white">{ch.title}</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {ch.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-400">
                      {ch.targetRps.toLocaleString()} RPS Load
                    </span>
                    <button
                      onClick={() => onSelectChallenge(ch)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      <span>{isSelected ? 'Active' : 'Load Scenario'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Challenge Real-Time Evaluation */}
          {activeChallenge && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-white">
                    Live Evaluation: {activeChallenge.title}
                  </h4>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Target Load: {activeChallenge.targetRps.toLocaleString()} RPS
                </span>
              </div>

              <div className="space-y-2">
                {activeChallenge.objectives.map((obj) => {
                  const passed = obj.validator(context);
                  return (
                    <div
                      key={obj.id}
                      className={`p-3 rounded-xl border flex items-center justify-between transition ${
                        passed
                          ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        {passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <span className="text-xs font-medium">{obj.description}</span>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          passed
                            ? 'bg-emerald-900/60 text-emerald-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {passed ? 'Passed' : 'In Progress'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {activeChallenge.objectives.every((obj) => obj.validator(context)) && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-cyan-950/60 border border-emerald-500/50 flex items-center justify-between text-emerald-300">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
                    <div>
                      <h5 className="text-xs font-bold text-white">
                        Challenge Complete!
                      </h5>
                      <p className="text-[11px] text-emerald-300/80">
                        You successfully met all reliability, capacity, and latency criteria.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition"
                  >
                    Resume Freeform
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
