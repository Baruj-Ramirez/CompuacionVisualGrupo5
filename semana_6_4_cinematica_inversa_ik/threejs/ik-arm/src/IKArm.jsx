import { useRef, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// ─── Config ───────────────────────────────────────────────────────────────────
const NUM_SEGMENTS = 5;
const SEGMENT_LENGTH = 1.2;
const BOX_W = 0.22;
const BOX_H = 0.14;
const TOLERANCE = 0.05;

// ─── Colour palette ───────────────────────────────────────────────────────────
const PALETTE = {
  bg: "#0d0f18",
  floor: "#12151f",
  floorLine: "#1e2235",
  link: (i) => {
    const hues = [210, 225, 240, 255, 270];
    return `hsl(${hues[i % hues.length]}, 80%, 58%)`;
  },
  joint: "#e2e8ff",
  target: "#f96060",
  targetHover: "#ff8080",
  line: "#ffffff22",
  baseLine: "#4455ff88",
};

// ─── FABRIK IK solver ─────────────────────────────────────────────────────────
function solveFABRIK(positions, target, base) {
  const n = positions.length;
  const lens = [];
  for (let i = 0; i < n - 1; i++) {
    lens.push(positions[i].distanceTo(positions[i + 1]));
  }

  const totalLen = lens.reduce((a, b) => a + b, 0);
  const dist = base.distanceTo(target);

  if (dist > totalLen) {
    // Fully extended toward target
    for (let i = 0; i < n - 1; i++) {
      const r = target.distanceTo(positions[i]);
      const lambda = lens[i] / r;
      positions[i + 1].lerpVectors(positions[i], target, lambda);
    }
    return positions;
  }

  const origBase = positions[0].clone();
  const ITERATIONS = 10;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Forward pass (tip → base)
    positions[n - 1].copy(target);
    for (let i = n - 2; i >= 0; i--) {
      const r = positions[i + 1].distanceTo(positions[i]);
      const lambda = lens[i] / r;
      positions[i].lerpVectors(positions[i + 1], positions[i], lambda);
    }

    // Backward pass (base → tip)
    positions[0].copy(origBase);
    for (let i = 0; i < n - 1; i++) {
      const r = positions[i].distanceTo(positions[i + 1]);
      const lambda = lens[i] / r;
      positions[i + 1].lerpVectors(positions[i], positions[i + 1], lambda);
    }

    if (positions[n - 1].distanceTo(target) < TOLERANCE) break;
  }

  return positions;
}

// ─── Drag target sphere ───────────────────────────────────────────────────────
function DragTarget({ targetPos, setTargetPos }) {
  const ref = useRef();
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const dragging = useRef(false);
  const [hovered, setHovered] = useState(false);
  const { camera, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const intersection = useRef(new THREE.Vector3());

  const onPointerDown = useCallback(
    (e) => {
      e.stopPropagation();
      dragging.current = true;
      gl.domElement.style.cursor = "grabbing";
    },
    [gl]
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
    gl.domElement.style.cursor = hovered ? "grab" : "auto";
  }, [gl, hovered]);

  const onPointerMove = useCallback(
    (e) => {
      if (!dragging.current) return;
      const rect = gl.domElement.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera({ x: nx, y: ny }, camera);
      if (
        raycaster.current.ray.intersectPlane(
          planeRef.current,
          intersection.current
        )
      ) {
        setTargetPos(
          new THREE.Vector3(
            intersection.current.x,
            intersection.current.y,
            0
          )
        );
      }
    },
    [camera, gl, setTargetPos]
  );

  useEffect(() => {
    const el = gl.domElement;
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    return () => {
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
    };
  }, [gl, onPointerMove, onPointerUp]);

  useFrame(() => {
    if (ref.current) {
      ref.current.position.copy(targetPos);
    }
  });

  return (
    <group>
      {/* Glow ring */}
      <mesh position={targetPos}>
        <torusGeometry args={[0.38, 0.03, 8, 32]} />
        <meshBasicMaterial
          color={hovered ? PALETTE.targetHover : PALETTE.target}
          transparent
          opacity={0.4}
        />
      </mesh>
      {/* Main sphere */}
      <mesh
        ref={ref}
        onPointerDown={onPointerDown}
        onPointerEnter={() => {
          setHovered(true);
          gl.domElement.style.cursor = "grab";
        }}
        onPointerLeave={() => {
          setHovered(false);
          if (!dragging.current) gl.domElement.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[0.28, 24, 24]} />
        <meshStandardMaterial
          color={hovered ? PALETTE.targetHover : PALETTE.target}
          emissive={hovered ? PALETTE.targetHover : PALETTE.target}
          emissiveIntensity={0.35}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>
    </group>
  );
}

// ─── Single link (box + joint sphere) ─────────────────────────────────────────
function ArmLink({ color, index }) {
  return (
    <group>
      {/* Box body centred between joint and next joint */}
      <mesh position={[SEGMENT_LENGTH / 2, 0, 0]}>
        <boxGeometry args={[SEGMENT_LENGTH * 0.88, BOX_H, BOX_W]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.18}
          roughness={0.25}
          metalness={0.7}
        />
      </mesh>
      {/* Joint sphere at origin of this group */}
      <mesh>
        <sphereGeometry args={[0.115, 16, 16]} />
        <meshStandardMaterial
          color={PALETTE.joint}
          emissive={PALETTE.joint}
          emissiveIntensity={0.2}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>
    </group>
  );
}

// ─── The arm ──────────────────────────────────────────────────────────────────
function RoboticArm({ targetPos }) {
  // Flat array of joint world positions (N+1 entries = joints + tip)
  const positions = useRef(
    Array.from({ length: NUM_SEGMENTS + 1 }, (_, i) =>
      new THREE.Vector3(i * SEGMENT_LENGTH, 0, 0)
    )
  );

  // One group ref per segment
  const groupRefs = useRef(
    Array.from({ length: NUM_SEGMENTS }, () => useRef())
  );

  // Visual line points (base → target)
  const [linePoints, setLinePoints] = useState([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(NUM_SEGMENTS * SEGMENT_LENGTH, 0, 0),
  ]);

  const basePos = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(() => {
    // Run FABRIK
    const solved = solveFABRIK(
      positions.current,
      targetPos.clone(),
      basePos.current
    );

    // Orient each group to face the next position
    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const g = groupRefs.current[i].current;
      if (!g) continue;
      g.position.copy(solved[i]);
      const dir = new THREE.Vector3().subVectors(solved[i + 1], solved[i]);
      if (dir.lengthSq() > 0.0001) {
        const angle = Math.atan2(dir.y, dir.x);
        g.rotation.z = angle;
      }
    }

    setLinePoints([basePos.current.clone(), targetPos.clone()]);
  });

  return (
    <>
      {Array.from({ length: NUM_SEGMENTS }, (_, i) => (
        <group key={i} ref={groupRefs.current[i]}>
          <ArmLink color={PALETTE.link(i)} index={i} />
        </group>
      ))}

      {/* Tip cap */}
      <TipCap positions={positions} />

      {/* Base → target guide line */}
      <Line
        points={linePoints}
        color="#4466ff"
        lineWidth={1}
        transparent
        opacity={0.35}
        dashed
        dashSize={0.18}
        gapSize={0.12}
      />
    </>
  );
}

