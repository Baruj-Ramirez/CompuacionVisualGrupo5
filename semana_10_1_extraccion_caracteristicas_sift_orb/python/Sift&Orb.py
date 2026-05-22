"""
╔══════════════════════════════════════════════════════════════════════════════╗
║         VISUAL COMPUTING WORKSHOP — Feature Detection & Description         ║
║         Harris · SIFT · ORB · AKAZE · BRISK · Performance Analysis          ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import cv2
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.gridspec as gridspec
import time
import os
import sys
from dataclasses import dataclass
from typing import Optional

# ─────────────────────────────────────────────────────────────────────────────
#  CONFIG
# ─────────────────────────────────────────────────────────────────────────────
IMAGE_PATH   = "test_image.png"   # change to your own image if desired
OUTPUT_DIR   = "workshop_output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

plt.rcParams.update({
    "figure.facecolor":  "#0d0d0d",
    "axes.facecolor":    "#1a1a1a",
    "axes.edgecolor":    "#333333",
    "axes.labelcolor":   "#cccccc",
    "xtick.color":       "#666666",
    "ytick.color":       "#666666",
    "text.color":        "#eeeeee",
    "font.family":       "monospace",
    "figure.dpi":        120,
})

PALETTE = {
    "harris": "#ff6b6b",
    "sift":   "#4ecdc4",
    "orb":    "#ffe66d",
    "akaze":  "#a29bfe",
    "brisk":  "#fd79a8",
    "bg":     "#0d0d0d",
    "panel":  "#1a1a1a",
    "accent": "#00cec9",
}

# ─────────────────────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────────────────────
def load_image(path: str):
    """Load image; fall back to a generated synthetic image."""
    img = cv2.imread(path)
    if img is None:
        print(f"[WARN] '{path}' not found — generating synthetic test image.")
        img = _generate_synthetic(800, 600)
        cv2.imwrite(path, img)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    rgb  = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    print(f"[OK] Image loaded: {img.shape[1]}×{img.shape[0]} px")
    return img, gray, rgb


def _generate_synthetic(w: int, h: int) -> np.ndarray:
    """Build a synthetic image rich in corners, edges and texture."""
    img = np.full((h, w, 3), 30, dtype=np.uint8)
    shapes = [
        ((50,  50,  300, 200), (180, 120, 60)),
        ((350, 60,  550, 220), (60, 140, 180)),
        ((600, 40,  750, 180), (140, 60, 160)),
        ((60,  260, 280, 400), (80, 200, 80)),
        ((320, 240, 520, 420), (80, 80, 200)),
    ]
    for (x1, y1, x2, y2), c in shapes:
        cv2.rectangle(img, (x1, y1), (x2, y2), c, -1)
    for pts, c in [
        ([(80, 480), (200, 300), (320, 480)], (160, 160, 60)),
        ([(360, 500), (500, 310), (640, 500)], (60, 160, 160)),
    ]:
        cv2.fillPoly(img, [np.array(pts, np.int32)], c)
    for center, r, c in [
        ((150, 530), 50, (200, 200, 60)),
        ((450, 530), 55, (200, 60, 200)),
        ((700, 530), 45, (200, 150, 60)),
    ]:
        cv2.circle(img, center, r, c, -1)
    img = cv2.add(img, np.random.randint(0, 15, img.shape, dtype=np.uint8))
    return cv2.GaussianBlur(img, (3, 3), 0.5)


def save_fig(name: str):
    path = os.path.join(OUTPUT_DIR, name)
    plt.savefig(path, bbox_inches="tight", facecolor=plt.gcf().get_facecolor())
    print(f"  [saved] {path}")


def hex_to_bgr(h: str):
    h = h.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return (b, g, r)


def timed(fn, *args, **kwargs):
    t0 = time.perf_counter()
    result = fn(*args, **kwargs)
    return result, (time.perf_counter() - t0) * 1000   # ms


# ─────────────────────────────────────────────────────────────────────────────
#  STEP 1 — HARRIS CORNER DETECTION
# ─────────────────────────────────────────────────────────────────────────────
def step1_harris(gray: np.ndarray, rgb: np.ndarray):
    print("\n═══ STEP 1: Harris Corner Detector ═══")

    configs = [
        dict(blockSize=2, ksize=3, k=0.04, label="blockSize=2, ksize=3, k=0.04"),
        dict(blockSize=4, ksize=5, k=0.04, label="blockSize=4, ksize=5, k=0.04"),
        dict(blockSize=2, ksize=3, k=0.06, label="blockSize=2, ksize=3, k=0.06"),
        dict(blockSize=6, ksize=7, k=0.04, label="blockSize=6, ksize=7, k=0.04"),
    ]

    fig, axes = plt.subplots(2, 2, figsize=(14, 9))
    fig.suptitle("STEP 1 — Harris Corner Detection\nParameter Sensitivity",
                 fontsize=14, fontweight="bold", color=PALETTE["harris"], y=1.01)

    for ax, cfg in zip(axes.flat, configs):
        dst, ms = timed(
            cv2.cornerHarris,
            gray.astype(np.float32),
            cfg["blockSize"], cfg["ksize"], cfg["k"]
        )
        dst_norm = cv2.normalize(dst, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        threshold = 0.15 * dst.max()
        corners   = np.argwhere(dst > threshold)
        n_corners = len(corners)

        # Overlay on image
        vis = rgb.copy()
        for y, x in corners:
            cv2.circle(vis, (x, y), 4, hex_to_bgr(PALETTE["harris"]), 1)
            cv2.circle(vis, (x, y), 1, (255, 255, 255), -1)

        ax.imshow(vis)
        ax.set_title(f"{cfg['label']}\n{n_corners} corners  |  {ms:.1f} ms",
                     fontsize=8, color=PALETTE["harris"], pad=6)
        ax.axis("off")

    plt.tight_layout()
    save_fig("01_harris_parameter_sweep.png")
    plt.show()

    # Best config — detailed heatmap view
    dst = cv2.cornerHarris(gray.astype(np.float32), 2, 3, 0.04)
    dst_norm = cv2.normalize(dst, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    threshold = 0.15 * dst.max()
    corners   = np.argwhere(dst > threshold)

    fig, axes = plt.subplots(1, 3, figsize=(16, 5))
    fig.suptitle("Harris — Original · Corner Heatmap · Detected Corners",
                 fontsize=13, color=PALETTE["harris"])

    axes[0].imshow(rgb); axes[0].set_title("Original Image", color="#cccccc")
    axes[1].imshow(dst_norm, cmap="hot"); axes[1].set_title("Harris Response Map", color="#cccccc")
    vis2 = rgb.copy()
    for y, x in corners:
        cv2.circle(vis2, (x, y), 4, hex_to_bgr(PALETTE["harris"]), 1)
        cv2.circle(vis2, (x, y), 1, (255, 255, 255), -1)
    axes[2].imshow(vis2)
    axes[2].set_title(f"Detected Corners ({len(corners)})", color="#cccccc")
    for ax in axes: ax.axis("off")

    plt.tight_layout()
    save_fig("01_harris_heatmap.png")
    plt.show()

    print(f"  Harris detected {len(corners)} corners (blockSize=2, ksize=3, k=0.04)")
    return corners


# ─────────────────────────────────────────────────────────────────────────────
#  STEP 2 — SIFT
# ─────────────────────────────────────────────────────────────────────────────
def step2_sift(gray: np.ndarray, rgb: np.ndarray):
    print("\n═══ STEP 2: SIFT ═══")

    sift = cv2.SIFT_create()
    (kp, des), ms = timed(sift.detectAndCompute, gray, None)

    print(f"  SIFT: {len(kp)} keypoints  |  {ms:.1f} ms")
    if des is not None:
        print(f"  Descriptor shape: {des.shape}  (each = 128-D float32)")

    # Analyse properties
    scales  = [k.size  for k in kp]
    angles  = [k.angle for k in kp]
    resps   = [k.response for k in kp]
    octaves = [k.octave & 0xFF for k in kp]   # unpack octave byte

    fig = plt.figure(figsize=(16, 10))
    gs  = gridspec.GridSpec(2, 3, figure=fig, hspace=0.45, wspace=0.35)
    fig.suptitle("STEP 2 — SIFT: Scale-Invariant Feature Transform",
                 fontsize=14, fontweight="bold", color=PALETTE["sift"])

    # Full keypoint visualisation (rich)
    ax0 = fig.add_subplot(gs[0, :2])
    vis_rich = cv2.drawKeypoints(
        cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), kp, None,
        color=hex_to_bgr(PALETTE["sift"]),
        flags=cv2.DRAW_MATCHES_FLAGS_DRAW_RICH_KEYPOINTS
    )
    ax0.imshow(cv2.cvtColor(vis_rich, cv2.COLOR_BGR2RGB))
    ax0.set_title(f"SIFT Rich Keypoints  ({len(kp)} detected)",
                  color=PALETTE["sift"], fontsize=11)
    ax0.axis("off")

    # Scale histogram
    ax1 = fig.add_subplot(gs[0, 2])
    ax1.hist(scales, bins=30, color=PALETTE["sift"], alpha=0.85, edgecolor="#0d0d0d")
    ax1.set_title("Scale Distribution", color="#cccccc", fontsize=9)
    ax1.set_xlabel("Scale (σ)")

    # Orientation rose
    ax2 = fig.add_subplot(gs[1, 0], polar=True)
    rad  = np.deg2rad(angles)
    n, _ = np.histogram(rad, bins=36, range=(0, 2*np.pi))
    theta = np.linspace(0, 2*np.pi, 36, endpoint=False)
    ax2.bar(theta, n, width=2*np.pi/36, color=PALETTE["sift"], alpha=0.85)
    ax2.set_title("Orientation\nDistribution", color="#cccccc", fontsize=9, pad=12)

    # Response scatter
    ax3 = fig.add_subplot(gs[1, 1])
    sc = ax3.scatter(scales, resps, c=octaves, cmap="plasma",
                     s=8, alpha=0.6, linewidths=0)
    plt.colorbar(sc, ax=ax3, label="Octave")
    ax3.set_title("Scale vs Response\n(color = octave)", color="#cccccc", fontsize=9)
    ax3.set_xlabel("Scale"); ax3.set_ylabel("Response")

    # Octave bar
    ax4 = fig.add_subplot(gs[1, 2])
    oct_vals, oct_counts = np.unique(octaves, return_counts=True)
    bars = ax4.bar(oct_vals, oct_counts, color=PALETTE["sift"], alpha=0.85,
                   edgecolor="#0d0d0d")
    ax4.set_title("Keypoints per Octave", color="#cccccc", fontsize=9)
    ax4.set_xlabel("Octave")
    for b, c in zip(bars, oct_counts):
        ax4.text(b.get_x()+b.get_width()/2, b.get_height()+1, str(c),
                 ha="center", va="bottom", fontsize=7, color="#cccccc")

    save_fig("02_sift_analysis.png")
    plt.show()
    return kp, des, ms


# ─────────────────────────────────────────────────────────────────────────────
#  STEP 3 — ORB
# ─────────────────────────────────────────────────────────────────────────────
def step3_orb(gray: np.ndarray, rgb: np.ndarray):
    print("\n═══ STEP 3: ORB ═══")

    orb = cv2.ORB_create(nfeatures=1500)
    (kp, des), ms = timed(orb.detectAndCompute, gray, None)

    print(f"  ORB:  {len(kp)} keypoints  |  {ms:.1f} ms")
    if des is not None:
        print(f"  Descriptor shape: {des.shape}  (each = 32-D uint8 binary)")

    angles = [k.angle    for k in kp]
    scales = [k.size     for k in kp]
    resps  = [k.response for k in kp]
    levels = [k.octave   for k in kp]

    fig, axes = plt.subplots(1, 3, figsize=(16, 5))
    fig.suptitle("STEP 3 — ORB: Oriented FAST + Rotated BRIEF",
                 fontsize=14, fontweight="bold", color=PALETTE["orb"])

    # Rich keypoints
    vis_rich = cv2.drawKeypoints(
        cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), kp, None,
        color=hex_to_bgr(PALETTE["orb"]),
        flags=cv2.DRAW_MATCHES_FLAGS_DRAW_RICH_KEYPOINTS
    )
    axes[0].imshow(cv2.cvtColor(vis_rich, cv2.COLOR_BGR2RGB))
    axes[0].set_title(f"ORB Rich Keypoints ({len(kp)})", color=PALETTE["orb"])
    axes[0].axis("off")

    # Scale hist
    axes[1].hist(scales, bins=25, color=PALETTE["orb"], alpha=0.85, edgecolor="#0d0d0d")
    axes[1].set_title("Scale Distribution", color="#cccccc")

    # Orientation rose
    ax_r = fig.add_subplot(1, 3, 3, polar=True)
    fig.delaxes(axes[2])
    rad = np.deg2rad([a for a in angles if a >= 0])
    if len(rad):
        n, _ = np.histogram(rad, bins=36, range=(0, 2*np.pi))
        theta = np.linspace(0, 2*np.pi, 36, endpoint=False)
        ax_r.bar(theta, n, width=2*np.pi/36, color=PALETTE["orb"], alpha=0.85)
    ax_r.set_title("Orientation\nDistribution", color="#cccccc", fontsize=9, pad=12)

    plt.tight_layout()
    save_fig("03_orb_analysis.png")
    plt.show()
    return kp, des, ms


# ─────────────────────────────────────────────────────────────────────────────
#  STEP 4 — PERFORMANCE COMPARISON
# ─────────────────────────────────────────────────────────────────────────────
@dataclass
class DetectorResult:
    name:  str
    kp:    list
    des:   Optional[np.ndarray]
    ms:    float
    color: str


def step4_performance(gray: np.ndarray, rgb: np.ndarray):
    print("\n═══ STEP 4: Performance Comparison ═══")

    detectors = [
        ("SIFT",  cv2.SIFT_create(),         PALETTE["sift"]),
        ("ORB",   cv2.ORB_create(1500),       PALETTE["orb"]),
        ("AKAZE", cv2.AKAZE_create(),         PALETTE["akaze"]),
        ("BRISK", cv2.BRISK_create(),         PALETTE["brisk"]),
    ]

    results = []
    for name, det, color in detectors:
        (kp, des), ms = timed(det.detectAndCompute, gray, None)
        results.append(DetectorResult(name, kp, des, ms, color))
        print(f"  {name:6s}: {len(kp):5d} kp  |  {ms:7.2f} ms"
              + (f"  desc={des.shape}" if des is not None else "  no desc"))

    # ── Robustness tests ──────────────────────────────────────────────────────
    def transform_and_detect(det, gray_src, transform):
        img_t = transform(gray_src)
        kp_t, _ = det.detectAndCompute(img_t, None)
        return len(kp_t)

    def rotate90(img): return cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
    def scale05(img):  return cv2.resize(img, None, fx=0.5, fy=0.5)
    def bright(img):   return np.clip(img.astype(int) + 60, 0, 255).astype(np.uint8)
    def dark(img):     return np.clip(img.astype(int) - 60, 0, 255).astype(np.uint8)

    transforms = [
        ("Original",    lambda x: x),
        ("Rot 90°",     rotate90),
        ("Scale ×0.5",  scale05),
        ("Bright +60",  bright),
        ("Dark  -60",   dark),
    ]

    print("\n  Robustness (keypoint counts under transform):")
    rob_table = {}
    for name, det, _ in detectors:
        rob_table[name] = []
        for t_name, t_fn in transforms:
            n = transform_and_detect(det, gray, t_fn)
            rob_table[name].append(n)
        print(f"  {name:6s}: " + "  ".join(f"{n:5d}" for n in rob_table[name]))

    # ── Figure ────────────────────────────────────────────────────────────────
    fig = plt.figure(figsize=(18, 12))
    gs  = gridspec.GridSpec(3, 4, figure=fig, hspace=0.55, wspace=0.4)
    fig.suptitle("STEP 4 — Performance & Robustness Comparison",
                 fontsize=14, fontweight="bold", color=PALETTE["accent"])

    names  = [r.name  for r in results]
    times  = [r.ms    for r in results]
    counts = [len(r.kp) for r in results]
    colors = [r.color for r in results]

    # Keypoint count bar
    ax_n = fig.add_subplot(gs[0, :2])
    bars = ax_n.bar(names, counts, color=colors, edgecolor="#0d0d0d", width=0.55)
    ax_n.set_title("Keypoints Detected", color="#cccccc")
    for b, c in zip(bars, counts):
        ax_n.text(b.get_x()+b.get_width()/2, b.get_height()+5, str(c),
                  ha="center", va="bottom", fontsize=10, color="#eeeeee")

    # Timing bar
    ax_t = fig.add_subplot(gs[0, 2:])
    bars2 = ax_t.bar(names, times, color=colors, edgecolor="#0d0d0d", width=0.55)
    ax_t.set_title("Detection Time (ms)", color="#cccccc")
    for b, t in zip(bars2, times):
        ax_t.text(b.get_x()+b.get_width()/2, b.get_height()+0.3, f"{t:.1f}",
                  ha="center", va="bottom", fontsize=10, color="#eeeeee")

    # Robustness grouped bar
    ax_rob = fig.add_subplot(gs[1, :])
    x      = np.arange(len(transforms))
    width  = 0.2
    t_labels = [t[0] for t in transforms]
    for i, (r, col) in enumerate(zip(results, colors)):
        offset = (i - len(results)/2 + 0.5) * width
        bars_r = ax_rob.bar(x + offset, rob_table[r.name], width,
                            label=r.name, color=col, alpha=0.85, edgecolor="#0d0d0d")
    ax_rob.set_xticks(x); ax_rob.set_xticklabels(t_labels)
    ax_rob.set_title("Robustness — Keypoints Under Transform", color="#cccccc")
    ax_rob.legend(framealpha=0.2, labelcolor="linecolor")

    # Descriptor memory
    ax_mem = fig.add_subplot(gs[2, :2])
    mem = []
    for r in results:
        if r.des is not None:
            mem.append(r.des.nbytes / 1024)
        else:
            mem.append(0)
    ax_mem.bar(names, mem, color=colors, edgecolor="#0d0d0d", width=0.55)
    ax_mem.set_title("Descriptor Memory (KB)", color="#cccccc")
    for i, (n, m) in enumerate(zip(names, mem)):
        ax_mem.text(i, m+0.5, f"{m:.1f}", ha="center", fontsize=9, color="#eeeeee")

    # Efficiency scatter  (kp / ms)
    ax_eff = fig.add_subplot(gs[2, 2:])
    eff    = [c/t for c, t in zip(counts, times)]
    sc = ax_eff.scatter(times, counts, s=[e*0.5 for e in eff],
                        c=colors, alpha=0.9, edgecolors="white", linewidths=0.8)
    for r, e in zip(results, eff):
        ax_eff.annotate(f"{r.name}\n{e:.0f} kp/ms",
                        (r.ms, len(r.kp)), textcoords="offset points",
                        xytext=(8, 4), fontsize=8, color=r.color)
    ax_eff.set_xlabel("Time (ms)"); ax_eff.set_ylabel("Keypoints")
    ax_eff.set_title("Efficiency (bubble size = kp/ms)", color="#cccccc")

    save_fig("04_performance_comparison.png")
    plt.show()

    # ── Summary table in terminal ─────────────────────────────────────────────
    print("\n" + "─"*70)
    print(f"  {'Detector':<8} {'Keypoints':>10} {'Time (ms)':>10} {'Desc Size':>12} {'kp/ms':>8}")
    print("─"*70)
    for r in results:
        desc_str = (f"{r.des.shape[1]}-D {r.des.dtype}" if r.des is not None else "—")
        eff_val  = len(r.kp) / r.ms
        print(f"  {r.name:<8} {len(r.kp):>10} {r.ms:>10.2f} {desc_str:>12} {eff_val:>8.1f}")
    print("─"*70)

    return results


# ─────────────────────────────────────────────────────────────────────────────
#  STEP 5 — ADVANCED VISUALISATION
# ─────────────────────────────────────────────────────────────────────────────
def step5_visualisation(gray: np.ndarray, rgb: np.ndarray, results: list):
    print("\n═══ STEP 5: Advanced Visualisation ═══")

    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

    # ── SIFT vs ORB side-by-side (all flag variants) ──────────────────────────
    sift_r = next(r for r in results if r.name == "SIFT")
    orb_r  = next(r for r in results if r.name == "ORB")

    flags_map = {
        "DEFAULT":   cv2.DrawMatchesFlags_DEFAULT,
        "RICH_KP":   cv2.DRAW_MATCHES_FLAGS_DRAW_RICH_KEYPOINTS,
        "NOT_DRAW":  cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS,
    }

    fig, axes = plt.subplots(len(flags_map), 2, figsize=(16, 14))
    fig.suptitle("STEP 5 — SIFT vs ORB · All DrawKeypoints Flags",
                 fontsize=13, fontweight="bold", color=PALETTE["accent"])

    for row, (flag_name, flag) in enumerate(flags_map.items()):
        for col, (r, pal) in enumerate([(sift_r, PALETTE["sift"]),
                                         (orb_r,  PALETTE["orb"])]):
            vis = cv2.drawKeypoints(bgr, r.kp, None,
                                    color=hex_to_bgr(pal), flags=flag)
            axes[row, col].imshow(cv2.cvtColor(vis, cv2.COLOR_BGR2RGB))
            axes[row, col].set_title(
                f"{r.name}  [{flag_name}]  ({len(r.kp)} kp)",
                color=pal, fontsize=9
            )
            axes[row, col].axis("off")

    plt.tight_layout()
    save_fig("05a_sift_vs_orb_flags.png")
    plt.show()

    # ── All four detectors on a grid ──────────────────────────────────────────
    fig, axes = plt.subplots(2, 2, figsize=(16, 11))
    fig.suptitle("All Detectors — Rich Keypoint Overlay",
                 fontsize=13, fontweight="bold", color=PALETTE["accent"])

    for ax, r in zip(axes.flat, results):
        vis = cv2.drawKeypoints(bgr, r.kp, None,
                                color=hex_to_bgr(r.color),
                                flags=cv2.DRAW_MATCHES_FLAGS_DRAW_RICH_KEYPOINTS)
        ax.imshow(cv2.cvtColor(vis, cv2.COLOR_BGR2RGB))
        ax.set_title(f"{r.name}  ·  {len(r.kp)} keypoints  ·  {r.ms:.1f} ms",
                     color=r.color, fontsize=10)
        ax.axis("off")

    plt.tight_layout()
    save_fig("05b_all_detectors_rich.png")
    plt.show()

    # ── Spatial density heatmaps ──────────────────────────────────────────────
    h, w = gray.shape
    fig, axes = plt.subplots(2, 2, figsize=(16, 10))
    fig.suptitle("Spatial Keypoint Density",
                 fontsize=13, fontweight="bold", color=PALETTE["accent"])

    cmaps = ["Reds", "Greens", "Purples", "RdPu"]
    for ax, r, cmap in zip(axes.flat, results, cmaps):
        heatmap = np.zeros((h, w), dtype=np.float32)
        for kp in r.kp:
            x, y = int(kp.pt[0]), int(kp.pt[1])
            if 0 <= x < w and 0 <= y < h:
                cv2.circle(heatmap, (x, y), max(2, int(kp.size//2)), 1.0, -1)
        heatmap = cv2.GaussianBlur(heatmap, (31, 31), 0)

        ax.imshow(rgb, alpha=0.35)
        ax.imshow(heatmap, cmap=cmap, alpha=0.7)
        ax.set_title(f"{r.name} density", color=r.color, fontsize=10)
        ax.axis("off")

    plt.tight_layout()
    save_fig("05c_density_heatmaps.png")
    plt.show()

    print("  Step 5 complete — 3 figures saved.")


# ─────────────────────────────────────────────────────────────────────────────
#  BONUS — INTERACTIVE PARAMETER TUNING (matplotlib widgets, no tkinter needed)
# ─────────────────────────────────────────────────────────────────────────────
def bonus_interactive(gray: np.ndarray, rgb: np.ndarray):
    print("\n═══ BONUS: Interactive Parameter Tuner (matplotlib) ═══")
    print("  Adjust sliders and press 'r' to refresh, 'q' to quit.\n")

    from matplotlib.widgets import Slider, RadioButtons, Button

    state = dict(algo="SIFT", n_feat=1000, hk=0.04, hbs=2)

    fig = plt.figure(figsize=(16, 9), facecolor="#0d0d0d")
    fig.suptitle("BONUS — Interactive Detector Tuner",
                 fontsize=13, color=PALETTE["accent"], fontweight="bold")

    ax_img  = fig.add_axes([0.02, 0.25, 0.65, 0.70])
    ax_hist = fig.add_axes([0.70, 0.55, 0.28, 0.38])
    ax_img.axis("off"); ax_hist.set_facecolor("#1a1a1a")

    ax_algo = fig.add_axes([0.70, 0.25, 0.12, 0.25], facecolor="#1a1a1a")
    ax_nfeat= fig.add_axes([0.02, 0.12, 0.60, 0.04], facecolor="#1a1a1a")
    ax_hk   = fig.add_axes([0.02, 0.06, 0.60, 0.04], facecolor="#1a1a1a")
    ax_btn  = fig.add_axes([0.70, 0.10, 0.10, 0.06])

    slider_nfeat = Slider(ax_nfeat, "n_features",  200, 3000, valinit=1000, valstep=100,
                          color=PALETTE["sift"])
    slider_hk    = Slider(ax_hk,    "Harris k",  0.01, 0.10, valinit=0.04,
                          color=PALETTE["harris"])
    radio        = RadioButtons(ax_algo, ["SIFT","ORB","AKAZE","BRISK"],
                                activecolor=PALETTE["sift"])
    btn          = Button(ax_btn, "Refresh ↺", color="#1a1a1a", hovercolor="#333")

    img_plot  = [None]
    hist_plot = [None]

    def run_detector(_=None):
        algo   = radio.value_selected
        n      = int(slider_nfeat.val)
        hk_val = slider_hk.val

        if algo == "SIFT":
            det   = cv2.SIFT_create(nfeatures=n)
            color = hex_to_bgr(PALETTE["sift"])
        elif algo == "ORB":
            det   = cv2.ORB_create(nfeatures=n)
            color = hex_to_bgr(PALETTE["orb"])
        elif algo == "AKAZE":
            det   = cv2.AKAZE_create()
            color = hex_to_bgr(PALETTE["akaze"])
        else:
            det   = cv2.BRISK_create()
            color = hex_to_bgr(PALETTE["brisk"])

        t0 = time.perf_counter()
        kp, des = det.detectAndCompute(gray, None)
        ms = (time.perf_counter() - t0) * 1000

        bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        vis = cv2.drawKeypoints(bgr, kp, None, color=color,
                                flags=cv2.DRAW_MATCHES_FLAGS_DRAW_RICH_KEYPOINTS)
        vis_rgb = cv2.cvtColor(vis, cv2.COLOR_BGR2RGB)

        ax_img.clear(); ax_img.axis("off")
        ax_img.imshow(vis_rgb)
        ax_img.set_title(
            f"{algo}  ·  {len(kp)} keypoints  ·  {ms:.1f} ms",
            color=PALETTE.get(algo.lower(), "#ffffff"), fontsize=11, pad=6
        )

        ax_hist.clear()
        ax_hist.set_facecolor("#1a1a1a")
        scales = [k.size for k in kp]
        ax_hist.hist(scales, bins=25,
                     color=PALETTE.get(algo.lower(), "#ffffff"),
                     alpha=0.85, edgecolor="#0d0d0d")
        ax_hist.set_title("Scale Distribution", color="#cccccc", fontsize=9)
        ax_hist.tick_params(colors="#666666")

        fig.canvas.draw_idle()

    btn.on_clicked(run_detector)
    run_detector()

    print("  [Interactive window open — close it to continue.]")
    plt.show()


# ─────────────────────────────────────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────────────────────────────────────
def main():
    print("╔══════════════════════════════════════════════════════╗")
    print("║   Visual Computing Workshop — Feature Detection     ║")
    print("╚══════════════════════════════════════════════════════╝\n")

    # Load image
    img, gray, rgb = load_image(IMAGE_PATH)

    # Run all steps
    harris_corners          = step1_harris(gray, rgb)
    sift_kp, sift_des, _    = step2_sift(gray, rgb)
    orb_kp,  orb_des,  _    = step3_orb(gray, rgb)
    results                 = step4_performance(gray, rgb)
    step5_visualisation(gray, rgb, results)

    # Bonus interactive tuner (comment out if running headless)
    try:
        bonus_interactive(gray, rgb)
    except Exception as e:
        print(f"  [Bonus GUI skipped: {e}]")

    print(f"\n[DONE] All outputs saved to: ./{OUTPUT_DIR}/")
    print("  01_harris_parameter_sweep.png")
    print("  01_harris_heatmap.png")
    print("  02_sift_analysis.png")
    print("  03_orb_analysis.png")
    print("  04_performance_comparison.png")
    print("  05a_sift_vs_orb_flags.png")
    print("  05b_all_detectors_rich.png")
    print("  05c_density_heatmaps.png")


if __name__ == "__main__":
    main()