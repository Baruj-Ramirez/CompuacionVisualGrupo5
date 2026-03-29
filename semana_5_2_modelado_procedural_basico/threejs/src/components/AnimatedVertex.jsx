import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function AnimatedVertex() {
  const meshRef = useRef();

  const geometry = useMemo(() => {
    const geom = new THREE.PlaneGeometry(3, 3, 64, 64);
    geom.rotateX(-Math.PI / 2);
    return geom;
  }, []);

  const originalPositions = useMemo(() => {
    return geometry.attributes.position.array.slice();
  }, [geometry]);

  useFrame(({ clock }) => {
    const positions = geometry.attributes.position.array;
    const time = clock.getElapsedTime();

    for (let i = 0; i < positions.length; i += 3) {
      const x = originalPositions[i];
      const z = originalPositions[i + 2];

      const y =
        Math.sin(x * 2 + time) *
        0.3 *
        Math.cos(z * 1.5 + time * 0.7);

      positions[i + 1] = y;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals(); // 🔥 mejora visual
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color="orange"
        roughness={0.3}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}