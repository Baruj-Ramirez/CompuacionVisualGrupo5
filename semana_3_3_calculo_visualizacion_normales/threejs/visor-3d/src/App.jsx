import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment } from '@react-three/drei'
import { useRef, useEffect, useState, useMemo } from 'react'
import { useControls, Leva } from 'leva'
import * as THREE from 'three'
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper'
import './App.css'

// ═══════════════════════════════════════════════════════════
// SHADER: colorea la malla según la dirección de la normal
// Rojo=X, Verde=Y, Azul=Z — técnica estándar de debug
// ═══════════════════════════════════════════════════════════
const normalShaderMaterial = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      // Pasamos la normal al fragment shader
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    void main() {
      // Convertimos normal de [-1,1] a [0,1] para visualizar como color
      // X → Rojo, Y → Verde, Z → Azul
      vec3 color = normalize(vNormal) * 0.5 + 0.5;
      gl_FragColor = vec4(color, 1.0);
    }
  `,
  side: THREE.DoubleSide,
})

// ═══════════════════════════════════════════════════════════
// HOOK: calcula normales manuales desde la geometría
// Implementa el mismo producto cruz que usamos en Python
// ═══════════════════════════════════════════════════════════
function calcularNormalesManuales(geometry) {
  const posiciones = geometry.attributes.position
  const indices    = geometry.index

  // Creamos un array para acumular normales por vértice
  const normalesAcum = new Float32Array(posiciones.count * 3)

  const vA = new THREE.Vector3()
  const vB = new THREE.Vector3()
  const vC = new THREE.Vector3()
  const v1 = new THREE.Vector3()
  const v2 = new THREE.Vector3()
  const normalCara = new THREE.Vector3()

  const procesarTriangulo = (iA, iB, iC) => {
    vA.fromBufferAttribute(posiciones, iA)
    vB.fromBufferAttribute(posiciones, iB)
    vC.fromBufferAttribute(posiciones, iC)

    // Producto cruz: v1 = B-A, v2 = C-A
    v1.subVectors(vB, vA)
    v2.subVectors(vC, vA)
    normalCara.crossVectors(v1, v2).normalize()

    // Acumulamos la normal en los 3 vértices del triángulo
    for (const idx of [iA, iB, iC]) {
      normalesAcum[idx * 3]     += normalCara.x
      normalesAcum[idx * 3 + 1] += normalCara.y
      normalesAcum[idx * 3 + 2] += normalCara.z
    }
  }

  if (indices) {
    for (let i = 0; i < indices.count; i += 3)
      procesarTriangulo(indices.getX(i), indices.getX(i+1), indices.getX(i+2))
  } else {
    for (let i = 0; i < posiciones.count; i += 3)
      procesarTriangulo(i, i+1, i+2)
  }

  // Normalizamos cada normal acumulada
  const temp = new THREE.Vector3()
  for (let i = 0; i < posiciones.count; i++) {
    temp.set(normalesAcum[i*3], normalesAcum[i*3+1], normalesAcum[i*3+2])
    temp.normalize()
    normalesAcum[i*3]     = temp.x
    normalesAcum[i*3+1]   = temp.y
    normalesAcum[i*3+2]   = temp.z
  }

  return new THREE.BufferAttribute(normalesAcum, 3)
}

// ═══════════════════════════════════════════════════════════
// COMPONENTE: VisualizadorNormales
// Carga el modelo, aplica modos de shading y muestra helpers
// ═══════════════════════════════════════════════════════════
function VisualizadorNormales({ modoShading, mostrarHelper, tamanoHelper, modoNormales, onInfo }) {
  const { scene } = useGLTF('/modelo.glb')
  const groupRef  = useRef()
  const helperRef = useRef()
  const { scene: threeScene } = useThree()

  // Guardamos geometrías y normales originales para restaurar
  const datosOriginales = useRef([])
  const [meshPrincipal, setMeshPrincipal] = useState(null)

  // ── Extrae la primera malla del modelo ─────────────────────
  useEffect(() => {
    let primerMesh = null
    scene.traverse(child => {
      if (child.isMesh && !primerMesh) primerMesh = child
    })
    if (primerMesh) {
      setMeshPrincipal(primerMesh)

      // Guardamos normales originales de todas las mallas
      scene.traverse(child => {
        if (child.isMesh && child.geometry.attributes.normal) {
          datosOriginales.current.push({
            mesh: child,
            normalesOriginales: child.geometry.attributes.normal.array.slice()
          })
        }
      })

      // Info de la malla para el panel
      const geo = primerMesh.geometry
      onInfo({
        vertices  : geo.attributes.position.count,
        triangulos: geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3,
        normales  : geo.attributes.normal ? geo.attributes.normal.count : 0,
      })
    }
  }, [scene])

  // ── Aplica el modo de normales seleccionado ─────────────────
  useEffect(() => {
    scene.traverse(child => {
      if (!child.isMesh) return
      const geo = child.geometry

      if (modoNormales === 'smooth') {
        // Smooth: computeVertexNormals() promedia normales entre caras adyacentes
        geo.computeVertexNormals()

      } else if (modoNormales === 'flat') {
        // Flat: cada vértice recibe la normal de su cara
        // Lo logramos asignando a cada grupo de 3 vértices la misma normal
        const pos = geo.attributes.position
        const idx = geo.index
        const normalesFlat = new Float32Array(pos.count * 3)

        const vA = new THREE.Vector3()
        const vB = new THREE.Vector3()
        const vC = new THREE.Vector3()
        const nCara = new THREE.Vector3()

        const asignarNormal = (iA, iB, iC) => {
          vA.fromBufferAttribute(pos, iA)
          vB.fromBufferAttribute(pos, iB)
          vC.fromBufferAttribute(pos, iC)
          nCara.crossVectors(
            new THREE.Vector3().subVectors(vB, vA),
            new THREE.Vector3().subVectors(vC, vA)
          ).normalize()
          for (const i of [iA, iB, iC]) {
            normalesFlat[i*3]   = nCara.x
            normalesFlat[i*3+1] = nCara.y
            normalesFlat[i*3+2] = nCara.z
          }
        }

        if (idx) {
          for (let i = 0; i < idx.count; i += 3)
            asignarNormal(idx.getX(i), idx.getX(i+1), idx.getX(i+2))
        } else {
          for (let i = 0; i < pos.count; i += 3)
            asignarNormal(i, i+1, i+2)
        }

        geo.setAttribute('normal', new THREE.BufferAttribute(normalesFlat, 3))

      } else if (modoNormales === 'manual') {
        // Manual: nuestro propio cálculo con producto cruz
        const normalesManuales = calcularNormalesManuales(geo)
        geo.setAttribute('normal', normalesManuales)

      } else if (modoNormales === 'original') {
        // Restauramos las normales originales del archivo
        const datos = datosOriginales.current.find(d => d.mesh === child)
        if (datos) {
          geo.setAttribute('normal',
            new THREE.BufferAttribute(datos.normalesOriginales.slice(), 3))
        }
      }

      geo.attributes.normal.needsUpdate = true
    })
  }, [modoNormales, scene])

  // ── Aplica el modo de shading (shader de normales o estándar) ─
  useEffect(() => {
    scene.traverse(child => {
      if (!child.isMesh) return

      if (modoShading === 'normal_shader') {
        child.material = normalShaderMaterial
      } else if (modoShading === 'standard') {
        child.material = new THREE.MeshStandardMaterial({
          color: 0x88bbee,
          roughness: 0.6,
          metalness: 0.1,
        })
      } else if (modoShading === 'wireframe') {
        child.material = new THREE.MeshStandardMaterial({
          color: 0x4fc3f7,
          wireframe: true,
        })
      }
    })
  }, [modoShading, scene])

  // ── VertexNormalsHelper ────────────────────────────────────
  useEffect(() => {
    // Eliminamos helper anterior si existe
    if (helperRef.current) {
      threeScene.remove(helperRef.current)
      helperRef.current.dispose?.()
      helperRef.current = null
    }

    if (mostrarHelper && meshPrincipal) {
      const helper = new VertexNormalsHelper(meshPrincipal, tamanoHelper, 0x00ff00)
      threeScene.add(helper)
      helperRef.current = helper
    }

    return () => {
      if (helperRef.current) {
        threeScene.remove(helperRef.current)
        helperRef.current = null
      }
    }
  }, [mostrarHelper, meshPrincipal, tamanoHelper, threeScene])

  // Actualizamos el helper cada frame para seguir al modelo
  useFrame(() => {
    if (helperRef.current) helperRef.current.update()
  })

  return <primitive ref={groupRef} object={scene} />
}

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Panel de info del modelo
// ═══════════════════════════════════════════════════════════
function PanelInfo({ info, modoShading, modoNormales }) {
  const etiquetasShading = {
    standard      : 'Standard',
    normal_shader : 'Normal Map Shader',
    wireframe     : 'Wireframe',
  }
  const etiquetasNormales = {
    original : 'Originales (archivo)',
    smooth   : 'Smooth (computeVertexNormals)',
    flat     : 'Flat (por cara)',
    manual   : 'Manuales (producto cruz)',
  }

  return (
    <div className="panel-info">
      <p className="panel-titulo">MALLA</p>
      <div className="panel-fila">
        <span>Vértices</span>
        <span>{info.vertices?.toLocaleString() ?? '—'}</span>
      </div>
      <div className="panel-fila">
        <span>Triángulos</span>
        <span>{info.triangulos?.toLocaleString() ?? '—'}</span>
      </div>
      <div className="panel-fila">
        <span>Normales</span>
        <span>{info.normales?.toLocaleString() ?? '—'}</span>
      </div>
      <div className="panel-separador" />
      <p className="panel-titulo">MODO</p>
      <div className="panel-fila destacado">
        <span>Shading</span>
        <span>{etiquetasShading[modoShading]}</span>
      </div>
      <div className="panel-fila destacado">
        <span>Normales</span>
        <span>{etiquetasNormales[modoNormales]}</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// COMPONENTE RAÍZ
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [infoMalla, setInfoMalla] = useState({})

  const {
    modoShading,
    modoNormales,
    mostrarHelper,
    tamanoHelper,
  } = useControls({
    modoShading: {
      value  : 'standard',
      options: {
        'Standard'           : 'standard',
        'Normal Map Shader'  : 'normal_shader',
        'Wireframe'          : 'wireframe',
      },
      label: 'Visualización'
    },
    modoNormales: {
      value  : 'original',
      options: {
        'Originales'         : 'original',
        'Smooth (computeVertexNormals)' : 'smooth',
        'Flat (por cara)'    : 'flat',
        'Manuales (producto cruz)' : 'manual',
      },
      label: 'Tipo de normales'
    },
    mostrarHelper: { value: true,  label: 'Mostrar helper normales' },
    tamanoHelper : { value: 0.05,  min: 0.01, max: 0.3, step: 0.01, label: 'Tamaño helper' },
  })

  return (
    <div className="app">
      <Leva
        theme={{
          colors: {
            accent1   : '#4fc3f7',
            accent2   : '#81c784',
            accent3   : '#ffcc02',
            highlight1: '#e0e0e0',
            highlight2: '#b0bec5',
          }
        }}
        titleBar={{ title: '🔺 Normales — Controles', drag: true }}
      />

      <PanelInfo
        info={infoMalla}
        modoShading={modoShading}
        modoNormales={modoNormales}
      />

      <Canvas
        camera={{ position: [0, 1, 3], fov: 50 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, 3, -5]} intensity={0.3} />
        <Environment preset="city" />
        <OrbitControls enablePan enableZoom enableRotate />

        <VisualizadorNormales
          modoShading={modoShading}
          mostrarHelper={mostrarHelper}
          tamanoHelper={tamanoHelper}
          modoNormales={modoNormales}
          onInfo={setInfoMalla}
        />
      </Canvas>
    </div>
  )
}
