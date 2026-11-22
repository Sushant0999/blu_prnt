import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Shuffle, CheckCircle, ArrowRight } from 'lucide-react';

interface PhysicalNode {
  id: string;
  name: string;
  color: string;
}

interface AssignedKey {
  key: string;
  hash: number; // 0 to 359 degrees
  assignedNodeId: string;
}

// Simple consistent hash function to angle [0, 359]
function hashStringToAngle(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

const DEFAULT_NODES: PhysicalNode[] = [
  { id: 'node-a', name: 'Server A (US-East)', color: '#3b82f6' },
  { id: 'node-b', name: 'Server B (EU-West)', color: '#10b981' },
  { id: 'node-c', name: 'Server C (AP-South)', color: '#f59e0b' },
];

export const ConsistentHashingSim: React.FC = () => {
  const [nodes, setNodes] = useState<PhysicalNode[]>(DEFAULT_NODES);
  const [vnodesPerNode, setVnodesPerNode] = useState<number>(3);
  const [keys, setKeys] = useState<string[]>([
    'user:1001',
    'session:abc',
    'order:9921',
    'image:banner.png',
    'user:5502',
    'cart:8812',
    'token:jwt77',
    'cache:feed:home',
  ]);
  const [inputKey, setInputKey] = useState('');
  const [activeHighlightKey, setActiveHighlightKey] = useState<string | null>(null);

  // Compute ring positions for all virtual nodes
  const ringNodes = useMemo(() => {
    const list: { nodeId: string; angle: number; color: string; vnodeIndex: number }[] = [];
    nodes.forEach((n) => {
      for (let v = 0; v < vnodesPerNode; v++) {
        const vKey = `${n.id}-vn${v}`;
        const angle = hashStringToAngle(vKey);
        list.push({ nodeId: n.id, angle, color: n.color, vnodeIndex: v });
      }
    });
    return list.sort((a, b) => a.angle - b.angle);
  }, [nodes, vnodesPerNode]);

  // Route each key to the nearest clockwise node
  const assignedKeys: AssignedKey[] = useMemo(() => {
    if (ringNodes.length === 0) return [];
    return keys.map((key) => {
      const angle = hashStringToAngle(key);
      // Find first node with angle >= key angle, or wrap around to 0
      const target = ringNodes.find((rn) => rn.angle >= angle) || ringNodes[0];
      return {
        key,
        hash: angle,
        assignedNodeId: target.nodeId,
      };
    });
  }, [keys, ringNodes]);

  const addNode = () => {
    if (nodes.length >= 6) return;
    const colors = ['#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6', '#f97316'];
    const id = `node-${String.fromCharCode(97 + nodes.length)}`;
    const nextColor = colors[nodes.length % colors.length];
    setNodes([...nodes, { id, name: `Server ${String.fromCharCode(65 + nodes.length)}`, color: nextColor }]);
  };

  const removeNode = (id: string) => {
    if (nodes.length <= 1) return;
    setNodes(nodes.filter((n) => n.id !== id));
  };

  const addKey = () => {
    const trimmed = inputKey.trim();
    if (!trimmed || keys.includes(trimmed)) return;
    setKeys([...keys, trimmed]);
    setInputKey('');
    setActiveHighlightKey(trimmed);
  };

  const addRandomKey = () => {
    const rKey = `req:${Math.floor(Math.random() * 9000 + 1000)}`;
    setKeys((prev) => [...prev, rKey]);
    setActiveHighlightKey(rKey);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div>
          <h4 className="font-bold text-slate-900 dark:text-slate-100">Consistent Hash Ring Visualizer</h4>
          <p className="text-xs text-slate-500">
            Keys map clockwise to the next available server token. Adding or removing servers only migrates adjacent keys.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Virtual Nodes:</label>
          <select
            value={vnodesPerNode}
            onChange={(e) => setVnodesPerNode(Number(e.target.value))}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
          >
            <option value={1}>1 (Higher Skew)</option>
            <option value={3}>3 (Balanced)</option>
            <option value={5}>5 (High Uniformity)</option>
            <option value={10}>10 (Production Grade)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Ring Canvas */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="relative w-72 h-72 sm:w-80 sm:h-80">
            <svg viewBox="0 0 300 300" className="w-full h-full">
              {/* Outer Ring */}
              <circle cx="150" cy="150" r="110" fill="none" stroke="#cbd5e1" strokeWidth="4" strokeDasharray="4 4" className="dark:stroke-slate-700" />
              
              {/* Center Info */}
              <circle cx="150" cy="150" r="60" className="fill-slate-50 dark:fill-slate-800" />
              <text x="150" y="145" textAnchor="middle" className="text-[11px] font-bold fill-slate-700 dark:fill-slate-300">
                Hash Space
              </text>
              <text x="150" y="162" textAnchor="middle" className="text-[9px] fill-slate-400 font-mono">
                [0 → 2³² - 1]
              </text>

              {/* Virtual Nodes on Ring */}
              {ringNodes.map((rn, idx) => {
                const rad = ((rn.angle - 90) * Math.PI) / 180;
                const cx = 150 + 110 * Math.cos(rad);
                const cy = 150 + 110 * Math.sin(rad);
                return (
                  <g key={`rn-${rn.nodeId}-${idx}`}>
                    <circle cx={cx} cy={cy} r="7" fill={rn.color} stroke="#ffffff" strokeWidth="2" className="drop-shadow-sm" />
                  </g>
                );
              })}

              {/* Keys on Ring */}
              {assignedKeys.map((ak) => {
                const isHighlight = activeHighlightKey === ak.key;
                const rad = ((ak.hash - 90) * Math.PI) / 180;
                const cx = 150 + 110 * Math.cos(rad);
                const cy = 150 + 110 * Math.sin(rad);
                const node = nodes.find((n) => n.id === ak.assignedNodeId);
                return (
                  <g
                    key={ak.key}
                    className="cursor-pointer transition-transform duration-200"
                    onClick={() => setActiveHighlightKey(ak.key)}
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHighlight ? 8 : 4.5}
                      fill={isHighlight ? '#ef4444' : node?.color || '#94a3b8'}
                      stroke="#ffffff"
                      strokeWidth={isHighlight ? '2.5' : '1.5'}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="text-center text-xs text-slate-500 mt-2">
            Clockwise routing flow • Dots indicate key positions • Colored markers indicate server partitions
          </div>
        </div>

        {/* Server Controls & Key Inspector */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Physical Cluster Nodes</span>
              <button
                onClick={addNode}
                disabled={nodes.length >= 6}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Node
              </button>
            </div>
            <div className="space-y-2">
              {nodes.map((node) => {
                const count = assignedKeys.filter((k) => k.assignedNodeId === node.id).length;
                const pct = keys.length ? Math.round((count / keys.length) * 100) : 0;
                return (
                  <div key={node.id} className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: node.color }} />
                      <div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{node.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {count} keys ({pct}% load)
                        </div>
                      </div>
                    </div>
                    {nodes.length > 1 && (
                      <button
                        onClick={() => removeNode(node.id)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                        title="Simulate Server Outage / Removal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Ingestion & Testing */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block mb-2">Ingest Keys</span>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="e.g. order:10992"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addKey()}
                className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
              />
              <button
                onClick={addKey}
                className="px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white rounded-lg text-xs font-medium hover:bg-slate-900"
              >
                Hash
              </button>
              <button
                onClick={addRandomKey}
                className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200"
                title="Add random key"
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </div>

            {/* Active Key Routing Explanation */}
            {activeHighlightKey && (
              <div className="p-3 bg-brand-50 dark:bg-brand-950/40 rounded-lg border border-brand-200 dark:border-brand-900 text-xs text-brand-900 dark:text-brand-300">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-brand-600" />
                  Routing: <span className="font-mono">{activeHighlightKey}</span>
                </div>
                {(() => {
                  const ak = assignedKeys.find((k) => k.key === activeHighlightKey);
                  const n = nodes.find((node) => node.id === ak?.assignedNodeId);
                  return (
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                      Hash Angle: <span className="font-mono">{ak?.hash}°</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      Routed to: <strong className="text-slate-800 dark:text-slate-200">{n?.name}</strong>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
