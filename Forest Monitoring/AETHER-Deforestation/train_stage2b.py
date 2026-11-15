"""
AETHER Deforestation Detection System — Stage 2B Training Pipeline
===================================================================

Full multi-epoch U-Net training and validation optimization.

Key Features:
- Seed=42 for exact reproducibility.
- Max Epochs = 50 with Early Stopping (patience=8 monitoring Validation Dice).
- ReduceLROnPlateau scheduler (mode='max', factor=0.5, patience=3, min_lr=1e-6).
- BCEDiceLoss (BCE + Dice equal weighting).
- Synchronized spatial augmentation (flips & 90-degree rotations) for Train split.
- Monitors predicted positive pixel percentage per epoch (ground truth ~4.51%).
- Persists checkpoints: checkpoints/stage2b/best_model.pth & last_model.pth.
- Persists history: outputs/training_history_stage2b.csv.
- Renders training curves: outputs/stage2b_training_curves.png.

Author: AETHER EDI Team
"""

import os
import csv
import time
import random
import numpy as np
import torch
import torch.nn as nn
import matplotlib.pyplot as plt

# Local Module Imports
from prepare_dataset import get_deforestation_dataloaders
from models.unet import UNet
from losses import BCEDiceLoss
from metrics import dice_score, iou_score, precision_score, recall_score


