"""
AETHER Deforestation Detection System - Mask Analysis Script
=============================================================

This script performs deep statistical analysis of the ground-truth change masks.
It determines the exact pixel value distribution (0, 255, and intermediate values),
computes change percentages per sample, exports outputs/mask_statistics.csv,
and analyzes class balance to inform U-Net preprocessing and loss function design.

Author: AETHER EDI Team
"""

import os
from pathlib import Path
from PIL import Image
import numpy as np
import pandas as pd

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
DATASET_DIR = Path(r"C:\Users\HP\Downloads\Forest-Change-dataset (1)\Forest-Change-dataset")
IMAGES_DIR = DATASET_DIR / "images"
OUTPUT_DIR = Path(r"C:\Users\HP\Downloads\Forest Monitoring\AETHER-Deforestation\outputs")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
CSV_PATH = OUTPUT_DIR / "mask_statistics.csv"

SPLITS = ["train", "val", "test"]

def analyze_all_masks(threshold=128):
    """
    Analyzes pixel values across all mask files in train, val, and test splits.
    
    Arguments:
        threshold (int): Binarization threshold to separate background (0) from change (>= threshold).
                         Also records raw non-zero (>0) pixel count for comparison.
    """
    print("=" * 60)
    print("AETHER MASK PIXEL VALUE & CLASS BALANCE ANALYSIS")
    print("=" * 60)

    records = []
    global_hist = np.zeros(256, dtype=np.int64)

    for split in SPLITS:
        label_dir = IMAGES_DIR / split / "label"
        if not label_dir.exists():
            continue

        file_list = sorted([f for f in os.listdir(label_dir) if not f.startswith('.')])

        for fname in file_list:
            mask_path = label_dir / fname
            with Image.open(mask_path) as img:
                arr = np.array(img)

            total_pixels = arr.size  # e.g., 480 * 480 = 230,400

            # Pixel frequency count for this mask
            hist, _ = np.histogram(arr, bins=256, range=(0, 256))
            global_hist += hist

            zero_count = int(hist[0])
            max_val_count = int(hist[255])
            intermediate_count = total_pixels - zero_count - max_val_count

            # Threshold-based change pixels (using standard threshold >= 128 as well as >0)
            change_pixels_gt0 = int(np.sum(arr > 0))
            change_pixels_th128 = int(np.sum(arr >= threshold))

            change_pct_gt0 = (change_pixels_gt0 / total_pixels) * 100.0
            change_pct_th128 = (change_pixels_th128 / total_pixels) * 100.0

            records.append({
                "split": split,
                "filename": fname,
                "total_pixels": total_pixels,
                "min_pixel": int(arr.min()),
                "max_pixel": int(arr.max()),
                "zero_pixels": zero_count,
                "val255_pixels": max_val_count,
                "intermediate_pixels": intermediate_count,
                "change_pixels_th128": change_pixels_th128,
                "change_percentage_th128": round(change_pct_th128, 4),
                "change_pixels_gt0": change_pixels_gt0,
                "change_percentage_gt0": round(change_pct_gt0, 4)
            })

    df = pd.DataFrame(records)
    df.to_csv(CSV_PATH, index=False)
    print(f"\n[INFO] Detailed mask statistics saved to: {CSV_PATH}")

    # Print Global Mask Pixel Analysis
    total_all_pixels = global_hist.sum()
    pct_0 = (global_hist[0] / total_all_pixels) * 100.0
    pct_255 = (global_hist[255] / total_all_pixels) * 100.0
    pct_inter = (global_hist[1:255].sum() / total_all_pixels) * 100.0

    print("\nGLOBAL PIXEL VALUE DISTRIBUTION ACROSS ENTIRE DATASET:")
    print(f"  - Pixel 0 (Background / No Change): {global_hist[0]:,} pixels ({pct_0:.2f}%)")
    print(f"  - Pixel 255 (Deforestation / Change): {global_hist[255]:,} pixels ({pct_255:.2f}%)")
    print(f"  - Pixels 1-254 (Boundary Anti-Aliasing / Soft Transition): {global_hist[1:255].sum():,} pixels ({pct_inter:.2f}%)")

    # Print Summary Statistics per Split
    print("\n" + "=" * 60)
    print("SPLIT SUMMARY STATISTICS (Threshold >= 128)")
    print("=" * 60)

    for split in SPLITS:
        sub_df = df[df["split"] == split]
        if sub_df.empty:
            continue

        pcts = sub_df["change_percentage_th128"]
        print(f"\n{split.upper()} SPLIT ({len(sub_df)} samples):")
        print(f"  - Min Change %:    {pcts.min():.2f}%")
        print(f"  - Max Change %:    {pcts.max():.2f}%")
        print(f"  - Mean Change %:   {pcts.mean():.2f}%")
        print(f"  - Median Change %: {pcts.median():.2f}%")

        # Identify key extreme samples
        min_sample = sub_df.loc[pcts.idxmin()]
        max_sample = sub_df.loc[pcts.idxmax()]
        print(f"  - Lowest Change Sample:  {min_sample['filename']} ({min_sample['change_percentage_th128']}%)")
        print(f"  - Highest Change Sample: {max_sample['filename']} ({max_sample['change_percentage_th128']}%)")

    # Overall dataset metrics
    all_pcts = df["change_percentage_th128"]
    print("\n" + "=" * 60)
    print("OVERALL DATASET DEFORESTATION SUMMARY")
    print("=" * 60)
    print(f"  - Total Dataset Samples:  {len(df)}")
    print(f"  - Overall Min Change %:   {all_pcts.min():.2f}%")
    print(f"  - Overall Max Change %:   {all_pcts.max():.2f}%")
    print(f"  - Overall Mean Change %:  {all_pcts.mean():.2f}%")
    print(f"  - Overall Median Change %:{all_pcts.median():.2f}%")
    
    # Class balance assessment
    total_change = df["change_pixels_th128"].sum()
    total_bg = (df["total_pixels"] - df["change_pixels_th128"]).sum()
    overall_change_ratio = (total_change / (total_change + total_bg)) * 100.0
    print(f"\n  - Total Deforested Area Ratio: {overall_change_ratio:.2f}% Deforestation vs {100.0 - overall_change_ratio:.2f}% Background/Forest")
    print(f"  - Class Imbalance Ratio: ~1:{((100.0 - overall_change_ratio) / max(overall_change_ratio, 1e-5)):.1f}")

    return df

if __name__ == "__main__":
    analyze_all_masks()
