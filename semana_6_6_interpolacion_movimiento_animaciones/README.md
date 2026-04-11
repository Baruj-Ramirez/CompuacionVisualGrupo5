# Taller Interpolación de Movimiento: Suavizando Animaciones en Tiempo Real

**Integrantes:**  
- Joan Sebastian Roberto Puerto  
- Baruj Vladimir Ramírez Escalante  
- Diego Alberto Romero Olmos  
- Maicol Sebastian Olarte Ramirez  
- Jorge Isaac Alandete Díaz  

**Fecha de entrega:** 11 de abril de 2026  

---

## Descripción breve

El objetivo del taller es implementar técnicas de interpolación (LERP, SLERP y curvas Bézier) para crear animaciones suaves y naturales en objetos 3D, tanto en **Three.js (React Three Fiber)** como en **Unity**. Se controla el paso del tiempo y se visualizan trayectorias lineales y curvas, aplicando funciones de easing (aceleración/desaceleración) y rotaciones interpoladas.

---

## Implementaciones

### Three.js con React Three Fiber

- **Escena:** Un cubo multicolor que se desplaza entre dos puntos visibles (esferas roja y verde).  
- **Interpolación lineal de posición:** `THREE.Vector3.lerpVectors(startPoint, endPoint, t)`.  
- **Interpolación de rotación:** `Quaternion.slerp()` desde 0° a 180° sobre el eje Y.  
- **Curva Bézier cúbica:** Función personalizada `cubicBezierPoint` que calcula la posición entre cuatro puntos de control.  
- **Visualización de trayectoria:** Línea cian que se actualiza dinámicamente usando `<Line>` de `drei`.  
- **Control interactivo:** Panel `leva` con slider `t` (0..1) y selector de modo (Lineal / Curva Bézier).  
- **Rotación visible:** Cada cara del cubo tiene un color diferente para apreciar la rotación.

### Unity (versión LTS)

- **Escenario:** Cubo que se mueve entre `StartPoint` (rojo) y `EndPoint` (verde), con dos puntos de control grises.  
- **Movimiento automático:** Variable `t` progresiva con opción de ping‑pong (ida y vuelta) o cíclica.  
- **Interpolación lineal:** `Vector3.Lerp(startPos, endPos, t)`.  
- **Rotación SLERP:** `Quaternion.Slerp(startRot, endRot, t)` de 0° a 180°.  
- **Easing:** `Mathf.SmoothStep` aplicado a la posición.  
- **Curva Bézier personalizada:** Función `GetBezierPoint` que implementa la fórmula cúbica.  
- **Trayectoria visual:** `LineRenderer` que dibuja la línea recta o curva según el modo seleccionado.  
- **Interfaz OnGUI:** Ventana con barra de progreso, porcentaje de tiempo y toggle para activar la curva Bézier (bonus).

---

## Resultados visuales

### Three.js

| Demostración | GIF |
|--------------|-----|
| **Movimiento lineal** – Trayectoria recta con rotación SLERP | ![Lineal Three.js](media/threejs_lineal.gif) |
| **Movimiento curva Bézier** – Trayectoria curva suave | ![Curva Three.js](media/threejs_Curva.gif) |
| **Comparación lineal vs curva** | ![Comparación Three.js](media/threejs_Comparacion.gif) |

### Unity

| Demostración | GIF |
|--------------|-----|
| **Movimiento lineal** – Con barra de progreso y easing | ![Lineal Unity](media/unity_line.gif) |
| **Movimiento curva Bézier** – Trayectoria curva con puntos de control | ![Curva Unity](media/unity_curve.gif) |
| **Comparación lineal vs curva** | ![Comparación Unity](media/unity_compracion.gif) |

> **Nota:** Los archivos de imagen se encuentran en la carpeta `media/` del repositorio.


---

## Código relevante

### Three.js – Función de curva Bézier cúbica

