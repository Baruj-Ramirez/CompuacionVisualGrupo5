import React, { useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line, Box } from '@react-three/drei'
import { useControls } from 'leva'
import * as THREE from 'three'

const ArmSegment = ({ length, amplitude, speed, offset, color, children }) => {
  const groupRef = useRef()
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    // La amplitud define el rango máximo de rotación en radianes
    // Math.sin oscila entre -1 y 1, por lo que el ángulo final será [-amplitude, amplitude]
    groupRef.current.rotation.z = Math.sin(t * speed + offset) * amplitude
  })

  return (
    <group ref={groupRef}>
      {/* Visualización del eslabón */}
      <Box args={[length, 0.2, 0.2]} position={[length / 2, 0, 0]}>
        <meshStandardMaterial color={color} />
      </Box>
      {/* Punto de conexión para el hijo al final del eslabón */}
      <group position={[length, 0, 0]}>
        {children}
      </group>
    </group>
  )
}

const RoboticArm = () => {
  const [trail, setTrail] = useState([])
  const tipRef = useRef()
  const worldPos = useMemo(() => new THREE.Vector3(), [])

  // Sliders para controlar la AMPLIUD (en radianes, 1.5 rad ≈ 90°)
  const { amp1, amp2, amp3 } = useControls('Amplitud de Giro', {
    amp1: { value: 0.5, min: 0, max: Math.PI / 2, step: 0.1, label: 'Hombro (rad)' },
    amp2: { value: 0.8, min: 0, max: Math.PI / 2, step: 0.1, label: 'Codo (rad)' },
    amp3: { value: 1.2, min: 0, max: Math.PI / 2, step: 0.1, label: 'Muñeca (rad)' },
  })

  useFrame(() => {
    if (tipRef.current) {
      // Capturamos la posición global del extremo para dibujar la línea
      tipRef.current.getWorldPosition(worldPos)
      
      setTrail((prev) => {
        const newTrail = [...prev, worldPos.clone()]
        // Mantener solo los últimos 150 puntos para el rastro
        return newTrail.slice(-150)
      })
    }
  })

  return (
    <>
      <group position={[-2, 0, 0]}>
        <ArmSegment length={2} amplitude={amp1} speed={1} offset={0} color="#ffcc00">
          <ArmSegment length={1.5} amplitude={amp2} speed={1.5} offset={0.5} color="#4488ff">
            <ArmSegment length={1} amplitude={amp3} speed={2} offset={1} color="#ff5533">
              <group ref={tipRef} />
            </ArmSegment>
          </ArmSegment>
        </ArmSegment>
      </group>

      {trail.length > 1 && (
        <Line points={trail} color="cyan" lineWidth={1.5} opacity={0.6} transparent />
      )}
    </>
  )
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050505' }}>
      <Canvas camera={{ position: [0, 0, 7], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <RoboticArm />
        <OrbitControls />
        <gridHelper args={[15, 15, 0x333333, 0x222222]} rotation={[Math.PI / 2, 0, 0]} />
      </Canvas>
    </div>
  )
}