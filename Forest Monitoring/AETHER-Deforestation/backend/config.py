"""
AETHER Deforestation Detection System — Stage 6 Configuration
============================================================

Centralized configuration settings for the FastAPI backend, model loading,
preprocessing, fixed Stage 4B reference scoring, CORS, and paths.
"""

import os
from pathlib import Path

# Paths
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
CHECKPOINT_PATH = PROJECT_ROOT / "checkpoints" / "stage2b" / "best_model.pth"
MASK_OUTPUT_DIR = BACKEND_DIR / "outputs" / "masks"

# Ensure output directory exists
os.makedirs(MASK_OUTPUT_DIR, exist_ok=True)

# Locked Model Configuration
EXPECTED_SHA256 = "daaafa0e8f3ceb4041fb3c28ead53ee9151c559bf0551e4a9e06c40248f0c98b"
MODEL_NAME = "Stage2B Early-Fusion U-Net"
ARCHITECTURE = "6-channel Early-Fusion U-Net"
INPUT_CHANNELS = 6
OUTPUT_CHANNELS = 1
INPUT_SIZE = (480, 480)
THRESHOLD = 0.25

# Fixed Stage 4B Priority Reference Normalization Statistics (from 33-image benchmark)
STAGE4B_REF_P_MIN = 0.0
STAGE4B_REF_P_MAX = 19.717
STAGE4B_REF_L_MIN = 0.0
STAGE4B_REF_L_MAX = 7.2153
STAGE4B_REF_C_MIN = 0
STAGE4B_REF_C_MAX = 118

# Security & Upload Constraints
MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/bmp", "image/tiff"}
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

# API Info
API_NAME = "AETHER Deforestation API"
API_VERSION = "1.0.0"
API_MODULE = "Deforestation Detection"
API_STAGE = "6"
