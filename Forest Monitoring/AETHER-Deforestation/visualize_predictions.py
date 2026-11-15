"""
AETHER Deforestation Detection System — Validation Prediction Visualizer
==========================================================================

This script loads the best model checkpoint ('checkpoints/best_model.pth') and renders
a 5-panel side-by-side diagnostic visualization for representative validation samples:

Panels per sample:
1. Before Image (Image A)
2. After Image (Image B)
3. Ground Truth Deforestation Mask
4. Predicted Deforestation Mask (Probability >= 0.5)
5. After Image + Predicted Mask Red Overlay

Output saved to: outputs/validation_predictions.png

Author: AETHER EDI Team
"""

import os
import torch
import numpy as np
import matplotlib.pyplot as plt

from prepare_dataset import DeforestationDataset
from models.unet import UNet
from metrics import dice_score, iou_score


def visualize_val_predictions(
    checkpoint_path: str = "checkpoints/best_model.pth",
    output_path: str = "outputs/validation_predictions.png",
    sample_indices: list = [0, 5, 10]
):
    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"Checkpoint not found at '{checkpoint_path}'. Run train.py first.")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # 1. Load U-Net Model and Checkpoint Weights
    model = UNet(in_channels=6, out_channels=1).to(device)
    checkpoint = torch.load(checkpoint_path, map_location=device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    best_epoch = checkpoint.get("epoch", "N/A")
    val_dice_ckpt = checkpoint.get("validation_dice", 0.0)

    # 2. Load Validation Dataset
    val_dataset = DeforestationDataset(split="val", mode="concat", augment=False)
    
    num_samples = len(sample_indices)
    fig, axes = plt.subplots(num_samples, 5, figsize=(18, 3.8 * num_samples), dpi=150)
    
    if num_samples == 1:
        axes = np.expand_dims(axes, axis=0)

    plt.suptitle(
        f"AETHER U-Net Validation Predictions (Best Checkpoint Epoch {best_epoch} | Mean Val Dice: {val_dice_ckpt:.4f})\n"
        "*** SHORT VERIFICATION RUN RESULTS (5 Epochs) — NOT FINAL MODEL PERFORMANCE ***",
        fontsize=13, fontweight="bold", color="#c0392b", y=0.99
    )

    with torch.no_grad():
        for i, sample_idx in enumerate(sample_indices):
            idx = min(sample_idx, len(val_dataset) - 1)
            fname = val_dataset.filenames[idx]

            inputs, mask_gt = val_dataset[idx]  # inputs: [6, 480, 480], mask_gt: [1, 480, 480]

            # Prepare tensor for model forward pass
            input_tensor = inputs.unsqueeze(0).to(device)  # [1, 6, 480, 480]
            target_tensor = mask_gt.unsqueeze(0).to(device)  # [1, 1, 480, 480]

            logits = model(input_tensor)
            probs = torch.sigmoid(logits)
            preds = (probs >= 0.5).float()

            # Compute sample-level metrics
            sample_dice = dice_score(logits, target_tensor, threshold=0.5, from_logits=True)
            sample_iou = iou_score(logits, target_tensor, threshold=0.5, from_logits=True)

            # Convert Tensors to NumPy arrays for plotting
            img_a = inputs[0:3, :, :].permute(1, 2, 0).cpu().numpy()
            img_b = inputs[3:6, :, :].permute(1, 2, 0).cpu().numpy()
            gt_mask_np = mask_gt[0].cpu().numpy()
            pred_mask_np = preds[0, 0].cpu().numpy()

            # Create Red Overlay on Image B
            overlay = img_b.copy()
            red_color = np.array([1.0, 0.0, 0.0])  # Red RGB
            alpha = 0.45
            mask_boolean = pred_mask_np > 0.5
            overlay[mask_boolean] = (1 - alpha) * img_b[mask_boolean] + alpha * red_color

            # Panel 1: Image A (Before)
            axes[i, 0].imshow(img_a)
            axes[i, 0].set_title(f"Sample #{idx}: {fname}\nBefore (Image A)", fontsize=10, fontweight="bold")
            axes[i, 0].axis("off")

            # Panel 2: Image B (After)
            axes[i, 1].imshow(img_b)
            axes[i, 1].set_title("After (Image B)", fontsize=10, fontweight="bold")
            axes[i, 1].axis("off")

            # Panel 3: Ground Truth Mask
            axes[i, 2].imshow(gt_mask_np, cmap="gray")
            axes[i, 2].set_title(f"Ground Truth Mask\n(Deforest: {gt_mask_np.mean()*100:.1f}%)", fontsize=10, fontweight="bold")
            axes[i, 2].axis("off")

            # Panel 4: Predicted Mask
            axes[i, 3].imshow(pred_mask_np, cmap="gray")
            axes[i, 3].set_title(f"Predicted Mask (Prob >= 0.5)\nDice: {sample_dice:.4f} | IoU: {sample_iou:.4f}", fontsize=10, fontweight="bold")
            axes[i, 3].axis("off")

            # Panel 5: Overlay
            axes[i, 4].imshow(overlay)
            axes[i, 4].set_title("After + Prediction Overlay", fontsize=10, fontweight="bold")
            axes[i, 4].axis("off")

    plt.tight_layout()
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    plt.savefig(output_path, bbox_inches="tight")
    plt.close()
    print(f"[SUCCESS] Validation predictions visualization saved to '{output_path}'.")


if __name__ == "__main__":
    visualize_val_predictions()
