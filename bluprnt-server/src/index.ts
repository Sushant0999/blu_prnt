import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { stripeRouter } from './routes/stripeRoutes.js';
import { syncRouter } from './routes/syncRoutes.js';
import { collabRouter } from './routes/collabRoutes.js';
import { CollabWebSocketServer } from './collab/wsHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS for client
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Capture raw body for Stripe webhook verification before json middleware
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'BluPrnt Unified Gateway & Collab WebSocket', time: new Date().toISOString() });
});

// Mount API routes
app.use('/api/stripe', stripeRouter);
app.use('/api/tokens', stripeRouter);
app.use('/api/sync', syncRouter);
app.use('/api/collab', collabRouter);

// Serve Static Frontend Assets (Unified Full-Stack Mode)
const possibleClientPaths = [
  path.resolve(__dirname, '../../bluprnt-client/dist'),
  path.resolve(__dirname, '../bluprnt-client/dist'),
  path.resolve(process.cwd(), 'bluprnt-client/dist'),
  path.resolve(process.cwd(), '../bluprnt-client/dist'),
];

const clientDistPath = possibleClientPaths.find((p) => fs.existsSync(p));

if (clientDistPath) {
  console.log(`[BluPrnt Unified Server] Serving compiled frontend client from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  // SPA client-side routing fallback (for /playground, /learn, /practice, etc.)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/collab')) return next();
    const indexPath = path.join(clientDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
} else {
  console.log('[BluPrnt Backend] Running in standalone API mode (client dist not found).');
}

// Create HTTP server for both Express and WebSockets
const server = http.createServer(app);

// Initialize Collab WebSocket Server
export const collabWs = new CollabWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 [BluPrnt Unified Server] Listening on http://localhost:${PORT}`);
  console.log(`   - Frontend App: http://localhost:${PORT}`);
  console.log(`   - REST APIs:   http://localhost:${PORT}/api/*`);
  console.log(`   - WebSockets:  ws://localhost:${PORT}/collab`);
  console.log(`=======================================================`);
});

export default app;
