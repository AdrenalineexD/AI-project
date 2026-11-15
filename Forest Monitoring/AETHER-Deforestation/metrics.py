"""
AETHER Deforestation Detection System — Evaluation Metrics
==========================================================

This module implements evaluation metrics for binary segmentation performance:
1. Dice Coefficient (F1 Score for segmentation overlap)
2. Intersection over Union (IoU / Jaccard Index)

FORMULAS:
- Dice = (2 * Intersection) / (Pred_Positive + Target_Positive + eps)
- IoU  = Intersection / (Union + eps) = Intersection / (Pred_Positive + Target_Positive - Intersection + eps)

Author: AETHER EDI Team
"""

import torch


def dice_score(
    preds: torch.Tensor,
    targets: torch.Tensor,
    threshold: float = 0.5,
    from_logits: bool = True,
    eps: float = 1e-7
) -> float:
    """
    Calculate the Dice Coefficient (F1 Score) for binary segmentation.

    Args:
        preds (torch.Tensor): Model outputs (raw logits if from_logits=True, or probabilities).
        targets (torch.Tensor): Binary ground-truth mask tensor {0, 1}.
        threshold (float): Probability threshold for binarizing predictions (default: 0.5).
        from_logits (bool): If True, applies sigmoid activation before thresholding (default: True).
        eps (float): Small epsilon to prevent division by zero (default: 1e-7).

    Returns:
        float: Dice score value in range [0.0, 1.0].
    """
    with torch.no_grad():
        if from_logits:
            probs = torch.sigmoid(preds)
        else:
            probs = preds

        # Binarize predictions
        binary_preds = (probs >= threshold).float()
        targets_binary = (targets >= threshold).float()

        # Flatten tensors
        p_flat = binary_preds.view(-1)
        t_flat = targets_binary.view(-1)

        # Intersection and sum
        intersection = (p_flat * t_flat).sum()
        total = p_flat.sum() + t_flat.sum()

        dice = (2.0 * intersection + eps) / (total + eps)
        return float(dice.item())


def iou_score(
    preds: torch.Tensor,
    targets: torch.Tensor,
    threshold: float = 0.5,
    from_logits: bool = True,
    eps: float = 1e-7
) -> float:
    """
    Calculate Intersection over Union (IoU / Jaccard Index) for binary segmentation.

    Args:
        preds (torch.Tensor): Model outputs (raw logits if from_logits=True, or probabilities).
        targets (torch.Tensor): Binary ground-truth mask tensor {0, 1}.
        threshold (float): Probability threshold for binarizing predictions (default: 0.5).
        from_logits (bool): If True, applies sigmoid activation before thresholding (default: True).
        eps (float): Small epsilon to prevent division by zero (default: 1e-7).

    Returns:
        float: IoU score value in range [0.0, 1.0].
    """
    with torch.no_grad():
        if from_logits:
            probs = torch.sigmoid(preds)
        else:
            probs = preds

        binary_preds = (probs >= threshold).float()
        targets_binary = (targets >= threshold).float()

        p_flat = binary_preds.view(-1)
        t_flat = targets_binary.view(-1)

        intersection = (p_flat * t_flat).sum()
        union = p_flat.sum() + t_flat.sum() - intersection

        iou = (intersection + eps) / (union + eps)
        return float(iou.item())


def precision_score(
    preds: torch.Tensor,
    targets: torch.Tensor,
    threshold: float = 0.5,
    from_logits: bool = True,
    eps: float = 1e-7
) -> float:
    """
    Calculate Precision (True Positives / (True Positives + False Positives)).

    Args:
        preds (torch.Tensor): Model outputs (raw logits if from_logits=True, or probabilities).
        targets (torch.Tensor): Binary ground-truth mask tensor {0, 1}.
        threshold (float): Threshold for binarization (default: 0.5).
        from_logits (bool): If True, applies sigmoid activation (default: True).
        eps (float): Epsilon smoothing factor (default: 1e-7).

    Returns:
        float: Precision score value in range [0.0, 1.0].
    """
    with torch.no_grad():
        if from_logits:
            probs = torch.sigmoid(preds)
        else:
            probs = preds

        binary_preds = (probs >= threshold).float()
        targets_binary = (targets >= threshold).float()

        p_flat = binary_preds.view(-1)
        t_flat = targets_binary.view(-1)

        tp = (p_flat * t_flat).sum()
        fp = (p_flat * (1.0 - t_flat)).sum()

        precision = (tp + eps) / (tp + fp + eps)
        return float(precision.item())


def recall_score(
    preds: torch.Tensor,
    targets: torch.Tensor,
    threshold: float = 0.5,
    from_logits: bool = True,
    eps: float = 1e-7
) -> float:
    """
    Calculate Recall / Sensitivity (True Positives / (True Positives + False Negatives)).

    Args:
        preds (torch.Tensor): Model outputs (raw logits if from_logits=True, or probabilities).
        targets (torch.Tensor): Binary ground-truth mask tensor {0, 1}.
        threshold (float): Threshold for binarization (default: 0.5).
        from_logits (bool): If True, applies sigmoid activation (default: True).
        eps (float): Epsilon smoothing factor (default: 1e-7).

    Returns:
        float: Recall score value in range [0.0, 1.0].
    """
    with torch.no_grad():
        if from_logits:
            probs = torch.sigmoid(preds)
        else:
            probs = preds

        binary_preds = (probs >= threshold).float()
        targets_binary = (targets >= threshold).float()

        p_flat = binary_preds.view(-1)
        t_flat = targets_binary.view(-1)

        tp = (p_flat * t_flat).sum()
        fn = ((1.0 - p_flat) * t_flat).sum()

        recall = (tp + eps) / (tp + fn + eps)
        return float(recall.item())


if __name__ == "__main__":
    print("=" * 60)
    print("TESTING METRICS IMPLEMENTATION (DICE, IOU, PRECISION, RECALL)")
    print("=" * 60)

    # Perfect match test
    target_mask = torch.tensor([[[[1.0, 0.0], [0.0, 1.0]]]])
    logits_perfect = torch.tensor([[[[10.0, -10.0], [-10.0, 10.0]]]])  # High confidence

    d_perfect = dice_score(logits_perfect, target_mask)
    i_perfect = iou_score(logits_perfect, target_mask)
    p_perfect = precision_score(logits_perfect, target_mask)
    r_perfect = recall_score(logits_perfect, target_mask)

    print(f"Perfect match -> Dice: {d_perfect:.4f}, IoU: {i_perfect:.4f}, Prec: {p_perfect:.4f}, Rec: {r_perfect:.4f}")
    assert abs(d_perfect - 1.0) < 1e-4 and abs(i_perfect - 1.0) < 1e-4

    # Complete mismatch test
    logits_opposite = torch.tensor([[[[-10.0, 10.0], [10.0, -10.0]]]])

    d_mismatch = dice_score(logits_opposite, target_mask)
    i_mismatch = iou_score(logits_opposite, target_mask)
    p_mismatch = precision_score(logits_opposite, target_mask)
    r_mismatch = recall_score(logits_opposite, target_mask)

    print(f"Complete mismatch -> Dice: {d_mismatch:.4f}, IoU: {i_mismatch:.4f}, Prec: {p_mismatch:.4f}, Rec: {r_mismatch:.4f}")
    assert abs(d_mismatch - 0.0) < 1e-4 and abs(i_mismatch - 0.0) < 1e-4

    print("[SUCCESS] All evaluation metrics (Dice, IoU, Precision, Recall) verified!")

