import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useControls } from 'leva'
import { useRef, useState } from 'react'

function TorusKnotWithControls() {
  const meshRef = useRef()
  const [autoRotate, setAutoRotate] = useState(false)
  const [wireframe, setWireframe] = useState(false)

  // ===== CONTROLES DE LUZ (BONUS) =====
  const { lightIntensity, lightColor, lightPosX, lightPosY, lightPosZ } = useControls({
    lightIntensity: { value: 1.5, min: 0, max: 3, step: 0.1 },
    lightColor: '#ffffff',
    lightPosX: { value: 5, min: -8, max: 8, step: 0.5 },
    lightPosY: { value: 5, min: -8, max: 8, step: 0.5 },
    lightPosZ: { value: 5, min: -8, max: 8, step: 0.5 },
  })

  // ===== CONTROLES DEL OBJETO =====
  const { scale, color } = useControls({
    scale: { value: 1, min: 0.1, max: 3, step: 0.01 },
    color: '#ff6600',
    'Toggle Auto-rotate': {
      label: 'Toggle Auto-rotate',
      value: false,
      onChange: () => setAutoRotate(prev => !prev),
    },
    'Toggle Wireframe': {
      label: 'Toggle Wireframe',
      value: false,
      onChange: () => setWireframe(prev => !prev),
    },
  })

  // Rotación automática
  useFrame(() => {
    if (autoRotate && meshRef.current) {
      meshRef.current.rotation.y += 0.01
      meshRef.current.rotation.x += 0.005
    }
  })

  return (
    <>
      {/* Luz ambiente casi imperceptible para que la pointLight sea protagonista */}
      <ambientLight intensity={0.1} />
      
      {/* Luz puntual con posición e intensidad totalmente controlables */}
      <pointLight
        position={[lightPosX, lightPosY, lightPosZ]}
        intensity={lightIntensity}
        color={lightColor}
      />
      
      {/* Objeto 3D visible */}
      <mesh ref={meshRef} scale={[scale, scale, scale]}>
        <torusKnotGeometry args={[1, 0.3, 128, 16, 3, 4]} />
        <meshStandardMaterial color={color} wireframe={wireframe} />
      </mesh>

      {/* (Opcional) Una pequeña esfera para marcar la posición de la luz 
          - ayuda a visualizar dónde está la fuente de luz */}
      <mesh position={[lightPosX, lightPosY, lightPosZ]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="yellow" emissive="yellow" emissiveIntensity={0.5} />
      </mesh>
    </>
  )
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [6, 6, 6], fov: 45 }}>
        <TorusKnotWithControls />
        <OrbitControls enableZoom enablePan />
      </Canvas>
    </div>
  )
}