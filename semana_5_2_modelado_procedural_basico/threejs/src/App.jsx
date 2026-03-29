import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useState } from 'react';

import Grid from './components/Grid';
import Spiral from './components/Spiral';
import AnimatedVertex from './components/AnimatedVertex';
import FractalTree from './components/FractalTree';

export default function App() {
  const [mode, setMode] = useState('grid');

  return (
    <>
      {/* UI simple */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1 }}>
        <button onClick={() => setMode('grid')}>Grid</button>
        <button onClick={() => setMode('spiral')}>Spiral</button>
        <button onClick={() => setMode('wave')}>Wave</button>
        <button onClick={() => setMode('tree')}>Tree</button>
      </div>

    <Canvas camera={{ position: [5, 2, 5], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} />
      <OrbitControls />

      <group position={[0, -1, 0]}>
        {mode === 'grid' && <Grid />}
        {mode === 'spiral' && <Spiral />}
        {mode === 'wave' && <AnimatedVertex />}
        {mode === 'tree' && <FractalTree />}
      </group>
    </Canvas>
    </>
  );
}