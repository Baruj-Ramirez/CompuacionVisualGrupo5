# Interfaces Multimodales: Uniendo Voz y Gestos

**Integrantes:**  
- Joan Sebastian Roberto Puerto  
- Baruj Vladimir Ramírez Escalante  
- Diego Alberto Romero Olmos  
- Maicol Sebastian Olarte Ramirez  
- Jorge Isaac Alandete Díaz  

## **Fecha de entrega:** 25 de abril de 2026  


## Descripción del tema:

Fusionar gestos (detectados con MediaPipe) y comandos de voz para realizar acciones compuestas dentro de una interfaz visual. Este taller introduce los fundamentos de los sistemas de interacción multimodal, combinando dos formas de entrada humana para enriquecer la experiencia de control.

## Descripción de la implementación

### python

En el lenguaje de programacion python usando librerias de computacion visual y computacion de audio, como cv2, speech_recognition y mediapipe, se crea una herramienta para la deteccion y ejecución de comandos por medio de gestos y voz.

## Implementaciones

### python

Para la deteccion de audio y gestos, se divide la logica del programa en dos partes principales y un orquestador.

#### Detección de audio

Para la deteccion de audio se usa la libreria *speech_recognition* captando el microfono conectado y tomando un fragmento de audio del microfono cada *1 segundo*

El fragmento de audio se le aplica un filtro para la eliminación de ruido

El fragmento de audio es procesado en lenguaje español para la conversión del audio a texto. 

Estas instruccion se corren como un hilo paralelo en el sistema.

#### Detección de gestos

En la deteccion de texto son usadas las librerias *CV2* para la deteccion de imagenes y *mediapipe* para el analisis de gestos en base a la deteccion de una mano.

En la libreria *mediapipe* se crea detecata una mano y con ello la posicion de cada uno de los dados de la mano, asi se crean dos estados de la mano, *abierta* donde los dedos indice, anular, medio y mequiñe estan extendidos; y el estado de la mano *dos dedos* donde los dedos indice y medio estan extendidos (pero no el anular).

Segun el estado de los dedos se estualizan los estados de la mano.

Estas instruccion se corren como un hilo paralelo en el sistema.

#### Orquestador

La función principal  donde se toman los resultados de la detección de audio y gestos, y en base a dicha información y comandos ejecutan los comandos en base a transformaciones sobre un cuadrado, existiendo 5 comandos: 

- *cambiar* activado cuando el comando por voz es cambiar y el estado de la mano es *abierta* que hace el color del cuadrado azul.

- *rojo* comando por voz donde se hace el cuadrado de color rojo.

- *azul* comando por voz donde se hace el cuadrado de color azul.

- *mover* comando por voz y con la mano con en estado *dos dedos* que mueve el cuadrado 20 unidades sobre el eje X a la derecha.

- *rotar* que cambia el tamaño del cubo en 10 unidades.


## Resultados visuales

### Python

Se muestra la interaccion del comando *cambiar*, donde se da el comando por voz "cambiar" mientras se tiene la mano en estado abierta

  ![alt text](./media/Comando_cambiar.gif)

Se muestra la interaccion de los comandos *rojo* y *azul*, donde se da el comando por voz respectivo que causa un cambio en el color del cubo.

  ![alt text](./media/Conmando_rojo_azul.gif)

Se muestra la interaccion del comando *mover*, donde se da el comando por voz "mover" mientras se tiene la mano en "dos dedos".

  ![alt text](./media/Comando_mover.gif)

Se muestra la interaccion del comando *rotar*, donde se da el comando por voz "rotar" cambiando el tamaño del cubo.

  ![alt text](./media/Comando_rotar.gif)

---

## Código relevante

### Python

Manejo de los dedos de la mano en codigo:

      lm = hand_landmarks.landmark

      index_up = lm[8].y < lm[6].y
      middle_up = lm[12].y < lm[10].y
      ring_up = lm[16].y < lm[14].y
      pinky_up = lm[20].y < lm[18].y

---

## Aprendizajes y dificultades

### Aprendizajes

- Uso de SpeechRecognition para transformar audio en texto en tiempo real, demostrando cómo integrar procesamiento de lenguaje natural básico en sistemas interactivos.

- Implementación de reconocimiento de gestos basado en landmarks de MediaPipe, permitiendo abstraer posiciones complejas de la mano en estados discretos (mano abierta, dos dedos).

- Uso de estados compartidos (gesture_state, voice_state) como mecanismo de comunicación entre hilos, destacando la necesidad de sincronización lógica para evitar conflictos o lecturas inconsistentes

- Integración de entradas multimodo (gestos + voz) mediante el uso de hilos paralelos, permitiendo que la detección de audio y visión por computadora funcionen de manera concurrente sin bloquear la ejecución principal.

---

## Intalación de las librerias en Ubuntu

- Intalacion de python3.10 (mas estable que versiones reciente y con compativilidad sobre las librerias) (si se presenta error ir a la seccion de instalación de versiones antiguas de python en ubuntu)

    sudo apt update
    sudo apt install python3.10 python3.10-venv python3.10-dev

- Cracion del entorno virtual

    python3.10 -m venv venv
    source venv/bin/activate

- Intalacion de las dependencias

    sudo apt install portaudio19-dev python3-pyaudio ffmpeg libgl1

- Instalacion de las librerias

    pip install mediapipe opencv-python numpy pygame
    pip install SpeechRecognition python-osc pyaudio

---

- Instalación de versiones antiguas de python en ubuntu (python3.10)

    sudo apt update
    sudo apt install software-properties-common
    sudo add-apt-repository ppa:deadsnakes/ppa
    sudo apt update

    sudo apt install python3.10 python3.10-venv python3.10-dev

    python3.10 --version