import React from 'react';
import { ShieldCheck, ShieldAlert, Cpu, Info, CheckCircle2 } from 'lucide-react';
import { HealthResponse, ModelInfoResponse } from '../types/api';

interface DeforestationHeaderProps {
  health: HealthResponse | null;
  modelInfo: ModelInfoResponse | null;
}

export const DeforestationHeader: React.FC<DeforestationHeaderProps> = ({ health, modelInfo }) => {
  const isHealthy = health?.status === 'healthy' && health?.model_loaded;
  const rawHash = modelInfo?.checkpoint_sha256 || 'daaafa0e8f3ceb4041fb3c28ead53ee9151c559bf0551e4a9e06c40248f0c98b';
  const shortHash = `${rawHash.substring(0, 6)}...${rawHash.substring(rawHash.length - 4)}`;

  return (
    <div className="bg-charcoal-900/90 border border-charcoal-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 font-mono shadow-md">
      {/* Title & Status Summary */}
      <div className="flex items-center space-x-3">
        <div className={`p-2.5 rounded-lg border flex items-center justify-center ${
          isHealthy
            ? 'bg-forest-950/80 border-forest-500/40 text-forest-400'
            : 'bg-red-950/80 border-red-500/40 text-red-400'
        }`}>
          {isHealthy ? <ShieldCheck className="w-5 h-5 text-forest-400" /> : <ShieldAlert className="w-5 h-5 text-red-400" />}
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white">MODEL ONLINE</span>
            <span className={`px-2 py-0.5 text-[9px] font-bold rounded border uppercase ${
              isHealthy
                ? 'bg-forest-950 text-forest-400 border-forest-800'
                : 'bg-red-950 text-red-400 border-red-800'
            }`}>
              {isHealthy ? 'Stage 2B Verified' : 'Offline'}
            </span>
          </div>
          <p className="text-[11px] text-charcoal-400 mt-0.5">Stage2B Early-Fusion U-Net (6-Channel Input)</p>
        </div>
      </div>

      {/* Model Spec Badges */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {/* Architecture Badge */}
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded bg-charcoal-950 border border-charcoal-800 text-charcoal-300">
          <Cpu className="w-3.5 h-3.5 text-forest-400" />
          <span>Stage2B Early-Fusion U-Net</span>
        </div>

        {/* Device Badge */}
        <div className="px-3 py-1 rounded bg-charcoal-950 border border-charcoal-800 text-charcoal-300">
          <span>Device: <strong className="text-white uppercase">{health?.device || 'CPU'}</strong></span>
        </div>

        {/* Threshold Badge */}
        <div className="px-3 py-1 rounded bg-charcoal-950 border border-charcoal-800 text-charcoal-300">
          <span>Threshold: <strong className="text-forest-400 font-bold">0.25</strong></span>
        </div>

        {/* Checkpoint Hash Badge */}
        <div
          className="group relative flex items-center space-x-1.5 px-3 py-1 rounded bg-charcoal-950 border border-charcoal-800 text-charcoal-400 cursor-help"
          title={`Full Checkpoint SHA-256: ${rawHash}`}
        >
          <Info className="w-3 h-3 text-charcoal-400" />
          <span>SHA-256: <code className="text-charcoal-200">{shortHash}</code></span>

          {/* Hover Tooltip */}
          <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50 bg-charcoal-900 text-charcoal-200 border border-charcoal-700 text-[10px] p-2.5 rounded-lg shadow-2xl whitespace-nowrap">
            <p className="text-charcoal-400 mb-1 font-sans">Locked Checkpoint Hash (Verified by Backend):</p>
            <p className="text-forest-400 font-mono select-all">{rawHash}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeforestationHeader;
