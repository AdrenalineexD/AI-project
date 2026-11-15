# AETHER Stage 6 — Deforestation Backend & FastAPI Integration Report

## 1. Stage 6 Objective
The objective of Stage 6 is to build a production-grade, locally runnable FastAPI backend REST service for the completed AETHER Deforestation Detection pipeline. The backend connects the locked Stage 2B Early-Fusion U-Net neural network and the Stage 4A/4B Spatial and Region Intelligence pipeline, exposing structured RESTful endpoints for consumption by the future AETHER React Dashboard.

Stage 6 is strictly an integration and API deployment stage. No model retraining, weight updates, hyperparameter tuning, or architectural modifications were performed.

---

## 2. Scope
- Expose the locked Stage 2B U-Net model (`checkpoints/stage2b/best_model.pth`) via FastAPI.
- Execute full bi-temporal satellite image inference (`[1, 6, 480, 480]` input, operating threshold `0.25`).
- Reproduce pure NumPy 8-connectivity Disjoint-Set Union (DSU) region extraction from Stage 4A.
- Reproduce spatial concentration classification, fixed Stage 4B reference priority scoring, and 4×4 grid hotspot decomposition from Stage 4B.
- Provide comprehensive Pydantic schemas, Swagger UI documentation (`/docs`), ReDoc documentation (`/redoc`), and 24 automated quality checks.
- Enforce strict input validation (480×480 RGB check, HTTP 400 rejection for invalid dimensions).

---

## 3. Previous Stage Dependencies
- **Stage 1**: Dataset preparation and verification.
- **Stage 2B**: Early-Fusion 6-channel U-Net architecture (`models/unet.py`) and locked best checkpoint (`checkpoints/stage2b/best_model.pth`).
- **Stage 4A**: 8-connectivity DSU region extraction logic and component boundary definitions.
- **Stage 4B**: Spatial intelligence, 4×4 grid hotspot scoring, and 33-image benchmark priority reference statistics.

---

## 4. Locked Model Configuration
- **Model Name**: Stage 2B Early-Fusion Classical U-Net
- **Architecture**: 6-channel Early-Fusion U-Net (DoubleConv encoder-decoder with skip connections)
- **Input Channels**: 6 (Image A RGB + Image B RGB concatenated channel-wise)
- **Output Channels**: 1 (Binary deforestation logit map)
- **Input Dimensions**: 480 × 480 pixels
- **Checkpoint Location**: `checkpoints/stage2b/best_model.pth`
- **Operating Threshold**: `0.25`
- **Evaluation Mode**: Enforced (`model.eval()`, `torch.no_grad()`)

---

## 5. Checkpoint Integrity
The SHA-256 hash of the locked Stage 2B checkpoint was verified before implementation and after the complete Stage 6 automated test suite execution.

- **Expected SHA-256**: `daaafa0e8f3ceb4041fb3c28ead53ee9151c559bf0551e4a9e06c40248f0c98b`
- **Calculated SHA-256 (Pre-Execution)**: `daaafa0e8f3ceb4041fb3c28ead53ee9151c559bf0551e4a9e06c40248f0c98b`
- **Calculated SHA-256 (Post-Execution)**: `daaafa0e8f3ceb4041fb3c28ead53ee9151c559bf0551e4a9e06c40248f0c98b`
- **Integrity Status**: **PASS (100% Unchanged)**

---

## 6. Backend Architecture
The backend is structured into modular service layers under `AETHER-Deforestation/backend/`:

