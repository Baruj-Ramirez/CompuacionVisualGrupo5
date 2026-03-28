import { useGLTF } from '@react-three/drei'
import { useLoader } from '@react-three/fiber'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'


function Model(props) {
  const { scene } = useGLTF('modelos/diglett_cgtrader_glb.glb')
  console.log(scene)

  return <primitive object={scene} {...props} />
}

function TexturedModel() {
  const { nodes } = useGLTF('/modelos/diglett_cgtrader_glb.glb')
  console.log(nodes)

  const texture = useLoader(THREE.TextureLoader, '/modelos/test_texture.png')

  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping

  // repite textura
  texture.repeat.set(2, 2)   
  texture.offset.set(0.1, 0.1)

  //Rotar la textura
  //texture.center.set(0.5, 0.5)
  //texture.rotation = Math.PI / 4

  return (
    <mesh geometry={nodes.Diglett.children[0].geometry}>
      <meshStandardMaterial map={texture} />
    </mesh>
  )

}


export default function App() {
  return (
    <Canvas 
      style={{ height: "75vh", width: "75vw" }}>
      <ambientLight />
      <directionalLight position={[2, 2, 2]} />      

      <TexturedModel/>

      <OrbitControls />
    </Canvas>
  )
}
