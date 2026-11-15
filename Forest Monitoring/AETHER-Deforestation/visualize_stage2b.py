"""
AETHER Deforestation Detection System — Stage 2B Validation Visualizer
=======================================================================

Loads checkpoints/stage2b/best_model.pth and renders 5-panel side-by-side
diagnostic visualizations for representative validation samples using the
optimal validation threshold.

Panels per sample:
1. Before Image (Image A)
2. After Image (Image B)
3. Ground Truth Mask
4. Predicted Mask
5. After Image + Prediction Red Overlay

Output saved to: outputs/stage2b_validation_predictions.png

Author: AETHER EDI Team
"""

import os
import csv
import torch
import numpy as np
import matplotlib.pyplot as plt

from prepare_dataset import DeforestationDataset
from models.unet import UNet
from metrics import dice_score, iou_score, precision_score, recall_score


def get_best_threshold(csv_path: str = "outputs/threshold_analysis_stage2b.csv") -> float:
    """Reads optimal threshold from threshold_analysis_stage2b.csv."""
    if not os.path.exists(csv_path):
        return 0.50

    best_thresh = 0.50
    best_dice = -1.0
    with open(csv_path, mode="r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            t = float(row["threshold"])
            d = float(row["dice"])
            if d > best_dice:
                best_dice = d
                best_thresh = t
    return best_thresh


def visualize_stage2b_predictions(
    checkpoint_path: str = "checkpoints/stage2b/best_model.pth",
    output_path: str = "outputs/stage2b_validation_predictions.png",
    sample_indices: list = [0, 5, 10]
):
    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"Checkpoint not found at '{checkpoint_path}'. Run train_stage2b.py first.")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    best_threshold = get_best_threshold()
    print(f"[Visualize Stage 2B] Using optimal validation threshold: {best_threshold:.2f}")

    # 1. Load Model & Checkpoint
    model = UNet(in_channels=6, out_channels=1).to(device)
    checkpoint = torch.load(checkpoint_path, map_location=device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    best_epoch = checkpoint.get("epoch", "N/A")
    val_dice_ckpt = checkpoint.get("validation_dice", 0.0)
    val_iou_ckpt = checkpoint.get("validation_iou", 0.0)

    # 2. Load Validation Dataset
    val_dataset = DeforestationDataset(split="val", mode="concat", augment=False)
    
    num_samples = len(sample_indices)
    fig, axes = plt.subplots(num_samples, 5, figsize=(18, 3.8 * num_samples), dpi=150)
    
    if num_samples == 1:
        axes = np.expand_dims(axes, axis=0)

    plt.suptitle(
        f"STAGE 2B — FULL TRAINING VALIDATION RESULTS\n"
        f"(Best Checkpoint Epoch {best_epoch} | Val Dice: {val_dice_ckpt:.4f} | Val IoU: {val_iou_ckpt:.4f} | Threshold: {best_threshold:.2f})",
        fontsize=13, fontweight="bold", color="#1b4f72", y=0.99
    )

    with torch.no_grad():
        for i, sample_idx in enumerate(sample_indices):
            idx = min(sample_idx, len(val_dataset) - 1)
            fname = val_dataset.filenames[idx]

            inputs, mask_gt = val_dataset[idx]  # inputs: [6, 480, 480], mask_gt: [1, 480, 480]

            input_tensor = inputs.unsqueeze(0).to(device)
            target_tensor = mask_gt.unsqueeze(0).to(device)

            logits = model(input_tensor)
            probs = torch.sigmoid(logits)
            preds = (probs >= best_threshold).float()

            sample_dice = dice_score(logits, target_tensor, threshold=best_threshold, from_logits=True)
            sample_iou = iou_score(logits, target_tensor, threshold=best_threshold, from_logits=True)
            sample_prec = precision_score(logits, target_tensor, threshold=best_threshold, from_logits=True)
            sample_rec = recall_score(logits, target_tensor, threshold=best_threshold, from_logits=True)

            img_a = inputs[0:3, :, :].permute(1, 2, 0).cpu().numpy()
            img_b = inputs[3:6, :, :].permute(1, 2, 0).cpu().numpy()
            gt_mask_np = mask_gt[0].cpu().numpy()
            pred_mask_np = preds[0, 0].cpu().numpy()

            # Create Overlay
            overlay = img_b.copy()
            red_color = np.array([1.0, 0.0, 0.0])
            alpha = 0.45
            mask_boolean = pred_mask_np > 0.5
            overlay[mask_boolean] = (1 - alpha) * img_b[mask_boolean] + alpha * red_color

            # Panel 1: Image A
            axes[i, 0].imshow(img_a)
            axes[i, 0].set_title(f"Sample #{idx}: {fname}\nBefore (Image A)", fontsize=10, fontweight="bold")
            axes[i, 0].axis("off")

            # Panel 2: Image B
            axes[i, 1].imshow(img_b)
            axes[i, 1].set_title("After (Image B)", fontsize=10, fontweight="bold")
            axes[i, 1].axis("off")

            # Panel 3: Ground Truth Mask
            axes[i, 2].imshow(gt_mask_np, cmap="gray")
            axes[i, 2].set_title(f"Ground Truth Mask\n(Deforest: {gt_mask_np.mean()*100:.1f}%)", fontsize=10, fontweight="bold")
            axes[i, 2].axis("off")

            # Panel 4: Predicted Mask
            axes[i, 3].imshow(pred_mask_np, cmap="gray")
            axes[i, 3].set_title(f"Predicted Mask (t={best_threshold:.2f})\nDice: {sample_dice:.4f} | IoU: {sample_iou:.4f}", fontsize=10, fontweight="bold")
            axes[i, 3].axis("off")

            # Panel 5: Overlay
            axes[i, 4].imshow(overlay)
            axes[i, 4].set_title(f"After + Overlay\nPrec: {sample_prec:.2f} | Rec: {sample_rec:.2f}", fontsize=10, fontweight="bold")
            axes[i, 4].axis("off")

    plt.tight_layout()
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    plt.savefig(output_path, bbox_inches="tight")
    plt.close()
    print(f"[SUCCESS] Stage 2B validation visualization saved to '{output_path}'.")


if __name__ == "__main__":
    visualize_stage2b_predictions()
