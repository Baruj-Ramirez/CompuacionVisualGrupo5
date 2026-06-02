"""
=============================================================
  TALLER DE COMPUTACIÓN VISUAL — PARTE 1: Clasificador CLIP
=============================================================
Pasos:
  1. Cargar modelo CLIP preentrenado
  2. Cargar imágenes de ejemplo (CIFAR-10 o carpeta propia)
  3. Diseñar descripciones detalladas por clase
  4. Clasificar cada imagen con los textos
  5. Mostrar predicciones y gráficas de confianza
=============================================================
Uso:
  python clip_classifier.py                        # usa CIFAR-10 automáticamente
  python clip_classifier.py --img_dir ./mis_fotos  # usa tus propias imágenes
=============================================================
"""

import argparse
import os
import random
from pathlib import Path

import clip
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import numpy as np
import torch
from PIL import Image
from torchvision.datasets import CIFAR10
import torchvision.transforms as T
from tqdm import tqdm


# ─── CONFIGURACIÓN ──────────────────────────────────────────────────────────

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
NUM_SAMPLES = 20       # imágenes a clasificar en modo demo
SEED = 42

# Descripciones detalladas por clase (prompt engineering)
# Cada clase tiene MÚLTIPLES descripciones → CLIP hace el promedio de embeddings
CLASS_DESCRIPTIONS = {
    "airplane": [
        "a photograph of an airplane flying in the sky",
        "a commercial jet aircraft with wings",
        "an airplane on a runway or in the air",
    ],
    "automobile": [
        "a photo of a car on the road",
        "an automobile, a four-wheeled motor vehicle",
        "a sedan or hatchback car in a street",
    ],
    "bird": [
        "a photo of a bird perched or flying",
        "a small colorful bird in nature",
        "a bird with feathers and a beak",
    ],
    "cat": [
        "a close-up photo of a domestic cat",
        "a fluffy cat sitting or lying down",
        "a feline pet with pointy ears",
    ],
    "deer": [
        "a photo of a deer in a forest or field",
        "a wild deer with antlers",
        "a graceful deer in nature",
    ],
    "dog": [
        "a photo of a pet dog",
        "a domestic dog playing or sitting",
        "a friendly dog breed",
    ],
    "frog": [
        "a photo of a frog near water or on a leaf",
        "a green frog with smooth skin",
        "a small amphibian frog",
    ],
    "horse": [
        "a photo of a horse in a field",
        "a brown or white horse running",
        "a large majestic horse",
    ],
    "ship": [
        "a photo of a large ship on the ocean",
        "a cargo ship or naval vessel at sea",
        "a boat sailing in the water",
    ],
    "truck": [
        "a photo of a large truck on the road",
        "a heavy cargo truck or pickup truck",
        "a big vehicle transporting goods",
    ],
}


# ─── PASO 1: Cargar modelo CLIP ──────────────────────────────────────────────

def load_clip_model(model_name: str = "ViT-B/32"):
    print(f"\n[1] Cargando modelo CLIP ({model_name}) en {DEVICE}...")
    model, preprocess = clip.load(model_name, device=DEVICE)
    model.eval()
    print(f"    ✓ Modelo cargado. Parámetros: {sum(p.numel() for p in model.parameters()):,}")
    return model, preprocess


# ─── PASO 2: Cargar imágenes ─────────────────────────────────────────────────

def load_cifar10_samples(preprocess, n_samples: int = NUM_SAMPLES):
    """Descarga CIFAR-10 y devuelve imágenes PIL + etiquetas reales."""
    print(f"\n[2] Descargando CIFAR-10 (primera vez puede tardar ~170 MB)...")
    dataset = CIFAR10(root="./data", train=False, download=True)
    classes = dataset.classes  # lista oficial de clases

    random.seed(SEED)
    indices = random.sample(range(len(dataset)), n_samples)

    images, labels, filenames = [], [], []
    for idx in indices:
        img, label = dataset[idx]
        images.append(img)                        # PIL Image
        labels.append(classes[label])
        filenames.append(f"cifar_{idx}")

    print(f"    ✓ {n_samples} imágenes cargadas de CIFAR-10.")
    return images, labels, filenames, classes


