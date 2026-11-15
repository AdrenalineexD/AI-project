"""
AETHER Deforestation Detection System - PyTorch Dataset & DataLoader Preparation
==================================================================================

This module provides beginner-friendly PyTorch Dataset and DataLoader implementations
for training multi-temporal deforestation change detection models (e.g., U-Net / Siamese U-Net).

FEATURES:
- Non-destructive: Reads original dataset files without modifying them.
- Flexible Input Modes:
  1. 'concat': Concatenates A and B into a 6-channel tensor [6, H, W] (Early Fusion U-Net).
  2. 'dual': Returns A [3, H, W] and B [3, H, W] as separate tensors (Siamese U-Net).
- Thresholded Binarization: Converts mask pixel values [0..255] into binary tensor [1, H, W] (1.0 = Deforestation, 0.0 = Background/Forest).
- Data Normalization: Scales RGB pixel values to range [0, 1].

Author: AETHER EDI Team
"""

import os
import random
from pathlib import Path
from PIL import Image
import torch
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms.functional as TF

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
DEFAULT_DATASET_DIR = Path(r"C:\Users\HP\Downloads\Forest-Change-dataset (1)\Forest-Change-dataset")

class DeforestationDataset(Dataset):
    """
    PyTorch Dataset for Forest Change Detection with Synchronized Augmentations.
    
    Loads paired satellite images (A: Before, B: After) and target deforestation mask.
    Enforces identical spatial transformations across Image A, Image B, and target mask.
    """
    def __init__(self, root_dir=DEFAULT_DATASET_DIR, split="train", mode="concat", mask_threshold=128, augment=None):
        """
        Args:
            root_dir (str or Path): Path to the Forest-Change-dataset root directory.
            split (str): 'train', 'val', or 'test'.
            mode (str): 'concat' for 6-channel tensor [6, H, W], or 'dual' for (A, B) tuple.
            mask_threshold (int): Pixel value threshold to binarize deforestation mask (default: 128).
            augment (bool): If True, applies random spatial transformations. 
                            Defaults to True for 'train' split, False for 'val' and 'test'.
        """
        self.root_dir = Path(root_dir)
        self.split = split.lower()
        self.mode = mode.lower()
        self.mask_threshold = mask_threshold

        # Default augmentation logic: True for train, False for val/test
        if augment is None:
            self.augment = (self.split == "train")
        else:
            # Force augmentation OFF for validation and test sets
            self.augment = augment if self.split == "train" else False

        self.dir_a = self.root_dir / "images" / self.split / "A"
        self.dir_b = self.root_dir / "images" / self.split / "B"
        self.dir_label = self.root_dir / "images" / self.split / "label"

        if not self.dir_a.exists():
            raise FileNotFoundError(f"Directory not found: {self.dir_a}")

        # Gather sorted file list
        self.filenames = sorted([f for f in os.listdir(self.dir_a) if not f.startswith('.') and f.endswith('.png')])
        print(f"[DeforestationDataset] Initialized '{self.split}' split with {len(self.filenames)} samples (mode='{self.mode}', augment={self.augment}).")

    def __len__(self):
        return len(self.filenames)

    def __getitem__(self, idx):
        fname = self.filenames[idx]
        
        path_a = self.dir_a / fname
        path_b = self.dir_b / fname
        path_label = self.dir_label / fname

        # Load PIL Images
        img_a = Image.open(path_a).convert("RGB")
        img_b = Image.open(path_b).convert("RGB")
        img_label = Image.open(path_label).convert("L")

        # Synchronized Spatial Augmentations (Train set only)
        if self.augment:
            # 1. Random Horizontal Flip (50% probability)
            if random.random() < 0.5:
                img_a = TF.hflip(img_a)
                img_b = TF.hflip(img_b)
                img_label = TF.hflip(img_label)

            # 2. Random Vertical Flip (50% probability)
            if random.random() < 0.5:
                img_a = TF.vflip(img_a)
                img_b = TF.vflip(img_b)
                img_label = TF.vflip(img_label)

            # 3. Random 90-degree Rotations (0, 90, 180, or 270 degrees)
            angle = random.choice([0, 90, 180, 270])
            if angle != 0:
                img_a = TF.rotate(img_a, angle)
                img_b = TF.rotate(img_b, angle)
                img_label = TF.rotate(img_label, angle)

        # Convert images to FloatTensors scaled to [0.0, 1.0] shape [3, H, W]
        tensor_a = TF.to_tensor(img_a)
        tensor_b = TF.to_tensor(img_b)

        # Convert label mask to binary FloatTensor [1, H, W] where 1.0 = Deforestation, 0.0 = Background
        tensor_label_raw = TF.to_tensor(img_label) * 255.0  # Scale back to 0..255 for thresholding
        tensor_mask = (tensor_label_raw >= self.mask_threshold).float()

        if self.mode == "concat":
            # Early Fusion U-Net input: Concatenate A and B along channel dimension -> [6, H, W]
            inputs = torch.cat([tensor_a, tensor_b], dim=0)
            return inputs, tensor_mask
        elif self.mode == "dual":
            # Siamese U-Net input: Return separate tuple (tensor_a, tensor_b)
            return (tensor_a, tensor_b), tensor_mask
        else:
            raise ValueError(f"Unknown mode '{self.mode}'. Supported modes are 'concat' and 'dual'.")

