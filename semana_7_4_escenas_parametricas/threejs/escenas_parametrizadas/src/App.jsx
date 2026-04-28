import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, Environment, Float, Text } from '@react-three/drei'
import { useControls, folder, button } from 'leva'
import { useRef, useMemo, useState } from 'react'
import './App.css'

// ─── DATASET PRINCIPAL ───────────────────────────────────────────────────────
// Array de objetos estructurados: cada uno define geometría, posición y metadata
const DATASET = [
  { id: 0, type: 'box',      x: -4.0, z:  0.0, value: 0.80, category: 'A', label: 'α' },
  { id: 1, type: 'sphere',   x: -2.5, z:  1.5, value: 0.40, category: 'B', label: 'β' },
  { id: 2, type: 'cylinder', x: -1.0, z: -1.5, value: 1.00, category: 'A', label: 'γ' },
  { id: 3, type: 'cone',     x:  0.5, z:  2.0, value: 0.60, category: 'C', label: 'δ' },
  { id: 4, type: 'torus',    x:  2.0, z:  0.0, value: 0.35, category: 'B', label: 'ε' },
  { id: 5, type: 'box',      x:  3.5, z: -1.5, value: 0.90, category: 'C', label: 'ζ' },
  { id: 6, type: 'sphere',   x: -3.0, z: -2.5, value: 0.55, category: 'A', label: 'η' },
  { id: 7, type: 'cylinder', x:  1.0, z: -3.0, value: 0.70, category: 'C', label: 'θ' },
  { id: 8, type: 'cone',     x: -1.5, z:  3.0, value: 0.25, category: 'B', label: 'ι' },
  { id: 9, type: 'torus',    x:  4.0, z:  2.5, value: 0.85, category: 'A', label: 'κ' },
]

// ─── PALETAS DE COLOR ─────────────────────────────────────────────────────────
const COLORS = {
  category: { A: '#00d4ff', B: '#ff6b35', C: '#a855f7' },
  type: {
    box:      '#22d3ee',
    sphere:   '#f59e0b',
    cylinder: '#10b981',
    cone:     '#f43f5e',
    torus:    '#8b5cf6',
  },
}

// ─── COMPONENTE: OBJETO PARAMÉTRICO ──────────────────────────────────────────
function ParametricObject({ data, globalScale, rotSpeed, wireframe, colorMode, showLabels, floatEnabled }) {
  const meshRef = useRef()

  // Animación: rotación continua escalada por el valor del dato
  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += delta * rotSpeed * data.value
    meshRef.current.rotation.x += delta * rotSpeed * 0.25 * data.value
  })

  // Derivar propiedades desde los datos
  const scale     = data.value * globalScale           // escala ← valor
  const posY      = data.value * 1.8                   // altura ← valor
  const emissiveI = 0.05 + data.value * 0.2            // brillo ← valor

  // Color condicional según modo seleccionado
  const color = useMemo(() => {
    if (colorMode === 'category') return COLORS.category[data.category]
    if (colorMode === 'type')     return COLORS.type[data.type]
    // colorMode === 'gradient': mapear valor → matiz HSL
    const hue = Math.round(data.value * 260)
    return `hsl(${hue}, 90%, 60%)`
  }, [colorMode, data])

  // Geometría condicional según tipo
  const geometry = useMemo(() => {
    switch (data.type) {
      case 'box':      return <boxGeometry args={[1, 1, 1]} />
      case 'sphere':   return <sphereGeometry args={[0.62, 32, 32]} />
      case 'cylinder': return <cylinderGeometry args={[0.38, 0.38, 1.3, 32]} />
      case 'cone':     return <coneGeometry args={[0.5, 1.3, 32]} />
      case 'torus':    return <torusGeometry args={[0.42, 0.16, 16, 100]} />
      default:         return <boxGeometry args={[1, 1, 1]} />
    }
  }, [data.type])

  const mesh = (
    <group position={[data.x, posY, data.z]}>
      <mesh ref={meshRef} scale={scale} castShadow receiveShadow>
        {geometry}
        <meshStandardMaterial
          color={color}
          wireframe={wireframe}
          metalness={0.4}
          roughness={0.35}
          emissive={color}
          emissiveIntensity={emissiveI}
        />
      </mesh>

      {/* Etiqueta flotante con ID */}
      {showLabels && (
        <Text
          position={[0, scale + 0.45, 0]}
          fontSize={0.28}
          color={color}
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          {data.label} · {data.value.toFixed(2)}
        </Text>
      )}

      {/* Línea vertical al suelo: indica la altura basada en valor */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, 0, posY * -1, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} transparent opacity={0.3} />
      </line>
    </group>
  )

  return floatEnabled ? (
    <Float speed={1 + data.value * 2} rotationIntensity={0} floatIntensity={data.value * 0.6}>
      {mesh}
    </Float>
  ) : mesh
}

