import * as Y from 'yjs';
import { serverDb } from '../db/db.js';

export type UserRole = 'owner' | 'editor' | 'viewer';

export interface RoomMember {
  userId: string;
  name: string;
  role: UserRole;
  joinedAt: number;
}

export interface RoomSnapshot {
  id: string;
  name: string;
  author: string;
  timestamp: number;
  docStateBase64: string;
}

export interface CollabRoomRecord {
  id: string;
  name: string;
  ownerEmail: string;
  inviteToken: string;
  createdAt: number;
  updatedAt: number;
  members: Record<string, RoomMember>; // userId -> member
  snapshots: RoomSnapshot[];
  encodedDocState?: string; // base64 Yjs update
}

export interface RoomSession {
  record: CollabRoomRecord;
  doc: Y.Doc;
  dirty: boolean;
  lastPersisted: number;
}

class RoomManager {
  private activeRooms = new Map<string, RoomSession>();

  /**
   * Retrieves or initializes an active Y.Doc room session.
   */
  getOrCreateRoomSession(roomId: string, fallbackName?: string, ownerEmail?: string): RoomSession {
    let session = this.activeRooms.get(roomId);
    if (session) return session;

    // Load from serverDb or initialize
    let record = (serverDb as any).getCollabRoom?.(roomId) as CollabRoomRecord | undefined;

    if (!record) {
      record = {
        id: roomId,
        name: fallbackName || `Design-${roomId}`,
        ownerEmail: ownerEmail || 'unknown@bluprnt.app',
        inviteToken: Math.random().toString(36).slice(2, 10),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        members: ownerEmail
          ? {
              [ownerEmail]: {
                userId: ownerEmail,
                name: ownerEmail.split('@')[0],
                role: 'owner',
                joinedAt: Date.now(),
              },
            }
          : {},
        snapshots: [],
      };
      (serverDb as any).saveCollabRoom?.(record);
    }

    const doc = new Y.Doc();

    // If there is existing encoded state, apply it
    if (record.encodedDocState) {
      try {
        const update = Buffer.from(record.encodedDocState, 'base64');
        Y.applyUpdate(doc, update);
      } catch (err) {
        console.error(`Failed to apply persisted doc state for room ${roomId}`, err);
      }
    }

    session = {
      record,
      doc,
      dirty: false,
      lastPersisted: Date.now(),
    };

    // Track document changes to mark dirty for debounced saving
    doc.on('update', () => {
      if (session) {
        session.dirty = true;
      }
    });

    this.activeRooms.set(roomId, session);
    return session;
  }

  /**
   * Persists dirty rooms to the database.
   */
  persistDirtyRooms(): void {
    const now = Date.now();
    for (const [roomId, session] of this.activeRooms.entries()) {
      if (session.dirty || now - session.lastPersisted > 10000) {
        try {
          const stateUpdate = Y.encodeStateAsUpdate(session.doc);
          session.record.encodedDocState = Buffer.from(stateUpdate).toString('base64');
          session.record.updatedAt = now;
          (serverDb as any).saveCollabRoom?.(session.record);
          session.dirty = false;
          session.lastPersisted = now;
        } catch (err) {
          console.error(`Error persisting room ${roomId}`, err);
        }
      }
    }
  }

  /**
   * Creates a snapshot version of the document.
   */
  createSnapshot(roomId: string, snapshotName: string, author: string): RoomSnapshot | null {
    const session = this.getOrCreateRoomSession(roomId);
    if (!session) return null;

    const stateUpdate = Y.encodeStateAsUpdate(session.doc);
    const snapshot: RoomSnapshot = {
      id: `snap-${Date.now()}`,
      name: snapshotName,
      author,
      timestamp: Date.now(),
      docStateBase64: Buffer.from(stateUpdate).toString('base64'),
    };

    session.record.snapshots.push(snapshot);
    session.dirty = true;
    this.persistDirtyRooms();
    return snapshot;
  }

  /**
   * Restores a snapshot version into the active room.
   */
  restoreSnapshot(roomId: string, snapshotId: string): boolean {
    const session = this.getOrCreateRoomSession(roomId);
    const snap = session.record.snapshots.find((s) => s.id === snapshotId);
    if (!snap) return false;

    try {
      const update = Buffer.from(snap.docStateBase64, 'base64');
      // Apply update directly in transaction
      session.doc.transact(() => {
        Y.applyUpdate(session.doc, update);
      });
      session.dirty = true;
      this.persistDirtyRooms();
      return true;
    } catch (err) {
      console.error(`Failed to restore snapshot ${snapshotId}`, err);
      return false;
    }
  }

  /**
   * Checks member limit and role permissions according to user's plan.
   */
  canAddMember(roomId: string, newUserId: string, isPro: boolean): { allowed: boolean; reason?: string } {
    const session = this.getOrCreateRoomSession(roomId);
    const currentMemberCount = Object.keys(session.record.members).length;

    if (session.record.members[newUserId]) {
      return { allowed: true }; // already a member
    }

    const maxAllowed = isPro ? 10 : 3;
    if (currentMemberCount >= maxAllowed) {
      return {
        allowed: false,
        reason: isPro
          ? `Room reached maximum Pro capacity of 10 participants.`
          : `Free room limit is 3 participants. Upgrade to BluPrnt Pro for up to 10 participants.`,
      };
    }

    return { allowed: true };
  }
}

export const roomManager = new RoomManager();

// Background timer to flush dirty updates every 2 seconds
setInterval(() => {
  roomManager.persistDirtyRooms();
}, 2000);