```javascript
function cubicBezierPoint(t, p0, p1, p2, p3) {
  const mt = 1 - t;
  const x = mt*mt*mt * p0.x + 3*mt*mt*t * p1.x + 3*mt*t*t * p2.x + t*t*t * p3.x;
  const y = mt*mt*mt * p0.y + 3*mt*mt*t * p1.y + 3*mt*t*t * p2.y + t*t*t * p3.y;
  const z = mt*mt*mt * p0.z + 3*mt*mt*t * p1.z + 3*mt*t*t * p2.z + t*t*t * p3.z;
  return new THREE.Vector3(x, y, z);
}
```

### Three.js – Interpolación en cada frame

```javascript
useFrame(() => {
  let position;
  if (mode === 'Lineal')
    position = new THREE.Vector3().lerpVectors(startPoint, endPoint, t);
  else
    position = cubicBezierPoint(t, startPoint, control1, control2, endPoint);
  cubeRef.current.position.copy(position);
  const currentQuat = startQuat.clone().slerp(endQuat, t);
  cubeRef.current.quaternion.copy(currentQuat);
});
```

### Unity – Método de actualización y curva Bézier

```csharp
void Update() {
    // t se actualiza automáticamente con ping‑pong o cíclico
    Vector3 targetPos = useBezierCurve ?
        GetBezierPoint(t, startPos, cp1, cp2, endPos) :
        Vector3.Lerp(startPos, endPos, t);
    float easedT = Mathf.SmoothStep(0, 1, t);
    transform.position = Vector3.Lerp(startPos, targetPos, easedT);
    transform.rotation = Quaternion.Slerp(startRot, endRot, t);
}

Vector3 GetBezierPoint(float t, Vector3 p0, Vector3 p1, Vector3 p2, Vector3 p3) {
    float u = 1 - t;
    float tt = t * t, uu = u * u;
    float uuu = uu * u, ttt = tt * t;
    return uuu * p0 + 3 * uu * t * p1 + 3 * u * tt * p2 + ttt * p3;
}
```

---

## Prompts utilizados (IA generativa)

Para desarrollar las soluciones se emplearon las siguientes consultas a asistentes de IA (ChatGPT, Claude, etc.):

1. *“Agrega una curva Bézier cúbica a la escena anterior y un selector para cambiar entre lineal y curva.”*    
2. *“Muestra un indicador de tiempo (barra de progreso) sin usar Canvas, solo OnGUI.”* 
3. *“Dibuja la trayectoria con LineRenderer y actualízala al activar una curva Bézier.”* 


---

## Aprendizajes y dificultades

- **Aprendizajes clave:**  
  - Comprender la diferencia entre LERP (lineal) y SLERP (esférica) para rotaciones.  
  - La fórmula de Bézier cúbica permite trayectorias suaves y personalizables.  
  - El uso de `useFrame` en React Three Fiber y `Update` en Unity para animaciones continuas.  
  - La importancia de los puntos de control para definir la forma de la curva.  

- **Dificultades encontradas:**  
  - **Rotación no visible:** Inicialmente se usó una rotación de 360° que no mostraba cambio aparente; se corrigió a 180°.  
  - **Slider invisible en Unity OnGUI:** Se resolvió usando `GUI.Window` y ajustando tamaños; finalmente se optó por un sistema automático de `t` que cumple con el requisito de “indicador de tiempo” sin necesidad de slider manual.  
  - **Configuración del LineRenderer:** Hubo que crear un material adecuado y ajustar el ancho para que la línea se viera correctamente.  
  - **Organización del repositorio:** Se siguió la estructura exigida (`semana_6_6_interpolacion_movimiento_animaciones/`) con subcarpetas `threejs/`, `unity/` y `media/`.  

---

## Checklist final

- [x] Carpeta con formato `semana_6_6_interpolacion_movimiento_animaciones`  
- [x] `README.md` explicando cada actividad  
- [x] Carpeta `media/` con imágenes, GIFs o videos (6 archivos)  
- [x] `.gitignore` configurado para Node.js y Unity  
- [x] Commits descriptivos en inglés (ej: “Add Three.js scene with lerp/slerp and Bezier curve”, “Implement Unity auto-animation with path visualization”)  
- [x] Repositorio público verificado  
- [x] Proyecto grupal entregado individualmente – cada integrante subió su repositorio con los aportes descritos en el README (ver sección de contribuciones abajo)


---