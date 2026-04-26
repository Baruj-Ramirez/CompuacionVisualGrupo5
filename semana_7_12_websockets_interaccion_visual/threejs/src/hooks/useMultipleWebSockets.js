import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL     = 'ws://localhost:8765';
const HISTORY_SIZE = 50;

/**
 * Opens `count` independent WebSocket connections to the Python server.
 * Each connection runs its own random-walk handler on the server side,
 * so every agent receives truly independent position and color data.
 *
 * Returns an array of agent state objects:
 *   [{ status, data, history }, ...]
 */
export function useMultipleWebSockets(count) {
  const [agents, setAgents] = useState(() =>
    Array.from({ length: count }, () => ({
      status:  'connecting',
      data:    null,
      history: [],
    }))
  );

  const wsRefs = useRef([]);

  /** Patch a single agent's state without re-creating the whole array. */
  const updateAgent = useCallback((index, patch) => {
    setAgents((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  useEffect(() => {
    // Open one independent WS connection per agent
    wsRefs.current = Array.from({ length: count }, (_, i) => {
      const ws = new WebSocket(WS_URL);

      ws.onopen  = () => updateAgent(i, { status: 'connected' });
      ws.onclose = () => updateAgent(i, { status: 'disconnected' });
      ws.onerror = () => updateAgent(i, { status: 'error' });

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setAgents((prev) => {
            const next = [...prev];
            const history = [...next[i].history, data].slice(-HISTORY_SIZE);
            next[i] = { ...next[i], status: 'connected', data, history };
            return next;
          });
        } catch {
          // Ignore malformed messages
        }
      };

      return ws;
    });

    // Cleanup: close all connections when component unmounts
    return () => {
      wsRefs.current.forEach((ws) => ws.close());
    };
  }, [count, updateAgent]);

  return agents;
}
