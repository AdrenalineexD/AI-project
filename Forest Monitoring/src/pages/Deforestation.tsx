import React, { useState, useEffect } from 'react';
import { DeforestationHeader } from '../components/DeforestationHeader';
import { DeforestationUploader } from '../components/DeforestationUploader';
import { DeforestationSummaryCards } from '../components/DeforestationSummaryCards';
import { DeforestationVisualizationViewer } from '../components/DeforestationVisualizationViewer';
import { DeforestationHotspotGrid } from '../components/DeforestationHotspotGrid';
import { DeforestationRegionTable } from '../components/DeforestationRegionTable';
import GlassCard from '../components/GlassCard';
import { apiService } from '../services/apiService';
import {
  HealthResponse,
  ModelInfoResponse,
  DeforestationAnalysisResponse,
} from '../types/api';
import { AlertTriangle, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';

export const Deforestation: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfoResponse | null>(null);

  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<DeforestationAnalysisResponse | null>(null);

  // Fetch initial health and model metadata on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const hData = await apiService.checkHealth();
        setHealth(hData);
        if (hData.model_loaded) {
          const mData = await apiService.getModelInfo();
          setModelInfo(mData);
        }
      } catch (err: any) {
        console.warn('Backend server connectivity warning:', err.message);
        setError('BACKEND OFFLINE: Unable to connect to AETHER inference service.');
      }
    };
    fetchMetadata();
  }, []);

  const handleImagesSelected = (bFile: File, aFile: File) => {
    setBeforeFile(bFile);
    setAfterFile(aFile);
    setBeforePreview(URL.createObjectURL(bFile));
    setAfterPreview(URL.createObjectURL(aFile));
  };

  const handleAnalyze = async (overrideBefore?: File, overrideAfter?: File) => {
    const bFile = overrideBefore || beforeFile;
    const aFile = overrideAfter || afterFile;

    if (!bFile || !aFile) {
      setError('Please provide both Before and After images.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiService.analyzeDeforestation(bFile, aFile);
      setAnalysis(result);
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please check the backend service and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Deforestation Intelligence</h1>
        <p className="text-xs text-charcoal-400 mt-1">AI-powered forest change detection and spatial risk analysis</p>
      </div>

      {/* Top Model & System Health Banner */}
      <DeforestationHeader health={health} modelInfo={modelInfo} />

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 bg-red-950/90 border border-red-800 text-red-200 text-xs font-mono rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-white text-xs font-bold underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Section 1: Bi-Temporal Satellite Upload & Execution Control */}
      <section>
        <DeforestationUploader
          onImagesSelected={handleImagesSelected}
          onAnalyze={handleAnalyze}
          loading={loading}
          disabled={health?.status === 'unhealthy'}
        />
      </section>

      {/* Loading Spinner Indicator */}
      {loading && (
        <GlassCard hoverGlow={false} className="flex flex-col items-center justify-center py-12 space-y-3">
          <RefreshCw className="w-10 h-10 text-forest-400 animate-spin" />
          <p className="text-sm font-bold text-white font-mono uppercase tracking-wider">
            RUNNING AI ANALYSIS...
          </p>
          <p className="text-xs text-charcoal-400 text-center max-w-md">
            Running 6-channel tensor forward pass, sigmoid thresholding (0.25), 8-connectivity DSU region extraction, and 4×4 grid analysis.
          </p>
        </GlassCard>
      )}

      {/* Section 2: Deforestation KPI Summary Cards (When Analysis Results Ready) */}
      {analysis && (
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-charcoal-800 pb-2">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-forest-400" />
              Deforestation Analysis Summary &amp; Spatial Priority
            </h2>
            <span className="text-[10px] text-charcoal-400 font-mono">Request ID: {analysis.request_id}</span>
          </div>

          <DeforestationSummaryCards summary={analysis.summary} priority={analysis.priority} />

          {/* Section 3: Dual Column Layout (Visualization Viewer + Hotspot Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <DeforestationVisualizationViewer
              beforePreview={beforePreview}
              afterPreview={afterPreview}
              maskId={analysis.mask_id}
            />
            <DeforestationHotspotGrid grid={analysis.grid} />
          </div>

          {/* Section 4: Region Intelligence Data Table */}
          <DeforestationRegionTable regions={analysis.regions} />
        </section>
      )}

      {/* Empty State Instructions (Before Analysis) */}
      {!analysis && !loading && (
        <GlassCard hoverGlow={false} className="flex flex-col items-center justify-center text-center py-16 px-4 space-y-4">
          <div className="p-4 bg-charcoal-900 border border-charcoal-800 rounded-full text-forest-400">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white font-mono">
            AETHER Deforestation Detection Ready
          </h3>
          <p className="text-xs text-charcoal-400 max-w-lg">
            Upload a bi-temporal 480×480 satellite image pair or click{' '}
            <strong className="text-forest-300 font-mono">"Load Sample Pair (test_000011)"</strong> above to execute locked U-Net change detection and view 4×4 hotspot grid analysis.
          </p>
        </GlassCard>
      )}
    </div>
  );
};

export default Deforestation;
