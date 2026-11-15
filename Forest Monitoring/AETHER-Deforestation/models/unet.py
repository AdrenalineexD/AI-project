"""
AETHER Deforestation Detection System — Early-Fusion Classical U-Net Architecture
===============================================================================

This module implements an Early-Fusion U-Net neural network designed for bi-temporal
change detection / deforestation segmentation from paired satellite images (Before & After).

KEY ARCHITECTURAL HIGHLIGHTS:
1. 6-Channel Input:
   - Image A (Before):  RGB (3 channels)
   - Image B (After):   RGB (3 channels)
   - Early Fusion: Concatenating A and B along channel dimension gives 6 channels: [B, 6, H, W]
2. Classical U-Net Encoder-Decoder:
   - Encoder: 4 contraction stages (6->64, 64->128, 128->256, 256->512) with MaxPool (2x2).
   - Bottleneck: 512->1024 channels.
   - Decoder: 4 expansion stages with transposed convolutions and skip connections from encoder.
   - Final Layer: 1x1 Convolution mapping 64 channels to 1 output channel.
3. Raw Logits Output:
   - Output shape: [B, 1, H, W]
   - Returns unscaled logits (NO Sigmoid layer inside). Sigmoid is applied during loss or inference.

Author: AETHER EDI Team
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Tuple


class DoubleConv(nn.Module):
    """
    Double Convolution Block: (Conv2D -> BatchNorm -> ReLU) x 2

    This reusable building block performs two consecutive 3x3 2D convolutions,
    each followed by Batch Normalization and ReLU activation.

    Padding=1 ensures that spatial dimensions (H, W) are preserved across convolutions.
    """

    def __init__(self, in_channels: int, out_channels: int):
        super(DoubleConv, self).__init__()
        self.conv = nn.Sequential(
            # First convolution: map in_channels -> out_channels
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            # Second convolution: out_channels -> out_channels
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass through double convolution block.
        Input shape:  [B, in_channels, H, W]
        Output shape: [B, out_channels, H, W]
        """
        return self.conv(x)


