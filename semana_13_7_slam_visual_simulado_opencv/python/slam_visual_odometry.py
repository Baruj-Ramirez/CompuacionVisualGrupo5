"""
Visual SLAM Simulation - Trajectory Tracking with Virtual Camera
TUM RGB-D dataset (freiburg1_xyz) - Visual Odometry using ORB + Essential Matrix
"""

import cv2
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import os
import glob
from pathlib import Path

# ── Camera intrinsics for TUM freiburg1 ──────────────────────────────────────
FX, FY = 517.3, 516.5
CX, CY = 318.6, 255.3
K = np.array([[FX, 0, CX],
              [0, FY, CY],
              [0,  0,  1]], dtype=np.float64)

DATASET_DIR = Path(__file__).parent.parent / "dataset"
MEDIA_DIR   = Path(__file__).parent.parent / "media"
MEDIA_DIR.mkdir(exist_ok=True)

# ── Load ground truth ─────────────────────────────────────────────────────────
def load_groundtruth(path):
    gt = {}
    with open(path) as f:
        for line in f:
            if line.startswith("#"):
                continue
            parts = line.strip().split()
            if len(parts) < 8:
                continue
            ts = float(parts[0])
            tx, ty, tz = float(parts[1]), float(parts[2]), float(parts[3])
            gt[ts] = (tx, ty, tz)
    return gt

def nearest_gt(gt_dict, timestamp):
    keys = np.array(list(gt_dict.keys()))
    idx  = np.argmin(np.abs(keys - timestamp))
    return gt_dict[keys[idx]]

# ── Load image sequence ───────────────────────────────────────────────────────
def load_images():
    paths = sorted(glob.glob(str(DATASET_DIR / "rgb" / "*.png")))
    images = []
    timestamps = []
    for p in paths:
        img = cv2.imread(p)
        if img is not None:
            images.append(img)
            ts = float(Path(p).stem)
            timestamps.append(ts)
    print(f"Loaded {len(images)} images")
    return images, timestamps

# ── ORB feature detection and matching ───────────────────────────────────────
def detect_and_match(img1_gray, img2_gray, n_features=1000):
    orb = cv2.ORB_create(nfeatures=n_features)

    kp1, des1 = orb.detectAndCompute(img1_gray, None)
    kp2, des2 = orb.detectAndCompute(img2_gray, None)

    if des1 is None or des2 is None or len(kp1) < 8 or len(kp2) < 8:
        return [], [], [], []

    bf      = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = bf.match(des1, des2)
    matches = sorted(matches, key=lambda m: m.distance)

    # keep top matches within distance threshold
    good = [m for m in matches if m.distance < 60][:200]

    pts1 = np.float32([kp1[m.queryIdx].pt for m in good])
    pts2 = np.float32([kp2[m.trainIdx].pt for m in good])
    return good, kp1, kp2, pts1, pts2

# ── Pose estimation ───────────────────────────────────────────────────────────
def estimate_pose(pts1, pts2):
    if len(pts1) < 8:
        return None, None, None

    E, mask = cv2.findEssentialMat(
        pts1, pts2, K,
        method=cv2.RANSAC, prob=0.999, threshold=1.0
    )
    if E is None:
        return None, None, None

    _, R, t, mask_pose = cv2.recoverPose(E, pts1, pts2, K, mask=mask)
    return R, t, mask_pose

# ── Main pipeline ─────────────────────────────────────────────────────────────
def run_slam():
    images, timestamps = load_images()
    gt_dict = load_groundtruth(DATASET_DIR / "groundtruth.txt")

    # Estimated trajectory: accumulated from relative poses
    trajectory_est  = [(0.0, 0.0, 0.0)]
    trajectory_gt   = []

    # Align ground truth start to first image timestamp
    gt0 = nearest_gt(gt_dict, timestamps[0])
    trajectory_gt.append((0.0, 0.0, 0.0))

    R_total = np.eye(3)
    t_total = np.zeros((3, 1))

    match_frames   = []  # (img1_color, img2_color, matches, kp1, kp2) for GIF
    traj_snapshots = []  # trajectory snapshots for animation

    for i in range(1, len(images)):
        img1 = images[i - 1]
        img2 = images[i]
        g1   = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
        g2   = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

        good, kp1, kp2, pts1, pts2 = detect_and_match(g1, g2)

        if len(pts1) < 8:
            trajectory_est.append(trajectory_est[-1])
        else:
            R, t, mask = estimate_pose(pts1, pts2)
            if R is not None:
                R_total = R @ R_total
                t_total = t_total + R_total.T @ t
                x, y, z = t_total[0, 0], t_total[1, 0], t_total[2, 0]
                trajectory_est.append((x, y, z))
            else:
                trajectory_est.append(trajectory_est[-1])

        # Ground truth aligned to first frame
        gt_i  = nearest_gt(gt_dict, timestamps[i])
        dx_gt = gt_i[0] - gt0[0]
        dy_gt = gt_i[1] - gt0[1]
        dz_gt = gt_i[2] - gt0[2]
        trajectory_gt.append((dx_gt, dy_gt, dz_gt))

        # Collect frames for GIF (every 4th frame)
        if i % 4 == 0 and len(match_frames) < 24:
            match_frames.append((img1.copy(), img2.copy(), good, kp1, kp2))

        # Collect trajectory snapshot (every 2 frames)
        if i % 2 == 0:
            traj_snapshots.append((list(trajectory_est), list(trajectory_gt)))

        if i % 10 == 0:
            print(f"  Frame {i}/{len(images)-1} | matches: {len(good)}")

    return images, trajectory_est, trajectory_gt, match_frames, traj_snapshots

