"""
=============================================================
  TALLER DE COMPUTACIÓN VISUAL — PARTE 2: Clasificador Tradicional
  ResNet (extracción de features) + SVM / K-NN  vs. CLIP
=============================================================
Pasos:
  1. Extraer features visuales con ResNet-50 (sin fine-tuning)
  2. Construir dataset pequeño y entrenar SVM y K-NN
  3. Evaluar precisión y comparar con CLIP
=============================================================
Uso:
  python traditional_classifier.py           # después de correr clip_classifier.py
  python traditional_classifier.py --img_dir ./mis_fotos
=============================================================
"""

import argparse
import os
import random
import warnings
warnings.filterwarnings("ignore")

import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import numpy as np
import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as T
from PIL import Image
from sklearn.decomposition import PCA
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay,
)
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.svm import SVC
from torchvision.datasets import CIFAR10
from tqdm import tqdm


DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
NUM_TRAIN = 500    # imágenes de entrenamiento
NUM_TEST  = 100    # imágenes de test (deben coincidir con clip_classifier.py si se compara)
SEED = 42
random.seed(SEED)
np.random.seed(SEED)


# ─── PASO 1: Cargar ResNet como extractor de features ────────────────────────

def load_feature_extractor():
    """
    Carga ResNet-50 preentrenado en ImageNet y elimina la capa de clasificación.
    Devuelve un modelo que produce vectores de 2048 dimensiones.
    """
    print(f"\n[1] Cargando ResNet-50 como extractor de features en {DEVICE}...")
    backbone = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)

    # Quitar la última capa (fc) → solo features del penúltimo bloque
    extractor = nn.Sequential(*list(backbone.children())[:-1])   # → (B, 2048, 1, 1)
    extractor = extractor.to(DEVICE)
    extractor.eval()

    n_params = sum(p.numel() for p in extractor.parameters())
    print(f"    ✓ Extractor listo. Parámetros: {n_params:,} | Dimensión de salida: 2048")
    return extractor


RESNET_TRANSFORM = T.Compose([
    T.Resize(256),
    T.CenterCrop(224),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]),
])


def extract_features(extractor, images: list, batch_size: int = 32) -> np.ndarray:
    """Extrae features con ResNet para una lista de PIL Images."""
    all_feats = []
    with torch.no_grad():
        for i in tqdm(range(0, len(images), batch_size), desc="    Extrayendo features"):
            batch = images[i : i + batch_size]
            tensors = torch.stack([RESNET_TRANSFORM(img) for img in batch]).to(DEVICE)
            feats = extractor(tensors)          # (B, 2048, 1, 1)
            feats = feats.squeeze(-1).squeeze(-1).cpu().numpy()  # (B, 2048)
            all_feats.append(feats)
    return np.vstack(all_feats)


# ─── PASO 2: Construir dataset y entrenar clasificadores ─────────────────────

def load_cifar10_split(n_train: int = NUM_TRAIN, n_test: int = NUM_TEST):
    """Carga CIFAR-10 y devuelve (train_imgs, train_labels, test_imgs, test_labels)."""
    print(f"\n[2a] Cargando CIFAR-10 — {n_train} train / {n_test} test...")
    train_ds = CIFAR10(root="./data", train=True,  download=True)
    test_ds  = CIFAR10(root="./data", train=False, download=True)
    classes  = train_ds.classes

    # Muestreo estratificado (igual número por clase)
    n_per_class_train = n_train // len(classes)
    n_per_class_test  = n_test  // len(classes)

    def sample_balanced(dataset, n_per_class):
        class_indices = {c: [] for c in range(len(classes))}
        for idx, (_, label) in enumerate(dataset):
            class_indices[label].append(idx)
        selected = []
        for c in range(len(classes)):
            chosen = random.sample(class_indices[c], min(n_per_class, len(class_indices[c])))
            selected.extend(chosen)
        random.shuffle(selected)
        imgs   = [dataset[i][0] for i in selected]
        labels = [classes[dataset[i][1]] for i in selected]
        return imgs, labels

    train_imgs, train_labels = sample_balanced(train_ds, n_per_class_train)
    test_imgs,  test_labels  = sample_balanced(test_ds,  n_per_class_test)

    print(f"    ✓ Train: {len(train_imgs)} | Test: {len(test_imgs)}")
    return train_imgs, train_labels, test_imgs, test_labels, classes


