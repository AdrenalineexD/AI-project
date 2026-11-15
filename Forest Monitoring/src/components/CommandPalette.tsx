import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Navigation, Zap, CornerDownLeft, X } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { 
    simulateFire, 
    simulateSmoke, 
    simulateSensorFailure, 
    simulateDeforestation, 
    simulateCriticalRisk 
  } = useDashboard();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const navigationCommands = [
    { name: 'Go to Overview', path: '/', description: 'Central monitoring dashboard summary' },
    { name: 'Open Live Monitoring', path: '/live', description: 'YOLO camera vision streams' },
    { name: 'Open Forest Map', path: '/map', description: 'Interactive Leaflet GIS map' },
    { name: 'View Fire Intelligence', path: '/fire-intelligence', description: 'Spread predictions & risk metrics' },
    { name: 'View Deforestation', path: '/deforestation', description: 'Satellite analysis & logging alerts' },
    { name: 'View IoT Sensors', path: '/sensors', description: 'ESP32 DHT22 telemetry grid' },
    { name: 'View Alerts Center', path: '/alerts', description: 'Active alerts list and triage' },
    { name: 'Open Analytics', path: '/analytics', description: 'Historical Recharts graphs' },
    { name: 'Open Reports', path: '/reports', description: 'Export weekly & daily summaries' },
    { name: 'Open AETHER AI Core', path: '/settings', description: 'Autonomous agent logs & options', routeToSettingsTab: 'ai' }
  ];

  const simulationCommands = [
    { name: 'Trigger: Simulate Active Fire', action: simulateFire, description: 'Inject critical hotspot and alert' },
    { name: 'Trigger: Simulate Smoke Signature', action: simulateSmoke, description: 'Inject plume alert from CAM-02' },
    { name: 'Trigger: Simulate Sensor Failure', action: simulateSensorFailure, description: 'Drop random ESP32 node offline' },
    { name: 'Trigger: Simulate Deforestation', action: simulateDeforestation, description: 'Inject canopy loss alert' },
    { name: 'Trigger: Simulate Critical Risk', action: simulateCriticalRisk, description: 'Scale weather stats to danger threshold' }
  ];

  const filteredNavigation = navigationCommands.filter((cmd) =>
    cmd.name.toLowerCase().includes(search.toLowerCase()) ||
    cmd.description.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSimulation = simulationCommands.filter((cmd) =>
    cmd.name.toLowerCase().includes(search.toLowerCase()) ||
    cmd.description.toLowerCase().includes(search.toLowerCase())
  );

  const allItems = [
    ...filteredNavigation.map(item => ({ ...item, type: 'nav' })),
    ...filteredSimulation.map(item => ({ ...item, type: 'sim' }))
  ];

  useEffect(() => {
    if (selectedIndex >= allItems.length) {
      setSelectedIndex(Math.max(0, allItems.length - 1));
    }
  }, [search, allItems.length, selectedIndex]);

  const handleCommandSelect = (item: any) => {
    if (item.type === 'nav') {
      navigate(item.path);
    } else if (item.type === 'sim') {
      item.action();
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        handleCommandSelect(allItems[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-charcoal-950/80 backdrop-blur-sm cursor-pointer"
        onClick={() => setIsOpen(false)}
      />

      {/* Palette Container */}
      <div className="relative w-full max-w-xl bg-charcoal-900 border border-charcoal-800 rounded shadow-2xl overflow-hidden flex flex-col max-h-[450px]">
        {/* Search Input bar */}
        <div className="flex items-center space-x-3 px-4 py-3 border-b border-charcoal-800/80">
          <Search className="w-5 h-5 text-charcoal-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or shortcut... (e.g. Overview, Simulate)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none text-white focus:outline-none focus:ring-0 text-sm placeholder-charcoal-500"
          />
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 bg-charcoal-950/40 hover:bg-charcoal-800 rounded border border-charcoal-800/60 text-charcoal-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Command list */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {allItems.length === 0 ? (
            <div className="text-center py-8 text-charcoal-500 text-xs">
              No matching commands or actions found.
            </div>
          ) : (
            <div className="space-y-1">
              {allItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleCommandSelect(item)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded cursor-pointer transition-all duration-150 ${
                    idx === selectedIndex 
                      ? 'bg-forest-950 text-white border-l-2 border-forest-500' 
                      : 'hover:bg-charcoal-850 text-charcoal-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {item.type === 'nav' ? (
                      <Navigation className={`w-4 h-4 ${idx === selectedIndex ? 'text-forest-400' : 'text-charcoal-500'}`} />
                    ) : (
                      <Zap className="w-4 h-4 text-orange-400 animate-pulse" />
                    )}
                    <div>
                      <p className="text-xs font-semibold">{item.name}</p>
                      <p className="text-[10px] text-charcoal-450 mt-0.5">{item.description}</p>
                    </div>
                  </div>

                  {idx === selectedIndex && (
                    <span className="flex items-center space-x-0.5 text-[9px] font-mono text-forest-400 bg-forest-950 border border-forest-800 rounded px-1.5 py-0.5">
                      <span>Enter</span>
                      <CornerDownLeft className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions footer */}
        <div className="bg-charcoal-950/90 border-t border-charcoal-800/80 px-4 py-2 flex justify-between items-center text-[10px] text-charcoal-500 font-mono">
          <div className="flex space-x-3">
            <span>↑↓ Navigation</span>
            <span>Esc to close</span>
          </div>
          <div>
            <span>Global access: Ctrl+K</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
