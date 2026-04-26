import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import { useControls, Leva } from 'leva'
import * as THREE from 'three'
import './App.css'

// ═══════════════════════════════════════════════════════════
// SHADER: objeto central animado con uTime + hover + mouse
// Simula un efecto de energía / plasma líquido
// ═══════════════════════════════════════════════════════════
const energyVertexShader = `
  uniform float uTime;
  uniform float uHover;
  varying vec3  vNormal;
  varying vec3  vPosition;
  varying float vDisplace;

  // Noise simplex ligero (hash + interpolación)
  vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g  = step(x0.yzx, x0.xyz);
    vec3 l  = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j  = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0*x_);
    vec4 x  = x_ *ns.x + ns.yyyy;
    vec4 y  = y_ *ns.x + ns.yyyy;
    vec4 h  = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vNormal   = normalize(normalMatrix * normal);
    vPosition = position;

    // Deformación procedural animada
    float n1 = snoise(position * 1.5 + uTime * 0.4);
    float n2 = snoise(position * 3.0 - uTime * 0.6);
    float displace = (n1 * 0.15 + n2 * 0.08) * (1.0 + uHover * 0.8);
    vDisplace = displace;

    vec3 displaced = position + normal * displace;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`

const energyFragmentShader = `
  uniform float uTime;
  uniform float uHover;
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorC;
  varying vec3  vNormal;
  varying vec3  vPosition;
  varying float vDisplace;

  void main() {
    // Fresnel: brillo en bordes
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - dot(vNormal, viewDir), 2.5);

    // Mezcla de colores según desplazamiento + tiempo
    float t = vDisplace * 3.0 + sin(uTime * 0.5) * 0.5 + 0.5;
    vec3 col = mix(uColorA, uColorB, smoothstep(0.0, 0.5, t));
    col      = mix(col,     uColorC, smoothstep(0.5, 1.0, t));

    // Anillos de energía animados
    float rings = sin(length(vPosition) * 8.0 - uTime * 2.0) * 0.5 + 0.5;
    col += rings * 0.12 * uColorC;

    // Fresnel glow
    col += fresnel * uColorC * (0.6 + uHover * 0.8);

    gl_FragColor = vec4(col, 1.0);
  }
`

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Objeto central con shader de energía
// ═══════════════════════════════════════════════════════════
function EnergyOrb({ colorA, colorB, colorC, onExplode, exploding }) {
  const meshRef    = useRef()
  const matRef     = useRef()
  const [hovered, setHovered]   = useState(false)
  const hoverSmooth = useRef(0)

  const shaderUniforms = useMemo(() => ({
    uTime   : { value: 0 },
    uHover  : { value: 0 },
    uColorA : { value: new THREE.Color(colorA) },
    uColorB : { value: new THREE.Color(colorB) },
    uColorC : { value: new THREE.Color(colorC) },
  }), [])

  // Actualiza colores cuando cambian en Leva
  useEffect(() => {
    shaderUniforms.uColorA.value.set(colorA)
    shaderUniforms.uColorB.value.set(colorB)
    shaderUniforms.uColorC.value.set(colorC)
  }, [colorA, colorB, colorC])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    shaderUniforms.uTime.value = t

    // Hover suavizado
    hoverSmooth.current += ((hovered ? 1 : 0) - hoverSmooth.current) * 0.08
    shaderUniforms.uHover.value = hoverSmooth.current

    // Pulso de escala
    if (meshRef.current && !exploding) {
      const pulse = 1 + Math.sin(t * 1.8) * 0.02 + hoverSmooth.current * 0.05
      meshRef.current.scale.setScalar(pulse)
    }
  })

  return (
    <mesh
      ref={meshRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={()  => setHovered(false)}
      onClick={onExplode}
      visible={!exploding}
    >
      <sphereGeometry args={[1, 128, 128]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={energyVertexShader}
        fragmentShader={energyFragmentShader}
        uniforms={shaderUniforms}
      />
    </mesh>
  )
}

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Sistema de partículas orbital
// ═══════════════════════════════════════════════════════════
function ParticleSystem({ count = 2000, colorA, colorC, exploding, explosionProgress }) {
  const pointsRef = useRef()

  // Genera posiciones, velocidades y datos por partícula
  const { positions, velocities, sizes, delays } = useMemo(() => {
    const positions  = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    const sizes      = new Float32Array(count)
    const delays     = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // Distribución esférica aleatoria en órbita
      const theta  = Math.random() * Math.PI * 2
      const phi    = Math.acos(2 * Math.random() - 1)
      const radius = 1.3 + Math.random() * 1.5

      positions[i*3]   = radius * Math.sin(phi) * Math.cos(theta)
      positions[i*3+1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i*3+2] = radius * Math.cos(phi)

      // Velocidad de explosión radial
      const speed = 2 + Math.random() * 5
      velocities[i*3]   = positions[i*3]   / radius * speed
      velocities[i*3+1] = positions[i*3+1] / radius * speed + (Math.random() - 0.5) * 2
      velocities[i*3+2] = positions[i*3+2] / radius * speed

      sizes[i]  = Math.random() * 3 + 1
      delays[i] = Math.random()
    }
    return { positions, velocities, sizes, delays }
  }, [count])

  // Referencia para las posiciones base (sin explosión)
  const basePositions = useMemo(() => positions.slice(), [positions])

  const posAttr   = useRef()
  const colorAttr = useRef()

  // Array de colores por partícula
  const colors = useMemo(() => {
    const c = new Float32Array(count * 3)
    const ca = new THREE.Color(colorA)
    const cc = new THREE.Color(colorC)
    for (let i = 0; i < count; i++) {
      const mix = Math.random()
      c[i*3]   = ca.r * mix + cc.r * (1 - mix)
      c[i*3+1] = ca.g * mix + cc.g * (1 - mix)
      c[i*3+2] = ca.b * mix + cc.b * (1 - mix)
    }
    return c
  }, [colorA, colorC])

  // Actualiza colores cuando cambian en Leva
  useEffect(() => {
    if (!colorAttr.current) return
    const ca = new THREE.Color(colorA)
    const cc = new THREE.Color(colorC)
    for (let i = 0; i < count; i++) {
      const mix = Math.random()
      colorAttr.current.array[i*3]   = ca.r * mix + cc.r * (1 - mix)
      colorAttr.current.array[i*3+1] = ca.g * mix + cc.g * (1 - mix)
      colorAttr.current.array[i*3+2] = ca.b * mix + cc.b * (1 - mix)
    }
    colorAttr.current.needsUpdate = true
  }, [colorA, colorC])

  useFrame(({ clock }) => {
    if (!posAttr.current || !pointsRef.current) return
    const t = clock.getElapsedTime()

    for (let i = 0; i < count; i++) {
      const bx = basePositions[i*3]
      const by = basePositions[i*3+1]
      const bz = basePositions[i*3+2]

      if (exploding) {
        // Explosión: mueve partículas según velocidad y progreso
        const delay  = delays[i] * 0.3
        const p      = Math.max(0, explosionProgress - delay) * 1.5
        const ease   = 1 - Math.exp(-p * 2)

        posAttr.current.array[i*3]   = bx + velocities[i*3]   * ease
        posAttr.current.array[i*3+1] = by + velocities[i*3+1] * ease - p * p * 0.5
        posAttr.current.array[i*3+2] = bz + velocities[i*3+2] * ease
      } else {
        // Órbita animada normal
        const angle  = t * 0.3 + (i / count) * Math.PI * 2
        const wobble = Math.sin(t * 1.2 + i * 0.5) * 0.05
        const radius = Math.sqrt(bx*bx + by*by + bz*bz) + wobble

        // Rotación orbital lenta
        const origAngle = Math.atan2(bz, bx)
        const newAngle  = origAngle + t * (0.1 + (i % 5) * 0.02)
        const latAngle  = Math.asin(Math.max(-1, Math.min(1, by / (radius + 0.001))))

        posAttr.current.array[i*3]   = radius * Math.cos(latAngle) * Math.cos(newAngle)
        posAttr.current.array[i*3+1] = radius * Math.sin(latAngle) + Math.sin(t + i) * 0.02
        posAttr.current.array[i*3+2] = radius * Math.cos(latAngle) * Math.sin(newAngle)
      }
    }
    posAttr.current.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          ref={posAttr}
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          ref={colorAttr}
          attach="attributes-color"
          args={[colors, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Anillo decorativo orbital
// ═══════════════════════════════════════════════════════════
function OrbitalRing({ radius, color, speed, tilt }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = clock.getElapsedTime() * speed
    }
  })
  return (
    <mesh ref={ref} rotation={[tilt, 0, 0]}>
      <torusGeometry args={[radius, 0.005, 16, 100]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} />
    </mesh>
  )
}

// ═══════════════════════════════════════════════════════════
// COMPONENTE RAÍZ
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [exploding, setExploding]             = useState(false)
  const [explosionProgress, setExplosionProgress] = useState(0)
  const explosionAnim = useRef(null)

  const { particleCount, colorA, colorB, colorC, showRings } = useControls({
    colorA: { value: '#1a3a6e', label: 'Color base' },
    colorB: { value: '#00c8ff', label: 'Color medio' },
    colorC: { value: '#a855f7', label: 'Color energía' },
    particleCount: { value: 2000, min: 500, max: 5000, step: 100, label: 'Partículas' },
    showRings: { value: true, label: 'Anillos orbitales' },
  })

  const handleExplode = useCallback(() => {
    if (exploding) return
    setExploding(true)
    setExplosionProgress(0)

    let start = null
    const duration = 2200

    const animate = (ts) => {
      if (!start) start = ts
      const elapsed  = ts - start
      const progress = Math.min(elapsed / duration, 1)
      setExplosionProgress(progress)

      if (progress < 1) {
        explosionAnim.current = requestAnimationFrame(animate)
      } else {
        // Reset después de la explosión
        setTimeout(() => {
          setExploding(false)
          setExplosionProgress(0)
        }, 600)
      }
    }
    explosionAnim.current = requestAnimationFrame(animate)
  }, [exploding])

  useEffect(() => () => {
    if (explosionAnim.current) cancelAnimationFrame(explosionAnim.current)
  }, [])

  return (
    <div className="app">
      <Leva
        theme={{
          colors: {
            accent1   : '#00c8ff',
            accent2   : '#a855f7',
            accent3   : '#ffcc02',
            highlight1: '#e0e0e0',
            highlight2: '#b0bec5',
          }
        }}
        titleBar={{ title: '⚡ Energía — Controles', drag: true }}
      />

      {/* HUD */}
      <div className="hud">
        <div className="hud-title">COMPUTACIÓN VISUAL</div>
        <div className="hud-subtitle">Geometría Procedural · Shader Material · Sistema de Partículas</div>
        <div className="hud-hint">
          {exploding ? '💥 Explosión en curso...' : 'Clic sobre la esfera para explotar'}
        </div>
      </div>

      {/* Panel de info */}
      <div className="panel-info">
        <p className="panel-titulo">ESCENA</p>
        <div className="panel-fila">
          <span>Geometría</span>
          <span>SphereGeometry (128×128)</span>
        </div>
        <div className="panel-fila">
          <span>Material</span>
          <span>ShaderMaterial</span>
        </div>
        <div className="panel-fila">
          <span>Partículas</span>
          <span>{particleCount.toLocaleString()}</span>
        </div>
        <div className="panel-separador" />
        <p className="panel-titulo">EFECTOS</p>
        <div className="panel-fila destacado">
          <span>Vertex shader</span>
          <span>Noise 3D + deform</span>
        </div>
        <div className="panel-fila destacado">
          <span>Fragment shader</span>
          <span>Fresnel + rings</span>
        </div>
        <div className="panel-fila destacado">
          <span>Hover</span>
          <span>uHover uniform</span>
        </div>
        <div className="panel-fila destacado">
          <span>Click</span>
          <span>Explosión radial</span>
        </div>
      </div>

      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <color attach="background" args={['#080b14']} />
        <ambientLight intensity={0.2} />
        <pointLight position={[5, 5, 5]}  intensity={2} color={colorC} />
        <pointLight position={[-5, -3, -5]} intensity={1} color={colorB} />
        <Environment preset="night" />
        <OrbitControls enablePan enableZoom enableRotate />

        <EnergyOrb
          colorA={colorA}
          colorB={colorB}
          colorC={colorC}
          onExplode={handleExplode}
          exploding={exploding}
        />

        <ParticleSystem
          count={particleCount}
          colorA={colorB}
          colorC={colorC}
          exploding={exploding}
          explosionProgress={explosionProgress}
        />

        {showRings && <>
          <OrbitalRing radius={1.8} color={colorB} speed={0.4}  tilt={0.3} />
          <OrbitalRing radius={2.2} color={colorC} speed={-0.25} tilt={1.1} />
          <OrbitalRing radius={2.6} color={colorB} speed={0.15} tilt={1.8} />
        </>}
      </Canvas>
    </div>
  )
}
