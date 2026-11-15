import React, { useState } from 'react';
import { Layers, ArrowUpDown } from 'lucide-react';
import { RegionDetail } from '../types/api';

interface RegionTableProps {
  regions: RegionDetail[];
}

export const RegionTable: React.FC<RegionTableProps> = ({ regions }) => {
  const [sortField, setSortField] = useState<keyof RegionDetail>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: keyof RegionDetail) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedRegions = [...regions].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }
    return 0;
  });

  return (
    <div className="glass-card space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Stage 4A 8-Connectivity Region Intelligence
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Individual connected deforestation clusters ranked by pixel area ({regions.length} total regions)
          </p>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
          Image-space coordinates only
        </span>
      </div>

      {/* Scrollable Data Table Container */}
      <div className="overflow-x-auto max-h-[380px] rounded-lg border border-slate-800 font-mono text-xs">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-950 text-slate-400 sticky top-0 z-10 border-b border-slate-800 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('rank')}>
                <div className="flex items-center gap-1">
                  <span>Rank</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('region_id')}>
                <div className="flex items-center gap-1">
                  <span>Region ID</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('pixel_count')}>
                <div className="flex items-center gap-1">
                  <span>Pixel Area</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('percentage_of_image')}>
                <div className="flex items-center gap-1">
                  <span>Image %</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3">Centroid (X, Y)</th>
              <th className="p-3">Bounding Box [X1, Y1, X2, Y2]</th>
              <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('region_contribution_percent')}>
                <div className="flex items-center gap-1">
                  <span>Contribution %</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
            {sortedRegions.length > 0 ? (
              sortedRegions.map((r) => (
                <tr key={r.region_id} className="hover:bg-slate-800/50 transition">
                  <td className="p-3 font-bold text-emerald-400">#{r.rank}</td>
                  <td className="p-3 text-slate-300">Region #{r.region_id}</td>
                  <td className="p-3 text-white font-bold">{r.pixel_count.toLocaleString()} px</td>
                  <td className="p-3 text-rose-400 font-bold">{r.percentage_of_image.toFixed(4)}%</td>
                  <td className="p-3 text-cyan-300">({r.centroid_x}, {r.centroid_y})</td>
                  <td className="p-3 text-slate-400">[{r.bbox_x_min}, {r.bbox_y_min}, {r.bbox_x_max}, {r.bbox_y_max}]</td>
                  <td className="p-3 text-purple-300 font-bold">{r.region_contribution_percent.toFixed(2)}%</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  No deforestation regions detected. Run U-Net analysis to view region intelligence.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
