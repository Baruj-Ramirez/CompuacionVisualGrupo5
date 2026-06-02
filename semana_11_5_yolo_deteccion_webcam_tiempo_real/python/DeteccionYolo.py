"""
Taller de Computación Visual - Detección en Tiempo Real con YOLO
Requisitos: pip install ultralytics opencv-python
"""

# ─────────────────────────────────────────
# PASO 1: Importar librerías y cargar modelo
# ─────────────────────────────────────────
import cv2
import time
from ultralytics import YOLO

# Cargar modelo preentrenado (se descarga automáticamente la primera vez)
# Opciones: 'yolov8n.pt' (nano, más rápido), 'yolov8s.pt', 'yolov8m.pt', 'yolov8l.pt'
model = YOLO("yolov8n.pt")
print("✅ Modelo YOLO cargado correctamente")

# ─────────────────────────────────────────
# PASO 2: Capturar video en tiempo real
# ─────────────────────────────────────────
# 0 = cámara principal; reemplazar por ruta de video si se desea usar archivo
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("❌ No se pudo acceder a la cámara.")
    exit()

print("📷 Cámara iniciada. Presiona 'q' para salir.\n")

# Colores por clase (se generan dinámicamente para distinguir objetos)
def get_color(class_id: int) -> tuple:
    """Genera un color BGR reproducible para cada clase."""
    palette = [
        (255, 56,  56),   # rojo
        (255, 157, 151),  # rosa
        ( 56, 220, 255),  # cian
        ( 56, 255, 132),  # verde
        (255, 178,  29),  # naranja
        (207, 210, 255),  # lavanda
        ( 49, 210, 207),  # turquesa
        (255, 205,  56),  # amarillo
        (100, 115, 255),  # azul
        (255, 114, 224),  # magenta
    ]
    return palette[class_id % len(palette)]


# ─────────────────────────────────────────
# PASO 3: Bucle principal de detección
# ─────────────────────────────────────────
while True:

    ret, frame = cap.read()
    if not ret:
        print("⚠️  No se pudo leer el frame.")
        break

    # 3a. Medir tiempo de inicio
    t_inicio = time.time()

    # 3b. Detección con YOLO (stream=True optimiza uso de memoria)
    resultados = model.predict(source=frame, stream=True, verbose=False)

    # 3c. Dibujar cajas, etiquetas y confianza
    for resultado in resultados:
        cajas = resultado.boxes

        for caja in cajas:
            # Coordenadas del bounding box
            x1, y1, x2, y2 = map(int, caja.xyxy[0])

            # ID y nombre de clase
            clase_id   = int(caja.cls[0])
            clase_nom  = model.names[clase_id]

            # Confianza (0.0 – 1.0)
            confianza  = float(caja.conf[0])

            # Solo mostrar detecciones con confianza > 40 %
            if confianza < 0.40:
                continue

            color = get_color(clase_id)

            # Rectángulo del objeto
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

            # Etiqueta con nombre y porcentaje de confianza
            etiqueta   = f"{clase_nom} {confianza:.0%}"
            (ancho_txt, alto_txt), _ = cv2.getTextSize(
                etiqueta, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1
            )

            # Fondo de la etiqueta para mejor legibilidad
            cv2.rectangle(
                frame,
                (x1, y1 - alto_txt - 8),
                (x1 + ancho_txt + 4, y1),
                color, -1
            )
            cv2.putText(
                frame, etiqueta,
                (x1 + 2, y1 - 5),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                (255, 255, 255), 1, cv2.LINE_AA
            )

    # 3d. Calcular tiempo de inferencia y FPS
    t_inferencia = time.time() - t_inicio
    fps          = 1.0 / t_inferencia if t_inferencia > 0 else 0

    print(f"⏱  Inferencia: {t_inferencia * 1000:.1f} ms  |  FPS: {fps:.1f}")

    # Mostrar FPS en la esquina superior izquierda del frame
    cv2.putText(
        frame, f"FPS: {fps:.1f}",
        (10, 30), cv2.FONT_HERSHEY_SIMPLEX,
        1.0, (0, 255, 0), 2, cv2.LINE_AA
    )

    # 3e. Mostrar resultado
    cv2.imshow("Deteccion YOLO - Taller CV", frame)

    # ─────────────────────────────────────────
    # PASO 4: Salir con 'q'
    # ─────────────────────────────────────────
    if cv2.waitKey(1) & 0xFF == ord("q"):
        print("\n🛑 Saliendo...")
        break

# Liberar recursos
cap.release()
cv2.destroyAllWindows()