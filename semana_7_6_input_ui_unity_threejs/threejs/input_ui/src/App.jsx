import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";

function InteractiveBox() {
  const meshRef = useRef();
  const { mouse, viewport } = useThree();

  const [position, setPosition] = useState([0, 0, 0]);
  const [active, setActive] = useState(true);
  const [color, setColor] = useState("orange");

  // 🎮 Movimiento con el mouse
  useFrame(() => {
    if (active) {
      const x = (mouse.x * viewport.width) / 2;
      const y = (mouse.y * viewport.height) / 2;
      setPosition([x, y, 0]);
    }
  });

  // ⌨️ Evento teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "r") {
        setPosition([0, 0, 0]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 🖱️ Click → cambiar color
  const handleClick = () => {
    setColor(color === "orange" ? "hotpink" : "orange");
  };

  return (
    <>
      <mesh
        ref={meshRef}
        position={position}
        onClick={handleClick}
      >
        <boxGeometry />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* 🧩 UI en escena */}
      <Html position={[0, 2, 0]}>
        <button onClick={() => setActive(!active)}>
          {active ? "Detener seguimiento" : "Seguir mouse"}
        </button>
      </Html>
    </>
  );
}

export default function App() {
  return (
    <Canvas>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <InteractiveBox />
    </Canvas>
  );
}