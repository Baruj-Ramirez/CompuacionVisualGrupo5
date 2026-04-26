import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useWebSocket } from '../hooks/useWebSocket';

// ─── Constants ────────────────────────────────────────────────────────────────

const WS_BROADCAST_URL = 'ws://localhost:8766';
const BUFFER_SIZE = 180;
const ECG_SCALE   = 2.2;
const ECG_WIDTH   = 18;
const BEAT_THRESH = 0.8;

const COLORS = {
  red:     '#ef4444',
  green:   '#22c55e',
  blue:    '#3b82f6',
  yellow:  '#eab308',
  orange:  '#f97316',
  purple:  '#a855f7',
};

const STATUS_COLORS = {
  connected:    '#22c55e',
  connecting:   '#eab308',
  disconnected: '#6b7280',
  error:        '#ef4444',
};

// ─── 3D: Scrolling ECG waveform ───────────────────────────────────────────────

function ECGLine({ signalBufRef, ecgColorRef }) {
  const geo = useMemo(() => {
    const g   = new THREE.BufferGeometry();
    const pos = new Float32Array(BUFFER_SIZE * 3);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setDrawRange(0, 0);
    return g;
  }, []);

  const matRef = useRef();

  useFrame(() => {
    const buf = signalBufRef.current;
    if (buf.length < 2) return;

    // Update positions
    const attr = geo.attributes.position;
    const n    = buf.length;
    for (let i = 0; i < n; i++) {
      const x = ((i / BUFFER_SIZE) * ECG_WIDTH) - ECG_WIDTH / 2;
      attr.setXYZ(i, x, buf[i] * ECG_SCALE, 0);
    }
    attr.needsUpdate = true;
    geo.setDrawRange(0, n);
    geo.computeBoundingSphere();

    // Update color from ref (no React re-render needed)
    if (matRef.current && ecgColorRef.current) {
      matRef.current.color.set(ecgColorRef.current);
    }
  });

  return (
    <line geometry={geo}>
      <lineBasicMaterial ref={matRef} color="#ef4444" />
    </line>
  );
}

// ─── 3D: Reference grid lines ─────────────────────────────────────────────────

function ECGGrid() {
  const levels = [-ECG_SCALE * 0.5, 0, ECG_SCALE * 0.5, ECG_SCALE, ECG_SCALE * 1.2];
  return (
    <group>
      {levels.map((y) => {
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-ECG_WIDTH / 2 - 0.5, y, 0),
          new THREE.Vector3( ECG_WIDTH / 2 + 0.5, y, 0),
        ]);
        return (
          <line key={y} geometry={geo}>
            <lineBasicMaterial color={y === 0 ? '#1e2035' : '#10111e'} />
          </line>
        );
      })}
    </group>
  );
}

// ─── 3D: Pulsing heart sphere ─────────────────────────────────────────────────

function HeartSphere({ dataRef }) {
  const meshRef    = useRef();
  const glowRef    = useRef();
  const targetPos  = useRef(new THREE.Vector3(7, 0, 0));
  const targetCol  = useRef(new THREE.Color('#ef4444'));
  const glowCol    = useRef(new THREE.Color('#ef4444'));
  const pulseScale = useRef(1);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const d = dataRef.current;
    if (d) {
      const mode = d.mode ?? 'cardiac';
      const hex  = COLORS[d.color] ?? '#ef4444';

      if (mode === 'cardiac') {
        targetPos.current.set(7.5, (d.signal ?? 0) * ECG_SCALE, 0);
        const isBeating = (d.signal ?? 0) > BEAT_THRESH;
        targetCol.current.set(isBeating ? '#ffffff' : hex);
        glowCol.current.set(hex);
        if (isBeating) pulseScale.current = 1.5;
      } else {
        targetPos.current.set(d.x ?? 0, d.y ?? 0, 0);
        targetCol.current.set(hex);
        glowCol.current.set(hex);
      }
    }

    const t = 1 - Math.exp(-7 * delta);
    meshRef.current.position.lerp(targetPos.current, t);
    meshRef.current.material.color.lerp(targetCol.current, t);
    meshRef.current.material.emissive.lerp(glowCol.current, t);

    pulseScale.current = THREE.MathUtils.lerp(pulseScale.current, 1, 1 - Math.exp(-10 * delta));
    meshRef.current.scale.setScalar(pulseScale.current);
    meshRef.current.material.emissiveIntensity = THREE.MathUtils.lerp(
      meshRef.current.material.emissiveIntensity,
      pulseScale.current > 1.1 ? 0.9 : 0.18,
      t
    );

    if (glowRef.current) {
      glowRef.current.position.copy(meshRef.current.position);
      glowRef.current.scale.setScalar(pulseScale.current * 1.4);
      glowRef.current.material.color.lerp(glowCol.current, t);
    }
  });

  return (
    <group>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.52, 16, 16]} />
        <meshStandardMaterial color="#ef4444" transparent opacity={0.14} depthWrite={false} />
      </mesh>
      <mesh ref={meshRef} position={[7.5, 0, 0]}>
        <sphereGeometry args={[0.42, 48, 48]} />
        <meshStandardMaterial
          color="#ef4444"
          roughness={0.15}
          metalness={0.7}
          emissive="#ef4444"
          emissiveIntensity={0.18}
        />
      </mesh>
    </group>
  );
}

