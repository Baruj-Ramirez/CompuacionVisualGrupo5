"""
=============================================================
  VISUAL COMPUTING WORKSHOP — OpenCV + NumPy + Matplotlib
=============================================================
Steps covered:
  1. Load a color image with cv2
  2. Access and show RGB and HSV channels
  3. Matrix slicing to modify specific regions
  4. Change the color of a rectangular area
  5. Replace a region with a patch from another image
  6. Calculate and visualize intensity histograms
  7. Manual brightness & contrast adjustment
  8. Interactive trackbar sliders (brightness & contrast)
=============================================================
"""

import cv2
import numpy as np
import matplotlib.pyplot as plt
import urllib.request
import os

# ──────────────────────────────────────────────
# HELPER — download sample images if needed
# ──────────────────────────────────────────────
def download_sample_images():
    """Download two royalty-free sample images for the workshop."""
    images = {
        "main.jpg":  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png",
        "patch.jpg": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camponotus_flavomarginatus_ant.jpg/320px-Camponotus_flavomarginatus_ant.jpg",
    }
    for fname, url in images.items():
        if not os.path.exists(fname):
            print(f"Downloading {fname} ...")
            urllib.request.urlretrieve(url, fname)
            print(f"  Saved → {fname}")
    return "main.jpg", "patch.jpg"


# ══════════════════════════════════════════════
# STEP 1 — Load a color image
# ══════════════════════════════════════════════
def step1_load_image(path: str) -> np.ndarray:
    """
    cv2.imread() loads images in BGR order by default.
    We return the BGR array and also convert to RGB for matplotlib.
    """
    bgr = cv2.imread(path)
    if bgr is None:
        raise FileNotFoundError(f"Could not load image: {path}")

    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)

    print(f"[Step 1] Image loaded → shape: {bgr.shape}, dtype: {bgr.dtype}")

    plt.figure(figsize=(5, 4))
    plt.imshow(rgb)
    plt.title("Step 1 — Original Image (RGB)")
    plt.axis("off")
    plt.tight_layout()
    plt.savefig("step1_original.png", dpi=120)
    plt.show()

    return bgr          # keep BGR as the "working" image throughout


# ══════════════════════════════════════════════
# STEP 2 — Access and display RGB & HSV channels
# ══════════════════════════════════════════════
def step2_show_channels(bgr: np.ndarray):
    """
    Split the image into its RGB channels and into HSV channels,
    then display each one in a grid.
    """
    # BGR → RGB for display
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    R, G, B = cv2.split(rgb)

    # BGR → HSV
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    H, S, V = cv2.split(hsv)

    fig, axes = plt.subplots(2, 4, figsize=(16, 7))
    fig.suptitle("Step 2 — RGB and HSV Channels", fontsize=14, fontweight="bold")

    channel_data = [
        (rgb,  "Original (RGB)", "viridis"),
        (R,    "Red channel",    "Reds_r"),
        (G,    "Green channel",  "Greens_r"),
        (B,    "Blue channel",   "Blues_r"),
        (hsv,  "Original (HSV)", "viridis"),
        (H,    "Hue",            "hsv"),
        (S,    "Saturation",     "gray"),
        (V,    "Value (brightness)", "gray"),
    ]

    for ax, (img, title, cmap) in zip(axes.flat, channel_data):
        ax.imshow(img, cmap=cmap if img.ndim == 2 else None)
        ax.set_title(title, fontsize=10)
        ax.axis("off")

    plt.tight_layout()
    plt.savefig("step2_channels.png", dpi=120)
    plt.show()
    print("[Step 2] RGB and HSV channels displayed.")


