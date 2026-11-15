"""
AETHER Deforestation Detection System — U-Net Training Pipeline (Stage 2A)
============================================================================

This script implements a complete, beginner-friendly PyTorch training pipeline for
the 6-channel Early-Fusion U-Net model.

PIPELINE STAGES:
1. Device Auto-Detection (CUDA GPU / CPU) & Random Seed Setup (seed=42)
2. DataLoader Initialization (Train=270, Val=31, Test=33 untouched)
3. Model, Loss (BCEDiceLoss), and Optimizer (Adam lr=1e-4) Setup
4. 5-Epoch Controlled Training & Validation Loop
5. Model Checkpointing (best_model.pth & last_model.pth)
6. Metrics Logging to CSV (outputs/training_history.csv)
7. All-Background Collapse Sanity Check

Author: AETHER EDI Team
"""

import os
import csv
import time
import random
import numpy as np
import torch
import torch.nn as nn

# Local Module Imports
from prepare_dataset import get_deforestation_dataloaders
from models.unet import UNet
from losses import BCEDiceLoss
from metrics import dice_score, iou_score, precision_score, recall_score


# -----------------------------------------------------------------------------
# 1. HARDWARE SELECTION & REPRODUCIBILITY SEED
# -----------------------------------------------------------------------------
def set_seed(seed: int = 42):
    """Set random seed across Python, NumPy, PyTorch CPU & CUDA for reproducibility."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False


def detect_device() -> torch.device:
    """Auto-detect CUDA GPU vs CPU and print system memory details."""
    if torch.cuda.is_available():
        device = torch.device("cuda")
        print(f"Device: CUDA ({torch.cuda.get_device_name(0)})")
        vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
        print(f"GPU Memory: {vram_gb:.2f} GB")
    else:
        device = torch.device("cpu")
        print("Device: CPU (CUDA not detected)")
    return device


# -----------------------------------------------------------------------------
# 2. MAIN TRAINING FUNCTION
# -----------------------------------------------------------------------------
def run_training_pipeline(num_epochs: int = 5, batch_size: int = 2, learning_rate: float = 1e-4):
    print("=" * 70)
    print("AETHER STAGE 2A — U-NET TRAINING PIPELINE (5-EPOCH VERIFICATION)")
    print("=" * 70)

    # Set Reproducibility Seed
    SEED = 42
    set_seed(SEED)
    print(f"Reproducibility Seed set to: {SEED}")

    # Detect Device
    device = detect_device()

    # Create Directories for Output Artifacts and Checkpoints
    os.makedirs("checkpoints", exist_ok=True)
    os.makedirs("outputs", exist_ok=True)

    # -------------------------------------------------------------------------
    # DataLoader Preparation
    # -------------------------------------------------------------------------
    print("\n[STEP 1] Loading DataLoaders...")
    train_loader, val_loader, test_loader = get_deforestation_dataloaders(
        batch_size=batch_size,
        mode="concat",
        augment_train=True
    )
    print(f"  Train samples:      {len(train_loader.dataset)} (270 expected)")
    print(f"  Validation samples: {len(val_loader.dataset)} (31 expected)")
    print(f"  Test samples:       {len(test_loader.dataset)} (33 expected - UNTOUCHED)")

    # -------------------------------------------------------------------------
    # Model, Loss, Optimizer Initialization
    # -------------------------------------------------------------------------
    print("\n[STEP 2] Initializing U-Net, Loss, and Optimizer...")
    model = UNet(in_channels=6, out_channels=1).to(device)
    param_count = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"  U-Net Model Parameters: {param_count:,}")

    criterion = BCEDiceLoss(bce_weight=1.0, dice_weight=1.0)
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
    print(f"  Loss Function: BCEDiceLoss (BCE + Dice)")
    print(f"  Optimizer: Adam (lr={learning_rate})")

    # Tracking Variables
    best_val_dice = -1.0
    history = []
    start_time = time.time()

    # -------------------------------------------------------------------------
    # 5-Epoch Controlled Training & Validation Loop
    # -------------------------------------------------------------------------
    print(f"\n[STEP 3] Beginning {num_epochs}-Epoch Controlled Verification Run...")

    for epoch in range(1, num_epochs + 1):
        epoch_start = time.time()

        # =====================================================================
        # TRAINING PHASE
        # =====================================================================
        model.train()
        train_loss_accum = 0.0
        train_batches = 0

        for inputs, masks in train_loader:
            inputs = inputs.to(device)  # Shape [B, 6, 480, 480]
            masks = masks.to(device)    # Shape [B, 1, 480, 480]

            optimizer.zero_grad()
            logits = model(inputs)
            loss = criterion(logits, masks)
            loss.backward()
            optimizer.step()

            train_loss_accum += loss.item()
            train_batches += 1

        avg_train_loss = train_loss_accum / train_batches

        # =====================================================================
        # VALIDATION PHASE
        # =====================================================================
        model.eval()
        val_loss_accum = 0.0
        val_dice_accum = 0.0
        val_iou_accum = 0.0
        val_prec_accum = 0.0
        val_rec_accum = 0.0
        val_batches = 0

        # Accumulators for positive pixel collapse check
        total_gt_pixels = 0
        total_gt_pos_pixels = 0
        total_pred_pos_pixels = 0

        with torch.no_grad():
            for inputs, masks in val_loader:
                inputs = inputs.to(device)
                masks = masks.to(device)

                logits = model(inputs)
                loss = criterion(logits, masks)

                val_loss_accum += loss.item()

                # Calculate Metrics per batch
                d_score = dice_score(logits, masks, threshold=0.5, from_logits=True)
                i_score = iou_score(logits, masks, threshold=0.5, from_logits=True)
                p_score = precision_score(logits, masks, threshold=0.5, from_logits=True)
                r_score = recall_score(logits, masks, threshold=0.5, from_logits=True)

                val_dice_accum += d_score
                val_iou_accum += i_score
                val_prec_accum += p_score
                val_rec_accum += r_score
                val_batches += 1

                # Track positive pixel counts
                probs = torch.sigmoid(logits)
                preds = (probs >= 0.5).float()

                total_gt_pixels += masks.numel()
                total_gt_pos_pixels += int(masks.sum().item())
                total_pred_pos_pixels += int(preds.sum().item())

        avg_val_loss = val_loss_accum / val_batches
        avg_val_dice = val_dice_accum / val_batches
        avg_val_iou = val_iou_accum / val_batches
        avg_val_prec = val_prec_accum / val_batches
        avg_val_rec = val_rec_accum / val_batches

        epoch_time = time.time() - epoch_start

        print(f"\nEpoch {epoch}/{num_epochs} ({epoch_time:.1f}s)")
        print(f"  Train Loss:   {avg_train_loss:.4f}")
        print(f"  Val Loss:     {avg_val_loss:.4f}")
        print(f"  Val Dice:     {avg_val_dice:.4f}")
        print(f"  Val IoU:      {avg_val_iou:.4f}")
        print(f"  Val Precision:{avg_val_prec:.4f}")
        print(f"  Val Recall:   {avg_val_rec:.4f}")
        print(f"  Learning Rate:{learning_rate:.6f}")

        # Store History Record
        history.append({
            "epoch": epoch,
            "train_loss": round(avg_train_loss, 4),
            "val_loss": round(avg_val_loss, 4),
            "val_dice": round(avg_val_dice, 4),
            "val_iou": round(avg_val_iou, 4),
            "val_precision": round(avg_val_prec, 4),
            "val_recall": round(avg_val_rec, 4),
            "learning_rate": learning_rate
        })

        # ---------------------------------------------------------------------
        # Checkpointing
        # ---------------------------------------------------------------------
        checkpoint_dict = {
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "validation_loss": avg_val_loss,
            "validation_dice": avg_val_dice,
            "validation_iou": avg_val_iou,
            "validation_precision": avg_val_prec,
            "validation_recall": avg_val_rec,
        }

        # Save Last Model Checkpoint
        torch.save(checkpoint_dict, os.path.join("checkpoints", "last_model.pth"))

        # Save Best Model Checkpoint if Validation Dice Improves
        if avg_val_dice > best_val_dice:
            best_val_dice = avg_val_dice
            torch.save(checkpoint_dict, os.path.join("checkpoints", "best_model.pth"))
            print(f"  [*] Best Model Checkpoint Saved! (Val Dice: {best_val_dice:.4f})")

    total_training_time = time.time() - start_time
    print(f"\nTraining finished in {total_training_time:.1f} seconds.")

    # -------------------------------------------------------------------------
    # 4. SAVE TRAINING HISTORY TO CSV
    # -------------------------------------------------------------------------
    csv_path = os.path.join("outputs", "training_history.csv")
    print(f"\n[STEP 4] Writing training history to '{csv_path}'...")
    fieldnames = ["epoch", "train_loss", "val_loss", "val_dice", "val_iou", "val_precision", "val_recall", "learning_rate"]
    
    with open(csv_path, mode="w", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()
        for row in history:
            writer.writerow(row)
    print("  Training history saved successfully!")

    # -------------------------------------------------------------------------
    # 5. ALL-BACKGROUND COLLAPSE SANITY CHECK
    # -------------------------------------------------------------------------
    print("\n[STEP 5] Running All-Background Collapse Sanity Check...")
    gt_pos_pct = (total_gt_pos_pixels / total_gt_pixels) * 100.0
    pred_pos_pct = (total_pred_pos_pixels / total_gt_pixels) * 100.0

    print(f"  Total Validation Pixels Analyzed: {total_gt_pixels:,}")
    print(f"  Ground Truth Positive Pixels:      {total_gt_pos_pixels:,} ({gt_pos_pct:.2f}%)")
    print(f"  Predicted Positive Pixels:         {total_pred_pos_pixels:,} ({pred_pos_pct:.2f}%)")

    collapse_detected = pred_pos_pct < 0.05
    if collapse_detected:
        print("\n  [WARNING] Potential all-background collapse detected! Predicted positive ratio is ~0%.")
    else:
        print(f"\n  [PASS] No all-background collapse detected. Model predicted {pred_pos_pct:.2f}% positive deforestation pixels.")

    print("\n" + "=" * 70)
    print("STAGE 2A SHORT TRAINING VERIFICATION COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    run_training_pipeline(num_epochs=5, batch_size=2, learning_rate=1e-4)