// ─── COMPONENTE: ESCENA ───────────────────────────────────────────────────────
function Scene() {
  const {
    globalScale, rotSpeed, wireframe, floatEnabled, showGrid, showLabels,
    colorMode, filterCategory, minValue, maxValue,
  } = useControls({
    '◈ Geometría': folder({
      globalScale:  { value: 1.0, min: 0.1, max: 3.0, step: 0.05, label: 'Escala global' },
      rotSpeed:     { value: 0.4, min: 0.0, max: 4.0, step: 0.05, label: 'Vel. rotación' },
      wireframe:    { value: false, label: 'Wireframe' },
      floatEnabled: { value: true,  label: 'Flotación' },
    }, { collapsed: false }),

    '◈ Visual': folder({
      colorMode: {
        value: 'category',
        options: { 'Por categoría': 'category', 'Por tipo': 'type', 'Por valor (gradiente)': 'gradient' },
        label: 'Modo color',
      },
      showGrid:   { value: true,  label: 'Mostrar grid' },
      showLabels: { value: true,  label: 'Mostrar etiquetas' },
    }, { collapsed: false }),

    '◈ Filtros': folder({
      filterCategory: {
        value: 'Todos',
        options: ['Todos', 'A', 'B', 'C'],
        label: 'Categoría',
      },
      minValue: { value: 0.0, min: 0, max: 1, step: 0.05, label: 'Valor mínimo' },
      maxValue: { value: 1.0, min: 0, max: 1, step: 0.05, label: 'Valor máximo' },
    }, { collapsed: false }),
  })

  // map() + condicionales: filtrar dataset según parámetros
  const visible = useMemo(() => {
    return DATASET.filter(obj => {
      const catOk = filterCategory === 'Todos' || obj.category === filterCategory
      const valOk = obj.value >= minValue && obj.value <= maxValue
      return catOk && valOk
    })
  }, [filterCategory, minValue, maxValue])

  return (
    <>
      {/* Iluminación */}
      <ambientLight intensity={0.25} />
      <directionalLight position={[10, 12, 6]} intensity={1.8} castShadow shadow-mapSize={2048} />
      <pointLight position={[-6, 6, -6]} intensity={1.2} color="#00d4ff" />
      <pointLight position={[ 6, 4,  6]} intensity={0.9} color="#ff6b35" />

      {/* Grid de referencia */}
      {showGrid && (
        <Grid
          position={[0, -0.01, 0]}
          args={[24, 24]}
          cellSize={1}
          cellThickness={0.4}
          cellColor="#1e293b"
          sectionSize={4}
          sectionThickness={0.8}
          sectionColor="#334155"
          fadeDistance={28}
          infiniteGrid
        />
      )}

      {/* map() → render paramétrico de objetos filtrados */}
      {visible.map(obj => (
        <ParametricObject
          key={obj.id}
          data={obj}
          globalScale={globalScale}
          rotSpeed={rotSpeed}
          wireframe={wireframe}
          colorMode={colorMode}
          showLabels={showLabels}
          floatEnabled={floatEnabled}
        />
      ))}

      <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
      <Environment preset="city" />
    </>
  )
}

