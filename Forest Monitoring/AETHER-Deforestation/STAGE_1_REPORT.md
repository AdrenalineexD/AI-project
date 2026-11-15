# AETHER — Stage 1 Technical Report: Build and Test U-Net for Deforestation Detection

---

## Executive Summary

Stage 1 of the **AETHER Deforestation Detection Module** has been successfully implemented and verified. The primary objective of this stage was to construct, inspect, and technically validate the **Early-Fusion Classical U-Net architecture** for bi-temporal satellite segmentation without initiating full model training.

All tensor shape contracts, loss function implementations, evaluation metrics, backward pass gradient computations, and sanity overfit checks passed without errors.

---

## 1. U-Net Architecture Overview

The implemented model is an **Early-Fusion Classical U-Net** designed to process paired multi-temporal satellite imagery.

### Input Specification
- **Image A (Before)**: 3-channel RGB image tensor `[B, 3, 480, 480]`
- **Image B (After)**: 3-channel RGB image tensor `[B, 3, 480, 480]`
- **Early-Fusion Channel Concatenation**: Concatenating Image A and Image B along the channel dimension (dimension 1) yields a **6-channel input tensor**:
  $$\text{Input Tensor Shape}: [B, 6, 480, 480]$$

### Output Specification
- **Segmentation Output**: 1-channel raw logit map `[B, 1, 480, 480]`
- **Activation Note**: No `Sigmoid` activation is included inside the model itself. The raw logits are returned to allow numerical stability when evaluated by `BCEWithLogitsLoss`.

---

## 2. Detailed Architectural Breakdown

The architecture follows a symmetrical encoder-decoder structure built with reusable **Double Convolution blocks** (`Conv2d` $\rightarrow$ `BatchNorm2d` $\rightarrow$ `ReLU` $\rightarrow$ `Conv2d` $\rightarrow$ `BatchNorm2d` $\rightarrow$ `ReLU`).

```
INPUT (6 x 480 x 480)
  │
  ├──> ENCODER 1 (6 -> 64 channels) -------------> Skip 1 (64 x 480 x 480)
  │      MaxPool (2x2)
  │
  ├──> ENCODER 2 (64 -> 128 channels) -----------> Skip 2 (128 x 240 x 240)
  │      MaxPool (2x2)
  │
  ├──> ENCODER 3 (128 -> 256 channels) ----------> Skip 3 (256 x 120 x 120)
  │      MaxPool (2x2)
  │
  ├──> ENCODER 4 (256 -> 512 channels) ----------> Skip 4 (512 x 60 x 60)
  │      MaxPool (2x2)
  │
  └──> BOTTLENECK (512 -> 1024 channels) [30 x 30]
         │
  ┌──────┘
  ├──> DECODER 1 (1024 -> 512) + Skip 4 -------> ConvBlock (1024 -> 512)
  │      Transposed Conv (2x2)
  │
  ├──> DECODER 2 (512 -> 256) + Skip 3 --------> ConvBlock (512 -> 256)
  │      Transposed Conv (2x2)
  │
  ├──> DECODER 3 (256 -> 128) + Skip 2 --------> ConvBlock (256 -> 128)
  │      Transposed Conv (2x2)
  │
  ├──> DECODER 4 (128 -> 64) + Skip 1 ---------> ConvBlock (128 -> 64)
  │      Transposed Conv (2x2)
  │
  └──> FINAL HEAD (1x1 Conv: 64 -> 1)
         │
OUTPUT (1 x 480 x 480 Raw Logits)
```

### Parameter Count
- **Total Trainable Parameters**: `31,039,361` (~31.04 Million parameters)

---

## 3. Loss Functions & Metrics Implementation

### Loss Functions (`losses.py`)
To handle the severe class imbalance in the dataset (4.51% deforestation pixels vs 95.49% background), we implemented:
1. **`DiceLoss`**: Measures spatial overlap between prediction probabilities and ground truth masks:
   $$\text{Dice Loss} = 1 - \frac{2 \cdot \sum (P \cdot T) + \epsilon}{\sum P + \sum T + \epsilon}$$
2. **`BCEWithLogitsLoss`**: Provides smooth pixel-wise cross-entropy gradient flow.
3. **`BCEDiceLoss` (Combined Loss)**: Default loss function combining BCE and Dice:
   $$\text{Combined Loss} = \text{BCE Loss} + \text{Dice Loss}$$

### Evaluation Metrics (`metrics.py`)
1. **`dice_score(preds, targets)`**: Calculates hard Dice / F1 overlap score on thresholded predictions.
2. **`iou_score(preds, targets)`**: Calculates Intersection over Union (Jaccard Index).

---

## 4. Verification & Technical Sanity Test Results

The verification suite in `test_unet.py` was executed with the following empirical results:

| Verification Test | Target Contract / Requirement | Empirical Result | Status |
|---|---|---|---|
| **DataLoader Integration** | Batch size = 4, `mode='concat'` | 4 samples loaded | `[PASS]` |
| **Image A Shape** | `[4, 3, 480, 480]` | `torch.Size([4, 3, 480, 480])` | `[PASS]` |
| **Image B Shape** | `[4, 3, 480, 480]` | `torch.Size([4, 3, 480, 480])` | `[PASS]` |
| **Concatenated Input Shape** | `[4, 6, 480, 480]` | `torch.Size([4, 6, 480, 480])` | `[PASS]` |
| **Target Mask Shape** | `[4, 1, 480, 480]` | `torch.Size([4, 1, 480, 480])` | `[PASS]` |
| **U-Net Logit Output Shape** | `[4, 1, 480, 480]` | `torch.Size([4, 1, 480, 480])` | `[PASS]` |
| **Parameter Count** | ~31M parameters | `31,039,361` parameters | `[PASS]` |
| **Initial BCEDice Loss** | Finite float value | `1.7058` | `[PASS]` |
| **Backward Pass & Gradients** | Non-zero valid gradients | Confirmed non-zero gradients | `[PASS]` |
| **1-Batch Overfit (5 steps)** | Loss monotonically decreases | `1.7058` $\rightarrow$ `1.3437` | `[PASS]` |

### 5-Step Overfit Loss Curve (Sanity Check)
- **Step 1/5**: `1.6028`
- **Step 2/5**: `1.5178`
- **Step 3/5**: `1.4542`
- **Step 4/5**: `1.4861`
- **Step 5/5**: `1.3437`

Visual output artifact generated at: `outputs/untrained_model_output.png`

---

## 5. Training Status Statement

> **IMPORTANT STATUTORY CONFIRMATION:**
>
> **"Model architecture has been implemented and verified. Full model training has NOT been performed in Stage 1."**

---

## 6. Next Stage Outlook (Stage 2)

In Stage 2, the verified U-Net pipeline will move to full multi-epoch model training and evaluation:

$$\text{Dataset} \longrightarrow \text{Early-Fusion U-Net} \longrightarrow \text{BCE + Dice Loss} \longrightarrow \text{Training Loop} \longrightarrow \text{Validation} \longrightarrow \text{Checkpointing} \longrightarrow \text{Mask Evaluation}$$
