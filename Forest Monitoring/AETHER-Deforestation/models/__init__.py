"""
AETHER Deforestation Detection Models Package
============================================

Contains deep learning model architectures for deforestation detection:
- UNet: Early-Fusion 6-channel classical U-Net architecture.
- DoubleConv: Reusable double convolution block.
"""

from .unet import UNet, DoubleConv

__all__ = ["UNet", "DoubleConv"]
