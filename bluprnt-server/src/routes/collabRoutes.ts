import { Router, Request, Response } from 'express';
import { roomManager } from '../collab/roomManager.js';
import { serverDb } from '../db/db.js';

export const collabRouter = Router();

/**
 * Creates a collaborative room with Pro gating.
 */
collabRouter.post('/create-room', (req: Request, res: Response): void => {
  const { name, ownerEmail } = req.body;
  if (!ownerEmail) {
    res.status(400).json({ error: 'ownerEmail required' });
    return;
  }

  const user = serverDb.getUser(ownerEmail);
  const isPro = user?.isPro || false;

  // Free Tier Pro-gating limit: 1 active room
  if (!isPro) {
    const existingRooms = serverDb.listUserCollabRooms(ownerEmail);
    if (existingRooms.length >= 1) {
      res.status(403).json({
        error: 'Free plan allows 1 active collaborative room. Upgrade to BluPrnt Pro for unlimited rooms.',
        code: 'PRO_LIMIT_EXCEEDED',
      });
      return;
    }
  }

  const roomId = `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const session = roomManager.getOrCreateRoomSession(roomId, name || 'Shared Whiteboard', ownerEmail);

  res.json({
    roomId,
    name: session.record.name,
    ownerEmail: session.record.ownerEmail,
    inviteToken: session.record.inviteToken,
    members: session.record.members,
  });
});

/**
 * Get room metadata & member list.
 */
collabRouter.get(['/room/:roomId', '/room/:roomId/info'], (req: Request, res: Response): void => {
  const roomId = req.params.roomId as string;
  const userEmail = req.query.email as string;

  const session = roomManager.getOrCreateRoomSession(roomId);
  const user = userEmail ? serverDb.getUser(userEmail) : undefined;
  const isPro = user?.isPro || false;

  const role = session.record.ownerEmail === userEmail
    ? 'owner'
    : session.record.members[userEmail]?.role || 'viewer';

  res.json({
    roomId: session.record.id,
    name: session.record.name,
    ownerEmail: session.record.ownerEmail,
    inviteToken: session.record.inviteToken,
    members: session.record.members,
    snapshots: session.record.snapshots,
    userRole: role,
    role: role,
    isOwnerPro: isPro,
  });
});

/**
 * Owner updates a participant's role (promote/demote).
 */
collabRouter.post('/room/:roomId/role', (req: Request, res: Response): void => {
  const roomId = req.params.roomId as string;
  const { requesterEmail, targetUserId, newRole } = req.body;

  const session = roomManager.getOrCreateRoomSession(roomId);
  if (session.record.ownerEmail !== requesterEmail) {
    res.status(403).json({ error: 'Only the room owner can modify participant roles.' });
    return;
  }

  if (session.record.members[targetUserId]) {
    session.record.members[targetUserId].role = newRole;
    session.dirty = true;
    res.json({ success: true, member: session.record.members[targetUserId] });
  } else {
    res.status(404).json({ error: 'Participant not found in room' });
  }
});

/**
 * Owner revokes and regenerates invite token.
 */
collabRouter.post('/room/:roomId/revoke-link', (req: Request, res: Response): void => {
  const roomId = req.params.roomId as string;
  const { requesterEmail } = req.body;

  const session = roomManager.getOrCreateRoomSession(roomId);
  if (session.record.ownerEmail !== requesterEmail) {
    res.status(403).json({ error: 'Only the room owner can regenerate invite links.' });
    return;
  }

  session.record.inviteToken = Math.random().toString(36).slice(2, 10);
  session.dirty = true;
  res.json({ success: true, inviteToken: session.record.inviteToken });
});

/**
 * Save manual version snapshot.
 */
collabRouter.post('/room/:roomId/snapshot', (req: Request, res: Response): void => {
  const roomId = req.params.roomId as string;
  const { name, author, requesterEmail } = req.body;

  const user = requesterEmail ? serverDb.getUser(requesterEmail) : undefined;
  if (!user?.isPro) {
    res.status(403).json({
      error: 'Version history snapshots require BluPrnt Pro.',
      code: 'PRO_REQUIRED',
    });
    return;
  }

  const snap = roomManager.createSnapshot(roomId, name || `Snapshot ${new Date().toLocaleTimeString()}`, author || 'Architect');
  res.json({ success: true, snapshot: snap });
});

/**
 * Restore version snapshot.
 */
collabRouter.post('/room/:roomId/restore', (req: Request, res: Response): void => {
  const roomId = req.params.roomId as string;
  const { snapshotId, requesterEmail } = req.body;

  const session = roomManager.getOrCreateRoomSession(roomId);
  if (session.record.ownerEmail !== requesterEmail) {
    res.status(403).json({ error: 'Only room owner can restore previous versions.' });
    return;
  }

  const success = roomManager.restoreSnapshot(roomId, snapshotId);
  res.json({ success });
});
