/**
 * AETHER Deforestation Detection System — Frontend API Service Client
 * ====================================================================
 * Interacts with FastAPI backend using relative API paths mapped via Vite dev proxy.
 */

import {
  HealthResponse,
  ModelInfoResponse,
  DeforestationAnalysisResponse,
  ErrorResponse,
} from '../types/api';

export const apiService = {
  /**
   * Checks FastAPI backend health status and model loaded status.
   */
  async checkHealth(): Promise<HealthResponse> {
    try {
      const response = await fetch('/health');
      if (!response.ok) {
        const errJson = (await response.json().catch(() => ({}))) as ErrorResponse;
        throw new Error(errJson.message || `Health check failed with status ${response.status}`);
      }
      return await response.json();
    } catch (err: any) {
      throw new Error(err.message || 'Unable to connect to the AETHER backend server.');
    }
  },

  /**
   * Retrieves locked Stage 2B model metadata information.
   */
  async getModelInfo(): Promise<ModelInfoResponse> {
    try {
      const response = await fetch('/api/v1/model');
      if (!response.ok) {
        const errJson = (await response.json().catch(() => ({}))) as ErrorResponse;
        throw new Error(errJson.message || `Failed to fetch model metadata (HTTP ${response.status})`);
      }
      return await response.json();
    } catch (err: any) {
      throw new Error(err.message || 'Model metadata request failed.');
    }
  },

  /**
   * Sends Before/After image files (480x480 RGB) to /api/v1/deforestation/analyze.
   */
  async analyzeDeforestation(
    beforeFile: File,
    afterFile: File
  ): Promise<DeforestationAnalysisResponse> {
    const formData = new FormData();
    formData.append('before_image', beforeFile);
    formData.append('after_image', afterFile);

    try {
      const response = await fetch('/api/v1/deforestation/analyze', {
        method: 'POST',
        body: formData,
        // Do NOT set Content-Type header manually for FormData
      });

      if (!response.ok) {
        const errJson = (await response.json().catch(() => ({}))) as ErrorResponse;
        throw new Error(
          errJson.message || `Deforestation analysis failed with HTTP status ${response.status}`
        );
      }

      return await response.json();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to complete deforestation analysis request.');
    }
  },

  /**
   * Resolves prediction mask URL for visual rendering.
   */
  getMaskUrl(maskId: string): string {
    return `/api/v1/deforestation/mask/${encodeURIComponent(maskId)}`;
  },
};
