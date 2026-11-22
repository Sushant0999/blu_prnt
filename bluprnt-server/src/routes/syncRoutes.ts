import { Router, Request, Response } from 'express';
import { serverDb } from '../db/db.js';

export const syncRouter = Router();

/**
 * Push local client delta state to server cloud database.
 */
syncRouter.post('/push', (req: Request, res: Response): void => {
  const { email, data } = req.body;
  if (!email) {
    res.status(400).json({ error: 'User email is required for cloud synchronization' });
    return;
  }

  const updatedUser = serverDb.saveUserSync(email, data);
  res.json({
    success: true,
    syncedAt: updatedUser.updatedAt,
  });
});

/**
 * Pull latest cloud state for user.
 */
syncRouter.get('/pull', (req: Request, res: Response): void => {
  const email = req.query.email as string;
  if (!email) {
    res.status(400).json({ error: 'User email is required' });
    return;
  }

  const user = serverDb.getUser(email);
  res.json({
    email,
    syncData: user?.syncData || null,
    lastSyncedAt: user?.updatedAt || null,
    isPro: user ? user.isPro : false,
  });
});
