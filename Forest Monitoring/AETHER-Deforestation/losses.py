"""
AETHER Deforestation Detection System — Loss Functions
=====================================================

This module provides loss function implementations suitable for highly imbalanced binary
segmentation tasks such as deforestation detection (~4.51% positive deforestation pixels).

LOSS FUNCTIONS INCLUDED:
1. DiceLoss: Focuses on region overlap (intersection / union), resilient to class imbalance.
2. BCEDiceLoss (Combined Loss): Sum of BCEWithLogitsLoss and DiceLoss. Provides stable gradient
   flow from BCE alongside boundary/overlap accuracy from Dice.

Author: AETHER EDI Team
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class DiceLoss(nn.Module):
    """
    Soft Dice Loss for Binary Image Segmentation.

    Formula:
        Dice Coefficient = (2 * |P ∩ T| + eps) / (|P| + |T| + eps)
        Dice Loss        = 1 - Dice Coefficient

    where:
        P = Sigmoid(logits) -> predicted probabilities in range [0, 1]
        T = ground truth binary mask tensor in range {0, 1}
        eps = smoothing factor to prevent division by zero
    """

    def __init__(self, smooth: float = 1e-7):
        """
        Args:
            smooth (float): Small constant to avoid division by zero.
        """
        super(DiceLoss, self).__init__()
        self.smooth = smooth

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        """
        Compute Dice Loss.

        Args:
            logits (torch.Tensor): Raw model outputs before sigmoid activation, shape [B, 1, H, W]
            targets (torch.Tensor): Binary ground truth mask, shape [B, 1, H, W]

        Returns:
            torch.Tensor: Scalar Dice loss value
        """
        # Apply Sigmoid to convert raw logits to probabilities [0.0, 1.0]
        probs = torch.sigmoid(logits)

        # Flatten predictions and targets to vectors [B, N] for batch-wise or overall reduction
        probs_flat = probs.view(-1)
        targets_flat = targets.view(-1)

        # Intersection = sum(probs * targets)
        intersection = (probs_flat * targets_flat).sum()

        # Dice score calculation
        dice_score = (2.0 * intersection + self.smooth) / (
            probs_flat.sum() + targets_flat.sum() + self.smooth
        )

        # Loss is 1 - Dice score
        return 1.0 - dice_score


class BCEDiceLoss(nn.Module):
    """
    Combined Binary Cross Entropy + Dice Loss.

    Formula:
        Combined Loss = bce_weight * BCEWithLogitsLoss + dice_weight * DiceLoss

    Why use Combined Loss?
    - BCE provides smooth gradient updates across all pixels.
    - Dice Loss mitigates severe class imbalance (e.g. 4.51% deforestation pixels vs 95.49% background).
    """

    def __init__(self, bce_weight: float = 1.0, dice_weight: float = 1.0, smooth: float = 1e-7):
        """
        Args:
            bce_weight (float): Multiplier for BCE loss component.
            dice_weight (float): Multiplier for Dice loss component.
            smooth (float): Epsilon smoothing factor for Dice loss.
        """
        super(BCEDiceLoss, self).__init__()
        self.bce_weight = bce_weight
        self.dice_weight = dice_weight
        self.bce = nn.BCEWithLogitsLoss()
        self.dice = DiceLoss(smooth=smooth)

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        """
        Compute combined BCE + Dice loss.

        Args:
            logits (torch.Tensor): Raw model outputs [B, 1, H, W]
            targets (torch.Tensor): Binary target masks [B, 1, H, W]

        Returns:
            torch.Tensor: Scalar combined loss
        """
        bce_loss = self.bce(logits, targets)
        dice_loss = self.dice(logits, targets)

        combined_loss = (self.bce_weight * bce_loss) + (self.dice_weight * dice_loss)
        return combined_loss


# Standard PyTorch BCEWithLogitsLoss alias for convenience
BCEWithLogitsLoss = nn.BCEWithLogitsLoss


if __name__ == "__main__":
    print("=" * 60)
    print("TESTING LOSS FUNCTIONS")
    print("=" * 60)

    # Dummy inputs: Batch of 2 images of size 480x480
    dummy_logits = torch.randn(2, 1, 480, 480, requires_grad=True)
    dummy_targets = (torch.rand(2, 1, 480, 480) > 0.95).float()

    dice_fn = DiceLoss()
    bce_fn = BCEWithLogitsLoss()
    combined_fn = BCEDiceLoss()

    l_dice = dice_fn(dummy_logits, dummy_targets)
    l_bce = bce_fn(dummy_logits, dummy_targets)
    l_comb = combined_fn(dummy_logits, dummy_targets)

    print(f"Dice Loss:       {l_dice.item():.4f}")
    print(f"BCE Loss:        {l_bce.item():.4f}")
    print(f"Combined Loss:   {l_comb.item():.4f}")

    # Backward pass verification
    l_comb.backward()
    print(f"Gradient status: {dummy_logits.grad is not None and dummy_logits.grad.abs().sum() > 0}")
    print("[SUCCESS] Loss functions verified!")
