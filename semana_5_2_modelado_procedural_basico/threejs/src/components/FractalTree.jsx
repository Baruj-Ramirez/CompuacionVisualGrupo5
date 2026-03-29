import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Branch({ start, direction, length, angle, depth, maxDepth }) {
  const ref = useRef();

  if (depth > maxDepth) return null;

  const end = new THREE.Vector3()
    .copy(start)
    .addScaledVector(direction, length);

  const geometry = useMemo(() => {
    const geom = new THREE.CylinderGeometry(
      0.1 * (maxDepth - depth + 1),
      0.1 * (maxDepth - depth + 1),
      length,
      6
    );

    geom.translate(0, length / 2, 0);

    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    );

    geom.applyQuaternion(quaternion);
    geom.translate(start.x, start.y, start.z);

    return geom;
  }, [start, direction, length, depth]);

  // 🌬️ animación tipo viento
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z =
        Math.sin(clock.getElapsedTime() + depth) * 0.1;
    }
  });

  return (
    <group ref={ref}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={
            depth === 0
              ? 'brown'
              : `hsl(120, 70%, ${30 + depth * 10}%)`
          }
        />
      </mesh>

      {/* Ramas recursivas */}
      <Branch
        start={end}
        direction={direction.clone().applyEuler(new THREE.Euler(angle, 0, 0))}
        length={length * 0.7}
        angle={angle}
        depth={depth + 1}
        maxDepth={maxDepth}
      />
      <Branch
        start={end}
        direction={direction.clone().applyEuler(new THREE.Euler(-angle, 0, 0))}
        length={length * 0.7}
        angle={angle}
        depth={depth + 1}
        maxDepth={maxDepth}
      />
      <Branch
        start={end}
        direction={direction.clone().applyEuler(new THREE.Euler(0, angle, 0))}
        length={length * 0.7}
        angle={angle}
        depth={depth + 1}
        maxDepth={maxDepth}
      />
      <Branch
        start={end}
        direction={direction.clone().applyEuler(new THREE.Euler(0, -angle, 0))}
        length={length * 0.7}
        angle={angle}
        depth={depth + 1}
        maxDepth={maxDepth}
      />
    </group>
  );
}

export default function FractalTree() {
  return (
    <group>
      <Branch
        start={new THREE.Vector3(0, -1, 0)}
        direction={new THREE.Vector3(0, 1, 0)}
        length={1.2}
        angle={0.6}
        depth={0}
        maxDepth={4}
      />
    </group>
  );
}