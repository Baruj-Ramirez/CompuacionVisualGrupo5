"""
TALLER DE COMPUTACIÓN VISUAL CON CLIP
======================================
Paso 3: Obtener embeddings y comparar similitud
"""

import torch
import torch.nn.functional as F
import numpy as np
from PIL import Image

from paso1_cargar_modelo import cargar_modelo
from paso2_cargar_datos import ETIQUETAS, IMAGENES_URL, descargar_imagen


def _extraer_tensor(salida) -> torch.Tensor:
    """
    Extrae el tensor de embedding de la salida del modelo,
    sea un torch.Tensor directo o un objeto ModelOutput de HuggingFace.
    """
    if isinstance(salida, torch.Tensor):
        return salida
    # CLIPModel devuelve un objeto con .image_embeds o .text_embeds
    # dependiendo del método llamado; si no, usamos el pooler_output
    for attr in ("image_embeds", "text_embeds", "pooler_output", "last_hidden_state"):
        valor = getattr(salida, attr, None)
        if valor is not None:
            # last_hidden_state tiene shape [B, seq, dim] → tomamos el token [CLS]
            if attr == "last_hidden_state":
                return valor[:, 0, :]
            return valor
    raise ValueError(f"No se pudo extraer tensor de: {type(salida)}")


def obtener_embedding_imagen(model, processor, imagen: Image.Image, device: str) -> torch.Tensor:
    """
    Obtiene el embedding vectorial de una imagen.

    Args:
        model: Modelo CLIP.
        processor: Procesador CLIP.
        imagen: Imagen PIL.
        device: Dispositivo de cómputo.

    Returns:
        Tensor normalizado de shape [1, dim_embedding].
    """
    with torch.no_grad():
        inputs = processor(images=imagen, return_tensors="pt").to(device)
        salida = model.get_image_features(**inputs)
        embedding = _extraer_tensor(salida)
        embedding = F.normalize(embedding, dim=-1)
    return embedding


def obtener_embeddings_texto(model, processor, etiquetas: list, device: str) -> torch.Tensor:
    """
    Obtiene los embeddings vectoriales de una lista de textos.

    Args:
        model: Modelo CLIP.
        processor: Procesador CLIP.
        etiquetas: Lista de strings con las etiquetas.
        device: Dispositivo de cómputo.

    Returns:
        Tensor normalizado de shape [N_etiquetas, dim_embedding].
    """
    with torch.no_grad():
        inputs = processor(text=etiquetas, return_tensors="pt",
                           padding=True, truncation=True).to(device)
        salida = model.get_text_features(**inputs)
        embeddings = _extraer_tensor(salida)
        embeddings = F.normalize(embeddings, dim=-1)
    return embeddings


def calcular_similitud(emb_imagen: torch.Tensor,
                        emb_textos: torch.Tensor) -> np.ndarray:
    """
    Calcula la similitud coseno entre un embedding de imagen y varios de texto.

    La similitud coseno entre dos vectores normalizados equivale
    a su producto punto: sim(a, b) = a · b  (ya que ||a|| = ||b|| = 1).

    Returns:
        Array numpy de shape [N_etiquetas] con valores en [-1, 1].
    """
    similitudes = (emb_imagen @ emb_textos.T).squeeze(0)
    return similitudes.cpu().numpy()


def calcular_probabilidades(similitudes: np.ndarray, temperatura: float = 0.01) -> np.ndarray:
    """
    Convierte similitudes en probabilidades usando softmax con temperatura.

    Una temperatura más baja → distribución más concentrada (más confianza).
    Una temperatura más alta → distribución más uniforme (menos confianza).

    Args:
        similitudes: Array de similitudes crudas.
        temperatura: Factor de escala (default CLIP usa 0.01).

    Returns:
        Array de probabilidades que suman 1.0.
    """
    logits = similitudes / temperatura
    exp_logits = np.exp(logits - np.max(logits))  # estabilidad numérica
    return exp_logits / exp_logits.sum()


def analizar_imagen(model, processor, imagen: Image.Image,
                     etiquetas: list, device: str,
                     nombre: str = "imagen") -> dict:
    """
    Analiza una imagen y retorna sus similitudes con todas las etiquetas.

    Returns:
        Diccionario con embeddings, similitudes, probabilidades y predicción.
    """
    # Obtener embeddings
    emb_img = obtener_embedding_imagen(model, processor, imagen, device)
    emb_txt = obtener_embeddings_texto(model, processor, etiquetas, device)

    # Calcular similitudes y probabilidades
    similitudes = calcular_similitud(emb_img, emb_txt)
    probabilidades = calcular_probabilidades(similitudes)

    # Ranking de etiquetas
    ranking = np.argsort(similitudes)[::-1]

    resultado = {
        "nombre": nombre,
        "embedding_imagen": emb_img.cpu().numpy(),
        "similitudes": similitudes,
        "probabilidades": probabilidades,
        "ranking": ranking,
        "mejor_etiqueta": etiquetas[ranking[0]],
        "mejor_similitud": similitudes[ranking[0]],
        "mejor_probabilidad": probabilidades[ranking[0]],
    }

    return resultado


def imprimir_resultados(resultado: dict, etiquetas: list, top_k: int = 5):
    """Imprime los resultados de similitud de forma legible."""
    nombre = resultado["nombre"]
    print(f"\n{'═'*55}")
    print(f"  🖼️  Imagen: {nombre.upper()}")
    print(f"{'═'*55}")
    print(f"  🏆 Predicción: {resultado['mejor_etiqueta']}")
    print(f"  📊 Similitud:  {resultado['mejor_similitud']:.4f}")
    print(f"  🎯 Confianza:  {resultado['mejor_probabilidad']*100:.1f}%")
    print(f"\n  Top {top_k} etiquetas más similares:")
    print(f"  {'─'*50}")

    for i, idx in enumerate(resultado["ranking"][:top_k]):
        barra = "█" * int(resultado["probabilidades"][idx] * 40)
        print(f"  {i+1}. {etiquetas[idx]:<35s} "
              f"sim={resultado['similitudes'][idx]:.3f} "
              f"p={resultado['probabilidades'][idx]*100:5.1f}%")
    print()


# ─────────────────────────────────────────────
# EJECUCIÓN DIRECTA
# ─────────────────────────────────────────────
if __name__ == "__main__":
    # Cargar modelo
    model, processor, device = cargar_modelo()

    # Cargar imágenes
    print("\n🖼️  Descargando imágenes de ejemplo...")
    imagenes = {nombre: descargar_imagen(url, nombre)
                for nombre, url in IMAGENES_URL.items()}

    # Analizar cada imagen
    print("\n🔍 Calculando embeddings y similitudes...\n")
    resultados = {}
    for nombre, img in imagenes.items():
        resultado = analizar_imagen(model, processor, img,
                                    ETIQUETAS, device, nombre)
        resultados[nombre] = resultado
        imprimir_resultados(resultado, ETIQUETAS)

    print("🎉 Paso 3 completado: embeddings y similitudes calculadas.")
