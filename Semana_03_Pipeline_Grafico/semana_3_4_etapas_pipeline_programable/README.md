# Etapas del Pipeline Programable

Nombres:

- Joan Sebastian Roberto Puerto
- Baruj Vladimir Ramírez Escalante
- Diego Alberto Romero Olmos
- Maicol Sebastian Olarte Ramirez
- Jorge Isaac Alandete Díaz

Fecha de entrega: 9/03/2026

Descripción breve: Este taller explora las diferentes etapas del pipeline programable y sus integraciones. Se implementan en dos herramientas, una en Unity con un shader HLSL básico en URP y otra en React con Three.js con un shader en GLSL. Ambas implementan distintas deformaciones sobre la malla de un objeto con ayuda de una función sinusoidal.

**Implementaciones:**

- **Unity**: El shader programado de Unity en HLSL deforma una malla con una onda sinusoidal animada, también se combina con lambert lighting, textura y gradiente vertical. Es funcional con planos y esferas. Internamente se implementan las etapas usuales de Vertex shader (transformaciones y deformación sinusoidal), Geometry Shader(extrusión y wireframe/billboards) y Fragment shader (lambert,textura,gradiente y patterns).

- **Three.js**: El shader de React con Three.js en GLSL deforma una malla mientras va girando, integra las etapas ususales de vertex y fragment. También implementa algunos efectos avanzados como fresnel, rim lighting, procedural noise, animación con time y post-processing básico (Bloom).

**Resultados visuales:**

- **Unity**:
![.](media)
- **Three.js**:
![.](media)

**Código relevante:**

- **Python**:

```plaintext

```

- **Unity**:

```plaintext
    
```

- **Three.js**:

```plaintext
    
```

**Prompts utilizados:**

- **Python**:
- **Unity**:
- **Three.js**:

**Aprendizajes y dificultades:**
