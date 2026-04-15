import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, OrbitControls, Environment, Grid, ContactShadows } from '@react-three/drei'
import { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import './App.css'

// ═══════════════════════════════════════════════════════════
// CONSTANTES — metadata de cada animación
// Los keys deben coincidir EXACTAMENTE con los nombres de
// los clips dentro de tu archivo character.glb
// ═══════════════════════════════════════════════════════════
const ANIMATION_META = {
  idle:    { label: 'IDLE',  icon: '◎', desc: 'Estado de reposo',          key: 'mixamo.com', color: '#4ade80' },
  walking: { label: 'WALK',  icon: '⬡', desc: 'Caminata normal',           key: 'mixamo.com.001', color: '#60a5fa' },
  running: { label: 'RUN',   icon: '▷', desc: 'Carrera a máxima velocidad', key: 'mixamo.com.002', color: '#f97316' },
  waving:  { label: 'WAVE',  icon: '◈', desc: 'Saludo con la mano',         key: 'mixamo.com.003', color: '#e879f9' },
}

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Character
// Carga el modelo GLTF y controla animaciones esqueléticas
// con useAnimations() — crossfade automático entre clips
// ═══════════════════════════════════════════════════════════
function Character({ currentAnim, onAnimationsLoaded, onBoneCount }) {
  const group = useRef()
  const { scene, animations } = useGLTF('/models/character.glb')
  const { actions, names }    = useAnimations(animations, group)
  const prevAnim = useRef(null)

  // Al montar: reporta clips y huesos encontrados
  useEffect(() => {
    if (names.length > 0) {
      console.log("Animaciones detectadas en el GLB:", names);
      onAnimationsLoaded(names);
    }

    let bones = 0
    scene.traverse(child => {
      if (child.isBone) bones++
      if (child.isMesh) {
        child.castShadow    = true
        child.receiveShadow = true
      }
    })
    onBoneCount(bones)
  }, [names, scene])

  // Crossfade cada vez que cambia la animación activa
  useEffect(() => {
    if (!actions || !currentAnim) return
    const next = actions[currentAnim]
    if (!next) return

    if (prevAnim.current && prevAnim.current !== currentAnim) {
      const prev = actions[prevAnim.current]
      next.reset().fadeIn(0.4).play()
      if (prev) prev.fadeOut(0.4)
    } else {
      next.reset().fadeIn(0.2).play()
    }
    prevAnim.current = currentAnim
  }, [currentAnim, actions])

  // Rotación suave en idle para dar vida a la escena
  useFrame(({ clock }) => {
    if (!group.current) return
    if (currentAnim === 'idle') {
      group.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.3) * 0.15
    } else {
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, 0, 0.05)
    }
  })

  return <primitive ref={group} object={scene} />
}

