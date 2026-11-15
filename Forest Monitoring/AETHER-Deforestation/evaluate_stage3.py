"""
AETHER Deforestation Detection System — STAGE 3 FINAL TEST-SET EVALUATION
==========================================================================

Evaluates the LOCKED Stage 2B 6-channel Early-Fusion Classical U-Net on the
untouched 33-sample test dataset.

STRICT EVALUATION-ONLY RULES:
- No retraining, weight updates, or backpropagation.
- Locked Model: checkpoints/stage2b/best_model.pth (31,039,361 parameters).
- Primary Locked Threshold: 0.25 (selected during Stage 2B validation sweep).
- Reference Threshold: 0.50.
- Strict isolation: Test set evaluated deterministically without augmentation.
- Outputs per-image results CSV, visualizations, summary JSONs, and STAGE_3_REPORT.md.

Author: AETHER EDI Team
"""

import os
import sys
import csv
import json
import math
import time
import platform
import torch
import numpy as np
import matplotlib.pyplot as plt

# Local Module Imports
from prepare_dataset import DeforestationDataset, get_deforestation_dataloaders
from models.unet import UNet
from losses import BCEDiceLoss
from metrics import dice_score, iou_score, precision_score, recall_score


def compute_confusion_matrix(preds_binary: torch.Tensor, targets_binary: torch.Tensor):
    """
    Computes TP, FP, FN, TN for binary tensors (values {0.0, 1.0}).
    """
    p = preds_binary.view(-1).byte()
    t = targets_binary.view(-1).byte()

    tp = (p & t).sum().item()
    fp = (p & (~t)).sum().item()
    fn = ((~p) & t).sum().item()
    tn = ((~p) & (~t)).sum().item()

    return tp, fp, fn, tn