// ─── 3D: BPM / mode label ─────────────────────────────────────────────────────

function BpmLabel({ dataRef }) {
  return (
    <group>
      <Text position={[-ECG_WIDTH / 2, ECG_SCALE * 1.55, 0]} fontSize={0.27} color="#ef4444" anchorX="left">
        ECG Monitor · ws://localhost:8766
      </Text>
      <Text position={[ ECG_WIDTH / 2, ECG_SCALE * 1.55, 0]} fontSize={0.27} color="#ef4444" anchorX="right">
        ♥ BPM
      </Text>
    </group>
  );
}

// ─── Inline control panel (HTML) ─────────────────────────────────────────────

const PANEL_COLORS = Object.entries(COLORS);

function ControlPanel({ mode, bpm, selectedColor, signal, status, onSetMode, onSetBpm, onSetColor, onSetPosition, posX, posY }) {
  return (
    <div className="cardiac-panel">
      {/* Header */}
      <p className="panel-title">🎛 Panel de Control</p>
      <div className="hud-row" style={{ marginBottom: 8 }}>
        <span className="dot" style={{ background: STATUS_COLORS[status] }} />
        <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'ui-monospace, monospace' }}>
          {status} · ws:8766
        </span>
      </div>

      {/* ─ Mode ─ */}
      <p className="cp-section">Modo</p>
      <div className="cp-mode-btns">
        <button
          className={`cp-mode-btn ${mode === 'cardiac' ? 'active' : ''}`}
          onClick={() => onSetMode('cardiac')}
        >
          💓 Cardíaco
        </button>
        <button
          className={`cp-mode-btn ${mode === 'manual' ? 'active' : ''}`}
          onClick={() => onSetMode('manual')}
        >
          🎮 Manual
        </button>
      </div>

      {/* ─ Cardiac: BPM ─ */}
      {mode === 'cardiac' && (
        <>
          <p className="cp-section">Frecuencia cardíaca</p>
          <div className="cp-slider-row">
            <span className="cp-sl-label">BPM</span>
            <input
              type="range"
              min={30} max={200} value={bpm}
              onChange={(e) => onSetBpm(Number(e.target.value))}
            />
            <span className="cp-sl-val" style={{ color: '#ef4444', fontWeight: 700 }}>{bpm}</span>
          </div>

          {/* Live signal bar */}
          <div className="cp-section" style={{ marginBottom: 4 }}>Señal ECG</div>
          <div className="cp-sig-track">
            <div
              className="cp-sig-fill"
              style={{
                width: `${Math.min(100, Math.max(0, (signal / 1.5) * 100))}%`,
                background: signal > BEAT_THRESH ? '#ef4444' : COLORS[selectedColor],
              }}
            />
          </div>
          <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'ui-monospace, monospace' }}>
            {typeof signal === 'number' ? signal.toFixed(4) : '–'}
          </span>
        </>
      )}

      {/* ─ Manual: XY sliders ─ */}
      {mode === 'manual' && (
        <>
          <p className="cp-section">Posición en la escena</p>
          <div className="cp-slider-row">
            <span className="cp-sl-label">X</span>
            <input
              type="range" min={-5} max={5} step={0.05} value={posX}
              onChange={(e) => onSetPosition(Number(e.target.value), posY)}
            />
            <span className="cp-sl-val">{Number(posX).toFixed(2)}</span>
          </div>
          <div className="cp-slider-row">
            <span className="cp-sl-label">Y</span>
            <input
              type="range" min={-5} max={5} step={0.05} value={posY}
              onChange={(e) => onSetPosition(posX, Number(e.target.value))}
            />
            <span className="cp-sl-val">{Number(posY).toFixed(2)}</span>
          </div>
        </>
      )}

      {/* ─ Color picker ─ */}
      <p className="cp-section">Color del objeto</p>
      <div className="cp-color-grid">
        {PANEL_COLORS.map(([name, hex]) => (
          <button
            key={name}
            title={name}
            className={`cp-swatch ${selectedColor === name ? 'active' : ''}`}
            style={{ '--sw-color': hex }}
            onClick={() => onSetColor(name)}
          />
        ))}
      </div>

      {/* ─ Live readout ─ */}
      <p className="cp-section">Datos recibidos</p>
      <div className="cp-live">
        <div className="cp-kv"><span className="cp-k">modo</span><span className="cp-v">{mode}</span></div>
        <div className="cp-kv"><span className="cp-k">bpm</span>
          <span className="cp-v" style={{ color: '#ef4444' }}>{bpm}</span>
        </div>
        <div className="cp-kv"><span className="cp-k">señal</span>
          <span className="cp-v">{typeof signal === 'number' ? signal.toFixed(4) : '–'}</span>
        </div>
        <div className="cp-kv">
          <span className="cp-k">color</span>
          <span className="cp-swatch-inline" style={{ background: COLORS[selectedColor] }} />
          <span className="cp-v">{selectedColor}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function CardiacScene() {
  const { data, status, connect, disconnect } = useWebSocket(true, WS_BROADCAST_URL);

  // ── Refs (3D-side, updated without React re-renders) ──────────────────────
  const signalBufRef = useRef([]);
  const dataRef      = useRef(null);
  const ecgColorRef  = useRef('#ef4444');

  // ── React state (panel-side, controls what we send to the server) ─────────
  const [mode,          setModeState]  = useState('cardiac');
  const [bpm,           setBpmState]   = useState(72);
  const [selectedColor, setColorState] = useState('red');
  const [posX,          setPosX]       = useState(0);
  const [posY,          setPosY]       = useState(0);

  // Keep ecgColor ref in sync with selectedColor state
  useEffect(() => {
    ecgColorRef.current = COLORS[selectedColor] ?? '#ef4444';
  }, [selectedColor]);

  // Forward incoming server data to 3D refs
  useEffect(() => {
    if (!data) return;
    dataRef.current = data;
    const sig = typeof data.signal === 'number' ? data.signal : 0;
    const buf = signalBufRef.current;
    buf.push(sig);
    if (buf.length > BUFFER_SIZE) buf.splice(0, buf.length - BUFFER_SIZE);
  }, [data]);

  // ── Send helpers ──────────────────────────────────────────────────────────
  // We use the disconnect/connect cycle to get a ref to the underlying WS.
  // Simpler: open our own WS ref alongside the hook for sending commands only.
  const cmdWsRef = useRef(null);

  useEffect(() => {
    const open = () => {
      const ws = new WebSocket(WS_BROADCAST_URL);
      ws.onopen    = () => { cmdWsRef.current = ws; };
      ws.onclose   = () => { cmdWsRef.current = null; setTimeout(open, 2000); };
      ws.onerror   = () => {};
      ws.onmessage = () => {};   // data is read by the hook's own connection
    };
    open();
    return () => cmdWsRef.current?.close();
  }, []);

  const send = useCallback((obj) => {
    const ws = cmdWsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  }, []);

  // ── Panel callbacks (update local state + send to server) ─────────────────
  const handleSetMode = useCallback((m) => {
    setModeState(m);
    send({ type: 'set_mode', mode: m });
  }, [send]);

  const handleSetBpm = useCallback((v) => {
    setBpmState(v);
    send({ type: 'set_bpm', bpm: v });
  }, [send]);

  const handleSetColor = useCallback((name) => {
    setColorState(name);
    send({ type: 'set_color', color: name });
  }, [send]);

  const handleSetPosition = useCallback((x, y) => {
    setPosX(x);
    setPosY(y);
    send({ type: 'set_position', x, y });
  }, [send]);

  // Derive live values from last server message
  const liveBpm    = data?.bpm    ?? bpm;
  const liveSignal = data?.signal ?? 0;
  const liveMode   = data?.mode   ?? mode;

  return (
    <div className="scene-container cardiac-layout">

      {/* ── 3D Canvas ── */}
      <div className="cardiac-canvas">
        <Canvas camera={{ position: [0, 1.5, 14], fov: 48 }}>
          <color attach="background" args={['#060610']} />

          <ambientLight intensity={0.15} />
          <directionalLight position={[6, 8, 5]} intensity={0.8} />
          <pointLight position={[-4, 3, 5]} color="#ef4444" intensity={1.8} />
          <pointLight position={[ 8, 0, 4]} color="#6366f1" intensity={0.6} />

          <Stars radius={100} depth={50} count={2500} factor={3} saturation={0} />

          <Grid
            args={[26, 26]}
            cellSize={1}
            cellColor="#0d0d1e"
            sectionColor="#161628"
            fadeDistance={24}
            position={[0, -3.5, 0]}
          />

          <ECGGrid />
          <ECGLine signalBufRef={signalBufRef} ecgColorRef={ecgColorRef} />
          <HeartSphere dataRef={dataRef} />
          <BpmLabel dataRef={dataRef} />

          <OrbitControls makeDefault enablePan={false} />
        </Canvas>

        {/* Bottom-left badge */}
        <div
          className="mode-badge"
          style={{ borderColor: liveMode === 'cardiac' ? '#ef4444' : '#6366f1' }}
        >
          {liveMode === 'cardiac'
            ? `♥ Cardíaco · ${liveBpm} BPM`
            : `🎮 Manual · (${Number(posX).toFixed(1)}, ${Number(posY).toFixed(1)})`}
        </div>
      </div>

      {/* ── Inline Control Panel ── */}
      <ControlPanel
        mode={liveMode}
        bpm={liveBpm}
        selectedColor={selectedColor}
        signal={liveSignal}
        status={status}
        onSetMode={handleSetMode}
        onSetBpm={handleSetBpm}
        onSetColor={handleSetColor}
        onSetPosition={handleSetPosition}
        posX={posX}
        posY={posY}
      />
    </div>
  );
}
