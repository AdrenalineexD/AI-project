# AETHER — Deforestation Dataset Inspection Report

**Project:** AETHER EDI — Deforestation Detection Module  
**Date:** September 2, 2026  
**Dataset Directory:** `C:\Users\HP\Downloads\Forest-Change-dataset (1)\Forest-Change-dataset`  

---

## 1. Dataset Overview

The dataset consists of multi-temporal satellite image pairs (**A**: Before, **B**: After) and corresponding ground-truth change masks (**label**).

- **Total Samples:** 334 paired triplets
- **Train Split:** 270 samples (80.8%)
- **Validation Split:** 31 samples (9.3%)
- **Test Split:** 33 samples (9.9%)

```text
Forest-Change-dataset/
└── images/
    ├── train/ (270 A, 270 B, 270 label)
    ├── val/   (31 A, 31 B, 31 label)
    └── test/  (33 A, 33 B, 33 label)
```

---

## 2. Image & Mask Properties

| Asset Type | Dimension ($W \times H$) | Channels | Mode | Data Type | File Format | Pixel Min | Pixel Max |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Image A (Before)** | $480 \times 480$ | 3 | RGB | `uint8` | `.png` | 0 | 255 |
| **Image B (After)** | $480 \times 480$ | 3 | RGB | `uint8` | `.png` | 0 | 255 |
| **Label (Change Mask)** | $480 \times 480$ | 1 | Grayscale (`L`) | `uint8` | `.png` | 0 | 255 |

---

## 3. Pairing Verification

A strict check was executed across all three subdirectories (`A`, `B`, `label`) for train, validation, and test splits.

- **Train Set:** 270/270 filenames matched 1-to-1.
- **Validation Set:** 31/31 filenames matched 1-to-1.
- **Test Set:** 33/33 filenames matched 1-to-1.
- **Missing / Mismatched / Duplicate Files:** **0**

**Result:** Perfect 1-to-1 alignment across all splits.

---

## 4. Label Pixel Analysis & Verification

Instead of assuming label values, empirical histogram analysis was conducted across all 334 label masks:

| Pixel Value Range | Meaning | Total Pixel Count | Percentage of Dataset |
| :--- | :--- | :--- | :--- |
| **`0`** | Background / Intact Forest / No Change | 73,251,570 | **95.19%** |
| **`255`** | Deforestation / Forest Loss Area | 3,301,686 | **4.29%** |
| **`1` – `254`** | Anti-aliased Edge Boundaries (Raster transition) | 400,344 | **0.52%** |

### Explanation of Discovered Values:
- Ground-truth masks are single-channel grayscale raster images.
- **`0`** represents unchanged background (intact forest canopy or non-forest land).
- **`255`** represents deforested/changed forest canopy.
- The 0.52% intermediate pixel values ($1 \dots 254$) occur exclusively along polygon boundaries due to anti-aliasing during mask rasterization.
- **Binarization Strategy for Model Input:** Thresholding mask pixel values at $\ge 128$ converts masks into exact binary ground-truth tensors $[1, 480, 480]$ where `1.0` = Deforestation and `0.0` = Intact Forest.

---

## 5. Class Balance & Deforestation Statistics

| Metric | Train Split | Validation Split | Test Split | Overall Dataset |
| :--- | :--- | :--- | :--- | :--- |
| **Minimum Change %** | 0.03% | 0.16% | 0.01% | **0.01%** |
| **Maximum Change %** | 27.49% | 38.63% | 15.84% | **38.63%** |
| **Mean Change %** | 4.47% | 4.98% | 4.37% | **4.51%** |
| **Median Change %** | 2.87% | 2.41% | 2.74% | **2.86%** |

### Key Observations & Extreme Samples:
- **Overall Class Imbalance:** Deforestation occupies **4.51%** of total dataset pixel surface area, while intact background occupies **95.49%**.
- **Imbalance Ratio:** **~1:21.2** (Background-heavy).
- **Lowest Deforestation Sample:** `test_000032.png` (0.01% change area).
- **Highest Deforestation Sample:** `val_000005.png` (38.63% change area).
- **Impact on U-Net Training:** Standard Binary Cross Entropy (BCE) loss will suffer from background bias. It is strongly recommended to use **Dice Loss** or **Focal Loss** (or BCE + Dice combination) when training U-Net.

---

## 6. Sample Visualization

Five representative samples were rendered with side-by-side satellite imagery (A, B), ground-truth change masks, and semi-transparent red deforestation overlays.

- **Generated Visualization Path:** `outputs/dataset_inspection_samples.png`

---

## 7. Problems Found

No structural problems detected during inspection.

- Original files are intact, valid, and 100% paired.
- Data structures match expectations for multi-temporal change detection architectures.

---

## 8. U-Net Preparedness & Next Steps

The dataset is **100% ready for U-Net model training**.

- `prepare_dataset.py` provides PyTorch `DeforestationDataset` and `DataLoader` classes.
- Supports both **Early Fusion** (6-channel input `[6, 480, 480]`) and **Siamese U-Net** (dual input `([3, 480, 480], [3, 480, 480])`).
- Ground-truth target output is formatted as `[1, 480, 480]` float binary mask (`1.0` = Deforestation, `0.0` = Intact Forest).
- The original dataset remains completely untouched in its original location.
