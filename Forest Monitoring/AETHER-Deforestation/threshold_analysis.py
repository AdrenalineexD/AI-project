"""
AETHER Deforestation Detection System — Stage 2B Validation Threshold Analysis
================================================================================

Performs threshold optimization on the VALIDATION SET ONLY using checkpoints/stage2b/best_model.pth.
Sweeps probability thresholds from 0.20 to 0.80 (step 0.05).
Saves results to outputs/threshold_analysis_stage2b.csv and selects optimal threshold.

Author: AETHER EDI Team
"""

import os
import csv
import torch
import numpy as np

from prepare_dataset import DeforestationDataset
from models.unet import UNet
from metrics import dice_score, iou_score, precision_score, recall_score


def run_threshold_sweep(
    checkpoint_path: str = "checkpoints/stage2b/best_model.pth",
    output_csv: str = "outputs/threshold_analysis_stage2b.csv"
):
    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"Checkpoint not found at '{checkpoint_path}'. Complete train_stage2b.py first.")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[Threshold Analysis] Device: {device}")

    # Load Model Checkpoint
    model = UNet(in_channels=6, out_channels=1).to(device)
    checkpoint = torch.load(checkpoint_path, map_location=device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    best_epoch = checkpoint.get("epoch", "N/A")
    print(f"[Threshold Analysis] Loaded best_model.pth from Epoch {best_epoch}")

    # Load Validation Set ONLY
    val_dataset = DeforestationDataset(split="val", mode="concat", augment=False)
    val_loader = torch.utils.data.DataLoader(val_dataset, batch_size=4, shuffle=False)

    thresholds = [0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80]
    results = []

    print("\n" + "=" * 65)
    print("VALIDATION THRESHOLD SWEEP (VALIDATION SET ONLY - 31 SAMPLES)")
    print("=" * 65)
    print(f"{'Threshold':>10} | {'Dice (F1)':>10} | {'IoU':>10} | {'Precision':>10} | {'Recall':>10}")
    print("-" * 65)

    with torch.no_grad():
        # Store all logits and targets to perform threshold sweep efficiently
        all_logits = []
        all_targets = []
        for inputs, masks in val_loader:
            inputs, masks = inputs.to(device), masks.to(device)
            logits = model(inputs)
            all_logits.append(logits)
            all_targets.append(masks)

    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    with open(output_csv, mode="w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["threshold", "dice", "iou", "precision", "recall"])

        best_t_dice = -1.0
        best_threshold = 0.50
        default_metrics = {}

        for t in thresholds:
            t_dice_acc, t_iou_acc, t_prec_acc, t_rec_acc = 0.0, 0.0, 0.0, 0.0
            n_batches = len(all_logits)

            for logits, masks in zip(all_logits, all_targets):
                t_dice_acc += float(dice_score(logits, masks, threshold=t, from_logits=True))
                t_iou_acc += float(iou_score(logits, masks, threshold=t, from_logits=True))
                t_prec_acc += float(precision_score(logits, masks, threshold=t, from_logits=True))
                t_rec_acc += float(recall_score(logits, masks, threshold=t, from_logits=True))

            avg_d = t_dice_acc / n_batches
            avg_i = t_iou_acc / n_batches
            avg_p = t_prec_acc / n_batches
            avg_r = t_rec_acc / n_batches

            writer.writerow([f"{t:.2f}", f"{avg_d:.4f}", f"{avg_i:.4f}", f"{avg_p:.4f}", f"{avg_r:.4f}"])
            print(f"{t:10.2f} | {avg_d:10.4f} | {avg_i:10.4f} | {avg_p:10.4f} | {avg_r:10.4f}")

            if abs(t - 0.50) < 1e-5:
                default_metrics = {"dice": avg_d, "iou": avg_i, "precision": avg_p, "recall": avg_r}

            if avg_d > best_t_dice:
                best_t_dice = avg_d
                best_threshold = t

    print("-" * 65)
    print(f"\nDefault Threshold (0.50): Val Dice = {default_metrics.get('dice', 0.0):.4f} | IoU = {default_metrics.get('iou', 0.0):.4f}")
    print(f"Optimal Threshold ({best_threshold:.2f}):   Val Dice = {best_t_dice:.4f}")
    print(f"[SUCCESS] Threshold analysis completed and saved to '{output_csv}'.")

    return best_threshold, best_t_dice


if __name__ == "__main__":
    run_threshold_sweep()
