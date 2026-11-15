import React, { useState } from 'react';
import { Grid, Info } from 'lucide-react';
import { GridCellDetail } from '../types/api';

interface HotspotGridProps {
  grid: GridCellDetail[];
}

export const HotspotGrid: React.FC<HotspotGridProps> = ({ grid }) => {
  const [selectedCell, setSelectedCell] = useState<GridCellDetail | null>(grid[0] || null);

  const getHotspotCellClass = (level: string, isSelected: boolean) => {
    let base = 'transition cursor-pointer flex flex-col items-center justify-center p-2 border rounded-lg font-mono ';
    if (isSelected) {
      base += 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 scale-95 ';
    }

    switch (level) {
      case 'Critical':
        return base + 'bg-rose-950/90 border-rose-600 text-rose-200 hover:bg-rose-900/90 shadow-rose-950/50';
      case 'High':
        return base + 'bg-amber-950/90 border-amber-600 text-amber-200 hover:bg-amber-900/90 shadow-amber-950/50';
      case 'Moderate':
        return base + 'bg-yellow-950/80 border-yellow-600 text-yellow-200 hover:bg-yellow-900/80';
      default:
        return base + 'bg-slate-900/90 border-slate-800 text-slate-400 hover:bg-slate-800/90';
    }
  };

  return (
    <div className="glass-card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Grid className="w-4 h-4 text-purple-400" />
            4×4 Spatial Hotspot Grid Decomposition
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Image space partitioned into 16 cells (120×120 px each) with localized hotspot scores
          </p>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">
          Formula: 0.80×Pct + 0.20×LargestPct
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* 4x4 Interactive Grid Box */}
        <div className="lg:col-span-2 aspect-square max-w-[420px] mx-auto w-full grid grid-cols-4 grid-rows-4 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 shadow-inner">
          {grid.map((cell) => {
            const isSelected = selectedCell?.grid_id === cell.grid_id;
            return (
              <div
                key={cell.grid_id}
                onClick={() => setSelectedCell(cell)}
                className={getHotspotCellClass(cell.hotspot_level, isSelected)}
              >
                <span className="text-[10px] font-bold tracking-tight">R{cell.grid_row}C{cell.grid_col}</span>
                <span className="text-sm font-extrabold mt-0.5">{cell.hotspot_score.toFixed(1)}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-80">{cell.hotspot_level}</span>
              </div>
            );
          })}
        </div>

        {/* Selected Cell Inspector Details Card */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-4 h-4 text-cyan-400" />
              Cell Details ({selectedCell?.grid_id || 'R0_C0'})
            </span>
            {selectedCell && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                selectedCell.hotspot_level === 'Critical' ? 'bg-rose-950 text-rose-300 border-rose-800' :
                selectedCell.hotspot_level === 'High' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                selectedCell.hotspot_level === 'Moderate' ? 'bg-yellow-950 text-yellow-300 border-yellow-800' :
                'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {selectedCell.hotspot_level}
              </span>
            )}
          </div>

          {selectedCell ? (
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Bounding Box (X, Y):</span>
                <span className="text-slate-200">[{selectedCell.x_min}..{selectedCell.x_max}, {selectedCell.y_min}..{selectedCell.y_max}]</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Hotspot Score:</span>
                <span className="text-emerald-400 font-bold">{selectedCell.hotspot_score.toFixed(2)} / 100</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Deforestation Pixels:</span>
                <span className="text-white">{selectedCell.predicted_deforestation_pixels.toLocaleString()} / 14,400 px</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Deforestation % (Cell):</span>
                <span className="text-rose-400 font-bold">{selectedCell.predicted_deforestation_percent_of_cell.toFixed(3)}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Deforestation % (Image):</span>
                <span className="text-slate-300">{selectedCell.predicted_deforestation_percent_of_image.toFixed(3)}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Intersecting Regions:</span>
                <span className="text-cyan-400 font-bold">{selectedCell.number_of_regions_intersecting_cell}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Largest Region in Cell:</span>
                <span className="text-slate-200">{selectedCell.largest_region_pixels_in_cell.toLocaleString()} px</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 text-center py-6">Select a grid cell to inspect localized statistics.</div>
          )}
        </div>
      </div>
    </div>
  );
};
