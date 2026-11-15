import React, { useState } from 'react';
import AIStatusPanel from '../components/AIStatusPanel';
import GlassCard from '../components/GlassCard';
import { useDashboard } from '../context/DashboardContext';
import { Cpu, Settings2, Sliders, ShieldCheck, Save } from 'lucide-react';

export const Settings: React.FC = () => {
  const { addToast } = useDashboard();
  const [activeTab, setActiveTab] = useState<'ai' | 'config'>('ai');

  // Config States
  const [yoloThresh, setYoloThresh] = useState(85);
  const [espInterval, setEspInterval] = useState(30);
  const [fwiAlarm, setFwiAlarm] = useState(30.0);
  const [autoSatelite, setAutoSatelite] = useState(true);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('AETHER System Configuration saved successfully.', 'success');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">System Settings & AI Core</h1>
          <p className="text-xs text-charcoal-400 mt-1">Configure AETHER autonomous loops and evaluate decision pipeline reasoning logs</p>
        </div>

        {/* Tab Picker */}
        <div className="flex bg-charcoal-900 border border-charcoal-800 p-0.5 rounded font-mono text-xs">
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-1.5 rounded font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'ai'
                ? 'bg-forest-950 text-white border border-forest-900/60'
                : 'text-charcoal-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>AI Decision Engine</span>
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-3 py-1.5 rounded font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'config'
                ? 'bg-forest-950 text-white border border-forest-900/60'
                : 'text-charcoal-400 hover:text-white'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>System Parameters</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'ai' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-1 border-b border-charcoal-850 px-1 select-none">
            <span className="text-xs font-bold text-charcoal-450 uppercase tracking-widest font-mono">Autonomous Decision Engine</span>
            <span className="text-[9px] font-mono text-yellow-500 font-bold uppercase tracking-wider">Simulated Agent Output</span>
          </div>
          <AIStatusPanel />
        </div>
      ) : (
        <form onSubmit={handleSaveConfig} className="max-w-3xl space-y-6">
          <GlassCard hoverGlow={false} className="space-y-5 font-mono text-xs">
            <div className="pb-3 border-b border-charcoal-800 flex justify-between items-center">
              <div className="flex items-center space-x-2 text-white font-bold">
                <Sliders className="w-4 h-4 text-forest-400" />
                <span>AETHER Control Parameters</span>
              </div>
              <span className="text-[10px] text-charcoal-550 uppercase">Operational Bounds</span>
            </div>

            {/* Config Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-charcoal-400 font-semibold mb-2 uppercase text-[10px]">
                  YOLOv8 Detection Threshold (%)
                </label>
                <input
                  type="number"
                  min="50"
                  max="99"
                  value={yoloThresh}
                  onChange={(e) => setYoloThresh(Number(e.target.value))}
                  className="w-full bg-charcoal-950 border border-charcoal-800 rounded px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-charcoal-700"
                />
                <p className="text-[9px] text-charcoal-500 mt-1 leading-normal">
                  Minimum confidence score for optical fire/smoke triggers before verification loops initiate.
                </p>
              </div>

              <div>
                <label className="block text-charcoal-400 font-semibold mb-2 uppercase text-[10px]">
                  ESP32 Heartbeat Interval (Seconds)
                </label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={espInterval}
                  onChange={(e) => setEspInterval(Number(e.target.value))}
                  className="w-full bg-charcoal-950 border border-charcoal-800 rounded px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-charcoal-700"
                />
                <p className="text-[9px] text-charcoal-500 mt-1 leading-normal">
                  Reporting latency threshold before node connectivity state marks OFFLINE and flags failures.
                </p>
              </div>

              <div>
                <label className="block text-charcoal-400 font-semibold mb-2 uppercase text-[10px]">
                  FWI Alarm Threshold (Critical Index)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="10.0"
                  max="50.0"
                  value={fwiAlarm}
                  onChange={(e) => setFwiAlarm(Number(e.target.value))}
                  className="w-full bg-charcoal-950 border border-charcoal-800 rounded px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-charcoal-700"
                />
                <p className="text-[9px] text-charcoal-500 mt-1 leading-normal">
                  Fire Weather Index threshold triggering regional alerts.
                </p>
              </div>

              <div>
                <label className="block text-charcoal-400 font-semibold mb-2 uppercase text-[10px]">
                  Autonomous Satellite Verification
                </label>
                <div className="flex items-center mt-2.5">
                  <input
                    type="checkbox"
                    checked={autoSatelite}
                    onChange={(e) => setAutoSatelite(e.target.checked)}
                    className="w-4 h-4 rounded border-charcoal-800 text-forest-650 bg-charcoal-950 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-white ml-2 text-xs font-bold font-mono">ENABLE AUTO TASKING</span>
                </div>
                <p className="text-[9px] text-charcoal-500 mt-2.5 leading-normal">
                  Request ESA/NASA imagery pass coordinates automatically on YOLO high risk confidence flags.
                </p>
              </div>

            </div>

            <div className="pt-4 border-t border-charcoal-800 flex justify-between items-center">
              <div className="flex items-center space-x-1.5 text-[10px] text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Settings validated by Operator OP-E71</span>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-forest-950/40 text-forest-450 hover:bg-forest-900/40 hover:text-white border border-forest-800/50 rounded font-bold flex items-center space-x-1.5 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Parameters</span>
              </button>
            </div>
          </GlassCard>

          <div className="p-4 border border-dashed border-charcoal-800 rounded text-center text-xs font-mono text-charcoal-500 select-none">
            AETHER CONTROL SYSTEMS // SYSTEM VERSION 1.0.3-RELEASE
          </div>
        </form>
      )}

    </div>
  );
};

export default Settings;
