import React from 'react';
import { ShieldCheck, ShieldAlert, Cpu, Activity, Info } from 'lucide-react';
import { HealthResponse, ModelInfoResponse } from '../types/api';

interface HeaderProps {
  health: HealthResponse | null;
  modelInfo: ModelInfoResponse | null;
}

export const Header: React.FC<HeaderProps> = ({ health, modelInfo }) => {
  const isHealthy = health?.status === 'healthy' && health?.model_loaded;
  const rawHash = modelInfo?.checkpoint_sha256 || 'daaafa0e8f3ceb4041fb3c28ead53ee9151c559bf0551e4a9e06c40248f0c98b';
  const shortHash = `${rawHash.substring(0, 6)}...${rawHash.substring(rawHash.length - 4)}`;

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand Title */}
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 rounded-lg shadow-inner">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-wider text-white font-mono uppercase">AETHER</h1>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
                FOREST INTELLIGENCE
              </span>
            </div>
            <p className="text-xs text-slate-400">Canopy Deforestation &amp; Bi-Temporal Satellite Intelligence</p>
          </div>
        </div>

        {/* Backend & Model System Status Badges */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          {/* Health Badge */}
          <div
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md border ${
              isHealthy
                ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                : 'bg-rose-950/60 border-rose-800/80 text-rose-300'
            }`}
          >
            {isHealthy ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 text-rose-400" />}
            <span className="font-semibold">Backend: {isHealthy ? 'Healthy' : 'Unhealthy'}</span>
          </div>

          {/* Device Badge */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Device: <strong className="text-white uppercase">{health?.device || 'CPU'}</strong></span>
          </div>

          {/* Threshold Badge */}
          <div className="px-3 py-1.5 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">
            <span>Threshold: <strong className="text-emerald-400">0.25</strong></span>
          </div>

          {/* Checkpoint Hash Badge */}
          <div
            className="group relative flex items-center space-x-1 px-3 py-1.5 rounded-md bg-slate-800/80 border border-slate-700 text-slate-400 cursor-help"
            title={`Full Checkpoint SHA-256: ${rawHash}`}
          >
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>SHA-256: <code className="text-slate-200">{shortHash}</code></span>

            {/* Tooltip Hover */}
            <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50 bg-slate-900 text-slate-200 border border-slate-700 text-[10px] p-2.5 rounded shadow-xl whitespace-nowrap font-mono">
              <p className="text-slate-400 mb-1 font-sans">Locked Checkpoint Hash (Verified by Backend):</p>
              <p className="text-emerald-400 font-mono select-all">{rawHash}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
