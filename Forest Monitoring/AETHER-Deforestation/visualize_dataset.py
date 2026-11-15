"""
AETHER Deforestation Detection System - Dataset Visualization Script
================================================--------------------

This script generates side-by-side comparison visualizations of paired satellite
imagery (A: Before, B: After) along with ground-truth change masks and semi-transparent
deforestation overlays.

Saved output: outputs/dataset_inspection_samples.png

Author: AETHER EDI Team
"""

import os
import random
from pathlib import Path
from PIL import Image
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
DATASET_DIR = Path(r"C:\Users\HP\Downloads\Forest-Change-dataset (1)\Forest-Change-dataset")
IMAGES_DIR = DATASET_DIR / "images"
OUTPUT_DIR = Path(r"C:\Users\HP\Downloads\Forest Monitoring\AETHER-Deforestation\outputs")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
SAVE_PATH = OUTPUT_DIR / "dataset_inspection_samples.png"

# Set seed for reproducible sampling
random.seed(42)

def create_inspection_visualization(num_samples=5):
    """
    Selects sample pairs and renders a multi-column matplotlib grid showing:
    Col 1: Time Period A (Before)
    Col 2: Time Period B (After)
    Col 3: Change Mask (Deforestation Label)
    Col 4: Overlay (B Image + Semi-transparent Deforestation Highlight)
    """
    print("=" * 60)
    print(f"GENERATING {num_samples}-SAMPLE VISUALIZATION GRID")
    print("=" * 60)

    train_a_dir = IMAGES_DIR / "train" / "A"
    all_files = sorted([f for f in os.listdir(train_a_dir) if f.endswith(".png")])

    # Select 5 representative samples (including low, medium, high change)
    selected_files = random.sample(all_files, num_samples)
    print(f"Selected samples for visualization: {selected_files}")

    fig, axes = plt.subplots(num_samples, 4, figsize=(16, 4 * num_samples))
    plt.suptitle("AETHER EDI — Deforestation Dataset Inspection & Overlay", fontsize=18, fontweight='bold', y=0.99)

    col_titles = [
        "A — BEFORE (T1)",
        "B — AFTER (T2)",
        "CHANGE MASK (Ground Truth)",
        "OVERLAY (B + Deforestation Mask)"
    ]

    for col_idx, title in enumerate(col_titles):
        axes[0, col_idx].set_title(title, fontsize=12, fontweight='bold', pad=10)

    for i, fname in enumerate(selected_files):
        path_a = IMAGES_DIR / "train" / "A" / fname
        path_b = IMAGES_DIR / "train" / "B" / fname
        path_label = IMAGES_DIR / "train" / "label" / fname

        img_a = Image.open(path_a).convert("RGB")
        img_b = Image.open(path_b).convert("RGB")
        img_label = Image.open(path_label).convert("L")

        arr_a = np.array(img_a)
        arr_b = np.array(img_b)
        arr_label = np.array(img_label)

        # Calculate change percentage for subtitle
        change_pct = (np.sum(arr_label >= 128) / arr_label.size) * 100.0

        # Create overlay: Image B with semi-transparent bright red mask over changed area
        overlay = arr_b.copy().astype(np.float32)
        mask_binary = (arr_label >= 128)

        # Apply red color (255, 0, 0) with 0.5 alpha blending where mask is True
        red_tint = np.array([255.0, 0.0, 0.0])
        alpha = 0.5
        overlay[mask_binary] = (1 - alpha) * overlay[mask_binary] + alpha * red_tint
        overlay = np.clip(overlay, 0, 255).astype(np.uint8)

        # Plot Col 1: A (Before)
        axes[i, 0].imshow(arr_a)
        axes[i, 0].set_ylabel(f"{fname}\n({change_pct:.2f}% Deforested)", fontsize=10, fontweight='bold')
        axes[i, 0].set_xticks([])
        axes[i, 0].set_yticks([])

        # Plot Col 2: B (After)
        axes[i, 1].imshow(arr_b)
        axes[i, 1].set_xticks([])
        axes[i, 1].set_yticks([])

        # Plot Col 3: Mask (using 'Reds' colormap for high visual clarity)
        axes[i, 2].imshow(arr_label, cmap="Reds_r", vmin=0, vmax=255)
        axes[i, 2].set_xticks([])
        axes[i, 2].set_yticks([])

        # Plot Col 4: Overlay
        axes[i, 3].imshow(overlay)
        axes[i, 3].set_xticks([])
        axes[i, 3].set_yticks([])

    # Legend for overlay
    red_patch = mpatches.Patch(color='red', alpha=0.6, label='Deforested Area')
    fig.legend(handles=[red_patch], loc='lower center', ncol=1, fontsize=12, frameon=True)

    plt.tight_layout(rect=[0, 0.03, 1, 0.97])
    plt.savefig(SAVE_PATH, dpi=150, bbox_inches='tight')
    plt.close()

    print(f"[SUCCESS] Sample visualization saved to: {SAVE_PATH}")

if __name__ == "__main__":
    create_inspection_visualization()
