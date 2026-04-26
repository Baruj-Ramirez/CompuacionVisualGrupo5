import { useRef } from 'react'
import { useFrame, extend } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

// --- EL SHADER VIVE AQUÍ (Fuera del componente para no re-declararlo) ---
const ToonMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color('#00d2ff'),
  },
  // Vertex Shader: Procesa la geometría
  `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  // Fragment Shader: Procesa el color y la luz
  `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec3 vNormal;

  void main() {
    // Calculamos una luz direccional básica
    float diffuse = dot(vNormal, vec3(1.0, 1.0, 1.0));
    
    // --- LÓGICA TOON (Cuantización) ---
    // Usamos step para crear cortes de luz definidos (Cel Shading)
    float light = step(0.3, diffuse) * 0.5 + step(0.6, diffuse) * 0.5;
    light = clamp(light, 0.2, 1.0); 

    // Cambio de color sutil con el tiempo
    vec3 color = uColor + (sin(uTime) * 0.1);
    
    gl_FragColor = vec4(color * light, 1.0);
  }
  `
)

// Registramos el material para usarlo como <toonMaterial />
extend({ ToonMaterial })

export const ToonObject = () => {
  const matRef = useRef()

  // Animamos el uniforme uTime en cada frame
  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uTime = state.clock.elapsedTime
    }
  })

  return (
    <mesh>
      <torusKnotGeometry args={[1, 0.4, 128, 32]} />
      <toonMaterial ref={matRef} />
    </mesh>
  )
}