def load_custom_images(img_dir: str):
    """Carga imágenes desde una carpeta local (estructura plana o por subcarpetas)."""
    print(f"\n[2] Cargando imágenes desde: {img_dir}")
    img_dir = Path(img_dir)
    exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

    images, labels, filenames = [], [], []
    for path in sorted(img_dir.rglob("*")):
        if path.suffix.lower() in exts:
            try:
                img = Image.open(path).convert("RGB")
                images.append(img)
                # Si está en subcarpeta, usar el nombre de la carpeta como etiqueta
                label = path.parent.name if path.parent != img_dir else "unknown"
                labels.append(label)
                filenames.append(path.stem)
            except Exception as e:
                print(f"    ✗ Error leyendo {path}: {e}")

    classes = sorted(set(labels))
    print(f"    ✓ {len(images)} imágenes cargadas. Clases detectadas: {classes}")
    return images, labels, filenames, classes


# ─── PASO 3: Codificar textos ────────────────────────────────────────────────

def encode_text_prompts(model, class_names: list[str]):
    """
    Para cada clase, promedia los embeddings de sus descripciones.
    Devuelve tensor normalizado (n_classes, embed_dim).
    """
    print("\n[3] Codificando descripciones de texto por clase...")
    text_features_list = []

    with torch.no_grad():
        for cls in class_names:
            prompts = CLASS_DESCRIPTIONS.get(
                cls,
                [f"a photo of a {cls}", f"an image of {cls}", f"a {cls}"],
            )
            tokens = clip.tokenize(prompts).to(DEVICE)
            feats = model.encode_text(tokens)          # (n_prompts, D)
            feats = feats / feats.norm(dim=-1, keepdim=True)
            avg_feat = feats.mean(dim=0)               # promedio
            avg_feat = avg_feat / avg_feat.norm()
            text_features_list.append(avg_feat)

    text_features = torch.stack(text_features_list)    # (n_classes, D)
    print(f"    ✓ Embeddings de texto: {text_features.shape}")
    return text_features


# ─── PASO 4: Clasificar imágenes ─────────────────────────────────────────────

def classify_images(model, preprocess, images: list, text_features: torch.Tensor):
    """Devuelve probabilidades softmax para cada imagen."""
    print(f"\n[4] Clasificando {len(images)} imágenes con CLIP...")
    all_probs = []

    with torch.no_grad():
        for img in tqdm(images, desc="    Clasificando"):
            img_tensor = preprocess(img).unsqueeze(0).to(DEVICE)
            img_feat = model.encode_image(img_tensor)
            img_feat = img_feat / img_feat.norm(dim=-1, keepdim=True)

            # Similitud coseno escalada (temperatura = 100)
            logits = 100.0 * (img_feat @ text_features.T)
            probs = logits.softmax(dim=-1).cpu().numpy()[0]
            all_probs.append(probs)

    return np.array(all_probs)   # (n_images, n_classes)


# ─── PASO 5: Visualizar resultados ───────────────────────────────────────────

