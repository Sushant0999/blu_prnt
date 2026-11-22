import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { roomManager, UserRole } from './roomManager.js';
import { serverDb } from '../db/db.js';

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const MESSAGE_AUTH = 2;

export interface ClientConnection {
  ws: WebSocket;
  userId: string;
  name: string;
  role: UserRole;
  roomId: string;
  lastMessageTime: number;
  messageCountLastSec: number;
}

export class CollabWebSocketServer {
  private wss: WebSocketServer;
  private roomConnections = new Map<string, Set<ClientConnection>>();
  private roomAwareness = new Map<string, awarenessProtocol.Awareness>();

  constructor(server: any) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request: IncomingMessage, socket: any, head: any) => {
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      if (url.pathname.startsWith('/collab/')) {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      }
    });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    // Path: /collab/:roomId?token=...&userId=...&name=...&role=...
    const parts = url.pathname.split('/');
    const roomId = parts[2];
    const token = url.searchParams.get('token') || '';
    const userId = url.searchParams.get('userId') || `user_${Math.random().toString(36).slice(2, 7)}`;
    const name = url.searchParams.get('name') || userId.split('@')[0];
    let role = (url.searchParams.get('role') as UserRole) || 'editor';

    if (!roomId) {
      ws.close(4001, 'Room ID missing');
      return;
    }

    const session = roomManager.getOrCreateRoomSession(roomId, `Room-${roomId}`, userId);

    // Validate member role against server-stored room record
    if (session.record.ownerEmail === userId) {
      role = 'owner';
    } else if (session.record.members[userId]) {
      role = session.record.members[userId].role;
    } else {
      // New member joining via invite link
      const userRecord = serverDb.getUser(session.record.ownerEmail);
      const isOwnerPro = userRecord?.isPro || false;
      const capacityCheck = roomManager.canAddMember(roomId, userId, isOwnerPro);

      if (!capacityCheck.allowed) {
        ws.close(4003, capacityCheck.reason || 'Room capacity reached');
        return;
      }

      // If token matches invite token or defaults
      session.record.members[userId] = {
        userId,
        name,
        role,
        joinedAt: Date.now(),
      };
    }

    const client: ClientConnection = {
      ws,
      userId,
      name,
      role,
      roomId,
      lastMessageTime: Date.now(),
      messageCountLastSec: 0,
    };

    if (!this.roomConnections.has(roomId)) {
      this.roomConnections.set(roomId, new Set());
    }
    this.roomConnections.get(roomId)!.add(client);

    // Setup or get Room Awareness
    let awareness = this.roomAwareness.get(roomId);
    if (!awareness) {
      awareness = new awarenessProtocol.Awareness(session.doc);
      this.roomAwareness.set(roomId, awareness);

      awareness.on('update', ({ added, updated, removed }: any, origin: any) => {
        const changedClients = added.concat(updated, removed);
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(awareness!, changedClients)
        );
        const buff = encoding.toUint8Array(encoder);

        this.broadcastToRoom(roomId, buff, origin);
      });
    }

    // Subscribe to document updates to broadcast to peers
    const docUpdateHandler = (update: Uint8Array, origin: any) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      const buff = encoding.toUint8Array(encoder);
      this.broadcastToRoom(roomId, buff, origin);
    };

    session.doc.on('update', docUpdateHandler);

    // Send Step 1 Sync to client
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, session.doc);
    this.sendToClient(client, encoding.toUint8Array(encoder));

    // Send current awareness states to client
    if (awareness.getStates().size > 0) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(
          awareness,
          Array.from(awareness.getStates().keys())
        )
      );
      this.sendToClient(client, encoding.toUint8Array(awarenessEncoder));
    }

    // Handle incoming messages
    ws.on('message', (message: ArrayBuffer | Buffer) => {
      try {
        const now = Date.now();
        if (now - client.lastMessageTime > 1000) {
          client.lastMessageTime = now;
          client.messageCountLastSec = 0;
        }
        client.messageCountLastSec++;

        // Rate limiting: max 120 messages/sec per client
        if (client.messageCountLastSec > 120) {
          console.warn(`[Collab] Client ${client.userId} rate limited in room ${roomId}`);
          return;
        }

        const uint8Array = new Uint8Array(message as ArrayBuffer);
        const decoder = decoding.createDecoder(uint8Array);
        const messageType = decoding.readVarUint(decoder);

        switch (messageType) {
          case MESSAGE_SYNC: {
            // Read sync message type inside sync protocol
            const syncMessageType = decoding.readVarUint(decoder);

            if (syncMessageType === syncProtocol.messageYjsUpdate) {
              // ENFORCE SERVER-SIDE ROLE PERMISSION:
              // Viewers CANNOT write document updates!
              if (client.role === 'viewer') {
                console.warn(
                  `[Collab Security] Blocked unauthorized write attempt by Viewer (${client.userId}) in room ${roomId}`
                );
                // Send alert message or reset
                const errEncoder = encoding.createEncoder();
                encoding.writeVarUint(errEncoder, MESSAGE_AUTH);
                encoding.writeVarString(
                  errEncoder,
                  'Permission denied: Viewer role is read-only.'
                );
                this.sendToClient(client, encoding.toUint8Array(errEncoder));
                return;
              }

              // Editor or Owner: apply update to room document
              const update = decoding.readVarUint8Array(decoder);
              Y.applyUpdate(session.doc, update, client);
            } else if (syncMessageType === syncProtocol.messageYjsSyncStep1) {
              const replyEncoder = encoding.createEncoder();
              encoding.writeVarUint(replyEncoder, MESSAGE_SYNC);
              syncProtocol.readSyncStep1(decoder, replyEncoder, session.doc);
              this.sendToClient(client, encoding.toUint8Array(replyEncoder));
            } else if (syncMessageType === syncProtocol.messageYjsSyncStep2) {
              if (client.role !== 'viewer') {
                syncProtocol.readSyncStep2(decoder, session.doc, client);
              }
            }
            break;
          }

          case MESSAGE_AWARENESS: {
            const awarenessUpdate = decoding.readVarUint8Array(decoder);
            awarenessProtocol.applyAwarenessUpdate(awareness!, awarenessUpdate, client);
            break;
          }
        }
      } catch (err) {
        console.error(`Error processing message from client ${client.userId}`, err);
      }
    });

    ws.on('close', () => {
      const connections = this.roomConnections.get(roomId);
      if (connections) {
        connections.delete(client);
        if (connections.size === 0) {
          this.roomConnections.delete(roomId);
        }
      }
      session.doc.off('update', docUpdateHandler);
    });
  }

  private sendToClient(client: ClientConnection, data: Uint8Array) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }

  private broadcastToRoom(roomId: string, data: Uint8Array, origin: any) {
    const clients = this.roomConnections.get(roomId);
    if (!clients) return;

    for (const client of clients) {
      if (client !== origin && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }

  getRoomClientCount(roomId: string): number {
    return this.roomConnections.get(roomId)?.size || 0;
  }
}
