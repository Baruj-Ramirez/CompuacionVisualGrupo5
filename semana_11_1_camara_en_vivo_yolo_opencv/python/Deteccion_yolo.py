import cv2
import numpy as np
from ultralytics import YOLO
import time

# =========================
# CARGA DEL MODELO YOLO
# =========================
model = YOLO("yolov8n.pt")  # Modelo ligero

# =========================
# CAPTURA DE VIDEO
# =========================
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("No se pudo acceder a la webcam")
    exit()

# =========================
# VARIABLES DE CONTROL
# =========================
paused = False
current_filter = 0

filters = {
    0: "Original",
    1: "Escala de Grises",
    2: "Binarizacion",
    3: "Bordes Canny"
}

# Variables para grabación
recording = False
video_writer = None

print("\nCONTROLES:")
print("f -> Cambiar filtro")
print("p -> Pausar/Reanudar")
print("s -> Guardar imagen")
print("v -> Iniciar/Detener grabación")
print("q -> Salir")

while True:

    if not paused:
        ret, frame = cap.read()

        if not ret:
            print("Error al capturar frame")
            break

        # =========================
        # REDIMENSIONAR
        # =========================
        frame = cv2.resize(frame, (800, 600))

        # =========================
        # FILTROS
        # =========================
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        _, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)

        edges = cv2.Canny(gray, 100, 200)

        # =========================
        # DETECCIÓN YOLO
        # =========================
        results = model(frame)

        detected_frame = frame.copy()

        for result in results:
            boxes = result.boxes

            for box in boxes:

                x1, y1, x2, y2 = map(int, box.xyxy[0])

                confidence = float(box.conf[0])

                class_id = int(box.cls[0])

                class_name = model.names[class_id]

                label = f"{class_name} {confidence:.2f}"

                # Dibujar caja
                cv2.rectangle(
                    detected_frame,
                    (x1, y1),
                    (x2, y2),
                    (0, 255, 0),
                    2
                )

                # Texto
                cv2.putText(
                    detected_frame,
                    label,
                    (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (0, 255, 0),
                    2
                )


        # =========================
        # SELECCIONAR FILTRO ACTIVO
        # =========================
        if current_filter == 0:
            processed = frame
            cv2.imshow("YOLO Deteccion", detected_frame)

        elif current_filter == 1:
            processed = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
            cv2.imshow("Escala de Grises", gray)

        elif current_filter == 2:
            processed = cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)
            cv2.imshow("Binarizacion", binary)

        elif current_filter == 3:
            processed = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
            cv2.imshow("Bordes Canny", edges)

        # =========================
        # GRABAR VIDEO
        # =========================
        if recording and video_writer is not None:
            video_writer.write(processed)

    # =========================
    # CONTROLES DE TECLADO
    # =========================
    key = cv2.waitKey(1) & 0xFF

    # Cambiar filtro
    if key == ord('f'):
        current_filter = (current_filter + 1) % 4
        cv2.destroyAllWindows()
        print(f"Filtro actual: {filters[current_filter]}")

        if(paused):
            paused = not paused

    # Pausar/Reanudar
    elif key == ord('p'):
        paused = not paused
        print("Pausado" if paused else "Reanudado")

    # Guardar imagen
    elif key == ord('s'):
        filename = f"captura_{int(time.time())}.png"
        cv2.imwrite(filename, processed)
        print(f"Imagen guardada: {filename}")

    # Grabar video
    elif key == ord('v'):

        if not recording:

            filename = f"video_{int(time.time())}.avi"

            fourcc = cv2.VideoWriter_fourcc(*'XVID')

            video_writer = cv2.VideoWriter(
                filename,
                fourcc,
                20.0,
                (800, 600)
            )

            recording = True
            print(f"Grabando video: {filename}")

        else:
            recording = False

            if video_writer is not None:
                video_writer.release()

            print("Grabación detenida")

    # Salir
    elif key == ord('q'):
        break

# =========================
# LIBERAR RECURSOS
# =========================
cap.release()

if video_writer is not None:
    video_writer.release()

cv2.destroyAllWindows()