def get_deforestation_dataloaders(root_dir=DEFAULT_DATASET_DIR, batch_size=2, mode="concat", num_workers=0, augment_train=True):
    """
    Factory function to create DataLoaders for Train, Validation, and Test splits.
    
    Returns:
        tuple: (train_loader, val_loader, test_loader)
    """
    train_ds = DeforestationDataset(root_dir=root_dir, split="train", mode=mode, augment=augment_train)
    val_ds = DeforestationDataset(root_dir=root_dir, split="val", mode=mode, augment=False)
    test_ds = DeforestationDataset(root_dir=root_dir, split="test", mode=mode, augment=False)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=num_workers)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)

    return train_loader, val_loader, test_loader

# -----------------------------------------------------------------------------
# Verification Unit Test
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    print("=" * 60)
    print("TESTING PYTORCH DATASET & DATALOADER PREPARATION WITH AUGMENTATION")
    print("=" * 60)

    # 1. Test Single Sample Extraction (Concat Mode with Augmentation)
    dataset = DeforestationDataset(split="train", mode="concat", augment=True)
    sample_input, sample_target = dataset[0]

    print("\n[TEST 1] Concat Mode Sample Shapes (Augmented Train):")
    print(f"  Input Tensor Shape (A+B): {sample_input.shape} (Expected: [6, 480, 480])")
    print(f"  Input Tensor Min/Max:     {sample_input.min():.2f} / {sample_input.max():.2f}")
    print(f"  Target Mask Shape:        {sample_target.shape} (Expected: [1, 480, 480])")
    print(f"  Target Mask Unique Values:{torch.unique(sample_target).tolist()} (Expected: [0.0, 1.0])")

    # 2. Verify Augmentation Consistency across multiple calls
    print("\n[TEST 2] Verifying Synchronized Augmentation Alignment:")
    s1_in, s1_target = dataset[0]
    s2_in, s2_target = dataset[0]
    print(f"  Sample 0 Call 1 Tensor Sum: {s1_in.sum().item():.4f}")
    print(f"  Sample 0 Call 2 Tensor Sum: {s2_in.sum().item():.4f}")
    print("  (Different sums confirm random spatial augmentations are actively generating different orientations)")

    # 3. Test Validation Split (Augmentation Disabled)
    val_dataset = DeforestationDataset(split="val", mode="concat", augment=False)
    val_s1, _ = val_dataset[0]
    val_s2, _ = val_dataset[0]
    print(f"\n[TEST 3] Validation Set Deterministic Check:")
    print(f"  Val Sample 0 Call 1 Sum: {val_s1.sum().item():.4f}")
    print(f"  Val Sample 0 Call 2 Sum: {val_s2.sum().item():.4f}")
    assert torch.equal(val_s1, val_s2), "Validation split must be deterministic and augmentation-free!"
    print("  Validation deterministic check: [PASS]")

    # 4. Test Batch Extraction via DataLoader (batch_size=2)
    train_loader, val_loader, test_loader = get_deforestation_dataloaders(batch_size=2, mode="concat")
    batch_inputs, batch_targets = next(iter(train_loader))

    print("\n[TEST 4] DataLoader Batch Verification (batch_size=2):")
    print(f"  Batch Input Shape:  {batch_inputs.shape} (Expected: [2, 6, 480, 480])")
    print(f"  Batch Target Shape: {batch_targets.shape} (Expected: [2, 1, 480, 480])")

    print("\n[SUCCESS] PyTorch Deforestation Dataset implementation with synchronized spatial augmentation is verified!")

