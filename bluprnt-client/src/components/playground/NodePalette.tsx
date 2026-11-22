import React, { useState } from 'react';
import { getAllNodeDefinitions, NodeDefinition } from '../../core/registry/nodeRegistry';
import { Search, Plus, ChevronLeft, ChevronRight, Layers, Sparkles } from 'lucide-react';

interface NodePaletteProps {
  isOpen?: boolean;
  onToggle?: () => void;
  onAddNode: (def: NodeDefinition) => void;
}

export const NodePalette: React.FC<NodePaletteProps> = ({
  isOpen = true,
  onToggle,
  onAddNode,
}) => {
  const allDefs = getAllNodeDefinitions();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = [
    'All',
    'Ingress & Clients',
    'Compute & APIs',
    'Caching',
    'Databases',
    'Queues & Streaming',
    'Storage & Search',
    'Resilience',
  ];

  const filtered = allDefs.filter((d) => {
    const matchesCat = activeCategory === 'All' || d.category === activeCategory;
    const matchesSearch =
      d.label.toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="absolute top-4 left-0 z-20 flex items-center justify-center w-8 h-12 bg-slate-900 border-r border-y border-slate-800 rounded-r-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800 shadow-xl transition"
        title="Open Component Catalog"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 w-64 shrink-0 z-10 select-none shadow-xl transition-all duration-200">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 space-y-3 bg-slate-900/95">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-xs text-white uppercase tracking-wider font-mono">
              Component Catalog
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              {allDefs.length}
            </span>
          </div>
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Collapse Catalog"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search 40+ components..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-medium"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-[10px] px-2 py-0.5 rounded-md font-bold whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60'
              }`}
            >
              {cat === 'All' ? 'All' : cat.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Draggable & Clickable Node List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.map((def) => {
          return (
            <div
              key={def.type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', JSON.stringify(def));
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={() => onAddNode(def)}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-cyan-500/70 hover:bg-slate-800/60 cursor-grab active:cursor-grabbing transition-all flex items-center justify-between group shadow-sm"
              title={`${def.description} (Drag or click to place on canvas)`}
            >
              <div className="min-w-0 pr-2">
                <span className="block text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-400 truncate">
                  {def.category}
                </span>
                <h5 className="font-bold text-xs text-white truncate group-hover:text-cyan-300 transition-colors mt-0.5">
                  {def.label}
                </h5>
                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                  {def.defaultCapacityQps.toLocaleString()} QPS • {def.defaultLatencyMs}ms
                </span>
              </div>
              <button
                className="w-6 h-6 rounded-lg bg-slate-800 group-hover:bg-cyan-600 group-hover:text-white flex items-center justify-center text-slate-400 transition-colors shrink-0 border border-slate-700"
                title="Add to canvas"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
