#!/usr/bin/env python3
"""
Taller: Coincidencia de Patrones y Homografías - Versión corregida
Manejo de knnMatch y desbordamiento de píxeles en imágenes sintéticas.
"""

import cv2
import numpy as np
import matplotlib.pyplot as plt
import time

# ----------------------------------------------------------------------
# 1. BFMatcher
# ----------------------------------------------------------------------
def bf_matching(img1, img2, detector='sift', ratio_test=False):
    gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
    
    if detector.lower() == 'sift':
        detect = cv2.SIFT_create()
    elif detector.lower() == 'orb':
        detect = cv2.ORB_create()
    else:
        raise ValueError("Detector debe ser 'sift' u 'orb'")
    
    kp1, des1 = detect.detectAndCompute(gray1, None)
    kp2, des2 = detect.detectAndCompute(gray2, None)
    
    if des1 is None or des2 is None:
        return [], [], [], 0
    
    norm = cv2.NORM_L2 if detector == 'sift' else cv2.NORM_HAMMING
    bf = cv2.BFMatcher(norm, crossCheck=False)
    start = time.time()
    
    if ratio_test:
        knn = bf.knnMatch(des1, des2, k=2)
        good = []
        for pair in knn:
            if len(pair) == 2:
                m, n = pair
                if m.distance < 0.75 * n.distance:
                    good.append(m)
        matches = good
    else:
        matches = sorted(bf.match(des1, des2), key=lambda x: x.distance)
    
    elapsed = time.time() - start
    print(f"BFMatcher ({detector}) -> Matches: {len(matches)} en {elapsed:.3f} s")
    return kp1, kp2, matches, elapsed

def draw_matches(img1, kp1, img2, kp2, matches, title="Matches", max_matches=50):
    if not matches:
        print("No hay matches para dibujar.")
        return
    img_matches = cv2.drawMatches(img1, kp1, img2, kp2, matches[:max_matches], None,
                                  flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
    plt.figure(figsize=(12, 6))
    plt.imshow(cv2.cvtColor(img_matches, cv2.COLOR_BGR2RGB))
    plt.title(title)
    plt.axis('off')
    plt.show()

# ----------------------------------------------------------------------
# 2. FLANN
# ----------------------------------------------------------------------
def flann_matching(img1, img2, detector='sift', ratio_test=True):
    gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
    
    if detector.lower() == 'sift':
        detect = cv2.SIFT_create()
        index_params = dict(algorithm=1, trees=5)
    elif detector.lower() == 'orb':
        detect = cv2.ORB_create()
        index_params = dict(algorithm=6, table_number=12, key_size=20, multi_probe_level=2)
    else:
        raise ValueError("Detector debe ser 'sift' u 'orb'")
    
    search_params = dict(checks=50)
    kp1, des1 = detect.detectAndCompute(gray1, None)
    kp2, des2 = detect.detectAndCompute(gray2, None)
    
    if des1 is None or des2 is None:
        return [], [], [], 0
    
    start = time.time()
    flann = cv2.FlannBasedMatcher(index_params, search_params)
    
    if ratio_test:
        knn_matches = flann.knnMatch(des1, des2, k=2)
        good_matches = []
        for pair in knn_matches:
            if len(pair) == 2:
                m, n = pair
                if m.distance < 0.75 * n.distance:
                    good_matches.append(m)
    else:
        good_matches = sorted(flann.match(des1, des2), key=lambda x: x.distance)
    
    elapsed = time.time() - start
    print(f"FLANN ({detector}) -> Matches: {len(good_matches)} en {elapsed:.3f} s")
    return kp1, kp2, good_matches, elapsed

# ----------------------------------------------------------------------
# 3. Homografía y RANSAC
# ----------------------------------------------------------------------
def compute_homography(kp1, kp2, matches, reproj_thresh=3.0, conf=0.99):
    if len(matches) < 4:
        print("No hay suficientes matches (mínimo 4).")
        return None, None, None, None
    src_pts = np.float32([kp1[m.queryIdx].pt for m in matches]).reshape(-1, 1, 2)
    dst_pts = np.float32([kp2[m.trainIdx].pt for m in matches]).reshape(-1, 1, 2)
    H, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, reproj_thresh, confidence=conf)
    if H is None:
        return None, None, None, None
    inliers = np.sum(mask)
    print(f"Homografía: {inliers} inliers de {len(matches)} ({100*inliers/len(matches):.1f}%)")
    return H, mask, src_pts, dst_pts