class UNet(nn.Module):
    """
    Early-Fusion Classical U-Net Architecture for Deforestation Segmentation.

    Input:  Bi-temporal stacked satellite tensor [B, 6, 480, 480]
    Output: Deforestation logit map [B, 1, 480, 480]
    """

    def __init__(self, in_channels: int = 6, out_channels: int = 1):
        """
        Args:
            in_channels (int): Number of input image channels (default: 6 for early fusion RGB+RGB).
            out_channels (int): Number of target segmentation channels (default: 1 for binary mask).
        """
        super(UNet, self).__init__()

        # ---------------------------------------------------------------------
        # ENCODER (Contracting Path)
        # ---------------------------------------------------------------------
        # Stage 1: 6 -> 64 channels
        self.enc1 = DoubleConv(in_channels, 64)
        self.pool1 = nn.MaxPool2d(kernel_size=2, stride=2)

        # Stage 2: 64 -> 128 channels
        self.enc2 = DoubleConv(64, 128)
        self.pool2 = nn.MaxPool2d(kernel_size=2, stride=2)

        # Stage 3: 128 -> 256 channels
        self.enc3 = DoubleConv(128, 256)
        self.pool3 = nn.MaxPool2d(kernel_size=2, stride=2)

        # Stage 4: 256 -> 512 channels
        self.enc4 = DoubleConv(256, 512)
        self.pool4 = nn.MaxPool2d(kernel_size=2, stride=2)

        # ---------------------------------------------------------------------
        # BOTTLENECK (Deepest Feature Representation)
        # ---------------------------------------------------------------------
        # Stage 5: 512 -> 1024 channels
        self.bottleneck = DoubleConv(512, 1024)

        # ---------------------------------------------------------------------
        # DECODER (Expanding Path with Skip Connections)
        # ---------------------------------------------------------------------
        # Decoder 1: Upsample 1024 -> 512, then concatenate skip from Enc4 (512) -> 1024 -> DoubleConv -> 512
        self.up1 = nn.ConvTranspose2d(1024, 512, kernel_size=2, stride=2)
        self.dec1 = DoubleConv(1024, 512)

        # Decoder 2: Upsample 512 -> 256, then concatenate skip from Enc3 (256) -> 512 -> DoubleConv -> 256
        self.up2 = nn.ConvTranspose2d(512, 256, kernel_size=2, stride=2)
        self.dec2 = DoubleConv(512, 256)

        # Decoder 3: Upsample 256 -> 128, then concatenate skip from Enc2 (128) -> 256 -> DoubleConv -> 128
        self.up3 = nn.ConvTranspose2d(256, 128, kernel_size=2, stride=2)
        self.dec3 = DoubleConv(256, 128)

        # Decoder 4: Upsample 128 -> 64, then concatenate skip from Enc1 (64) -> 128 -> DoubleConv -> 64
        self.up4 = nn.ConvTranspose2d(128, 64, kernel_size=2, stride=2)
        self.dec4 = DoubleConv(128, 64)

        # ---------------------------------------------------------------------
        # FINAL SEGMENTATION HEAD (1x1 Convolution)
        # ---------------------------------------------------------------------
        self.final_conv = nn.Conv2d(64, out_channels, kernel_size=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass of U-Net.

        Args:
            x (torch.Tensor): Concatenated input images [B, 6, H, W]

        Returns:
            torch.Tensor: Raw logits tensor [B, 1, H, W]
        """
        # =====================================================================
        # ENCODER FORWARD PASS
        # =====================================================================
        # Input: [B, 6, 480, 480]
        skip1 = self.enc1(x)            # -> Shape: [B, 64, 480, 480] (Skip connection 1)
        p1 = self.pool1(skip1)          # -> Shape: [B, 64, 240, 240]

        skip2 = self.enc2(p1)           # -> Shape: [B, 128, 240, 240] (Skip connection 2)
        p2 = self.pool2(skip2)          # -> Shape: [B, 128, 120, 120]

        skip3 = self.enc3(p2)           # -> Shape: [B, 256, 120, 120] (Skip connection 3)
        p3 = self.pool3(skip3)          # -> Shape: [B, 256, 60, 60]

        skip4 = self.enc4(p3)           # -> Shape: [B, 512, 60, 60] (Skip connection 4)
        p4 = self.pool4(skip4)          # -> Shape: [B, 512, 30, 30]

        # =====================================================================
        # BOTTLENECK FORWARD PASS
        # =====================================================================
        b = self.bottleneck(p4)         # -> Shape: [B, 1024, 30, 30]

        # =====================================================================
        # DECODER FORWARD PASS (With Skip Connections)
        # =====================================================================
        # Decoder Stage 1
        d1 = self.up1(b)                # -> Shape: [B, 512, 60, 60]
        # Pad d1 if needed to match skip4 dimensions (safety check for odd input sizes)
        if d1.shape[2:] != skip4.shape[2:]:
            d1 = F.interpolate(d1, size=skip4.shape[2:], mode='bilinear', align_corners=True)
        d1 = torch.cat([d1, skip4], dim=1)  # Concatenate channels -> [B, 1024, 60, 60]
        d1 = self.dec1(d1)                  # -> Shape: [B, 512, 60, 60]

        # Decoder Stage 2
        d2 = self.up2(d1)               # -> Shape: [B, 256, 120, 120]
        if d2.shape[2:] != skip3.shape[2:]:
            d2 = F.interpolate(d2, size=skip3.shape[2:], mode='bilinear', align_corners=True)
        d2 = torch.cat([d2, skip3], dim=1)  # Concatenate channels -> [B, 512, 120, 120]
        d2 = self.dec2(d2)                  # -> Shape: [B, 256, 120, 120]

        # Decoder Stage 3
        d3 = self.up3(d2)               # -> Shape: [B, 128, 240, 240]
        if d3.shape[2:] != skip2.shape[2:]:
            d3 = F.interpolate(d3, size=skip2.shape[2:], mode='bilinear', align_corners=True)
        d3 = torch.cat([d3, skip2], dim=1)  # Concatenate channels -> [B, 256, 240, 240]
        d3 = self.dec3(d3)                  # -> Shape: [B, 128, 240, 240]

        # Decoder Stage 4
        d4 = self.up4(d3)               # -> Shape: [B, 64, 480, 480]
        if d4.shape[2:] != skip1.shape[2:]:
            d4 = F.interpolate(d4, size=skip1.shape[2:], mode='bilinear', align_corners=True)
        d4 = torch.cat([d4, skip1], dim=1)  # Concatenate channels -> [B, 128, 480, 480]
        d4 = self.dec4(d4)                  # -> Shape: [B, 64, 480, 480]

        # =====================================================================
        # FINAL 1x1 CONVOLUTION OUTPUT
        # =====================================================================
        logits = self.final_conv(d4)    # -> Shape: [B, 1, 480, 480]
        return logits
