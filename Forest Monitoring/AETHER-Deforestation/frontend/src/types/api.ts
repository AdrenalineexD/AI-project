/**
 * AETHER Deforestation Detection System — Frontend API Type Definitions
 * ======================================================================
 * Strictly aligned with Stage 6 FastAPI Pydantic response schemas.
 */

export interface HealthResponse {
  status: string; // "healthy" | "unhealthy"
  model_loaded: boolean;
  model_integrity: string; // "PASS" | "FAIL"
  model: string;
  threshold: number;
  device: string;
}

export interface ModelInfoResponse {
  model_name: string;
  architecture: string;
  checkpoint: string;
  threshold: number;
  input_channels: number;
  input_size: [number, number];
  output_channels: number;
  checkpoint_sha256: string;
  device: string;
  eval_mode: boolean;
}

export interface RegionDetail {
  region_id: number;
  pixel_count: number;
  percentage_of_image: number;
  centroid_x: number;
  centroid_y: number;
  bbox_x_min: number;
  bbox_y_min: number;
  bbox_x_max: number;
  bbox_y_max: number;
  region_contribution_percent: number;
  rank: number;
}

export interface GridCellDetail {
  grid_id: string;
  grid_row: number;
  grid_col: number;
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
  predicted_deforestation_pixels: number;
  predicted_deforestation_percent_of_cell: number;
  predicted_deforestation_percent_of_image: number;
  number_of_regions_intersecting_cell: number;
  largest_region_pixels_in_cell: number;
  hotspot_score: number;
  hotspot_level: 'Low' | 'Moderate' | 'High' | 'Critical' | string;
}

export interface PriorityDetail {
  normalized_deforestation_score: number;
  normalized_largest_region_score: number;
  normalized_region_count_score: number;
  priority_score: number;
  priority_level: 'Low' | 'Moderate' | 'High' | 'Critical' | string;
}

export interface DeforestationSummary {
  image_width: number;
  image_height: number;
  predicted_pixels: number;
  predicted_percentage: number;
  region_count: number;
  largest_region_pixels: number;
  largest_region_percentage: number;
  concentration: 'Highly Concentrated' | 'Moderately Concentrated' | 'Dispersed' | string;
  regions_per_100k_pixels: number;
  fragmentation_ratio: number;
  priority_score: number;
  priority_level: 'Low' | 'Moderate' | 'High' | 'Critical' | string;
}

export interface DeforestationAnalysisResponse {
  status: 'success' | string;
  request_id: string;
  model: {
    name: string;
    architecture: string;
    checkpoint: string;
    threshold: number;
    device: string;
  };
  input: {
    before_filename: string;
    after_filename: string;
    dimensions: [number, number];
    channels: number;
  };
  summary: DeforestationSummary;
  priority: PriorityDetail;
  regions: RegionDetail[];
  grid: GridCellDetail[];
  mask_id: string;
  spatial_coordinates: string;
}

export interface ErrorResponse {
  status: 'error' | string;
  message: string;
}
