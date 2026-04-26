import { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import BasicScene   from './scenes/BasicScene';
import AgentsScene  from './scenes/AgentsScene';
import CardiacScene from './scenes/CardiacScene';
import './App.css';

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  {
    id:    'basic',
    label: '📡 Escena Básica',
    desc:  'Una esfera controlada por WebSocket en tiempo real',
  },
  {
    id:    'agents',
    label: '🤖 Panel de Agentes',
    desc:  'Múltiples agentes con conexiones WebSocket independientes',
  },
  {
    id:    'cardiac',
    label: '💓 Señal Cardíaca',
    desc:  'ECG sintético + panel de control externo (ws://localhost:8766)',
  },
];

// ─── Status dot label ─────────────────────────────────────────────────────────
const STATUS_LABEL = {
  connected:    '●  Conectado',
  connecting:   '●  Conectando…',
  disconnected: '●  Desconectado',
  error:        '●  Error',
};
const STATUS_CLASS = {
  connected:    'ws-connected',
  connecting:   'ws-connecting',
  disconnected: 'ws-disconnected',
  error:        'ws-error',
};

// ─── Root component ──────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState('basic');

  // Single shared WebSocket for the basic scene
  // (AgentsScene manages its own 4 connections internally)
  const ws = useWebSocket(true);

  return (
    <div className="app">
      {/* ── Top navigation bar ── */}
      <header className="topbar">
        <div className="brand">⬡ WebSockets Visual</div>

        <nav className="tab-nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.desc}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Global WS status – reflects the shared connection (basic scene) */}
        <div className={`ws-status ${STATUS_CLASS[ws.status]}`}>
          {STATUS_LABEL[ws.status]}
          <span className="ws-url">ws://localhost:8765</span>
        </div>
      </header>

      {/* ── Scene stage ── */}
      <main className="stage">
        {activeTab === 'basic' && (
          <BasicScene data={ws.data} status={ws.status} history={ws.history} />
        )}
        {activeTab === 'agents'  && <AgentsScene />}
        {activeTab === 'cardiac' && <CardiacScene />}
      </main>
    </div>
  );
}

// This file intentionally left trimmed – all template JSX removed.

