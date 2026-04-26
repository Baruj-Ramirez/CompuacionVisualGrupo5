import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useMultipleWebSockets } from '../hooks/useMultipleWebSockets';

// ─── Agent configuration ─────────────────────────────────────────────────────

const AGENT_COUNT = 4;
const AGENT_NAMES  = ['Alpha', 'Beta', 'Gamma', 'Delta'];
// Base color per agent (used for glow, trail, HUD card border)
const AGENT_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b'];

// Maps server color string → hex for the material
const COLOR_MAP = {
  red:    '#ef4444',
  green:  '#22c55e',
  blue:   '#3b82f6',
  yellow: '#eab308',
  orange: '#f97316',
  purple: '#a855f7',
};

const STATUS_DOT = {
  connected:    '#22c55e',
  connecting:   '#eab308',
  disconnected: '#6b7280',
  error:        '#ef4444',
};

// ─── 3-D components ──────────────────────────────────────────────────────────

/**
 * Single agent rendered as a glowing metallic sphere with a positional trail.
 *
 * The position/color are smoothly interpolated toward the latest WebSocket
 * target using frame-rate-independent exponential lerp.
 * The trail is updated directly on a pre-allocated BufferGeometry inside
 * useFrame so it never triggers a React re-render.
 */
function AgentMesh({ agentData, agentColor, name }) {
  const groupRef  = useRef();
  const sphereRef = useRef();
  const lineRef   = useRef();

  const targetPos   = useRef(new THREE.Vector3());
  const targetColor = useRef(new THREE.Color(agentColor));

  // Trail state kept in a plain ref – no React state needed
  const trailBuf = useRef([]); // array of THREE.Vector3 snapshots
  const MAX_TRAIL = 30;

  // Pre-allocate BufferGeometry so we never create new objects per frame
  const trailGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(MAX_TRAIL * 3), 3)
    );
    geo.setDrawRange(0, 0);
    return geo;
  }, []);

  // Update targets whenever new data arrives (outside useFrame → always fresh)
  if (agentData?.data) {
    targetPos.current.set(agentData.data.x, agentData.data.y, 0);
    targetColor.current.set(COLOR_MAP[agentData.data.color] ?? agentColor);
  }

  useFrame((_, delta) => {
    if (!groupRef.current || !sphereRef.current) return;

    // Frame-rate-independent lerp coefficient
    const t = 1 - Math.exp(-5 * delta);

    // Smooth position and color
    groupRef.current.position.lerp(targetPos.current, t);
    sphereRef.current.material.color.lerp(targetColor.current, t);
    sphereRef.current.rotation.y += delta * 1.1;

    // ── Update trail geometry ────────────────────────────────────────────
    const pos  = groupRef.current.position;
    const trail = trailBuf.current;
    const last  = trail[trail.length - 1];

    // Append a new snapshot only if the agent has moved enough
    if (!last || pos.distanceTo(last) > 0.05) {
      if (trail.length >= MAX_TRAIL) trail.shift();
      trail.push(pos.clone());

      const attr = trailGeo.attributes.position;
      trail.forEach((p, i) => attr.setXYZ(i, p.x, p.y, p.z));
      attr.needsUpdate = true;
      trailGeo.setDrawRange(0, trail.length);
      trailGeo.computeBoundingSphere();
    }
  });

  return (
    <group ref={groupRef}>
      {/* Trail line – geometry updated directly via ref; no React re-render */}
      <line ref={lineRef} geometry={trailGeo}>
        <lineBasicMaterial color={agentColor} transparent opacity={0.4} />
      </line>

      {/* Outer glow ring */}
      <mesh>
        <sphereGeometry args={[0.52, 16, 16]} />
        <meshStandardMaterial
          color={agentColor}
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>

      {/* Main metallic sphere */}
      <mesh ref={sphereRef}>
        <sphereGeometry args={[0.38, 48, 48]} />
        <meshStandardMaterial
          color={agentColor}
          roughness={0.12}
          metalness={0.8}
          emissive={agentColor}
          emissiveIntensity={0.18}
        />
      </mesh>

      {/* Floating name label */}
      <Text
        position={[0, 0.78, 0]}
        fontSize={0.22}
        color="white"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.025}
        outlineColor="#000000"
      >
        {name}
      </Text>
    </group>
  );
}