// ─── COMPONENTE: TABLA DE DATOS ───────────────────────────────────────────────
function DataTable({ colorMode, filterCategory, minValue, maxValue }) {
  const visible = DATASET.filter(obj => {
    const catOk = filterCategory === 'Todos' || obj.category === filterCategory
    const valOk = obj.value >= minValue && obj.value <= maxValue
    return catOk && valOk
  })

  const getColor = (obj) => {
    if (colorMode === 'category') return COLORS.category[obj.category]
    if (colorMode === 'type')     return COLORS.type[obj.type]
    const hue = Math.round(obj.value * 260)
    return `hsl(${hue}, 90%, 60%)`
  }

  return (
    <div className="data-table">
      <div className="table-header">
        <span>Dataset — {visible.length}/{DATASET.length} objetos</span>
      </div>
      <div className="table-rows">
        {DATASET.map(obj => {
          const isVisible = visible.includes(obj)
          const color = getColor(obj)
          return (
            <div key={obj.id} className={`table-row ${!isVisible ? 'hidden-row' : ''}`}>
              <span className="row-label" style={{ color }}>{obj.label}</span>
              <span className="row-type">{obj.type}</span>
              <span className="row-cat">{obj.category}</span>
              <div className="row-bar-wrap">
                <div className="row-bar" style={{ width: `${obj.value * 100}%`, background: color }} />
              </div>
              <span className="row-val">{obj.value.toFixed(2)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  // Leva no expone los valores fuera del canvas fácilmente,
  // así que duplicamos el estado mínimo para la tabla de datos
  const [uiState] = useState({
    colorMode: 'category',
    filterCategory: 'Todos',
    minValue: 0,
    maxValue: 1,
  })

  return (
    <div className="app-root">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <span className="workshop-chip">semana_7_4</span>
          <div className="header-titles">
            <h1>Escenas Paramétricas</h1>
            <p>Geometría 3D generada desde arrays de datos estructurados</p>
          </div>
        </div>
        <div className="legend">
          {Object.entries(COLORS.category).map(([cat, clr]) => (
            <div key={cat} className="legend-item">
              <span className="legend-dot" style={{ background: clr }} />
              <span>Cat. {cat}</span>
            </div>
          ))}
          <div className="legend-sep" />
          {['box','sphere','cylinder','cone','torus'].map(t => (
            <div key={t} className="legend-item">
              <span className="legend-dot legend-dot--sq" style={{ background: COLORS.type[t] }} />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </header>

      {/* Main layout */}
      <div className="main-layout">
        {/* Canvas 3D */}
        <div className="canvas-area">
          <Canvas
            camera={{ position: [9, 7, 9], fov: 48 }}
            shadows
            gl={{ antialias: true, alpha: false }}
          >
            <color attach="background" args={['#080d14']} />
            <fog attach="fog" args={['#080d14', 18, 32]} />
            <Scene />
          </Canvas>

          {/* Corner badge */}
          <div className="canvas-badge">
            <span>Three.js · React Three Fiber · Leva</span>
          </div>
        </div>

        {/* Data sidebar */}
        <aside className="sidebar">
          <DataTable
            colorMode={uiState.colorMode}
            filterCategory={uiState.filterCategory}
            minValue={uiState.minValue}
            maxValue={uiState.maxValue}
          />

          <div className="code-snippet">
            <div className="snippet-title">Mapeo paramétrico</div>
            <pre>{`DATASET
  .filter(obj =>
    obj.value >= minValue &&
    obj.category === cat
  )
  .map(obj => (
    <ParametricObject
      key={obj.id}
      data={obj}
      scale={obj.value * globalScale}
      color={COLORS[colorMode][obj.category]}
    />
  ))`}</pre>
          </div>
        </aside>
      </div>
    </div>
  )
}
