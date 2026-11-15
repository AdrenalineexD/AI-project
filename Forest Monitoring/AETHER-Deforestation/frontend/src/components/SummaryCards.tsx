import React from 'react';
import { TreePine, AlertTriangle, Layers, Grid, Activity, Layers3 } from 'lucide-react';
import { DeforestationSummary, PriorityDetail } from '../types/api';

interface SummaryCardsProps {
  summary: DeforestationSummary;
  priority: PriorityDetail;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, priority }) => {
  const getPriorityBadgeClass = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'bg-rose-950/90 text-rose-300 border-rose-800 shadow-rose-950/50';
      case 'High':
        return 'bg-amber-950/90 text-amber-300 border-amber-800 shadow-amber-950/50';
      case 'Moderate':
        return 'bg-yellow-950/90 text-yellow-300 border-yellow-800 shadow-yellow-950/50';
      default:
        return 'bg-emerald-950/90 text-emerald-300 border-emerald-800 shadow-emerald-950/50';
    }
  };

  const getConcentrationBadgeClass = (concentration: string) => {
    switch (concentration) {
      case 'Highly Concentrated':
        return 'bg-purple-950/80 text-purple-300 border-purple-800';
      case 'Moderately Concentrated':
        return 'bg-blue-950/80 text-blue-300 border-blue-800';
      default:
        return 'bg-slate-800/80 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Deforestation % & Pixels */}
        <div className="glass-card flex items-center space-x-4 border-l-4 border-l-rose-500">
          <div className="p-3 bg-rose-950/80 text-rose-400 border border-rose-900/80 rounded-xl">
            <TreePine className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono">
              Deforestation Loss
            </p>
            <p className="text-2xl font-extrabold text-white font-mono mt-0.5">
              {summary.predicted_percentage.toFixed(3)}%
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              {summary.predicted_pixels.toLocaleString()} / 230,400 px
            </p>
          </div>
        </div>

        {/* Card 2: Priority Score & Level */}
        <div className="glass-card flex items-center space-x-4 border-l-4 border-l-amber-500">
          <div className="p-3 bg-amber-950/80 text-amber-400 border border-amber-900/80 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono">
                Engineering Priority
              </p>
            </div>
            <div className="flex items-center space-x-2 mt-0.5">
              <p className="text-2xl font-extrabold text-white font-mono">
                {priority.priority_score.toFixed(2)}
              </p>
              <span
                className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${getPriorityBadgeClass(
                  priority.priority_level
                )}`}
              >
                {priority.priority_level}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              Ref score: 0.50P + 0.35L + 0.15C
            </p>
          </div>
        </div>

        {/* Card 3: Region Count & Largest Region */}
        <div className="glass-card flex items-center space-x-4 border-l-4 border-l-cyan-500">
          <div className="p-3 bg-cyan-950/80 text-cyan-400 border border-cyan-900/80 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono">
              Detected Regions
            </p>
            <p className="text-2xl font-extrabold text-white font-mono mt-0.5">
              {summary.region_count} <span className="text-xs font-normal text-slate-400">clusters</span>
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              Largest: {summary.largest_region_percentage.toFixed(3)}% ({summary.largest_region_pixels.toLocaleString()} px)
            </p>
          </div>
        </div>

        {/* Card 4: Concentration & Density */}
        <div className="glass-card flex items-center space-x-4 border-l-4 border-l-purple-500">
          <div className="p-3 bg-purple-950/80 text-purple-400 border border-purple-900/80 rounded-xl">
            <Grid className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono">
              Spatial Distribution
            </p>
            <div className="mt-1">
              <span
                className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded border ${getConcentrationBadgeClass(
                  summary.concentration
                )}`}
              >
                {summary.concentration}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-1">
              {summary.regions_per_100k_pixels.toFixed(2)} regions / 100k px
            </p>
          </div>
        </div>
      </div>

      {/* Engineering Diagnostic Breakdown Bar */}
      <div className="glass-card bg-slate-900/40 p-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-400">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Normalized P-Score: <strong className="text-white">{priority.normalized_deforestation_score.toFixed(1)}</strong></span>
        </div>
        <div className="flex items-center space-x-2">
          <Layers3 className="w-4 h-4 text-cyan-400" />
          <span>Normalized L-Score: <strong className="text-white">{priority.normalized_largest_region_score.toFixed(1)}</strong></span>
        </div>
        <div className="flex items-center space-x-2">
          <Grid className="w-4 h-4 text-purple-400" />
          <span>Normalized C-Score: <strong className="text-white">{priority.normalized_region_count_score.toFixed(1)}</strong></span>
        </div>
        <div>
          <span>Fragmentation Ratio: <strong className="text-white">{summary.fragmentation_ratio.toFixed(6)}</strong></span>
        </div>
      </div>
    </div>
  );
};
