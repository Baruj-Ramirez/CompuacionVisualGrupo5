import React, { useState, useMemo, useRef } from 'react';  // ← añadido useRef
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// Componente que representa un objeto con material de profundidad personalizado
const DepthObject = ({ position, geometry, near, far, depthTestEnabled }) => {
  const meshRef = useRef();

  // Material personalizado con useMemo
  const depthMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        near: { value: near },
        far: { value: far }
      },
      vertexShader: `
        varying float vDepth;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vDepth = -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float near;
        uniform float far;
        varying float vDepth;
        
        void main() {
          float depthNormalized = (vDepth - near) / (far - near);
          depthNormalized = clamp(depthNormalized, 0.0, 1.0);
          vec3 color = 0.5 + 0.5 * cos(2.0 * 3.14159 * (depthNormalized * 2.0 + vec3(0.0, 0.33, 0.67)));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthTest: depthTestEnabled,
      depthWrite: true,
    });
  }, [near, far, depthTestEnabled]);

  return (
    <mesh ref={meshRef} geometry={geometry} position={position} material={depthMaterial} />
  );
};

// Escena principal
const Scene = ({ near, far, depthTestEnabled }) => {
  return (
    <>
      <DepthObject
        position={[-2, 0, -2]}
        geometry={new THREE.BoxGeometry(1, 1, 1)}
        near={near}
        far={far}
        depthTestEnabled={depthTestEnabled}
      />
      <DepthObject
        position={[2, 0, -5]}
        geometry={new THREE.SphereGeometry(0.8, 32, 16)}
        near={near}
        far={far}
        depthTestEnabled={depthTestEnabled}
      />
      <DepthObject
        position={[0, 1, -8]}
        geometry={new THREE.TorusGeometry(0.6, 0.2, 16, 32)}
        near={near}
        far={far}
        depthTestEnabled={depthTestEnabled}
      />
      <DepthObject
        position={[-1, -1, -10]}
        geometry={new THREE.ConeGeometry(0.7, 1.4, 32)}
        near={near}
        far={far}
        depthTestEnabled={depthTestEnabled}
      />

      <mesh position={[0, -1.5, -15]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="gray" side={THREE.DoubleSide} />
      </mesh>

      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} />
    </>
  );
};

export default function App() {
  const [near, setNear] = useState(0.1);
  const [far, setFar] = useState(20);
  const [depthTestEnabled, setDepthTestEnabled] = useState(true);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 2, 5]} near={near} far={far} />
        <OrbitControls />
        <Scene near={near} far={far} depthTestEnabled={depthTestEnabled} />
      </Canvas>

      <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(0,0,0,0.7)', color: 'white', padding: 15, borderRadius: 8 }}>
        <h3>Controles de profundidad</h3>
        <div>
          <label>Near: {near.toFixed(2)}</label>
          <input type="range" min="0.01" max="5" step="0.01" value={near} onChange={(e) => setNear(parseFloat(e.target.value))} />
        </div>
        <div>
          <label>Far: {far.toFixed(2)}</label>
          <input type="range" min="5" max="50" step="0.1" value={far} onChange={(e) => setFar(parseFloat(e.target.value))} />
        </div>
        <div>
          <label>
            <input type="checkbox" checked={depthTestEnabled} onChange={(e) => setDepthTestEnabled(e.target.checked)} />
            Depth Test habilitado
          </label>
        </div>
        <p style={{ fontSize: 12 }}>
          Los objetos muestran su profundidad con colores.<br />
          Al desactivar Depth Test, se dibujan en orden de aparición (sin oclusión correcta).
        </p>
      </div>
    </div>
  );
}