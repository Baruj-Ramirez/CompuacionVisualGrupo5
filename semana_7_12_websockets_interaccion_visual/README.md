# Taller 58 – WebSockets e Interacción Visual en Tiempo Real

**Integrantes:**  
- Joan Sebastian Roberto Puerto  
- Baruj Vladimir Ramírez Escalante  
- Diego Alberto Romero Olmos  
- Maicol Sebastian Olarte Ramirez  
- Jorge Isaac Alandete Díaz  

**Fecha de entrega:** 25 de abril de 2026  

---

## Descripción breve

Este taller explora la comunicación **en tiempo real** entre un cliente gráfico y un servidor utilizando **WebSockets**. Se desarrollan tres implementaciones complementarias: el **servidor en Python** que transmite datos simulados, una **aplicación web 3D en Three.js / React Three Fiber** que los visualiza con múltiples escenas interactivas y una **aplicación de cardiograma** que simula una señal ECG sintética con panel de control integrado.

---

## Implementación – Python (Servidor WebSocket)

### Objetivo

Crear un servidor WebSocket que envíe, cada 0.5 segundos, un mensaje JSON con la posición (`x`, `y`) y un color, simulando una señal dinámica que más tarde podrá modificar una escena 3D.

### Estructura del código

El servidor sigue una arquitectura asíncrona con `asyncio` y `websockets`. Se destacan los siguientes componentes:

- **`Payload`**: dataclass inmutable que representa el mensaje a enviar (`x`, `y`, `color`, `t`).
- **`handler()`**: función que gestiona cada cliente conectado, generando datos con una caminata aleatoria suave para que la animación sea natural.
- **`main()`**: inicia el servidor en `ws://localhost:8765` y lo mantiene activo indefinidamente.

#### Código relevante (fragmento del handler)

```python
async def handler(websocket: websockets.WebSocketServerProtocol) -> None:
    tick = 0
    current_x, current_y = 0.0, 0.0

    while True:
        current_x += random.uniform(-0.9, 0.9)
        current_y += random.uniform(-0.9, 0.9)

        current_x = max(-5.0, min(5.0, current_x))
        current_y = max(-5.0, min(5.0, current_y))

        message = Payload(
            x=round(current_x, 3),
            y=round(current_y, 3),
            color=next(COLOR_SEQUENCE),
            t=tick,
        )
        await websocket.send(json.dumps(asdict(message)))
        tick += 1
        await asyncio.sleep(SEND_INTERVAL_SECONDS)
```

#### Cliente de prueba

Un script independente (`test_client.py`) confirma que el servidor entrega los paquetes correctamente:

```python
async def test():
    async with websockets.connect("ws://localhost:8765") as ws:
        while True:
            msg = await ws.recv()
            print(json.loads(msg))
```

---

## Implementación – Three.js / React Three Fiber (Ítem 2)

### Objetivo

Construir una aplicación web 3D que consuma en tiempo real los datos del servidor WebSocket y los visualice como una escena interactiva con múltiples pestañas: una esfera controlada por un único agente y un panel multi-agente con cuatro conexiones WebSocket independientes.

### Estructura del proyecto

```
threejs/
├── src/
│   ├── hooks/
│   │   ├── useWebSocket.js          # Hook: una conexión WS con historial
│   │   └── useMultipleWebSockets.js # Hook: N conexiones WS en paralelo
│   ├── scenes/
│   │   ├── BasicScene.jsx   # Pestaña 1 – esfera única con trail y sparkline
│   │   ├── AgentsScene.jsx  # Pestaña 2 – 4 agentes con panel lateral
│   │   └── CardiacScene.jsx # Pestaña 3 – señal ECG (ver Ítem 4)
│   ├── App.jsx              # Navegación de 3 pestañas
│   └── App.css              # Estilos oscuros unificados
└── package.json
```

**Stack:** React 19 · Vite · Three.js 0.184 · @react-three/fiber v9 · @react-three/drei v10

### Arquitectura del hook `useWebSocket`

El hook administra el ciclo de vida completo de una conexión, expone el último mensaje como `data` y conserva un historial de los últimos 60 paquetes para graficar señales sin lógica adicional en los componentes.