// ═══════════════════════════════════════════════════════════
// COMPONENTE: AnimButton
// ═══════════════════════════════════════════════════════════
function AnimButton({ animKey, meta, isActive, onClick }) {
  return (
    <button
      className={`anim-btn${isActive ? ' anim-btn--active' : ''}`}
      style={{ '--c': meta.color }}
      onClick={() => onClick(animKey)}
    >
      <span className="anim-btn__key">{meta.key}</span>
      <span className="anim-btn__icon">{meta.icon}</span>
      <div className="anim-btn__info">
        <span className="anim-btn__label">{meta.label}</span>
        <span className="anim-btn__desc">{meta.desc}</span>
      </div>
      {isActive && <span className="anim-btn__pip" />}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════
// COMPONENTE: InfoPanel
// ═══════════════════════════════════════════════════════════
function InfoPanel({ currentAnim, loadedAnims, boneCount }) {
  const meta = ANIMATION_META[currentAnim] || {}
  return (
    <aside className="info-panel">
      <p className="info-panel__section">ESQUELETO</p>
      <div className="info-panel__row">
        <span>Huesos</span><span>{boneCount || '—'}</span>
      </div>
      <div className="info-panel__row">
        <span>Clips cargados</span><span>{loadedAnims.length}</span>
      </div>
      <div className="info-panel__div" />
      <p className="info-panel__section">REPRODUCIENDO</p>
      <div className="info-panel__row info-panel__row--hi" style={{ '--c': meta.color }}>
        <span>Animación</span><span>{meta.label || currentAnim}</span>
      </div>
      <div className="info-panel__row info-panel__row--hi" style={{ '--c': meta.color }}>
        <span>Transición</span><span>fadeIn · fadeOut</span>
      </div>
      <div className="info-panel__div" />
      <p className="info-panel__section">CLIPS EN .GLB</p>
      {loadedAnims.map(n => (
        <div key={n} className={`info-panel__row${currentAnim === n ? ' info-panel__row--hi' : ''}`}
             style={{ '--c': ANIMATION_META[n]?.color || '#888' }}>
          <span>{n}</span>
          <span>{currentAnim === n ? '▶' : '—'}</span>
        </div>
      ))}
    </aside>
  )
}

// ═══════════════════════════════════════════════════════════
// COMPONENTE RAÍZ
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [currentAnim, setCurrentAnim] = useState('idle')
  const [loadedAnims, setLoadedAnims] = useState([])
  const [boneCount,   setBoneCount]   = useState(0)

  const handleAnimChange = useCallback((key) => setCurrentAnim(key), [])

  // Atajos de teclado 1–4
  useEffect(() => {
    const map = { '1': 'idle', '2': 'walking', '3': 'running', '4': 'waving' }
    const fn  = (e) => { if (map[e.key]) handleAnimChange(map[e.key]) }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [handleAnimChange])

  const meta = ANIMATION_META[currentAnim]

  return (
    <div className="app">

      {/* HUD superior */}
      <header className="hud">
        <div className="hud__left">
          <span className="hud__title">ANIMACIÓN ESQUELÉTICA</span>
          <span className="hud__sub">React Three Fiber · useAnimations · GLTF</span>
        </div>
        <div className="hud__status" style={{ '--c': meta?.color }}>
          <span className="hud__dot" />
          {meta?.label} ACTIVO
        </div>
      </header>

      {/* Panel info — izquierda */}
      <InfoPanel
        currentAnim={currentAnim}
        loadedAnims={loadedAnims}
        boneCount={boneCount}
      />

      {/* Controles — derecha */}
      <nav className="controls">
        <p className="controls__hint">— teclas  1 · 2 · 3 · 4 —</p>
        {Object.entries(ANIMATION_META).map(([k, m]) => (
          <AnimButton
            key={k} animKey={k} meta={m}
            isActive={currentAnim === k}
            onClick={handleAnimChange}
          />
        ))}
      </nav>

      {/* Canvas 3D */}
      <Canvas
        shadows
        camera={{ position: [0, 1.4, 3.5], fov: 45 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      >
        <color attach="background" args={['#0b0d13']} />

        <ambientLight intensity={0.35} />
        <directionalLight
          position={[3, 7, 4]} intensity={2.2} castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.5} shadow-camera-far={20}
          shadow-camera-left={-3} shadow-camera-right={3}
          shadow-camera-top={5}   shadow-camera-bottom={-1}
        />
        <pointLight position={[-3, 2, -2]} intensity={0.7} color="#60a5fa" />
        {/* Luz de acento que cambia color con la animación activa */}
        <pointLight position={[2, 1, 2]} intensity={0.5} color={meta?.color || '#fff'} />

        <Environment preset="city" />

        <Grid
          position={[0, -0.01, 0]}
          args={[20, 20]}
          cellSize={0.5}      cellThickness={0.4} cellColor="#1a2030"
          sectionSize={2}     sectionThickness={0.9} sectionColor="#243050"
          fadeDistance={14}   fadeStrength={1}    infiniteGrid
        />

        <ContactShadows
          position={[0, 0, 0]} opacity={0.65}
          scale={6} blur={2.5} far={1} color="#00000f"
        />

        <Character
          currentAnim={currentAnim}
          onAnimationsLoaded={setLoadedAnims}
          onBoneCount={setBoneCount}
        />

        <OrbitControls
          target={[0, 1, 0]}
          minDistance={1.5} maxDistance={8}
          maxPolarAngle={Math.PI / 2.05}
          enablePan={false}
        />
      </Canvas>
    </div>
  )
}

useGLTF.preload('/models/character.glb')
