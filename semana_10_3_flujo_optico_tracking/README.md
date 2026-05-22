# Taller 10_3 – Flujo Óptico y Tracking de Movimiento

**Integrantes:**  
- Joan Sebastian Roberto Puerto  
- Baruj Vladimir Ramírez Escalante  
- Diego Alberto Romero Olmos  
- Maicol Sebastian Olarte Ramirez  
- Jorge Isaac Alandete Díaz  

**Fecha de entrega:** 18 de marzo de 2026  

---

## Descripción breve

### Python

El objetivo de este proyecto fue implementar diferentes técnicas de visión por computador relacionadas con el análisis de movimiento utilizando OpenCV y NumPy en Python. Mediante la implementacion de:

- Flujo óptico disperso mediante el algoritmo de Lucas-Kanade.
- Flujo óptico denso mediante el algoritmo de Farneback.
- Tracking de objetos usando trackers de OpenCV.

El sistema permite procesar video desde webcam o archivos de video en tiempo real, visualizar vectores de movimiento y detectar regiones dinámicas dentro de la escena.

## Implementaciones

### Python

Como primer paso general se importan las librerias, para el analisis de imagenes se usa la libreria **opencv**, para el manerjo de las imagenes **numpy** y para la visualizacion de las imagenes **matplotlib**

Si implemento la captura de video desde una webcam utilizando OpenCV. Esto permitió obtener una secuencia continua de frames para procesarlos en tiempo real con el codigo.

        cap=cv2.VideoCapture(0)

Aunque tambien se puede extraer desde un archivo de video 

        cap=cv2.VideoCapture("video.mp4")

#### Flujo Óptico Lucas-Kanade

1. Se detectaron puntos importantes utilizando el detector mediante 

        cv2.goodFeaturesToTrack()

2. En el calculo de flujo optico, el movimiento de los puntos entre frames consecutivos se calculó usando el metodo

        cv2.calcOpticalFlowPyrLK()

    El cual El algoritmo estima la nueva posición del punto, la dirección del movimiento y la magnitud del desplazamiento.

3. Y despues de calculado el movimiento se dibujan en pantalla los puntos rastreados, las líneas de trayectoria y los vectores de movimiento.

#### Flujo Óptico denso Farneback

1. Se detectaron puntos importantes utilizando el detector mediante el metodo

        cv2.goodFeaturesToTrack()


2. Se estimo el flujo denso con el metodo

        cv2.calcOpticalFlowFarneback()

    Obteniendo un campo vectorial donde cada píxel contiene el desplazamiento horizontal y vertical.

3. Se obtiene la magnitud y direccion de cada pixel y mediante un espacio de color HSV se representa el flujo optico.

4. Se muestra la representacion del flujo optico y las mascara usada.

#### Tracking de objetos 

1. Se selecciona manualmente el objeto mediante un bounding box

2. Con el objeto se crea e inicia como tracker CSRT

        tracker=cv2.legacy.TrackerCSRT_create()

        tracker.init(frame, roi)

3. Cada actualizacion del tracker se vuelve a dibujar el bounding box alrededor de la posicion del objeto que estima el tracker.

        success,bbox=tracker.update(frame)


## Resultados visuales

- Se muestra la deteccion de Lukas Kanade, sobre un poster sobre una pared blanca, en el se detectan los puntos que describen la figura e identifican el movimiento de la camara.

  ![alt text](./media/python_Deteccion_lucas_kanade.gif)

- Se muestra la deteccion Farneback, mostrandose dos ventanas de resultados, la primera correspondiente alflujo optico en su conversion a un espacio de color y la segundo correpondiente a la mascara, en la prueba se hacen movimientos frente a la camara.

  ![alt text](./media/python_Deteccion_farneback.gif)

- Se muestra el tracking de figuras, estableciendo el tracking en una tarjeta de transmilenio, estableciendo su bounding box y observado como esta se actualiza segun la posicion de la targeta.

  ![alt text](./media/python_Traker.gif)

## Código relevante

Codigo para la de teccion de puntos en la imagen.

```python
p0 = cv2.goodFeaturesToTrack(
    old_gray,
    mask=None,
    maxCorners=200,
    qualityLevel=0.3,
    minDistance=7,
    blockSize=7
)
```


## Prompts de IA utilizados (Chatgpt)


1. En una implementacion en la que uso la libreria de python opencv-python, obtengo este mensaje de error 'module cv2 has no atribute TrackerCSRT_create' sin embargo este metodo existe en el modulo ¿a que se puede deber?

## Conslusiones:

- Si se compara el nuemro de fotogramas por segundo entre los flujos opticos de Lucas-Kanade y el Flujo Óptico denso Farneback, se nota en las pruabas que elFlujo Óptico denso Farneback tiene la mitad de FPS que el Lucas-Kanade, esto probablemente debido a la implementacion hecha, donde el Lucas-Kanade detecta los puntos importante y en base a ellos calcula el movimiento, en cambio el Farneback calcula la direccion de todos los pixeles de la imagen.

- el trackin tiene un muy buena presion en la deteccion de objetos cuyas propiedades con varien en el tiempo, en el ejemplo planteado mas arriba con la targeta, se observa que la bounding boxes se mantiene al acercar y alejar el obejto, sin embargo en las rotaciones del objeto sobre cualquier eje el traking tiende a perderse.

## Aprendizajes y dificultades

### Aprendizajes

- Comprender el funcionamiento del flujo óptico.

- Se entendio profundamente las diferencias entre métodos los metodos dispersos y densos en la vision por computadora.

- Se reconoce la importancia de optimizar FPS y parámetros

### Dificultades

- Uno de los principales problemas fue la compatibilidad de versiones de OpenCV, pues el metodo TrackerCSRT_create() no esta en la libreria estandar de cv2 *opencv-python*, si no que esta en la version *opencv-contrib-python*

### Instalacion

Para la ejecucion del codigo se deben tener las librerias de opencv-contrib-python, numpy y matplotlib

Estas librerias se descargan en un entorno virtual en python, el paso a paso para la creacion del entorno virtual y la instalacion de las librerias se describe a continuacion:

1. Se verifica la instalacion de python con
                ``` 
                python3 --version
                ```
   Si no esta instalado se instala, en ubunto es:
                ```
                sudo apt update
                sudo apt install python3 python3-pip
                ```
2. Se crea el entorno viertual
                ```
                python3 -m venv entorno_cv
                ```
3. Se activa el entorno virtual
                ```
                source entorno_cv/bin/activate
                ```
4. Se instalan las librerias en el entorno virtual
                ```
                pip install opencv-python
                pip install opencv-contrib-python
                pip install matplotlib
                ```
5. Ejecutar el codigo :D
