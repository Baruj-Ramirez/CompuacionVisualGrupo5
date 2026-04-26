import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useState } from "react";

function Objects({ mode }) {

  let color1 = "orange";
  let color2 = "skyblue";

  if (mode === "protanopia") {
    color1 = "#bfae6a";
    color2 = "#6a7fbf";
  }

  if (mode === "deuteranopia") {
    color1 = "#c9b458";
    color2 = "#587ac9";
  }

  if (mode === "monochrome") {
    color1 = "gray";
    color2 = "darkgray";
  }

  if (mode === "warm") {
    color1 = "#ff8844";
    color2 = "#ffcc99";
  }

  if (mode === "cool") {
    color1 = "#4488ff";
    color2 = "#88ccff";
  }

  return (
    <>
      <mesh position={[-2, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color1} />
      </mesh>

      <mesh position={[2, 0, 0]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial color={color2} />
      </mesh>
    </>
  );
}

function Scene({ mode }) {

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} />

      <Objects mode={mode} />

      <OrbitControls />
    </>
  );
}

export default function App() {

  const [mode, setMode] = useState("normal");

  return (
    <div style={{ width: "100vw", height: "100vh" }}>

      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          background: "white",
          padding: "10px",
          borderRadius: "8px"
        }}
      >

        <label>Color Mode:</label>

        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >

          <option value="normal">Normal</option>
          <option value="protanopia">Protanopia</option>
          <option value="deuteranopia">Deuteranopia</option>
          <option value="monochrome">Monochrome</option>
          <option value="warm">Warm Filter</option>
          <option value="cool">Cool Filter</option>

        </select>

      </div>

      <Canvas camera={{ position: [0, 2, 5] }}>

        <Scene mode={mode} />

      </Canvas>

    </div>
  );
}