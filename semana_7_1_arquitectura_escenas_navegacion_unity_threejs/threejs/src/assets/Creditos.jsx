import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

function EscenaCreditos() {
  return (
    <>
      <Stars radius={50} depth={50} count={2000} factor={4} fade />
      <ambientLight intensity={0.3} />
      {/* Un toroide decorativo */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusKnotGeometry args={[0.8, 0.25, 100, 16]} />
        <meshStandardMaterial color="cyan" wireframe />
      </mesh>
    </>
  );
}

export default function Creditos() {
  const navigate = useNavigate();
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas camera={{ position: [0, 0, 5] }}>
        <EscenaCreditos />
      </Canvas>
      <div style={{
        position: 'absolute',
        bottom: '15%',
        left: 0,
        right: 0,
        textAlign: 'center',
        background: 'rgba(0,0,0,0.6)',
        color: 'white',
        padding: '15px',
        borderRadius: '10px',
        width: '80%',
        margin: '0 auto'
      }}>
        <h3>Taller 7_1 - Arquitectura de Escenas</h3>
        <p>Three.js + React Router | Navegación entre escenas</p>
        <button onClick={() => navigate('/')} style={{ marginRight: '10px', cursor: 'pointer' }}>Menú</button>
        <button onClick={() => navigate('/juego')} style={{ cursor: 'pointer' }}>Juego</button>
      </div>
    </div>
  );
}