"""
AETHER Deforestation Detection — Stage 2 Evaluation & Report Generator
"""
import os
import torch
import numpy as np
from prepare_dataset import get_deforestation_dataloaders
from models.unet import UNet
from losses import BCEDiceLoss
from metrics import dice_score, iou_score, precision_score, recall_score

def evaluate_models():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Evaluation hardware device: {device}")

    best_ckpt_path = "checkpoints/best_model.pth"
    if not os.path.exists(best_ckpt_path):
        print(f"Error: Checkpoint '{best_ckpt_path}' not found.")
        return

    checkpoint = torch.load(best_ckpt_path, map_location=device)
    print("Checkpoint Loaded Keys:", list(checkpoint.keys()))
    print("Epoch:", checkpoint.get("epoch"))
    print("Checkpoint Val Loss:", checkpoint.get("validation_loss"))
    print("Checkpoint Val Dice:", checkpoint.get("validation_dice"))
    print("Checkpoint Val IoU:", checkpoint.get("validation_iou"))

    model = UNet(in_channels=6, out_channels=1).to(device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    criterion = BCEDiceLoss(bce_weight=1.0, dice_weight=1.0)
    _, val_loader, test_loader = get_deforestation_dataloaders(batch_size=8, mode="concat", augment_train=False)

    def run_eval(loader, split_name):
        loss_accum, dice_accum, iou_accum, prec_accum, rec_accum = 0.0, 0.0, 0.0, 0.0, 0.0
        num_batches = 0
        with torch.no_grad():
            for inputs, masks in loader:
                inputs, masks = inputs.to(device), masks.to(device)
                logits = model(inputs)
                loss = criterion(logits, masks)

                loss_accum += loss.item()
                dice_accum += float(dice_score(logits, masks, threshold=0.5, from_logits=True))
                iou_accum += float(iou_score(logits, masks, threshold=0.5, from_logits=True))
                prec_accum += float(precision_score(logits, masks, threshold=0.5, from_logits=True))
                rec_accum += float(recall_score(logits, masks, threshold=0.5, from_logits=True))
                num_batches += 1

        avg_loss = loss_accum / num_batches
        avg_dice = dice_accum / num_batches
        avg_iou = iou_accum / num_batches
        avg_prec = prec_accum / num_batches
        avg_rec = rec_accum / num_batches

        print(f"--- {split_name.upper()} RESULTS ---")
        print(f"  Loss:      {avg_loss:.4f}")
        print(f"  Dice (F1): {avg_dice:.4f} ({avg_dice*100:.2f}%)")
        print(f"  IoU:       {avg_iou:.4f} ({avg_iou*100:.2f}%)")
        print(f"  Precision: {avg_prec:.4f} ({avg_prec*100:.2f}%)")
        print(f"  Recall:    {avg_rec:.4f} ({avg_rec*100:.2f}%)")
        return avg_loss, avg_dice, avg_iou, avg_prec, avg_rec

    v_loss, v_dice, v_iou, v_prec, v_rec = run_eval(val_loader, "Validation Set (31 samples)")
    t_loss, t_dice, t_iou, t_prec, t_rec = run_eval(test_loader, "Test Set (33 samples - Untouched)")

if __name__ == "__main__":
    evaluate_models()
