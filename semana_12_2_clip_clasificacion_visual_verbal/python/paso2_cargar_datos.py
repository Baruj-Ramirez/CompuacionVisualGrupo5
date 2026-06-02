"""
TALLER DE COMPUTACIÓN VISUAL CON CLIP
======================================
Paso 2: Cargar imágenes y conjunto de etiquetas
"""

import os
import requests
from PIL import Image
from io import BytesIO
import matplotlib.pyplot as plt

# ─────────────────────────────────────────────
# ETIQUETAS (clases a evaluar con CLIP)
# ─────────────────────────────────────────────
ETIQUETAS = [
    "a photo of a cat",
    "a photo of a dog",
    "a photo of a car",
    "a photo of a bird",
    "a photo of a person",
    "a photo of a flower",
    "a photo of food",
    "a photo of a building",
    "a photo of a tree",
    "a photo of the ocean",
]

# ─────────────────────────────────────────────
# IMÁGENES DE EJEMPLO (URLs públicas)
# ─────────────────────────────────────────────
IMAGENES_URL = {
    "gato":     "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Cat_November_2010-1a.jpg/320px-Cat_November_2010-1a.jpg",
    "perro":    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/YellowLabradorLooking_new.jpg/320px-YellowLabradorLooking_new.jpg",
    "automovil":"https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/2018_Honda_Civic_sedan_%28facelift%2C_grey%29%2C_front_8.21.19.jpg/320px-2018_Honda_Civic_sedan_%28facelift%2C_grey%29%2C_front_8.21.19.jpg",
    "pajaro":   "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camponotus_flavomarginatus_ant.jpg/320px-Camponotus_flavomarginatus_ant.jpg",
    "flor":     "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Sunflower_from_Silesia2.jpg/320px-Sunflower_from_Silesia2.jpg",
}


def descargar_imagen(url: str, nombre: str = "imagen") -> Image.Image:
    """
    Descarga una imagen desde una URL.

    Args:
        url: URL de la imagen.
        nombre: Nombre descriptivo para logs.

    Returns:
        Imagen PIL en modo RGB.
    """
    try:
        print(f"  ⬇️  Descargando '{nombre}'...")
        headers = {"User-Agent": "Mozilla/5.0"}
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        img = Image.open(BytesIO(resp.content)).convert("RGB")
        print(f"     ✅ Tamaño: {img.size[0]}×{img.size[1]} px")
        return img
    except Exception as e:
        print(f"     ⚠️  Error descargando '{nombre}': {e}")
        # Imagen de respaldo: gradiente de colores generado localmente
        return _imagen_respaldo(nombre)


def _imagen_respaldo(nombre: str) -> Image.Image:
    """Genera una imagen de color sólido como respaldo."""
    import numpy as np
    colores = {
        "gato": (180, 120, 80), "perro": (200, 160, 100),
        "automovil": (80, 100, 180), "pajaro": (100, 180, 100),
        "flor": (220, 80, 120),
    }
    color = colores.get(nombre, (150, 150, 150))
    arr = np.full((224, 224, 3), color, dtype=np.uint8)
    return Image.fromarray(arr)


def cargar_imagenes_locales(carpeta: str) -> dict:
    """
    Carga imágenes desde una carpeta local.

    Args:
        carpeta: Ruta a la carpeta con imágenes (.jpg, .png, .webp).

    Returns:
        Diccionario {nombre_archivo: imagen_PIL}.
    """
    extensiones = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    imagenes = {}
    if not os.path.exists(carpeta):
        print(f"⚠️  Carpeta '{carpeta}' no encontrada.")
        return imagenes

    for archivo in os.listdir(carpeta):
        ext = os.path.splitext(archivo)[1].lower()
        if ext in extensiones:
            ruta = os.path.join(carpeta, archivo)
            nombre = os.path.splitext(archivo)[0]
            imagenes[nombre] = Image.open(ruta).convert("RGB")
            print(f"  📂 Cargada: {archivo}")
    return imagenes


def mostrar_imagenes(imagenes: dict, titulo: str = "Imágenes cargadas"):
    """Muestra una cuadrícula con todas las imágenes cargadas."""
    n = len(imagenes)
    cols = min(n, 3)
    rows = (n + cols - 1) // cols

    fig, axes = plt.subplots(rows, cols, figsize=(5 * cols, 4 * rows))
    axes = [axes] if n == 1 else axes.flatten() if rows > 1 else list(axes)

    for ax, (nombre, img) in zip(axes, imagenes.items()):
        ax.imshow(img)
        ax.set_title(nombre, fontsize=12, fontweight="bold")
        ax.axis("off")

    # Ocultar ejes sobrantes
    for ax in axes[n:]:
        ax.axis("off")

    fig.suptitle(titulo, fontsize=16, fontweight="bold", y=1.02)
    plt.tight_layout()
    plt.savefig("paso2_imagenes.png", bbox_inches="tight", dpi=120)
    plt.show()
    print("💾 Figura guardada como 'paso2_imagenes.png'")


# ─────────────────────────────────────────────
# EJECUCIÓN DIRECTA
# ─────────────────────────────────────────────
if __name__ == "__main__":
    print("🖼️  Cargando imágenes de ejemplo...\n")
    imagenes = {nombre: descargar_imagen(url, nombre)
                for nombre, url in IMAGENES_URL.items()}

    print(f"\n📋 Etiquetas disponibles ({len(ETIQUETAS)}):")
    for i, etiqueta in enumerate(ETIQUETAS, 1):
        print(f"   {i:2d}. {etiqueta}")

    print(f"\n🖼️  Imágenes cargadas: {list(imagenes.keys())}")
    mostrar_imagenes(imagenes)
    print("\n🎉 Paso 2 completado.")
