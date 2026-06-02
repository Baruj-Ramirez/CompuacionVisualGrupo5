"""
TALLER DE COMPUTACIÓN VISUAL CON CLIP
======================================
Script principal: ejecuta el pipeline completo en un solo comando.

Uso:
    python taller_clip.py

    # Con imágenes propias:
    python taller_clip.py --carpeta ./mis_imagenes

    # Con etiquetas personalizadas:
    python taller_clip.py --etiquetas "a dog" "a cat" "a bird"
"""

import argparse
import sys
import os
import torch
import matplotlib.pyplot as plt

# ─────────────────────────────────────────────────────────────────────
# ARGUMENTOS CLI
# ─────────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(
    description="Taller de Computación Visual con CLIP"
)
parser.add_argument("--carpeta", type=str, default=None,
                    help="Carpeta con imágenes locales (.jpg/.png)")
parser.add_argument("--etiquetas", nargs="+", default=None,
                    help="Lista de etiquetas personalizadas")
parser.add_argument("--top_k", type=int, default=5,
                    help="Cuántas etiquetas mostrar en los gráficos (default: 5)")
parser.add_argument("--salida", type=str, default=".",
                    help="Carpeta donde guardar los resultados (default: .)")
args = parser.parse_args()

# ─────────────────────────────────────────────────────────────────────
# IMPORTS DE MÓDULOS DEL TALLER
# ─────────────────────────────────────────────────────────────────────
from paso1_cargar_modelo import cargar_modelo
from paso2_cargar_datos import (ETIQUETAS as ETIQUETAS_DEFAULT,
                                 IMAGENES_URL, descargar_imagen,
                                 cargar_imagenes_locales)
from paso3_embeddings_similitud import analizar_imagen, imprimir_resultados
from paso4_anotar_imagenes import anotar_imagen_matplotlib, COLORES
from paso5_visualizar import (graficar_heatmap, graficar_resumen,
                               graficar_embeddings_pca)

# ─────────────────────────────────────────────────────────────────────
# CONFIGURACIÓN
# ─────────────────────────────────────────────────────────────────────
ETIQUETAS = args.etiquetas if args.etiquetas else ETIQUETAS_DEFAULT
TOP_K = args.top_k
CARPETA_SALIDA = args.salida
os.makedirs(CARPETA_SALIDA, exist_ok=True)


def guardar(fig, nombre):
    ruta = os.path.join(CARPETA_SALIDA, nombre)
    fig.savefig(ruta, bbox_inches="tight", dpi=130,
                facecolor=COLORES["fondo_panel"])
    print(f"  💾 Guardado: {ruta}")
    plt.close(fig)


# ─────────────────────────────────────────────────────────────────────
# PIPELINE
# ─────────────────────────────────────────────────────────────────────
print("\n" + "═" * 60)
print("    🎓 TALLER DE COMPUTACIÓN VISUAL CON CLIP")
print("       Modelo: openai/clip-vit-base-patch32")
print("═" * 60 + "\n")

# PASO 1 ─── Modelo
print("▶ PASO 1: Cargar modelo y tokenizador")
print("─" * 40)
model, processor, device = cargar_modelo()

# PASO 2 ─── Imágenes y etiquetas
print("\n▶ PASO 2: Cargar imágenes y etiquetas")
print("─" * 40)

if args.carpeta:
    print(f"📂 Cargando imágenes desde: {args.carpeta}")
    imagenes = cargar_imagenes_locales(args.carpeta)
    if not imagenes:
        print("⚠️  No se encontraron imágenes. Usando imágenes de ejemplo.")
        imagenes = {n: descargar_imagen(u, n) for n, u in IMAGENES_URL.items()}
else:
    print("🌐 Descargando imágenes de ejemplo desde Wikipedia...")
    imagenes = {n: descargar_imagen(u, n) for n, u in IMAGENES_URL.items()}

print(f"\n📋 Etiquetas ({len(ETIQUETAS)}):")
for i, e in enumerate(ETIQUETAS, 1):
    print(f"   {i:2d}. {e}")

# PASO 3 ─── Embeddings y similitud
print("\n▶ PASO 3: Calcular embeddings y similitudes")
print("─" * 40)

resultados = {}
for nombre, img in imagenes.items():
    resultado = analizar_imagen(model, processor, img,
                                ETIQUETAS, device, nombre)
    resultados[nombre] = resultado
    imprimir_resultados(resultado, ETIQUETAS, top_k=TOP_K)

# PASO 4 ─── Anotar imágenes
print("▶ PASO 4: Anotar imágenes con predicciones")
print("─" * 40)

for nombre, img in imagenes.items():
    fig = anotar_imagen_matplotlib(img, resultados[nombre], ETIQUETAS, TOP_K)
    guardar(fig, f"imagen_{nombre}_anotada.png")

# Embeddings de texto para PCA
from paso3_embeddings_similitud import obtener_embeddings_texto
emb_txt = obtener_embeddings_texto(model, processor, ETIQUETAS, device).cpu().numpy()

# PASO 5 ─── Visualizar resultados
print("\n▶ PASO 5: Visualizar resultados")
print("─" * 40)

nombres = list(imagenes.keys())

fig_heat = graficar_heatmap(resultados, ETIQUETAS, nombres)
guardar(fig_heat, "resultados_heatmap.png")
plt.pause(0.1)

fig_resumen = graficar_resumen(resultados, ETIQUETAS)
guardar(fig_resumen, "resultados_resumen.png")
plt.pause(0.1)

if len(imagenes) >= 2:
    fig_pca = graficar_embeddings_pca(resultados, ETIQUETAS, emb_txt)
    guardar(fig_pca, "resultados_embeddings_pca.png")

# ─────────────────────────────────────────────────────────────────────
# RESUMEN FINAL
# ─────────────────────────────────────────────────────────────────────
print("\n" + "═" * 60)
print("  🎉 TALLER COMPLETADO")
print("═" * 60)
print(f"\n  📁 Archivos generados en: {os.path.abspath(CARPETA_SALIDA)}/")
for f in sorted(os.listdir(CARPETA_SALIDA)):
    if f.endswith(".png"):
        print(f"     • {f}")
print()
print("  Predicciones finales:")
for nombre, res in resultados.items():
    etiq = res["mejor_etiqueta"].replace("a photo of ", "")
    conf = res["mejor_probabilidad"] * 100
    print(f"     • {nombre:<15s} → {etiq}  ({conf:.1f}%)")
print()
