import React from 'react';
import { FailureActionDef } from '../engine/types';
import { AlertTriangle, Flame } from 'lucide-react';

interface FailurePanelProps {
  failureActions?: FailureActionDef[];
  onTriggerFailure: (actionId: string) => void;
}

export const FailurePanel: React.FC<FailurePanelProps> = ({
  failureActions,
  onTriggerFailure,
}) => {
  if (!failureActions || failureActions.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900 border border-rose-950/50 rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center space-x-2 text-rose-400 font-semibold text-xs tracking-wider uppercase font-mono">
        <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
        <span>Failure Injection</span>
      </div>
      <p className="text-[11px] text-slate-400">
        Inject faults mid-stream to observe dynamic failover, degradation, and recovery behavior.
      </p>

      <div className="flex flex-wrap gap-2 pt-1">
        {failureActions.map((action) => (
          <button
            key={action.id}
            onClick={() => onTriggerFailure(action.id)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-950/60 border border-rose-800/80 text-rose-200 hover:bg-rose-900/80 transition shadow-sm active:scale-95"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