```js
export function useWebSocket(autoConnect = true, url = DEFAULT_WS_URL) {
  const [data,    setData]    = useState(null);
  const [status,  setStatus]  = useState('disconnected');
  const [history, setHistory] = useState([]);
  const wsRef = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) return;
    setStatus('connecting');
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen    = () => setStatus('connected');
    ws.onclose   = () => setStatus('disconnected');
    ws.onerror   = () => setStatus('error');
    ws.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      setData(parsed);
      setHistory((prev) => {
        const next = [...prev, parsed];
        return next.length > HISTORY_SIZE ? next.slice(-HISTORY_SIZE) : next;
      });
    };
  }, [url]);

  useEffect(() => {
    if (autoConnect) connect();
    return () => wsRef.current?.close();
  }, [autoConnect, connect]);

  return { data, status, history, connect, disconnect };
}
```

### Pestaña 1 – Escena básica (`BasicScene.jsx`)

Una esfera que sigue suavemente la posición `(x, y)` recibida del servidor mediante interpolación exponencial (`lerp`). El color del material también se interpola. Un `<canvas>` superpuesto muestra el historial de señal como un sparkline.

```jsx
useFrame((_, delta) => {
  if (!data) return;
  const t = 1 - Math.exp(-6 * delta);
  targetRef.current.set(data.x, data.y, 0);
  meshRef.current.position.lerp(targetRef.current, t);
  meshRef.current.material.color.lerp(targetColor.current, t);
});
```

### Pestaña 2 – Panel de agentes (`AgentsScene.jsx`)

Cuatro esferas con conexiones WebSocket completamente independientes (el hook `useMultipleWebSockets` abre N sockets en paralelo). Cada esfera tiene su propio trail de posiciones usando `BufferGeometry` pre-asignado para evitar re-renders de React en cada frame.

```jsx
useFrame(() => {
  // Trail: desplaza posiciones hacia atrás y añade la nueva al frente
  const trail = trailsRef.current[idx];
  for (let i = trail.length - 1; i > 0; i--)
    trail[i].copy(trail[i - 1]);
  trail[0].copy(meshRefs.current[idx].position);

  // Actualiza BufferGeometry directamente sin re-render de React
  const attr = trailGeos[idx].attributes.position;
  for (let i = 0; i < TRAIL_LENGTH; i++)
    attr.setXYZ(i, trail[i].x, trail[i].y, trail[i].z);
  attr.needsUpdate = true;
});
```

Un panel lateral (240 px) muestra el estado de cada agente: coordenadas, color, tick y estado de conexión.

---

## Implementación – Cardiograma interactivo (Ítem 4)

### Objetivo

Simular y visualizar una señal ECG sintética en tiempo real dentro de una escena 3D, con un panel de control integrado que permite cambiar de modo (cardíaco/manual), ajustar la frecuencia cardíaca (BPM), mover una esfera manualmente y seleccionar el color del trazo.

### Arquitectura dual-servidor

La aplicación extiende el servidor Python con un segundo WebSocket de broadcast en el puerto 8766:

| Puerto | Rol | Usado por |
|--------|-----|-----------|
| `8765` | Caminata aleatoria por cliente | Pestañas 1 y 2 |
| `8766` | Broadcast compartido (ECG / manual) | Pestaña 3 — Cardiograma |

```
Panel React ──set_mode / set_bpm / set_color──▶ WS 8766 ──▶ broadcast_state
broadcast_loop (~12.5 Hz) ──payload JSON──▶ todos los clientes ──▶ escena 3D
```

### Señal ECG sintética (`cardiac_sample`)

La función compone las cinco ondas características de un ciclo cardíaco mediante gaussianas:

```python
def cardiac_sample(t: float, bpm: float = 72.0) -> float:
    period = 60.0 / bpm
    phase  = (t % period) / period          # fase 0–1 dentro del latido

    p      =  0.15 * math.exp(-((phase - 0.12) ** 2) / 0.0005)    # onda P
    q      = -0.10 * math.exp(-((phase - 0.30) ** 2) / 0.00008)   # onda Q
    r      =  1.50 * math.exp(-((phase - 0.32) ** 2) / 0.000025)  # pico R
    s      = -0.20 * math.exp(-((phase - 0.34) ** 2) / 0.00008)   # onda S
    t_wave =  0.35 * math.exp(-((phase - 0.60) ** 2) / 0.002)     # onda T

    return p + q + r + s + t_wave
```

### Componentes 3D (`CardiacScene.jsx`)

