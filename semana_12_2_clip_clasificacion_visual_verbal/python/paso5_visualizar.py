"""
TALLER DE COMPUTACIÓN VISUAL CON CLIP
======================================
Paso 5: Visualizar resultados completos
        - Heatmap de similitudes (imágenes × etiquetas)
        - Cuadrícula comparativa de todas las imágenes
        - Mapa de embeddings 2D (PCA/UMAP)
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from matplotlib.colors import LinearSegmentedColormap
import seaborn as sns
from sklearn.decomposition import PCA
from PIL import Image

from paso1_cargar_modelo import cargar_modelo
from paso2_cargar_datos import ETIQUETAS, IMAGENES_URL, descargar_imagen
from paso3_embeddings_similitud import analizar_imagen, obtener_embedding_imagen, obtener_embeddings_texto
from paso4_anotar_imagenes import anotar_imagen_matplotlib, COLORES


# ─────────────────────────────────────────────
# COLORMAP PERSONALIZADO (oscuro → acento)
# ─────────────────────────────────────────────
CMAP = LinearSegmentedColormap.from_list(
    "clip_cmap",
    ["#0D1117", "#1C3557", "#58A6FF", "#3FB950"],
    N=256
)


# ──────────────────────────────────────────────────────────────────────
# FIGURA 1: Heatmap de similitudes  (imágenes × etiquetas)
# ──────────────────────────────────────────────────────────────────────
def graficar_heatmap(resultados: dict, etiquetas: list,
                     nombres_imagenes: list) -> plt.Figure:
    """
    Heatmap con similitudes coseno entre cada imagen y cada etiqueta.

    Rows = imágenes, Cols = etiquetas.
    """
    matriz = np.array([
        resultados[n]["similitudes"] for n in nombres_imagenes
    ])

    etiquetas_cortas = [e.replace("a photo of ", "") for e in etiquetas]
    nombres_cortos = [n.capitalize() for n in nombres_imagenes]

    fig, ax = plt.subplots(figsize=(16, 5), facecolor=COLORES["fondo_panel"])
    ax.set_facecolor(COLORES["fondo_panel"])

    sns.heatmap(
        matriz,
        ax=ax,
        cmap=CMAP,
        xticklabels=etiquetas_cortas,
        yticklabels=nombres_cortos,
        annot=True,
        fmt=".2f",
        linewidths=0.4,
        linecolor=COLORES["borde"],
        annot_kws={"size": 8, "color": "white"},
        cbar_kws={"shrink": 0.8, "label": "Similitud coseno"}
    )

    # Estilos
    ax.set_title("Mapa de Similitud CLIP: Imágenes × Etiquetas",
                 color=COLORES["texto"], fontsize=14,
                 fontweight="bold", pad=15)
    ax.tick_params(axis="x", colors=COLORES["texto"],
                   labelrotation=35, labelsize=9)
    ax.tick_params(axis="y", colors=COLORES["texto"],
                   labelrotation=0, labelsize=10)
    ax.xaxis.tick_bottom()

    cbar = ax.collections[0].colorbar
    cbar.ax.yaxis.set_tick_params(color=COLORES["texto"])
    cbar.ax.tick_params(colors=COLORES["texto"])
    plt.setp(cbar.ax.yaxis.get_ticklabels(), color=COLORES["texto"])

    plt.tight_layout(pad=1.5)
    return fig


# ──────────────────────────────────────────────────────────────────────
# FIGURA 2: Cuadrícula de imágenes anotadas
# ──────────────────────────────────────────────────────────────────────
def graficar_cuadricula(imagenes: dict, resultados: dict,
                         etiquetas: list) -> plt.Figure:
    """
    Muestra todas las imágenes en una cuadrícula con su predicción y barra.
    """
    nombres = list(imagenes.keys())
    n = len(nombres)
    cols = min(n, 3)
    rows = (n + cols - 1) // cols

    fig = plt.figure(figsize=(7 * cols, 6 * rows),
                     facecolor=COLORES["fondo_panel"])
    fig.suptitle("Predicciones CLIP por Imagen",
                 color=COLORES["texto"], fontsize=16,
                 fontweight="bold", y=1.01)

    for i, nombre in enumerate(nombres):
        ax = fig.add_subplot(rows, cols, i + 1)
        subfig = anotar_imagen_matplotlib(
            imagenes[nombre], resultados[nombre], etiquetas, top_k=5
        )
        # Renderizar subfigura a array y mostrar
        import io
        buf = io.BytesIO()
        subfig.savefig(buf, format="png", bbox_inches="tight",
                       facecolor=COLORES["fondo_panel"], dpi=100)
        buf.seek(0)
        img_render = Image.open(buf).convert("RGB")
        ax.imshow(np.array(img_render))
        ax.axis("off")
        plt.close(subfig)

    plt.tight_layout(pad=1.0)
    return fig


# ──────────────────────────────────────────────────────────────────────
# FIGURA 3: Espacio de embeddings 2D (PCA)
# ──────────────────────────────────────────────────────────────────────
def graficar_embeddings_pca(resultados: dict, etiquetas: list,
                             emb_textos: np.ndarray) -> plt.Figure:
    """
    Proyecta embeddings de imagen y texto en 2D con PCA.

    Permite observar qué tan cerca están imágenes y etiquetas
    en el espacio vectorial compartido de CLIP.
    """
    # Reunir todos los embeddings
    nombres_img = list(resultados.keys())
    embs_img = np.vstack([resultados[n]["embedding_imagen"] for n in nombres_img])
    etiquetas_cortas = [e.replace("a photo of ", "") for e in etiquetas]

    todos_embs = np.vstack([embs_img, emb_textos])

    # PCA a 2 dimensiones
    pca = PCA(n_components=2)
    coords = pca.fit_transform(todos_embs)

    coords_img = coords[:len(nombres_img)]
    coords_txt = coords[len(nombres_img):]

    var_explicada = pca.explained_variance_ratio_ * 100

    fig, ax = plt.subplots(figsize=(12, 8), facecolor=COLORES["fondo_panel"])
    ax.set_facecolor("#0D1117")

    # Puntos de texto (etiquetas)
    ax.scatter(coords_txt[:, 0], coords_txt[:, 1],
               c=COLORES["barra_baja"], s=80, zorder=3,
               marker="s", label="Etiquetas de texto", alpha=0.8)
    for i, etiq in enumerate(etiquetas_cortas):
        ax.annotate(etiq, (coords_txt[i, 0], coords_txt[i, 1]),
                    textcoords="offset points", xytext=(6, 4),
                    color="#F85149", fontsize=7.5, alpha=0.9)

    # Puntos de imágenes
    cmap_imgs = plt.cm.get_cmap("tab10", len(nombres_img))
    for j, nombre in enumerate(nombres_img):
        ax.scatter(coords_img[j, 0], coords_img[j, 1],
                   c=[cmap_imgs(j)], s=200, zorder=5,
                   marker="*", edgecolors="white", linewidths=0.5)
        ax.annotate(nombre.capitalize(),
                    (coords_img[j, 0], coords_img[j, 1]),
                    textcoords="offset points", xytext=(8, 5),
                    color="white", fontsize=9, fontweight="bold")

    # Líneas desde imagen a su mejor etiqueta
    for nombre in nombres_img:
        j = nombres_img.index(nombre)
        mejor_idx = resultados[nombre]["ranking"][0]
        ax.plot([coords_img[j, 0], coords_txt[mejor_idx, 0]],
                [coords_img[j, 1], coords_txt[mejor_idx, 1]],
                color=cmap_imgs(j), linewidth=1, linestyle="--", alpha=0.5)

    ax.set_title("Espacio de Embeddings CLIP (PCA 2D)\n"
                 "Imágenes ★ y Etiquetas ■ en espacio vectorial compartido",
                 color=COLORES["texto"], fontsize=12, fontweight="bold", pad=12)
    ax.set_xlabel(f"PC1 ({var_explicada[0]:.1f}% varianza)",
                  color=COLORES["texto"], fontsize=9)
    ax.set_ylabel(f"PC2 ({var_explicada[1]:.1f}% varianza)",
                  color=COLORES["texto"], fontsize=9)
    ax.tick_params(colors=COLORES["texto"])
    ax.spines[:].set_color(COLORES["borde"])
    ax.grid(True, color=COLORES["borde"], linewidth=0.4, alpha=0.5)
    ax.legend(facecolor="#161B22", edgecolor=COLORES["borde"],
              labelcolor=COLORES["texto"], fontsize=9)

    plt.tight_layout(pad=1.5)
    return fig


# ──────────────────────────────────────────────────────────────────────
# FIGURA 4: Panel resumen con métricas globales
# ──────────────────────────────────────────────────────────────────────
def graficar_resumen(resultados: dict, etiquetas: list) -> plt.Figure:
    """
    Panel resumen con la confianza de cada predicción.
    """
    nombres = list(resultados.keys())
    confianzas = [resultados[n]["mejor_probabilidad"] * 100 for n in nombres]
    predicciones = [resultados[n]["mejor_etiqueta"].replace("a photo of ", "")
                    for n in nombres]

    fig, ax = plt.subplots(figsize=(10, 5), facecolor=COLORES["fondo_panel"])
    ax.set_facecolor(COLORES["fondo_panel"])

    colores_bar = [
        COLORES["barra_alta"] if c >= 70
        else COLORES["barra_media"] if c >= 40
        else COLORES["barra_baja"]
        for c in confianzas
    ]

    bars = ax.bar(nombres, confianzas, color=colores_bar,
                  width=0.5, edgecolor="none")

    for bar, conf, pred in zip(bars, confianzas, predicciones):
        ax.text(bar.get_x() + bar.get_width() / 2,
                bar.get_height() + 1.2,
                f"{conf:.1f}%\n({pred})",
                ha="center", va="bottom",
                color=COLORES["texto"], fontsize=8)

    ax.set_ylim(0, 110)
    ax.set_xlabel("Imagen", color=COLORES["texto"], fontsize=10)
    ax.set_ylabel("Confianza de predicción (%)",
                  color=COLORES["texto"], fontsize=10)
    ax.set_title("Confianza de Predicción CLIP por Imagen",
                 color=COLORES["texto"], fontsize=13,
                 fontweight="bold", pad=12)
    ax.tick_params(colors=COLORES["texto"])
    ax.spines[:].set_color(COLORES["borde"])
    ax.axhline(50, color=COLORES["borde"], linestyle="--", linewidth=0.8)
    ax.text(len(nombres) - 0.5, 52, "50%", color=COLORES["borde"], fontsize=8)

    plt.tight_layout(pad=1.5)
    return fig


# ─────────────────────────────────────────────
# EJECUCIÓN DIRECTA: pipeline completo
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import torch

    # 1. Modelo
    model, processor, device = cargar_modelo()

    # 2. Imágenes
    print("\n🖼️  Descargando imágenes...")
    imagenes = {nombre: descargar_imagen(url, nombre)
                for nombre, url in IMAGENES_URL.items()}

    # 3. Análisis
    print("\n🔍 Analizando imágenes con CLIP...")
    resultados = {}
    for nombre, img in imagenes.items():
        resultados[nombre] = analizar_imagen(
            model, processor, img, ETIQUETAS, device, nombre)

    nombres = list(imagenes.keys())

    # Embeddings de texto para PCA
    from paso3_embeddings_similitud import obtener_embeddings_texto
    emb_txt = obtener_embeddings_texto(
        model, processor, ETIQUETAS, device).cpu().numpy()

    # 4. Visualizaciones
    print("\n📊 Generando visualizaciones...\n")

    fig1 = graficar_heatmap(resultados, ETIQUETAS, nombres)
    fig1.savefig("paso5_heatmap.png", bbox_inches="tight", dpi=130,
                 facecolor=COLORES["fondo_panel"])
    print("  💾 Guardado: paso5_heatmap.png")
    plt.show()

    fig2 = graficar_resumen(resultados, ETIQUETAS)
    fig2.savefig("paso5_resumen.png", bbox_inches="tight", dpi=130,
                 facecolor=COLORES["fondo_panel"])
    print("  💾 Guardado: paso5_resumen.png")
    plt.show()

    fig3 = graficar_embeddings_pca(resultados, ETIQUETAS, emb_txt)
    fig3.savefig("paso5_embeddings_pca.png", bbox_inches="tight", dpi=130,
                 facecolor=COLORES["fondo_panel"])
    print("  💾 Guardado: paso5_embeddings_pca.png")
    plt.show()

    print("\n🎉 Taller completado. Todas las visualizaciones han sido guardadas.")
