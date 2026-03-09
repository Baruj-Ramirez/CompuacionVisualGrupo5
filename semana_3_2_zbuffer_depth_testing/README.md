# Taller ZBuffer Depth Testing

## Nombres de estudiantes:

Joan Sebastian Roberto Puerto
Baruj Vladimir Ramírez Escalante
Diego Alberto Romero Olmos
Maicol Sebastian Olarte Ramirez
Jorge Isaac Alandete Díaz

## Fecha de entrega

`2026-03-08`

---

## Descripción breve

Este taller tiene como objetivo comprender el funcionamiento del Z‑buffer (depth buffer) dentro del pipeline de renderizado 3D. Se desarrollaron dos implementaciones principales: una en Python que recrea el algoritmo desde cero, incluyendo proyección perspectiva, rasterización de triángulos y comparación con el método del pintor (painter’s algorithm); y otra en Three.js con React Three Fiber que permite visualizar la profundidad mediante shaders personalizados y experimentar con los planos near/far y el depth test. Se analizaron problemas típicos como la oclusión incorrecta sin Z‑buffer, la precisión limitada del buffer y el fenómeno de Z‑fighting.

---

## Implementaciones

### Python

Se implementó un renderizador básico en Python utilizando las librerías `numpy`, `matplotlib` y `PIL`. Las etapas cubiertas fueron:

- Proyección perspectiva de puntos 3D a 2D.
- Renderizado de triángulos mediante el algoritmo del pintor, mostrando sus limitaciones ante solapamientos.
- Rasterización píxel a píxel con coordenadas baricéntricas y prueba de punto interior.
- Implementación completa de un Z‑buffer para resolver la oclusión correcta.
- Visualización del depth buffer normalizado en escala de grises.
- Experimentos de precisión variando la distancia al observador y simulando Z‑fighting con dos triángulos de profundidad casi idéntica.

### Three.js / React Three Fiber

Se desarrolló una escena interactiva en la que varios objetos (cubo, esfera, toro, cono) muestran su profundidad mediante un shader personalizado que codifica la distancia en color (usando una función coseno para generar colores cíclicos). La aplicación permite:

- Ajustar los planos near y far de la cámara en tiempo real mediante sliders.
- Activar o desactivar el depth test para observar la diferencia entre oclusión correcta y el simple orden de dibujado.
- Visualizar cómo el rango near/far afecta la precisión de la profundidad y la aparición de Z‑fighting.

---

## Resultados visuales

### Python - Implementación

| Render con Z‑buffer | Depth buffer normalizado |
|---------------------|--------------------------|
| ![Render con Z‑buffer](./media/render_zbuffer.png) | ![Depth buffer](./media/depth_buffer.png) |

**Descripción**:  
La imagen izquierda muestra la escena renderizada correctamente con Z‑buffer: el triángulo verde (cercano) tapa al rojo (lejano) y el azul se intercala según su profundidad variable. La imagen derecha es el depth buffer normalizado: las zonas más oscuras corresponden a los píxeles más cercanos (triángulo verde), las claras a los más lejanos (rojo), y el azul muestra una gradación continua.

### Three.js - Implementación

| Visualización de profundidad por colores | Comparación Depth Test ON / OFF |
|------------------------------------------|----------------------------------|
| ![Visualización de profundidad](./media/Near_Colors_Threejs.gif) | ![Depth test ON/OFF](./media/Oclusion_Threejs.gif) |

**Descripción**:  
El primer GIF (izquierda) muestra el sistema de codificación de profundidad implementado mediante un shader personalizado. Los objetos más cercanos a la cámara se representan con tonos cálidos (rojos, naranjas), mientras que los más alejados adoptan tonos fríos (azules, verdes). Esta gradación permite identificar visualmente la distancia relativa de cada objeto en la escena, basándose en el valor normalizado de profundidad entre los planos near y far configurados.

El segundo GIF (derecha) compara el comportamiento del depth test: en la parte superior (depth test activado) los objetos se renderizan con oclusión correcta – el cubo, al estar más cerca, tapa parcialmente a la esfera y al toro que se encuentran detrás. En la parte inferior (depth test desactivado), el orden de dibujado prevalece sobre la profundidad, generando oclusiones incorrectas donde objetos lejanos aparecen sobre los cercanos, simulando así el comportamiento del algoritmo del pintor sin Z‑buffer.

---

## Código relevante

### Ejemplo de código Python (proyección y rasterización con Z‑buffer)

