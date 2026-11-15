import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Terminal, Cpu, CheckCircle2, ShieldAlert, ArrowRight, Play } from 'lucide-react';
import Timeline from './Timeline';
import GlassCard from './GlassCard';

export const AIStatusPanel: React.FC = () => {
  const { aiDecisions, aiRecommendations, approveRecommendation } = useDashboard();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Reasoning Terminal Log */}
      <GlassCard className="lg:col-span-2 flex flex-col min-h-[450px]" hoverGlow={false}>
        <div className="flex justify-between items-center pb-3 border-b border-charcoal-800/60 mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-1 bg-forest-950 text-forest-400 border border-forest-800 rounded">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-white font-mono">AETHER_DECISION_ENGINE.sh</h4>
              <p className="text-[10px] text-charcoal-400 font-mono">Process ID: PID-4932 | Active Daemon</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-charcoal-950/60 px-2.5 py-1 rounded border border-charcoal-800/80">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-[10px] text-white font-mono font-bold">CORE ONLINE</span>
          </div>
        </div>

        {/* Terminal Screen */}
        <div className="flex-1 bg-charcoal-950/95 border border-charcoal-850 rounded p-4 font-mono text-xs overflow-y-auto max-h-[360px] custom-scrollbar">
          <div className="text-charcoal-500 mb-3 select-none">
            {`// AETHER Autonomous Forest Monitoring Reasoning Log`} <br />
            {`// Fusing Vision AI, IoT telemetry, satellite differentials, and wind vectors`} <br />
            {`// ------------------------------------------------------------------------`}
          </div>

          <Timeline items={aiDecisions} />
          
          <div className="mt-4 flex items-center space-x-1.5 text-forest-400 animate-pulse text-[10px]">
            <Play className="w-3 h-3 fill-current" />
            <span>awaiting next telemetry packet...</span>
          </div>
        </div>

        <div className="mt-3 text-[10px] text-charcoal-500 font-mono flex justify-between select-none">
          <span>SIMULATED AGENT OUTPUT</span>
          <span>SYSTEM CONFIDENCE: 94.7%</span>
        </div>
      </GlassCard>

      {/* AI Recommendation Dashboard */}
      <div className="flex flex-col space-y-4">
        <GlassCard className="bg-gradient-to-br from-charcoal-900/50 to-forest-950/15 border-forest-900/30 flex flex-col justify-between" hoverGlow={true}>
          <div>
            <div className="flex items-center space-x-2 text-forest-400 mb-2">
              <Cpu className="w-4 h-4" />
              <h4 className="font-bold text-xs uppercase tracking-wider">AI Recommendation</h4>
            </div>
            <p className="text-sm font-semibold text-white leading-relaxed">
              "Wildfire probability is currently evaluated at 98.4% in Sector F. Proactive dispatch of local mitigation crews and immediate validation via Sentinel-2 satellite pass are highly recommended."
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-charcoal-800/50 text-[10px] text-charcoal-500 uppercase tracking-widest font-mono">
            Generated: 18:42:47
          </div>
        </GlassCard>

        {/* Action checklist */}
        <div className="flex-1 flex flex-col space-y-3">
          <h5 className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider pl-1">Proactive Agentic Tasks</h5>

          <div className="space-y-3 overflow-y-auto max-h-[280px]">
            {aiRecommendations.map((rec) => (
              <div key={rec.id} className="p-3 border border-charcoal-800 bg-charcoal-900/30 rounded flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-charcoal-500 font-bold">{rec.id}</span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                      rec.status === 'Executed' 
                        ? 'bg-emerald-950/30 text-emerald-400 border-emerald-800/30' 
                        : 'bg-yellow-950/30 text-yellow-400 border-yellow-800/30'
                    }`}>
                      {rec.status}
                    </span>
                  </div>
                  <h6 className="font-semibold text-white text-xs mt-1 leading-snug">{rec.recommendation}</h6>
                  <p className="text-[11px] text-charcoal-400 mt-1 leading-normal">{rec.rationale}</p>
                  
                  {/* Action Steps Checklist */}
                  <div className="mt-2 space-y-1">
                    {rec.actions.map((act, index) => (
                      <div key={index} className="flex items-start space-x-1.5 text-[10px] text-charcoal-300">
                        {rec.status === 'Executed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0 mt-1.5" />
                        )}
                        <span>{act}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {rec.status !== 'Executed' && rec.status !== 'Approved' && (
                  <button
                    onClick={() => approveRecommendation(rec.id)}
                    className="w-full mt-2 py-1 text-center bg-forest-950/40 text-forest-400 border border-forest-800/50 hover:bg-forest-900/40 hover:text-white rounded text-[10px] font-semibold transition-all flex items-center justify-center space-x-1"
                  >
                    <span>Approve Task Execution</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIStatusPanel;
