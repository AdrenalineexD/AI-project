import React, { useState } from 'react';
import { Layers, Eye, Sliders, Image as ImageIcon } from 'lucide-react';
import { apiService } from '../services/apiService';

interface VisualizationViewerProps {
  beforePreview: string | null;
  afterPreview: string | null;
  maskId: string | null;
}

export const VisualizationViewer: React.FC<VisualizationViewerProps> = ({
  beforePreview,
  afterPreview,
  maskId,
}) => {
  const [activeTab, setActiveTab] = useState<'overlay' | 'before' | 'after' | 'mask'>('overlay');
  const [opacity, setOpacity] = useState<number>(65);

  const maskUrl = maskId ? apiService.getMaskUrl(maskId) : null;

  return (
    <div className="glass-card space-y-4">
      {/* Header & View Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            Bi-Temporal Imagery &amp; Binary Mask Visualization
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare input satellite imagery against U-Net binary change predictions
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('overlay')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${
              activeTab === 'overlay'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overlay Mode
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('before')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${
              activeTab === 'before'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Before
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('after')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${
              activeTab === 'after'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            After
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mask')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${
              activeTab === 'mask'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Prediction Mask
          </button>
        </div>
      </div>

      {/* Opacity Control for Overlay Mode */}
      {activeTab === 'overlay' && (
        <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-xs font-mono">
          <div className="flex items-center space-x-2 text-slate-300">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Deforestation Overlay Opacity: <strong className="text-emerald-400">{opacity}%</strong></span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-40 accent-emerald-500 cursor-pointer"
          />
        </div>
      )}

      {/* Main Canvas / Image Display Container */}
      <div className="relative w-full aspect-square max-h-[500px] mx-auto bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">
        {/* Overlay Mode */}
        {activeTab === 'overlay' && (
          <div className="relative w-full h-full flex items-center justify-center">
            {afterPreview ? (
              <img
                src={afterPreview}
                alt="After Satellite"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-slate-500 text-xs font-mono">No After Image Selected</div>
            )}

            {maskUrl && (
              <img
                src={maskUrl}
                alt="Deforestation Mask Overlay"
                style={{ opacity: opacity / 100 }}
                className="absolute inset-0 w-full h-full object-contain mix-blend-screen filter drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"
              />
            )}
          </div>
        )}

        {/* Before Mode */}
        {activeTab === 'before' && (
          beforePreview ? (
            <img src={beforePreview} alt="Before Satellite" className="w-full h-full object-contain" />
          ) : (
            <div className="text-slate-500 text-xs font-mono">No Before Image Selected</div>
          )
        )}

        {/* After Mode */}
        {activeTab === 'after' && (
          afterPreview ? (
            <img src={afterPreview} alt="After Satellite" className="w-full h-full object-contain" />
          ) : (
            <div className="text-slate-500 text-xs font-mono">No After Image Selected</div>
          )
        )}

        {/* Prediction Mask Mode */}
        {activeTab === 'mask' && (
          maskUrl ? (
            <img src={maskUrl} alt="Binary Deforestation Mask" className="w-full h-full object-contain bg-black" />
          ) : (
            <div className="text-slate-500 text-xs font-mono flex flex-col items-center gap-2">
              <ImageIcon className="w-8 h-8 text-slate-600" />
              <span>Run U-Net Analysis to Generate Prediction Mask</span>
            </div>
          )
        )}

        {/* Image Coordinates Overlay Badge */}
        <div className="absolute bottom-3 left-3 bg-slate-900/90 text-slate-300 text-[10px] font-mono px-2.5 py-1 rounded border border-slate-800 backdrop-blur-md">
          Image Space: 480 × 480 px
        </div>
      </div>
    </div>
  );
};
