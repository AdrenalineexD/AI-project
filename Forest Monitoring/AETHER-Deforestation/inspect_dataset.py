"""
AETHER Deforestation Detection System - Dataset Inspection Script
==================================================================

This script inspects the Forest-Change-dataset without modifying any files.
It verifies dataset structure, checks A/B/label file pairing, inspects image
dimensions, channels, data types, and discovers actual label mask pixel values.

Author: AETHER EDI Team
"""

import os
from pathlib import Path
from PIL import Image
import numpy as np

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
DATASET_DIR = Path(r"C:\Users\HP\Downloads\Forest-Change-dataset (1)\Forest-Change-dataset")
IMAGES_DIR = DATASET_DIR / "images"
SPLITS = ["train", "val", "test"]
SUBDIRS = ["A", "B", "label"]

def get_file_map(split_path):
    """Returns a dictionary mapping filename (without directory) to full file path for a split subdirectory."""
    file_map = {}
    if not split_path.exists():
        print(f"Warning: Directory {split_path} does not exist!")
        return file_map
    for entry in os.scandir(split_path):
        if entry.is_file() and not entry.name.startswith('.'):
            file_map[entry.name] = entry.path
    return file_map

def inspect_split_counts():
    """TASK 1: Count files in train, validation, and test splits across A, B, and label."""
    print("=" * 60)
    print("TASK 1: DATASET FILE COUNTS")
    print("=" * 60)
    
    counts = {}
    for split in SPLITS:
        counts[split] = {}
        for sub in SUBDIRS:
            sub_path = IMAGES_DIR / split / sub
            file_map = get_file_map(sub_path)
            counts[split][sub] = len(file_map)
            
        print(f"\n{split.upper()}")
        print(f"  A (Before):  {counts[split]['A']} files")
        print(f"  B (After):   {counts[split]['B']} files")
        print(f"  Label Mask:  {counts[split]['label']} files")
        
    return counts

def verify_file_pairing():
    """TASK 2: Verify 1-to-1 pairing between A, B, and label files in each split."""
    print("\n" + "=" * 60)
    print("TASK 2: IMAGE PAIRING VERIFICATION")
    print("=" * 60)
    
    all_paired = True
    pairing_report = {}

    for split in SPLITS:
        a_map = get_file_map(IMAGES_DIR / split / "A")
        b_map = get_file_map(IMAGES_DIR / split / "B")
        label_map = get_file_map(IMAGES_DIR / split / "label")

        a_set = set(a_map.keys())
        b_set = set(b_map.keys())
        label_set = set(label_map.keys())

        all_keys = a_set | b_set | label_set
        common_keys = a_set & b_set & label_set

        missing_a = b_set | label_set - a_set
        missing_b = a_set | label_set - b_set
        missing_label = a_set | b_set - label_set

        is_split_perfect = (len(a_set) == len(b_set) == len(label_set) == len(common_keys))
        if not is_split_perfect:
            all_paired = False

        pairing_report[split] = {
            "total_unique_filenames": len(all_keys),
            "perfect_triplets": len(common_keys),
            "missing_a": list(missing_a),
            "missing_b": list(missing_b),
            "missing_label": list(missing_label),
            "is_perfect": is_split_perfect
        }

        print(f"\n{split.upper()} PAIRING STATUS:")
        if is_split_perfect:
            print(f"  [SUCCESS] All {len(common_keys)} samples perfectly paired (A, B, label match 1-to-1).")
        else:
            print(f"  [WARNING] Mismatch detected in {split}!")
            print(f"  - Total unique filenames: {len(all_keys)}")
            print(f"  - Complete A/B/label triplets: {len(common_keys)}")
            if missing_a:
                print(f"  - Missing in A ({len(missing_a)}): {missing_a[:5]}")
            if missing_b:
                print(f"  - Missing in B ({len(missing_b)}): {missing_b[:5]}")
            if missing_label:
                print(f"  - Missing in Label ({len(missing_label)}): {missing_label[:5]}")

    return pairing_report, all_paired

