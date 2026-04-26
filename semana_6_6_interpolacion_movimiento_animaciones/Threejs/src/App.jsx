import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Sphere, Box } from '@react-three/drei';
import { useControls, button } from 'leva';
import { useRef, useState } from 'react';
import * as THREE from 'three';

// Puntos de inicio y fin
const startPoint = new THREE.Vector3(-3, 0, 0);
const endPoint = new THREE.Vector3(3, 1, 2);

// Puntos de control para la curva Bézier cúbica
const control1 = new THREE.Vector3(-1, 2, 1);
const control2 = new THREE.Vector3(1, 2, 1);

// Rotación inicial (identidad) y final (vuelta completa en Y)
const startQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
const endQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));

// Función para obtener punto en curva Bézier cúbica
function cubicBezierPoint(t, p0, p1, p2, p3) {
  const mt = 1 - t;
  const x = mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x;
  const y = mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y;
  const z = mt * mt * mt * p0.z + 3 * mt * mt * t * p1.z + 3 * mt * t * t * p2.z + t * t * t * p3.z;
  return new THREE.Vector3(x, y, z);
}

// Componente que anima el cubo
function AnimatedCube() {
  const cubeRef = useRef();
  const { t, mode } = useControls({
    t: { value: 0, min: 0, max: 1, step: 0.01 },
    mode: { options: ['Lineal', 'Curva (Bézier)'] },
  });

  useFrame(() => {
    if (!cubeRef.current) return;

    // Posición
    let position;
    if (mode === 'Lineal') {
      position = new THREE.Vector3().lerpVectors(startPoint, endPoint, t);
    } else {
      position = cubicBezierPoint(t, startPoint, control1, control2, endPoint);
    }
    cubeRef.current.position.copy(position);

    // Rotación con SLERP
    const currentQuat = startQuat.clone().slerp(endQuat, t);
    cubeRef.current.quaternion.copy(currentQuat);
  });

  // Cubo con colores diferentes por cara (usando un array de materiales)
  const materials = [
    new THREE.MeshStandardMaterial({ color: 'red' }),    // derecha (x+)
    new THREE.MeshStandardMaterial({ color: 'lime' }),   // izquierda (x-)
    new THREE.MeshStandardMaterial({ color: 'blue' }),   // arriba (y+)
    new THREE.MeshStandardMaterial({ color: 'yellow' }), // abajo (y-)
    new THREE.MeshStandardMaterial({ color: 'magenta' }),// frente (z+)
    new THREE.MeshStandardMaterial({ color: 'cyan' }),   // detrás (z-)
  ];

  return (
    <mesh ref={cubeRef} position={startPoint} material={materials}>
      <boxGeometry args={[0.8, 0.8, 0.8]} />
    </mesh>
  );
}

// Componente que dibuja la trayectoria (línea)
function PathLine() {
  const { mode } = useControls('Path', { mode: { options: ['Lineal', 'Curva (Bézier)'] } });
  const points = [];

  if (mode === 'Lineal') {
    // Línea recta entre start y end
    points.push(startPoint, endPoint);
  } else {
    // Generar puntos a lo largo de la curva Bézier
    const segments = 50;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      points.push(cubicBezierPoint(t, startPoint, control1, control2, endPoint));
    }
  }

  return <Line points={points} color="cyan" lineWidth={2} />;
}

// Puntos de inicio y fin visibles (esferas)
function StartEndPoints() {
  return (
    <>
      <Sphere position={startPoint} args={[0.2, 32, 32]}>
        <meshStandardMaterial color="red" />
      </Sphere>
      <Sphere position={endPoint} args={[0.2, 32, 32]}>
        <meshStandardMaterial color="green" />
      </Sphere>
      {/* Opcional: mostrar puntos de control de la curva */}
      <Sphere position={control1} args={[0.15, 24, 24]}>
        <meshStandardMaterial color="gray" emissive="gray" />
      </Sphere>
      <Sphere position={control2} args={[0.15, 24, 24]}>
        <meshStandardMaterial color="gray" emissive="gray" />
      </Sphere>
    </>
  );
}

// Escena principal
export default function App() {
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <Canvas camera={{ position: [5, 5, 8], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[5, 5, 5]} intensity={1} />
        <OrbitControls enablePan enableZoom enableRotate />
        
        <StartEndPoints />
        <PathLine />
        <AnimatedCube />
        
        {/* Opcional: grid y ejes para referencia */}
        <gridHelper args={[10, 20]} />
        <axesHelper size={4} />
      </Canvas>
    </div>
  );
}