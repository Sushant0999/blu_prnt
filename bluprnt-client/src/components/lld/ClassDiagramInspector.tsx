import React from 'react';
import {
  Trash2,
  Plus,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import type {
  ClassNodeData,
  ClassMember,
  ClassEdgeData,
  ClassKind,
  RelationKind,
  Visibility,
} from '../../core/types/lld';

interface InspectorProps {
  selectedNode: { id: string; data: ClassNodeData } | null;
  selectedEdge: { id: string; source: string; target: string; data?: ClassEdgeData } | null;
  onUpdateNodeData: (id: string, partial: Partial<ClassNodeData>) => void;
  onUpdateEdgeData: (id: string, partial: Partial<ClassEdgeData>) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onClose: () => void;
}

export const ClassDiagramInspector: React.FC<InspectorProps> = ({
  selectedNode,
  selectedEdge,
  onUpdateNodeData,
  onUpdateEdgeData,
  onDeleteNode,
  onDeleteEdge,
  onClose,
}) => {
  if (!selectedNode && !selectedEdge) {
    return null;
  }

  // Edge Inspector
  if (selectedEdge) {
    const data = selectedEdge.data || { kind: 'association' };

    return (
      <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col h-full overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Relation Properties</h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Relation Kind
            </label>
            <select
              value={data.kind}
              onChange={(e) => onUpdateEdgeData(selectedEdge.id, { kind: e.target.value as RelationKind })}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 focus:ring-2 focus:ring-cyan-500"
            >
              <option value="association">Association (–&gt;)</option>
              <option value="inheritance">Inheritance (–▷)</option>
              <option value="implementation">Implementation (- -▷)</option>
              <option value="aggregation">Aggregation (◇–)</option>
              <option value="composition">Composition (◆–)</option>
              <option value="dependency">Dependency (- - &gt;)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Label / Description
            </label>
            <input
              type="text"
              value={data.label || ''}
              onChange={(e) => onUpdateEdgeData(selectedEdge.id, { label: e.target.value })}
              placeholder="e.g. parks, uses, notifies"
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Source Multiplicity
              </label>
              <input
                type="text"
                value={data.sourceMultiplicity || ''}
                onChange={(e) => onUpdateEdgeData(selectedEdge.id, { sourceMultiplicity: e.target.value })}
                placeholder="e.g. 1, 0..*"
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Target Multiplicity
              </label>
              <input
                type="text"
                value={data.targetMultiplicity || ''}
                onChange={(e) => onUpdateEdgeData(selectedEdge.id, { targetMultiplicity: e.target.value })}
                placeholder="e.g. 1..*, 0..1"
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
          <button
            onClick={() => onDeleteEdge(selectedEdge.id)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg hover:bg-rose-100 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Relation
          </button>
        </div>
      </div>
    );
  }

  // Node Inspector
  const node = selectedNode!;
  const data = node.data;

  const handleAddField = () => {
    const newField: ClassMember = {
      id: `f_${Date.now()}`,
      visibility: '-',
      name: 'newField',
      type: 'String',
    };
    onUpdateNodeData(node.id, { fields: [...(data.fields || []), newField] });
  };

  const handleUpdateField = (id: string, partial: Partial<ClassMember>) => {
    const updated = (data.fields || []).map((f) => (f.id === id ? { ...f, ...partial } : f));
    onUpdateNodeData(node.id, { fields: updated });
  };

  const handleDeleteField = (id: string) => {
    const updated = (data.fields || []).filter((f) => f.id !== id);
    onUpdateNodeData(node.id, { fields: updated });
  };

  const handleAddMethod = () => {
    const newMethod: ClassMember = {
      id: `m_${Date.now()}`,
      visibility: '+',
      name: 'newMethod',
      type: 'void',
      params: '',
    };
    onUpdateNodeData(node.id, { methods: [...(data.methods || []), newMethod] });
  };

  const handleUpdateMethod = (id: string, partial: Partial<ClassMember>) => {
    const updated = (data.methods || []).map((m) => (m.id === id ? { ...m, ...partial } : m));
    onUpdateNodeData(node.id, { methods: updated });
  };

  const handleDeleteMethod = (id: string) => {
    const updated = (data.methods || []).filter((m) => m.id !== id);
    onUpdateNodeData(node.id, { methods: updated });
  };

  return (
    <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Class Inspector</h3>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4 flex-1">
        {/* Name & Kind */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
            Entity Name
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => onUpdateNodeData(node.id, { name: e.target.value })}
            className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
            UML Kind
          </label>
          <select
            value={data.kind}
            onChange={(e) => onUpdateNodeData(node.id, { kind: e.target.value as ClassKind })}
            className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 focus:ring-2 focus:ring-cyan-500"
          >
            <option value="class">Class</option>
            <option value="interface">Interface</option>
            <option value="abstract">Abstract Class</option>
            <option value="enum">Enum</option>
          </select>
        </div>

        {/* Fields */}
        {data.kind !== 'enum' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Attributes / Fields ({data.fields?.length || 0})
              </label>
              <button
                onClick={handleAddField}
                className="flex items-center gap-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {(data.fields || []).map((f) => (
                <div key={f.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5">
                  <select
                    value={f.visibility}
                    onChange={(e) => handleUpdateField(f.id, { visibility: e.target.value as Visibility })}
                    className="w-9 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1 py-1 font-mono font-bold"
                  >
                    <option value="+">+</option>
                    <option value="-">–</option>
                    <option value="#">#</option>
                    <option value="~">~</option>
                  </select>
                  <input
                    type="text"
                    value={f.name}
                    onChange={(e) => handleUpdateField(f.id, { name: e.target.value })}
                    className="w-1/2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-1 font-mono"
                    placeholder="name"
                  />
                  <input
                    type="text"
                    value={f.type}
                    onChange={(e) => handleUpdateField(f.id, { type: e.target.value })}
                    className="w-1/2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-1 font-mono"
                    placeholder="type"
                  />
                  <button
                    onClick={() => handleDeleteField(f.id)}
                    className="text-slate-400 hover:text-rose-500 p-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Methods */}
        {data.kind !== 'enum' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Operations / Methods ({data.methods?.length || 0})
              </label>
              <button
                onClick={handleAddMethod}
                className="flex items-center gap-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {(data.methods || []).map((m) => (
                <div key={m.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <select
                      value={m.visibility}
                      onChange={(e) => handleUpdateMethod(m.id, { visibility: e.target.value as Visibility })}
                      className="w-9 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1 py-1 font-mono font-bold"
                    >
                      <option value="+">+</option>
                      <option value="-">–</option>
                      <option value="#">#</option>
                      <option value="~">~</option>
                    </select>
                    <input
                      type="text"
                      value={m.name}
                      onChange={(e) => handleUpdateMethod(m.id, { name: e.target.value })}
                      className="flex-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-1 font-mono"
                      placeholder="methodName"
                    />
                    <input
                      type="text"
                      value={m.type}
                      onChange={(e) => handleUpdateMethod(m.id, { type: e.target.value })}
                      className="w-20 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-1 font-mono"
                      placeholder="return"
                    />
                    <button
                      onClick={() => handleDeleteMethod(m.id)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={m.params || ''}
                    onChange={(e) => handleUpdateMethod(m.id, { params: e.target.value })}
                    className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 font-mono text-[11px]"
                    placeholder="params (e.g. key: K, val: V)"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enum Values */}
        {data.kind === 'enum' && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Enum Values (comma separated)
            </label>
            <input
              type="text"
              value={(data.enumValues || []).join(', ')}
              onChange={(e) =>
                onUpdateNodeData(node.id, {
                  enumValues: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
              placeholder="e.g. COMPACT, LARGE, MOTORCYCLE"
              className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
        <button
          onClick={() => onDeleteNode(node.id)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg hover:bg-rose-100 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Class
        </button>
      </div>
    </div>
  );
};
