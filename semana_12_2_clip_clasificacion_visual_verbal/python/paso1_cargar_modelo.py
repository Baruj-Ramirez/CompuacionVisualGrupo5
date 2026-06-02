"""
TALLER DE COMPUTACIÓN VISUAL CON CLIP
======================================
Paso 1: Cargar el modelo CLIP y su tokenizador
"""

import torch
from transformers import CLIPProcessor, CLIPModel

# ─────────────────────────────────────────────
# CONFIGURACIÓN
# ─────────────────────────────────────────────
MODEL_NAME = "openai/clip-vit-base-patch32"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


def cargar_modelo(model_name: str = MODEL_NAME):
    """
    Carga el modelo CLIP y su procesador desde HuggingFace.

    Args:
        model_name: Identificador del modelo en HuggingFace Hub.

    Returns:
        model: El modelo CLIP cargado.
        processor: El procesador/tokenizador de CLIP.
        device: El dispositivo de cómputo usado (cpu/cuda).
    """
    print(f"📦 Cargando modelo: {model_name}")
    print(f"💻 Dispositivo detectado: {DEVICE.upper()}")

    # Cargar el procesador (incluye tokenizador + procesador de imágenes)
    processor = CLIPProcessor.from_pretrained(model_name)

    # Cargar el modelo
    model = CLIPModel.from_pretrained(model_name)
    model = model.to(DEVICE)
    model.eval()  # Modo evaluación (sin gradientes)

    print("✅ Modelo y procesador cargados correctamente.\n")

    # Información del modelo
    total_params = sum(p.numel() for p in model.parameters())
    print(f"📊 Parámetros totales del modelo: {total_params:,}")
    print(f"📊 Dimensión de embeddings de imagen: {model.config.projection_dim}")
    print(f"📊 Dimensión de embeddings de texto:  {model.config.projection_dim}")

    return model, processor, DEVICE


# ─────────────────────────────────────────────
# EJECUCIÓN DIRECTA
# ─────────────────────────────────────────────
if __name__ == "__main__":
    model, processor, device = cargar_modelo()
    print("\n🎉 Paso 1 completado: modelo listo para usar.")
