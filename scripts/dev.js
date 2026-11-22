#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🚀 Starting BluPrnt Unified Full-Stack Dev Environment...');

const serverProc = spawn('npm', ['run', 'dev'], {
  cwd: path.join(rootDir, 'bluprnt-server'),
  stdio: 'inherit',
  shell: true,
});

const clientProc = spawn('npm', ['run', 'dev'], {
  cwd: path.join(rootDir, 'bluprnt-client'),
  stdio: 'inherit',
  shell: true,
});

function shutdown() {
  console.log('\n🛑 Shutting down BluPrnt services...');
  serverProc.kill();
  clientProc.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

serverProc.on('close', (code) => {
  if (code !== 0) console.error(`[Server] Exited with code ${code}`);
});

clientProc.on('close', (code) => {
  if (code !== 0) console.error(`[Client] Exited with code ${code}`);
});
