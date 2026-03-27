import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useTexture, OrbitControls } from '@react-three/drei'
import { useControls, Leva } from 'leva'

// ─── PBR Sphere ───────────────────────────────────────
function PBRSphere({ roughness, metalness }) {
  const ref = useRef()

  const [colorMap, normalMap, roughnessMap] = useTexture([
    '/rusty_metal_04_diff_1k.png',
    '/rusty_metal_04_nor_gl_1k.png',
    '/rusty_metal_04_rough_1k.png',
  ])

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.4
  })

  return (
    <mesh ref={ref} position={[1.8, 0.8, 0]} castShadow>
      <sphereGeometry args={[0.8, 64, 64]} />
      <meshStandardMaterial
        map={colorMap}
        normalMap={normalMap}
        roughnessMap={roughnessMap}
        roughness={roughness}
        metalness={metalness}
      />
    </mesh>
  )
}

// ─── Basic Box ────────────────────────────────────────
function BasicBox() {
  const ref = useRef()

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.4
  })

  return (
    <mesh ref={ref} position={[-1.8, 0.8, 0]} castShadow>
      <boxGeometry args={[1.4, 1.4, 1.4]} />
      <meshBasicMaterial color="#e07b39" />
    </mesh>
  )
}

// ─── Floor ────────────────────────────────────────────
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[12, 12]} />
      <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
    </mesh>
  )
}

// ─── Scene ────────────────────────────────────────────
function SceneContents() {
  const { roughness, metalness } = useControls('PBR Material', {
    roughness: { value: 0.5, min: 0, max: 1, step: 0.01 },
    metalness: { value: 0.8, min: 0, max: 1, step: 0.01 },
  })

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      <Floor />
      <BasicBox />
      <PBRSphere roughness={roughness} metalness={metalness} />

      <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2} />
    </>
  )
}

// ─── Root UI ──────────────────────────────────────────
export function Scene() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0d0d0d', position: 'relative' }}>

      {/* 🔥 Header PRO */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '14px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.75), transparent)',
        zIndex: 10,
        fontFamily: 'monospace',
        pointerEvents: 'none'
      }}>
        <span style={{ color: '#fff', letterSpacing: 2, fontSize: 12 }}>
          THREE.JS · R3F
        </span>
        <span style={{ color: '#666', fontSize: 11 }}>
          Material Comparison
        </span>
      </div>

      {/* 🔥 Labels mejorados */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        transform: 'translateY(-120px)',
        display: 'flex',
        justifyContent: 'space-around',
        paddingInline: '12%',
        zIndex: 10,
        pointerEvents: 'none',
        fontFamily: 'monospace',
        fontSize: 11,
        letterSpacing: 1,
        textTransform: 'uppercase',
      }}>
        <span style={{ color: '#e07b39', textShadow: '0 2px 6px black' }}>
          MeshBasicMaterial
        </span>
        <span style={{ color: '#8ecae6', textShadow: '0 2px 6px black' }}>
          MeshStandardMaterial
        </span>
      </div>

      {/* 🔥 Footer / Legend */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        color: '#777',
        fontSize: 11,
        fontFamily: 'monospace',
        lineHeight: 1.8,
        zIndex: 10,
        pointerEvents: 'none'
      }}>
        <div><span style={{ color: '#e07b39' }}>●</span> No lighting (Basic)</div>
        <div><span style={{ color: '#8ecae6' }}>●</span> PBR + textures</div>
        <div style={{ marginTop: 6, color: '#444' }}>
          Drag to rotate · Scroll to zoom
        </div>
      </div>

      {/* 🔥 Leva panel estilizado */}
      <Leva
        collapsed={false}
        theme={{
          colors: {
            elevation1: '#111',
            elevation2: '#1a1a1a',
            elevation3: '#222',
            accent1: '#8ecae6',
            accent2: '#5aa9d6',
            accent3: '#3d7fa3',
            highlight1: '#aaa',
            highlight2: '#ccc',
            highlight3: '#fff',
          },
          fontSizes: { root: '12px' },
          sizes: { rootWidth: '260px' },
        }}
        titleBar={{ title: '⚙ Controls', drag: false }}
      />

      <Canvas
        shadows
        camera={{ position: [0, 3, 7], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        <SceneContents />
      </Canvas>
    </div>
  )
}