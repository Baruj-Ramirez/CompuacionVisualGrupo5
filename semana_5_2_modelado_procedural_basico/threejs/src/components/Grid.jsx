import { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function Grid() {
  const meshRef = useRef();
  const size = 11;
  const spacing = 1.2;

  useEffect(() => {
    let index = 0;
    const dummy = new THREE.Object3D();

    for (let i = -5; i <= 5; i++) {
      for (let j = -5; j <= 5; j++) {
        dummy.position.set(i * spacing, 0, j * spacing);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(index, dummy.matrix);
        index++;
      }
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <instancedMesh ref={meshRef} args={[null, null, size * size]}>
      <boxGeometry args={[0.8, 0.8, 0.8]} />
      <meshStandardMaterial color="cyan" roughness={0.3} metalness={0.2} />
    </instancedMesh>
  );
}