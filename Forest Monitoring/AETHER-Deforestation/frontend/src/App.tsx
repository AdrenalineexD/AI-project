import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { SummaryCards } from './components/SummaryCards';
import { VisualizationViewer } from './components/VisualizationViewer';
import { HotspotGrid } from './components/HotspotGrid';
import { RegionTable } from './components/RegionTable';
import { apiService } from './services/apiService';
import {
  HealthResponse,
  ModelInfoResponse,
  DeforestationAnalysisResponse,
} from './types/api';
import { AlertTriangle, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
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

    if (!bFile || !aFile) return;

    setLoading(true);
    setError(null);

    try {
      const result = await apiService.analyzeDeforestation(bFile, aFile);
      setAnalysis(result);
    } catch (err: any) {
      setError(err.message || 'Failed to complete deforestation analysis request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header & System Status */}
      <Header health={health} modelInfo={modelInfo} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Global Error Banner */}
        {error && (
          <div className="p-4 bg-rose-950/90 border border-rose-800 text-rose-200 text-xs font-mono rounded-xl flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-white text-xs font-bold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Section 1: Bi-Temporal Satellite Upload & Execution Control */}
        <section>
          <ImageUploader
            onImagesSelected={handleImagesSelected}
            onAnalyze={handleAnalyze}
            loading={loading}
            disabled={health?.status === 'unhealthy'}
          />
        </section>

        {/* Loading Spinner Indicator */}
        {loading && (
          <div className="glass-card flex flex-col items-center justify-center py-12 space-y-3">
            <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
            <p className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Executing Locked Early-Fusion U-Net Model &amp; Spatial Intelligence...
            </p>
            <p className="text-xs text-slate-400">
              Running 6-channel tensor forward pass, sigmoid thresholding (0.25), 8-connectivity DSU region extraction, and 4×4 grid analysis.
            </p>
          </div>
        )}

        {/* Section 2: Deforestation KPI Summary Cards (When Analysis Results Ready) */}
        {analysis && (
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Deforestation Analysis Summary &amp; Spatial Priority
              </h2>
              <span className="text-xs text-slate-400 font-mono">Request ID: {analysis.request_id}</span>
            </div>

            <SummaryCards summary={analysis.summary} priority={analysis.priority} />

            {/* Section 3: Dual Column Layout (Visualization Viewer + Hotspot Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <VisualizationViewer
                beforePreview={beforePreview}
                afterPreview={afterPreview}
                maskId={analysis.mask_id}
              />
              <HotspotGrid grid={analysis.grid} />
            </div>

            {/* Section 4: Region Intelligence Data Table */}
            <RegionTable regions={analysis.regions} />
          </section>
        )}

        {/* Empty State Instructions (Before Analysis) */}
        {!analysis && !loading && (
          <div className="glass-card flex flex-col items-center justify-center text-center py-16 px-4 space-y-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-full text-emerald-400">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white font-mono">
              AETHER Deforestation Detection Ready
            </h3>
            <p className="text-xs text-slate-400 max-w-lg">
              Upload a bi-temporal 480×480 satellite image pair or click{' '}
              <strong className="text-emerald-300 font-mono">"Load Sample Pair (test_000011)"</strong> above to execute locked U-Net change detection and view 4×4 hotspot grid analysis.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500 font-mono">
        AETHER Autonomous Forest Monitoring — Deforestation Detection Dashboard (Stage 7)
      </footer>
    </div>
  );
};

export default App;
