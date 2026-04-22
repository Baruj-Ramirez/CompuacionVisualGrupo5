
# Taller – Arquitectura de Escenas y Navegación

**Integrantes:**  
- Joan Sebastian Roberto Puerto  
- Baruj Vladimir Ramírez Escalante  
- Diego Alberto Romero Olmos  
- Maicol Sebastian Olarte Ramirez  
- Jorge Isaac Alandete Díaz  

**Fecha de entrega:** 21 de abril de 2026  

---

## Descripción breve

El objetivo del taller es diseñar una estructura escalable para una aplicación interactiva con múltiples escenas (pantallas) que permita moverse entre menús, niveles o etapas. En esta implementación con **Three.js + React** se crean tres escenas independientes (**Menú principal**, **Juego** y **Créditos**) y se navega entre ellas usando `react-router-dom`. Cada escena contiene elementos 3D básicos (cubos, esferas, planos, estrellas) y botones de navegación superpuestos.

---

## Implementaciones (Three.js)

### Tecnologías utilizadas
- `@react-three/fiber` – Renderizador de Three.js en React.
- `@react-three/drei` – Componentes auxiliares (`OrbitControls`, `Stars`).
- `react-router-dom` – Enrutamiento para cambiar entre escenas.
- Vite – Entorno de desarrollo.

### Estructura de componentes
- `Menu.jsx` – Escena principal con un cubo naranja rotante y botones para iniciar juego o ver créditos.
- `Juego.jsx` – Escena de juego con suelo, personaje (esfera azul), obstáculo (cubo rojo) y coleccionable (cubo dorado). Botones para volver al menú o ir a créditos.
- `Creditos.jsx` – Escena con fondo de estrellas (`<Stars>`) y un toroide decorativo. Botones para regresar al menú o al juego.

### Navegación
- **Rutas definidas en `App.jsx`**:
  - `/` → Menú principal
  - `/juego` → Escena de juego
  - `/creditos` → Pantalla de créditos
- **Enlaces**: Se usan `<Link to="...">` en el menú y `useNavigate()` en los botones de las otras escenas.

### Características de cada escena

| Escena | Elementos 3D | Interacción |
|--------|--------------|--------------|
| Menú | Cubo naranja con rotación automática, plano negro simulando cartel | Botones "Jugar" y "Créditos" |
| Juego | Suelo verde, esfera azul (personaje), cubo rojo (obstáculo), cubo dorado (coleccionable) | Cámara controlable con `OrbitControls`, botones "Menú" y "Créditos" |
| Créditos | Fondo de estrellas, toroide cyan con wireframe | Botones "Menú" y "Juego" |

---

## Resultados visuales

| Escena | GIF demostrativo |
|--------|------------------|
| **Menú principal** – Cubo rotante y botones de navegación | ![Menú Three.js](media/threejs_menu.gif) |
| **Escena de juego** – Personaje, obstáculo, coleccionable y controles de cámara | ![Juego Three.js](media/threejs_jugar.gif) |
| **Pantalla de créditos** – Fondo estrellado y toroide decorativo | ![Créditos Three.js](media/threejs_creditos.gif) |

> Los archivos GIF se encuentran en la carpeta `media/` del repositorio.

---

## Código relevante

### Enrutamiento con React Router (`App.jsx`)

```jsx
import { Routes, Route } from 'react-router-dom';
import Menu from './assets/Menu';
import Juego from './assets/Juego';
import Creditos from './assets/Creditos';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Menu />} />
      <Route path="/juego" element={<Juego />} />
      <Route path="/creditos" element={<Creditos />} />
    </Routes>
  );
}
```

### Navegación desde el menú (`Menu.jsx`)

```jsx
import { Link } from 'react-router-dom';
// ...
<Link to="/juego">
  <button>Jugar</button>
</Link>
<Link to="/creditos">
  <button>Créditos</button>
</Link>
```

### Navegación desde juego o créditos (`Juego.jsx`, `Creditos.jsx`)

```jsx
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
// ...
<button onClick={() => navigate('/')}>Menú</button>
<button onClick={() => navigate('/creditos')}>Créditos</button>
```

### Escena 3D básica (ejemplo del juego)

```jsx
<Canvas camera={{ position: [4, 3, 5], fov: 50 }}>
  <ambientLight intensity={0.4} />
  <directionalLight position={[5, 10, 5]} intensity={1} />
  {/* Suelo */}
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
    <planeGeometry args={[8, 8]} />
    <meshStandardMaterial color="lightgreen" />
  </mesh>
  {/* Personaje */}
  <mesh position={[0, 0, 0]}>
    <sphereGeometry args={[0.5, 32, 32]} />
    <meshStandardMaterial color="blue" />
  </mesh>
  <OrbitControls />
</Canvas>
```

---

## Prompts utilizados (IA generativa)

Durante el desarrollo se emplearon los siguientes prompts con asistentes de IA (ChatGPT, Claude):

1. *“Agrega un cubo que rote en el menú, una escena de juego con suelo, personaje y obstáculo, y créditos con estrellas de fondo.”*
2. *“Soluciona el error de importación cuando los componentes están en la carpeta assets en lugar de components.”*

---

## Aprendizajes y dificultades

### Aprendizajes clave
- **Integración de React Router con Canvas 3D** – Es posible superponer elementos HTML (botones) sobre el canvas sin interferir con la escena.
- **Organización modular** – Separar cada escena en su propio componente facilita el mantenimiento y la escalabilidad.
- **Uso básico de `@react-three/drei`** – Componentes como `OrbitControls` y `Stars` aceleran el desarrollo.
- **Control de errores de rutas** – Asegurarse de que `BrowserRouter` envuelva a `App` en `main.jsx`.

### Dificultades encontradas

- **Fondos de escena** – Inicialmente el canvas ocupaba solo una parte de la pantalla; se solucionó con `width: '100vw', height: '100vh'` en el contenedor.
- **Rotación automática en el menú** – Se logró usando `Date.now()` dentro de `useFrame` (aunque en la versión final se usó `rotation={[Date.now() * 0.002, ...]}` directamente en el mesh).
- **Visibilidad de los botones** – Se añadió `position: 'absolute'` y `z-index` implícito para que queden por encima del canvas.

---

## Checklist final (Three.js)

- [x] Carpeta con formato `semana_7_1_arquitectura_escenas_navegacion_unity_threejs/threejs/`
- [x] `README.md` explicando la implementación en Three.js
- [x] Carpeta `media/` con tres GIFs (`threejs_menu.gif`, `threejs_jugar.gif`, `threejs_creditos.gif`)
- [x] `.gitignore` configurado para Node.js (ignora `node_modules`, `.env`, etc.)
- [x] Commits descriptivos en inglés (ej: “Add Three.js scenes with React Router”, “Fix import paths for components”)
- [x] Repositorio público verificado
- [x] Proyecto individual – todos los archivos subidos en la estructura correcta

---