def plot_results(images, labels, filenames, class_names, probs,
                 n_cols: int = 4, save_path: str = "clip_results.png"):
    """Muestra cada imagen con su barra de confianza."""
    n = len(images)
    n_rows = (n + n_cols - 1) // n_cols

    fig = plt.figure(figsize=(n_cols * 5, n_rows * 4.5))
    fig.suptitle("Clasificador CLIP — Confianza por Clase", fontsize=16, fontweight="bold")

    for i, (img, true_label, probs_i) in enumerate(zip(images, labels, probs)):
        ax_img = fig.add_subplot(n_rows * 2, n_cols, i % n_cols + (i // n_cols) * 2 * n_cols + 1)
        ax_bar = fig.add_subplot(n_rows * 2, n_cols, i % n_cols + (i // n_cols) * 2 * n_cols + 1 + n_cols)

        # Imagen
        ax_img.imshow(img)
        pred_idx = np.argmax(probs_i)
        pred_label = class_names[pred_idx]
        color = "green" if pred_label == true_label else "red"
        ax_img.set_title(
            f"Real: {true_label}\nPred: {pred_label} ({probs_i[pred_idx]*100:.1f}%)",
            fontsize=8, color=color, fontweight="bold"
        )
        ax_img.axis("off")

        # Barras de confianza (top-5)
        top5_idx = np.argsort(probs_i)[::-1][:5]
        top5_probs = probs_i[top5_idx]
        top5_names = [class_names[j] for j in top5_idx]
        colors = ["#2ecc71" if class_names[j] == true_label else "#3498db" for j in top5_idx]
        bars = ax_bar.barh(range(5), top5_probs * 100, color=colors)
        ax_bar.set_yticks(range(5))
        ax_bar.set_yticklabels(top5_names, fontsize=7)
        ax_bar.set_xlabel("Confianza (%)", fontsize=7)
        ax_bar.set_xlim(0, 100)
        ax_bar.invert_yaxis()
        for bar, p in zip(bars, top5_probs):
            ax_bar.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height() / 2,
                        f"{p*100:.1f}%", va="center", fontsize=6)

    plt.tight_layout()
    plt.savefig(save_path, dpi=120, bbox_inches="tight")
    print(f"\n[5] Gráfica guardada en: {save_path}")
    plt.show()


def print_summary(labels, class_names, probs):
    """Imprime métricas de accuracy global."""
    preds = [class_names[np.argmax(p)] for p in probs]
    correct = sum(p == t for p, t in zip(preds, labels))
    acc = correct / len(labels) * 100

    print("\n" + "=" * 50)
    print("  RESUMEN CLIP (zero-shot)")
    print("=" * 50)
    print(f"  Accuracy: {correct}/{len(labels)} = {acc:.1f}%")
    print("\n  Predicciones por imagen:")
    for fname, true, pred in zip(range(len(labels)), labels, preds):
        mark = "✓" if true == pred else "✗"
        print(f"  [{mark}] Real: {true:<12} → Predicho: {pred}")
    print("=" * 50)
    return acc


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Clasificador CLIP")
    parser.add_argument("--img_dir", type=str, default=None,
                        help="Carpeta con imágenes propias (opcional)")
    parser.add_argument("--model", type=str, default="ViT-B/32",
                        choices=["ViT-B/32", "ViT-B/16", "RN50", "RN101"],
                        help="Variante de CLIP a usar")
    parser.add_argument("--n_samples", type=int, default=NUM_SAMPLES)
    args = parser.parse_args()

    # 1. Modelo
    model, preprocess = load_clip_model(args.model)

    # 2. Imágenes
    if args.img_dir:
        images, labels, filenames, class_names = load_custom_images(args.img_dir)
    else:
        images, labels, filenames, class_names = load_cifar10_samples(preprocess, args.n_samples)

    # 3. Textos
    text_features = encode_text_prompts(model, class_names)

    # 4. Clasificar
    probs = classify_images(model, preprocess, images, text_features)

    # 5. Resultados
    acc = print_summary(labels, class_names, probs)
    plot_results(images, labels, filenames, class_names, probs)

    # Guardar para comparación posterior
    np.save("clip_probs.npy", probs)
    np.save("clip_labels.npy", np.array(labels))
    np.save("clip_class_names.npy", np.array(class_names))
    print("\n  Arrays guardados: clip_probs.npy, clip_labels.npy, clip_class_names.npy")
    print(f"  (serán usados por traditional_classifier.py para comparación)\n")

    return acc


if __name__ == "__main__":
    main()
