import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, useFBX, useAnimations } from '@react-three/drei'
import { useRef, useEffect, useState, useMemo, useCallback } from 'react'

function Character() {
  const groupRef = useRef()
  const { scene } = useGLTF('/models/my_character.glb')
  
  // Aplicar corrección de orientación una sola vez
  useEffect(() => {
    if (scene) {
      scene.rotation.x = -Math.PI / 2
      scene.position.y = -1.2
    }
  }, [scene])

  // Cargar animaciones
  const idleFBX = useFBX('/models/Idle.fbx')
  const greetingFBX = useFBX('/models/Greeting.fbx')
  const jumpFBX = useFBX('/models/Jump.fbx')

  const allAnimations = useMemo(() => {
    const clips = []
    if (idleFBX.animations?.[0]) {
      const clip = idleFBX.animations[0]
      clip.name = "Idle"
      clips.push(clip)
    }
    if (greetingFBX.animations?.[0]) {
      const clip = greetingFBX.animations[0]
      clip.name = "Greeting"
      clips.push(clip)
    }
    if (jumpFBX.animations?.[0]) {
      const clip = jumpFBX.animations[0]
      clip.name = "Jump"
      clips.push(clip)
    }
    return clips
  }, [idleFBX, greetingFBX, jumpFBX])

  const { actions, names } = useAnimations(allAnimations, scene)
  const currentAnimRef = useRef(null)
  const isTransitioning = useRef(false)

  const playAnimation = useCallback((animName, fadeTime = 0.2) => {
    if (!animName || !actions[animName]) return
    // No hacer nada si ya es la animación actual y no estamos forzando reinicio
    if (currentAnimRef.current === animName) return
    // Evitar múltiples transiciones rápidas
    if (isTransitioning.current) return
    
    isTransitioning.current = true
    if (currentAnimRef.current && actions[currentAnimRef.current]) {
      actions[currentAnimRef.current].fadeOut(fadeTime)
    }
    actions[animName].reset().fadeIn(fadeTime).play()
    currentAnimRef.current = animName
    
    // Liberar el flag después del tiempo de fade
    setTimeout(() => {
      isTransitioning.current = false
    }, fadeTime * 1000)
  }, [actions])

  // Iniciar con Idle
  useEffect(() => {
    if (names.length > 0 && !currentAnimRef.current) {
      if (actions["Idle"]) playAnimation("Idle", 0)
      else if (names[0]) playAnimation(names[0], 0)
    }
  }, [names, actions, playAnimation])

  const handleClick = () => {
    if (actions["Greeting"]) playAnimation("Greeting")
  }
  const handlePointerOver = () => {
    if (actions["Idle"]) playAnimation("Idle")
  }

  // Exponer controles
  useEffect(() => {
    window.character = { actions, names, playAnimation }
  }, [actions, names, playAnimation])

  return (
    <group ref={groupRef}>
      <primitive 
        object={scene}
        scale={1.5}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
      />
    </group>
  )
}

// Panel de botones
function ControlPanel() {
  const [animList, setAnimList] = useState([])
  useEffect(() => {
    const update = () => {
      if (window.character?.names) {
        setAnimList(window.character.names)
      } else {
        setTimeout(update, 100)
      }
    }
    update()
  }, [])
  const handlePlay = (animName) => {
    if (window.character?.playAnimation) window.character.playAnimation(animName)
  }
  return (
    <div style={{
      position: 'absolute', bottom: 20, left: 20, gap: 10,
      display: 'flex', background: 'rgba(0,0,0,0.7)', padding: 10,
      borderRadius: 8, zIndex: 100, flexWrap: 'wrap'
    }}>
      {animList.map(anim => (
        <button key={anim} onClick={() => handlePlay(anim)} style={{ padding: '8px 16px' }}>
          {anim}
        </button>
      ))}
    </div>
  )
}

export default function App() {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!window.character?.playAnimation) return
      switch (e.code) {
        case 'KeyG': window.character.playAnimation('Greeting'); break
        case 'KeyJ': window.character.playAnimation('Jump'); break
        case 'KeyI': window.character.playAnimation('Idle'); break
        default: break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <ControlPanel />
      <Canvas camera={{ position: [3, 2, 5], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Character />
        <OrbitControls />
        <gridHelper args={[10, 10]} position={[0, -1.2, 0]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#888888" side={2} />
        </mesh>
      </Canvas>
    </>
  )
}