"""
AETHER Deforestation Detection System — Pydantic API Schemas
============================================================

Type validation definitions for requests, responses, regions, grid cells,
priority scores, health info, model metadata, and structured error responses.
"""

from typing import List, Optional, Tuple, Dict, Any
from pydantic import BaseModel, Field


class RootResponse(BaseModel):
    name: str = Field(..., example="AETHER Deforestation API")
    version: str = Field(..., example="1.0.0")
    module: str = Field(..., example="Deforestation Detection")
    stage: str = Field(..., example="6")
    status: str = Field(..., example="online")


class HealthResponse(BaseModel):
    status: str = Field(..., example="healthy")
    model_loaded: bool = Field(..., example=True)
    model_integrity: str = Field(..., example="PASS")
    model: str = Field(..., example="Stage2B-EarlyFusion-U-Net")
    threshold: float = Field(..., example=0.25)
    device: str = Field(..., example="cpu")


class ModelInfoResponse(BaseModel):
    model_name: str = Field(..., example="Stage2B Early-Fusion U-Net")
    architecture: str = Field(..., example="6-channel Early-Fusion U-Net")
    checkpoint: str = Field(..., example="checkpoints/stage2b/best_model.pth")
    threshold: float = Field(..., example=0.25)
    input_channels: int = Field(..., example=6)
    input_size: Tuple[int, int] = Field(..., example=(480, 480))
    output_channels: int = Field(..., example=1)
    checkpoint_sha256: str = Field(..., example="daaafa0e8f3ceb4041fb3c28ead53ee9151c559bf0551e4a9e06c40248f0c98b")
    device: str = Field(..., example="cpu")
    eval_mode: bool = Field(..., example=True)


class RegionDetail(BaseModel):
    region_id: int = Field(..., example=1)
    pixel_count: int = Field(..., example=1200)
    percentage_of_image: float = Field(..., example=0.5208)
    centroid_x: float = Field(..., example=145.2)
    centroid_y: float = Field(..., example=210.8)
    bbox_x_min: int = Field(..., example=100)
    bbox_y_min: int = Field(..., example=180)
    bbox_x_max: int = Field(..., example=190)
    bbox_y_max: int = Field(..., example=240)
    region_contribution_percent: float = Field(..., example=25.5)
    rank: int = Field(..., example=1)


class GridCellDetail(BaseModel):
    grid_id: str = Field(..., example="grid_r0_c0")
    grid_row: int = Field(..., example=0)
    grid_col: int = Field(..., example=0)
    x_min: int = Field(..., example=0)
    y_min: int = Field(..., example=0)
    x_max: int = Field(..., example=119)
    y_max: int = Field(..., example=119)
    predicted_deforestation_pixels: int = Field(..., example=500)
    predicted_deforestation_percent_of_cell: float = Field(..., example=3.4722)
    predicted_deforestation_percent_of_image: float = Field(..., example=0.217)
    number_of_regions_intersecting_cell: int = Field(..., example=2)
    largest_region_pixels_in_cell: int = Field(..., example=350)
    hotspot_score: float = Field(..., example=12.5)
    hotspot_level: str = Field(..., example="Low")


class PriorityDetail(BaseModel):
    normalized_deforestation_score: float = Field(..., example=100.0)
    normalized_largest_region_score: float = Field(..., example=69.17)
    normalized_region_count_score: float = Field(..., example=27.12)
    priority_score: float = Field(..., example=78.28)
    priority_level: str = Field(..., example="Critical")


class DeforestationSummary(BaseModel):
    image_width: int = Field(..., example=480)
    image_height: int = Field(..., example=480)
    predicted_pixels: int = Field(..., example=45428)
    predicted_percentage: float = Field(..., example=19.717)
    region_count: int = Field(..., example=32)
    largest_region_pixels: int = Field(..., example=11498)
    largest_region_percentage: float = Field(..., example=4.9905)
    concentration: str = Field(..., example="Dispersed")
    regions_per_100k_pixels: float = Field(..., example=13.8889)
    fragmentation_ratio: float = Field(..., example=0.000704)
    priority_score: float = Field(..., example=78.28)
    priority_level: str = Field(..., example="Critical")


class DeforestationAnalysisResponse(BaseModel):
    status: str = Field(..., example="success")
    request_id: str = Field(..., example="req_12345678")
    model: Dict[str, Any]
    input: Dict[str, Any]
    summary: DeforestationSummary
    priority: PriorityDetail
    regions: List[RegionDetail]
    grid: List[GridCellDetail]
    mask_id: str = Field(..., example="mask_12345678.png")
    spatial_coordinates: str = Field(default="image-space pixels only (no georeferencing/GSD)")


class PredictMaskResponse(BaseModel):
    status: str = Field(..., example="success")
    request_id: str = Field(..., example="req_12345678")
    mask_id: str = Field(..., example="mask_12345678.png")
    mask_url: str = Field(..., example="/api/v1/deforestation/mask/mask_12345678.png")
    deforestation_pixels: int = Field(..., example=45428)
    deforestation_percentage: float = Field(..., example=19.717)


class ErrorResponse(BaseModel):
    status: str = Field(default="error", example="error")
    message: str = Field(..., example="Expected image dimensions: 480×480 pixels.")