| Componente | Descripción |
|------------|-------------|
| `ECGLine` | Curva deslizante de 180 muestras vía `BufferGeometry` mutable en `useFrame`. Color actualizado por ref sin re-renders. |
| `ECGGrid` | Líneas de referencia horizontales (isobásica, picos P/T). |
| `HeartSphere` | Esfera que sigue la señal en modo cardíaco y se desplaza a (x, y) en modo manual. Pulsa (escala 1.5×) en el pico R. |
| `BpmLabel` | Etiqueta flotante con URL del servidor y unidad BPM. |

```jsx
useFrame(() => {
  const buf  = signalBufRef.current;
  const attr = geo.attributes.position;

  for (let i = 0; i < buf.length; i++) {
    const x = ((i / BUFFER_SIZE) * ECG_WIDTH) - ECG_WIDTH / 2;
    attr.setXYZ(i, x, buf[i] * ECG_SCALE, 0);
  }
  attr.needsUpdate = true;
  geo.setDrawRange(0, buf.length);

  // Color sigue el ref del panel sin ciclo de render de React
  if (matRef.current) matRef.current.color.set(ecgColorRef.current);
});
```

### Panel de control integrado

El panel es un sidebar React (layout flex, 260 px) con conexión WebSocket propia de sólo escritura:

```jsx
const cmdWsRef = useRef(null);

useEffect(() => {
  const open = () => {
    const ws = new WebSocket('ws://localhost:8766');
    ws.onopen  = () => { cmdWsRef.current = ws; };
    ws.onclose = () => { cmdWsRef.current = null; setTimeout(open, 2000); };
  };
  open();
  return () => cmdWsRef.current?.close();
}, []);
```

**Controles disponibles:**

| Control | Tipo | Mensaje JSON enviado |
|---------|------|----------------------|
| 💓 Cardíaco / 🎮 Manual | Botones | `{ type: "set_mode", mode: "cardiac" \| "manual" }` |
| Frecuencia cardíaca | Slider 30–200 BPM | `{ type: "set_bpm", bpm: <int> }` |
| Posición X / Y | Sliders −5 a 5 | `{ type: "set_position", x, y }` |
| Color del trazo | Paleta 6 colores | `{ type: "set_color", color: <str> }` |

---

## Resultados visuales

### Python – Servidor WebSocket

Los siguientes GIFs muestran el servidor en funcionamiento y la recepción de datos desde el cliente de prueba.

#### Instalación de dependencias

![Instalación de la librería websockets](media/python_instalacion_websockets_terminal.gif)

#### Servidor en ejecución

![Servidor WebSocket iniciado](media/python_ejecucion_server.gif)

#### Cliente de prueba recibiendo datos

![Cliente recibiendo JSON cada 0.5 s](media/python_ejecucion_client.gif)

---

### Three.js – Escena básica (Pestaña 1)

| Vista 1 | Vista 2 |
|---------|---------|
| ![Escena básica 1](media/threejs_basic_scene_1.png) | ![Escena básica 2](media/threejs_basic_scene_2.png) |

### Three.js – Panel de agentes (Pestaña 2)

| Vista 1 | Vista 2 |
|---------|---------|
| ![Agentes 1](media/threejs_agents_1.png) | ![Agentes 2](media/threejs_agents_2.png) |

---

### Aplicación Cardiograma – Modo cardíaco (ECG en tiempo real)

| Vista 1 | Vista 2 |
|---------|---------|
| ![ECG Modo Cardíaco 1](media/threejs_cardiac_mode_1.png) | ![ECG Modo Cardíaco 2](media/threejs_cardiac_mode_2.png) |

### Aplicación Cardiograma – Modo manual (control por sliders)

| Vista 1 | Vista 2 |
|---------|---------|
| ![ECG Modo Manual 1](media/threejs_cardiac_manual_1.png) | ![ECG Modo Manual 2](media/threejs_cardiac_manual_2.png) |

### Aplicación Cardiograma – Panel de control y paleta de colores

| Panel activo |
|--------------|
| ![Panel de control](media/threejs_cardiac_panel.png) |

---

## Prompts de IA utilizados (Chatgpt)

### Python

1. Cómo funcionan los WebSockets y qué necesito para implementarlos en Python
2. Por qué no funciona la conexión con el cliente

### Three.js

1. *"Cómo crear un hook en React que gestione la apertura y reconexión de un WebSocket exponiendo `data`, `status` e `history`."*
2. *"Cómo actualizar una esfera en React Three Fiber sin causar re-renders de React usando `useFrame` y `useRef`."*
3. *"Cómo renderizar trails de posición eficientes en Three.js usando `BufferGeometry` pre-asignado y `setXYZ`."*
4. *"Dame un patrón para abrir N WebSockets en paralelo con un único hook de React."*

