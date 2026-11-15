"""
AETHER Deforestation Detection System — Plot Training Curves
=============================================================

This script parses 'outputs/training_history.csv' and renders publication-quality
training curves for Loss (Train vs Val) and Metrics (Val Dice & Val IoU).

Output artifact saved to: outputs/training_curves.png

Author: AETHER EDI Team
"""

import os
import csv
import matplotlib.pyplot as plt


def plot_curves(csv_path: str = "outputs/training_history.csv", output_path: str = "outputs/training_curves.png"):
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Training history CSV not found at '{csv_path}'. Run train.py first.")

    epochs = []
    train_loss = []
    val_loss = []
    val_dice = []
    val_iou = []

    with open(csv_path, mode="r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            epochs.append(int(row["epoch"]))
            train_loss.append(float(row["train_loss"]))
            val_loss.append(float(row["val_loss"]))
            val_dice.append(float(row["val_dice"]))
            val_iou.append(float(row["val_iou"]))

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5), dpi=150)
    fig.suptitle("AETHER U-Net Stage 2A Verification Curves (5-Epoch Run)", fontsize=14, fontweight="bold", y=0.98)

    # 1. Plot Loss (Train vs Validation)
    ax1.plot(epochs, train_loss, 'o-', color='#e74c3c', linewidth=2, label="Train BCEDice Loss")
    ax1.plot(epochs, val_loss, 's--', color='#3498db', linewidth=2, label="Val BCEDice Loss")
    ax1.set_title("Training vs Validation Loss", fontsize=12, fontweight="bold")
    ax1.set_xlabel("Epoch", fontsize=11)
    ax1.set_ylabel("Loss", fontsize=11)
    ax1.set_xticks(epochs)
    ax1.grid(True, linestyle="--", alpha=0.6)
    ax1.legend(loc="upper right", frameon=True)

    # 2. Plot Validation Metrics (Dice & IoU)
    ax2.plot(epochs, val_dice, '^-', color='#2ecc71', linewidth=2, label="Val Dice Score (F1)")
    ax2.plot(epochs, val_iou, 'd--', color='#9b59b6', linewidth=2, label="Val IoU Score (Jaccard)")
    ax2.set_title("Validation Segmentation Metrics", fontsize=12, fontweight="bold")
    ax2.set_xlabel("Epoch", fontsize=11)
    ax2.set_ylabel("Score [0.0 - 1.0]", fontsize=11)
    ax2.set_xticks(epochs)
    ax2.set_ylim(0, 1.0)
    ax2.grid(True, linestyle="--", alpha=0.6)
    ax2.legend(loc="lower right", frameon=True)

    plt.tight_layout()
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    plt.savefig(output_path)
    plt.close()
    print(f"[SUCCESS] Training curves figure generated and saved to '{output_path}'.")


if __name__ == "__main__":
    plot_curves()
