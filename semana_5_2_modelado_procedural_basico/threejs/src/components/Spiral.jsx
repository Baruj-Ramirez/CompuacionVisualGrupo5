import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function Spiral() {
  const groupRef = useRef();

  const spirals = useMemo(() => {
    const elements = [];
    const turns = 3;
    const steps = 60;
    const radius = 2;
    const height = 4;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = t * Math.PI * 2 * turns;
      const x = Math.cos(angle) * radius * t;
      const z = Math.sin(angle) * radius * t;
      const y = (t - 0.5) * height;

      elements.push(
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial
            color={`hsl(${angle * 50}, 70%, 50%)`}
            roughness={0.4}
          />
        </mesh>
      );
    }
    return elements;
  }, []);

  // Animación de rotación
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.5;
    }
  });

  return <group ref={groupRef}>{spirals}</group>;
}