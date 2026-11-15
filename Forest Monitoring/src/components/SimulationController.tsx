import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Play, Flame, Cloud, Cpu, TreePine, AlertTriangle, ChevronUp, ChevronDown, Sliders } from 'lucide-react';

export const SimulationController: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    simulateFire, 
    simulateSmoke, 
    simulateSensorFailure, 
    simulateDeforestation, 
    simulateCriticalRisk 
  } = useDashboard();

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-charcoal-900 border border-charcoal-850 rounded shadow-2xl flex flex-col w-56 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex justify-between items-center px-3.5 py-2.5 bg-charcoal-950 text-xs font-mono font-bold text-white border-b border-charcoal-850 hover:bg-charcoal-850 transition-colors"
        >
          <div className="flex items-center space-x-1.5">
            <Sliders className="w-3.5 h-3.5 text-forest-400" />
            <span className="tracking-wide">SIMULATION PANEL</span>
          </div>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-charcoal-400" /> : <ChevronUp className="w-3.5 h-3.5 text-charcoal-400" />}
        </button>

        {/* Buttons (collapsible) */}
        {isOpen && (
          <div className="p-2.5 bg-charcoal-900/90 backdrop-blur-md space-y-1.5">
            <p className="text-[9px] text-charcoal-500 font-mono tracking-widest uppercase mb-1.5 text-center">
              Demonstration Triggers
            </p>

            <button
              onClick={simulateFire}
              className="w-full text-left px-2.5 py-1.5 text-xs text-red-400 hover:text-white bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-500/50 rounded flex items-center space-x-2 transition-all font-semibold"
            >
              <Flame className="w-3.5 h-3.5 text-red-500 fill-current animate-pulse" />
              <span>Simulate Fire</span>
            </button>

            <button
              onClick={simulateSmoke}
              className="w-full text-left px-2.5 py-1.5 text-xs text-orange-400 hover:text-white bg-orange-950/20 hover:bg-orange-950/40 border border-orange-900/30 hover:border-orange-500/50 rounded flex items-center space-x-2 transition-all font-semibold"
            >
              <Cloud className="w-3.5 h-3.5 text-orange-450" />
              <span>Simulate Smoke</span>
            </button>

            <button
              onClick={simulateSensorFailure}
              className="w-full text-left px-2.5 py-1.5 text-xs text-amber-400 hover:text-white bg-amber-950/20 hover:bg-amber-950/40 border border-amber-900/30 hover:border-amber-500/50 rounded flex items-center space-x-2 transition-all font-semibold"
            >
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>Sensor Fault</span>
            </button>

            <button
              onClick={simulateDeforestation}
              className="w-full text-left px-2.5 py-1.5 text-xs text-forest-400 hover:text-white bg-forest-950/20 hover:bg-forest-950/40 border border-forest-900/30 hover:border-forest-500/50 rounded flex items-center space-x-2 transition-all font-semibold"
            >
              <TreePine className="w-3.5 h-3.5 text-forest-400" />
              <span>Canopy Loss</span>
            </button>

            <button
              onClick={simulateCriticalRisk}
              className="w-full text-left px-2.5 py-1.5 text-xs text-blue-400 hover:text-white bg-blue-950/25 hover:bg-blue-950/45 border border-blue-900/30 hover:border-blue-500/50 rounded flex items-center space-x-2 transition-all font-semibold"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-blue-450" />
              <span>Weather Crisis</span>
            </button>

            <div className="text-[8px] text-charcoal-500 font-mono text-center pt-1 tracking-wider uppercase">
              Ctrl+K for Command Bar
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulationController;