# ── Media generation ──────────────────────────────────────────────────────────
def save_keypoint_matching_image(match_frames, images):
    """Save a static keypoint matching example."""
    if not match_frames:
        return
    img1, img2, good, kp1, kp2 = match_frames[len(match_frames) // 2]
    vis = cv2.drawMatches(
        img1, kp1, img2, kp2, good[:50], None,
        flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS
    )
    out = str(MEDIA_DIR / "keypoint_matching.png")
    cv2.imwrite(out, vis)
    print(f"Saved: {out}")


def save_trajectory_plot(trajectory_est, trajectory_gt):
    """Save estimated vs ground-truth trajectory (top-down X-Z view)."""
    est_x = [p[0] for p in trajectory_est]
    est_z = [p[2] for p in trajectory_est]
    gt_x  = [p[0] for p in trajectory_gt]
    gt_z  = [p[2] for p in trajectory_gt]

    fig, ax = plt.subplots(figsize=(10, 7))
    ax.plot(est_x, est_z, 'b-o', markersize=2, linewidth=1.5, label="Estimated (VO)")
    ax.plot(gt_x,  gt_z,  'r-s', markersize=2, linewidth=1.5, label="Ground Truth")
    ax.plot(est_x[0], est_z[0], 'go', markersize=8, label="Start")
    ax.set_xlabel("X (m)", fontsize=12)
    ax.set_ylabel("Z (m)", fontsize=12)
    ax.set_title("Visual Odometry Trajectory - TUM freiburg1_xyz\n(Top-down view: X-Z plane)", fontsize=13)
    ax.legend(fontsize=11)
    ax.grid(True, alpha=0.3)
    ax.set_aspect('equal')
    plt.tight_layout()
    out = str(MEDIA_DIR / "trajectory_comparison.png")
    plt.savefig(out, dpi=120)
    plt.close()
    print(f"Saved: {out}")


def save_keypoints_on_frame(images):
    """Save a sample frame with detected ORB keypoints overlaid."""
    orb = cv2.ORB_create(nfeatures=500)
    mid = len(images) // 2
    gray = cv2.cvtColor(images[mid], cv2.COLOR_BGR2GRAY)
    kp, _ = orb.detectAndCompute(gray, None)
    vis = cv2.drawKeypoints(
        images[mid], kp, None,
        flags=cv2.DRAW_MATCHES_FLAGS_DRAW_RICH_KEYPOINTS,
        color=(0, 255, 0)
    )
    out = str(MEDIA_DIR / "orb_keypoints.png")
    cv2.imwrite(out, vis)
    print(f"Saved: {out}")


def save_matching_gif(match_frames):
    """Create animated GIF of keypoint matching across frames."""
    import PIL.Image

    gif_frames = []
    for img1, img2, good, kp1, kp2 in match_frames:
        vis = cv2.drawMatches(
            img1, kp1, img2, kp2, good[:30], None,
            flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS
        )
        vis_rgb = cv2.cvtColor(vis, cv2.COLOR_BGR2RGB)
        # Resize for smaller GIF
        h, w = vis_rgb.shape[:2]
        vis_rgb = cv2.resize(vis_rgb, (w // 2, h // 2))
        gif_frames.append(PIL.Image.fromarray(vis_rgb))

    if gif_frames:
        out = str(MEDIA_DIR / "keypoint_matching.gif")
        gif_frames[0].save(
            out,
            save_all=True,
            append_images=gif_frames[1:],
            duration=200,
            loop=0
        )
        print(f"Saved: {out}")


def save_trajectory_gif(traj_snapshots):
    """Create animated GIF of the trajectory building over time."""
    import PIL.Image

    all_est = traj_snapshots[-1][0]
    all_gt  = traj_snapshots[-1][1]

    x_all = [p[0] for p in all_est] + [p[0] for p in all_gt]
    z_all = [p[2] for p in all_est] + [p[2] for p in all_gt]
    xmin, xmax = min(x_all) - 0.1, max(x_all) + 0.1
    zmin, zmax = min(z_all) - 0.1, max(z_all) + 0.1

    gif_frames = []
    step = max(1, len(traj_snapshots) // 30)
    for snap in traj_snapshots[::step]:
        est, gt = snap
        fig, ax = plt.subplots(figsize=(6, 5))
        est_x = [p[0] for p in est]
        est_z = [p[2] for p in est]
        gt_x  = [p[0] for p in gt]
        gt_z  = [p[2] for p in gt]
        ax.plot(est_x, est_z, 'b-', linewidth=1.5)
        ax.plot(gt_x,  gt_z,  'r--', linewidth=1.5)
        ax.plot(est_x[0], est_z[0], 'go', markersize=6)
        if len(est_x) > 1:
            ax.plot(est_x[-1], est_z[-1], 'bs', markersize=5)
        ax.set_xlim(xmin, xmax)
        ax.set_ylim(zmin, zmax)
        ax.set_xlabel("X (m)")
        ax.set_ylabel("Z (m)")
        ax.set_title(f"Trajectory - Frame {len(est)}")
        blue_patch = mpatches.Patch(color='blue', label='Estimated VO')
        red_patch  = mpatches.Patch(color='red',  label='Ground Truth')
        ax.legend(handles=[blue_patch, red_patch], fontsize=8)
        ax.grid(True, alpha=0.3)
        fig.tight_layout()

        fig.canvas.draw()
        w_px, h_px = fig.canvas.get_width_height()
        buf = np.frombuffer(fig.canvas.buffer_rgba(), dtype=np.uint8)
        buf = buf.reshape(h_px, w_px, 4)[:, :, :3]
        gif_frames.append(PIL.Image.fromarray(buf))
        plt.close(fig)

    if gif_frames:
        out = str(MEDIA_DIR / "trajectory_animation.gif")
        gif_frames[0].save(
            out,
            save_all=True,
            append_images=gif_frames[1:],
            duration=150,
            loop=0
        )
        print(f"Saved: {out}")


def save_error_plot(trajectory_est, trajectory_gt):
    """Save per-frame translation error plot."""
    errors = []
    for est, gt in zip(trajectory_est, trajectory_gt):
        err = np.sqrt((est[0]-gt[0])**2 + (est[1]-gt[1])**2 + (est[2]-gt[2])**2)
        errors.append(err)

    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(errors, 'purple', linewidth=1.5)
    ax.fill_between(range(len(errors)), errors, alpha=0.2, color='purple')
    ax.set_xlabel("Frame", fontsize=12)
    ax.set_ylabel("ATE (m)", fontsize=12)
    ax.set_title("Absolute Translation Error per Frame", fontsize=13)
    ax.grid(True, alpha=0.3)
    mean_err = np.mean(errors)
    ax.axhline(mean_err, color='red', linestyle='--', label=f"Mean: {mean_err:.3f} m")
    ax.legend()
    plt.tight_layout()
    out = str(MEDIA_DIR / "translation_error.png")
    plt.savefig(out, dpi=120)
    plt.close()
    print(f"Saved: {out}")


# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=== Visual SLAM - ORB-based Visual Odometry ===")
    print(f"Dataset: {DATASET_DIR}")
    print(f"Media output: {MEDIA_DIR}")
    print()

    images, traj_est, traj_gt, match_frames, traj_snapshots = run_slam()

    print("\n--- Generating media ---")
    save_keypoints_on_frame(images)
    save_keypoint_matching_image(match_frames, images)
    save_trajectory_plot(traj_est, traj_gt)
    save_error_plot(traj_est, traj_gt)
    save_matching_gif(match_frames)
    save_trajectory_gif(traj_snapshots)

    print("\n=== Done ===")
    final_err = np.sqrt(
        (traj_est[-1][0] - traj_gt[-1][0])**2 +
        (traj_est[-1][1] - traj_gt[-1][1])**2 +
        (traj_est[-1][2] - traj_gt[-1][2])**2
    )
    print(f"Final translation error: {final_err:.4f} m")
    print(f"Frames processed: {len(images)}")
