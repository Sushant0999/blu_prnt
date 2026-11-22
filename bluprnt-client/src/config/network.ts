/**
 * Global Network Configuration for BluPrnt Client
 * Intelligently resolves API and WebSocket endpoints across local dev, Vercel, and Docker/Render.
 */

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  
  // Explicit environment variable override
  const envApi = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envApi) return envApi;

  // Local development ports proxy to port 4000
  const isDevPort = window.location.port === '3000' || window.location.port === '5173' || window.location.port === '3001';
  if (isDevPort) return 'http://localhost:4000';

  // Production Vercel deployment routes to deployed Render backend
  if (window.location.hostname.endsWith('vercel.app')) {
    return 'https://bluprnt-ws.onrender.com';
  }

  // Same-origin fallback (when hosted unified on Render, Railway, or Docker)
  return '';
}

export function getCollabWsUrl(): string {
  if (typeof window === 'undefined') return '';

  // Explicit environment variable override
  const envWs = (import.meta as any).env?.VITE_COLLAB_WS_URL;
  if (envWs) return envWs;

  // Local development ports connect to local backend WebSocket
  const isDevPort = window.location.port === '3000' || window.location.port === '5173' || window.location.port === '3001';
  if (isDevPort) return 'ws://localhost:4000/collab';

  // Production Vercel deployment connects to deployed Render WebSocket Gateway
  if (window.location.hostname.endsWith('vercel.app')) {
    return 'wss://bluprnt-ws.onrender.com/collab';
  }

  // Same-origin fallback
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/collab`;
}
