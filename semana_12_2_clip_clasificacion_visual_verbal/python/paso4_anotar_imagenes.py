"""
TALLER DE COMPUTACIÓN VISUAL CON CLIP
======================================
Paso 4: Diseñar (anotar) cada imagen con sus predicciones de texto
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch
from PIL import Image, ImageDraw, ImageFont
import io

from paso1_cargar_modelo import cargar_modelo
from paso2_cargar_datos import ETIQUETAS, IMAGENES_URL, descargar_imagen
from paso3_embeddings_similitud import analizar_imagen


# ─────────────────────────────────────────────
# PALETA DE COLORES
# ─────────────────────────────────────────────
COLORES = {
    "fondo_panel":  "#0D1117",
    "acento":       "#58A6FF",
    "texto":        "#E6EDF3",
    "barra_alta":   "#3FB950",
    "barra_media":  "#D29922",
    "barra_baja":   "#F85149",
    "borde":        "#30363D",
}


def anotar_imagen_matplotlib(imagen: Image.Image,
                              resultado: dict,
                              etiquetas: list,
                              top_k: int = 5) -> plt.Figure:
    """
    Crea una figura con la imagen anotada y una barra lateral de resultados.

    Layout:
        [  Imagen anotada  |  Panel de barras de similitud  ]

    Args:
        imagen: Imagen PIL original.
        resultado: Diccionario devuelto por analizar_imagen().
        etiquetas: Lista completa de etiquetas.
        top_k: Cuántas etiquetas mostrar en el panel.

    Returns:
        Figura matplotlib lista para guardar/mostrar.
    """
    fig = plt.figure(figsize=(14, 6), facecolor=COLORES["fondo_panel"])
    gs = fig.add_gridspec(1, 2, width_ratios=[1.2, 1], wspace=0.05)

    # ── Panel izquierdo: imagen con anotación ──────────────────────────
    ax_img = fig.add_subplot(gs[0])
    ax_img.imshow(np.array(imagen))
    ax_img.set_facecolor(COLORES["fondo_panel"])

    # Etiqueta de predicción encima de la imagen
    pred_texto = resultado["mejor_etiqueta"]
    confianza = resultado["mejor_probabilidad"] * 100

    # Rectángulo de fondo para el texto
    ax_img.text(
        0.02, 0.97, f"🏆 {pred_texto}",
        transform=ax_img.transAxes,
        fontsize=11, fontweight="bold",
        color=COLORES["texto"],
        verticalalignment="top",
        bbox=dict(boxstyle="round,pad=0.4", facecolor="#161B22",
                  edgecolor=COLORES["acento"], linewidth=1.5, alpha=0.92)
    )
    ax_img.text(
        0.02, 0.88, f"Confianza: {confianza:.1f}%",
        transform=ax_img.transAxes,
        fontsize=9, color=COLORES["acento"],
        verticalalignment="top",
        bbox=dict(boxstyle="round,pad=0.3", facecolor="#161B22",
                  edgecolor=COLORES["borde"], linewidth=1, alpha=0.85)
    )

    ax_img.set_title(f"Imagen: {resultado['nombre'].upper()}",
                     color=COLORES["texto"], fontsize=13,
                     fontweight="bold", pad=10)
    ax_img.axis("off")

    # ── Panel derecho: barras de similitud ─────────────────────────────
    ax_bar = fig.add_subplot(gs[1])
    ax_bar.set_facecolor(COLORES["fondo_panel"])

    ranking = resultado["ranking"][:top_k]
    labels = [etiquetas[i].replace("a photo of ", "") for i in ranking]
    probs = [resultado["probabilidades"][i] * 100 for i in ranking]
    sims = [resultado["similitudes"][i] for i in ranking]

    y_pos = np.arange(len(labels))
    colores_barra = []
    for p in probs:
        if p >= 50:
            colores_barra.append(COLORES["barra_alta"])
        elif p >= 15:
            colores_barra.append(COLORES["barra_media"])
        else:
            colores_barra.append(COLORES["barra_baja"])

    barras = ax_bar.barh(y_pos, probs, color=colores_barra,
                          height=0.55, edgecolor="none")

    # Etiquetas de valor al final de cada barra
    for i, (barra, prob, sim) in enumerate(zip(barras, probs, sims)):
        ax_bar.text(prob + 0.5, i, f"{prob:.1f}%  (sim={sim:.3f})",
                    va="center", ha="left",
                    color=COLORES["texto"], fontsize=8.5)

    ax_bar.set_yticks(y_pos)
    ax_bar.set_yticklabels(labels, color=COLORES["texto"], fontsize=9.5)
    ax_bar.set_xlabel("Probabilidad (%)", color=COLORES["texto"], fontsize=9)
    ax_bar.set_title(f"Top {top_k} similitudes CLIP",
                     color=COLORES["texto"], fontsize=11, fontweight="bold")
    ax_bar.set_xlim(0, max(probs) * 1.35)
    ax_bar.tick_params(colors=COLORES["texto"])
    ax_bar.spines[:].set_color(COLORES["borde"])
    ax_bar.invert_yaxis()

    # Línea guía vertical
    ax_bar.axvline(x=50, color=COLORES["borde"], linestyle="--",
                   linewidth=0.8, alpha=0.6)

    plt.tight_layout(pad=1.5)
    return fig


def anotar_con_pil(imagen: Image.Image, resultado: dict,
                   etiquetas: list, top_k: int = 3) -> Image.Image:
    """
    Alternativa: anota directamente sobre la imagen PIL con recuadro de texto.

    Útil para exportar imágenes individuales sin matplotlib.

    Returns:
        Imagen PIL con anotaciones superpuestas.
    """
    img_anotada = imagen.copy()
    draw = ImageDraw.Draw(img_anotada, "RGBA")

    w, h = img_anotada.size

    # Fondo semitransparente inferior
    overlay_h = int(h * 0.30)
    draw.rectangle([(0, h - overlay_h), (w, h)],
                   fill=(13, 17, 23, 200))

    # Texto de predicción principal
    ranking = resultado["ranking"][:top_k]
    lineas = []
    for rank, idx in enumerate(ranking):
        etiq = etiquetas[idx].replace("a photo of ", "")
        prob = resultado["probabilidades"][idx] * 100
        lineas.append(f"{'★' if rank==0 else ' '} {etiq}: {prob:.1f}%")

    y_start = h - overlay_h + 8
    for linea in lineas:
        draw.text((10, y_start), linea, fill=(230, 237, 243, 255))
        y_start += 20

    return img_anotada


# ─────────────────────────────────────────────
# EJECUCIÓN DIRECTA
# ─────────────────────────────────────────────
if __name__ == "__main__":
    model, processor, device = cargar_modelo()

    print("\n🖼️  Descargando imágenes...")
    imagenes = {nombre: descargar_imagen(url, nombre)
                for nombre, url in IMAGENES_URL.items()}

    print("\n🎨 Anotando imágenes con predicciones CLIP...\n")
    figuras = {}

    for nombre, img in imagenes.items():
        resultado = analizar_imagen(model, processor, img,
                                    ETIQUETAS, device, nombre)
        fig = anotar_imagen_matplotlib(img, resultado, ETIQUETAS, top_k=5)

        ruta = f"paso4_{nombre}_anotado.png"
        fig.savefig(ruta, bbox_inches="tight", dpi=130,
                    facecolor=COLORES["fondo_panel"])
        figuras[nombre] = fig
        print(f"  💾 Guardado: {ruta}")
        plt.close(fig)

    print("\n🎉 Paso 4 completado: imágenes anotadas guardadas.")
