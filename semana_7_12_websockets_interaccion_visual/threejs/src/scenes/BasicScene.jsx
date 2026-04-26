import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Line, Text } from '@react-three/drei';
import * as THREE from 'three';

// Maps server color names to hex values used in Three.js materials
const COLOR_MAP = {
  red:    '#ef4444',
  green:  '#22c55e',
  blue:   '#3b82f6',
  yellow: '#eab308',
  orange: '#f97316',
  purple: '#a855f7',
};

const STATUS_LABEL = {
  connected:    'Conectado',
  connecting:   'Conectando...',
  disconnected: 'Desconectado',
  error:        'Error de conexión',
};
const STATUS_COLOR = {
  connected:    '#22c55e',
  connecting:   '#eab308',
  disconnected: '#6b7280',
  error:        '#ef4444',
};

// ─── 3-D components ──────────────────────────────────────────────────────────

/**
 * Sphere that moves and changes color smoothly as WebSocket messages arrive.
 * Uses frame-rate-independent exponential lerp so the animation looks fluid
 * regardless of rendering speed.
 */
function LiveSphere({ data }) {
  const meshRef     = useRef();
  const targetPos   = useRef(new THREE.Vector3());
  const targetColor = useRef(new THREE.Color('#ef4444'));

  // Update targets synchronously (not in useFrame) so they're always current
  if (data) {
    targetPos.current.set(data.x, data.y, 0);
    targetColor.current.set(COLOR_MAP[data.color] ?? data.color);
  }

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // 1 - e^(-k·Δt) gives frame-rate-independent smoothing (k = 6 → ~90 % in 0.4 s)
    const t = 1 - Math.exp(-6 * delta);
    meshRef.current.position.lerp(targetPos.current, t);
    meshRef.current.material.color.lerp(targetColor.current, t);
    meshRef.current.rotation.y += delta * 0.9;
    meshRef.current.rotation.x += delta * 0.4;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.6, 48, 48]} />
      <meshStandardMaterial roughness={0.15} metalness={0.75} emissive="#000" emissiveIntensity={0.1} />
    </mesh>
  );
}

/**
 * Draws the XY path followed by the sphere over the last N frames.
 * Geschichte is re-derived from React state (arrives at ~2 Hz), so geometry
 * recreation is inexpensive.
 */
function TrailLine({ history }) {
  const points = useMemo(
    () => history.map((d) => new THREE.Vector3(d.x, d.y, 0)),
    [history]
  );

  if (points.length < 2) return null;

  return (
    <Line
      points={points}
      color="#6366f1"
      lineWidth={1.5}
      transparent
      opacity={0.45}
      dashed={false}
    />
  );
}

/**
 * XY axis helpers so the scene orientation is immediately clear.
 */
function AxisLabels() {
  return (
    <>
      <Text position={[6.2, 0, 0]} fontSize={0.25} color="#6b7280">X</Text>
      <Text position={[0, 6.2, 0]} fontSize={0.25} color="#6b7280">Y</Text>
    </>
  );
}

// ─── HTML utility components ─────────────────────────────────────────────────

/**
 * Small 2-D signal chart rendered on an HTML canvas.
 * Draws X (blue) and Y (rose) values over time as overlaid sparklines.
 */
function SignalChart({ history }) {
  const canvasRef = useRef();
  const W = 198, H = 68;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length < 2) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(99,102,241,0.12)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * H;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    const drawSeries = (series, color) => {
      const min = Math.min(...series), max = Math.max(...series);
      const range = max - min || 1;
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      series.forEach((v, i) => {
        const px = (i / (series.length - 1)) * (W - 4) + 2;
        const py = H - ((v - min) / range) * (H - 8) - 4;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.stroke();
    };

    drawSeries(history.map((d) => d.x), '#3b82f6'); // X – blue
    drawSeries(history.map((d) => d.y), '#f43f5e'); // Y – rose
  }, [history]);

  return (
    <div className="chart-wrap">
      <div className="chart-legend">
        <span style={{ color: '#3b82f6' }}>■ X</span>
        <span style={{ color: '#f43f5e' }}>■ Y</span>
      </div>
      <canvas ref={canvasRef} width={W} height={H} className="signal-canvas" />
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function BasicScene({ data, status, history }) {
  return (
    <div className="scene-container">
      {/* ── 3D Canvas ── */}
      <Canvas camera={{ position: [0, 0, 14], fov: 48 }}>
        <color attach="background" args={['#0b0b18']} />

        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[6, 8, 6]}  intensity={1.1} />
        <pointLight      position={[-5, -4, 4]}  color="#6366f1" intensity={1.2} />

        {/* World helpers */}
        <Grid
          args={[24, 24]}
          cellSize={1}
          cellColor="#1a1a2e"
          sectionColor="#2a2a48"
          fadeDistance={22}
          position={[0, -5, 0]}
        />

        {/* Axis reference lines */}
        <Line points={[[-6, 0, 0], [6, 0, 0]]} color="#374151" lineWidth={0.5} dashed={false} />
        <Line points={[[0, -6, 0], [0, 6, 0]]} color="#374151" lineWidth={0.5} dashed={false} />
        <AxisLabels />

        {/* Data-driven objects */}
        <TrailLine history={history} />
        <LiveSphere data={data} />

        <OrbitControls makeDefault enablePan={false} />
      </Canvas>

      {/* ── HUD – top-right panel ── */}
      <div className="hud hud-tr">
        <p className="hud-title">Escena Básica</p>

        {/* Connection status */}
        <div className="hud-row">
          <span className="dot" style={{ background: STATUS_COLOR[status] }} />
          <span>{STATUS_LABEL[status]}</span>
        </div>

        {/* Live values */}
        {data ? (
          <>
            <div className="hud-row">
              <span className="hud-label">x</span>
              <span className="hud-val">{data.x.toFixed(3)}</span>
            </div>
            <div className="hud-row">
              <span className="hud-label">y</span>
              <span className="hud-val">{data.y.toFixed(3)}</span>
            </div>
            <div className="hud-row">
              <span className="hud-label">color</span>
              <span className="swatch" style={{ background: COLOR_MAP[data.color] ?? data.color }} />
              <span className="hud-val">{data.color}</span>
            </div>
            <div className="hud-row">
              <span className="hud-label">tick</span>
              <span className="hud-val">{data.t}</span>
            </div>
            <div className="hud-row">
              <span className="hud-label">msgs</span>
              <span className="hud-val">{history.length}</span>
            </div>
          </>
        ) : (
          <p className="hud-hint">Esperando datos…</p>
        )}

        {/* Signal chart */}
        {history.length > 2 && <SignalChart history={history} />}

        <p className="hud-hint">🖱 Arrastra para orbitar · Scroll para zoom</p>
      </div>
    </div>
  );
}
