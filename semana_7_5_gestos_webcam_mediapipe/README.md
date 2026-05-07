# Taller Gestos Webcam Mediapipe

**Estudiantes:** 

- Joan Sebastian Roberto Puerto
- Baruj Vladimir Ramírez Escalante
- Diego Alberto Romero Olmos
- Maicol Sebastian Olarte Ramirez
- Jorge Isaac Alandete Díaz

**Fecha de entrega:** 

26 de abril, 2026

---

## Descripción

El objetivo de este taller era usar la webcam del computador para detectar gestos de manos en tiempo real y a partir de eso ejecutar acciones visuales, todo sin ningún hardware adicional. Básicamente explorar cómo una interfaz natural (la mano) puede reemplazar un mouse o un teclado para interactuar con la pantalla.

Para desarrollarlo usé Python con las bibliotecas `mediapipe`, `opencv-python` y `numpy`. El taller no se puede hacer en Google Colab porque Colab no tiene acceso directo a la webcam del equipo, así que tuve que configurar un entorno local con Anaconda. Después de varios intentos con versiones recientes de MediaPipe (la 0.10.31 rompió la API `solutions` que usaba el código original), terminé creando un environment nuevo con Python 3.10.20 y una versión anterior de MediaPipe donde todo funcionó sin problemas.

Lo que se implementó en el notebook:
- Captura de video en tiempo real con OpenCV
- Detección de la mano y sus 21 landmarks con MediaPipe Hands
- Conteo de dedos extendidos comparando coordenadas Y de las puntas vs los nudillos
- Medición de distancia entre pulgar e índice (gesto pinch)
- Acciones visuales disparadas por gestos: cambio de color de fondo, objeto que sigue el dedo, cambio de escena con palma abierta
- Un mini-juego completo donde se controlan todos los elementos solo con la mano

---

## Implementaciones

### Python — Detección de mano y landmarks

Lo primero fue simplemente activar la cámara y pasarle los frames a MediaPipe para que detectara la mano. El resultado son 21 puntos de referencia (landmarks) que cubren toda la mano: muñeca, nudillos y puntas de cada dedo. MediaPipe los devuelve como coordenadas normalizadas entre 0 y 1, así que hay que multiplicar por el ancho/alto del frame para obtener píxeles reales.

![Reconocimiento de mano](media/python_reconocimiento_mano.gif)

---

### Python — Conteo de dedos extendidos

Con los landmarks disponibles, la lógica para contar dedos es bastante directa: si la punta del dedo está más arriba que el nudillo medio (coordenada Y menor), el dedo está extendido. Para el pulgar es diferente porque se mueve horizontalmente, entonces la comparación se hace en X. El resultado es un número del 0 al 5 que se muestra en pantalla con un color diferente para cada caso.

![Número de dedos extendidos](media/python_num_dedos_extendidos.gif)

---

### Python — Mini-juego: Atrapa las Burbujas

El bonus del taller. Burbujas de colores caen desde arriba de la pantalla y hay que tocarlas con una paleta que se controla moviendo el dedo índice. El gesto de pinch (juntar pulgar e índice) activa un modo turbo que agranda la paleta. Mostrar la palma abierta sirve para iniciar o reiniciar el juego. Hay sistema de vidas, puntuación y el nivel sube cada 100 puntos acelerando las burbujas.

![Mini-juego burbujas](media/python_minijuego_burbujas.gif)

---

## Código relevante

### Inicialización de MediaPipe Hands

```python
import cv2
import mediapipe as mp

mp_hands   = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

cap = cv2.VideoCapture(0)

with mp_hands.Hands(
    max_num_hands=1,
    min_detection_confidence=0.75,
    min_tracking_confidence=0.75
) as hands:
    while True:
        ret, frame = cap.read()
        frame  = cv2.flip(frame, 1)
        result = hands.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
```

### Lógica de conteo de dedos

```python
TIPS     = [4, 8, 12, 16, 20]   # índices de las puntas
KNUCKLES = [3, 6, 10, 14, 18]   # índices de los nudillos medios

def contar_dedos(lms, handedness="Right"):
    dedos = []

    # Pulgar: comparación horizontal
    if handedness == "Right":
        dedos.append(1 if lms[4].x < lms[3].x else 0)
    else:
        dedos.append(1 if lms[4].x > lms[3].x else 0)

    # Dedos 2-5: punta más arriba que nudillo (Y menor = más arriba)
    for tip, knk in zip(TIPS[1:], KNUCKLES[1:]):
        dedos.append(1 if lms[tip].y < lms[knk].y else 0)

    return sum(dedos)
```

### Detección de gesto pinch (distancia índice-pulgar)

```python
import math

def pinch_activo(lms, w, h, umbral=45):
    p4 = (lms[4].x * w, lms[4].y * h)  # punta del pulgar
    p8 = (lms[8].x * w, lms[8].y * h)  # punta del índice
    return math.hypot(p4[0]-p8[0], p4[1]-p8[1]) < umbral
```

El código completo del taller está en el archivo `semana_7_5_gestos_webcam_mediapipe.ipynb`.

---

## Prompts utilizados

Para este taller sí usé IA generativa (Claude) como asistente. Los prompts principales que usé fueron:

- Le pedí que me ayudara a ir creando el notebook en Jupyter además de orientarme sobre el funcionamiento de las librerias a usar en este laboratorio.
- También le pregunté cómo usar Anaconda para ejecutar Jupyter Notebook localmente, ya que no lo había usado antes.
- Cuando me encontré con que MediaPipe 0.10.31 había removido la API `solutions`, le consulté si convenía migrar a la nueva Tasks API o simplemente fijar una versión anterior. Me explicó ambas opciones con las diferencias técnicas y me generó también la versión migrada del notebook.

Al final opté por crear un environment nuevo con Python 3.10.20 y una versión compatible de MediaPipe, que fue la solución más rápida para el contexto del taller.

---

## Aprendizajes y dificultades

**Lo que más me costó** fue sin duda el tema del entorno. Nunca había tenido que preocuparme tanto por la versión de una biblioteca, pero MediaPipe resultó ser bastante sensible a eso. Instalar la versión más reciente y que de repente no exista `mp.solutions` fue frustrante al principio porque el error no es nada descriptivo. La solución de crear un environment limpio con Python 3.10 fue simple pero me tomó un buen rato llegar a esa conclusión.

**Lo que más me gustó** fue entender cómo funciona por dentro la lógica de los gestos. Antes de hacer el taller asumía que detectar si un dedo está extendido era algo complejo, pero al final es solo comparar dos coordenadas Y. Eso me pareció elegante. MediaPipe hace todo el trabajo pesado de localizar los 21 puntos y tú solo trabajas con números.

**El mini-juego** también fue una sorpresa en cuanto a complejidad. Integrar la detección de gestos con lógica de juego (colisiones, partículas, estados, niveles) en tiempo real y mantener todo a 30fps sin que se trabe requiere pensar bien qué se procesa en cada frame. Tuve que ser cuidadoso con no hacer operaciones pesadas dentro del bucle principal.

En general el taller me dejó con ganas de explorar más. Hay bibliotecas sobre MediaPipe que permiten entrenar gestos personalizados con tus propios datos, y eso podría ser útil para proyectos más específicos donde los gestos predefinidos no son suficientes.