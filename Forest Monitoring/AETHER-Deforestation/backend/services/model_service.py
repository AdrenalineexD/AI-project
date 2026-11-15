"""
AETHER Deforestation Detection System — Model Loading & Lifecycle Service
========================================================================

Handles single-instance loading of the locked Stage 2B Early-Fusion U-Net model,
CUDA/CPU auto-detection, checkpoint integrity verification (SHA-256), and status reporting.
"""

import sys
import hashlib
import torch
from pathlib import Path
from typing import Dict, Any, Tuple

from backend.config import (
    CHECKPOINT_PATH,
    EXPECTED_SHA256,
    MODEL_NAME,
    ARCHITECTURE,
    INPUT_CHANNELS,
    OUTPUT_CHANNELS,
    INPUT_SIZE,
    THRESHOLD,
    PROJECT_ROOT,
)

# Ensure project root is in sys.path for importing models.unet
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from models.unet import UNet


def calculate_sha256(file_path: Path) -> str:
    """Calculates SHA-256 hash of a file."""
    if not file_path.exists():
        raise FileNotFoundError(f"Checkpoint file missing: '{file_path}'")
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(65536), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


class ModelService:
    """Singleton model service managing model lifecycle, evaluation mode, and execution context."""

    _instance = None

    def __init__(self):
        self.model: torch.nn.Module = None
        self.device: torch.device = None
        self.checkpoint_sha256: str = ""
        self.integrity_verified: bool = False
        self.loaded: bool = False

    @classmethod
    def get_instance(cls) -> "ModelService":
        if cls._instance is None:
            cls._instance = ModelService()
        return cls._instance

    def load_model(self) -> None:
        """Loads the locked Stage 2B U-Net model into memory and verifies checkpoint SHA-256."""
        print(f"[ModelService] Loading locked model from '{CHECKPOINT_PATH}'...")
        
        # 1. Checkpoint integrity check BEFORE loading
        self.checkpoint_sha256 = calculate_sha256(CHECKPOINT_PATH)
        print(f"[ModelService] Expected SHA-256: {EXPECTED_SHA256}")
        print(f"[ModelService] Calculated SHA-256: {self.checkpoint_sha256}")

        if self.checkpoint_sha256 != EXPECTED_SHA256:
            self.integrity_verified = False
            self.loaded = False
            raise ValueError(
                f"CRITICAL ERROR: Checkpoint SHA-256 mismatch!\n"
                f"Expected: {EXPECTED_SHA256}\nGot: {self.checkpoint_sha256}"
            )
        self.integrity_verified = True

        # 2. Hardware acceleration selection
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"[ModelService] Hardware acceleration device: {self.device}")

        # 3. Instantiate model architecture and load state dict
        checkpoint = torch.load(CHECKPOINT_PATH, map_location=self.device)
        self.model = UNet(in_channels=INPUT_CHANNELS, out_channels=OUTPUT_CHANNELS).to(self.device)
        
        # Handle checkpoint dict formats (model_state_dict or raw state_dict)
        if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
            state_dict = checkpoint["model_state_dict"]
        elif isinstance(checkpoint, dict) and "state_dict" in checkpoint:
            state_dict = checkpoint["state_dict"]
        else:
            state_dict = checkpoint

        self.model.load_state_dict(state_dict)

        # 4. Enforce evaluation mode
        self.model.eval()
        self.loaded = True
        print("[ModelService] Model successfully loaded and set to eval() mode.")

    def get_info(self) -> Dict[str, Any]:
        """Returns structured metadata about the loaded model."""
        return {
            "model_name": MODEL_NAME,
            "architecture": ARCHITECTURE,
            "checkpoint": str(CHECKPOINT_PATH.relative_to(PROJECT_ROOT) if CHECKPOINT_PATH.is_relative_to(PROJECT_ROOT) else CHECKPOINT_PATH),
            "threshold": THRESHOLD,
            "input_channels": INPUT_CHANNELS,
            "input_size": list(INPUT_SIZE),
            "output_channels": OUTPUT_CHANNELS,
            "checkpoint_sha256": self.checkpoint_sha256,
            "device": str(self.device) if self.device else "not loaded",
            "eval_mode": (not self.model.training) if self.model else False,
            "model_loaded": self.loaded,
            "integrity_verified": self.integrity_verified,
        }


# Global helper functions
def get_model_service() -> ModelService:
    return ModelService.get_instance()
