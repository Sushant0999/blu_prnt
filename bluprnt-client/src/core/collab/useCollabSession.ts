import { useState, useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Node, Edge } from 'reactflow';
import { SystemNodeData } from '../../components/playground/SystemCustomNode';
import { evaluateBottlenecks, TopologySimulationResult } from '../algorithms/bottleneck';
import { computeCriticalPathLatency, DagLatencyResult } from '../algorithms/dagLatency';
import { getCollabWsUrl } from '../../config/network';

export type CollabRole = 'owner' | 'editor' | 'viewer';

export interface CollabUser {
  name: string;
  color: string;
  role: CollabRole;
  cursor?: { x: number; y: number } | null;
  selectedNodeId?: string | null;
}

export interface PeerPresence {
  clientId: number;
  user: CollabUser;
}

export interface NodeComment {
  id: string;
  nodeId: string;
  author: string;
  text: string;
  createdAt: number;
  resolved: boolean;
}

export interface ChatMessage {
  id: string;
  author: string;
  color: string;
  text: string;
  timestamp: number;
}

export interface SharedSimulationRun {
  runId: string;
  targetRps: number;
  triggeredBy: string;
  timestamp: number;
}

const PEER_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6',
];

export function useCollabSession(roomId: string | null, userEmail: string, initialRole: CollabRole = 'editor') {
  const [doc] = useState<Y.Doc>(() => new Y.Doc());
  const [status, setStatus] = useState<'connected' | 'connecting' | 'offline'>('offline');
  const [role, setRole] = useState<CollabRole>(initialRole);
  const [peers, setPeers] = useState<PeerPresence[]>([]);
  const [comments, setComments] = useState<NodeComment[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [remoteSelections, setRemoteSelections] = useState<Record<string, { name: string; color: string }>>({});
  const [syncedSimulation, setSyncedSimulation] = useState<{
    bResult: TopologySimulationResult;
    dResult: DagLatencyResult;
    runInfo: SharedSimulationRun;
  } | null>(null);

  const providerRef = useRef<WebsocketProvider | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const localOriginRef = useRef<symbol>(Symbol('local-collab-origin'));

  // Stable local user identity
  const localUser = useRef<CollabUser>({
    name: userEmail ? userEmail.split('@')[0] : `Guest_${Math.floor(Math.random() * 900 + 100)}`,
    color: PEER_COLORS[Math.floor(Math.random() * PEER_COLORS.length)],
    role: initialRole,
    cursor: null,
    selectedNodeId: null,
  });

  useEffect(() => {
    localUser.current.role = role;
  }, [role]);

  // Connect to Y.Doc, IndexedDB and WebSocket Server
  useEffect(() => {
    if (!roomId) {
      setStatus('offline');
      return;
    }

    setStatus('connecting');

    // 1. Local Offline Persistence via IndexedDB
    const indexeddbProvider = new IndexeddbPersistence(`bluprnt-room-${roomId}`, doc);
    persistenceRef.current = indexeddbProvider;

    // Check if room is offline-local or if a valid WebSocket URL is available
    const isLocalRoom = roomId.endsWith('-local') || roomId.endsWith('-studio') || roomId.startsWith('local-');
    const wsUrl = getCollabWsUrl();
    const shouldConnectWs = !isLocalRoom && Boolean(wsUrl);

    let provider: WebsocketProvider | null = null;

    if (shouldConnectWs) {
      try {
        provider = new WebsocketProvider(wsUrl, roomId, doc, {
          params: {
            userId: userEmail || 'anonymous',
            name: localUser.current.name,
            role: initialRole,
          },
        });
        providerRef.current = provider;

        provider.on('status', (event: { status: 'connected' | 'connecting' | 'disconnected' }) => {
          if (event.status === 'connected') setStatus('connected');
          else if (event.status === 'connecting') setStatus('connecting');
          else setStatus('offline');
        });

        // 3. Setup Awareness & Presence
        const awareness = provider.awareness;
        awareness.setLocalStateField('user', localUser.current);

        const updatePresence = () => {
          const states = awareness.getStates();
          const peerList: PeerPresence[] = [];
          const selections: Record<string, { name: string; color: string }> = {};

          states.forEach((state: any, clientId: number) => {
            if (state.user && clientId !== awareness.clientID) {
              peerList.push({ clientId, user: state.user });
              if (state.user.selectedNodeId) {
                selections[state.user.selectedNodeId] = {
                  name: state.user.name,
                  color: state.user.color,
                };
              }
            }
          });

          setPeers(peerList);
          setRemoteSelections(selections);
        };

        awareness.on('change', updatePresence);
      } catch (err) {
        console.warn('[BluPrnt] WebSocket connection skipped or unavailable:', err);
        setStatus('offline');
      }
    } else {
      setStatus('offline');
    }

    // 4. Scoped UndoManager (Only tracks my changes via localOriginRef)
    const nodesMap = doc.getMap('nodes');
    const edgesMap = doc.getMap('edges');
    const undoManager = new Y.UndoManager([nodesMap, edgesMap], {
      trackedOrigins: new Set([localOriginRef.current]),
    });
    undoManagerRef.current = undoManager;

    // 5. Listen to Comments & Chat
    const commentsArray = doc.getArray('comments');
    const updateComments = () => {
      setComments(commentsArray.toArray() as NodeComment[]);
    };
    commentsArray.observe(updateComments);
    updateComments();

    const chatArray = doc.getArray('chat');
    const updateChat = () => {
      setChatMessages(chatArray.toArray() as ChatMessage[]);
    };
    chatArray.observe(updateChat);
    updateChat();

    // 6. Listen to Shared Simulation Runs
    const settingsMap = doc.getMap('settings');
    const handleSettingsChange = () => {
      const lastRun = settingsMap.get('lastRun') as SharedSimulationRun | undefined;
      if (lastRun) {
        // Deterministically calculate simulation locally from CRDT state
        const nodesList = Array.from(nodesMap.values()).map((n: any) => ({
          id: n.id,
          type: n.type || 'systemNode',
          label: n.label,
          replicas: n.replicas || 1,
          capacityQps: n.capacityQps || 5000,
          latencyMs: n.latencyMs || 10,
        }));

        const edgesList = Array.from(edgesMap.values()).map((e: any) => ({
          id: e.id,
          source: e.source,
          target: e.target,
        }));

        const bResult = evaluateBottlenecks(nodesList, edgesList, lastRun.targetRps);
        const dResult = computeCriticalPathLatency(nodesList, edgesList);

        setSyncedSimulation({
          bResult,
          dResult,
          runInfo: lastRun,
        });
      }
    };
    settingsMap.observe(handleSettingsChange);

    return () => {
      provider?.destroy();
      indexeddbProvider.destroy();
      doc.destroy();
    };
  }, [roomId, userEmail, initialRole]);

  // Throttled cursor position emitter
  const lastCursorEmit = useRef<number>(0);
  const emitCursor = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastCursorEmit.current > 30 && providerRef.current) {
      lastCursorEmit.current = now;
      localUser.current.cursor = { x, y };
      providerRef.current.awareness.setLocalStateField('user', {
        ...localUser.current,
        cursor: { x, y },
      });
    }
  }, []);

  const emitSelectedNode = useCallback((nodeId: string | null) => {
    if (providerRef.current) {
      localUser.current.selectedNodeId = nodeId;
      providerRef.current.awareness.setLocalStateField('user', {
        ...localUser.current,
        selectedNodeId: nodeId,
      });
    }
  }, []);

  // Write changes into Yjs transaction tagged with localOriginRef
  const transact = useCallback((fn: () => void) => {
    if (role === 'viewer') return; // Enforced client-side guard
    doc.transact(fn, localOriginRef.current);
  }, [doc, role]);

  // Synchronized simulation trigger
  const triggerSharedSimulation = useCallback((targetRps: number) => {
    if (role === 'viewer') return;
    const settingsMap = doc.getMap('settings');
    const runInfo: SharedSimulationRun = {
      runId: `run-${Date.now()}`,
      targetRps,
      triggeredBy: localUser.current.name,
      timestamp: Date.now(),
    };
    doc.transact(() => {
      settingsMap.set('targetRps', targetRps);
      settingsMap.set('lastRun', runInfo);
    }, localOriginRef.current);
  }, [doc, role]);

  // Comments operations
  const addComment = useCallback((nodeId: string, text: string) => {
    const commentsArray = doc.getArray('comments');
    const newComment: NodeComment = {
      id: `comm-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      nodeId,
      author: localUser.current.name,
      text,
      createdAt: Date.now(),
      resolved: false,
    };
    doc.transact(() => {
      commentsArray.push([newComment]);
    });
  }, [doc]);

  const resolveComment = useCallback((commentId: string) => {
    const commentsArray = doc.getArray('comments');
    const all = commentsArray.toArray() as NodeComment[];
    const idx = all.findIndex((c) => c.id === commentId);
    if (idx !== -1) {
      doc.transact(() => {
        const item = { ...all[idx], resolved: !all[idx].resolved };
        commentsArray.delete(idx, 1);
        commentsArray.insert(idx, [item]);
      });
    }
  }, [doc]);

  // Chat operation
  const sendChatMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    const chatArray = doc.getArray('chat');
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      author: localUser.current.name,
      color: localUser.current.color,
      text: text.trim(),
      timestamp: Date.now(),
    };
    doc.transact(() => {
      chatArray.push([msg]);
    });
  }, [doc]);

  // Scoped Undo / Redo
  const undo = useCallback(() => {
    if (role === 'viewer') return;
    undoManagerRef.current?.undo();
  }, [role]);

  const redo = useCallback(() => {
    if (role === 'viewer') return;
    undoManagerRef.current?.redo();
  }, [role]);

  return {
    doc,
    status,
    role,
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
    localUserName: localUser.current.name,
    localUserColor: localUser.current.color,
  };
}