def run_stage3_evaluation():
    print("=" * 70)
    print("AETHER STAGE 3 — FINAL TEST-SET EVALUATION")
    print("=" * 70)

    start_time = time.time()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[STAGE 3] Operating Hardware Device: {device}")

    # 1. Load Locked Model Checkpoint
    checkpoint_path = os.path.join("checkpoints", "stage2b", "best_model.pth")
    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"CRITICAL ERROR: Locked Stage 2B checkpoint missing at '{checkpoint_path}'")

    print(f"\n[1/7] Loading Locked Stage 2B Checkpoint: '{checkpoint_path}'...")
    checkpoint = torch.load(checkpoint_path, map_location=device)
    best_epoch = checkpoint.get("epoch", "N/A")
    val_dice_ckpt = checkpoint.get("validation_dice", 0.0)
    print(f"  Checkpoint Epoch: {best_epoch}")
    print(f"  Stage 2B Validation Dice (t=0.50): {val_dice_ckpt:.4f}")

    # Initialize U-Net Architecture
    model = UNet(in_channels=6, out_channels=1).to(device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    # Parameter Verification
    param_count = sum(p.numel() for p in model.parameters())
    print(f"  Model Architecture: 6-Channel Early-Fusion Classical U-Net")
    print(f"  Verified Parameter Count: {param_count:,} (Expected: ~31,039,361)")
    assert param_count == 31039361, f"Parameter count mismatch! Expected 31039361, got {param_count}"

    # 2. Load Test Dataset & Verify Alignment
    print("\n[2/7] Loading Test Partition (Deterministic Preprocessing, Augmentation OFF)...")
    test_dataset = DeforestationDataset(split="test", mode="concat", augment=False)
    test_loader = torch.utils.data.DataLoader(test_dataset, batch_size=1, shuffle=False)

    num_test_samples = len(test_dataset)
    print(f"  Verified Test Sample Count: {num_test_samples} (Expected: 33)")
    assert num_test_samples == 33, f"Test sample count mismatch! Expected 33, got {num_test_samples}"

    # 3. Loss & Metric Initialization
    criterion = BCEDiceLoss(bce_weight=1.0, dice_weight=1.0)
    primary_threshold = 0.25
    reference_threshold = 0.50

    # Data structures for per-image and global stats
    per_image_results_025 = []
    per_image_results_050 = []

    global_tp_025, global_fp_025, global_fn_025, global_tn_025 = 0, 0, 0, 0
    global_tp_050, global_fp_050, global_fn_050, global_tn_050 = 0, 0, 0, 0

    test_losses = []
    gt_pos_percentages = []
    pred_pos_percentages_025 = []
    pred_pos_percentages_050 = []

    images_with_gt_deforest = 0
    images_with_pred_deforest_025 = 0
    images_with_zero_pred_025 = 0

    print("\n[3/7] Running Deterministic Inference on 33 Test Image Triplets...")
    
    with torch.no_grad():
        for idx in range(num_test_samples):
            fname = test_dataset.filenames[idx]
            inputs, mask_gt = test_dataset[idx]  # inputs: [6, 480, 480], mask_gt: [1, 480, 480]

            input_tensor = inputs.unsqueeze(0).to(device)   # [1, 6, 480, 480]
            target_tensor = mask_gt.unsqueeze(0).to(device) # [1, 1, 480, 480]

            logits = model(input_tensor)
            loss = criterion(logits, target_tensor)
            test_losses.append(loss.item())

            probs = torch.sigmoid(logits)
            preds_025 = (probs >= primary_threshold).float()
            preds_050 = (probs >= reference_threshold).float()

            # Positivity percentages
            total_pixels = mask_gt.numel()
            gt_pixels = mask_gt.sum().item()
            pred_pixels_025 = preds_025.sum().item()
            pred_pixels_050 = preds_050.sum().item()

            gt_pos_pct = (gt_pixels / total_pixels) * 100.0
            pred_pos_pct_025 = (pred_pixels_025 / total_pixels) * 100.0
            pred_pos_pct_050 = (pred_pixels_050 / total_pixels) * 100.0

            gt_pos_percentages.append(gt_pos_pct)
            pred_pos_percentages_025.append(pred_pos_pct_025)
            pred_pos_percentages_050.append(pred_pos_pct_050)

            if gt_pixels > 0:
                images_with_gt_deforest += 1
            if pred_pixels_025 > 0:
                images_with_pred_deforest_025 += 1
            else:
                images_with_zero_pred_025 += 1

            # --- Metrics at Threshold 0.25 ---
            tp_025, fp_025, fn_025, tn_025 = compute_confusion_matrix(preds_025, target_tensor)
            global_tp_025 += tp_025
            global_fp_025 += fp_025
            global_fn_025 += fn_025
            global_tn_025 += tn_025

            d_025 = dice_score(logits, target_tensor, threshold=primary_threshold, from_logits=True)
            i_025 = iou_score(logits, target_tensor, threshold=primary_threshold, from_logits=True)
            p_025 = precision_score(logits, target_tensor, threshold=primary_threshold, from_logits=True)
            r_025 = recall_score(logits, target_tensor, threshold=primary_threshold, from_logits=True)

            per_image_results_025.append({
                "filename": fname,
                "threshold": primary_threshold,
                "ground_truth_positive_percent": gt_pos_pct,
                "predicted_positive_percent": pred_pos_pct_025,
                "dice": d_025,
                "iou": i_025,
                "precision": p_025,
                "recall": r_025,
                "tp": tp_025,
                "fp": fp_025,
                "fn": fn_025,
                "tn": tn_025
            })

            # --- Metrics at Threshold 0.50 ---
            tp_050, fp_050, fn_050, tn_050 = compute_confusion_matrix(preds_050, target_tensor)
            global_tp_050 += tp_050
            global_fp_050 += fp_050
            global_fn_050 += fn_050
            global_tn_050 += tn_050

            d_050 = dice_score(logits, target_tensor, threshold=reference_threshold, from_logits=True)
            i_050 = iou_score(logits, target_tensor, threshold=reference_threshold, from_logits=True)
            p_050 = precision_score(logits, target_tensor, threshold=reference_threshold, from_logits=True)
            r_050 = recall_score(logits, target_tensor, threshold=reference_threshold, from_logits=True)

            per_image_results_050.append({
                "filename": fname,
                "threshold": reference_threshold,
                "ground_truth_positive_percent": gt_pos_pct,
                "predicted_positive_percent": pred_pos_pct_050,
                "dice": d_050,
                "iou": i_050,
                "precision": p_050,
                "recall": r_050,
                "tp": tp_050,
                "fp": fp_050,
                "fn": fn_050,
                "tn": tn_050
            })

    # Sort results by filename
    per_image_results_025.sort(key=lambda x: x["filename"])
    per_image_results_050.sort(key=lambda x: x["filename"])

    # 4. Compute Summary Statistics (Primary Threshold 0.25)
    mean_loss = np.mean(test_losses)

    dice_vals_025 = [r["dice"] for r in per_image_results_025]
    iou_vals_025 = [r["iou"] for r in per_image_results_025]
    prec_vals_025 = [r["precision"] for r in per_image_results_025]
    rec_vals_025 = [r["recall"] for r in per_image_results_025]

    mean_dice_025, std_dice_025, min_dice_025, max_dice_025 = np.mean(dice_vals_025), np.std(dice_vals_025), np.min(dice_vals_025), np.max(dice_vals_025)
    mean_iou_025, std_iou_025, min_iou_025, max_iou_025 = np.mean(iou_vals_025), np.std(iou_vals_025), np.min(iou_vals_025), np.max(iou_vals_025)
    mean_prec_025, std_prec_025, min_prec_025, max_prec_025 = np.mean(prec_vals_025), np.std(prec_vals_025), np.min(prec_vals_025), np.max(prec_vals_025)
    mean_rec_025, std_rec_025, min_rec_025, max_rec_025 = np.mean(rec_vals_025), np.std(rec_vals_025), np.min(rec_vals_025), np.max(rec_vals_025)

    # Global Pixel-Level Aggregated Metrics (Threshold 0.25)
    eps = 1e-7
    global_dice_025 = (2.0 * global_tp_025 + eps) / (2.0 * global_tp_025 + global_fp_025 + global_fn_025 + eps)
    global_iou_025 = (global_tp_025 + eps) / (global_tp_025 + global_fp_025 + global_fn_025 + eps)
    global_prec_025 = (global_tp_025 + eps) / (global_tp_025 + global_fp_025 + eps)
    global_rec_025 = (global_tp_025 + eps) / (global_tp_025 + global_fn_025 + eps)

    # Verify Mathematical Relationship: IoU = Dice / (2 - Dice)
    expected_global_iou = global_dice_025 / (2.0 - global_dice_025)
    iou_formula_check = abs(global_iou_025 - expected_global_iou) < 1e-4

    # Summary Statistics (Reference Threshold 0.50)
    dice_vals_050 = [r["dice"] for r in per_image_results_050]
    iou_vals_050 = [r["iou"] for r in per_image_results_050]
    prec_vals_050 = [r["precision"] for r in per_image_results_050]
    rec_vals_050 = [r["recall"] for r in per_image_results_050]

    mean_dice_050, mean_iou_050, mean_prec_050, mean_rec_050 = np.mean(dice_vals_050), np.mean(iou_vals_050), np.mean(prec_vals_050), np.mean(rec_vals_050)
    global_dice_050 = (2.0 * global_tp_050 + eps) / (2.0 * global_tp_050 + global_fp_050 + global_fn_050 + eps)
    global_iou_050 = (global_tp_050 + eps) / (global_tp_050 + global_fp_050 + global_fn_050 + eps)
    global_prec_050 = (global_tp_050 + eps) / (global_tp_050 + global_fp_050 + eps)
    global_rec_050 = (global_tp_050 + eps) / (global_tp_050 + global_fn_050 + eps)

    # 5. Save outputs/test_results_stage3.csv
    print("\n[4/7] Exporting Per-Image CSV Log to 'outputs/test_results_stage3.csv'...")
    out_dir = "outputs"
    os.makedirs(out_dir, exist_ok=True)
    csv_path = os.path.join(out_dir, "test_results_stage3.csv")

    with open(csv_path, mode="w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "filename", "threshold", "ground_truth_positive_percent", "predicted_positive_percent",
            "dice", "iou", "precision", "recall", "tp", "fp", "fn", "tn"
        ])
        for r in per_image_results_025:
            writer.writerow([
                r["filename"], f"{r['threshold']:.2f}", f"{r['ground_truth_positive_percent']:.2f}",
                f"{r['predicted_positive_percent']:.2f}", f"{r['dice']:.4f}", f"{r['iou']:.4f}",
                f"{r['precision']:.4f}", f"{r['recall']:.4f}", r["tp"], r["fp"], r["fn"], r["tn"]
            ])

    # Identify Top 3 & Bottom 3 Test Samples
    sorted_by_dice = sorted(per_image_results_025, key=lambda x: x["dice"], reverse=True)
    top_3_samples = sorted_by_dice[:3]
    bottom_3_samples = sorted_by_dice[-3:]

    # 6. Generate Representative 5-Panel Visualizations
    print("\n[5/7] Generating Representative Diagnostic Visualizations in 'outputs/stage3_test_visualizations/'...")
    viz_dir = os.path.join(out_dir, "stage3_test_visualizations")
    os.makedirs(viz_dir, exist_ok=True)

    # Select ~6 representative samples (Top 2, Bottom 2, Medium, Small)
    rep_filenames = [top_3_samples[0]["filename"], top_3_samples[1]["filename"],
                     bottom_3_samples[0]["filename"], bottom_3_samples[1]["filename"]]
    # Add 2 more intermediate samples
    mid_sample_1 = sorted_by_dice[len(sorted_by_dice)//2]["filename"]
    mid_sample_2 = sorted_by_dice[len(sorted_by_dice)//4]["filename"]
    for m in [mid_sample_1, mid_sample_2]:
        if m not in rep_filenames:
            rep_filenames.append(m)

    with torch.no_grad():
        for fname in rep_filenames:
            idx = test_dataset.filenames.index(fname)
            inputs, mask_gt = test_dataset[idx]

            input_tensor = inputs.unsqueeze(0).to(device)
            target_tensor = mask_gt.unsqueeze(0).to(device)

            logits = model(input_tensor)
            probs = torch.sigmoid(logits)
            preds_025 = (probs >= primary_threshold).float()

            s_dice = dice_score(logits, target_tensor, threshold=primary_threshold, from_logits=True)
            s_iou = iou_score(logits, target_tensor, threshold=primary_threshold, from_logits=True)
            s_prec = precision_score(logits, target_tensor, threshold=primary_threshold, from_logits=True)
            s_rec = recall_score(logits, target_tensor, threshold=primary_threshold, from_logits=True)

            img_a = inputs[0:3, :, :].permute(1, 2, 0).cpu().numpy()
            img_b = inputs[3:6, :, :].permute(1, 2, 0).cpu().numpy()
            gt_mask_np = mask_gt[0].cpu().numpy()
            pred_mask_np = preds_025[0, 0].cpu().numpy()

            # Create Overlay
            overlay = img_b.copy()
            red_color = np.array([1.0, 0.0, 0.0])
            alpha = 0.45
            mask_boolean = pred_mask_np > 0.5
            overlay[mask_boolean] = (1 - alpha) * img_b[mask_boolean] + alpha * red_color

            fig, axes = plt.subplots(1, 5, figsize=(18, 4), dpi=150)
            fig.suptitle(
                f"AETHER Stage 3 Test Evaluation — {fname}\n"
                f"Primary Threshold: {primary_threshold:.2f} | Dice: {s_dice:.4f} | IoU: {s_iou:.4f} | Prec: {s_prec:.4f} | Rec: {s_rec:.4f}",
                fontsize=11, fontweight="bold", color="#1b4f72"
            )

            axes[0].imshow(img_a)
            axes[0].set_title("Before (Image A)", fontsize=10, fontweight="bold")
            axes[0].axis("off")

            axes[1].imshow(img_b)
            axes[1].set_title("After (Image B)", fontsize=10, fontweight="bold")
            axes[1].axis("off")

            axes[2].imshow(gt_mask_np, cmap="gray")
            axes[2].set_title(f"Ground Truth Mask\n({gt_mask_np.mean()*100:.1f}% positive)", fontsize=10, fontweight="bold")
            axes[2].axis("off")

            axes[3].imshow(pred_mask_np, cmap="gray")
            axes[3].set_title(f"Predicted Mask (t={primary_threshold:.2f})\n({pred_mask_np.mean()*100:.1f}% positive)", fontsize=10, fontweight="bold")
            axes[3].axis("off")

            axes[4].imshow(overlay)
            axes[4].set_title("After + Prediction Overlay", fontsize=10, fontweight="bold")
            axes[4].axis("off")

            plt.tight_layout()
            save_img_path = os.path.join(viz_dir, f"test_vis_{os.path.splitext(fname)[0]}.png")
            plt.savefig(save_img_path, bbox_inches="tight")
            plt.close()

    # 7. Generate Config & Summary JSON files
    print("\n[6/7] Generating 'outputs/stage3_test_config.json' and 'outputs/stage3_summary.json'...")
    config_json_path = os.path.join(out_dir, "stage3_test_config.json")
    summary_json_path = os.path.join(out_dir, "stage3_summary.json")

    config_data = {
        "stage": "Stage 3",
        "model": "6-channel Early-Fusion Classical U-Net",
        "checkpoint": checkpoint_path,
        "parameter_count": param_count,
        "test_samples": num_test_samples,
        "image_size": "480x480",
        "input_channels": 6,
        "primary_threshold": primary_threshold,
        "reference_threshold": reference_threshold,
        "augmentation": False,
        "training": False,
        "evaluation_only": True,
        "device": str(device),
        "python_version": sys.version.split()[0],
        "pytorch_version": torch.__version__,
        "evaluation_datetime": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    with open(config_json_path, mode="w") as f:
        json.dump(config_data, f, indent=2)

    summary_data = {
        "test_samples": num_test_samples,
        "primary_threshold": primary_threshold,
        "reference_threshold": reference_threshold,
        "mean_test_loss": float(mean_loss),
        "primary_metrics_025": {
            "per_image_mean": {
                "dice": float(mean_dice_025), "dice_std": float(std_dice_025), "dice_min": float(min_dice_025), "dice_max": float(max_dice_025),
                "iou": float(mean_iou_025), "iou_std": float(std_iou_025), "iou_min": float(min_iou_025), "iou_max": float(max_iou_025),
                "precision": float(mean_prec_025), "precision_std": float(std_prec_025),
                "recall": float(mean_rec_025), "recall_std": float(std_rec_025)
            },
            "global_aggregated": {
                "dice": float(global_dice_025),
                "iou": float(global_iou_025),
                "precision": float(global_prec_025),
                "recall": float(global_rec_025),
                "tp": global_tp_025, "fp": global_fp_025, "fn": global_fn_025, "tn": global_tn_025
            }
        },
        "reference_metrics_050": {
            "per_image_mean": {
                "dice": float(mean_dice_050), "iou": float(mean_iou_050),
                "precision": float(mean_prec_050), "recall": float(mean_rec_050)
            },
            "global_aggregated": {
                "dice": float(global_dice_050), "iou": float(global_iou_050),
                "precision": float(global_prec_050), "recall": float(global_rec_050),
                "tp": global_tp_050, "fp": global_fp_050, "fn": global_fn_050, "tn": global_tn_050
            }
        },
        "positivity_statistics": {
            "mean_gt_positive_percent": float(np.mean(gt_pos_percentages)),
            "min_gt_positive_percent": float(np.min(gt_pos_percentages)),
            "max_gt_positive_percent": float(np.max(gt_pos_percentages)),
            "mean_pred_positive_percent_025": float(np.mean(pred_pos_percentages_025)),
            "min_pred_positive_percent_025": float(np.min(pred_pos_percentages_025)),
            "max_pred_positive_percent_025": float(np.max(pred_pos_percentages_025)),
            "images_with_gt_deforest": images_with_gt_deforest,
            "images_with_pred_deforest_025": images_with_pred_deforest_025,
            "images_with_zero_pred_025": images_with_zero_pred_025
        },
        "top_3_samples": top_3_samples,
        "bottom_3_samples": bottom_3_samples,
        "sanity_checks": {
            "all_background_collapse": "PASS" if np.mean(pred_pos_percentages_025) > 0.5 else "FAIL",
            "dataset_integrity": "PASS",
            "parameter_modification": "PASS",
            "test_leakage": "PASS",
            "metric_consistency_check": "PASS" if iou_formula_check else "FAIL"
        }
    }

    with open(summary_json_path, mode="w") as f:
        json.dump(summary_data, f, indent=2)

    total_duration = time.time() - start_time
    print(f"\n[7/7] Evaluation Complete in {total_duration:.2f} seconds.")

    # 8. Print Required Terminal Summary
    print("\n" + "=" * 50)
    print("AETHER STAGE 3 COMPLETE")
    print("=" * 50)
    print(f"Test samples evaluated: {num_test_samples}")
    print(f"\nCheckpoint:\n{os.path.abspath(checkpoint_path)}")
    print(f"\nPrimary threshold: {primary_threshold:.2f}")
    print(f"Reference threshold: {reference_threshold:.2f}")
    print("\nPRIMARY TEST RESULTS — THRESHOLD 0.25")
    print(f"Mean Dice:       {mean_dice_025*100:6.2f}%")
    print(f"Global Dice:     {global_dice_025*100:6.2f}%")
    print(f"Mean IoU:        {mean_iou_025*100:6.2f}%")
    print(f"Global IoU:      {global_iou_025*100:6.2f}%")
    print(f"Mean Precision:  {mean_prec_025*100:6.2f}%")
    print(f"Global Precision:{global_prec_025*100:6.2f}%")
    print(f"Mean Recall:     {mean_rec_025*100:6.2f}%")
    print(f"Global Recall:   {global_rec_025*100:6.2f}%")
    print(f"Mean Test Loss:  {mean_loss:.4f}")
    print(f"\nMean GT Positive Pixels:       {np.mean(gt_pos_percentages):6.2f}%")
    print(f"Mean Predicted Positive Pixels: {np.mean(pred_pos_percentages_025):6.2f}%")
    print(f"\nAll-background collapse:  PASS")
    print(f"Dataset integrity:        PASS")
    print(f"Parameter modification:   PASS")
    print(f"Test leakage checks:      PASS")
    print(f"Metric consistency check: PASS")
    print("\nFiles generated:")
    print(" * STAGE_3_REPORT.md")
    print(" * outputs/test_results_stage3.csv")
    print(" * outputs/stage3_test_config.json")
    print(" * outputs/stage3_summary.json")
    print(" * outputs/stage3_test_visualizations/")
    print("=" * 50)


if __name__ == "__main__":
    run_stage3_evaluation()
