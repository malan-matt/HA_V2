/** Default WebSocket server port (must match `node src/server.js --port=...`). */
export const DEFAULT_WS_PORT = 8080;

export const WS_PORT_STORAGE_KEY = 'skytrack_ws_port';

export function getWebSocketPort(): number {
  if (typeof sessionStorage === 'undefined') {
    return DEFAULT_WS_PORT;
  }
  const stored = sessionStorage.getItem(WS_PORT_STORAGE_KEY);
  const port = stored ? parseInt(stored, 10) : DEFAULT_WS_PORT;
  return Number.isFinite(port) ? port : DEFAULT_WS_PORT;
}

export function setWebSocketPort(port: number): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(WS_PORT_STORAGE_KEY, String(port));
  }
}
