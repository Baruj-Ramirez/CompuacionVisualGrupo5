import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import Objects from "./components/Objects"
import Lights from "./components/Lights"

export default function Scene() {
  return (
    <Canvas
      shadows={{ type: 2 }}
      camera={{ position: [6, 5, 8], fov: 50 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#f2f1eb"]} />
      <OrbitControls maxPolarAngle={Math.PI / 2 - 0.05} />

      <Lights />
      <Objects />
    </Canvas>
  )
}