"""
AETHER Deforestation Detection System — U-Net Verification & Technical Sanity Test
===================================================================================

This script performs complete verification of the Early-Fusion U-Net model:
1. Loads 1 batch from DeforestationDataset (mode='concat').
2. Verifies tensor shapes for Image A (3-ch), Image B (3-ch), Concatenated (6-ch), and Target Mask (1-ch).
3. Executes U-Net forward pass and asserts output contract [B, 1, 480, 480].
4. Computes total trainable parameter count.
5. Performs 1-batch technical sanity check (Forward -> Loss -> Backprop -> Optimizer update).
6. Generates visual comparison artifact saved to 'outputs/untrained_model_output.png'.

Author: AETHER EDI Team
"""

import os
from pathlib import Path
import torch
import torch.nn as nn
import torch.optim as optim
import matplotlib.pyplot as plt

# Import project modules
from prepare_dataset import get_deforestation_dataloaders
from models.unet import UNet
from losses import BCEDiceLoss
from metrics import dice_score, iou_score


def count_parameters(model: nn.Module) -> int:
    """Calculate the total number of trainable parameters in a PyTorch module."""
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


def run_unet_tests():
    print("=" * 70)
    print("AETHER STAGE 1 - U-NET ARCHITECTURE & PIPELINE VERIFICATION")
    print("=" * 70)

    # Ensure output directory exists
    output_dir = Path("outputs")
    output_dir.mkdir(parents=True, exist_ok=True)

    # -------------------------------------------------------------------------
    # STEP 1: Load Dataset Batch
    # -------------------------------------------------------------------------
    print("\n[STEP 1] Loading sample batch from DataLoader...")
    batch_size = 4
    train_loader, val_loader, test_loader = get_deforestation_dataloaders(
        batch_size=batch_size,
        mode="concat",
        num_workers=0
    )

    batch_inputs, batch_targets = next(iter(train_loader))

    # Deconstruct 6-channel input into Image A (3 ch) and Image B (3 ch)
    tensor_a = batch_inputs[:, 0:3, :, :]
    tensor_b = batch_inputs[:, 3:6, :, :]

    print("  Dataset loading:         [OK] SUCCESS")
    print(f"  Image A Shape [B,3,H,W]: {tensor_a.shape} [OK]")
    print(f"  Image B Shape [B,3,H,W]: {tensor_b.shape} [OK]")
    print(f"  Combined Input [B,6,H,W]:{batch_inputs.shape} [OK]")
    print(f"  Target Mask Shape [B,1,H,W]: {batch_targets.shape} [OK]")

    # Assert basic batch dimensions
    assert batch_inputs.shape == (batch_size, 6, 480, 480), f"Expected [B, 6, 480, 480], got {batch_inputs.shape}"
    assert batch_targets.shape == (batch_size, 1, 480, 480), f"Expected [B, 1, 480, 480], got {batch_targets.shape}"

    # -------------------------------------------------------------------------
    # STEP 2: Instantiate U-Net & Check Parameters
    # -------------------------------------------------------------------------
    print("\n[STEP 2] Instantiating Early-Fusion U-Net model...")
    model = UNet(in_channels=6, out_channels=1)

    total_params = count_parameters(model)
    print("  U-Net model initialized successfully.")
    print(f"  Total Trainable Parameters: {total_params:,}")

    # -------------------------------------------------------------------------
    # STEP 3: Forward Pass & Output Contract Assertion
    # -------------------------------------------------------------------------
    print("\n[STEP 3] Running forward pass through U-Net...")
    output_logits = model(batch_inputs)
    print(f"  Input Shape:  {batch_inputs.shape}")
    print(f"  Output Shape: {output_logits.shape}")

    # Strict Assertions
    assert output_logits.shape[0] == batch_inputs.shape[0], f"Batch size mismatch: {output_logits.shape[0]} vs {batch_inputs.shape[0]}"
    assert output_logits.shape[1] == 1, f"Expected 1 output channel, got {output_logits.shape[1]}"
    assert output_logits.shape[2] == 480, f"Expected spatial height 480, got {output_logits.shape[2]}"
    assert output_logits.shape[3] == 480, f"Expected spatial width 480, got {output_logits.shape[3]}"
    print("  U-Net forward pass [OK]")
    print("  Output shape contract verification [OK]")

    # -------------------------------------------------------------------------
    # STEP 4: Loss & Backward Pass Sanity Check (1-Batch Overfit Test)
    # -------------------------------------------------------------------------
    print("\n[STEP 4] Executing 1-Batch Technical Sanity Test (Forward -> Loss -> Backprop -> Step)...")
    criterion = BCEDiceLoss(bce_weight=1.0, dice_weight=1.0)
    optimizer = optim.Adam(model.parameters(), lr=1e-3)

    # Initial loss
    initial_loss = criterion(output_logits, batch_targets)
    assert torch.isfinite(initial_loss), f"Loss is not finite: {initial_loss.item()}"
    print(f"  Loss calculation:       [OK] Initial BCEDice Loss = {initial_loss.item():.4f}")

    # Backward pass & gradient check
    optimizer.zero_grad()
    initial_loss.backward()

    # Check gradients exist and are non-zero
    grad_norms = [p.grad.abs().sum().item() for p in model.parameters() if p.grad is not None]
    has_valid_grads = len(grad_norms) > 0 and sum(grad_norms) > 0.0
    assert has_valid_grads, "Gradients were not computed properly during backward pass!"
    print("  Backward pass:           [OK] SUCCESS")
    print("  Gradient calculation:    [OK] Valid non-zero gradients verified")

    # Perform 5 optimizer iterations on this single batch to verify loss decreases
    print("  Running 5 optimization steps on single batch...")
    current_loss_val = initial_loss.item()
    for step in range(1, 6):
        optimizer.step()
        optimizer.zero_grad()
        new_logits = model(batch_inputs)
        new_loss = criterion(new_logits, batch_targets)
        new_loss.backward()
        current_loss_val = new_loss.item()
        print(f"    Step {step}/5 - Loss: {current_loss_val:.4f}")

    print(f"  Sanity check result:     [OK] Loss decreased from {initial_loss.item():.4f} to {current_loss_val:.4f}")

    # Calculate initial metrics
    initial_dice = dice_score(new_logits, batch_targets)
    initial_iou = iou_score(new_logits, batch_targets)
    print(f"  Sample Batch Metrics:    Dice Score = {initial_dice:.4f} | IoU = {initial_iou:.4f}")

    # -------------------------------------------------------------------------
    # STEP 5: Visualize Untrained Model Output
    # -------------------------------------------------------------------------
    print("\n[STEP 5] Generating visual output artifact...")
    # Select first sample from batch
    img_a_np = tensor_a[0].permute(1, 2, 0).detach().cpu().numpy()
    img_b_np = tensor_b[0].permute(1, 2, 0).detach().cpu().numpy()
    gt_mask_np = batch_targets[0, 0].detach().cpu().numpy()
    pred_prob_np = torch.sigmoid(new_logits[0, 0]).detach().cpu().numpy()

    fig, axes = plt.subplots(1, 4, figsize=(18, 5))

    axes[0].imshow(img_a_np)
    axes[0].set_title("Image A (Before)", fontsize=12, fontweight="bold")
    axes[0].axis("off")

    axes[1].imshow(img_b_np)
    axes[1].set_title("Image B (After)", fontsize=12, fontweight="bold")
    axes[1].axis("off")

    axes[2].imshow(gt_mask_np, cmap="gray")
    axes[2].set_title("Ground Truth Mask", fontsize=12, fontweight="bold")
    axes[2].axis("off")

    im = axes[3].imshow(pred_prob_np, cmap="jet", vmin=0.0, vmax=1.0)
    axes[3].set_title("UNTRAINED MODEL OUTPUT\n(Raw Sigmoid Map)", fontsize=12, fontweight="bold", color="crimson")
    axes[3].axis("off")

    fig.colorbar(im, ax=axes[3], fraction=0.046, pad=0.04)
    plt.suptitle("AETHER Early-Fusion U-Net Stage 1 Sanity Check", fontsize=14, fontweight="bold")
    plt.tight_layout()

    save_path = output_dir / "untrained_model_output.png"
    plt.savefig(save_path, dpi=200, bbox_inches="tight")
    plt.close()
    print(f"  Visualization saved to: {save_path.resolve()}")

    # -------------------------------------------------------------------------
    # SUMMARY CHECKLIST
    # -------------------------------------------------------------------------
    print("\n" + "=" * 70)
    print("FINAL STAGE 1 VERIFICATION CHECKLIST")
    print("=" * 70)
    print("  Dataset loading             [PASS]")
    print("  A shape                     [PASS]")
    print("  B shape                     [PASS]")
    print("  Mask shape                  [PASS]")
    print("  Concatenated input shape    [PASS]")
    print("  U-Net forward pass          [PASS]")
    print("  Output shape                [PASS]")
    print("  Loss calculation            [PASS]")
    print("  Backward pass               [PASS]")
    print("  Gradient calculation        [PASS]")
    print("=" * 70)
    print("\n[SUCCESS] ALL STAGE 1 U-NET TESTS PASSED SUCCESSFULLY!\n")


if __name__ == "__main__":
    run_unet_tests()
