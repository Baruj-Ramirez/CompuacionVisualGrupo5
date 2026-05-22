# ============================================================
# FLUJO ÓPTICO Y TRACKING DE OBJETOS
# OpenCV + NumPy + Matplotlib
#
# Requisitos:
# pip install opencv-python numpy matplotlib
#
# Ejecutar:
# python optical_flow_project.py
#
# Presiona:
#   q -> salir
#   r -> re-detectar puntos
# ============================================================

import cv2
import numpy as np
import time
import math

# ============================================================
# CONFIGURACIÓN GENERAL
# ============================================================

VIDEO_SOURCE = 0
# VIDEO_SOURCE = "video.mp4"

USE_WEBCAM = True

# ============================================================
# UTILIDADES
# ============================================================

def draw_flow_vectors(frame, points_old, points_new, status, mask):
    """
    Dibuja trayectorias y vectores de movimiento
    """

    good_new = points_new[status == 1]
    good_old = points_old[status == 1]

    for i, (new, old) in enumerate(zip(good_new, good_old)):
        a, b = new.ravel()
        c, d = old.ravel()

        a, b, c, d = int(a), int(b), int(c), int(d)

        # Línea trayectoria
        mask = cv2.line(mask, (a, b), (c, d), (0, 255, 0), 2)

        # Punto actual
        frame = cv2.circle(frame, (a, b), 4, (0, 0, 255), -1)

        # Vector movimiento
        cv2.arrowedLine(
            frame,
            (c, d),
            (a, b),
            (255, 0, 0),
            1,
            tipLength=0.3
        )

    output = cv2.add(frame, mask)

    return output, mask


