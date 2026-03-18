import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Center } from "@react-three/drei";
import { useControls } from "leva";
import { useRef, useMemo } from "react";

function Scene() {
  const meshRef = useRef();
  const lightRef = useRef();

  const { model, materialType, shaderMode } = useControls({
    model: { options: ["Torus Knot", "Sphere", "Torus"] },
    materialType: { 
      value: "Custom Shader",
      options: ["Custom Shader", "MeshLambertMaterial", "MeshPhongMaterial", "MeshStandardMaterial (PBR)"] 
    },
    shaderMode: {
      display: "select",
      options: { "Lambert": 0, "Phong": 1, "Blinn-Phong": 2 },
      render: (get) => get("materialType") === "Custom Shader"
    }
  });

  const { diffuse, specular, shininess, lightIntensity } = useControls("Material Params", {
    diffuse: { value: 1, min: 0, max: 2 },
    specular: { value: 1, min: 0, max: 10 },
    shininess: { value: 32, min: 1, max: 200 },
    lightIntensity: { value: 1.5, min: 0, max: 5 }
  });

  // Uniforms estables
  const uniforms = useMemo(() => ({
    uLightPos: { value: new THREE.Vector3() },
    uViewPos: { value: new THREE.Vector3() },
    uDiffuseStrength: { value: 1.0 },
    uSpecularStrength: { value: 1.0 },
    uShininess: { value: 32.0 },
    uMode: { value: 0 }
  }), []);

  useFrame(({ camera, clock }) => {
    // Rotar luz
    const t = clock.getElapsedTime();
    lightRef.current.position.set(Math.cos(t) * 5, 2, Math.sin(t) * 5);

    // Actualizar Uniforms
    if (meshRef.current?.material.uniforms) {
      const u = meshRef.current.material.uniforms;
      u.uLightPos.value.copy(lightRef.current.position);
      u.uViewPos.value.copy(camera.position);
      u.uDiffuseStrength.value = diffuse;
      u.uSpecularStrength.value = specular;
      u.uShininess.value = shininess;
      u.uMode.value = shaderMode;
    }
  });

  return (
    <>
      <color attach="background" args={["#111"]} />
      <pointLight ref={lightRef} intensity={lightIntensity} color="white" />
      
      <Center>
        <mesh ref={meshRef}>
          {model === "Sphere" && <sphereGeometry args={[1, 64, 64]} />}
          {model === "Torus" && <torusGeometry args={[1, 0.4, 32, 100]} />}
          {model === "Torus Knot" && <torusKnotGeometry args={[0.8, 0.3, 200, 32]} />}

          {materialType === "Custom Shader" && (
            <shaderMaterial 
              key={shaderMode} // Forzar recompilación si es necesario
              vertexShader={vertexShader} 
              fragmentShader={fragmentShader} 
              uniforms={uniforms} 
            />
          )}
          {materialType === "MeshLambertMaterial" && <meshLambertMaterial color="orange" />}
          {materialType === "MeshPhongMaterial" && <meshPhongMaterial color="orange" shininess={shininess} />}
          {materialType === "MeshStandardMaterial (PBR)" && <meshStandardMaterial color="orange" roughness={0.2} metalness={0.8} />}
        </mesh>
      </Center>

      <OrbitControls />
    </>
  );
}

export default function App() {
  return (
    <Canvas 
      camera={{ position: [0, 0, 5], fov: 45 }} 
      style={{ height: "100vh", width: "100vw" }}
      color="white">
      <Scene />
    </Canvas>
  );
} 

const vertexShader = `
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  // Transformamos la normal al espacio de la vista correctamente
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const fragmentShader = `
uniform vec3 uLightPos;
uniform vec3 uViewPos;
uniform float uDiffuseStrength;
uniform float uSpecularStrength;
uniform float uShininess;
uniform int uMode; // 0: Lambert, 1: Phong, 2: Blinn-Phong

varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightPos - vWorldPosition);
  vec3 V = normalize(uViewPos - vWorldPosition);

  // 1. Lambert (Difuso)
  float dotNL = max(dot(N, L), 0.0);
  vec3 diffuse = uDiffuseStrength * dotNL * vec3(1.0, 0.5, 0.2);

  vec3 specular = vec3(0.0);

  if (uMode == 1) { 
    // 2. Phong Clásico (Reflexión)
    vec3 R = reflect(-L, N);
    float specFactor = pow(max(dot(R, V), 0.0), uShininess);
    specular = uSpecularStrength * specFactor * vec3(1.0);
  } 
  else if (uMode == 2) {
    // 3. Blinn-Phong (Halfway vector)
    vec3 H = normalize(L + V);
    float specFactor = pow(max(dot(N, H), 0.0), uShininess);
    specular = uSpecularStrength * specFactor * vec3(1.0);
  }

  // Si uMode es 0 (Lambert), specular se queda en 0.0
  vec3 finalColor = diffuse + specular;
  
  // Gamma correction básica para que los colores no se vean lavados
  finalColor = pow(finalColor, vec3(1.0/2.2));
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`;