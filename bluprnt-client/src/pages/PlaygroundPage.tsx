import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
  NodeChange,
  EdgeChange,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  Play,
  RotateCcw,
  Download,
  Upload,
  Save,
  Trash2,
  Layers,
  Sparkles,
  HelpCircle,
  FileDown,
  Share2,
  Radio,
  Users,
  FolderOpen,
  ShieldAlert,
  ChevronDown,
  Activity,
  Sliders,
  PanelLeft,
  PanelRight,
  Trophy,
  Plus,
  FilePlus,
} from 'lucide-react';
import * as Y from 'yjs';
import { SystemCustomNode, SystemNodeData } from '../components/playground/SystemCustomNode';
import { AnimatedEdge } from '../components/playground/AnimatedEdge';
import { NodePalette } from '../components/playground/NodePalette';
import { SimulationResultsPanel } from '../components/playground/SimulationResultsPanel';
import { PlaygroundRightSidebar } from '../components/playground/PlaygroundRightSidebar';
import { SavedDesignsModal } from '../components/playground/SavedDesignsModal';
import { PLAYGROUND_TEMPLATES, PlaygroundTemplate } from '../components/playground/playgroundTemplates';
import { NodeDefinition, NODE_REGISTRY } from '../core/registry/nodeRegistry';
import { evaluateBottlenecks, TopologySimulationResult } from '../core/algorithms/bottleneck';
import { computeCriticalPathLatency, DagLatencyResult } from '../core/algorithms/dagLatency';
import { useCollabSession, CollabRole } from '../core/collab/useCollabSession';
import { CollabHeader } from '../components/playground/CollabHeader';
import { CollabCursors } from '../components/playground/CollabCursors';
import { ShareRoomModal } from '../components/playground/ShareRoomModal';
import { RoomChatDrawer } from '../components/playground/RoomChatDrawer';
import { VersionHistoryModal, RoomVersionSnapshot } from '../components/playground/VersionHistoryModal';
import { ChaosStudio, ChaosState } from '../components/playground/ChaosStudio';
import {
  ArchitectureChallengesModal,
  ArchitectureChallenge,
} from '../components/playground/ArchitectureChallengesModal';
import { auditArchitecture } from '../core/algorithms/architectureLinter';
import { estimateArchitectureCost } from '../core/algorithms/costEstimator';
import { MACHINE_TIERS, MachineTierId } from '../core/types/machineTiers';
import { InterServiceProtocol } from '../core/types/protocols';
import { db } from '../db/database';
import { SavedTopologyDesign } from '../types/storage';

import { getApiBaseUrl } from '../config/network';
import { serializeTopology, deserializeTopology } from '../core/algorithms/topologySerializer';
import { useThemeStore } from '../stores/useThemeStore';

const nodeTypes = {
  systemNode: SystemCustomNode,
};

const edgeTypes = {
  animatedEdge: AnimatedEdge,
  default: AnimatedEdge,
};

const API_BASE = getApiBaseUrl();