def visualize_inliers(img1, kp1, img2, kp2, matches, mask, title="Inliers vs Outliers"):
    if len(matches) == 0:
        return
    inlier = [m for i, m in enumerate(matches) if mask[i]]
    outlier = [m for i, m in enumerate(matches) if not mask[i]]
    img_in = cv2.drawMatches(img1, kp1, img2, kp2, inlier, None,
                             matchColor=(0, 255, 0), flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
    img_out = cv2.drawMatches(img1, kp1, img2, kp2, outlier, None,
                              matchColor=(0, 0, 255), flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
    combined = cv2.addWeighted(img_out, 0.5, img_in, 0.5, 0)
    plt.figure(figsize=(12, 6))
    plt.imshow(cv2.cvtColor(combined, cv2.COLOR_BGR2RGB))
    plt.title(title)
    plt.axis('off')
    plt.show()

# ----------------------------------------------------------------------
# 4. Detección de objeto
# ----------------------------------------------------------------------
def detect_object(template, scene, detector='sift'):
    kp_t, kp_s, matches, _ = flann_matching(template, scene, detector, ratio_test=True)
    if len(matches) < 4:
        print("No hay suficientes matches para detectar objeto.")
        return scene, None
    H, mask, _, _ = compute_homography(kp_t, kp_s, matches)
    if H is None:
        return scene, None
    h, w = template.shape[:2]
    corners = np.float32([[0, 0], [w, 0], [w, h], [0, h]]).reshape(-1, 1, 2)
    dst_corners = cv2.perspectiveTransform(corners, H)
    img_out = scene.copy()
    cv2.polylines(img_out, [np.int32(dst_corners)], True, (0, 255, 0), 3, cv2.LINE_AA)
    print("Objeto detectado correctamente.")
    return img_out, H

# ----------------------------------------------------------------------
# 5. Image Stitching (panorama) - imágenes texturizadas seguras
# ----------------------------------------------------------------------
def create_textured_image(width, height, base_color, shift):
    """Crea una imagen con gradiente y figuras, sin desbordamiento de uint8."""
    img = np.zeros((height, width, 3), dtype=np.uint8)
    for x in range(width):
        for y in range(height):
            val = (x + y + shift) % 256
            # Limitar cada canal a [0,255]
            r = min(255, base_color[0] + val // 3)
            g = min(255, base_color[1] + val // 2)
            b = min(255, base_color[2] + val)
            img[y, x] = [r, g, b]
    # Añadir círculo y rectángulo para más textura
    cv2.circle(img, (width//3, height//2), 50, (255,255,255), -1)
    cv2.rectangle(img, (width//2, height//4), (width//2+80, height//4+80), (0,0,255), 3)
    return img

def stitch_images(images, detector='sift', blend=False):
    if len(images) < 2:
        return images[0] if images else None
    result = images[0].copy()
    for i in range(1, len(images)):
        print(f"Uniendo imagen {i}...")
        kp1, kp2, matches, _ = flann_matching(result, images[i], detector, ratio_test=True)
        if len(matches) < 10:
            print(f"Insuficientes matches ({len(matches)} < 10), omitiendo imagen {i}.")
            continue
        H, mask, _, _ = compute_homography(kp1, kp2, matches, reproj_thresh=5.0)
        if H is None:
            continue
        h_r, w_r = result.shape[:2]
        h_i, w_i = images[i].shape[:2]
        corners = np.float32([[0, 0], [w_i, 0], [w_i, h_i], [0, h_i]]).reshape(-1, 1, 2)
        warped_corners = cv2.perspectiveTransform(corners, H)
        all_corners = np.vstack(([[0, 0], [w_r, 0], [w_r, h_r], [0, h_r]],
                                 warped_corners.reshape(-1, 2)))
        xmin, ymin = np.int32(all_corners.min(axis=0))
        xmax, ymax = np.int32(all_corners.max(axis=0))
        translation = np.float32([[1, 0, -xmin], [0, 1, -ymin], [0, 0, 1]])
        H_trans = translation @ H
        warped = cv2.warpPerspective(images[i], H_trans, (xmax - xmin, ymax - ymin))
        result_trans = np.zeros_like(warped)
        result_trans[-ymin:h_r - ymin, -xmin:w_r - xmin] = result
        if blend:
            mask_r = (result_trans > 0).astype(np.uint8)
            mask_w = (warped > 0).astype(np.uint8)
            overlap = cv2.bitwise_and(mask_r, mask_w)
            res_float = result_trans.astype(np.float32)
            war_float = warped.astype(np.float32)
            blended = np.where(overlap[..., None] == 1, (res_float + war_float) / 2, res_float + war_float)
            result = blended.astype(np.uint8)
        else:
            result = np.where(warped > 0, warped, result_trans)
    return result

# ----------------------------------------------------------------------
# 6. Evaluación
# ----------------------------------------------------------------------
def evaluate_matching(matches, mask=None, elapsed_time=0):
    total = len(matches)
    if mask is not None:
        inliers = np.sum(mask)
        print(f"Total matches: {total}, Inliers: {inliers} ({100*inliers/total:.1f}%)")
    else:
        print(f"Total matches: {total}")
    print(f"Tiempo: {elapsed_time:.3f} s")
    return total

# ----------------------------------------------------------------------
# MAIN
# ----------------------------------------------------------------------
def main():
    print("=== TALLER: COINCIDENCIA DE PATRONES Y HOMOGRAFÍAS ===\n")
    
    # Cargar imágenes reales
    img_box = cv2.imread('box.png')
    img_scene = cv2.imread('box_in_scene.png')
    
    if img_box is None or img_scene is None:
        print("ERROR: No se encontraron 'box.png' o 'box_in_scene.png'.")
        return
    
    # Imágenes para panorama (sintéticas con textura)
    h, w = 400, 600
    img1 = create_textured_image(w, h, (100, 50, 150), 0)
    img2 = create_textured_image(w, h, (150, 100, 50), 100)
    img3 = create_textured_image(w, h, (50, 150, 100), 200)
    print("Generadas imágenes sintéticas texturizadas para panorama.\n")
    
    # 1. BFMatcher
    print("--- 1. BFMatcher ---")
    kp1, kp2, matches_bf, t_bf = bf_matching(img_box, img_scene, detector='sift', ratio_test=False)
    draw_matches(img_box, kp1, img_scene, kp2, matches_bf, title="BFMatcher - todos los matches")
    
    _, _, matches_bf_ratio, t_bf_ratio = bf_matching(img_box, img_scene, detector='sift', ratio_test=True)
    draw_matches(img_box, kp1, img_scene, kp2, matches_bf_ratio, title="BFMatcher + Lowe's ratio test")
    evaluate_matching(matches_bf_ratio, elapsed_time=t_bf_ratio)
    
    # 2. FLANN
    print("\n--- 2. FLANN ---")
    kp1f, kp2f, matches_flann, t_flann = flann_matching(img_box, img_scene, detector='sift', ratio_test=True)
    draw_matches(img_box, kp1f, img_scene, kp2f, matches_flann, title="FLANN + ratio test")
    evaluate_matching(matches_flann, elapsed_time=t_flann)
    
    # 3. Homografía
    print("\n--- 3. Homografía con RANSAC ---")
    H, mask, _, _ = compute_homography(kp1f, kp2f, matches_flann)
    if H is not None:
        visualize_inliers(img_box, kp1f, img_scene, kp2f, matches_flann, mask,
                          title="Inliers (verde) / Outliers (rojo)")
        print("Matriz H:\n", H)
    
    # 4. Detección de objeto
    print("\n--- 4. Detección de objeto ---")
    detected, _ = detect_object(img_box, img_scene)
    plt.figure(figsize=(10, 6))
    plt.imshow(cv2.cvtColor(detected, cv2.COLOR_BGR2RGB))
    plt.title("Objeto detectado (bounding box)")
    plt.axis('off')
    plt.show()
    
    # 5. Panorama
    print("\n--- 5. Creación de panorama ---")
    panorama = stitch_images([img1, img2, img3], detector='sift', blend=True)
    if panorama is not None:
        plt.figure(figsize=(15, 6))
        plt.imshow(cv2.cvtColor(panorama, cv2.COLOR_BGR2RGB))
        plt.title("Panorama generado")
        plt.axis('off')
        plt.show()
    else:
        print("No se pudo generar panorama.")
    
    # 6. Comparativa ORB
    print("\n--- 6. Comparativa ORB ---")
    _, _, _, t_bf_orb = bf_matching(img_box, img_scene, detector='orb', ratio_test=True)
    _, _, _, t_flann_orb = flann_matching(img_box, img_scene, detector='orb', ratio_test=True)
    print(f"Tiempos con ORB -> BF: {t_bf_orb:.4f}s, FLANN: {t_flann_orb:.4f}s")
    
    print("\n--- Fin del taller ---")

if __name__ == "__main__":
    main()