1. **API Router Layer (`main.py`)**: Defines FastAPI routes, lifespan context management, CORS middleware, and custom HTTP exception handlers.
2. **Configuration Layer (`config.py`)**: Centralizes file paths, model parameters, Stage 4B reference normalization constants, upload limits, and CORS origins.
3. **Schema Layer (`schemas.py`)**: Pydantic models for strict type validation of requests, summaries, regions, grid cells, priority scores, and health/model metadata.
4. **Model Lifecycle Service (`services/model_service.py`)**: Singleton service managing pre-load SHA-256 verification, single-instance model loading on startup, CUDA/CPU auto-detection, and status reporting.
5. **Inference Service (`services/inference_service.py`)**: Validates input images (480×480 RGB), prepares 6-channel tensors, executes `torch.no_grad()` inference, and generates binary prediction mask PNGs.
6. **Spatial Intelligence Service (`services/spatial_service.py`)**: Executes 8-connectivity DSU component labeling, region ranking, concentration classification, fixed priority scoring, and 4×4 grid analysis.

---

## 7. Directory Structure
```
AETHER-Deforestation/
└── backend/
    ├── __init__.py
    ├── config.py
    ├── main.py
    ├── schemas.py
    ├── test_api.py
    ├── services/
    │   ├── __init__.py
    │   ├── inference_service.py
    │   ├── model_service.py
    │   └── spatial_service.py
    └── outputs/
        └── masks/
```

---

## 8. Configuration
Centralized configuration parameters defined in `backend/config.py`:
- `CHECKPOINT_PATH`: `checkpoints/stage2b/best_model.pth`
- `EXPECTED_SHA256`: `daaafa0e8f3ceb4041fb3c28ead53ee9151c559bf0551e4a9e06c40248f0c98b`
- `INPUT_SIZE`: `(480, 480)`
- `THRESHOLD`: `0.25`
- `MAX_UPLOAD_SIZE_BYTES`: `10,485,760` bytes (10 MB)
- `STAGE4B_REF_P_MAX`: `19.717`
- `STAGE4B_REF_L_MAX`: `7.2153`
- `STAGE4B_REF_C_MAX`: `118`
- `CORS_ORIGINS`: `["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"]`

---

## 9. Model Loading
Model loading is handled by `ModelService.get_instance()` during application startup using FastAPI lifespan context manager (`@asynccontextmanager`). The 31M parameter U-Net model is loaded once into CPU/CUDA memory and kept in `model.eval()` mode. The model is NOT reloaded per API request, ensuring fast inference latency (~2.0 seconds on CPU).

---

## 10. Image Validation
Uploaded image files (`before_image` and `after_image`) undergo strict validation:
1. **File Size**: Uploads exceeding 10 MB are rejected.
2. **Decoding Integrity**: PIL decodes and verifies image data integrity.
3. **Color Space**: Converted to RGB format.
4. **Dimensions Check**: Uploaded images MUST be exactly 480 × 480 pixels. Non-480×480 images are rejected with HTTP 400 and detail message `"Expected image dimensions: 480×480 pixels."`.

---

## 11. Inference Pipeline
$$\text{Image A (RGB)} + \text{Image B (RGB)} \longrightarrow [3, 480, 480] \times 2 \longrightarrow [6, 480, 480] \longrightarrow [1, 6, 480, 480]$$
$$\text{Logits} = \text{UNet}([1, 6, 480, 480]) \longrightarrow \text{Probs} = \sigma(\text{Logits}) \longrightarrow \text{Binary Mask} = (\text{Probs} \ge 0.25)$$

Inference runs under `torch.no_grad()` to prevent gradient memory accumulation.

---

## 12. Binary Mask Generation
The output tensor is converted to a 2D NumPy array of uint8 values (`1` for deforestation, `0` for background). A binary PNG image (`0` = black, `255` = white) is generated and saved to `backend/outputs/masks/mask_<uuid>.png`.

---

## 13. Stage 4A Region Analysis
Pure NumPy Two-Pass Disjoint-Set Union (DSU) for 8-Connectivity Component Labeling extracts connected deforestation regions. Each region includes:
- `region_id`, `pixel_count`, `percentage_of_image`
- `centroid_x`, `centroid_y` (image-space pixel coordinates)
- Bounding box (`bbox_x_min`, `bbox_y_min`, `bbox_x_max`, `bbox_y_max`)
- `region_contribution_percent` and per-image area rank (1..N).