def inspect_image_properties():
    """TASK 3: Inspect image dimensions, channels, modes, data types, and label pixel values."""
    print("\n" + "=" * 60)
    print("TASK 3: IMAGE & LABEL MASK PROPERTIES")
    print("=" * 60)

    properties_summary = {}

    for split in SPLITS:
        a_map = get_file_map(IMAGES_DIR / split / "A")
        label_map = get_file_map(IMAGES_DIR / split / "label")

        if not a_map or not label_map:
            continue

        sample_filenames = sorted(list(a_map.keys()))[:5]  # Inspect first 5 samples per split
        
        unique_label_vals = set()
        a_modes, b_modes, label_modes = set(), set(), set()
        a_shapes, label_shapes = set(), set()
        a_dtypes, label_dtypes = set(), set()

        for fname in sample_filenames:
            a_path = a_map[fname]
            b_path = IMAGES_DIR / split / "B" / fname
            label_path = label_map[fname]

            # Load A
            with Image.open(a_path) as img_a:
                arr_a = np.array(img_a)
                a_modes.add(img_a.mode)
                a_shapes.add(arr_a.shape)
                a_dtypes.add(arr_a.dtype.name)

            # Load B
            with Image.open(b_path) as img_b:
                b_modes.add(img_b.mode)

            # Load Label
            with Image.open(label_path) as img_label:
                arr_label = np.array(img_label)
                label_modes.add(img_label.mode)
                label_shapes.add(arr_label.shape)
                label_dtypes.add(arr_label.dtype.name)
                # Find unique values in label mask
                unique_vals = np.unique(arr_label)
                unique_label_vals.update(unique_vals.tolist())

        print(f"\n{split.upper()} PROPERTIES:")
        print(f"  Image A Mode/Format: {a_modes}, Shape: {a_shapes}, dtype: {a_dtypes}")
        print(f"  Image B Mode:        {b_modes}")
        print(f"  Label Mask Mode:     {label_modes}, Shape: {label_shapes}, dtype: {label_dtypes}")
        print(f"  Discovered Unique Mask Pixel Values: {sorted(list(unique_label_vals))}")

        properties_summary[split] = {
            "a_modes": list(a_modes),
            "a_shapes": [list(s) for s in a_shapes],
            "label_modes": list(label_modes),
            "label_shapes": [list(s) for s in label_shapes],
            "unique_mask_values": sorted(list(unique_label_vals))
        }

    # Inspect across ALL masks in train set to guarantee complete discovery of label values
    print("\nDeep checking ALL label masks in train split for unique values...")
    train_label_map = get_file_map(IMAGES_DIR / "train" / "label")
    all_train_mask_vals = set()
    for fname, path in train_label_map.items():
        with Image.open(path) as img:
            arr = np.array(img)
            all_train_mask_vals.update(np.unique(arr).tolist())
            
    print(f"-> Complete Train Dataset Mask Unique Pixel Values: {sorted(list(all_train_mask_vals))}")
    properties_summary["all_train_unique_mask_values"] = sorted(list(all_train_mask_vals))

    return properties_summary

def main():
    print("AETHER DEFORESTATION DATASET INSPECTION")
    print(f"Target Directory: {DATASET_DIR}")
    print(f"Read-Only Verification: Dataset original files will remain untouched.\n")
    
    if not DATASET_DIR.exists():
        print(f"ERROR: Dataset directory not found at {DATASET_DIR}")
        return

    counts = inspect_split_counts()
    pairing_report, perfect = verify_file_pairing()
    props = inspect_image_properties()

    print("\n" + "=" * 60)
    print("INSPECTION SUMMARY RESULT")
    print("=" * 60)
    if perfect:
        print("SUCCESS: Dataset structure is valid. All image pairs and labels match perfectly.")
    else:
        print("WARNING: Dataset has pairing discrepancies. See report above.")

if __name__ == "__main__":
    main()
