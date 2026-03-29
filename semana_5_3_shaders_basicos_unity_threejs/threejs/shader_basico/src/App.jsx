import { Canvas } from '@react-three/fiber'
import { OrbitControls, Center } from '@react-three/drei'
import { ToonObject } from './components/ToonObject'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [0, 0, 4] }}>
        <color attach="background" args={['#151515']} />
        <ambientLight intensity={0.5} />
        
        <Center>
          <ToonObject />
        </Center>

        <OrbitControls />
      </Canvas>
    </div>
  )
}

export default App