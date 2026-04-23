# Taller Dashboards Visuales 3D: Sliders y Botones para Controlar Escenas

**Integrantes:**  
- Joan Sebastian Roberto Puerto  
- Baruj Vladimir Ramírez Escalante  
- Diego Alberto Romero Olmos  
- Maicol Sebastian Olarte Ramirez  
- Jorge Isaac Alandete Díaz  

**Fecha de entrega:** 23 de abril de 2026  


---

## Descripción breve

Este taller implementa un dashboard visual 3D interactivo usando **React Three Fiber** y **Leva**. Se creó una escena con un objeto 3D (TorusKnot) que puede ser modificado en tiempo real mediante controles deslizantes (sliders), selectores de color y botones. Además, se incluye el **bonus** de control completo sobre una luz puntual (intensidad, color y posición XYZ), haciendo evidente cómo la iluminación afecta la escena.

---

## Implementaciones realizadas (Three.js)

### 1. Objeto 3D y controles básicos
- **Objeto:** TorusKnot (geometría compleja con nudos).
- **Controles Leva:**
  - `scale` (slider): modifica la escala del objeto (0.1 – 3).
  - `color` (selector de color): cambia el color del material.
  - `Toggle Auto-rotate` (botón): activa/desactiva la rotación automática.
  - `Toggle Wireframe` (botón): alterna entre modo sólido y modo alambre.

### 2. Control de luz (Bonus)
- **Luz ambiente** muy baja (`intensity = 0.1`) para que la luz puntual sea la protagonista.
- **Luz puntual** con controles:
  - `lightIntensity` (slider): 0 – 3.
  - `lightColor` (selector de color).
  - `lightPosX`, `lightPosY`, `lightPosZ` (sliders): posición de la luz en el espacio (-8 a 8).
- **Esfera amarilla** que indica la posición exacta de la luz, facilitando la visualización de los cambios.

### 3. Interacción adicional
- **OrbitControls** permite mover la cámara (zoom, rotación, paneo).
- La escena responde en tiempo real a todos los ajustes.

---

## Resultados visuales

A continuación se muestran GIFs demostrativos del funcionamiento. Todos los archivos se encuentran en la carpeta `media/`.

### Control de color del objeto, auto‑rotación y modo wireframe

![Control de color, auto‑rotación y wireframe](./media/threejs_lightColor_AutoRotate_Wireframe.gif)

*En este GIF se observa el cambio de color del toro, la activación/desactivación de la rotación automática y la alternancia al modo wireframe.*

### Control de posición de la luz (X, Y, Z)

![Control de posición de la luz](./media/threejs_lightPosX_lightPosY_lightPosZ.gif)

*Se mueve la fuente de luz en los tres ejes. La esfera amarilla sigue a la luz, y se aprecia cómo la iluminación del toro cambia drásticamente al desplazar la luz.*

### Control de escala, color del objeto e intensidad de la luz

![Control de escala, color e intensidad de luz](./media/threejs_scale_color_lightIntensity.gif)

*El slider de escala agranda/reduce el toro, el selector de color modifica el material, y el slider de intensidad de luz aumenta o disminuye el brillo general de la escena.*

---

## Código relevante

El código completo se encuentra en la carpeta `threejs/src/App.jsx`. A continuación se muestra el fragmento central donde se definen los controles de Leva y la luz dinámica:

```jsx
// Controles de luz (posición, intensidad, color)
const { lightIntensity, lightColor, lightPosX, lightPosY, lightPosZ } = useControls({
  lightIntensity: { value: 1.5, min: 0, max: 3, step: 0.1 },
  lightColor: '#ffffff',
  lightPosX: { value: 5, min: -8, max: 8, step: 0.5 },
  lightPosY: { value: 5, min: -8, max: 8, step: 0.5 },
  lightPosZ: { value: 5, min: -8, max: 8, step: 0.5 },
});

// Uso de la luz puntual con valores dinámicos
<pointLight
  position={[lightPosX, lightPosY, lightPosZ]}
  intensity={lightIntensity}
  color={lightColor}
/>

// Esfera indicadora de la posición de la luz
<mesh position={[lightPosX, lightPosY, lightPosZ]}>
  <sphereGeometry args={[0.2, 16, 16]} />
  <meshStandardMaterial color="yellow" emissive="yellow" emissiveIntensity={0.5} />
</mesh>
```

Para ejecutar el proyecto:

```bash
cd threejs
npm install
npm run dev
```

---

## Prompts utilizados

Se utilizó la IA **ChatGPT** con los siguientes prompts:

1. *“Como hacer una escena en React Three Fiber con un TorusKnot.”*
2. *“Como controlar la luz puntual (intensidad, color y posición). Incluye una esfera que marque la ubicación de la luz.”*

---

## Aprendizajes y dificultades

**Aprendizajes:**
- Integración fluida de React Three Fiber con Leva para crear dashboards en 3D.
- Comprender cómo la posición de una luz puntual afecta la apariencia de un objeto (sombras, brillos, áreas iluminadas).
- Uso de una esfera auxiliar como “marcador visual” para depurar y mostrar en tiempo real la ubicación de la luz.

**Dificultades:**
- Al principio el control de luz no se notaba porque la luz ambiente tenía intensidad alta (0.5). Se redujo a 0.1 para que los cambios fueran evidentes.
- Coordinar la rotación automática con `useFrame` sin afectar el rendimiento; se solucionó usando `if (autoRotate)`.
- Asegurar que los GIFs capturados reflejaran claramente cada funcionalidad (se usó ScreenToGif en Windows con 15 FPS).

---

## Checklist de cumplimiento

- [x] Carpeta con formato `semana_7_3_dashboards_visuales_3d_sliders_botones`
- [x] `README.md` explicando cada actividad
- [x] Carpeta `media/` con tres GIFs y referencias en el README
- [x] `.gitignore` configurado para Node.js/Three.js (ignora `node_modules`, `.env`, etc.)
- [x] Commits descriptivos en inglés
- [x] Repositorio público verificado

