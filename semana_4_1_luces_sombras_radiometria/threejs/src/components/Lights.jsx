import { useControls } from "leva"

export default function Lights() {
  const ambient = useControls("Ambient Light", {
    ambientIntensity: { value: 0.35, min: 0, max: 2, step: 0.01 },
    ambientColor: "#f7f4f0"
  })

  const directional = useControls("Directional Light", {
    dirIntensity: { value: 1.2, min: 0, max: 5, step: 0.01 },
    dirColor: "#fff6df",
    dirX: { value: 4, min: -10, max: 10, step: 0.1 },
    dirY: { value: 6, min: 0, max: 12, step: 0.1 },
    dirZ: { value: 3, min: -10, max: 10, step: 0.1 }
  })

  const point = useControls("Point Light", {
    pointIntensity: { value: 1.4, min: 0, max: 8, step: 0.01 },
    pointColor: "#8fd9ff",
    pointX: { value: -2, min: -10, max: 10, step: 0.1 },
    pointY: { value: 4, min: 0.2, max: 10, step: 0.1 },
    pointZ: { value: 2, min: -10, max: 10, step: 0.1 }
  })

  return (
    <>
      <ambientLight intensity={ambient.ambientIntensity} color={ambient.ambientColor} />

      <directionalLight
        position={[directional.dirX, directional.dirY, directional.dirZ]}
        intensity={directional.dirIntensity}
        color={directional.dirColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0002}
      />

      <pointLight
        position={[point.pointX, point.pointY, point.pointZ]}
        intensity={point.pointIntensity}
        color={point.pointColor}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <mesh position={[point.pointX, point.pointY, point.pointZ]}>
        <sphereGeometry args={[0.09, 18, 18]} />
        <meshBasicMaterial color={point.pointColor} />
      </mesh>
    </>
  )
}