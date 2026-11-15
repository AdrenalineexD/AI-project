"""
AETHER Deforestation Detection System — Spatial & Region Intelligence Service
============================================================================

Implements pure NumPy 8-connectivity DSU component labeling, region ranking,
spatial concentration classification, fixed Stage 4B priority scoring, and 4x4 grid hotspot analysis.
"""

import numpy as np
from typing import Dict, Any, List, Tuple

from backend.config import (
    STAGE4B_REF_P_MIN,
    STAGE4B_REF_P_MAX,
    STAGE4B_REF_L_MIN,
    STAGE4B_REF_L_MAX,
    STAGE4B_REF_C_MIN,
    STAGE4B_REF_C_MAX,
)


def label_8_connectivity_dsu(binary_mask: np.ndarray) -> Tuple[np.ndarray, int, List[Dict[str, Any]]]:
    """
    Pure NumPy Two-Pass Disjoint-Set Union (DSU) for 8-Connectivity Component Labeling.
    Identical to Stage 4A & Stage 4B for exact component matching.
    """
    H, W = binary_mask.shape
    parent = [0]
    next_label = 1

    def find(i):
        path = []
        while parent[i] != i:
            path.append(i)
            i = parent[i]
        for node in path:
            parent[node] = i
        return i

    def union(i, j):
        root_i = find(i)
        root_j = find(j)
        if root_i != root_j:
            parent[root_i] = root_j

    grid_labels = np.zeros((H, W), dtype=int)

    for y in range(H):
        for x in range(W):
            if binary_mask[y, x] == 1:
                neighbors = []
                if y > 0 and x > 0 and grid_labels[y - 1, x - 1] > 0:
                    neighbors.append(grid_labels[y - 1, x - 1])
                if y > 0 and grid_labels[y - 1, x] > 0:
                    neighbors.append(grid_labels[y - 1, x])
                if y > 0 and x < W - 1 and grid_labels[y - 1, x + 1] > 0:
                    neighbors.append(grid_labels[y - 1, x + 1])
                if x > 0 and grid_labels[y, x - 1] > 0:
                    neighbors.append(grid_labels[y, x - 1])

                if not neighbors:
                    grid_labels[y, x] = next_label
                    parent.append(next_label)
                    next_label += 1
                else:
                    min_lbl = min(neighbors)
                    grid_labels[y, x] = min_lbl
                    for n in neighbors:
                        union(n, min_lbl)

    root_to_id = {}
    final_label_count = 0
    labeled_mask = np.zeros((H, W), dtype=int)

    for i in range(1, next_label):
        r = find(i)
        if r not in root_to_id:
            final_label_count += 1
            root_to_id[r] = final_label_count

    for y in range(H):
        for x in range(W):
            if grid_labels[y, x] > 0:
                r = find(grid_labels[y, x])
                labeled_mask[y, x] = root_to_id[r]

    num_features = final_label_count
    stats = []

    if num_features > 0:
        for comp_id in range(1, num_features + 1):
            ys, xs = np.where(labeled_mask == comp_id)
            px_cnt = len(ys)
            bbox_x_min = int(np.min(xs))
            bbox_x_max = int(np.max(xs))
            bbox_y_min = int(np.min(ys))
            bbox_y_max = int(np.max(ys))
            centroid_x = round(float(np.mean(xs)), 2)
            centroid_y = round(float(np.mean(ys)), 2)

            stats.append({
                "region_id": comp_id,
                "pixel_count": px_cnt,
                "percentage_of_image": round((px_cnt / (H * W)) * 100.0, 4),
                "centroid_x": centroid_x,
                "centroid_y": centroid_y,
                "bbox_x_min": bbox_x_min,
                "bbox_y_min": bbox_y_min,
                "bbox_x_max": bbox_x_max,
                "bbox_y_max": bbox_y_max,
            })

    return labeled_mask, num_features, stats


def classify_concentration(largest_region_fraction: float) -> str:
    """Classifies spatial deforestation concentration based on largest region fraction."""
    if largest_region_fraction >= 70.0:
        return "Highly Concentrated"
    elif largest_region_fraction >= 40.0:
        return "Moderately Concentrated"
    else:
        return "Dispersed"


def classify_priority(priority_score: float) -> str:
    """Classifies image priority level based on priority score (0-100)."""
    if priority_score >= 75.0:
        return "Critical"
    elif priority_score >= 50.0:
        return "High"
    elif priority_score >= 25.0:
        return "Moderate"
    else:
        return "Low"


def classify_hotspot(hotspot_score: float) -> str:
    """Classifies grid hotspot level based on hotspot score (0-100)."""
    if hotspot_score >= 75.0:
        return "Critical"
    elif hotspot_score >= 50.0:
        return "High"
    elif hotspot_score >= 25.0:
        return "Moderate"
    else:
        return "Low"