def build_and_train_classifiers(X_train, y_train):
    """
    Entrena SVM (RBF) y K-NN sobre los features de ResNet.
    Aplica PCA para reducción dimensional antes del clasificador.
    """
    print("\n[2b] Preprocesando features (StandardScaler + PCA)...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_train)

    # PCA: conservar 95% de la varianza
    pca = PCA(n_components=0.95, random_state=SEED)
    X_pca = pca.fit_transform(X_scaled)
    print(f"    ✓ Dimensión original: {X_train.shape[1]} → PCA: {X_pca.shape[1]} componentes")

    le = LabelEncoder()
    y_enc = le.fit_transform(y_train)

    # SVM
    print("\n[2c] Entrenando SVM (kernel RBF)...")
    svm = SVC(kernel="rbf", C=10.0, gamma="scale", probability=True, random_state=SEED)
    svm.fit(X_pca, y_enc)
    print("    ✓ SVM entrenado.")

    # K-NN
    print("\n[2d] Entrenando K-NN (k=7)...")
    knn = KNeighborsClassifier(n_neighbors=7, metric="cosine")
    knn.fit(X_pca, y_enc)
    print("    ✓ K-NN entrenado.")

    return scaler, pca, le, svm, knn, X_pca, y_enc


# ─── PASO 3: Evaluación y comparación ────────────────────────────────────────

def evaluate_classifiers(scaler, pca, le, svm, knn,
                          X_test, y_test_str, classes):
    """Evalúa SVM y K-NN en el conjunto de test."""
    print("\n[3] Evaluando clasificadores...")
    X_scaled = scaler.transform(X_test)
    X_pca    = pca.transform(X_scaled)
    y_true   = le.transform(y_test_str)

    results = {}
    for name, clf in [("SVM", svm), ("K-NN", knn)]:
        y_pred = clf.predict(X_pca)
        acc = accuracy_score(y_true, y_pred)
        results[name] = {"acc": acc, "y_pred": y_pred, "y_true": y_true}
        print(f"\n  {'─'*40}")
        print(f"  Resultados {name}:")
        print(f"  Accuracy: {acc*100:.1f}%")
        print(classification_report(y_true, y_pred,
                                    target_names=le.classes_,
                                    zero_division=0))
    return results


def load_clip_results():
    """Carga resultados de CLIP si existen."""
    try:
        probs      = np.load("clip_probs.npy")
        labels     = np.load("clip_labels.npy", allow_pickle=True)
        class_names = np.load("clip_class_names.npy", allow_pickle=True)
        preds = [class_names[np.argmax(p)] for p in probs]
        acc = accuracy_score(labels, preds)
        print(f"\n  [CLIP] Accuracy cargado: {acc*100:.1f}% ({len(labels)} imágenes)")
        return acc, labels, preds, list(class_names)
    except FileNotFoundError:
        print("\n  [!] No se encontraron resultados de CLIP.")
        print("      Ejecuta primero: python clip_classifier.py")
        return None, None, None, None


# ─── Gráficas de comparación ─────────────────────────────────────────────────

def plot_comparison(results_trad: dict, clip_acc: float | None,
                    classes: list, y_true, le,
                    save_path: str = "comparison_results.png"):

    n_plots = 3 if clip_acc is not None else 2
    fig = plt.figure(figsize=(18, 12))
    fig.suptitle("Comparación: CLIP (zero-shot) vs. Clasificadores Tradicionales (ResNet + ML)",
                 fontsize=15, fontweight="bold", y=1.01)

    gs = gridspec.GridSpec(2, n_plots, figure=fig, hspace=0.45, wspace=0.35)

    # ── Gráfica 1: Accuracy comparado ───────────────────────────────────────
    ax1 = fig.add_subplot(gs[0, :])
    names, accs, colors = [], [], []
    for name, res in results_trad.items():
        names.append(f"ResNet +\n{name}")
        accs.append(res["acc"] * 100)
        colors.append("#3498db" if name == "SVM" else "#9b59b6")
    if clip_acc is not None:
        names.append("CLIP\n(zero-shot)")
        accs.append(clip_acc * 100)
        colors.append("#e74c3c")

    bars = ax1.bar(names, accs, color=colors, width=0.5, edgecolor="black", linewidth=0.8)
    ax1.set_ylim(0, 110)
    ax1.set_ylabel("Accuracy (%)", fontsize=12)
    ax1.set_title("Accuracy Global por Modelo", fontsize=13, fontweight="bold")
    ax1.axhline(y=10, color="gray", linestyle="--", alpha=0.5, label="Random baseline (10%)")
    ax1.legend(fontsize=9)
    for bar, acc in zip(bars, accs):
        ax1.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 1.5,
                 f"{acc:.1f}%", ha="center", fontweight="bold", fontsize=12)

    # ── Gráfica 2: Matriz de confusión SVM ──────────────────────────────────
    ax2 = fig.add_subplot(gs[1, 0])
    cm_svm = confusion_matrix(results_trad["SVM"]["y_true"],
                               results_trad["SVM"]["y_pred"])
    disp = ConfusionMatrixDisplay(cm_svm, display_labels=le.classes_)
    disp.plot(ax=ax2, colorbar=False, xticks_rotation=45)
    ax2.set_title("Matriz de Confusión — SVM", fontsize=11, fontweight="bold")

    # ── Gráfica 3: Matriz de confusión K-NN ─────────────────────────────────
    ax3 = fig.add_subplot(gs[1, 1])
    cm_knn = confusion_matrix(results_trad["K-NN"]["y_true"],
                               results_trad["K-NN"]["y_pred"])
    disp2 = ConfusionMatrixDisplay(cm_knn, display_labels=le.classes_)
    disp2.plot(ax=ax3, colorbar=False, xticks_rotation=45)
    ax3.set_title("Matriz de Confusión — K-NN", fontsize=11, fontweight="bold")

    # ── Gráfica 4: Accuracy por clase ───────────────────────────────────────
    if n_plots == 3:
        ax4 = fig.add_subplot(gs[1, 2])
        # Calcular accuracy por clase para SVM vs K-NN
        class_acc = {name: [] for name in results_trad}
        for cls_idx, cls_name in enumerate(le.classes_):
            mask = results_trad["SVM"]["y_true"] == cls_idx
            for name in results_trad:
                if mask.sum() > 0:
                    acc_c = (results_trad[name]["y_pred"][mask] == cls_idx).mean()
                    class_acc[name].append(acc_c * 100)
                else:
                    class_acc[name].append(0.0)

        x = np.arange(len(le.classes_))
        w = 0.35
        ax4.bar(x - w/2, class_acc["SVM"], w, label="SVM",  color="#3498db", alpha=0.85)
        ax4.bar(x + w/2, class_acc["K-NN"], w, label="K-NN", color="#9b59b6", alpha=0.85)
        ax4.set_xticks(x)
        ax4.set_xticklabels(le.classes_, rotation=45, ha="right", fontsize=8)
        ax4.set_ylabel("Accuracy (%)")
        ax4.set_title("Accuracy por Clase\n(SVM vs K-NN)", fontsize=11, fontweight="bold")
        ax4.legend(fontsize=9)
        ax4.set_ylim(0, 110)

    plt.savefig(save_path, dpi=120, bbox_inches="tight")
    print(f"\n  Gráfica de comparación guardada en: {save_path}")
    plt.show()


