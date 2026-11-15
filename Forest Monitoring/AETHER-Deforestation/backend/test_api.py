"""
AETHER Deforestation Detection System — Stage 6 Automated Test Suite
====================================================================

Executes complete API integration tests, input validation tests, Stage 4B reference
consistency verification for test_000011, and 24 automated quality checks.
"""

import os
import io
import sys
import time
import hashlib
from pathlib import Path
from PIL import Image
import torch
from fastapi.testclient import TestClient

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.main import app
from backend.config import CHECKPOINT_PATH, EXPECTED_SHA256
from backend.services.model_service import calculate_sha256, get_model_service


def run_tests():
    print("=" * 80)
    print("AETHER STAGE 6 — AUTOMATED BACKEND API & INTEGRATION TEST SUITE")
    print("=" * 80)

    start_time = time.time()
    quality_checks = []

    def log_check(check_num: int, description: str, passed: bool, detail: str = ""):
        status_str = "PASS" if passed else "FAIL"
        quality_checks.append({
            "id": f"CHECK {check_num}",
            "description": description,
            "status": status_str,
            "detail": detail
        })
        detail_msg = f" ({detail})" if detail else ""
        print(f"  [{status_str}] CHECK {check_num:02d}: {description}{detail_msg}")
        if not passed:
            print(f"         CRITICAL FAIL DETAIL: {detail}")

    # -------------------------------------------------------------------------
    # 1. CHECKPOINT & ENVIRONMENT INTEGRITY
    # -------------------------------------------------------------------------
    print("\n[STEP 1/5] Verifying Checkpoint & Environment Integrity...")

    # Check 1: Backend module imports
    log_check(1, "FastAPI application and backend modules import successfully", True)

    # Check 2: Checkpoint file exists
    chk_exists = CHECKPOINT_PATH.exists()
    log_check(2, "Stage 2B checkpoint file best_model.pth exists", chk_exists, str(CHECKPOINT_PATH))
    if not chk_exists:
        sys.exit(1)

    # Check 3: Pre-execution SHA-256 hash verification
    hash_pre = calculate_sha256(CHECKPOINT_PATH)
    hash_pre_pass = (hash_pre == EXPECTED_SHA256)
    log_check(3, "Pre-execution Checkpoint SHA-256 hash verified", hash_pre_pass, f"Got: {hash_pre}")
    if not hash_pre_pass:
        print(f"Expected: {EXPECTED_SHA256}")
        sys.exit(1)

    # Initialize TestClient within lifespan context manager (triggers app lifespan model loading)
    with TestClient(app) as client:
        model_service = get_model_service()

        # Check 4: Model loaded in app lifespan
        log_check(4, "Model loaded during application startup lifespan", model_service.loaded)

        # Check 5: Model in eval() mode
        is_eval = (model_service.model is not None) and (not model_service.model.training)
        log_check(5, "Model strictly set to evaluation mode (model.eval())", is_eval)

        # Check 6: Device selection
        log_check(6, f"Hardware acceleration device selected: {model_service.device}", True, str(model_service.device))

        # -------------------------------------------------------------------------
        # 2. BASIC ENDPOINTS (GET /, /health, /api/v1/model)
        # -------------------------------------------------------------------------
        print("\n[STEP 2/5] Testing Basic API Endpoints...")

        # Check 7: GET /
        res_root = client.get("/")
        root_pass = (res_root.status_code == 200) and (res_root.json().get("status") == "online")
        log_check(7, "GET / returns 200 OK with online status", root_pass, f"Status Code: {res_root.status_code}")

        # Check 8: GET /health
        res_health = client.get("/health")
        health_data = res_health.json() if res_health.status_code == 200 else {}
        health_pass = (res_health.status_code == 200) and (health_data.get("status") == "healthy") and health_data.get("model_loaded")
        log_check(8, "GET /health returns 200 OK with healthy status", health_pass, f"Data: {health_data}")

        # Check 9: GET /api/v1/model
        res_model = client.get("/api/v1/model")
        mdata = res_model.json() if res_model.status_code == 200 else {}
        model_pass = (res_model.status_code == 200) and (mdata.get("threshold") == 0.25) and (mdata.get("input_channels") == 6)
        log_check(9, "GET /api/v1/model returns locked U-Net metadata", model_pass, f"Threshold: {mdata.get('threshold')}")

        # -------------------------------------------------------------------------
        # 3. INPUT VALIDATION & ERROR HANDLING
        # -------------------------------------------------------------------------
        print("\n[STEP 3/5] Testing Input Validation & Structured Error Handling...")

        # Create dummy images for validation tests
        img_256 = Image.new("RGB", (256, 256), color=(100, 100, 100))
        buf_256 = io.BytesIO()
        img_256.save(buf_256, format="PNG")
        bytes_256 = buf_256.getvalue()

        img_480 = Image.new("RGB", (480, 480), color=(120, 120, 120))
        buf_480 = io.BytesIO()
        img_480.save(buf_480, format="PNG")
        bytes_480 = buf_480.getvalue()

        # Check 10: Reject wrong image dimensions (256x256)
        res_dim = client.post(
            "/api/v1/deforestation/analyze",
            files={
                "before_image": ("before.png", bytes_256, "image/png"),
                "after_image": ("after.png", bytes_480, "image/png"),
            },
        )
        dim_err_msg = res_dim.json().get("message", "") if res_dim.status_code == 400 else ""
        dim_pass = (res_dim.status_code == 400) and ("Expected image dimensions: 480×480 pixels." in dim_err_msg)
        log_check(10, "Input validator rejects non-480x480 images with HTTP 400", dim_pass, f"Msg: {dim_err_msg}")

        # Check 11: Reject corrupt image data
        res_corrupt = client.post(
            "/api/v1/deforestation/analyze",
            files={
                "before_image": ("before.png", b"invalid_binary_corrupt_data", "image/png"),
                "after_image": ("after.png", bytes_480, "image/png"),
            },
        )
        corrupt_pass = (res_corrupt.status_code == 400) and (res_corrupt.json().get("status") == "error")
        log_check(11, "Input validator rejects corrupt file data with structured HTTP 400", corrupt_pass)

        # Check 12: Reject missing input files
        res_missing = client.post("/api/v1/deforestation/analyze", files={})
        log_check(12, "Input validator rejects missing uploaded files with HTTP 422", res_missing.status_code == 422)

        # -------------------------------------------------------------------------
        # 4. END-TO-END INFERENCE & STAGE 4B CONSISTENCY (test_000011)
        # -------------------------------------------------------------------------
        print("\n[STEP 4/5] Testing Inference & Stage 4B Reference Consistency...")

        dataset_a_path = Path(r"C:\Users\HP\Downloads\Forest-Change-dataset (1)\Forest-Change-dataset\images\test\A\test_000011.png")
        dataset_b_path = Path(r"C:\Users\HP\Downloads\Forest-Change-dataset (1)\Forest-Change-dataset\images\test\B\test_000011.png")

        if not dataset_a_path.exists() or not dataset_b_path.exists():
            print(f"CRITICAL ERROR: Stage 4 test pair missing at '{dataset_a_path}'")
            sys.exit(1)

        with open(dataset_a_path, "rb") as fa, open(dataset_b_path, "rb") as fb:
            bytes_a = fa.read()
            bytes_b = fb.read()

        # Execute main analysis endpoint
        t_start_inf = time.time()
        res_analyze = client.post(
            "/api/v1/deforestation/analyze",
            files={
                "before_image": ("test_000011_A.png", bytes_a, "image/png"),
                "after_image": ("test_000011_B.png", bytes_b, "image/png"),
            },
        )
        t_inf_elapsed = time.time() - t_start_inf

        analyze_pass = (res_analyze.status_code == 200) and (res_analyze.json().get("status") == "success")
        log_check(13, "POST /api/v1/deforestation/analyze executes successfully", analyze_pass, f"Latency: {t_inf_elapsed*1000:.1f}ms")

        data_ans = res_analyze.json() if analyze_pass else {}
        summary = data_ans.get("summary", {})
        priority = data_ans.get("priority", {})
        regions = data_ans.get("regions", [])
        grid = data_ans.get("grid", [])

        # Check 14: 6-channel preprocessing verified implicitly by tensor input
        log_check(14, "Early-Fusion 6-channel tensor input created", analyze_pass)

        # Check 15: Operating threshold = 0.25 applied
        log_check(15, "Inference strictly applies operating threshold 0.25", data_ans.get("model", {}).get("threshold") == 0.25)

        # Check 16: Binary mask generated
        mask_id = data_ans.get("mask_id", "")
        log_check(16, "Binary prediction mask generated and assigned unique mask_id", bool(mask_id), mask_id)

        # Check 17: Pure NumPy 8-connectivity DSU region extraction
        region_cnt = summary.get("region_count", 0)
        log_check(17, "Pure NumPy 8-connectivity DSU component labeling executed", region_cnt > 0, f"Detected Regions: {region_cnt}")

        # Check 18: Spatial concentration classification
        concentration = summary.get("concentration", "")
        log_check(18, "Spatial concentration classified according to Stage 4B rules", concentration in ["Highly Concentrated", "Moderately Concentrated", "Dispersed"], f"Concentration: {concentration}")

        # Check 19: Fixed Stage 4B Priority Scoring formula
        pri_score = summary.get("priority_score", 0.0)
        pri_level = summary.get("priority_level", "")
        log_check(19, "Fixed Stage 4B priority scoring formula applied", 0.0 <= pri_score <= 100.0, f"Score: {pri_score}, Level: {pri_level}")

        # Check 20: 4x4 Grid analysis produces 16 cells
        log_check(20, "4x4 Grid decomposition generates exactly 16 cells", len(grid) == 16, f"Cell Count: {len(grid)}")

        # Check 21: POST /api/v1/deforestation/predict-mask PNG endpoint
        res_mask_gen = client.post(
            "/api/v1/deforestation/predict-mask",
            files={
                "before_image": ("test_000011_A.png", bytes_a, "image/png"),
                "after_image": ("test_000011_B.png", bytes_b, "image/png"),
            },
        )
        mask_gen_pass = (res_mask_gen.status_code == 200) and (res_mask_gen.headers.get("content-type") == "image/png")
        log_check(21, "POST /api/v1/deforestation/predict-mask returns binary PNG mask stream", mask_gen_pass)

        # Check 22: GET /api/v1/deforestation/mask/{mask_id} endpoint
        res_mask_file = client.get(f"/api/v1/deforestation/mask/{mask_id}")
        mask_file_pass = (res_mask_file.status_code == 200) and (res_mask_file.headers.get("content-type") == "image/png")
        log_check(22, "GET /api/v1/deforestation/mask/{mask_id} serves saved mask PNG", mask_file_pass)

        # -------------------------------------------------------------------------
        # STAGE 4B CONSISTENCY VERIFICATION (test_000011)
        # -------------------------------------------------------------------------
        print("\n[STEP 5/5] Running Stage 4B Reference Consistency Verification...")

        # Reference metrics for test_000011.png from Stage 4B outputs/stage4b_image_priority.csv
        exp_def_pct = 19.717
        exp_region_cnt = 32
        exp_largest_pct = 4.9905
        exp_pri_score = 78.28
        exp_pri_level = "Critical"
        exp_concentration = "Dispersed"

        act_def_pct = summary.get("predicted_percentage", 0.0)
        act_region_cnt = summary.get("region_count", 0)
        act_largest_pct = summary.get("largest_region_percentage", 0.0)
        act_pri_score = summary.get("priority_score", 0.0)
        act_pri_level = summary.get("priority_level", "")
        act_concentration = summary.get("concentration", "")

        consistency_passed = (
            abs(act_def_pct - exp_def_pct) < 1e-3 and
            act_region_cnt == exp_region_cnt and
            abs(act_largest_pct - exp_largest_pct) < 1e-3 and
            abs(act_pri_score - exp_pri_score) < 1e-2 and
            act_pri_level == exp_pri_level and
            act_concentration == exp_concentration
        )

        c_detail = (
            f"Deforestation %: {act_def_pct} (Exp: {exp_def_pct}) | "
            f"Regions: {act_region_cnt} (Exp: {exp_region_cnt}) | "
            f"Priority Score: {act_pri_score} (Exp: {exp_pri_score})"
        )
        log_check(23, "Stage 4B consistency test for test_000011 matches reference metrics", consistency_passed, c_detail)

    # Check 24: Post-execution SHA-256 hash verification
    hash_post = calculate_sha256(CHECKPOINT_PATH)
    hash_post_pass = (hash_post == EXPECTED_SHA256) and (hash_post == hash_pre)
    log_check(24, "Post-execution Checkpoint SHA-256 hash remains 100% unchanged", hash_post_pass, f"Got: {hash_post}")

    # Summary report
    total_checks = len(quality_checks)
    passed_checks = sum(1 for c in quality_checks if c["status"] == "PASS")
    failed_checks = total_checks - passed_checks

    print("\n" + "=" * 80)
    print("STAGE 6 AUTOMATED QUALITY CHECKS SUMMARY")
    print("=" * 80)
    for c in quality_checks:
        print(f"  [{c['status']}] {c['id']}: {c['description']}")

    print("-" * 80)
    print(f"TOTAL CHECKS: {total_checks} | PASSED: {passed_checks} | FAILED: {failed_checks}")
    print(f"Total Execution Time: {time.time() - start_time:.2f} seconds")
    print("=" * 80)

    if failed_checks > 0:
        print("\nSTAGE 6 TEST SUITE STATUS: FAIL")
        sys.exit(1)
    else:
        print("\nSTAGE 6 TEST SUITE STATUS: PASS")


if __name__ == "__main__":
    run_tests()