### Aplicación Cardiograma

1. *"Cómo generar una señal ECG sintética con ondas P, Q, R, S, T usando funciones gaussianas en Python."*
2. *"Cómo implementar un servidor WebSocket de broadcast en Python con `asyncio` que acepte comandos de control de los clientes."*
3. *"Cómo actualizar el color de un `lineBasicMaterial` en React Three Fiber desde fuera del Canvas usando un `useRef`."*
4. *"Cómo abrir una segunda conexión WebSocket ligera sólo para enviar comandos, sin interferir con la conexión de recepción de datos."*
5. *"¿Cómo detectar el pico R de una señal ECG en el cliente para disparar una animación de pulso en una esfera Three.js?"*

---

## Aprendizajes y dificultades

### Aprendizajes

**Python**
- Entender cómo funciona el protocolo **WebSocket** frente al modelo request‑response de HTTP.
- Manejar múltiples clientes simultáneos de forma asíncrona con `asyncio`.
- Elegir una estructura de datos clara (`dataclass`) para los mensajes y serializarlos a JSON.
- Simular señales suaves mediante caminatas aleatorias para que la animación 3D luzca natural.

**Three.js**
- `useFrame` de R3F es el lugar correcto para mutar geometría/materiales sin disparar el ciclo de reconciliación de React.
- `BufferAttribute` con `needsUpdate = true` en cada frame es más eficiente que recrear la geometría.
- El `lerp` exponencial `1 - exp(-k·Δt)` produce interpolación suave independiente de la tasa de frames.
- Abrir una conexión WebSocket por componente simplifica la independencia de estado pero requiere un hook bien parametrizado con `url`.

**Aplicación Cardiograma**
- Separar la conexión de **recepción** de datos de la de **envío** de comandos elimina condiciones de carrera.
- El patrón `ref` para el color (`ecgColorRef`) permite que el panel React actualice el material 3D en el próximo frame sin re-render del Canvas.
- `broadcast_clients.discard(ws)` (en lugar de `-=`) evita que Python trate la variable como local y lance `UnboundLocalError`.

### Dificultades

**Python**
- Corregir el error tipográfico del taller original (`websockets` → `websockets`).
- Asegurar que el servidor no se cayera ante desconexiones abruptas de los clientes (manejo de `ConnectionClosed`).
- Limitar el rango de los valores para que el objeto permanezca dentro del área visible de la futura escena.

**Three.js**
- El GC de React cerraba el socket si la referencia al objeto `WebSocket` no se guardaba en un `useRef`.
- Coordinar cuatro conexiones WebGL en el mismo viewport sin degradar el rendimiento requirió limitar los trails a 40 puntos.

**Aplicación Cardiograma**
- El servidor lanzaba `UnboundLocalError: cannot access local variable 'broadcast_clients'` al usar `-=` sobre el `set` global; se resolvió mutando el conjunto con `.discard()`.
- Sincronizar el color del panel React con el material Three.js requirió un `ref` puente porque el `Canvas` de R3F corre en un contexto de renderizado separado.
- Ajustar los parámetros gaussianos de cada onda para que la señal ECG se pareciera a un cardiograma real tomó varios ciclos de prueba.

---

## Cómo ejecutar

### Python – Servidor WebSocket

1. Instalar dependencias:
   ```bash
   py -m pip install websockets
   ```
2. Ejecutar el servidor:
   ```bash
   py server.py
   ```
3. (Opcional) Probar con el cliente de prueba:
   ```bash
   py test_client.py
   ```

### Three.js – Aplicación web 3D

1. Ingresar al directorio e instalar dependencias:
   ```bash
   cd threejs
   npm install
   ```
2. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
3. Abrir `http://localhost:5173` en el navegador (el servidor Python debe estar corriendo).

### Aplicación Cardiograma

1. Iniciar el servidor Python (habilita ambos puertos 8765 y 8766):
   ```bash
   cd python
   python server.py
   ```
2. Iniciar la aplicación React:
   ```bash
   cd threejs
   npm run dev
   ```
3. Abrir `http://localhost:5173` y seleccionar la pestaña **💓 Señal Cardíaca**.
4. Usar el panel derecho para cambiar de modo, ajustar BPM y seleccionar el color del trazo.

---
