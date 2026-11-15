"""
AETHER Deforestation Detection System — Inference Service
========================================================

Handles input image decoding, validation (480x480 RGB check), tensor preprocessing,
Early-Fusion U-Net model forward pass (torch.no_grad, sigmoid, threshold=0.25),
spatial intelligence execution, and binary mask generation/persistence.
"""

import io
import uuid
import numpy as np
from PIL import Image
import torch
import torchvision.transforms.functional as TF
from fastapi import UploadFile, HTTPException, status

from backend.config import (
    INPUT_SIZE,
    THRESHOLD,
    MAX_UPLOAD_SIZE_BYTES,
    MASK_OUTPUT_DIR,
)
from backend.services.model_service import get_model_service
from backend.services.spatial_service import SpatialIntelligenceService


class InferenceService:
    """Orchestrates image validation, PyTorch U-Net inference, and spatial intelligence pipeline."""

    @staticmethod
    def validate_and_load_image(file_bytes: bytes, filename: str) -> Image.Image:
        """
        Validates file size, decodes PIL image, verifies RGB mode and exact 480x480 dimensions.
        Rejects non-480x480 images with HTTP 400.
        """
        if len(file_bytes) > MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{filename}' exceeds maximum allowed upload size of 10 MB.",
            )

        try:
            image = Image.open(io.BytesIO(file_bytes))
            image.verify()  # Verify image integrity
            image = Image.open(io.BytesIO(file_bytes))  # Re-open after verify()
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Uploaded file '{filename}' is not a valid or readable image.",
            )

        # Strict RGB conversion
        image = image.convert("RGB")

        # Strict Dimension Check
        if image.size != INPUT_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Expected image dimensions: 480×480 pixels.",
            )

        return image

    @classmethod
    async def process_analysis_request(
        cls, before_file: UploadFile, after_file: UploadFile
    ) -> dict:
        """
        Main execution workflow for /api/v1/deforestation/analyze endpoint.
        """
        model_service = get_model_service()
        if not model_service.loaded:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Locked model is not loaded or failed integrity checks.",
            )

        # 1. Read file bytes
        before_bytes = await before_file.read()
        after_bytes = await after_file.read()

        # 2. Validate and decode PIL images
        img_a = cls.validate_and_load_image(before_bytes, before_file.filename or "before_image")
        img_b = cls.validate_and_load_image(after_bytes, after_file.filename or "after_image")

        # 3. Preprocessing (exact Stage 2B pipeline)
        tensor_a = TF.to_tensor(img_a)  # [3, 480, 480], float32 scaled to [0, 1]
        tensor_b = TF.to_tensor(img_b)  # [3, 480, 480], float32 scaled to [0, 1]

        # Early-Fusion concatenation: [6, 480, 480]
        input_tensor = torch.cat([tensor_a, tensor_b], dim=0).unsqueeze(0)  # [1, 6, 480, 480]
        input_tensor = input_tensor.to(model_service.device)

        # 4. Locked U-Net Inference
        with torch.no_grad():
            logits = model_service.model(input_tensor)
            probs = torch.sigmoid(logits)
            preds_binary = (probs >= THRESHOLD).float()

        pred_array = preds_binary[0, 0].cpu().numpy().astype(np.uint8)

        # 5. Spatial Intelligence & Region Analysis
        spatial_results = SpatialIntelligenceService.analyze_mask(pred_array)

        # 6. Generate Unique Request ID and Save Binary Prediction Mask PNG
        request_uuid = uuid.uuid4().hex[:12]
        request_id = f"req_{request_uuid}"
        mask_id = f"mask_{request_uuid}.png"
        mask_file_path = MASK_OUTPUT_DIR / mask_id

        # Convert binary numpy array (0/1) to PIL Image (0/255)
        mask_img = Image.fromarray(pred_array * 255, mode="L")
        mask_img.save(mask_file_path, format="PNG")

        model_info = model_service.get_info()

        return {
            "status": "success",
            "request_id": request_id,
            "model": {
                "name": model_info["model_name"],
                "architecture": model_info["architecture"],
                "checkpoint": model_info["checkpoint"],
                "threshold": THRESHOLD,
                "device": model_info["device"],
            },
            "input": {
                "before_filename": before_file.filename or "before.png",
                "after_filename": after_file.filename or "after.png",
                "dimensions": list(INPUT_SIZE),
                "channels": 6,
            },
            "summary": spatial_results["summary"],
            "priority": spatial_results["priority"],
            "regions": spatial_results["regions"],
            "grid": spatial_results["grid"],
            "mask_id": mask_id,
            "spatial_coordinates": "image-space pixels only (no georeferencing/GSD)",
        }

    @classmethod
    async def process_predict_mask_request(
        cls, before_file: UploadFile, after_file: UploadFile
    ) -> Tuple[bytes, str, dict]:
        """
        Main execution workflow for /api/v1/deforestation/predict-mask endpoint.
        Returns raw PNG bytes, mask_id, and summary stats.
        """
        analysis_result = await cls.process_analysis_request(before_file, after_file)
        mask_id = analysis_result["mask_id"]
        mask_path = MASK_OUTPUT_DIR / mask_id

        with open(mask_path, "rb") as f:
            png_bytes = f.read()

        summary = analysis_result["summary"]
        return png_bytes, mask_id, summary
