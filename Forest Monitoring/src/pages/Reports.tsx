import React, { useState } from 'react';
import GlassCard from '../components/GlassCard';
import { useDashboard } from '../context/DashboardContext';
import { FileText, Download, RotateCw, CheckCircle, FileSpreadsheet, Eye, Terminal } from 'lucide-react';

interface ReportDoc {
  id: string;
  name: string;
  description: string;
  lastGenerated: string;
  size: string;
  format: 'PDF' | 'CSV' | 'XLSX';
}

export const Reports: React.FC = () => {
  const { addToast } = useDashboard();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportDoc | null>(null);

  const reportsList: ReportDoc[] = [
    {
      id: 'REP-001',
      name: 'Weekly Fire Intelligence Summary',
      description: 'Aggregated wildfire hotspot data, weather indexes, spread metrics, and autonomous drone verification logs.',
      lastGenerated: '2026-08-16 12:00:00',
      size: '2.4 MB',
      format: 'PDF'
    },
    {
      id: 'REP-002',
      name: 'Deforestation & Canopy Loss Anomaly Report',
      description: 'Multispectral Sentinel-2 comparison logs, NDVI vegetation indexes, and forest cover loss estimations.',
      lastGenerated: '2026-08-15 08:30:00',
      size: '3.1 MB',
      format: 'PDF'
    },
    {
      id: 'REP-003',
      name: 'IoT Hardware Grid & Sensor Health Assessment',
      description: 'Heartbeat availability checks, battery level reports, connection drops, and solar power inputs for ESP32 nodes.',
      lastGenerated: '2026-08-16 00:00:00',
      size: '1.2 MB',
      format: 'CSV'
    },
    {
      id: 'REP-004',
      name: 'Environmental Risk & FWI Danger Index Forecast',
      description: 'Pre-wildfire index correlations, regional temperature/humidity values, and meteorological forecast trends.',
      lastGenerated: '2026-08-16 18:00:00',
      size: '1.8 MB',
      format: 'PDF'
    },
    {
      id: 'REP-005',
      name: 'Forest Activity Summary & Carbon Stock Log',
      description: 'Consolidated report documenting deforestation vectors and estimated regional biomass indexes.',
      lastGenerated: '2026-08-10 17:45:00',
      size: '4.2 MB',
      format: 'PDF'
    }
  ];

  const handleGenerate = (id: string, name: string) => {
    setGeneratingId(id);
    addToast(`Compiling data metrics for: ${name}...`, 'info');
    setTimeout(() => {
      setGeneratingId(null);
      addToast(`[REPORT SUCCESS] Compiled report ${id} successfully.`, 'success');
    }, 2000);
  };

  const handleExport = (id: string, name: string) => {
    addToast(`Exporting ${id} in requested format...`, 'success');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">System Reports Library</h1>
        <p className="text-xs text-charcoal-400 mt-1">Generate, audit, and export compiled forest intelligence summaries and diagnostic logs</p>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Reports List Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-charcoal-850 px-1 select-none">
            <span className="text-xs font-bold text-charcoal-450 uppercase tracking-widest font-mono">Available Documents</span>
            <span className="text-[10px] text-charcoal-550 font-mono">Select to inspect details</span>
          </div>

          <div className="space-y-3">
            {reportsList.map((doc) => (
              <div 
                key={doc.id}
                onClick={() => setSelectedReport(doc)}
                className={`p-4 border rounded bg-charcoal-900/40 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-200 ${
                  selectedReport?.id === doc.id 
                    ? 'border-forest-650/70 bg-forest-950/5 shadow-[0_0_12px_rgba(39,146,76,0.06)]' 
                    : 'border-charcoal-800/80 hover:border-charcoal-700/60'
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  <div className="p-2 bg-charcoal-950 border border-charcoal-800 rounded text-forest-400 flex-shrink-0">
                    {doc.format === 'CSV' ? <FileSpreadsheet className="w-5 h-5 text-blue-400" /> : <FileText className="w-5 h-5 text-red-400" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 font-mono">
                      <span className="text-[10px] text-charcoal-500 font-bold">{doc.id}</span>
                      <span className="text-[10px] text-charcoal-550">| Size: {doc.size}</span>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold border border-charcoal-750 bg-charcoal-950/70 text-charcoal-400 font-mono uppercase">{doc.format}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white mt-1 leading-snug">{doc.name}</h4>
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto self-stretch sm:self-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerate(doc.id, doc.name);
                    }}
                    disabled={generatingId === doc.id}
                    className="flex-1 sm:flex-initial px-2.5 py-1.5 bg-charcoal-850 hover:bg-charcoal-750 border border-charcoal-700/60 text-white rounded text-[10px] font-semibold font-mono flex items-center justify-center space-x-1.5 disabled:opacity-50"
                  >
                    {generatingId === doc.id ? (
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCw className="w-3.5 h-3.5" />
                    )}
                    <span>{generatingId === doc.id ? 'Generating...' : 'Compile'}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport(doc.id, doc.name);
                    }}
                    className="px-2.5 py-1.5 bg-forest-950/30 hover:bg-forest-900/35 border border-forest-850/60 text-forest-400 hover:text-white rounded text-[10px] font-semibold font-mono flex items-center justify-center space-x-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Document Details inspect pane */}
        <GlassCard className="h-full flex flex-col justify-between" hoverGlow={false}>
          {selectedReport ? (
            <div className="flex flex-col justify-between h-full space-y-5 font-mono text-[11px] leading-relaxed">
              <div>
                <div className="pb-3 border-b border-charcoal-800 mb-4 flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white text-xs uppercase">Document Inspector</h4>
                    <p className="text-[9px] text-charcoal-450 mt-0.5">{selectedReport.id}</p>
                  </div>
                  <span className="px-1.5 py-0.5 bg-charcoal-950 border border-charcoal-800 text-charcoal-450 rounded text-[9px]">
                    {selectedReport.format}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-charcoal-550 block font-bold uppercase tracking-wider text-[9px]">Document Name</span>
                    <span className="text-white mt-1 block font-semibold text-xs leading-snug">{selectedReport.name}</span>
                  </div>

                  <div>
                    <span className="text-charcoal-550 block font-bold uppercase tracking-wider text-[9px]">Last Compiled Run</span>
                    <span className="text-white mt-1 block">{selectedReport.lastGenerated}</span>
                  </div>

                  <div>
                    <span className="text-charcoal-550 block font-bold uppercase tracking-wider text-[9px]">Metadata Description</span>
                    <p className="text-charcoal-350 mt-1.5 leading-normal bg-charcoal-950 p-2.5 rounded border border-charcoal-850">
                      {selectedReport.description}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <span className="text-charcoal-550 block font-bold uppercase tracking-wider text-[9px]">Compilation Schema</span>
                  <div className="bg-charcoal-950/40 border border-charcoal-800 p-2.5 rounded text-[10px] space-y-1 text-charcoal-400">
                    <p><span className="text-emerald-500">[✓]</span> Sensor log packet fusion: 1,422 values</p>
                    <p><span className="text-emerald-500">[✓]</span> YOLO optical CAM scans: 24 detections</p>
                    <p><span className="text-emerald-500">[✓]</span> Sentinel-2 NDVI differential validation</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-charcoal-800/80 flex space-x-2">
                <button
                  onClick={() => handleGenerate(selectedReport.id, selectedReport.name)}
                  className="flex-1 py-2 bg-charcoal-850 hover:bg-charcoal-800 border border-charcoal-750 text-white rounded text-[10px] font-bold text-center flex items-center justify-center space-x-1"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Re-Compile</span>
                </button>
                <button
                  onClick={() => handleExport(selectedReport.id, selectedReport.name)}
                  className="flex-1 py-2 bg-forest-950/40 text-forest-450 border border-forest-800/50 hover:bg-forest-900/40 hover:text-white rounded text-[10px] font-bold text-center flex items-center justify-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Report</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center font-mono text-xs text-charcoal-500 py-10">
              <Terminal className="w-8 h-8 text-charcoal-600 mb-2 animate-pulse" />
              <span>Select a compiled report to inspect file metadata parameters.</span>
            </div>
          )}
        </GlassCard>

      </div>
    </div>
  );
};

export default Reports;