def motion_detection(flow, threshold=2.0):
    """
    Detecta regiones en movimiento usando magnitud del flujo óptico
    """

    magnitude, angle = cv2.cartToPolar(flow[..., 0], flow[..., 1])

    # Umbral de movimiento
    motion_mask = np.uint8(magnitude > threshold) * 255

    # Limpiar ruido
    kernel = np.ones((5, 5), np.uint8)

    motion_mask = cv2.morphologyEx(
        motion_mask,
        cv2.MORPH_OPEN,
        kernel
    )

    motion_mask = cv2.dilate(motion_mask, kernel, iterations=2)

    # Contornos
    contours, _ = cv2.findContours(
        motion_mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    moving_objects = 0

    for contour in contours:

        area = cv2.contourArea(contour)

        if area > 500:
            moving_objects += 1

    return motion_mask, moving_objects, magnitude


def estimate_camera_motion(flow):
    """
    Estima movimiento global de cámara
    """

    flow_x = flow[..., 0]
    flow_y = flow[..., 1]

    mean_x = np.mean(flow_x)
    mean_y = np.mean(flow_y)

    height, width = flow_x.shape

    center_x = width // 2
    center_y = height // 2

    left_flow = np.mean(flow_x[:, :center_x])
    right_flow = np.mean(flow_x[:, center_x:])

    top_flow = np.mean(flow_y[:center_y, :])
    bottom_flow = np.mean(flow_y[center_y:, :])

    motion_type = "ESTATICO"

    # Pan horizontal
    if abs(mean_x) > abs(mean_y):

        if mean_x > 0.5:
            motion_type = "PAN DERECHA"

        elif mean_x < -0.5:
            motion_type = "PAN IZQUIERDA"

    # Tilt vertical
    else:

        if mean_y > 0.5:
            motion_type = "TILT ABAJO"

        elif mean_y < -0.5:
            motion_type = "TILT ARRIBA"

    # Zoom aproximado
    zoom_indicator = np.mean([
        abs(left_flow - right_flow),
        abs(top_flow - bottom_flow)
    ])

    if zoom_indicator > 1.0:
        motion_type += " + ZOOM"

    angular_velocity = math.sqrt(mean_x**2 + mean_y**2)

    return motion_type, angular_velocity, (mean_x, mean_y)


# ============================================================
# LUCAS-KANADE (FLUJO DISPERSO)
# ============================================================

def lucas_kanade_demo(cap):

    print("\n==============================")
    print("LUCAS-KANADE")
    print("==============================")

    ret, old_frame = cap.read()

    if not ret:
        return

    old_gray = cv2.cvtColor(old_frame, cv2.COLOR_BGR2GRAY)

    # Parámetros Shi-Tomasi
    feature_params = dict(
        maxCorners=200,
        qualityLevel=0.3,
        minDistance=7,
        blockSize=7
    )

    # Parámetros Lucas-Kanade
    lk_params = dict(
        winSize=(15, 15),
        maxLevel=2,
        criteria=(
            cv2.TERM_CRITERIA_EPS |
            cv2.TERM_CRITERIA_COUNT,
            10,
            0.03
        )
    )

    # Detectar puntos iniciales
    p0 = cv2.goodFeaturesToTrack(
        old_gray,
        mask=None,
        **feature_params
    )

    mask = np.zeros_like(old_frame)

    fps_start = time.time()
    frame_count = 0

    while True:

        ret, frame = cap.read()

        if not ret:
            break

        frame_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Flujo óptico
        p1, st, err = cv2.calcOpticalFlowPyrLK(
            old_gray,
            frame_gray,
            p0,
            None,
            **lk_params
        )

        if p1 is not None:

            output, mask = draw_flow_vectors(
                frame,
                p0,
                p1,
                st,
                mask
            )

            # Re-detección automática
            good_points = np.sum(st)

            if good_points < 50:

                print("Re-detectando puntos...")

                p1 = cv2.goodFeaturesToTrack(
                    frame_gray,
                    mask=None,
                    **feature_params
                )

                mask = np.zeros_like(frame)

            # Actualizar puntos
            old_gray = frame_gray.copy()
            p0 = p1.reshape(-1, 1, 2)

        else:
            output = frame

        # FPS
        frame_count += 1

        elapsed = time.time() - fps_start
        fps = frame_count / elapsed

        cv2.putText(
            output,
            f"FPS: {fps:.2f}",
            (20, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 255, 255),
            2
        )

        cv2.imshow("Lucas-Kanade", output)

        key = cv2.waitKey(30) & 0xFF

        if key == ord('q'):
            break

        elif key == ord('r'):

            p0 = cv2.goodFeaturesToTrack(
                frame_gray,
                mask=None,
                **feature_params
            )

            mask = np.zeros_like(frame)

    cv2.destroyWindow("Lucas-Kanade")


# ============================================================
# FARNEBACK (FLUJO DENSO)
# ============================================================

def farneback_demo(cap):

    print("\n==============================")
    print("FARNEBACK")
    print("==============================")

    ret, frame1 = cap.read()

    if not ret:
        return

    prev_gray = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)

    hsv = np.zeros_like(frame1)
    hsv[..., 1] = 255

    fps_start = time.time()
    frame_count = 0

    while True:

        ret, frame2 = cap.read()

        if not ret:
            break

        next_gray = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)

        # Flujo óptico denso
        flow = cv2.calcOpticalFlowFarneback(
            prev_gray,
            next_gray,
            None,
            0.5,
            3,
            15,
            3,
            5,
            1.2,
            0
        )

        magnitude, angle = cv2.cartToPolar(
            flow[..., 0],
            flow[..., 1]
        )

        # Dirección -> Hue
        hsv[..., 0] = angle * 180 / np.pi / 2

        # Magnitud -> Intensidad
        hsv[..., 2] = cv2.normalize(
            magnitude,
            None,
            0,
            255,
            cv2.NORM_MINMAX
        )

        flow_rgb = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)

        # Detección movimiento
        motion_mask, moving_objects, mag = motion_detection(flow)

        # Movimiento cámara
        motion_type, angular_velocity, translation = \
            estimate_camera_motion(flow)

        # Mostrar información
        cv2.putText(
            flow_rgb,
            f"Camara: {motion_type}",
            (20, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 255, 255),
            2
        )

        cv2.putText(
            flow_rgb,
            f"Velocidad Angular: {angular_velocity:.2f}",
            (20, 60),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 255, 255),
            2
        )

        cv2.putText(
            flow_rgb,
            f"Objetos en movimiento: {moving_objects}",
            (20, 90),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 255, 255),
            2
        )

        # FPS
        frame_count += 1

        elapsed = time.time() - fps_start
        fps = frame_count / elapsed

        cv2.putText(
            flow_rgb,
            f"FPS: {fps:.2f}",
            (20, 120),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 255, 255),
            2
        )

        cv2.imshow("Farneback - Flujo Denso", flow_rgb)
        cv2.imshow("Mascara Movimiento", motion_mask)

        prev_gray = next_gray

        key = cv2.waitKey(30) & 0xFF

        if key == ord('q'):
            break

    cv2.destroyWindow("Farneback - Flujo Denso")
    cv2.destroyWindow("Mascara Movimiento")