// ─── Tip cap (end-effector indicator) ─────────────────────────────────────────
function TipCap({ positions }) {
  const ref = useRef();
  useFrame(() => {
    if (ref.current) {
      ref.current.position.copy(positions.current[NUM_SEGMENTS]);
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.13, 16, 16]} />
      <meshStandardMaterial
        color="#88aaff"
        emissive="#6688ff"
        emissiveIntensity={0.5}
        roughness={0.1}
        metalness={0.9}
      />
    </mesh>
  );
}

// ─── Background grid plane ─────────────────────────────────────────────────────
function BackgroundPlane() {
  return (
    <mesh rotation={[0, 0, 0]} position={[0, 0, -0.5]}>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#0e1120" roughness={1} metalness={0} />
    </mesh>
  );
}

// ─── Grid lines overlay ────────────────────────────────────────────────────────
function GridLines() {
  const lines = [];
  const step = 1;
  const range = 12;
  for (let x = -range; x <= range; x += step) {
    lines.push(
      <Line
        key={`v${x}`}
        points={[
          new THREE.Vector3(x, -range, -0.48),
          new THREE.Vector3(x, range, -0.48),
        ]}
        color="#1e2540"
        lineWidth={0.6}
      />
    );
  }
  for (let y = -range; y <= range; y += step) {
    lines.push(
      <Line
        key={`h${y}`}
        points={[
          new THREE.Vector3(-range, y, -0.48),
          new THREE.Vector3(range, y, -0.48),
        ]}
        color="#1e2540"
        lineWidth={0.6}
      />
    );
  }
  return <>{lines}</>;
}

// ─── Scene root ───────────────────────────────────────────────────────────────
function Scene() {
  const [targetPos, setTargetPos] = useState(
    new THREE.Vector3(4, 2.5, 0)
  );

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 6]} intensity={1.1} castShadow />
      <pointLight position={[-4, 3, 2]} intensity={0.6} color="#8899ff" />

      <BackgroundPlane />
      <GridLines />
      <RoboticArm targetPos={targetPos} />
      <DragTarget targetPos={targetPos} setTargetPos={setTargetPos} />

      <OrbitControls
        enableRotate={false}
        enableZoom
        enablePan
        mouseButtons={{ LEFT: undefined, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
      />
    </>
  );
}

// ─── UI overlay ───────────────────────────────────────────────────────────────
const overlayStyle = {
  position: "absolute",
  bottom: 18,
  left: 18,
  color: "#8899cc",
  fontFamily: "'Courier New', monospace",
  fontSize: 12,
  lineHeight: 1.7,
  pointerEvents: "none",
  userSelect: "none",
};

const titleStyle = {
  position: "absolute",
  top: 18,
  left: 20,
  color: "#aabbff",
  fontFamily: "'Courier New', monospace",
  fontSize: 13,
  letterSpacing: "0.12em",
  pointerEvents: "none",
  userSelect: "none",
};

const badgeStyle = {
  position: "absolute",
  top: 18,
  right: 20,
  background: "#ffffff0f",
  border: "1px solid #ffffff18",
  borderRadius: 6,
  padding: "3px 10px",
  color: "#6677bb",
  fontFamily: "'Courier New', monospace",
  fontSize: 11,
  pointerEvents: "none",
};

// ─── Root export ──────────────────────────────────────────────────────────────
export default function IKArm() {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0d0f18", position: "relative" }}>
      <Canvas
        camera={{ position: [3, 2, 10], fov: 50 }}
        gl={{ antialias: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene />
      </Canvas>

      <div style={titleStyle}>IK ARM · FABRIK SOLVER</div>
      <div style={badgeStyle}>R3F + Three.js</div>
      <div style={overlayStyle}>
        <div>🔴 drag target sphere</div>
        <div>⚙️  scroll to zoom · right-drag to pan</div>
        <div>━━━━━━━━━━━━━━━━━━</div>
        <div>segments : {NUM_SEGMENTS}</div>
        <div>length / seg : {SEGMENT_LENGTH}</div>
        <div>solver : FABRIK</div>
      </div>
    </div>
  );
}
