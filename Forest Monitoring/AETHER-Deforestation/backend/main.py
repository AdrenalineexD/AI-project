"""
AETHER Deforestation Detection System — FastAPI Application Entry Point
========================================================================

Production-grade FastAPI application exposing REST API endpoints for deforestation detection,
spatial intelligence analysis, prediction mask generation, model metadata, and health status.
"""

import os
import re
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from backend.config import (
    API_NAME,
    API_VERSION,
    API_MODULE,
    API_STAGE,
    CORS_ORIGINS,
    MASK_OUTPUT_DIR,
)
from backend.schemas import (
    RootResponse,
    HealthResponse,
    ModelInfoResponse,
    DeforestationAnalysisResponse,
    PredictMaskResponse,
    ErrorResponse,
)
from backend.services.model_service import get_model_service
from backend.services.inference_service import InferenceService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager loading the locked U-Net model ONCE during application startup."""
    print("=" * 80)
    print(f"STARTING {API_NAME} (v{API_VERSION})")
    print("=" * 80)
    try:
        model_service = get_model_service()
        model_service.load_model()
    except Exception as e:
        print(f"CRITICAL ERROR during startup model loading: {e}")
        # Allow app to start so health endpoint can report unhealthy status
    yield
    print(f"SHUTTING DOWN {API_NAME}")


app = FastAPI(
    title=API_NAME,
    version=API_VERSION,
    description="AETHER Autonomous Forest Monitoring — Deforestation Detection Backend REST API",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS for local development (React dashboard integration)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request, exc: HTTPException):
    """Custom exception handler delivering structured JSON error responses without stack traces."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"status": "error", "message": str(exc.detail)},
    )


@app.get("/", response_model=RootResponse, summary="API Root Information")
async def root():
    """Returns basic API service metadata."""
    return {
        "name": API_NAME,
        "version": API_VERSION,
        "module": API_MODULE,
        "stage": API_STAGE,
        "status": "online",
    }


@app.get("/health", response_model=HealthResponse, summary="System Health Check")
async def health():
    """Checks system health, model loading status, and checkpoint hash integrity."""
    model_service = get_model_service()
    model_info = model_service.get_info()

    is_healthy = model_info["model_loaded"] and model_info["integrity_verified"]
    status_str = "healthy" if is_healthy else "unhealthy"

    return {
        "status": status_str,
        "model_loaded": model_info["model_loaded"],
        "model_integrity": "PASS" if model_info["integrity_verified"] else "FAIL",
        "model": "Stage2B-EarlyFusion-U-Net",
        "threshold": model_info["threshold"],
        "device": model_info["device"],
    }


@app.get("/api/v1/model", response_model=ModelInfoResponse, summary="Model Metadata Information")
async def get_model_info():
    """Returns detailed technical specifications of the locked Stage 2B model."""
    model_service = get_model_service()
    if not model_service.loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not loaded or failed integrity verification.",
        )
    return model_service.get_info()


@app.post(
    "/api/v1/deforestation/analyze",
    response_model=DeforestationAnalysisResponse,
    summary="Main Deforestation & Spatial Intelligence Analysis",
    responses={
        400: {"model": ErrorResponse, "description": "Invalid image format or dimensions (not 480x480)"},
        500: {"model": ErrorResponse, "description": "Inference server error"},
    },
)
async def analyze_deforestation(
    before_image: UploadFile = File(..., description="Before satellite image (480x480 RGB)"),
    after_image: UploadFile = File(..., description="After satellite image (480x480 RGB)"),
):
    """
    Main Deforestation Detection Endpoint.

    Accepts a bi-temporal pair of satellite images (Before & After, 480x480 RGB).
    Executes locked Stage 2B Early-Fusion U-Net inference, 8-connectivity DSU region extraction,
    spatial concentration classification, fixed Stage 4B priority scoring, and 4x4 grid analysis.
    """
    return await InferenceService.process_analysis_request(before_image, after_image)


@app.post(
    "/api/v1/deforestation/predict-mask",
    summary="Generate Binary Deforestation Prediction Mask",
    responses={
        200: {"content": {"image/png": {}}, "description": "Binary PNG prediction mask (0=Forest, 255=Deforestation)"},
        400: {"model": ErrorResponse, "description": "Invalid image format or dimensions"},
    },
)
async def predict_deforestation_mask(
    before_image: UploadFile = File(..., description="Before satellite image (480x480 RGB)"),
    after_image: UploadFile = File(..., description="After satellite image (480x480 RGB)"),
):
    """
    Generates and streams the binary deforestation prediction mask PNG directly.
    """
    png_bytes, mask_id, summary = await InferenceService.process_predict_mask_request(before_image, after_image)
    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={
            "X-Mask-ID": mask_id,
            "X-Deforestation-Pixels": str(summary["predicted_pixels"]),
            "X-Deforestation-Percent": str(summary["predicted_percentage"]),
        },
    )


@app.get("/api/v1/deforestation/mask/{mask_id}", summary="Download Generated Prediction Mask PNG")
async def get_mask(mask_id: str):
    """
    Serves a generated binary prediction mask PNG by mask ID.
    Strictly validates mask_id format to prevent directory traversal vulnerabilities.
    """
    # Strict filename pattern validation
    if not re.match(r"^mask_[a-f0-9]{12}\.png$", mask_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid mask ID format.",
        )

    file_path = (MASK_OUTPUT_DIR / mask_id).resolve()
    if not file_path.exists() or not str(file_path).startswith(str(MASK_OUTPUT_DIR.resolve())):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requested mask image not found.",
        )

    return FileResponse(file_path, media_type="image/png")
