import { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_WS_URL = 'ws://localhost:8765';
const HISTORY_SIZE = 60; // number of data points to keep

/**
 * Custom hook that manages a single WebSocket connection.
 *
 * @param {boolean} autoConnect  - Open the connection immediately on mount.
 * @param {string}  url          - WebSocket URL. Defaults to ws://localhost:8765.
 *
 * Returns:
 *   data     – latest parsed JSON message ({ x, y, color, t, ... })
 *   status   – 'connecting' | 'connected' | 'disconnected' | 'error'
 *   history  – array of the last HISTORY_SIZE messages
 *   connect  – callback to (re-)open the connection
 *   disconnect – callback to close the connection
 */
export function useWebSocket(autoConnect = true, url = DEFAULT_WS_URL) {
  const [data,    setData]    = useState(null);
  const [status,  setStatus]  = useState('disconnected');
  const [history, setHistory] = useState([]);
  const wsRef = useRef(null);

  const connect = useCallback(() => {
    // Avoid opening a duplicate connection
    if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) return;

    setStatus('connecting');
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen  = () => setStatus('connected');
    ws.onclose = () => setStatus('disconnected');
    ws.onerror = () => setStatus('error');

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setData(parsed);
        setHistory((prev) => {
          const next = [...prev, parsed];
          return next.length > HISTORY_SIZE ? next.slice(-HISTORY_SIZE) : next;
        });
      } catch {
        // Ignore malformed messages
      }
    };
  }, [url]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('disconnected');
  }, []);

  useEffect(() => {
    if (autoConnect) connect();
    return () => wsRef.current?.close();
  }, [autoConnect, connect]);

  return { data, status, history, connect, disconnect };
}