```python
def project(vertex, width, height, fov=256, viewer_distance=4):
    x, y, z = vertex
    factor = fov / (viewer_distance + z)
    x_proj = x * factor + width / 2
    y_proj = -y * factor + height / 2
    return (x_proj, y_proj, z)

def rasterize_triangle(v0, v1, v2, color, image, zbuffer):
    p0, p1, p2 = [project(v, width, height) for v in (v0, v1, v2)]
    x0, y0, z0 = p0; x1, y1, z1 = p1; x2, y2, z2 = p2
    # bounding box ...
    area = 0.5 * (-(y1 - y2)*(x0 - x2) + (x1 - x2)*(y0 - y2))
    for y in range(min_y, max_y+1):
        for x in range(min_x, max_x+1):
            area0 = 0.5 * (-(y1 - y2)*(x - x2) + (x1 - x2)*(y - y2))
            area1 = 0.5 * (-(y2 - y0)*(x - x0) + (x2 - x0)*(y - y0))
            area2 = 0.5 * (-(y0 - y1)*(x - x1) + (x0 - x1)*(y - y1))
            u, v, w = area0/area, area1/area, area2/area
            if (u >= -1e-5 and v >= -1e-5 and w >= -1e-5 and u+v+w <= 1+1e-5):
                z = u*z0 + v*z1 + w*z2
                if z < zbuffer[y, x]:
                    zbuffer[y, x] = z
                    image[y, x] = color
```

### Ejemplo de código Three.js (material de profundidad con shader)

```javascript
const depthMaterial = useMemo(() => {
  return new THREE.ShaderMaterial({
    uniforms: { near: { value: near }, far: { value: far } },
    vertexShader: `
      varying float vDepth;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vDepth = -mvPosition.z;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float near;
      uniform float far;
      varying float vDepth;
      void main() {
        float depthNormalized = (vDepth - near) / (far - near);
        depthNormalized = clamp(depthNormalized, 0.0, 1.0);
        vec3 color = 0.5 + 0.5 * cos(2.0 * 3.14159 * (depthNormalized * 2.0 + vec3(0.0, 0.33, 0.67)));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    depthTest: depthTestEnabled,
    depthWrite: true,
  });
}, [near, far, depthTestEnabled]);
```

---

# Prompts utilizados

Durante el desarrollo del taller se utilizaron herramientas de IA generativa para resolver dudas conceptuales y mejorar la implementación.

Prompts utilizados:

```
"Explica cómo implementar un Z-buffer desde cero en Python"

"Cómo calcular coordenadas baricéntricas para rasterizar triángulos"

"Cómo visualizar depth buffer en escala de grises usando numpy"

"Crear shader en Three.js que visualice profundidad de los objetos"
```

---

## Aprendizajes y dificultades

### Aprendizajes

Este taller permitió afianzar conceptos fundamentales del pipeline de gráficos 3D: proyección perspectiva, rasterización, uso de coordenadas baricéntricas y el funcionamiento interno del Z‑buffer. Implementar desde cero el algoritmo en Python ayudó a comprender por qué el painter’s algorithm falla en escenas con objetos solapados y cómo el depth buffer resuelve el problema de manera independiente al orden de dibujado. Además, la visualización del depth buffer en escala de grises facilitó el análisis de la distribución de profundidades. En la parte de Three.js, se exploró la influencia de los planos near y far en la precisión de la profundidad y se observó directamente el efecto del depth test al activarlo/desactivarlo.

### Dificultades

La rasterización píxel a píxel con coordenadas baricéntricas requirió cuidado con los errores de precisión flotante (uso de pequeñas tolerancias). También fue necesario manejar los triángulos degenerados y los bordes de la imagen. En Three.js, la creación del shader personalizado y la correcta interpolación de la profundidad (`varying float vDepth`) requirieron repasar la sintaxis de GLSL y el funcionamiento de los espacios de coordenadas. La simulación de Z‑fighting en Python mostró cómo pequeñas diferencias de profundidad pueden producir artefactos debido a la precisión limitada del buffer.

### Mejoras futuras

Se podría extender la implementación en Python para manejar mallas más complejas y agregar iluminación básica. En Three.js, sería interesante implementar una visualización del depth buffer en tiempo real (como una textura en la esquina de la pantalla) y explorar técnicas para mitigar el Z‑fighting, como el uso de un offset poligonal o la reordenación de los planos near/far.

## Estructura del proyecto

```
semana_3_2_zbuffer_depth_testing/
├── python/          # Código Python (notebook Jupyter)
├── threejs/         # Código Three.js/React (componente App)
├── media/           # Imágenes, videos, GIFs
│   ├── depth_buffer.png
│   ├── render_zbuffer.png
│   ├── Near_Colors_Threejs.gif
│   └── Oclusion_Threejs.gif
└── README.md        # Este archivo
```

---

## Referencias

- Documentación oficial de NumPy: https://numpy.org/doc/
- Documentación de Matplotlib: https://matplotlib.org/stable/contents.html
- Tutorial de rasterización de triángulos: https://www.scratchapixel.com/lessons/3d-basic-rendering/rasterization-practical-implementation
- Documentación de React Three Fiber: https://docs.pmnd.rs/react-three-fiber
- Documentación de Three.js ShaderMaterial: https://threejs.org/docs/#api/en/materials/ShaderMaterial

---

## Checklist de entrega

- [x] Carpeta con nombre `semana_3_2_zbuffer_depth_testing`
- [x] Código limpio y funcional en carpetas por entorno
- [x] GIFs/imágenes incluidos con nombres descriptivos en carpeta `media/`
- [x] README completo con todas las secciones requeridas
- [x] Mínimo 2 capturas/GIFs por implementación
- [x] Commits descriptivos en inglés
- [x] Repositorio organizado y público
```