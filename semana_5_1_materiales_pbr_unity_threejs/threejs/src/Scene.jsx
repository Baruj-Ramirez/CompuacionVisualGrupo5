import { useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useTexture, OrbitControls } from '@react-three/drei'
import { useControls, Leva, folder } from 'leva'
import * as THREE from 'three'


// ─── Styles defined outside components to avoid recreation on every render ────
const ROOT_STYLE = {
  width: '100vw',
  height: '100vh',
  background: '#0d0d0d',
  position: 'relative',
  overflow: 'hidden',
}

const CANVAS_STYLE = { width: '100%', height: '100%' }

// ─── Loader fallback (renders inside Canvas) ──────────────────────────────────
function Loader() {
  return (
    <mesh>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshBasicMaterial color="#8ecae6" wireframe />
    </mesh>
  )
}

// ─── PBR Sphere ───────────────────────────────────────────────────────────────
function PBRSphere({ roughness, metalness, envMapIntensity, rotate, wireframe }) {
  const ref = useRef()

  // Set SRGBColorSpace on the diffuse map so colours are linearised correctly
  const [colorMap, normalMap, roughnessMap, metalnessMap] = useTexture(
    [
      '/rusty_metal_04_diff_1k.png',
      '/rusty_metal_04_nor_gl_1k.png',
      '/rusty_metal_04_rough_1k.png',
      'rusty_metal_04_metal_1k.png',
    ],
    
    
    ([diff]) => {
      diff.colorSpace = THREE.SRGBColorSpace
    }
  )

  useFrame((_, delta) => {
    if (rotate && ref.current) ref.current.rotation.y += delta * 0.4
  })

  return (
    <mesh ref={ref} position={[1.8, 0.8, 0]} castShadow>
      {/* 32×32 is more than enough at this display size */}
      <sphereGeometry args={[0.8, 32, 32]} />
      <meshStandardMaterial
        map={colorMap}
        normalMap={normalMap}
        roughnessMap={roughnessMap}
        metalnessMap={metalnessMap}
        roughness={roughness}
        metalness={metalness}
        envMapIntensity={envMapIntensity}
        wireframe={wireframe}
      />
    </mesh>
  )
}

// ─── Basic Box ────────────────────────────────────────────────────────────────
function BasicBox({ color, rotate, wireframe }) {
  const ref = useRef()

  useFrame((_, delta) => {
    if (rotate && ref.current) ref.current.rotation.y += delta * 0.4
  })

  return (
    <mesh ref={ref} position={[-1.8, 0.8, 0]} castShadow>
      <boxGeometry args={[1.4, 1.4, 1.4]} />
      <meshBasicMaterial color={color} wireframe={wireframe} />
    </mesh>
  )
}

// ─── Floor ────────────────────────────────────────────────────────────────────
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[14, 14]} />
      <meshStandardMaterial color="#1e1e1e" roughness={0.95} metalness={0.0} />
    </mesh>
  )
}

// ─── All scene objects + controls ────────────────────────────────────────────
function SceneContents() {
  const {
    roughness,
    metalness,
    envMapIntensity,
    ambientIntensity,
    dirIntensity,
    boxColor,
    rotate,
    wireframe,
  } = useControls({
    'PBR Sphere': folder(
      {
        roughness:       { value: 0.5, min: 0, max: 1, step: 0.01, label: 'Roughness' },
        metalness:       { value: 0.8, min: 0, max: 1, step: 0.01, label: 'Metalness' },
        envMapIntensity: { value: 1.0, min: 0, max: 3, step: 0.05, label: 'Env Intensity' },
      },
      { collapsed: false }
    ),
    'Lights': folder(
      {
        ambientIntensity: { value: 0.4, min: 0, max: 2,   step: 0.05, label: 'Ambient' },
        dirIntensity:     { value: 1.5, min: 0, max: 5,   step: 0.1,  label: 'Directional' },
      },
      { collapsed: false }
    ),
    'Scene': folder(
      {
        boxColor:  { value: '#e07b39', label: 'Box Color' },
        rotate:    { value: true,      label: 'Auto-Rotate' },
        wireframe: { value: false,     label: 'Wireframe' },
      },
      { collapsed: false }
    ),
  })

  return (
    <>
      <ambientLight intensity={ambientIntensity} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={dirIntensity}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />

      <Floor />
      <BasicBox color={boxColor} rotate={rotate} wireframe={wireframe} />

      <Suspense fallback={<Loader />}>
        <PBRSphere
          roughness={roughness}
          metalness={metalness}
          envMapIntensity={envMapIntensity}
          rotate={rotate}
          wireframe={wireframe}
        />
      </Suspense>

      <OrbitControls
        makeDefault
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={3}
        maxDistance={14}
      />
    </>
  )
}

