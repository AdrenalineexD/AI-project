import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiService } from '../services/apiService';
import { DeforestationAnalysisResponse, HealthResponse } from '../types/api';

describe('AETHER Frontend API Service Client Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. checkHealth() returns valid health response data structure', async () => {
    const mockHealth: HealthResponse = {
      status: 'healthy',
      model_loaded: true,
      model_integrity: 'PASS',
      model: 'Stage2B-EarlyFusion-U-Net',
      threshold: 0.25,
      device: 'cpu',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockHealth,
    } as Response);

    const data = await apiService.checkHealth();
    expect(data.status).toBe('healthy');
    expect(data.model_loaded).toBe(true);
    expect(data.threshold).toBe(0.25);
  });

  it('2. getModelInfo() returns locked U-Net model metadata', async () => {
    const mockModelInfo = {
      model_name: 'Stage2B Early-Fusion U-Net',
      architecture: '6-channel Early-Fusion U-Net',
      checkpoint: 'checkpoints/stage2b/best_model.pth',
      threshold: 0.25,
      input_channels: 6,
      input_size: [480, 480],
      output_channels: 1,
      checkpoint_sha256: 'daaafa0e8f3ceb4041fb3c28ead53ee9151c559bf0551e4a9e06c40248f0c98b',
      device: 'cpu',
      eval_mode: true,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockModelInfo,
    } as Response);

    const data = await apiService.getModelInfo();
    expect(data.threshold).toBe(0.25);
    expect(data.input_channels).toBe(6);
    expect(data.checkpoint_sha256).toBe('daaafa0e8f3ceb4041fb3c28ead53ee9151c559bf0551e4a9e06c40248f0c98b');
  });

  it('3. analyzeDeforestation() constructs FormData and parses backend analysis response', async () => {
    const mockAnalysis: DeforestationAnalysisResponse = {
      status: 'success',
      request_id: 'req_test123',
      model: {
        name: 'Stage2B Early-Fusion U-Net',
        architecture: '6-channel Early-Fusion U-Net',
        checkpoint: 'checkpoints/stage2b/best_model.pth',
        threshold: 0.25,
        device: 'cpu',
      },
      input: {
        before_filename: 'test_A.png',
        after_filename: 'test_B.png',
        dimensions: [480, 480],
        channels: 6,
      },
      summary: {
        image_width: 480,
        image_height: 480,
        predicted_pixels: 45428,
        predicted_percentage: 19.717,
        region_count: 32,
        largest_region_pixels: 11498,
        largest_region_percentage: 4.9905,
        concentration: 'Dispersed',
        regions_per_100k_pixels: 13.8889,
        fragmentation_ratio: 0.000704,
        priority_score: 78.28,
        priority_level: 'Critical',
      },
      priority: {
        normalized_deforestation_score: 100.0,
        normalized_largest_region_score: 69.17,
        normalized_region_count_score: 27.12,
        priority_score: 78.28,
        priority_level: 'Critical',
      },
      regions: [
        {
          region_id: 1,
          pixel_count: 11498,
          percentage_of_image: 4.9905,
          centroid_x: 210.5,
          centroid_y: 180.2,
          bbox_x_min: 100,
          bbox_y_min: 120,
          bbox_x_max: 300,
          bbox_y_max: 250,
          region_contribution_percent: 25.31,
          rank: 1,
        },
      ],
      grid: Array.from({ length: 16 }).map((_, i) => ({
        grid_id: `grid_r${Math.floor(i / 4)}_c${i % 4}`,
        grid_row: Math.floor(i / 4),
        grid_col: i % 4,
        x_min: (i % 4) * 120,
        y_min: Math.floor(i / 4) * 120,
        x_max: (i % 4) * 120 + 119,
        y_max: Math.floor(i / 4) * 120 + 119,
        predicted_deforestation_pixels: 1000,
        predicted_deforestation_percent_of_cell: 6.94,
        predicted_deforestation_percent_of_image: 0.43,
        number_of_regions_intersecting_cell: 2,
        largest_region_pixels_in_cell: 800,
        hotspot_score: 15.2,
        hotspot_level: 'Low',
      })),
      mask_id: 'mask_test123.png',
      spatial_coordinates: 'image-space pixels only',
    };

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockAnalysis,
    } as Response);
    globalThis.fetch = fetchSpy;

    const fileA = new File([new Uint8Array(10)], 'before.png', { type: 'image/png' });
    const fileB = new File([new Uint8Array(10)], 'after.png', { type: 'image/png' });

    const result = await apiService.analyzeDeforestation(fileA, fileB);

    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/deforestation/analyze', expect.objectContaining({
      method: 'POST',
    }));
    expect(result.summary.predicted_percentage).toBe(19.717);
    expect(result.summary.region_count).toBe(32);
    expect(result.summary.priority_score).toBe(78.28);
    expect(result.summary.priority_level).toBe('Critical');
    expect(result.grid.length).toBe(16);
  });

  it('4. handles HTTP 400 error responses from FastAPI backend', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ status: 'error', message: 'Expected image dimensions: 480×480 pixels.' }),
    } as Response);

    const fileA = new File([new Uint8Array(10)], 'bad.png', { type: 'image/png' });
    const fileB = new File([new Uint8Array(10)], 'bad2.png', { type: 'image/png' });

    await expect(apiService.analyzeDeforestation(fileA, fileB)).rejects.toThrow(
      'Expected image dimensions: 480×480 pixels.'
    );
  });

  it('5. getMaskUrl() returns sanitized relative endpoint path', () => {
    const url = apiService.getMaskUrl('mask_53c9e98af3f7.png');
    expect(url).toBe('/api/v1/deforestation/mask/mask_53c9e98af3f7.png');
  });
});