def plot_feature_space(X_train_pca, y_train_enc, le,
                       save_path: str = "feature_space.png"):
    """Visualiza las features en 2D con PCA."""
    print("\n  Generando visualización del espacio de features (2D PCA)...")
    pca2 = PCA(n_components=2, random_state=SEED)
    X_2d = pca2.fit_transform(X_train_pca)

    fig, ax = plt.subplots(figsize=(10, 8))
    cmap = plt.cm.get_cmap("tab10", len(le.classes_))

    for i, cls_name in enumerate(le.classes_):
        mask = y_train_enc == i
        ax.scatter(X_2d[mask, 0], X_2d[mask, 1],
                   c=[cmap(i)], label=cls_name, alpha=0.6, s=30, edgecolors="none")

    ax.set_title("Espacio de Features ResNet-50 (2D PCA)\nCada punto = una imagen",
                 fontsize=13, fontweight="bold")
    ax.set_xlabel("PC 1")
    ax.set_ylabel("PC 2")
    ax.legend(bbox_to_anchor=(1.02, 1), loc="upper left", fontsize=9)
    plt.tight_layout()
    plt.savefig(save_path, dpi=120, bbox_inches="tight")
    print(f"  Gráfica guardada en: {save_path}")
    plt.show()


def print_final_summary(results_trad: dict, clip_acc: float | None):
    print("\n" + "=" * 60)
    print("  RESUMEN FINAL — COMPARACIÓN DE MODELOS")
    print("=" * 60)
    print(f"  {'Modelo':<30} {'Accuracy':>10}")
    print(f"  {'─'*40}")
    for name, res in results_trad.items():
        print(f"  {'ResNet-50 + ' + name:<30} {res['acc']*100:>9.1f}%")
    if clip_acc is not None:
        print(f"  {'CLIP ViT-B/32 (zero-shot)':<30} {clip_acc*100:>9.1f}%")
    print("=" * 60)
    print()
    print("  ANÁLISIS:")
    best_trad = max(results_trad, key=lambda k: results_trad[k]["acc"])
    best_acc = results_trad[best_trad]["acc"]
    if clip_acc:
        diff = (clip_acc - best_acc) * 100
        if diff > 0:
            print(f"  ✦ CLIP supera al mejor clasificador tradicional ({best_trad})")
            print(f"    por {diff:.1f} puntos porcentuales.")
            print(f"    Esto es notable porque CLIP NO vio etiquetas de entrenamiento.")
        else:
            print(f"  ✦ El clasificador tradicional ({best_trad}) supera a CLIP")
            print(f"    por {-diff:.1f} puntos. Con datos suficientes, los métodos")
            print(f"    supervisados pueden ser muy competitivos.")
    print()
    print("  VENTAJAS DE CADA ENFOQUE:")
    print("  • CLIP: zero-shot, flexible, sin necesidad de datos etiquetados")
    print("  • SVM/KNN: interpretable, entrena rápido, requiere etiquetas")
    print("  • ResNet features: transferibles a muchas tareas downstream")
    print("=" * 60)


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Clasificador Tradicional + Comparación CLIP")
    parser.add_argument("--img_dir", type=str, default=None)
    parser.add_argument("--n_train", type=int, default=NUM_TRAIN)
    parser.add_argument("--n_test",  type=int, default=NUM_TEST)
    args = parser.parse_args()

    # 1. Extractor de features
    extractor = load_feature_extractor()

    # 2. Datos
    train_imgs, train_labels, test_imgs, test_labels, classes = load_cifar10_split(
        args.n_train, args.n_test
    )

    # Extraer features
    print("\n  Extrayendo features de entrenamiento...")
    X_train = extract_features(extractor, train_imgs)
    print("  Extrayendo features de test...")
    X_test  = extract_features(extractor, test_imgs)
    print(f"  ✓ X_train: {X_train.shape} | X_test: {X_test.shape}")

    # Entrenar
    scaler, pca, le, svm, knn, X_pca_train, y_train_enc = build_and_train_classifiers(
        X_train, train_labels
    )

    # 3. Evaluar
    results_trad = evaluate_classifiers(scaler, pca, le, svm, knn,
                                         X_test, test_labels, classes)

    # Cargar CLIP si está disponible
    clip_acc, _, _, _ = load_clip_results()

    # Visualizaciones
    plot_comparison(results_trad, clip_acc, classes,
                    results_trad["SVM"]["y_true"], le)
    plot_feature_space(X_pca_train, y_train_enc, le)

    # Resumen
    print_final_summary(results_trad, clip_acc)


if __name__ == "__main__":
    main()
