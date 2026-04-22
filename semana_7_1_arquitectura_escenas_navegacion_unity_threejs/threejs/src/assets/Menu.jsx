import { Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

function EscenaMenu() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      {/* Cubo que rota suavemente */}
      <mesh rotation={[Date.now() * 0.002, Date.now() * 0.003, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>
      {/* Texto 2D no, usamos un plano con color para simular cartel */}
      <mesh position={[0, 1.5, 0]}>
        <planeGeometry args={[2, 0.5]} />
        <meshStandardMaterial color="black" />
      </mesh>
    </>
  );
}

export default function Menu() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas camera={{ position: [0, 0, 5] }}>
        <EscenaMenu />
        <OrbitControls enableZoom={false} />
      </Canvas>
      <div style={{
        position: 'absolute',
        bottom: '20%',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        background: 'rgba(0,0,0,0.6)',
        padding: '15px',
        borderRadius: '10px',
        width: 'fit-content',
        margin: '0 auto'
      }}>
        <Link to="/juego">
          <button style={{ fontSize: '1.2rem', padding: '8px 16px', cursor: 'pointer' }}>Jugar</button>
        </Link>
        <Link to="/creditos">
          <button style={{ fontSize: '1.2rem', padding: '8px 16px', cursor: 'pointer' }}>Créditos</button>
        </Link>
      </div>
    </div>
  );
}