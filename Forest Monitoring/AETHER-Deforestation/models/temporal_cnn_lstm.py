"""
AETHER Deforestation Detection System — STAGE 5 CNN + LSTM TEMPORAL MODEL
=========================================================================

Combines a lightweight 2D CNN Spatial Encoder, a 1D LSTM Temporal Sequence Encoder,
and a Spatial Change Decoder (Option B - Temporal Segmentation Head) for bi-temporal
deforestation change detection.

Author: AETHER EDI Team
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class CNNSpatialEncoder(nn.Module):
    """
    Lightweight 2D CNN Spatial Feature Extractor.
    Input:  [B, 3, H, W]  (e.g., 480 x 480 RGB satellite image)
    Output:
      - spatial_features: [B, 128, H/8, W/8] (e.g., [B, 128, 60, 60])
      - feature_vector:   [B, 256]           (Pooled global vector for temporal sequence)
    """
    def __init__(self, in_channels=3, feature_dim=256):
        super(CNNSpatialEncoder, self).__init__()

        # Block 1: [B, 3, 480, 480] -> [B, 32, 240, 240]
        self.block1 = nn.Sequential(
            nn.Conv2d(in_channels, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2)
        )

        # Block 2: [B, 32, 240, 240] -> [B, 64, 120, 120]
        self.block2 = nn.Sequential(
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2)
        )

        # Block 3: [B, 64, 120, 120] -> [B, 128, 60, 60] (Spatial Feature Map)
        self.block3 = nn.Sequential(
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2)
        )

        # Block 4: [B, 128, 60, 60] -> [B, 256, 30, 30]
        self.block4 = nn.Sequential(
            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2)
        )

        self.global_pool = nn.AdaptiveAvgPool2d((1, 1))

    def forward(self, x):
        x1 = self.block1(x)   # [B, 32, 240, 240]
        x2 = self.block2(x1)  # [B, 64, 120, 120]
        s_feat = self.block3(x2) # [B, 128, 60, 60] (Spatial Map for Decoder)
        x4 = self.block4(s_feat) # [B, 256, 30, 30]
        
        pooled = self.global_pool(x4) # [B, 256, 1, 1]
        f_vec = pooled.view(x.size(0), -1) # [B, 256]

        return s_feat, f_vec


class TemporalCNNLSTM(nn.Module):
    """
    CNN + LSTM Temporal Change Detection Network.
    Processes ordered observation pair (Image A, Image B).
    Outputs:
      - seg_logits:   [B, 1, 480, 480] (Raw segmentation change logits)
      - score_logits: [B, 1]           (Global change probability logit)
    """
    def __init__(self, in_channels=3, cnn_feat_dim=256, lstm_hidden_dim=128):
        super(TemporalCNNLSTM, self).__init__()

        self.cnn_encoder = CNNSpatialEncoder(in_channels=in_channels, feature_dim=cnn_feat_dim)

        self.lstm = nn.LSTM(
            input_size=cnn_feat_dim,
            hidden_size=lstm_hidden_dim,
            num_layers=1,
            batch_first=True
        )

        # Global temporal change score head
        self.fc_change_score = nn.Linear(lstm_hidden_dim, 1)

        # Spatial Decoder (Option B - Temporal Segmentation Head)
        # Fuses: S_A (128), S_B (128), |S_B - S_A| (128), Broadcasted H (128) -> Total 512 channels
        self.dec_conv1 = nn.Sequential(
            nn.Conv2d(512, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True)
        )
        self.up1 = nn.Upsample(scale_factor=2, mode='bilinear', align_corners=False) # 60x60 -> 120x120

        self.dec_conv2 = nn.Sequential(
            nn.Conv2d(128, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True)
        )
        self.up2 = nn.Upsample(scale_factor=2, mode='bilinear', align_corners=False) # 120x120 -> 240x240

        self.dec_conv3 = nn.Sequential(
            nn.Conv2d(64, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True)
        )
        self.up3 = nn.Upsample(scale_factor=2, mode='bilinear', align_corners=False) # 240x240 -> 480x480

        self.final_conv = nn.Conv2d(32, 1, kernel_size=1)

    def forward(self, img_A, img_B):
        B = img_A.size(0)

        # 1. Spatial Feature Extraction
        s_feat_A, f_vec_A = self.cnn_encoder(img_A) # [B, 128, 60, 60], [B, 256]
        s_feat_B, f_vec_B = self.cnn_encoder(img_B) # [B, 128, 60, 60], [B, 256]

        # 2. Sequence Construction [B, T, F] -> [B, 2, 256]
        seq = torch.stack([f_vec_A, f_vec_B], dim=1)

        # 3. LSTM Temporal Encoding
        lstm_out, _ = self.lstm(seq) # [B, 2, 128]
        H_temp = lstm_out[:, -1, :]  # Final temporal hidden state [B, 128]

        # Global change score logit
        score_logits = self.fc_change_score(H_temp) # [B, 1]

        # 4. Spatial Feature Fusion for Decoder
        s_diff = torch.abs(s_feat_B - s_feat_A) # [B, 128, 60, 60]
        h_spatial = H_temp.unsqueeze(-1).unsqueeze(-1).expand(-1, -1, s_feat_A.size(2), s_feat_A.size(3)) # [B, 128, 60, 60]

        fused = torch.cat([s_feat_A, s_feat_B, s_diff, h_spatial], dim=1) # [B, 512, 60, 60]

        # 5. Decoder Upsampling
        d1 = self.up1(self.dec_conv1(fused)) # [B, 128, 120, 120]
        d2 = self.up2(self.dec_conv2(d1))    # [B, 64, 240, 240]
        d3 = self.up3(self.dec_conv3(d2))    # [B, 32, 480, 480]

        seg_logits = self.final_conv(d3)     # [B, 1, 480, 480]

        return seg_logits, score_logits


class SoftDiceLoss(nn.Module):
    """Soft Dice Loss for binary segmentation."""
    def __init__(self, smooth=1.0):
        super(SoftDiceLoss, self).__init__()
        self.smooth = smooth

    def forward(self, probs, targets):
        probs = probs.view(-1)
        targets = targets.view(-1)

        intersection = (probs * targets).sum()
        dice = (2.0 * intersection + self.smooth) / (probs.sum() + targets.sum() + self.smooth)
        return 1.0 - dice


class BCEDiceLoss(nn.Module):
    """
    Combined BCEWithLogitsLoss + Soft Dice Loss with 1:1 weighting.
    Supports optional auxiliary score_logits for global change head gradient backpropagation.
    """
    def __init__(self, bce_weight=1.0, dice_weight=1.0, aux_score_weight=0.1, smooth=1.0):
        super(BCEDiceLoss, self).__init__()
        self.bce_weight = bce_weight
        self.dice_weight = dice_weight
        self.aux_score_weight = aux_score_weight
        self.bce_loss = nn.BCEWithLogitsLoss()
        self.dice_loss = SoftDiceLoss(smooth=smooth)

    def forward(self, logits, targets, score_logits=None):
        bce = self.bce_loss(logits, targets)
        probs = torch.sigmoid(logits)
        dice = self.dice_loss(probs, targets)
        total_loss = self.bce_weight * bce + self.dice_weight * dice

        if score_logits is not None:
            # Derive binary image-level target (1 if deforestation > 0 pixels, else 0)
            score_targets = (targets.view(targets.size(0), -1).sum(dim=1, keepdim=True) > 0).float()
            aux_loss = self.bce_loss(score_logits, score_targets)
            total_loss = total_loss + self.aux_score_weight * aux_loss

        return total_loss
