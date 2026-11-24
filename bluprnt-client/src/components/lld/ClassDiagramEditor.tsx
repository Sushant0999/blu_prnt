import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
  addEdge,
  ReactFlowInstance,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  Plus,
  Undo2,
  Redo2,
  Maximize2,
  Download,
  Upload,
  Copy,
  AlertTriangle,
  FileCode,
  Check,
} from 'lucide-react';

import { ClassNode } from './ClassNode';
import { RelationEdge } from './RelationEdge';
import { ClassDiagramInspector } from './ClassDiagramInspector';
import { validateLldDiagram } from '../../core/lld/diagramValidation';
import { diagramToMermaid, exportDiagramToJson, importDiagramFromJson } from '../../core/lld/diagramSerialization';
import type {
  LldDiagram,
  ClassNodeData,
  ClassEdgeData,
  ClassKind,
  RelationKind,
} from '../../core/types/lld';

const nodeTypes = {
  classNode: ClassNode,
};

const edgeTypes = {
  relationEdge: RelationEdge,
};

interface ClassDiagramEditorProps {
  initialDiagram?: LldDiagram;
  readOnly?: boolean;
  onSave?: (diagram: LldDiagram) => void;
  className?: string;
}

export const ClassDiagramEditorInternal: React.FC<ClassDiagramEditorProps> = ({
  initialDiagram = { nodes: {}, edges: {} },
  readOnly = false,
  onSave,
  className = '',
}) => {
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  // Convert LldDiagram to React Flow Nodes & Edges
  const initialNodes = useMemo<Node<ClassNodeData>[]>(() => {
    return Object.values(initialDiagram.nodes || {}).map((n) => ({
      id: n.id,
      type: 'classNode',
      position: n.position || { x: 100, y: 100 },
      data: n.data,
    }));
  }, [initialDiagram]);

  const initialEdges = useMemo<Edge<ClassEdgeData>[]>(() => {
    return Object.values(initialDiagram.edges || {}).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'relationEdge',
      data: e.data,
    }));
  }, [initialDiagram]);

  const [nodes, setNodes] = useState<Node<ClassNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge<ClassEdgeData>[]>(initialEdges);

  // Active relation kind selector for next drawn connection
  const [activeRelationKind, setActiveRelationKind] = useState<RelationKind>('association');

  // Selected item state for inspector
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Undo / Redo history
  const historyRef = useRef<{ nodes: Node<ClassNodeData>[]; edges: Edge<ClassEdgeData>[] }[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoRef = useRef(false);

  // Copied Mermaid toast state
  const [copiedMermaid, setCopiedMermaid] = useState(false);

  // Sync internal state when initialDiagram changes externally
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  // Convert current state to LldDiagram format
  const currentDiagram = useMemo<LldDiagram>(() => {
    const dNodes: LldDiagram['nodes'] = {};
    for (const n of nodes) {
      dNodes[n.id] = {
        id: n.id,
        position: n.position,
        data: n.data,
      };
    }

    const dEdges: LldDiagram['edges'] = {};
    for (const e of edges) {
      dEdges[e.id] = {
        id: e.id,
        source: e.source,
        target: e.target,
        data: e.data || { kind: 'association' },
      };
    }

    return { nodes: dNodes, edges: dEdges };
  }, [nodes, edges]);

  // Run validation
  const warnings = useMemo(() => {
    return validateLldDiagram(currentDiagram);
  }, [currentDiagram]);

  // Push to history
  const pushHistory = useCallback((newNodes: Node<ClassNodeData>[], newEdges: Edge<ClassEdgeData>[]) => {
    if (isUndoRedoRef.current) return;
    const history = historyRef.current.slice(0, historyIndexRef.current + 1);
    history.push({ nodes: newNodes, edges: newEdges });
    if (history.length > 30) history.shift();
    historyRef.current = history;
    historyIndexRef.current = history.length - 1;
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isUndoRedoRef.current = true;
      historyIndexRef.current -= 1;
      const state = historyRef.current[historyIndexRef.current];
      setNodes(state.nodes);
      setEdges(state.edges);
      setTimeout(() => { isUndoRedoRef.current = false; }, 50);
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isUndoRedoRef.current = true;
      historyIndexRef.current += 1;
      const state = historyRef.current[historyIndexRef.current];
      setNodes(state.nodes);
      setEdges(state.edges);
      setTimeout(() => { isUndoRedoRef.current = false; }, 50);
    }
  }, []);

  // Autosave trigger
  useEffect(() => {
    if (!readOnly && onSave) {
      const timer = setTimeout(() => {
        onSave(currentDiagram);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentDiagram, readOnly, onSave]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (readOnly) return;
      setNodes((nds) => {
        const next = applyNodeChanges(changes, nds);
        pushHistory(next, edges);
        return next;
      });
    },
    [readOnly, edges, pushHistory]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (readOnly) return;
      setEdges((eds) => {
        const next = applyEdgeChanges(changes, eds);
        pushHistory(nodes, next);
        return next;
      });
    },
    [readOnly, nodes, pushHistory]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (readOnly || !params.source || !params.target) return;
      const newEdge: Edge<ClassEdgeData> = {
        ...params,
        id: `e_${params.source}_${params.target}_${Date.now()}`,
        type: 'relationEdge',
        data: {
          kind: activeRelationKind,
        },
      } as Edge<ClassEdgeData>;

      setEdges((eds) => {
        const next = addEdge(newEdge, eds);
        pushHistory(nodes, next);
        return next;
      });
    },
    [readOnly, activeRelationKind, nodes, pushHistory]
  );

  const handleAddClass = (kind: ClassKind) => {
    const id = `node_${kind}_${Date.now()}`;
    const newNode: Node<ClassNodeData> = {
      id,
      type: 'classNode',
      position: {
        x: 150 + Math.random() * 150,
        y: 100 + Math.random() * 150,
      },
      data: {
        name: kind === 'interface' ? 'IExampleService' : kind === 'abstract' ? 'AbstractHandler' : kind === 'enum' ? 'StatusType' : 'ExampleClass',
        kind,
        fields: kind === 'enum' ? [] : [{ id: 'f1', visibility: '-', name: 'id', type: 'String' }],
        methods: kind === 'enum' ? [] : [{ id: 'm1', visibility: '+', name: 'execute', type: 'void' }],
        enumValues: kind === 'enum' ? ['VALUE_ONE', 'VALUE_TWO'] : undefined,
      },
    };

    setNodes((nds) => {
      const next = [...nds, newNode];
      pushHistory(next, edges);
      return next;
    });
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
  };

  const handleUpdateNodeData = (id: string, partial: Partial<ClassNodeData>) => {
    setNodes((nds) => {
      const next = nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...partial } } : n));
      pushHistory(next, edges);
      return next;
    });
  };

  const handleUpdateEdgeData = (id: string, partial: Partial<ClassEdgeData>) => {
    setEdges((eds) => {
      const next = eds.map((e) => (e.id === id ? { ...e, data: { ...(e.data || { kind: 'association' }), ...partial } } : e));
      pushHistory(nodes, next);
      return next;
    });
  };

  const handleDeleteNode = (id: string) => {
    setNodes((nds) => {
      const next = nds.filter((n) => n.id !== id);
      const nextEdges = edges.filter((e) => e.source !== id && e.target !== id);
      setEdges(nextEdges);
      pushHistory(next, nextEdges);
      return next;
    });
    setSelectedNodeId(null);
  };

  const handleDeleteEdge = (id: string) => {
    setEdges((eds) => {
      const next = eds.filter((e) => e.id !== id);
      pushHistory(nodes, next);
      return next;
    });
    setSelectedEdgeId(null);
  };

  const handleCopyMermaid = () => {
    const mermaid = diagramToMermaid(currentDiagram);
    navigator.clipboard.writeText(mermaid);
    setCopiedMermaid(true);
    setTimeout(() => setCopiedMermaid(false), 2000);
  };

  const handleExportJson = () => {
    const json = exportDiagramToJson(currentDiagram);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lld-diagram-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const imported = importDiagramFromJson(text);
        const importedNodes: Node<ClassNodeData>[] = Object.values(imported.nodes).map((n) => ({
          id: n.id,
          type: 'classNode',
          position: n.position,
          data: n.data,
        }));
        const importedEdges: Edge<ClassEdgeData>[] = Object.values(imported.edges).map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'relationEdge',
          data: e.data,
        }));
        setNodes(importedNodes);
        setEdges(importedEdges);
        pushHistory(importedNodes, importedEdges);
      } catch (err: any) {
        alert('Invalid JSON file format: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    const n = nodes.find((node) => node.id === selectedNodeId);
    return n ? { id: n.id, data: n.data } : null;
  }, [selectedNodeId, nodes]);

  const selectedEdge = useMemo(() => {
    if (!selectedEdgeId) return null;
    const e = edges.find((edge) => edge.id === selectedEdgeId);
    return e ? { id: e.id, source: e.source, target: e.target, data: e.data } : null;
  }, [selectedEdgeId, edges]);

  return (
    <div className={`relative flex h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden ${className}`}>
      {/* SVG Definitions for UML Arrowheads & Markers */}
      <svg className="absolute w-0 h-0 pointer-events-none">
        <defs>
          {/* Hollow Triangle for Inheritance / Implementation */}
          <marker
            id="marker-hollow-triangle"
            viewBox="0 0 16 16"
            refX="14"
            refY="8"
            markerWidth="12"
            markerHeight="12"
            orient="auto-start-reverse"
          >
            <polygon points="1,1 15,8 1,15" className="fill-white dark:fill-slate-900 stroke-slate-500 dark:stroke-slate-400 stroke-2" />
          </marker>

          {/* Open Arrow for Association / Dependency */}
          <marker
            id="marker-open-arrow"
            viewBox="0 0 16 16"
            refX="14"
            refY="8"
            markerWidth="10"
            markerHeight="10"
            orient="auto-start-reverse"
          >
            <polyline points="2,2 14,8 2,14" className="fill-none stroke-slate-500 dark:stroke-slate-400 stroke-2" />
          </marker>

          {/* Filled Diamond for Composition */}
          <marker
            id="marker-filled-diamond"
            viewBox="0 0 16 16"
            refX="2"
            refY="8"
            markerWidth="14"
            markerHeight="14"
            orient="auto-start-reverse"
          >
            <polygon points="2,8 8,2 14,8 8,14" className="fill-slate-700 dark:fill-slate-300 stroke-slate-700 dark:stroke-slate-300 stroke-1" />
          </marker>

          {/* Hollow Diamond for Aggregation */}
          <marker
            id="marker-hollow-diamond"
            viewBox="0 0 16 16"
            refX="2"
            refY="8"
            markerWidth="14"
            markerHeight="14"
            orient="auto-start-reverse"
          >
            <polygon points="2,8 8,2 14,8 8,14" className="fill-white dark:fill-slate-900 stroke-slate-500 dark:stroke-slate-400 stroke-2" />
          </marker>
        </defs>
      </svg>

      {/* Main React Flow Canvas */}
      <div className="flex-1 relative h-full w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onInit={setRfInstance}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          onNodeClick={(_, node) => {
            if (readOnly) return;
            setSelectedNodeId(node.id);
            setSelectedEdgeId(null);
          }}
          onEdgeClick={(_, edge) => {
            if (readOnly) return;
            setSelectedEdgeId(edge.id);
            setSelectedNodeId(null);
          }}
          onPaneClick={() => {
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
          }}
        >
          <Background gap={15} size={1} />
          <Controls position="bottom-right" />
          <MiniMap
            nodeStrokeWidth={3}
            className="!bottom-14 !right-4 !bg-white/80 dark:!bg-slate-900/80 !border-slate-200 dark:!border-slate-800"
          />
        </ReactFlow>

        {/* Top Control Toolbar (When Editable) */}
        {!readOnly && (
          <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-md backdrop-blur">
            {/* Add Node Buttons */}
            <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-1.5">
              <button
                onClick={() => handleAddClass('class')}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 transition"
                title="Add UML Class"
              >
                <Plus className="w-3.5 h-3.5" /> Class
              </button>
              <button
                onClick={() => handleAddClass('interface')}
                className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition"
                title="Add Interface"
              >
                <Plus className="w-3.5 h-3.5" /> Interface
              </button>
              <button
                onClick={() => handleAddClass('abstract')}
                className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition"
                title="Add Abstract Class"
              >
                <Plus className="w-3.5 h-3.5" /> Abstract
              </button>
              <button
                onClick={() => handleAddClass('enum')}
                className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition"
                title="Add Enum"
              >
                <Plus className="w-3.5 h-3.5" /> Enum
              </button>
            </div>

            {/* Connection Mode Selector */}
            <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-1.5">
              <span className="text-[11px] font-semibold text-slate-500 px-1">Connect:</span>
              <select
                value={activeRelationKind}
                onChange={(e) => setActiveRelationKind(e.target.value as RelationKind)}
                className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 font-medium"
              >
                <option value="association">Association (–&gt;)</option>
                <option value="inheritance">Inheritance (–▷)</option>
                <option value="implementation">Implementation (- -▷)</option>
                <option value="aggregation">Aggregation (◇–)</option>
                <option value="composition">Composition (◆–)</option>
                <option value="dependency">Dependency (- - &gt;)</option>
              </select>
            </div>

            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-800 pr-1.5">
              <button
                onClick={handleUndo}
                className="p-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                className="p-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            {/* Export / Import & Mermaid */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyMermaid}
                className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Copy Mermaid classDiagram markup"
              >
                {copiedMermaid ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <FileCode className="w-3.5 h-3.5" />}
                {copiedMermaid ? 'Copied!' : 'Mermaid'}
              </button>
              <button
                onClick={handleExportJson}
                className="p-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Export JSON"
              >
                <Download className="w-4 h-4" />
              </button>
              <label
                className="p-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Import JSON"
              >
                <Upload className="w-4 h-4" />
                <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              </label>
            </div>
          </div>
        )}

        {/* Read-Only Banner / Mermaid quick copy in readOnly mode */}
        {readOnly && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            <button
              onClick={handleCopyMermaid}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm backdrop-blur hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              {copiedMermaid ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedMermaid ? 'Copied Mermaid' : 'Copy Mermaid'}
            </button>
          </div>
        )}

        {/* Validation Warnings Panel (Collapsible Pill at bottom-left) */}
        {warnings.length > 0 && !readOnly && (
          <div className="absolute bottom-3 left-3 z-10 max-w-sm rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800/80 p-2.5 shadow-md">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{warnings.length} Design Warning{warnings.length > 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-1 text-[11px] text-amber-900 dark:text-amber-200 max-h-24 overflow-y-auto">
              {warnings.map((w) => (
                <div key={w.id} className="leading-snug">
                  • {w.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right-Side Inspector Panel (when a Node or Edge is selected) */}
      {!readOnly && (selectedNode || selectedEdge) && (
        <ClassDiagramInspector
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          onUpdateNodeData={handleUpdateNodeData}
          onUpdateEdgeData={handleUpdateEdgeData}
          onDeleteNode={handleDeleteNode}
          onDeleteEdge={handleDeleteEdge}
          onClose={() => {
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
          }}
        />
      )}
    </div>
  );
};

export const ClassDiagramEditor: React.FC<ClassDiagramEditorProps> = (props) => (
  <ReactFlowProvider>
    <ClassDiagramEditorInternal {...props} />
  </ReactFlowProvider>
);
