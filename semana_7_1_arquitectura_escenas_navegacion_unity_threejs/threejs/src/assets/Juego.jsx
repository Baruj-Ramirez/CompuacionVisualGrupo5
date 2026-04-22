import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

function EscenaJuego() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
      {/* Suelo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="lightgreen" />
      </mesh>
      {/* Personaje (esfera azul) */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="blue" />
      </mesh>
      {/* Obstáculo (cubo rojo) */}
      <mesh position={[1.5, 0, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial color="red" />
      </mesh>
      {/* Cubo dorado coleccionable */}
      <mesh position={[-1.2, 0.2, 0.8]}>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial color="gold" />
      </mesh>
    </>
  );
}

export default function Juego() {
  const navigate = useNavigate();
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas camera={{ position: [4, 3, 5], fov: 50 }}>
        <EscenaJuego />
        <OrbitControls />
      </Canvas>
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        background: 'rgba(0,0,0,0.7)',
        padding: '10px',
        borderRadius: '8px',
        display: 'flex',
        gap: '10px'
      }}>
        <button onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Menú</button>
        <button onClick={() => navigate('/creditos')} style={{ cursor: 'pointer' }}>Créditos</button>
      </div>
    </div>
  );
}