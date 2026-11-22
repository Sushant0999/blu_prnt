/**
 * Global Network Configuration for BluPrnt Client
 * Intelligently resolves API and WebSocket endpoints across local dev, Vercel, and Docker/Render.
 */

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  
  // Explicit environment variable override (ignore dead placeholder domains)
  const envApi = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envApi && !envApi.includes('bluprnt-ws.onrender.com')) {
    return envApi;
  }

  // Local development ports proxy to port 4000
  const isDevPort = window.location.port === '3000' || window.location.port === '5173' || window.location.port === '3001';
  if (isDevPort) return 'http://localhost:4000';

  // If deployed standalone on Vercel without external backend, run client-side
  if (window.location.hostname.endsWith('vercel.app')) {
    return '';
  }

  // Same-origin fallback (when hosted unified on Render, Railway, or Docker)
  return '';
}

export function getCollabWsUrl(): string {
  if (typeof window === 'undefined') return '';

  // Explicit environment variable override (ignore dead placeholder domains)
  const envWs = (import.meta as any).env?.VITE_COLLAB_WS_URL;
  if (envWs && !envWs.includes('bluprnt-ws.onrender.com')) {
    return envWs;
  }

  // Local development ports connect to local backend WebSocket
  const isDevPort = window.location.port === '3000' || window.location.port === '5173' || window.location.port === '3001';
  if (isDevPort) return 'ws://localhost:4000/collab';

  // Production Vercel or cloud static deployment: connect to high-availability Yjs collaborative relay
  if (window.location.hostname.endsWith('vercel.app') || window.location.hostname.includes('vercel')) {
    return 'wss://demos.yjs.dev/ws';
  }

  // Same-origin fallback (when hosted unified on Render, Railway, or Docker)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/collab`;
}