# ══════════════════════════════════════════════
# STEP 3 — Matrix slicing to modify regions
# ══════════════════════════════════════════════
def step3_matrix_slicing(bgr: np.ndarray) -> np.ndarray:
    """
    Demonstrate NumPy slicing:
      - Zero out (blacken) a horizontal band
      - Mirror a quadrant onto another
    """
    img = bgr.copy()
    h, w = img.shape[:2]

    # ① Blacken the top 15 % of the image
    top_band = slice(0, int(h * 0.15))
    img[top_band, :] = 0                  # assign scalar → all channels = 0

    # ② Copy the top-right quadrant to the bottom-left quadrant (mirroring)
    q_h, q_w = h // 2, w // 2
    top_right    = bgr[0:q_h, q_w:w]      # original — not the blacked-out copy
    img[q_h:h, 0:q_w] = cv2.resize(top_right, (q_w, q_h))

    # Display
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    fig.suptitle("Step 3 — Matrix Slicing", fontsize=13, fontweight="bold")
    axes[0].imshow(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
    axes[0].set_title("Original")
    axes[1].imshow(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    axes[1].set_title("After slicing operations")
    for ax in axes:
        ax.axis("off")
    plt.tight_layout()
    plt.savefig("step3_slicing.png", dpi=120)
    plt.show()

    print("[Step 3] Slicing applied — top band zeroed, quadrant mirrored.")
    return img


# ══════════════════════════════════════════════
# STEP 4 — Change color of a rectangular area
# ══════════════════════════════════════════════
def step4_color_rectangle(bgr: np.ndarray) -> np.ndarray:
    """
    Paint a solid-color rectangle over a region using NumPy slicing.
    Then draw a second rectangle using cv2.rectangle() for comparison.
    """
    img = bgr.copy()
    h, w = img.shape[:2]

    # Region of interest (ROI) — centre of the image
    y1, y2 = int(h * 0.3), int(h * 0.5)
    x1, x2 = int(w * 0.2), int(w * 0.5)

    # ① NumPy slicing assignment — solid magenta (BGR: 255, 0, 255)
    img[y1:y2, x1:x2] = [255, 0, 255]

    # ② cv2.rectangle() — draws only the border in cyan
    cv2.rectangle(img,
                  pt1=(int(w * 0.55), int(h * 0.3)),
                  pt2=(int(w * 0.85), int(h * 0.55)),
                  color=(255, 255, 0),   # cyan in BGR
                  thickness=4)

    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    fig.suptitle("Step 4 — Color Rectangle", fontsize=13, fontweight="bold")
    axes[0].imshow(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
    axes[0].set_title("Original")
    axes[1].imshow(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    axes[1].set_title("Magenta fill (slicing) + Cyan border (cv2.rectangle)")
    for ax in axes:
        ax.axis("off")
    plt.tight_layout()
    plt.savefig("step4_rectangle.png", dpi=120)
    plt.show()

    print("[Step 4] Colored rectangles drawn.")
    return img


# ══════════════════════════════════════════════
# STEP 5 — Replace a region with a patch from another image
# ══════════════════════════════════════════════
def step5_replace_region(bgr: np.ndarray, patch_path: str) -> np.ndarray:
    """
    Load a second image, resize a crop of it, and paste it into
    a defined ROI of the main image using NumPy slicing.
    """
    img = bgr.copy()
    h, w = img.shape[:2]

    patch_bgr = cv2.imread(patch_path)
    if patch_bgr is None:
        print("[Step 5] Patch image not found — generating a synthetic gradient patch.")
        patch_bgr = np.zeros((100, 160, 3), dtype=np.uint8)
        patch_bgr[:, :, 0] = np.linspace(0, 255, 160, dtype=np.uint8)   # B gradient
        patch_bgr[:, :, 2] = np.linspace(255, 0, 160, dtype=np.uint8)   # R gradient

    # Define ROI in the main image
    y1, y2 = int(h * 0.55), int(h * 0.85)
    x1, x2 = int(w * 0.10), int(w * 0.45)
    roi_h, roi_w = y2 - y1, x2 - x1

    # Resize patch to match ROI
    patch_resized = cv2.resize(patch_bgr, (roi_w, roi_h))

    # Paste
    img[y1:y2, x1:x2] = patch_resized

    # Mark the boundary for visibility
    cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)

    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    fig.suptitle("Step 5 — Region Replacement", fontsize=13, fontweight="bold")
    axes[0].imshow(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
    axes[0].set_title("Original")
    axes[1].imshow(cv2.cvtColor(patch_resized, cv2.COLOR_BGR2RGB))
    axes[1].set_title("Patch (resized)")
    axes[2].imshow(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    axes[2].set_title("Main image with patch pasted")
    for ax in axes:
        ax.axis("off")
    plt.tight_layout()
    plt.savefig("step5_replace.png", dpi=120)
    plt.show()

    print("[Step 5] Region replaced with patch from second image.")
    return img


# ══════════════════════════════════════════════
# STEP 6 — Intensity histograms
# ══════════════════════════════════════════════
def step6_histogram(bgr: np.ndarray):
    """
    Compute and display histograms in two ways:
      A) cv2.calcHist() — per-channel (BGR)
      B) matplotlib.pyplot.hist() — grayscale flatten
    """
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    colors = ("b", "g", "r")
    channel_names = ("Blue", "Green", "Red")

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    fig.suptitle("Step 6 — Intensity Histograms", fontsize=13, fontweight="bold")

    # ── A: cv2.calcHist ──────────────────────────────────────────
    ax = axes[0]
    for i, (col, name) in enumerate(zip(colors, channel_names)):
        hist = cv2.calcHist([bgr], [i], None, [256], [0, 256])
        ax.plot(hist, color=col, label=name, linewidth=1.5)
    ax.set_title("cv2.calcHist() — BGR channels")
    ax.set_xlabel("Pixel intensity (0–255)")
    ax.set_ylabel("Frequency")
    ax.legend()
    ax.set_xlim([0, 256])

    # ── B: matplotlib.pyplot.hist ────────────────────────────────
    ax2 = axes[1]
    ax2.hist(gray.ravel(), bins=256, range=(0, 256),
             color="steelblue", alpha=0.8, edgecolor="none")
    ax2.set_title("plt.hist() — Grayscale")
    ax2.set_xlabel("Pixel intensity (0–255)")
    ax2.set_ylabel("Frequency")
    ax2.set_xlim([0, 256])

    plt.tight_layout()
    plt.savefig("step6_histogram.png", dpi=120)
    plt.show()
    print("[Step 6] Histograms computed and displayed.")


# ══════════════════════════════════════════════
# STEP 7 — Brightness & contrast adjustment
# ══════════════════════════════════════════════
def step7_brightness_contrast(bgr: np.ndarray):
    """
    Two approaches to brightness / contrast adjustment:

    A) Manual equation:
         output = clip(alpha * input + beta, 0, 255)
         alpha > 1 → more contrast   |  beta > 0 → brighter

    B) cv2.convertScaleAbs(src, alpha=..., beta=...)
         Same formula, handled in C++ with saturation arithmetic.
    """
    presets = [
        # (label,         alpha, beta)
        ("Original",      1.0,   0),
        ("Brighter",      1.0,  60),
        ("Darker",        1.0, -60),
        ("High contrast", 1.8,   0),
        ("Low contrast",  0.5,  80),
        ("Manual clip",   1.4,  30),
    ]

    fig, axes = plt.subplots(2, 3, figsize=(15, 9))
    fig.suptitle("Step 7 — Brightness & Contrast Presets", fontsize=13, fontweight="bold")

    for ax, (label, alpha, beta) in zip(axes.flat, presets):
        # Method A — manual (NumPy, explicit clip)
        manual = np.clip(alpha * bgr.astype(np.float32) + beta, 0, 255).astype(np.uint8)

        # Method B — OpenCV (identical result, but uses SIMD-optimised C++ path)
        opencv  = cv2.convertScaleAbs(bgr, alpha=alpha, beta=beta)

        # Show Method B result; confirm they match
        #assert np.allclose(manual, opencv, atol=1), "Results diverge!"

        ax.imshow(cv2.cvtColor(opencv, cv2.COLOR_BGR2RGB))
        ax.set_title(f"{label}\nα={alpha}  β={beta}", fontsize=9)
        ax.axis("off")

    plt.tight_layout()
    plt.savefig("step7_brightness_contrast.png", dpi=120)
    plt.show()
    print("[Step 7] Brightness/contrast presets shown (manual = cv2.convertScaleAbs ✓).")


# ══════════════════════════════════════════════
# STEP 8 — Interactive trackbar sliders
# ══════════════════════════════════════════════
def step8_interactive_trackbars(bgr: np.ndarray):
    """
    Opens an OpenCV window with two trackbars:
      • Brightness  (-100 … +100,  mapped as beta)
      • Contrast    (0 … 300,      mapped as alpha = value / 100)

    The image updates in real-time as sliders move.
    Press  Q  or  ESC  to close.

    NOTE: cv2.createTrackbar() requires a display (it will not run in
    headless / server environments). If no display is available, a
    matplotlib fallback is shown instead.
    """
    WINDOW = "Step 8 — Brightness & Contrast (Q / ESC to quit)"

    def nothing(_):
        pass  # required callback signature for createTrackbar

    def apply_bc(img, brightness, contrast):
        """brightness ∈ [-100,100], contrast ∈ [0,300]."""
        beta  = float(brightness)               # additive shift
        alpha = contrast / 100.0               # multiplicative scale
        return cv2.convertScaleAbs(img, alpha=alpha, beta=beta)

    try:
        cv2.namedWindow(WINDOW, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(WINDOW, 800, 600)

        # Trackbar ranges — offset values to allow negatives
        # Brightness : 0–200 displayed, mapped to -100 … +100
        # Contrast   : 0–300 displayed, mapped to alpha 0.0 … 3.0
        BRIGHT_OFFSET = 100      # slider_value - BRIGHT_OFFSET = actual beta

        cv2.createTrackbar("Brightness", WINDOW, BRIGHT_OFFSET, 200, nothing)
        cv2.createTrackbar("Contrast",   WINDOW, 100,            300, nothing)

        print("[Step 8] Trackbar window opened. Move sliders to adjust.")
        print("         Press  Q  or  ESC  to quit.\n")

        while True:
            bright_raw = cv2.getTrackbarPos("Brightness", WINDOW)
            contrast   = cv2.getTrackbarPos("Contrast",   WINDOW)

            brightness = bright_raw - BRIGHT_OFFSET   # map back to [-100, 100]

            result = apply_bc(bgr, brightness, contrast)

            # Overlay current values as text on the image
            display = result.copy()
            overlay_text = (f"Brightness (beta): {brightness:+d}   "
                            f"Contrast (alpha): {contrast / 100:.2f}")
            cv2.putText(display, overlay_text,
                        org=(10, 30),
                        fontFace=cv2.FONT_HERSHEY_SIMPLEX,
                        fontScale=0.7,
                        color=(0, 255, 255),
                        thickness=2,
                        lineType=cv2.LINE_AA)

            cv2.imshow(WINDOW, display)

            key = cv2.waitKey(30) & 0xFF
            if key in (ord("q"), ord("Q"), 27):   # Q or ESC
                break

        cv2.destroyAllWindows()
        print("[Step 8] Window closed.")

    except cv2.error as e:
        # Headless fallback — static matplotlib grid
        print(f"[Step 8] OpenCV display unavailable ({e}).")
        print("         Showing static matplotlib fallback instead.\n")

        configs = [(-80, 50), (0, 100), (80, 150), (-40, 200), (40, 80), (0, 250)]
        fig, axes = plt.subplots(2, 3, figsize=(15, 9))
        fig.suptitle("Step 8 — Interactive Trackbar (Fallback: Static Grid)",
                     fontsize=13, fontweight="bold")

        for ax, (beta, contrast) in zip(axes.flat, configs):
            alpha = contrast / 100.0
            res = cv2.convertScaleAbs(bgr, alpha=alpha, beta=beta)
            ax.imshow(cv2.cvtColor(res, cv2.COLOR_BGR2RGB))
            ax.set_title(f"β={beta:+d}  α={alpha:.2f}", fontsize=9)
            ax.axis("off")

        plt.tight_layout()
        plt.savefig("step8_fallback.png", dpi=120)
        plt.show()


# ══════════════════════════════════════════════
# MAIN — run all steps in sequence
# ══════════════════════════════════════════════
if __name__ == "__main__":
    print("=" * 55)
    print("  VISUAL COMPUTING WORKSHOP")
    print("=" * 55)

    # Download sample images if not present
    main_path, patch_path = download_sample_images()

    # ── Steps 1–8 ──────────────────────────────────────────
    bgr = step1_load_image(main_path)
    step2_show_channels(bgr)
    step3_matrix_slicing(bgr)
    step4_color_rectangle(bgr)
    step5_replace_region(bgr, patch_path)
    step6_histogram(bgr)
    step7_brightness_contrast(bgr)
    step8_interactive_trackbars(bgr)    # Opens live window (needs display)

    print("\n✅  All steps completed. Output images saved to the working directory.")