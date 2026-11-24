import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { ClassNodeData, ClassMember } from '../../core/types/lld';

export const ClassNode: React.FC<NodeProps<ClassNodeData>> = memo(({ data, selected }) => {
  const { name, kind, fields = [], methods = [], enumValues = [] } = data;

  const isInterface = kind === 'interface';
  const isAbstract = kind === 'abstract';
  const isEnum = kind === 'enum';

  const formatVisibility = (vis: string) => {
    switch (vis) {
      case '+': return '+';
      case '-': return '–';
      case '#': return '#';
      case '~': return '~';
      default: return '+';
    }
  };

  const getBadgeStyle = () => {
    switch (kind) {
      case 'interface':
        return 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40';
      case 'abstract':
        return 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-50 dark:bg-amber-950/40';
      case 'enum':
        return 'text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-50 dark:bg-purple-950/40';
      default:
        return 'text-cyan-600 dark:text-cyan-400 border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/40';
    }
  };

  return (
    <div
      className={`min-w-[210px] max-w-[320px] rounded-xl border bg-white dark:bg-slate-900 shadow-md font-sans text-xs transition-all overflow-hidden ${
        selected
          ? 'border-cyan-500 ring-2 ring-cyan-500/30 shadow-lg'
          : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
      }`}
    >
      {/* ReactFlow Handles on 4 borders */}
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-cyan-500 !border-2 !border-white dark:!border-slate-900" />
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-indigo-500 !border-2 !border-white dark:!border-slate-900" />
      <Handle type="target" position={Position.Left} id="target-left" className="!w-2.5 !h-2.5 !bg-cyan-500 !border-2 !border-white dark:!border-slate-900" />
      <Handle type="source" position={Position.Right} id="source-right" className="!w-2.5 !h-2.5 !bg-indigo-500 !border-2 !border-white dark:!border-slate-900" />

      {/* Header section: Stereotype + Name */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-center">
        {kind !== 'class' && (
          <div className="mb-0.5">
            <span className={`inline-block text-[10px] font-mono px-1.5 py-0.2 rounded border font-semibold ${getBadgeStyle()}`}>
              &lt;&lt;{kind}&gt;&gt;
            </span>
          </div>
        )}
        <div className={`font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 truncate ${isAbstract ? 'italic' : ''}`}>
          {name || 'UnnamedClass'}
        </div>
      </div>

      {/* Fields / Attributes section */}
      {!isEnum && (
        <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/80 space-y-1 bg-white dark:bg-slate-900">
          {fields.length === 0 ? (
            <div className="text-[10px] text-slate-400 italic py-0.5">no fields</div>
          ) : (
            fields.map((f: ClassMember) => (
              <div key={f.id} className="flex items-center gap-1 font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate">
                <span className="font-bold text-slate-500 dark:text-slate-400 w-3 shrink-0 text-center">{formatVisibility(f.visibility)}</span>
                <span className="font-medium truncate">{f.name}</span>
                <span className="text-slate-400 dark:text-slate-500">:</span>
                <span className="text-cyan-600 dark:text-cyan-400 truncate">{f.type}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Methods / Operations section */}
      {!isEnum && (
        <div className="px-3 py-1.5 space-y-1 bg-white dark:bg-slate-900">
          {methods.length === 0 ? (
            <div className="text-[10px] text-slate-400 italic py-0.5">no methods</div>
          ) : (
            methods.map((m: ClassMember) => (
              <div key={m.id} className={`flex items-center gap-1 font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate ${m.isAbstract ? 'italic' : ''}`}>
                <span className="font-bold text-slate-500 dark:text-slate-400 w-3 shrink-0 text-center">{formatVisibility(m.visibility)}</span>
                <span className="font-medium truncate">{m.name}</span>
                <span className="text-slate-400">({m.params || ''})</span>
                <span className="text-slate-400 dark:text-slate-500">:</span>
                <span className="text-indigo-600 dark:text-indigo-400 truncate">{m.type}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Enum values section */}
      {isEnum && (
        <div className="px-3 py-1.5 space-y-1 bg-white dark:bg-slate-900">
          {enumValues.length === 0 ? (
            <div className="text-[10px] text-slate-400 italic py-0.5">no enum values</div>
          ) : (
            enumValues.map((val, idx) => (
              <div key={idx} className="font-mono text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                {val}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
});

ClassNode.displayName = 'ClassNode';