// ─── Root UI ──────────────────────────────────────────────────────────────────
export function Scene() {
  return (
    <div style={ROOT_STYLE}>

      {/* Header */}
      <header style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)',
        zIndex: 10,
        fontFamily: 'monospace',
        pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#8ecae6', fontSize: 15, fontWeight: 700, letterSpacing: 2 }}>
            PBR
          </span>
          <span style={{ color: '#444', fontSize: 15 }}>|</span>
          <span style={{ color: '#888', fontSize: 11, letterSpacing: 1 }}>
            Material Comparison · Three.js / R3F
          </span>
        </div>
        <span style={{ color: '#444', fontSize: 10, letterSpacing: 1 }}>
          MeshBasicMaterial &nbsp;vs&nbsp; MeshStandardMaterial
        </span>
      </header>

      {/* Object labels */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: 0, right: 0,
        transform: 'translateY(-145px)',
        display: 'flex',
        justifyContent: 'space-around',
        paddingInline: '10%',
        zIndex: 10,
        pointerEvents: 'none',
        fontFamily: 'monospace',
      }}>
        {/* Basic box label */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            color: '#e07b39',
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            textShadow: '0 2px 8px rgba(0,0,0,0.9)',
          }}>
            MeshBasicMaterial
          </div>
          <div style={{ color: '#555', fontSize: 10, marginTop: 3 }}>
            no lighting response
          </div>
        </div>

        {/* PBR sphere label */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            color: '#8ecae6',
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            textShadow: '0 2px 8px rgba(0,0,0,0.9)',
          }}>
            MeshStandardMaterial
          </div>
          <div style={{ color: '#555', fontSize: 10, marginTop: 3 }}>
            map · normalMap · roughnessMap · metalnessMap
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: 18,
        left: 20,
        zIndex: 10,
        pointerEvents: 'none',
        fontFamily: 'monospace',
        fontSize: 10,
        lineHeight: 2,
        color: '#444',
      }}>
        <div><span style={{ color: '#e07b39' }}>■</span>&nbsp; BoxGeometry — no shading</div>
        <div><span style={{ color: '#8ecae6' }}>●</span>&nbsp; SphereGeometry — PBR textures</div>
        <div style={{ marginTop: 4, color: '#333' }}>Drag · Zoom · Panel →</div>
      </div>

      {/* Leva panel */}
      <Leva
        collapsed={false}
        theme={{
          colors: {
            elevation1: '#0d0d0d',
            elevation2: '#161616',
            elevation3: '#1e1e1e',
            accent1: '#8ecae6',
            accent2: '#5aa9d6',
            accent3: '#3d7fa3',
            highlight1: '#666',
            highlight2: '#aaa',
            highlight3: '#fff',
            vivid1: '#8ecae6',
          },
          fontSizes: { root: '11px' },
          sizes: { rootWidth: '240px', rowHeight: '24px' },
          radii: { xs: '2px', sm: '3px', lg: '6px' },
          shadows: { level1: 'none', level2: '0 4px 20px rgba(0,0,0,0.8)' },
        }}
        titleBar={{ title: 'Controls', drag: true, filter: false }}
      />

      <Canvas
        shadows
        camera={{ position: [0, 3, 7], fov: 50 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        style={CANVAS_STYLE}
      >
        <SceneContents />
      </Canvas>
    </div>
  )
}