/** Full 3-D scene: background, lights, grid, stars, all agents */
function Scene3D({ agents }) {
  return (
    <Canvas camera={{ position: [0, 0, 18], fov: 50 }}>
      <color attach="background" args={['#080811']} />

      {/* Ambient + coloured fill lights */}
      <ambientLight intensity={0.2} />
      <directionalLight position={[8, 10, 6]} intensity={0.9} />
      <pointLight position={[-8, -6, 4]}  color="#6366f1" intensity={1.4} />
      <pointLight position={[ 8,  6, -4]} color="#f59e0b" intensity={0.6} />

      {/* Environment */}
      <Stars radius={120} depth={60} count={3000} factor={3} saturation={0} />
      <Grid
        args={[28, 28]}
        cellSize={1}
        cellColor="#13132a"
        sectionColor="#23234a"
        fadeDistance={26}
        position={[0, -6, 0]}
      />

      {/* Agents */}
      {agents.map((agent, i) => (
        <AgentMesh
          key={i}
          agentData={agent}
          agentColor={AGENT_COLORS[i]}
          name={AGENT_NAMES[i]}
        />
      ))}

      <OrbitControls makeDefault enablePan={false} />
    </Canvas>
  );
}

// ─── HTML side panel ─────────────────────────────────────────────────────────

/** Individual card for one agent in the side panel. */
function AgentCard({ agent, index }) {
  const { status, data } = agent;
  const color = AGENT_COLORS[index];
  const name  = AGENT_NAMES[index];

  return (
    <div className="agent-card" style={{ '--agent-color': color }}>
      <div className="agent-card-header">
        <span className="agent-avatar" style={{ background: color }}>{name[0]}</span>
        <span className="agent-name">{name}</span>
        <span className="dot" style={{ background: STATUS_DOT[status], marginLeft: 'auto' }} />
      </div>

      {data ? (
        <div className="agent-card-body">
          <div className="kv">
            <span className="k">x</span>
            <span className="v">{data.x.toFixed(3)}</span>
          </div>
          <div className="kv">
            <span className="k">y</span>
            <span className="v">{data.y.toFixed(3)}</span>
          </div>
          <div className="kv">
            <span className="k">color</span>
            <span className="swatch" style={{ background: COLOR_MAP[data.color] ?? data.color }} />
            <span className="v">{data.color}</span>
          </div>
          <div className="kv">
            <span className="k">tick</span>
            <span className="v">{data.t}</span>
          </div>
        </div>
      ) : (
        <p className="connecting-txt">
          {status === 'connecting' ? 'Conectando…' : 'Sin datos'}
        </p>
      )}
    </div>
  );
}

/** HTML overlay panel that lists all agents with their live values. */
function AgentsPanel({ agents }) {
  const connected = agents.filter((a) => a.status === 'connected').length;

  return (
    <div className="agents-panel">
      <p className="panel-title">Panel de Agentes</p>
      <p className="panel-subtitle">
        {connected}/{AGENT_COUNT} conexiones activas · ws://localhost:8765
      </p>

      <div className="agent-list">
        {agents.map((agent, i) => (
          <AgentCard key={i} agent={agent} index={i} />
        ))}
      </div>

      <div className="panel-legend">
        <p className="legend-title">Leyenda de gestos</p>
        <p>Cada esfera es un cliente WS independiente.</p>
        <p>El servidor genera una caminata aleatoria por cliente.</p>
      </div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Multi-agent real-time panel (Taller item 4).
 *
 * Opens AGENT_COUNT independent WebSocket connections. Each agent has its
 * own server-side handler with a unique random walk, so their positions are
 * truly independent. The 3-D scene shows all agents simultaneously with
 * smooth interpolation and positional trails.
 */
export default function AgentsScene() {
  // Each element: { status, data, history }
  const agents = useMultipleWebSockets(AGENT_COUNT);

  return (
    <div className="scene-container agents-layout">
      {/* 3-D viewport */}
      <div className="agents-canvas">
        <Scene3D agents={agents} />

        {/* Control hint */}
        <p className="orbit-hint">🖱 Arrastra para orbitar · Scroll para zoom</p>
      </div>

      {/* Side panel */}
      <AgentsPanel agents={agents} />
    </div>
  );
}
