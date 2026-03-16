import { useRef } from "react"
import { useFrame } from "@react-three/fiber"

export default function Objects() {
  const boxRef = useRef(null)
  const sphereRef = useRef(null)
  const torusRef = useRef(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    if (boxRef.current) {
      boxRef.current.position.y = 1 + Math.sin(t * 1.4) * 0.35
      boxRef.current.rotation.y = t * 0.8
    }

    if (sphereRef.current) {
      sphereRef.current.position.x = 2 + Math.sin(t * 0.9) * 0.7
      sphereRef.current.position.y = 1 + Math.cos(t * 1.1) * 0.25
    }

    if (torusRef.current) {
      torusRef.current.rotation.x = t * 0.9
      torusRef.current.rotation.z = t * 0.5
    }
  })

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#b8b6ad" roughness={0.95} metalness={0.05} />
      </mesh>

      <mesh ref={boxRef} position={[-2, 1, 0]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#d8782f" roughness={0.55} metalness={0.2} />
      </mesh>

      <mesh ref={sphereRef} position={[2, 1, 0]} castShadow>
        <sphereGeometry args={[0.85, 40, 40]} />
        <meshPhysicalMaterial color="#7ec8ff" roughness={0.15} metalness={0.35} clearcoat={0.8} />
      </mesh>

      <mesh ref={torusRef} position={[0, 1.2, -2.6]} castShadow>
        <torusKnotGeometry args={[0.55, 0.2, 128, 24]} />
        <meshStandardMaterial color="#7a6ad8" roughness={0.4} metalness={0.55} />
      </mesh>

      <mesh position={[0, 0.75, 2.8]} castShadow>
        <cylinderGeometry args={[0.45, 0.75, 1.5, 48]} />
        <meshStandardMaterial color="#5a9b64" roughness={0.8} metalness={0.1} />
      </mesh>
    </>
  )
}