export const PlaygroundPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const roomIdFromUrl = searchParams.get('room');
  const inviteTokenFromUrl = searchParams.get('token') || '';

  // Check if a shared architecture snapshot is present in URL hash or search params
  const sharedSnapshot = useMemo(() => {
    try {
      if (typeof window === 'undefined') return null;
      let raw = '';
      if (window.location.hash.startsWith('#d=')) {
        raw = window.location.hash.slice(3);
      } else if (window.location.hash.startsWith('#design=')) {
        raw = window.location.hash.slice(8);
      } else if (searchParams.get('d')) {
        raw = searchParams.get('d') || '';
      }
      if (raw) {
        return deserializeTopology(raw);
      }
    } catch (e) {
      console.warn('Failed to parse URL topology snapshot:', e);
    }
    return null;
  }, [searchParams]);

  const { theme } = useThemeStore();
  const [sharedBannerVisible, setSharedBannerVisible] = useState(Boolean(sharedSnapshot));
  const [activeRoomId, setActiveRoomId] = useState<string | null>(roomIdFromUrl);
  const [inviteToken, setInviteToken] = useState<string>(inviteTokenFromUrl);
  const [userEmail] = useState<string>(() => localStorage.getItem('bluprnt_user_email') || 'engineer@example.com');
  const isRoomCreatorRef = useRef<boolean>(false);
  const seededRoomRef = useRef<string | null>(null);

  // Sidebars and Modals state
  const [isLeftPaletteOpen, setIsLeftPaletteOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [savedDesignsModalOpen, setSavedDesignsModalOpen] = useState(false);
  const [showResultsPanel, setShowResultsPanel] = useState(false);

  // Active selected node for Right Sidebar Inspector
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [roomMembers, setRoomMembers] = useState<Record<string, { userId: string; name: string; role: CollabRole }>>({});
  const [snapshots, setSnapshots] = useState<RoomVersionSnapshot[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('bluprnt_current_playground');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isScratch || parsed.templateId === 'blank') return 'blank';
        if (parsed.templateId && PLAYGROUND_TEMPLATES[parsed.templateId]) return parsed.templateId;
      }
    } catch (e) {}
    return 'url-shortener';
  });

  // React Flow instance for coordinates and drag-and-drop
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local non-collab state (Restores snapshot from URL, or auto-saved design from localStorage)
  const [localNodes, setLocalNodes] = useState<Node<SystemNodeData>[]>(() => {
    if (sharedSnapshot && sharedSnapshot.nodes.length > 0) {
      return sharedSnapshot.nodes;
    }
    try {
      const saved = localStorage.getItem('bluprnt_current_playground');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isScratch || parsed.templateId === 'blank') {
          return [];
        }
        if (parsed.nodes && parsed.nodes.length > 0) {
          // If cached nodes have old overlapping positions (deltaX < 400), use updated spacious template
          const isCramped =
            parsed.nodes.length >= 2 &&
            Math.abs(parsed.nodes[1].position.x - parsed.nodes[0].position.x) < 400;
          if (!isCramped) return parsed.nodes;
        }
      }
    } catch (e) {}
    return PLAYGROUND_TEMPLATES['url-shortener'].nodes;
  });

  const [localEdges, setLocalEdges] = useState<Edge[]>(() => {
    if (sharedSnapshot && sharedSnapshot.edges.length > 0) {
      return sharedSnapshot.edges;
    }
    try {
      const saved = localStorage.getItem('bluprnt_current_playground');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isScratch || parsed.templateId === 'blank') {
          return [];
        }
        if (parsed.edges) return parsed.edges;
      }
    } catch (e) {}
    return PLAYGROUND_TEMPLATES['url-shortener'].edges;
  });

  const [targetRps, setTargetRps] = useState<number>(() => {
    if (sharedSnapshot && sharedSnapshot.targetRps) {
      return sharedSnapshot.targetRps;
    }
    try {
      const saved = localStorage.getItem('bluprnt_current_playground');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.targetRps) return parsed.targetRps;
      }
    } catch (e) {}
    return 30000;
  });

  const [localSimulationResult, setLocalSimulationResult] = useState<TopologySimulationResult | null>(null);
  const [localDagResult, setLocalDagResult] = useState<DagLatencyResult | null>(null);

  // Auto-save local playground to localStorage
  useEffect(() => {
    if (!activeRoomId) {
      try {
        localStorage.setItem(
          'bluprnt_current_playground',
          JSON.stringify({
            nodes: localNodes,
            edges: localEdges,
            targetRps,
            isScratch: localNodes.length === 0,
            templateId: selectedTemplateId,
          })
        );
      } catch (e) {}
    }
  }, [localNodes, localEdges, targetRps, activeRoomId, selectedTemplateId]);

  // Collab Session Hook
  const {
    doc,
    status: collabStatus,
    synced: collabSynced,
    role: userRole,
    setRole,
    peers,
    remoteSelections,
    syncedSimulation,
    comments,
    chatMessages,
    transact,
    emitCursor,
    emitSelectedNode,
    triggerSharedSimulation,
    addComment,
    resolveComment,
    sendChatMessage,
    undo,
    redo,
    userName,
    setUserName,
    localUserName,
    localUserColor,
  } = useCollabSession(activeRoomId, userEmail);

  // Sync Y.Doc <-> React Flow state when in collaboration mode
  const [collabNodes, setCollabNodes] = useState<Node<SystemNodeData>[]>([]);
  const [collabEdges, setCollabEdges] = useState<Edge[]>([]);

  useEffect(() => {
    if (!activeRoomId) return;

    const nodesMap = doc.getMap('nodes');
    const edgesMap = doc.getMap('edges');
    const settingsMap = doc.getMap('settings');

    const syncFromYjs = () => {
      const nds: Node<SystemNodeData>[] = [];
      nodesMap.forEach((val: any, id: string) => {
        nds.push({
          id,
          type: 'systemNode',
          position: { x: val.x, y: val.y },
          data: {
            label: val.label,
            category: val.category,
            icon: val.icon,
            replicas: val.replicas,
            capacityQps: val.capacityQps,
            latencyMs: val.latencyMs,
            machineTier: val.machineTier,
            isDead: val.isDead,
          },
        });
      });
      setCollabNodes(nds);

      const eds: Edge[] = [];
      edgesMap.forEach((val: any, id: string) => {
        eds.push({
          id,
          source: val.source,
          target: val.target,
          sourceHandle: val.sourceHandle,
          targetHandle: val.targetHandle,
          animated: true,
          data: {
            protocol: val.protocol || 'rest',
          },
        });
      });
      setCollabEdges(eds);

      const syncRps = settingsMap.get('targetRps') as number;
      if (syncRps && syncRps !== targetRps) {
        setTargetRps(syncRps);
      }
    };

    nodesMap.observe(syncFromYjs);
    edgesMap.observe(syncFromYjs);
    settingsMap.observe(syncFromYjs);

    // Initial sync / seeding check
    const performSeedIfNeeded = () => {
      if (seededRoomRef.current === activeRoomId) return;

      if (nodesMap.size === 0) {
        // Seed the shared room with the creator's active canvas topology (or shared snapshot)
        let seedNodes = localNodes;
        let seedEdges = localEdges;
        let seedRps = targetRps || 30000;

        if (sharedSnapshot && sharedSnapshot.nodes.length > 0) {
          seedNodes = sharedSnapshot.nodes;
          seedEdges = sharedSnapshot.edges;
          seedRps = sharedSnapshot.targetRps || seedRps;
        } else if (seedNodes.length === 0 && selectedTemplateId !== 'blank') {
          seedNodes = PLAYGROUND_TEMPLATES['url-shortener'].nodes;
          seedEdges = PLAYGROUND_TEMPLATES['url-shortener'].edges;
        }

        transact(() => {
          seedNodes.forEach((n) => {
            nodesMap.set(n.id, {
              id: n.id,
              label: n.data.label,
              category: n.data.category,
              icon: n.data.icon,
              replicas: n.data.replicas,
              capacityQps: n.data.capacityQps,
              latencyMs: n.data.latencyMs,
              machineTier: n.data.machineTier,
              x: n.position.x,
              y: n.position.y,
            });
          });
          seedEdges.forEach((e) => {
            edgesMap.set(e.id, {
              id: e.id,
              source: e.source,
              target: e.target,
              sourceHandle: e.sourceHandle,
              targetHandle: e.targetHandle,
            });
          });
          settingsMap.set('targetRps', seedRps);
        });
      }
      seededRoomRef.current = activeRoomId;
      syncFromYjs();
    };

    // If this client initiated the room or has no room URL param, seed immediately from current canvas
    if (isRoomCreatorRef.current || !roomIdFromUrl) {
      performSeedIfNeeded();
    } else if (collabSynced) {
      // If joining an existing room via URL, wait until synced from server/peers to avoid clobbering
      if (nodesMap.size > 0) {
        seededRoomRef.current = activeRoomId;
        syncFromYjs();
      } else {
        performSeedIfNeeded();
      }
    } else {
      syncFromYjs();
    }

    return () => {
      nodesMap.unobserve(syncFromYjs);
      edgesMap.unobserve(syncFromYjs);
      settingsMap.unobserve(syncFromYjs);
    };
  }, [activeRoomId, doc, transact, collabSynced]);

  // Fetch room metadata & member roles from server if in collab mode
  const refreshRoomMeta = useCallback(async () => {
    if (!activeRoomId || !API_BASE || activeRoomId.endsWith('-local') || activeRoomId.endsWith('-studio') || activeRoomId.startsWith('local-')) return;
    try {
      const res = await fetch(`${API_BASE}/api/collab/room/${activeRoomId}/info?email=${encodeURIComponent(userEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setRole(data.role || data.userRole || 'editor');
        setRoomMembers(data.members || {});
        setSnapshots(data.snapshots || []);
      }
    } catch (e) {
      console.warn('Backend server not connected or offline; running local collab mode.');
    }
  }, [activeRoomId, userEmail, setRole]);

  useEffect(() => {
    refreshRoomMeta();
  }, [refreshRoomMeta]);

  // Active nodes & edges (collab or local)
  const isCollab = Boolean(activeRoomId);
  const currentNodes = isCollab ? collabNodes : localNodes;
  const currentEdges = isCollab ? collabEdges : localEdges;

  // Granular Node Mutation Handlers (works in both Local & Collab modes)
  const handleUpdateReplicas = useCallback(
    (nodeId: string, delta: number, absolute?: number) => {
      if (isCollab) {
        if (userRole === 'viewer') return;
        const nodesMap = doc.getMap('nodes');
        const existing: any = nodesMap.get(nodeId);
        if (existing) {
          const nextRep = absolute !== undefined ? absolute : Math.max(1, (existing.replicas || 1) + delta);
          transact(() => {
            nodesMap.set(nodeId, { ...existing, replicas: nextRep });
          });
        }
      } else {
        setLocalNodes((nds) =>
          nds.map((node) => {
            if (node.id === nodeId) {
              const nextRep = absolute !== undefined ? absolute : Math.max(1, (node.data.replicas || 1) + delta);
              return { ...node, data: { ...node.data, replicas: nextRep } };
            }
            return node;
          })
        );
      }
    },
    [isCollab, doc, transact, userRole]
  );

  const handleUpdateCapacity = useCallback(
    (nodeId: string, capacity: number) => {
      if (isCollab) {
        if (userRole === 'viewer') return;
        const nodesMap = doc.getMap('nodes');
        const existing: any = nodesMap.get(nodeId);
        if (existing) {
          transact(() => {
            nodesMap.set(nodeId, { ...existing, capacityQps: capacity });
          });
        }
      } else {
        setLocalNodes((nds) =>
          nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, capacityQps: capacity } } : node))
        );
      }
    },
    [isCollab, doc, transact, userRole]
  );

  const handleUpdateLatency = useCallback(
    (nodeId: string, latency: number) => {
      if (isCollab) {
        if (userRole === 'viewer') return;
        const nodesMap = doc.getMap('nodes');
        const existing: any = nodesMap.get(nodeId);
        if (existing) {
          transact(() => {
            nodesMap.set(nodeId, { ...existing, latencyMs: latency });
          });
        }
      } else {
        setLocalNodes((nds) =>
          nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, latencyMs: latency } } : node))
        );
      }
    },
    [isCollab, doc, transact, userRole]
  );

  const handleUpdateLabel = useCallback(
    (nodeId: string, label: string) => {
      if (isCollab) {
        if (userRole === 'viewer') return;
        const nodesMap = doc.getMap('nodes');
        const existing: any = nodesMap.get(nodeId);
        if (existing) {
          transact(() => {
            nodesMap.set(nodeId, { ...existing, label });
          });
        }
      } else {
        setLocalNodes((nds) =>
          nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, label } } : node))
        );
      }
    },
    [isCollab, doc, transact, userRole]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (isCollab) {
        if (userRole === 'viewer') return;
        const nodesMap = doc.getMap('nodes');
        const edgesMap = doc.getMap('edges');
        transact(() => {
          nodesMap.delete(nodeId);
          edgesMap.forEach((val: any, k: string) => {
            if (val.source === nodeId || val.target === nodeId) {
              edgesMap.delete(k);
            }
          });
        });
      } else {
        setLocalNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setLocalEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      }
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }
    },
    [isCollab, doc, transact, userRole, selectedNodeId]
  );

  const handleUpdateMachineTier = useCallback(
    (nodeId: string, tier: MachineTierId) => {
      const tierDef = MACHINE_TIERS[tier];
      if (!tierDef) return;
      if (isCollab) {
        if (userRole === 'viewer') return;
        const nodesMap = doc.getMap('nodes');
        const existing: any = nodesMap.get(nodeId);
        if (existing) {
          transact(() => {
            nodesMap.set(nodeId, {
              ...existing,
              machineTier: tier,
              capacityQps: tierDef.capacityQps,
              latencyMs: Math.max(1, Math.round((existing.latencyMs || 10) * tierDef.latencyMultiplier)),
            });
          });
        }
      } else {
        setLocalNodes((nds) =>
          nds.map((node) => {
            if (node.id === nodeId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  machineTier: tier,
                  capacityQps: tierDef.capacityQps,
                  latencyMs: Math.max(1, Math.round((node.data.latencyMs || 10) * tierDef.latencyMultiplier)),
                },
              };
            }
            return node;
          })
        );
      }
    },
    [isCollab, doc, transact, userRole]
  );

  // Chaos Studio State & Handlers
  const [chaosState, setChaosState] = useState<ChaosState>({
    isSpikeActive: false,
    spikeFactor: 1,
    deadNodeIds: [],
    severedEdgeIds: [],
    jitterMs: 0,
  });

  const [isChallengesOpen, setIsChallengesOpen] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState<ArchitectureChallenge | null>(null);
  const [severedEdgesBackup, setSeveredEdgesBackup] = useState<Edge[]>([]);

  const handleTriggerSpike = useCallback(() => {
    setChaosState((prev) => {
      const nextSpike = !prev.isSpikeActive;
      const factor = nextSpike ? 3 : 1;
      setTargetRps((curr) => (nextSpike ? curr * 3 : Math.max(1000, Math.round(curr / 3))));
      return { ...prev, isSpikeActive: nextSpike, spikeFactor: factor };
    });
  }, []);

  const handleKillRandomNode = useCallback(() => {
    const aliveNodes = currentNodes.filter((n) => !chaosState.deadNodeIds.includes(n.id));
    if (aliveNodes.length === 0) return;
    const target = aliveNodes[Math.floor(Math.random() * aliveNodes.length)];
    setChaosState((prev) => ({
      ...prev,
      deadNodeIds: [...prev.deadNodeIds, target.id],
    }));
  }, [currentNodes, chaosState.deadNodeIds]);

  const handleSeverRandomEdge = useCallback(() => {
    if (currentEdges.length === 0) return;
    const edgeToCut = currentEdges[Math.floor(Math.random() * currentEdges.length)];
    setSeveredEdgesBackup((prev) => [...prev, edgeToCut]);
    setChaosState((prev) => ({
      ...prev,
      severedEdgeIds: [...prev.severedEdgeIds, edgeToCut.id],
    }));
    if (isCollab) {
      if (userRole === 'viewer') return;
      const edgesMap = doc.getMap('edges');
      transact(() => edgesMap.delete(edgeToCut.id));
    } else {
      setLocalEdges((eds) => eds.filter((e) => e.id !== edgeToCut.id));
    }
  }, [currentEdges, isCollab, userRole, doc, transact]);

  const handleToggleJitter = useCallback(() => {
    setChaosState((prev) => ({
      ...prev,
      jitterMs: prev.jitterMs > 0 ? 0 : 250,
    }));
  }, []);

  const handleHealAll = useCallback(() => {
    if (chaosState.isSpikeActive) {
      setTargetRps((curr) => Math.max(1000, Math.round(curr / 3)));
    }
    if (severedEdgesBackup.length > 0) {
      if (isCollab) {
        const edgesMap = doc.getMap('edges');
        transact(() => {
          severedEdgesBackup.forEach((e) =>
            edgesMap.set(e.id, {
              id: e.id,
              source: e.source,
              target: e.target,
              sourceHandle: e.sourceHandle,
              targetHandle: e.targetHandle,
            })
          );
        });
      } else {
        setLocalEdges((eds) => {
          const ids = new Set(eds.map((e) => e.id));
          const toAdd = severedEdgesBackup.filter((e) => !ids.has(e.id));
          return [...eds, ...toAdd];
        });
      }
      setSeveredEdgesBackup([]);
    }
    setChaosState({
      isSpikeActive: false,
      spikeFactor: 1,
      deadNodeIds: [],
      severedEdgeIds: [],
      jitterMs: 0,
    });
  }, [chaosState.isSpikeActive, severedEdgesBackup, isCollab, doc, transact]);

  // Decorate nodes with remote selection indicators and simulation metrics
  const activeSimulation = isCollab ? syncedSimulation?.bResult : localSimulationResult;
  const activeDagResult = isCollab ? syncedSimulation?.dResult : localDagResult;

  const processedNodes = useMemo(() => {
    return currentNodes.map((n) => {
      const metric = activeSimulation?.nodeMetrics[n.id];
      const remoteSelection = remoteSelections[n.id];
      const isDead = chaosState.deadNodeIds.includes(n.id);
      return {
        ...n,
        data: {
          ...n.data,
          isDead,
          simulationMetric: metric,
          remoteSelectedBy: remoteSelection,
          onUpdateReplicas: (delta: number) => handleUpdateReplicas(n.id, delta),
          onUpdateCapacity: (cap: number) => handleUpdateCapacity(n.id, cap),
          onUpdateLatency: (lat: number) => handleUpdateLatency(n.id, lat),
          onUpdateMachineTier: (tier: MachineTierId) => handleUpdateMachineTier(n.id, tier),
          onUpdateLabel: (lbl: string) => handleUpdateLabel(n.id, lbl),
          onDeleteNode: () => handleDeleteNode(n.id),
        },
      };
    });
  }, [
    currentNodes,
    activeSimulation,
    remoteSelections,
    chaosState.deadNodeIds,
    handleUpdateReplicas,
    handleUpdateCapacity,
    handleUpdateLatency,
    handleUpdateMachineTier,
    handleUpdateLabel,
    handleDeleteNode,
  ]);

  // Selected node object for Right Sidebar Inspector
  const selectedNodeObject = useMemo(() => {
    return processedNodes.find((n) => n.id === selectedNodeId) || null;
  }, [processedNodes, selectedNodeId]);

  // Automated Reliability & SPOF Audit
  const auditReport = useMemo(() => {
    return auditArchitecture(processedNodes, currentEdges, activeSimulation);
  }, [processedNodes, currentEdges, activeSimulation]);

  // Cloud Infrastructure Cost Estimation
  const costEstimate = useMemo(() => {
    return estimateArchitectureCost(processedNodes, targetRps);
  }, [processedNodes, targetRps]);

  // Edge Deletion & Disconnection Handlers
  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      if (isCollab) {
        if (userRole === 'viewer') return;
        const edgesMap = doc.getMap('edges');
        transact(() => edgesMap.delete(edgeId));
      } else {
        setLocalEdges((eds) => eds.filter((e) => e.id !== edgeId));
      }
    },
    [isCollab, doc, transact, userRole]
  );

  const handleDisconnectNodes = useCallback(
    (sourceId: string, targetId: string) => {
      if (isCollab) {
        if (userRole === 'viewer') return;
        const edgesMap = doc.getMap('edges');
        transact(() => {
          edgesMap.forEach((val: any, k: string) => {
            if (val.source === sourceId && val.target === targetId) {
              edgesMap.delete(k);
            }
          });
        });
      } else {
        setLocalEdges((eds) => eds.filter((e) => !(e.source === sourceId && e.target === targetId)));
      }
    },
    [isCollab, doc, transact, userRole]
  );

  // Handle update edge protocol
  const handleUpdateEdgeProtocol = useCallback(
    (edgeId: string, protocol: InterServiceProtocol) => {
      if (isCollab) {
        if (userRole === 'viewer') return;
        const edgesMap = doc.getMap('edges');
        const ex: any = edgesMap.get(edgeId);
        if (ex) {
          transact(() => {
            edgesMap.set(edgeId, { ...ex, protocol });
          });
        }
      } else {
        setLocalEdges((eds) =>
          eds.map((e) =>
            e.id === edgeId
              ? { ...e, data: { ...e.data, protocol } }
              : e
          )
        );
      }
    },
    [isCollab, doc, transact, userRole]
  );

  // Dynamically animated edges with discrete-event packet telemetry, protocols and delete actions
  const processedEdges = useMemo(() => {
    return currentEdges.map((e) => {
      const metric = activeSimulation?.edgeMetrics?.[e.id];
      const protocol: InterServiceProtocol = (e.data as any)?.protocol || 'rest';
      return {
        ...e,
        type: 'animatedEdge',
        data: {
          trafficRps: metric?.trafficRps ?? (activeSimulation ? 1000 : 0),
          latencyMs: metric?.latencyMs ?? 0,
          status: metric?.status ?? 'normal',
          protocol,
          onDeleteEdge: () => handleDeleteEdge(e.id),
          onUpdateProtocol: (p: InterServiceProtocol) => handleUpdateEdgeProtocol(e.id, p),
        },
      };
    });
  }, [currentEdges, activeSimulation, handleDeleteEdge, handleUpdateEdgeProtocol]);

  // Node position & change events
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (isCollab) {
        setCollabNodes((nds) => applyNodeChanges(changes, nds));
        if (userRole === 'viewer') return;
        const nodesMap = doc.getMap('nodes');
        transact(() => {
          changes.forEach((c) => {
            if (c.type === 'position' && c.position) {
              const ex: any = nodesMap.get(c.id);
              if (ex) {
                nodesMap.set(c.id, { ...ex, x: c.position.x, y: c.position.y });
              }
            } else if (c.type === 'remove') {
              nodesMap.delete(c.id);
            }
          });
        });
      } else {
        setLocalNodes((nds) => applyNodeChanges(changes, nds));
      }
    },
    [isCollab, doc, transact, userRole]
  );

  // Edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (isCollab) {
        setCollabEdges((eds) => applyEdgeChanges(changes, eds));
        if (userRole === 'viewer') return;
        const edgesMap = doc.getMap('edges');
        transact(() => {
          changes.forEach((c) => {
            if (c.type === 'remove') {
              edgesMap.delete(c.id);
            }
          });
        });
      } else {
        setLocalEdges((eds) => applyEdgeChanges(changes, eds));
      }
    },
    [isCollab, doc, transact, userRole]
  );

  // Connect edge
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source === connection.target) return;
      if (isCollab) {
        if (userRole === 'viewer') return;
        const edgesMap = doc.getMap('edges');
        const edgeId = `e-${connection.source}-${connection.target}-${Date.now()}`;
        transact(() => {
          edgesMap.set(edgeId, {
            id: edgeId,
            source: connection.source,
            target: connection.target,
            sourceHandle: connection.sourceHandle,
            targetHandle: connection.targetHandle,
            protocol: 'rest',
          });
        });
      } else {
        setLocalEdges((eds) =>
          addEdge({ ...connection, animated: true, data: { protocol: 'rest' } }, eds)
        );
      }
    },
    [isCollab, doc, transact, userRole]
  );

  // Add node from palette with positioning support
  const handleAddNodeWithPosition = useCallback(
    (def: NodeDefinition, position?: { x: number; y: number }) => {
      const id = `${def.type}-${Date.now().toString().slice(-4)}`;
      const x = position ? position.x : 200 + Math.random() * 200;
      const y = position ? position.y : 150 + Math.random() * 150;

      if (isCollab) {
        if (userRole === 'viewer') {
          alert('You have Viewer permissions in this room. Edits are disabled.');
          return;
        }
        const nodesMap = doc.getMap('nodes');
        transact(() => {
          nodesMap.set(id, {
            id,
            label: def.label,
            category: def.category,
            icon: def.icon,
            replicas: def.defaultReplicas,
            capacityQps: def.defaultCapacityQps,
            latencyMs: def.defaultLatencyMs,
            x,
            y,
          });
        });
      } else {
        const newNode: Node<SystemNodeData> = {
          id,
          type: 'systemNode',
          position: { x, y },
          data: {
            label: def.label,
            category: def.category,
            icon: def.icon,
            replicas: def.defaultReplicas,
            capacityQps: def.defaultCapacityQps,
            latencyMs: def.defaultLatencyMs,
          },
        };
        setLocalNodes((nds) => [...nds, newNode]);
      }
    },
    [isCollab, doc, transact, userRole]
  );

  // HTML5 Drag-and-Drop Handlers
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const rawData = event.dataTransfer.getData('application/reactflow');
      if (!rawData || !reactFlowInstance) return;

      try {
        const def = JSON.parse(rawData);
        const position = reactFlowInstance.screenToFlowPosition
          ? reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
          : reactFlowInstance.project({ x: event.clientX, y: event.clientY });
        handleAddNodeWithPosition(def, position);
      } catch (e) {
        console.error('Failed to parse dropped node', e);
      }
    },
    [reactFlowInstance, handleAddNodeWithPosition]
  );

  // Continuous background simulation loop (updates node health rings & utilization dynamically)
  useEffect(() => {
    const algoNodes = currentNodes.map((n) => {
      const isDead = chaosState.deadNodeIds.includes(n.id);
      return {
        id: n.id,
        type: n.type || 'systemNode',
        label: n.data.label,
        replicas: n.data.replicas || 1,
        capacityQps: isDead ? 0 : (n.data.capacityQps || 5000),
        latencyMs: (n.data.latencyMs || 10) + chaosState.jitterMs,
      };
    });
    const algoEdges = currentEdges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
    if (algoNodes.length > 0) {
      setLocalSimulationResult(evaluateBottlenecks(algoNodes, algoEdges, targetRps));
      setLocalDagResult(computeCriticalPathLatency(algoNodes, algoEdges));
    }
  }, [currentNodes, currentEdges, targetRps, chaosState.deadNodeIds, chaosState.jitterMs]);

  // Run simulation trigger (opens telemetry panel)
  const handleRunSimulation = () => {
    setShowResultsPanel(true);
    const algoNodes = currentNodes.map((n) => {
      const isDead = chaosState.deadNodeIds.includes(n.id);
      return {
        id: n.id,
        type: n.type || 'systemNode',
        label: n.data.label,
        replicas: n.data.replicas || 1,
        capacityQps: isDead ? 0 : (n.data.capacityQps || 5000),
        latencyMs: (n.data.latencyMs || 10) + chaosState.jitterMs,
      };
    });
    const algoEdges = currentEdges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
    setLocalSimulationResult(evaluateBottlenecks(algoNodes, algoEdges, targetRps));
    setLocalDagResult(computeCriticalPathLatency(algoNodes, algoEdges));
    if (isCollab && userRole !== 'viewer') {
      triggerSharedSimulation(targetRps);
    }
  };

  // Redraw from scratch / clear canvas completely
  const handleRedrawFromScratch = useCallback(
    (promptUser = true) => {
      if (
        promptUser &&
        !window.confirm(
          'Start with a blank canvas to redraw your architecture from scratch? All existing nodes and connections will be cleared.'
        )
      ) {
        return;
      }
      setSelectedTemplateId('blank');
      if (isCollab) {
        if (userRole === 'viewer') {
          alert('You have Viewer permissions in this room. Edits are disabled.');
          return;
        }
        const nodesMap = doc.getMap('nodes');
        const edgesMap = doc.getMap('edges');
        transact(() => {
          nodesMap.clear();
          edgesMap.clear();
        });
      } else {
        setLocalNodes([]);
        setLocalEdges([]);
      }
      setSelectedNodeId(null);
      setChaosState({
        isSpikeActive: false,
        spikeFactor: 1,
        deadNodeIds: [],
        severedEdgeIds: [],
        jitterMs: 0,
      });
      setLocalSimulationResult(null);
      setLocalDagResult(null);
      try {
        localStorage.setItem(
          'bluprnt_current_playground',
          JSON.stringify({ nodes: [], edges: [], targetRps, isScratch: true, templateId: 'blank' })
        );
      } catch (e) {}
    },
    [isCollab, userRole, doc, transact, targetRps]
  );

  // Switch pre-built architecture template
  const handleLoadTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    if (tplId === 'blank') {
      handleRedrawFromScratch(false);
      return;
    }
    const tpl = PLAYGROUND_TEMPLATES[tplId];
    if (!tpl) return;

    if (isCollab) {
      if (userRole === 'viewer') return;
      const nodesMap = doc.getMap('nodes');
      const edgesMap = doc.getMap('edges');
      transact(() => {
        nodesMap.clear();
        edgesMap.clear();
        tpl.nodes.forEach((n) => {
          nodesMap.set(n.id, {
            id: n.id,
            label: n.data.label,
            category: n.data.category,
            icon: n.data.icon,
            replicas: n.data.replicas,
            capacityQps: n.data.capacityQps,
            latencyMs: n.data.latencyMs,
            x: n.position.x,
            y: n.position.y,
          });
        });
        tpl.edges.forEach((e) => {
          edgesMap.set(e.id, { id: e.id, source: e.source, target: e.target });
        });
      });
    } else {
      setLocalNodes(tpl.nodes);
      setLocalEdges(tpl.edges);
      setSelectedNodeId(null);
    }
  };

  // Save current design to Dexie IndexedDB
  const handleSaveDesignToDexie = async () => {
    const name = window.prompt('Enter a name for this architecture design:', `System Design - ${new Date().toLocaleDateString()}`);
    if (!name || !name.trim()) return;

    const newDesign: SavedTopologyDesign = {
      id: `design-${Date.now().toString(36)}`,
      name: name.trim(),
      nodes: currentNodes,
      edges: currentEdges,
      targetRps,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.designs.put(newDesign);
    alert(`Design "${newDesign.name}" successfully saved to local IndexedDB!`);
  };

  // Load design from Dexie
  const handleLoadSavedDesign = (design: SavedTopologyDesign) => {
    if (isCollab) {
      if (userRole === 'viewer') return;
      const nodesMap = doc.getMap('nodes');
      const edgesMap = doc.getMap('edges');
      transact(() => {
        nodesMap.clear();
        edgesMap.clear();
        design.nodes.forEach((n: any) => {
          nodesMap.set(n.id, {
            id: n.id,
            label: n.data?.label || n.label,
            category: n.data?.category || n.category,
            icon: n.data?.icon || n.icon,
            replicas: n.data?.replicas || n.replicas || 1,
            capacityQps: n.data?.capacityQps || n.capacityQps || 5000,
            latencyMs: n.data?.latencyMs || n.latencyMs || 10,
            x: n.position?.x ?? n.x ?? 100,
            y: n.position?.y ?? n.y ?? 100,
          });
        });
        design.edges.forEach((e: any) => {
          edgesMap.set(e.id, { id: e.id, source: e.source, target: e.target });
        });
      });
    } else {
      setLocalNodes(design.nodes);
      setLocalEdges(design.edges);
      setTargetRps(design.targetRps || 30000);
      setSelectedNodeId(null);
    }
  };

  // Export JSON
  const handleExportJson = () => {
    const data = {
      nodes: currentNodes,
      edges: currentEdges,
      targetRps,
      version: 1,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blueprint-design-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.nodes && Array.isArray(parsed.nodes)) {
          if (isCollab) {
            if (userRole === 'viewer') return;
            const nodesMap = doc.getMap('nodes');
            const edgesMap = doc.getMap('edges');
            transact(() => {
              nodesMap.clear();
              edgesMap.clear();
              parsed.nodes.forEach((n: any) => {
                nodesMap.set(n.id, {
                  id: n.id,
                  label: n.data?.label || n.label,
                  category: n.data?.category || n.category,
                  icon: n.data?.icon || n.icon,
                  replicas: n.data?.replicas || n.replicas || 1,
                  capacityQps: n.data?.capacityQps || n.capacityQps || 5000,
                  latencyMs: n.data?.latencyMs || n.latencyMs || 10,
                  x: n.position?.x ?? n.x ?? 100,
                  y: n.position?.y ?? n.y ?? 100,
                });
              });
              (parsed.edges || []).forEach((ed: any) => {
                edgesMap.set(ed.id, { id: ed.id, source: ed.source, target: ed.target });
              });
            });
          } else {
            setLocalNodes(parsed.nodes);
            setLocalEdges(parsed.edges || []);
            if (parsed.targetRps) setTargetRps(parsed.targetRps);
          }
          alert('Architecture design successfully imported!');
        }
      } catch (err) {
        alert('Invalid JSON topology file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Clear Canvas / Redraw from scratch
  const handleClearCanvas = () => {
    handleRedrawFromScratch(true);
  };

  // Start live collaboration room
  const handleStartCollab = async () => {
    // Generate snapshot hash of current canvas so invite links always carry the full architecture
    const serializedHash = serializeTopology(currentNodes, currentEdges, targetRps);
    if (typeof window !== 'undefined') {
      window.location.hash = `d=${serializedHash}`;
    }

    if (!API_BASE) {
      const liveRoomId = `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const liveToken = Math.random().toString(36).slice(2, 10);
      isRoomCreatorRef.current = true;
      setActiveRoomId(liveRoomId);
      setInviteToken(liveToken);
      setSearchParams({ room: liveRoomId, token: liveToken });
      setShareModalOpen(true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/collab/create-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Architecture Whiteboard', ownerEmail: userEmail }),
      });
      if (res.ok) {
        const data = await res.json();
        isRoomCreatorRef.current = true;
        setActiveRoomId(data.roomId);
        setInviteToken(data.inviteToken);
        setSearchParams({ room: data.roomId, token: data.inviteToken });
        setShareModalOpen(true);
        return;
      }
      const err = await res.json();
      alert(err.error || 'Failed to create room on server');
    } catch (e: any) {
      const liveRoomId = `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const liveToken = Math.random().toString(36).slice(2, 10);
      isRoomCreatorRef.current = true;
      setActiveRoomId(liveRoomId);
      setInviteToken(liveToken);
      setSearchParams({ room: liveRoomId, token: liveToken });
      setShareModalOpen(true);
    }
  };

  // Canvas mouse movement tracking for live cursors
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCollab) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    emitCursor(x, y);
  };

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setIsRightSidebarOpen(true); // Auto-open inspector to edit clicked node
    if (isCollab) emitSelectedNode(node.id);
  };

  const handlePaneClick = () => {
    setSelectedNodeId(null);
    if (isCollab) emitSelectedNode(null);
  };

  // Save manual snapshot
  const handleSaveSnapshot = async (name: string) => {
    if (!activeRoomId) return;
    try {
      const res = await fetch(`${API_BASE}/api/collab/room/${activeRoomId}/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, author: localUserName, requesterEmail: userEmail }),
      });
      if (res.ok) {
        await refreshRoomMeta();
      } else {
        const err = await res.json();
        alert(err.error || 'Snapshots require Pro');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRestoreSnapshot = async (snapshotId: string) => {
    if (!activeRoomId) return;
    try {
      const res = await fetch(`${API_BASE}/api/collab/room/${activeRoomId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId, requesterEmail: userEmail }),
      });
      if (res.ok) {
        setHistoryModalOpen(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-128px)] md:h-[calc(100dvh-64px)] w-full overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Controls Toolbar with Clean Responsive Alignment */}
      <div className="h-14 px-2 sm:px-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1.5 sm:gap-2.5 shrink-0 shadow-sm z-10 select-none overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {/* Left Segment: Catalog Toggle, Brand, Template */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setIsLeftPaletteOpen(!isLeftPaletteOpen)}
            className={`h-8.5 w-8.5 flex items-center justify-center rounded-xl border text-xs font-semibold transition shrink-0 ${
              isLeftPaletteOpen
                ? 'bg-cyan-50 dark:bg-cyan-950/80 border-cyan-300 dark:border-cyan-800/80 text-cyan-700 dark:text-cyan-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Toggle Component Catalog Palette"
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-2 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-cyan-600 text-white flex items-center justify-center font-bold shadow-md shadow-cyan-600/20 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-xs text-slate-900 dark:text-white tracking-tight flex items-center gap-1">
                Playground
                {isCollab && (
                  <span className="text-[9px] px-1 py-0.2 rounded font-bold uppercase tracking-wider bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                    Live
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Template Dropdown - Hidden on narrower screens to prevent crowding */}
          <div className="hidden xl:flex items-center space-x-1 pl-2 border-l border-slate-200 dark:border-slate-800 shrink-0">
            <select
              value={selectedTemplateId}
              onChange={(e) => handleLoadTemplate(e.target.value)}
              className="h-8 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2 font-medium focus:outline-none focus:border-cyan-500 cursor-pointer max-w-[120px] sm:max-w-[140px] truncate"
              title="Select Architecture Template"
            >
              {Object.values(PLAYGROUND_TEMPLATES).map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center Segment: Target RPS, Run Simulation, Cycle Alert */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Cycle Detection Alert */}
          {activeDagResult?.hasCycle && (
            <div
              className="flex items-center space-x-1 px-2 h-8.5 rounded-lg bg-amber-500/10 dark:bg-amber-950/70 border border-amber-500/30 dark:border-amber-700 text-amber-600 dark:text-amber-300 text-xs font-mono font-bold animate-pulse shrink-0"
              title={`Cycle detected: ${activeDagResult.cycleNodeIds?.join(' ➔ ')}`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span className="hidden 2xl:inline">Cycle Alert</span>
            </div>
          )}

          {/* Target Load RPS Input - Collapses gracefully on mobile */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-950 h-8.5 px-2 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Load:</span>
            <input
              type="number"
              min="1000"
              max="1000000"
              step="5000"
              value={targetRps}
              onChange={(e) => setTargetRps(Number(e.target.value))}
              className="w-14 sm:w-16 text-xs font-mono font-bold bg-transparent focus:outline-none text-cyan-600 dark:text-cyan-400"
            />
            <span className="text-[10px] font-mono text-slate-500">RPS</span>
          </div>

          {/* Run Simulation Button */}
          <button
            onClick={handleRunSimulation}
            className="h-8.5 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">{isCollab ? 'Simulate' : 'Run Simulation'}</span>
          </button>

          {/* Challenges Arena Button - Icon only with indicator */}
          <button
            onClick={() => setIsChallengesOpen(true)}
            className="h-8.5 w-8.5 flex items-center justify-center rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-300 font-bold text-xs transition shrink-0 relative"
            title="Open Interactive Architecture Challenges"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            {activeChallenge && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse absolute top-1 right-1" />
            )}
          </button>
        </div>

        {/* Right Segment: Storage Tools, Inspector Toggle, Collab */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Storage Actions Group - Compact Icon Bar */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0">
            <button
              onClick={handleSaveDesignToDexie}
              className="h-7 w-7 flex items-center justify-center rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              title="Save Design locally to IndexedDB"
            >
              <Save className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            </button>

            <button
              onClick={() => setSavedDesignsModalOpen(true)}
              className="h-7 w-7 flex items-center justify-center rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              title="Browse Saved Designs"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            </button>

            <button
              onClick={handleExportJson}
              className="h-7 w-7 flex items-center justify-center rounded-md text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              title="Export Architecture JSON"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-7 w-7 flex items-center justify-center rounded-md text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              title="Import Architecture JSON"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => handleRedrawFromScratch(true)}
              className="h-7 px-1.5 flex items-center gap-1 rounded-md text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-600 transition"
              title="Redraw from Scratch (Clear canvas to start fresh)"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span className="hidden xl:inline text-[11px]">Scratch</span>
            </button>

            <button
              onClick={() => handleRedrawFromScratch(true)}
              className="h-7 w-7 flex items-center justify-center rounded-md text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition"
              title="Clear Canvas"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toggle Right Inspector Sidebar Button - Clean Icon Button */}
          <button
            onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            className={`h-8.5 w-8.5 flex items-center justify-center rounded-lg border text-xs font-semibold transition shrink-0 ${
              isRightSidebarOpen
                ? 'bg-cyan-50 dark:bg-cyan-950/80 border-cyan-300 dark:border-cyan-800/80 text-cyan-700 dark:text-cyan-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Toggle Right Inspector Sidebar"
          >
            <PanelRight className="w-4 h-4" />
          </button>

          {/* Live Collab / Header */}
          {isCollab ? (
            <CollabHeader
              roomId={activeRoomId!}
              status={collabStatus}
              role={userRole}
              peers={peers}
              commentCount={comments.length}
              userName={userName}
              userColor={localUserColor}
              onUpdateUserName={setUserName}
              onOpenShare={() => setShareModalOpen(true)}
              onToggleChat={() => setChatDrawerOpen(!chatDrawerOpen)}
              onOpenHistory={() => setHistoryModalOpen(true)}
              onUndo={undo}
              onRedo={redo}
            />
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  const newName = prompt('Enter your display name:', userName);
                  if (newName && newName.trim()) {
                    setUserName(newName.trim());
                  }
                }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 transition"
                title="Change display name"
              >
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  style={{ backgroundColor: localUserColor }}
                >
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[60px] sm:max-w-[80px] truncate font-semibold text-[11px]">{userName}</span>
              </button>
              <button
                onClick={handleStartCollab}
                className="h-8.5 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all shrink-0"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Live Room</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Shared Simulation Synced Notification Banner */}
      {isCollab && syncedSimulation && (
        <div className="bg-cyan-600 text-white px-4 py-1.5 text-xs font-medium flex items-center justify-between shrink-0 shadow-inner">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 animate-pulse text-amber-300" />
            <span>
              Shared Simulation triggered by <strong>{syncedSimulation.runInfo.triggeredBy}</strong> (
              {syncedSimulation.runInfo.targetRps.toLocaleString()} RPS)
            </span>
          </div>
          <span className="font-mono text-[11px] opacity-90">
            Critical Path: {syncedSimulation.dResult.criticalPathLatencyMs}ms
          </span>
        </div>
      )}

      {/* Main Workspace: Left Palette + Canvas + Right Sidebar Inspector */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative" onMouseMove={handleCanvasMouseMove}>
        {/* Left Component Catalog Palette */}
        <NodePalette
          isOpen={isLeftPaletteOpen}
          onToggle={() => setIsLeftPaletteOpen(!isLeftPaletteOpen)}
          onAddNode={(def) => handleAddNodeWithPosition(def)}
        />

        {/* Center Canvas with HTML5 Drag-and-Drop */}
        <div className="flex-1 h-full min-w-0 relative" onDragOver={onDragOver} onDrop={onDrop}>
          {/* Live Collab Remote Cursors Overlay */}
          {isCollab && <CollabCursors peers={peers} />}

          {/* Shared Architecture Snapshot Loaded Banner */}
          {sharedBannerVisible && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-emerald-950/95 border border-emerald-600/70 text-emerald-200 px-3.5 py-1.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2 text-xs animate-in fade-in slide-in-from-top-2 whitespace-nowrap">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Loaded shared architecture snapshot (<strong>{currentNodes.length}</strong> nodes, <strong>{currentEdges.length}</strong> connections).
              </span>
              <button
                onClick={() => setSharedBannerVisible(false)}
                className="ml-2 hover:bg-emerald-900/60 rounded-full p-1 text-emerald-400 hover:text-white transition"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {/* Floating Chaos Studio Bar */}
          <div className="absolute top-4 left-4 z-20 pointer-events-auto max-w-[calc(100%-32px)]">
            <ChaosStudio
              chaosState={chaosState}
              onTriggerSpike={handleTriggerSpike}
              onKillRandomNode={handleKillRandomNode}
              onSeverRandomEdge={handleSeverRandomEdge}
              onToggleJitter={handleToggleJitter}
              onHealAll={handleHealAll}
              hasNodes={currentNodes.length > 0}
              hasEdges={currentEdges.length > 0}
            />
          </div>

          <ReactFlow
            nodes={processedNodes}
            edges={processedEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onInit={setReactFlowInstance}
            fitView
            fitViewOptions={{ padding: 0.25, minZoom: 0.7, maxZoom: 1.15 }}
            minZoom={0.3}
            maxZoom={2}
            defaultViewport={{ x: 60, y: 80, zoom: 0.85 }}
            className="bg-slate-100 dark:bg-slate-950"
          >
            <Background gap={16} size={1} color={theme === 'dark' ? '#334155' : '#cbd5e1'} className="opacity-40" />
            <Controls className="!bg-white dark:!bg-slate-900 !border !border-slate-200 dark:!border-slate-800 !shadow-md !rounded-xl overflow-hidden !text-slate-700 dark:!text-slate-200" />
            <MiniMap
              nodeStrokeWidth={3}
              className="!bg-white/90 dark:!bg-slate-900/90 !border !border-slate-200 dark:!border-slate-800 !rounded-xl !shadow-md"
            />
          </ReactFlow>

          {/* Interactive Starter / Redraw From Scratch Empty State */}
          {currentNodes.length === 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none p-4">
              <div className="pointer-events-auto max-w-md w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto ring-1 ring-cyan-500/30">
                  <FilePlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Blank Canvas (Draw from Scratch)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Drag components from the catalog on the left, or click below to quickly drop starter nodes onto your whiteboard.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleAddNodeWithPosition(NODE_REGISTRY['client-web'], { x: 140, y: 220 })}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 bg-slate-50 dark:bg-slate-800/60 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-left transition group shadow-sm"
                  >
                    <span className="text-lg">🌐</span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 truncate">+ Web Client</div>
                      <div className="text-[10px] text-slate-500 truncate">Entry client</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleAddNodeWithPosition(NODE_REGISTRY['api-gateway'], { x: 390, y: 220 })}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 bg-slate-50 dark:bg-slate-800/60 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-left transition group shadow-sm"
                  >
                    <span className="text-lg">🚪</span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 truncate">+ API Gateway</div>
                      <div className="text-[10px] text-slate-500 truncate">Reverse proxy</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleAddNodeWithPosition(NODE_REGISTRY['service-app'], { x: 640, y: 220 })}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 bg-slate-50 dark:bg-slate-800/60 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-left transition group shadow-sm"
                  >
                    <span className="text-lg">⚙️</span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 truncate">+ Microservice</div>
                      <div className="text-[10px] text-slate-500 truncate">Application node</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleAddNodeWithPosition(NODE_REGISTRY['db-postgres-primary'], { x: 890, y: 220 })}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 bg-slate-50 dark:bg-slate-800/60 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-left transition group shadow-sm"
                  >
                    <span className="text-lg">🐘</span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 truncate">+ PostgreSQL</div>
                      <div className="text-[10px] text-slate-500 truncate">Primary database</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Telemetry Results Drawer (shown when triggered) */}
          {showResultsPanel && (activeSimulation || activeDagResult) && (
            <div className="absolute bottom-0 left-0 right-0 z-20 animate-in slide-in-from-bottom duration-200">
              <SimulationResultsPanel
                simulationResult={activeSimulation || null}
                dagResult={activeDagResult || null}
                onClose={() => setShowResultsPanel(false)}
              />
            </div>
          )}
        </div>

        {/* Docked Right Sidebar (Node Properties & System Overview) */}
        <PlaygroundRightSidebar
          isOpen={isRightSidebarOpen}
          onToggle={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
          selectedNode={selectedNodeObject}
          allNodes={processedNodes}
          allEdges={currentEdges}
          simulationResult={activeSimulation || null}
          dagResult={activeDagResult || null}
          auditReport={auditReport}
          costEstimate={costEstimate}
          targetRps={targetRps}
          onUpdateLabel={handleUpdateLabel}
          onUpdateReplicas={handleUpdateReplicas}
          onUpdateCapacity={handleUpdateCapacity}
          onUpdateLatency={handleUpdateLatency}
          onUpdateMachineTier={handleUpdateMachineTier}
          onUpdateEdgeProtocol={handleUpdateEdgeProtocol}
          onDeleteNode={handleDeleteNode}
          onDisconnectNodes={handleDisconnectNodes}
          onSelectNodeById={(id) => {
            setSelectedNodeId(id);
            setIsRightSidebarOpen(true);
          }}
          onClearSelection={() => setSelectedNodeId(null)}
        />
      </div>

      {/* Modals & Drawers */}
      <SavedDesignsModal
        isOpen={savedDesignsModalOpen}
        onClose={() => setSavedDesignsModalOpen(false)}
        onLoadDesign={handleLoadSavedDesign}
      />

      {/* Interactive Architecture Challenges Arena */}
      <ArchitectureChallengesModal
        isOpen={isChallengesOpen}
        onClose={() => setIsChallengesOpen(false)}
        activeChallenge={activeChallenge}
        onSelectChallenge={(challenge) => {
          setActiveChallenge(challenge);
          handleLoadTemplate(challenge.initialTemplateKey);
          setTargetRps(challenge.targetRps);
        }}
        nodes={processedNodes}
        edges={currentEdges}
        simulationResult={activeSimulation || null}
        auditReport={auditReport}
        dagResult={activeDagResult || null}
      />

      {isCollab && (
        <>
          <ShareRoomModal
            isOpen={shareModalOpen}
            onClose={() => setShareModalOpen(false)}
            roomId={activeRoomId!}
            inviteToken={inviteToken}
            userRole={userRole}
            members={roomMembers}
            userName={userName}
            onUpdateUserName={setUserName}
            serializedSnapshot={serializeTopology(currentNodes, currentEdges, targetRps)}
            onUpdateRole={async (targetUserId, newRole) => {
              await fetch(`${API_BASE}/api/collab/room/${activeRoomId}/role`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requesterEmail: userEmail, targetUserId, newRole }),
              });
              await refreshRoomMeta();
            }}
            onRegenerateToken={async () => {
              const res = await fetch(`${API_BASE}/api/collab/room/${activeRoomId}/revoke-link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requesterEmail: userEmail }),
              });
              if (res.ok) {
                const data = await res.json();
                setInviteToken(data.inviteToken);
                setSearchParams({ room: activeRoomId!, token: data.inviteToken });
              }
            }}
          />

          <RoomChatDrawer
            isOpen={chatDrawerOpen}
            onClose={() => setChatDrawerOpen(false)}
            chatMessages={chatMessages}
            comments={comments}
            onSendMessage={sendChatMessage}
            onResolveComment={resolveComment}
            onAddComment={addComment}
            activeNodeId={selectedNodeId}
          />

          <VersionHistoryModal
            isOpen={historyModalOpen}
            onClose={() => setHistoryModalOpen(false)}
            snapshots={snapshots}
            onSaveSnapshot={handleSaveSnapshot}
            onRestoreSnapshot={handleRestoreSnapshot}
            isOwner={userRole === 'owner'}
          />
        </>
      )}
    </div>
  );
};