def set_seed(seed: int = 42):
    """Set random seed across Python, NumPy, PyTorch CPU & CUDA."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False


def detect_device() -> torch.device:
    """Auto-detect CUDA GPU vs CPU."""
    if torch.cuda.is_available():
        device = torch.device("cuda")
        print(f"Device: CUDA ({torch.cuda.get_device_name(0)})")
    else:
        device = torch.device("cpu")
        print("Device: CPU")
    return device


def plot_stage2b_curves(csv_path: str, output_path: str):
    """Renders 4-panel training diagnostic curves from CSV."""
    epochs, train_loss, val_loss = [], [], []
    val_dice, val_iou, val_prec, val_rec = [], [], [], []
    lr_list, pred_pos_list = [], []

    with open(csv_path, mode="r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            epochs.append(int(row["epoch"]))
            train_loss.append(float(row["train_loss"]))
            val_loss.append(float(row["val_loss"]))
            val_dice.append(float(row["val_dice"]))
            val_iou.append(float(row["val_iou"]))
            val_prec.append(float(row["val_precision"]))
            val_rec.append(float(row["val_recall"]))
            lr_list.append(float(row["learning_rate"]))
            pred_pos_list.append(float(row["predicted_positive_percent"]))

    fig, axes = plt.subplots(2, 2, figsize=(14, 10), dpi=150)
    fig.suptitle("AETHER U-Net Stage 2B Full Training & Optimization Curves", fontsize=14, fontweight="bold", y=0.98)

    # Panel 1: Loss Curves
    axes[0, 0].plot(epochs, train_loss, 'o-', color='#e74c3c', linewidth=2, label="Train Loss (BCEDice)")
    axes[0, 0].plot(epochs, val_loss, 's--', color='#3498db', linewidth=2, label="Val Loss (BCEDice)")
    axes[0, 0].set_title("Loss Progression", fontsize=11, fontweight="bold")
    axes[0, 0].set_xlabel("Epoch")
    axes[0, 0].set_ylabel("Loss")
    axes[0, 0].grid(True, linestyle="--", alpha=0.6)
    axes[0, 0].legend()

    # Panel 2: Val Dice vs IoU
    axes[0, 1].plot(epochs, val_dice, '^-', color='#2ecc71', linewidth=2, label="Val Dice (F1)")
    axes[0, 1].plot(epochs, val_iou, 'd--', color='#9b59b6', linewidth=2, label="Val IoU (Jaccard)")
    axes[0, 1].set_title("Validation Segmentation Performance", fontsize=11, fontweight="bold")
    axes[0, 1].set_xlabel("Epoch")
    axes[0, 1].set_ylabel("Score [0.0 - 1.0]")
    axes[0, 1].set_ylim(0, 1.0)
    axes[0, 1].grid(True, linestyle="--", alpha=0.6)
    axes[0, 1].legend()

    # Panel 3: Val Precision vs Recall
    axes[1, 0].plot(epochs, val_prec, 'o-', color='#f39c12', linewidth=2, label="Val Precision")
    axes[1, 0].plot(epochs, val_rec, 's--', color='#16a085', linewidth=2, label="Val Recall")
    axes[1, 0].set_title("Validation Precision vs Recall", fontsize=11, fontweight="bold")
    axes[1, 0].set_xlabel("Epoch")
    axes[1, 0].set_ylabel("Score [0.0 - 1.0]")
    axes[1, 0].set_ylim(0, 1.0)
    axes[1, 0].grid(True, linestyle="--", alpha=0.6)
    axes[1, 0].legend()

    # Panel 4: Learning Rate Progression
    axes[1, 1].plot(epochs, lr_list, 'x-', color='#e67e22', linewidth=2, label="Learning Rate")
    axes[1, 1].set_title("Learning Rate Schedule (ReduceLROnPlateau)", fontsize=11, fontweight="bold")
    axes[1, 1].set_xlabel("Epoch")
    axes[1, 1].set_ylabel("Learning Rate")
    axes[1, 1].set_yscale("log")
    axes[1, 1].grid(True, linestyle="--", alpha=0.6)
    axes[1, 1].legend()

    plt.tight_layout()
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    plt.savefig(output_path)
    plt.close()
    print(f"[SUCCESS] Training curves plot saved to '{output_path}'.")


def run_stage2b_training(
    max_epochs: int = 50,
    batch_size: int = 2,
    initial_lr: float = 1e-4,
    early_stopping_patience: int = 8,
    seed: int = 42
):
    print("=" * 70)
    print("AETHER STAGE 2B — FULL U-NET TRAINING & VALIDATION OPTIMIZATION")
    print("=" * 70)

    set_seed(seed)
    device = detect_device()

    ckpt_dir = os.path.join("checkpoints", "stage2b")
    out_dir = "outputs"
    os.makedirs(ckpt_dir, exist_ok=True)
    os.makedirs(out_dir, exist_ok=True)

    csv_path = os.path.join(out_dir, "training_history_stage2b.csv")
    plot_path = os.path.join(out_dir, "stage2b_training_curves.png")

    print("\n[1/5] Loading DataLoaders...")
    train_loader, val_loader, test_loader = get_deforestation_dataloaders(
        batch_size=batch_size,
        mode="concat",
        augment_train=True
    )
    print(f"  Train samples: {len(train_loader.dataset)} (augmented)")
    print(f"  Val samples:   {len(val_loader.dataset)} (unaugmented)")
    print(f"  Test samples:  {len(test_loader.dataset)} (LOCKED & UNTOUCHED)")

    print("\n[2/5] Initializing U-Net Model, Loss, Optimizer & Scheduler...")
    model = UNet(in_channels=6, out_channels=1).to(device)
    param_count = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"  Trainable Parameters: {param_count:,}")

    criterion = BCEDiceLoss(bce_weight=1.0, dice_weight=1.0)
    optimizer = torch.optim.Adam(model.parameters(), lr=initial_lr)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer,
        mode="max",
        factor=0.5,
        patience=3,
        min_lr=1e-6
    )

    best_val_dice = -1.0
    best_epoch = 0
    patience_counter = 0
    stopping_reason = f"Completed maximum {max_epochs} epochs"
    history = []

    # Calculate Ground-Truth Positive % on Validation Set once
    val_gt_pixels = 0
    val_total_pixels = 0
    with torch.no_grad():
        for _, masks in val_loader:
            val_gt_pixels += masks.sum().item()
            val_total_pixels += masks.numel()
    gt_pos_pct = (val_gt_pixels / val_total_pixels) * 100.0
    print(f"  Validation Ground-Truth Positive Pixels: {gt_pos_pct:.2f}% (~4.51% expected)")

    # Prepare CSV Header
    with open(csv_path, mode="w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "epoch", "train_loss", "val_loss", "val_dice", "val_iou",
            "val_precision", "val_recall", "learning_rate", "predicted_positive_percent"
        ])

    print("\n[3/5] Starting Training Loop...")
    start_time = time.time()

    for epoch in range(1, max_epochs + 1):
        epoch_start = time.time()

        # --- TRAINING PHASE ---
        model.train()
        train_loss_accum = 0.0
        train_batches = 0

        for inputs, masks in train_loader:
            inputs, masks = inputs.to(device), masks.to(device)
            optimizer.zero_grad()
            logits = model(inputs)
            loss = criterion(logits, masks)
            loss.backward()
            optimizer.step()

            train_loss_accum += loss.item()
            train_batches += 1

        avg_train_loss = train_loss_accum / train_batches

        # --- VALIDATION PHASE ---
        model.eval()
        val_loss_accum = 0.0
        val_dice_accum = 0.0
        val_iou_accum = 0.0
        val_prec_accum = 0.0
        val_rec_accum = 0.0
        val_pred_pos_pixels = 0
        val_batches = 0

        with torch.no_grad():
            for inputs, masks in val_loader:
                inputs, masks = inputs.to(device), masks.to(device)
                logits = model(inputs)
                loss = criterion(logits, masks)

                val_loss_accum += loss.item()
                val_dice_accum += float(dice_score(logits, masks, threshold=0.5, from_logits=True))
                val_iou_accum += float(iou_score(logits, masks, threshold=0.5, from_logits=True))
                val_prec_accum += float(precision_score(logits, masks, threshold=0.5, from_logits=True))
                val_rec_accum += float(recall_score(logits, masks, threshold=0.5, from_logits=True))

                probs = torch.sigmoid(logits)
                preds = (probs >= 0.5).float()
                val_pred_pos_pixels += preds.sum().item()
                val_batches += 1

        avg_val_loss = val_loss_accum / val_batches
        avg_val_dice = val_dice_accum / val_batches
        avg_val_iou = val_iou_accum / val_batches
        avg_val_prec = val_prec_accum / val_batches
        avg_val_rec = val_rec_accum / val_batches
        pred_pos_pct = (val_pred_pos_pixels / val_total_pixels) * 100.0

        current_lr = optimizer.param_groups[0]["lr"]

        # Step Scheduler
        scheduler.step(avg_val_dice)

        epoch_time = time.time() - epoch_start
        print(
            f"Epoch {epoch:02d}/{max_epochs:02d} [{epoch_time:.1f}s] | "
            f"Train Loss: {avg_train_loss:.4f} | Val Loss: {avg_val_loss:.4f} | "
            f"Val Dice: {avg_val_dice:.4f} | Val IoU: {avg_val_iou:.4f} | "
            f"Val Prec: {avg_val_prec:.4f} | Val Rec: {avg_val_rec:.4f} | "
            f"Pred Pos %: {pred_pos_pct:.2f}% | LR: {current_lr:.1e}"
        )

        if pred_pos_pct < 0.01:
            print("  [WARNING] Potential all-background collapse detected! Predicted positive % is near 0.")

        # Record History to CSV
        with open(csv_path, mode="a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                epoch, f"{avg_train_loss:.4f}", f"{avg_val_loss:.4f}",
                f"{avg_val_dice:.4f}", f"{avg_val_iou:.4f}", f"{avg_val_prec:.4f}",
                f"{avg_val_rec:.4f}", f"{current_lr:.1e}", f"{pred_pos_pct:.2f}"
            ])

        # Checkpoint Management
        best_ckpt_path = os.path.join(ckpt_dir, "best_model.pth")
        last_ckpt_path = os.path.join(ckpt_dir, "last_model.pth")

        checkpoint_dict = {
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "scheduler_state_dict": scheduler.state_dict(),
            "validation_loss": avg_val_loss,
            "validation_dice": avg_val_dice,
            "validation_iou": avg_val_iou,
            "validation_precision": avg_val_prec,
            "validation_recall": avg_val_rec,
            "learning_rate": current_lr,
            "predicted_positive_percent": pred_pos_pct
        }

        # Save Last Checkpoint
        torch.save(checkpoint_dict, last_ckpt_path)

        # Check for Best Validation Dice
        if avg_val_dice > best_val_dice:
            best_val_dice = avg_val_dice
            best_epoch = epoch
            patience_counter = 0
            torch.save(checkpoint_dict, best_ckpt_path)
            print(f"  >>> Best model saved! (Val Dice: {best_val_dice:.4f} at Epoch {epoch})")
        else:
            patience_counter += 1
            print(f"  ... Val Dice did not improve. (Patience: {patience_counter}/{early_stopping_patience})")

        # Early Stopping Check
        if patience_counter >= early_stopping_patience:
            stopping_reason = f"Early stopping triggered (no Val Dice improvement for {early_stopping_patience} consecutive epochs)"
            print(f"\n[EARLY STOPPING] {stopping_reason}")
            break

    total_training_time = time.time() - start_time
    completed_epochs = len(open(csv_path).readlines()) - 1

    print("\n[4/5] Training Complete!")
    print(f"  Total Duration:      {total_training_time:.2f} seconds ({total_training_time/60:.2f} minutes)")
    print(f"  Epochs Completed:    {completed_epochs}")
    print(f"  Stopping Reason:     {stopping_reason}")
    print(f"  Best Epoch:          {best_epoch}")
    print(f"  Best Validation Dice: {best_val_dice:.4f}")

    print("\n[5/5] Generating Diagnostic Training Curves...")
    plot_stage2b_curves(csv_path, plot_path)


if __name__ == "__main__":
    run_stage2b_training()