class SpatialIntelligenceService:
    """Service performing Stage 4A & 4B region extraction, scoring, grid decomposition, and classification."""

    @staticmethod
    def analyze_mask(binary_mask: np.ndarray) -> Dict[str, Any]:
        """
        Executes full spatial analysis pipeline over binary prediction mask [480, 480].
        """
        H, W = binary_mask.shape
        total_pixels = H * W  # 230,400
        predicted_deforestation_pixels = int(binary_mask.sum())
        predicted_deforestation_percentage = round((predicted_deforestation_pixels / float(total_pixels)) * 100.0, 4)

        # 1. 8-connectivity DSU Region Extraction
        labeled_mask, region_count, region_stats = label_8_connectivity_dsu(binary_mask)

        # 2. Enrich and Rank Regions
        region_stats.sort(key=lambda r: r["pixel_count"], reverse=True)
        for rank_idx, reg in enumerate(region_stats, 1):
            reg["rank"] = rank_idx
            if predicted_deforestation_pixels > 0:
                reg["region_contribution_percent"] = round((reg["pixel_count"] / float(predicted_deforestation_pixels)) * 100.0, 4)
            else:
                reg["region_contribution_percent"] = 0.0

        if region_stats:
            largest_region_pixels = region_stats[0]["pixel_count"]
            largest_region_percentage = round((largest_region_pixels / float(total_pixels)) * 100.0, 4)
        else:
            largest_region_pixels = 0
            largest_region_percentage = 0.0

        # Concentration calculation
        if predicted_deforestation_pixels > 0:
            largest_region_fraction = (largest_region_pixels / float(predicted_deforestation_pixels)) * 100.0
        else:
            largest_region_fraction = 0.0

        concentration_class = classify_concentration(largest_region_fraction)

        # Engineering diagnostics
        regions_per_100k_pixels = round((region_count / float(total_pixels)) * 100000.0, 4)
        fragmentation_ratio = round(region_count / float(max(predicted_deforestation_pixels, 1)), 6)

        # 3. Fixed Stage 4B Priority Scoring (using 33-image reference min/max)
        norm_p = min(100.0, max(0.0, (predicted_deforestation_percentage - STAGE4B_REF_P_MIN) / (STAGE4B_REF_P_MAX - STAGE4B_REF_P_MIN) * 100.0)) if STAGE4B_REF_P_MAX > STAGE4B_REF_P_MIN else 0.0
        norm_l = min(100.0, max(0.0, (largest_region_percentage - STAGE4B_REF_L_MIN) / (STAGE4B_REF_L_MAX - STAGE4B_REF_L_MIN) * 100.0)) if STAGE4B_REF_L_MAX > STAGE4B_REF_L_MIN else 0.0
        norm_c = min(100.0, max(0.0, (region_count - STAGE4B_REF_C_MIN) / float(STAGE4B_REF_C_MAX - STAGE4B_REF_C_MIN) * 100.0)) if STAGE4B_REF_C_MAX > STAGE4B_REF_C_MIN else 0.0

        priority_score = round(min(100.0, max(0.0, 0.50 * norm_p + 0.35 * norm_l + 0.15 * norm_c)), 2)
        priority_level = classify_priority(priority_score)

        # 4. 4x4 Grid Analysis (16 cells of 120x120 pixels)
        cell_size = 120
        grid_cells = []

        for r in range(4):
            y_min = r * cell_size
            y_max = (r + 1) * cell_size - 1
            for c in range(4):
                x_min = c * cell_size
                x_max = (c + 1) * cell_size - 1
                grid_id = f"grid_r{r}_c{c}"

                cell_pred = binary_mask[r * cell_size : (r + 1) * cell_size, c * cell_size : (c + 1) * cell_size]
                cell_labels = labeled_mask[r * cell_size : (r + 1) * cell_size, c * cell_size : (c + 1) * cell_size]

                pred_px = int(cell_pred.sum())
                pct_cell = round((pred_px / 14400.0) * 100.0, 4)
                pct_img = round((pred_px / float(total_pixels)) * 100.0, 4)

                intersecting_regions = set(cell_labels[cell_labels > 0])
                num_intersecting = len(intersecting_regions)

                if num_intersecting > 0:
                    largest_region_px_in_cell = int(max(np.sum(cell_labels == rid) for rid in intersecting_regions))
                else:
                    largest_region_px_in_cell = 0

                largest_cell_pct = (largest_region_px_in_cell / 14400.0) * 100.0

                # Standard Locked Hotspot Score Formula
                hotspot_score = round(min(100.0, max(0.0, 0.80 * pct_cell + 0.20 * largest_cell_pct)), 2)
                hotspot_level = classify_hotspot(hotspot_score)

                grid_cells.append({
                    "grid_id": grid_id,
                    "grid_row": r,
                    "grid_col": c,
                    "x_min": x_min,
                    "y_min": y_min,
                    "x_max": x_max,
                    "y_max": y_max,
                    "predicted_deforestation_pixels": pred_px,
                    "predicted_deforestation_percent_of_cell": pct_cell,
                    "predicted_deforestation_percent_of_image": pct_img,
                    "number_of_regions_intersecting_cell": num_intersecting,
                    "largest_region_pixels_in_cell": largest_region_px_in_cell,
                    "hotspot_score": hotspot_score,
                    "hotspot_level": hotspot_level,
                })

        return {
            "summary": {
                "image_width": W,
                "image_height": H,
                "predicted_pixels": predicted_deforestation_pixels,
                "predicted_percentage": predicted_deforestation_percentage,
                "region_count": region_count,
                "largest_region_pixels": largest_region_pixels,
                "largest_region_percentage": largest_region_percentage,
                "concentration": concentration_class,
                "regions_per_100k_pixels": regions_per_100k_pixels,
                "fragmentation_ratio": fragmentation_ratio,
                "priority_score": priority_score,
                "priority_level": priority_level,
            },
            "priority": {
                "normalized_deforestation_score": round(norm_p, 2),
                "normalized_largest_region_score": round(norm_l, 2),
                "normalized_region_count_score": round(norm_c, 2),
                "priority_score": priority_score,
                "priority_level": priority_level,
            },
            "regions": region_stats,
            "grid": grid_cells,
            "labeled_mask": labeled_mask,
        }
