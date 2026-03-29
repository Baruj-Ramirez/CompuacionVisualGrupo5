# Taller Modelado Procedural Basico

## Nombres de estudiantes:

- Joan Sebastian Roberto Puerto
- Baruj Vladimir Ramírez Escalante
- Diego Alberto Romero Olmos
- Maicol Sebastian Olarte Ramirez
- Jorge Isaac Alandete Díaz

## Fecha de entrega

`2026-03-28`

---

## Descripción breve

Este taller explora la generación procedural de geometría 3D utilizando **Three.js** y **React Three Fiber**. Se implementaron cuatro escenas interactivas que demuestran diferentes técnicas: creación de estructuras repetitivas con instancias, espirales paramétricas, modificación dinámica de vértices con ondas y un árbol fractal recursivo con animación de viento.

---

## Implementaciones (Three.js)

Todas las implementaciones se encuentran en la carpeta `threejs/src/components/`. La escena principal (`App.jsx`) permite alternar entre las cuatro demostraciones mediante botones.

### 1. Grid – Cuadrícula de cubos instanciados

Se genera una cuadrícula de 11×11 cubos utilizando `instancedMesh`, lo que optimiza el rendimiento al compartir la misma geometría y material. Cada cubo se posiciona mediante una matriz de transformación.

- **Archivo:** `Grid.jsx`
- **Técnica:** Instancing con `Object3D` dummy y actualización de la matriz de instancias.

### 2. Spiral – Espiral de esferas animada

Se crea una espiral 3D con 61 esferas cuyos colores varían según el ángulo (`hsl`). El conjunto completo rota lentamente sobre el eje Y usando `useFrame`.

- **Archivo:** `Spiral.jsx`
- **Técnica:** Cálculo paramétrico de posiciones en coordenadas cilíndricas; animación con `useFrame`.

### 3. Wave – Superficie ondulante por vértices

Un plano de 64×64 segmentos se deforma en tiempo real: cada vértice modifica su altura según una función seno-coseno que depende de la posición y del tiempo. Se actualizan las normales para una iluminación correcta.

- **Archivo:** `AnimatedVertex.jsx`
- **Técnica:** Manipulación directa del arreglo `position.array` y actualización de normales.

### 4. Tree – Árbol fractal recursivo con viento

Se implementa un árbol binario en 3D usando recursión: cada rama genera cuatro hijas con orientaciones diferentes. Cada segmento es un cilindro con geometría calculada dinámicamente. Además, las ramas tienen una pequeña oscilación (efecto de viento) gracias a `useFrame`.

- **Archivo:** `FractalTree.jsx`
- **Técnica:** Recursión, transformaciones de geometría (traslación y rotación) y animación en `group`.

---

## Resultados visuales

Se capturaron GIFs animados de cada demostración, disponibles en la carpeta `media/`.

| Demostración | GIF |
|--------------|-----|
| **Grid** – Cuadrícula de cubos instanciados | ![Grid](media/Grid_Threejs.gif) |
| **Spiral** – Espiral rotatoria de esferas | ![Spiral](media/Spiral_Threejs.gif) |
| **Wave** – Plano ondulante en movimiento | ![Wave](media/Wave_Threejs.gif) |
| **Tree** – Árbol fractal con efecto de viento | ![Tree](media/Tree_Threejs.gif) |

---

## Código relevante

### Instanciado en Grid
```jsx
// Grid.jsx
useEffect(() => {
  let index = 0;
  const dummy = new THREE.Object3D();
  for (let i = -5; i <= 5; i++) {
    for (let j = -5; j <= 5; j++) {
      dummy.position.set(i * spacing, 0, j * spacing);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(index, dummy.matrix);
      index++;
    }
  }
  meshRef.current.instanceMatrix.needsUpdate = true;
}, []);
```

### Animación de vértices en Wave
```jsx
// AnimatedVertex.jsx
useFrame(({ clock }) => {
  const positions = geometry.attributes.position.array;
  const time = clock.getElapsedTime();
  for (let i = 0; i < positions.length; i += 3) {
    const x = originalPositions[i];
    const z = originalPositions[i + 2];
    const y = Math.sin(x * 2 + time) * 0.3 * Math.cos(z * 1.5 + time * 0.7);
    positions[i + 1] = y;
  }
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
});
```

### Recursión y transformación en Tree
```jsx
// FractalTree.jsx – fragmento de la rama recursiva
const geometry = useMemo(() => {
  const geom = new THREE.CylinderGeometry(..., length, 6);
  geom.translate(0, length / 2, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize()
  );
  geom.applyQuaternion(quaternion);
  geom.translate(start.x, start.y, start.z);
  return geom;
}, [start, direction, length, depth]);
```

---

## Prompts utilizados

Para el desarrollo de este taller se emplearon los siguientes prompts con herramientas de IA (ChatGPT, Gemini):

- *“Genera una cuadrícula de cubos en React Three Fiber usando instancedMesh para optimizar rendimiento.”*
- *“Crea una espiral 3D con esferas cuyos colores varíen según el ángulo y que rote lentamente.”*
- *“Modifica los vértices de un plano en Three.js para generar una superficie ondulante animada en tiempo real.”*
- *“Implementa un árbol fractal recursivo con cilindros en Three.js, con animación de viento en las ramas.”*

---

## Aprendizajes y dificultades

### Aprendizajes
- **Instancing:** Comprender cómo `instancedMesh` reduce drásticamente el número de llamadas de dibujo, manteniendo alto rendimiento en escenas con muchos objetos idénticos.
- **Geometría dinámica:** Manipular directamente los arreglos de vértices permite crear efectos visuales complejos como ondas o deformaciones.
- **Recursión en 3D:** Aplicar recursión para generar estructuras fractales y entender cómo transformar coordenadas y orientaciones de objetos.
- **Animación con `useFrame`:** Integrar animaciones suaves y sincronizadas con el tiempo del reloj de Three.js.

### Dificultades
- **Actualización de normales:** Inicialmente las ondas no se iluminaban correctamente; la llamada a `geometry.computeVertexNormals()` fue esencial para que la luz interactuara con la superficie deformada.
- **Orientación de cilindros:** Al rotar los cilindros para que apunten en una dirección arbitraria, fue necesario calcular quaternions correctamente, lo que requirió varios intentos.
- **Rendimiento en árbol fractal:** Con 4 niveles de profundidad y 4 ramas por nodo, se generan muchos objetos; se optimizó usando `useMemo` para evitar recrear geometrías en cada render.

---