# ============================================================
# TRACKING DE OBJETOS
# ============================================================

def object_tracking_demo(cap):

    print("\n==============================")
    print("TRACKING DE OBJETOS")
    print("==============================")

    ret, frame = cap.read()

    if not ret:
        return

    # Selección manual ROI
    roi = cv2.selectROI(
        "Seleccionar Objeto",
        frame,
        fromCenter=False,
        showCrosshair=True
    )

    cv2.destroyWindow("Seleccionar Objeto")

    # Tracker
    tracker = cv2.TrackerCSRT_create()

    tracker.init(frame, roi)

    fps_start = time.time()
    frame_count = 0

    lost_tracking_counter = 0

    while True:

        ret, frame = cap.read()

        if not ret:
            break

        success, bbox = tracker.update(frame)

        if success:

            x, y, w, h = [int(v) for v in bbox]

            # Bounding box
            cv2.rectangle(
                frame,
                (x, y),
                (x + w, y + h),
                (0, 255, 0),
                2
            )

            cv2.putText(
                frame,
                "TRACKING",
                (x, y - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2
            )

            lost_tracking_counter = 0

        else:

            lost_tracking_counter += 1

            cv2.putText(
                frame,
                "TRACKING PERDIDO",
                (50, 50),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0, 0, 255),
                3
            )

            # Oclusión parcial
            if lost_tracking_counter < 30:

                cv2.putText(
                    frame,
                    "Intentando recuperar...",
                    (50, 90),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 255, 255),
                    2
                )

        # FPS
        frame_count += 1

        elapsed = time.time() - fps_start
        fps = frame_count / elapsed

        cv2.putText(
            frame,
            f"FPS: {fps:.2f}",
            (20, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (255, 255, 0),
            2
        )

        cv2.imshow("Object Tracking", frame)

        key = cv2.waitKey(30) & 0xFF

        if key == ord('q'):
            break

    cv2.destroyWindow("Object Tracking")


# ============================================================
# MAIN
# ============================================================

def main():

    cap = cv2.VideoCapture(VIDEO_SOURCE)

    if not cap.isOpened():
        print("Error al abrir video")
        return

    print("""
==================================================
PROYECTO DE FLUJO OPTICO Y TRACKING
==================================================

1 -> Lucas-Kanade
2 -> Farneback
3 -> Tracking Objetos
q -> Salir
""")

    while True:

        option = input("Seleccione opcion: ")

        cap.release()
        cap = cv2.VideoCapture(VIDEO_SOURCE)

        if option == "1":
            lucas_kanade_demo(cap)

        elif option == "2":
            farneback_demo(cap)

        elif option == "3":
            object_tracking_demo(cap)

        elif option.lower() == "q":
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
