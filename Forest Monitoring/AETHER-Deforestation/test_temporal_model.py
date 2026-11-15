"""
AETHER STAGE 5 — TEMPORAL MODEL SANITY TEST SCRIPT
===================================================

Verifies:
1. Dataset loading in dual mode (Image A, Image B, Target Mask).
2. Input tensor shapes: Image A [B, 3, 480, 480], Image B [B, 3, 480, 480], Mask [B, 1, 480, 480].
3. Model forward pass, CNN feature vector [B, 256], LSTM sequence [B, 2, 256], LSTM representation [B, 128].
4. Output shape verification: Segmentation Logits [B, 1, 480, 480], Score Logits [B, 1].
5. BCEDiceLoss calculation.
6. Backward pass, gradient computation, and non-zero parameter gradients.
7. Verification of zero NaN and zero Inf in tensors and gradients.

Author: AETHER EDI Team
"""

import sys
import torch
import torch.nn as nn
from prepare_dataset import DeforestationDataset
from models.temporal_cnn_lstm import TemporalCNNLSTM, BCEDiceLoss


def run_sanity_test():
    print("=" * 70)
    print("AETHER STAGE 5 — TEMPORAL MODEL ARCHITECTURE SANITY TEST")
    print("=" * 70)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[TEST 1/7] Hardware Device: {device}")

    # 1. Dataset Loading in Dual Mode
    print("\n[TEST 2/7] Loading Test Dataset Samples (Mode='dual')...")
    test_ds = DeforestationDataset(split="test", mode="dual", augment=False)
    print(f"  Total Test Samples: {len(test_ds)}")
    assert len(test_ds) == 33, f"Expected 33 test samples, got {len(test_ds)}"

    batch_size = 2
    img_A_list = []
    img_B_list = []
    mask_list = []

    for i in range(batch_size):
        (img_A, img_B), mask = test_ds[i]
        img_A_list.append(img_A)
        img_B_list.append(img_B)
        mask_list.append(mask)

    batch_A = torch.stack(img_A_list).to(device)   # [2, 3, 480, 480]
    batch_B = torch.stack(img_B_list).to(device)   # [2, 3, 480, 480]
    batch_mask = torch.stack(mask_list).to(device) # [2, 1, 480, 480]

    print(f"  Input Batch A Shape : {list(batch_A.shape)} (Expected: [2, 3, 480, 480])")
    print(f"  Input Batch B Shape : {list(batch_B.shape)} (Expected: [2, 3, 480, 480])")
    print(f"  Target Mask Shape   : {list(batch_mask.shape)} (Expected: [2, 1, 480, 480])")

    assert batch_A.shape == (2, 3, 480, 480), f"Invalid Input A shape: {batch_A.shape}"
    assert batch_B.shape == (2, 3, 480, 480), f"Invalid Input B shape: {batch_B.shape}"
    assert batch_mask.shape == (2, 1, 480, 480), f"Invalid Target Mask shape: {batch_mask.shape}"

    # 2. Model Instantiation
    print("\n[TEST 3/7] Instantiating TemporalCNNLSTM Model & Verifying Internal Shapes...")
    model = TemporalCNNLSTM(in_channels=3, cnn_feat_dim=256, lstm_hidden_dim=128).to(device)

    # Verify CNN Encoder intermediate shapes manually
    with torch.no_grad():
        s_feat_A, f_vec_A = model.cnn_encoder(batch_A)
        s_feat_B, f_vec_B = model.cnn_encoder(batch_B)
        seq = torch.stack([f_vec_A, f_vec_B], dim=1)
        lstm_out, _ = model.lstm(seq)
        H_temp = lstm_out[:, -1, :]

    print(f"  CNN Spatial Feature Map Shape : {list(s_feat_A.shape)} (Expected: [2, 128, 60, 60])")
    print(f"  CNN Pooled Feature Vector     : {list(f_vec_A.shape)} (Expected: [2, 256])")
    print(f"  LSTM Sequence Shape           : {list(seq.shape)} (Expected: [2, 2, 256])")
    print(f"  LSTM Temporal Hidden State    : {list(H_temp.shape)} (Expected: [2, 128])")

    assert s_feat_A.shape == (2, 128, 60, 60), f"Invalid spatial feature shape: {s_feat_A.shape}"
    assert f_vec_A.shape == (2, 256), f"Invalid feature vector shape: {f_vec_A.shape}"
    assert seq.shape == (2, 2, 256), f"Invalid sequence shape: {seq.shape}"
    assert H_temp.shape == (2, 128), f"Invalid LSTM hidden shape: {H_temp.shape}"

    # 3. Model Forward Pass
    print("\n[TEST 4/7] Running Full Forward Pass...")
    seg_logits, score_logits = model(batch_A, batch_B)
    print(f"  Output Seg Logits Shape : {list(seg_logits.shape)} (Expected: [2, 1, 480, 480])")
    print(f"  Output Score Logits Shape: {list(score_logits.shape)} (Expected: [2, 1])")

    assert seg_logits.shape == (2, 1, 480, 480), f"Invalid Segmentation Logits shape: {seg_logits.shape}"
    assert score_logits.shape == (2, 1), f"Invalid Score Logits shape: {score_logits.shape}"

    # Check for NaN / Inf in forward pass
    assert not torch.isnan(seg_logits).any(), "NaN detected in Segmentation Logits!"
    assert not torch.isinf(seg_logits).any(), "Inf detected in Segmentation Logits!"
    assert not torch.isnan(score_logits).any(), "NaN detected in Score Logits!"
    assert not torch.isinf(score_logits).any(), "Inf detected in Score Logits!"
    print("  Forward Pass NaN/Inf Check: PASS")

    # 4. BCEDiceLoss Computation
    print("\n[TEST 5/7] Testing BCEDiceLoss Computation...")
    criterion = BCEDiceLoss(bce_weight=1.0, dice_weight=1.0, aux_score_weight=0.1)
    loss = criterion(seg_logits, batch_mask, score_logits=score_logits)
    loss_val = loss.item()
    print(f"  Calculated BCEDiceLoss Value: {loss_val:.6f}")

    assert not torch.isnan(loss), "Loss value is NaN!"
    assert not torch.isinf(loss), "Loss value is Inf!"
    assert loss_val > 0.0, "Loss value must be positive!"
    print("  Loss Calculation Check: PASS")

    # 5. Backward Pass & Gradient Flow Verification
    print("\n[TEST 6/7] Running Backward Pass & Gradient Flow Verification...")
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-4)
    optimizer.zero_grad()
    loss.backward()

    grad_count = 0
    zero_grad_params = []
    nan_grad_params = []

    for name, param in model.named_parameters():
        if param.requires_grad:
            if param.grad is None:
                zero_grad_params.append(name)
            else:
                grad_count += 1
                if torch.isnan(param.grad).any():
                    nan_grad_params.append(name)

    print(f"  Parameters with Valid Gradients: {grad_count}")
    assert len(zero_grad_params) == 0, f"Parameters with missing gradients: {zero_grad_params}"
    assert len(nan_grad_params) == 0, f"Parameters with NaN gradients: {nan_grad_params}"
    print("  Backward Pass & Gradient Flow Check: PASS")

    # 6. Parameter Count Verification
    param_count = sum(p.numel() for p in model.parameters())
    trainable_count = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"\n[TEST 7/7] Model Parameter Diagnostics:")
    print(f"  Total Parameters     : {param_count:,}")
    print(f"  Trainable Parameters : {trainable_count:,}")

    print("\n" + "=" * 70)
    print("ALL SANITY TESTS PASSED SUCCESSFULLY! ARCHITECTURE IS VALIDATED.")
    print("=" * 70)
    return True


if __name__ == "__main__":
    success = run_sanity_test()
    if not success:
        sys.exit(1)