---

## 14. Stage 4B Spatial Intelligence
- **Regions per 100k Pixels**: `region_count / 230400 × 100000`
- **Fragmentation Ratio**: `region_count / max(deforestation_pixels, 1)`
- **Concentration Classification**:
  - `Largest Region Fraction >= 70%` $\rightarrow$ **Highly Concentrated**
  - `40% <= Fraction < 70%` $\rightarrow$ **Moderately Concentrated**
  - `< 40%` $\rightarrow$ **Dispersed**

---

## 15. Priority Normalization
To ensure live API priority scores are directly comparable to Stage 4B benchmark results, normalization uses fixed reference statistics from the Stage 4B 33-image benchmark dataset:

$$\text{Norm}_P = \text{clip}\left(\frac{P - 0.0}{19.717} \times 100, 0, 100\right)$$
$$\text{Norm}_L = \text{clip}\left(\frac{L - 0.0}{7.2153} \times 100, 0, 100\right)$$
$$\text{Norm}_C = \text{clip}\left(\frac{C - 0}{118} \times 100, 0, 100\right)$$
$$\text{Priority Score} = \text{clip}\left(0.50 \times \text{Norm}_P + 0.35 \times \text{Norm}_L + 0.15 \times \text{Norm}_C, 0, 100\right)$$

- **Priority Levels**: `0–24` Low, `25–49` Moderate, `50–74` High, `75–100` Critical.

---

## 16. 4×4 Grid Hotspot Analysis
The 480×480 image space is partitioned into 16 cells of 120×120 pixels. For each cell:
$$\text{Hotspot Score} = \text{clip}\left(0.80 \times \text{Pct}_{\text{cell}} + 0.20 \times \text{LargestCellPct}, 0, 100\right)$$
- **Hotspot Levels**: `0–24` Low, `25–49` Moderate, `50–74` High, `75–100` Critical.

---

## 17. API Endpoints
- `GET /`: Returns basic API service information.
- `GET /health`: Returns system health, model loaded status, device, and checkpoint integrity status.
- `GET /api/v1/model`: Returns detailed model configuration metadata.
- `POST /api/v1/deforestation/analyze`: Main endpoint accepting multipart `before_image` and `after_image` uploads and returning full JSON spatial analysis.
- `POST /api/v1/deforestation/predict-mask`: Accepts Before/After images and streams binary prediction PNG mask.
- `GET /api/v1/deforestation/mask/{mask_id}`: Serves saved prediction PNG mask by sanitized ID.

---

## 18. Pydantic Schemas
Structured type definitions in `backend/schemas.py`:
- `RootResponse`, `HealthResponse`, `ModelInfoResponse`
- `RegionDetail`, `GridCellDetail`, `PriorityDetail`, `DeforestationSummary`
- `DeforestationAnalysisResponse`, `PredictMaskResponse`, `ErrorResponse`

---

## 19. Error Handling and Security
- Custom exception handlers return structured JSON (`{"status": "error", "message": "..."}`) without exposing internal stack traces.
- Filename sanitization and strict regex validation (`^mask_[a-f0-9]{12}\.png$`) prevent directory traversal attacks.
- CORS is restricted to local frontend development origins (`http://localhost:5173`, `http://localhost:3000`).

---

## 20. Automated Testing
Ran `python backend/test_api.py` using `FastAPI TestClient`. Tested basic endpoints, input validation rejections, end-to-end inference, mask PNG generation, and 24 Quality Checks.

---

## 21. Stage 4B Consistency Verification
Ran end-to-end API inference on benchmark image pair `test_000011.png` and compared results against Stage 4B reference outputs:

| Metric | Stage 4B Reference | Stage 6 API Output | Match Status |
| :--- | :--- | :--- | :--- |
| **Deforestation Pixels** | 45,428 | 45,428 | **PASS (100% Exact)** |
| **Deforestation Percentage** | 19.717% | 19.717% | **PASS (100% Exact)** |
| **Region Count** | 32 | 32 | **PASS (100% Exact)** |
| **Largest Region Percentage** | 4.9905% | 4.9905% | **PASS (100% Exact)** |
| **Priority Score** | 78.28 | 78.28 | **PASS (100% Exact)** |
| **Priority Level** | Critical | Critical | **PASS (100% Exact)** |
| **Spatial Concentration** | Dispersed | Dispersed | **PASS (100% Exact)** |
| **Grid Cell Count** | 16 | 16 | **PASS (100% Exact)** |

---

## 22. Final Verification & Quality Checks

### Quality Checks Summary (24 / 24 PASS)
```
[PASS] CHECK 01: FastAPI application and backend modules import successfully
[PASS] CHECK 02: Stage 2B checkpoint file best_model.pth exists
[PASS] CHECK 03: Pre-execution Checkpoint SHA-256 hash verified
[PASS] CHECK 04: Model loaded during application startup lifespan
[PASS] CHECK 05: Model strictly set to evaluation mode (model.eval())
[PASS] CHECK 06: Hardware acceleration device selected: cpu
[PASS] CHECK 07: GET / returns 200 OK with online status
[PASS] CHECK 08: GET /health returns 200 OK with healthy status
[PASS] CHECK 09: GET /api/v1/model returns locked U-Net metadata
[PASS] CHECK 10: Input validator rejects non-480x480 images with HTTP 400
[PASS] CHECK 11: Input validator rejects corrupt file data with structured HTTP 400
[PASS] CHECK 12: Input validator rejects missing uploaded files with HTTP 422
[PASS] CHECK 13: POST /api/v1/deforestation/analyze executes successfully
[PASS] CHECK 14: Early-Fusion 6-channel tensor input created
[PASS] CHECK 15: Inference strictly applies operating threshold 0.25
[PASS] CHECK 16: Binary prediction mask generated and assigned unique mask_id
[PASS] CHECK 17: Pure NumPy 8-connectivity DSU component labeling executed
[PASS] CHECK 18: Spatial concentration classified according to Stage 4B rules
[PASS] CHECK 19: Fixed Stage 4B priority scoring formula applied
[PASS] CHECK 20: 4x4 Grid decomposition generates exactly 16 cells
[PASS] CHECK 21: POST /api/v1/deforestation/predict-mask returns binary PNG mask stream
[PASS] CHECK 22: GET /api/v1/deforestation/mask/{mask_id} serves saved mask PNG
[PASS] CHECK 23: Stage 4B consistency test for test_000011 matches reference metrics
[PASS] CHECK 24: Post-execution Checkpoint SHA-256 hash remains 100% unchanged

TOTAL CHECKS: 24 | PASSED: 24 | FAILED: 0
```

---

## 23. Scientific / Technical Limitations
1. **Image-Space Coordinates Only**: Bounding boxes, centroids, pixel areas, and percentages operate strictly within 480×480 image space. No physical area estimates ($km^2$, hectares, acres) or GPS coordinates are provided due to lack of GSD/georeferencing metadata in the dataset.
2. **Engineering Classifications**: Priority levels, concentration classes, and hotspot levels are UI decision-support classifications, not ecologically validated standards.
3. **Fixed Benchmark Normalization**: Priority scoring uses fixed reference min/max bounds from the Stage 4B 33-image benchmark dataset to ensure cross-image consistency.

---

## 24. Conclusion
Stage 6 implementation is **COMPLETE and VERIFIED (PASS)**. The Stage 2B model weights and dataset remain 100% untouched. The FastAPI backend is fully prepared to serve real-time deforestation intelligence to the future AETHER React Dashboard.
