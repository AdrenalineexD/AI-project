import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import MapPanel from '../components/MapPanel';
import GlassCard from '../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import { Search, Flame, Cpu, TreePine, Navigation, Eye, HelpCircle } from 'lucide-react';

type FilterType = 'All' | 'Fires' | 'High Risk' | 'IoT' | 'Deforestation' | 'Monitoring Stations';

export const ForestMap: React.FC = () => {
  const { fires, sensors, deforestationAlerts } = useDashboard();
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filters: FilterType[] = ['All', 'Fires', 'High Risk', 'IoT', 'Deforestation', 'Monitoring Stations'];

  // Filter lists based on search query
  const filteredFires = fires.filter(f => 
    f.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.riskLevel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSensors = sensors.filter(s =>
    s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDeforest = deforestationAlerts.filter(d =>
    d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[85vh] flex flex-col space-y-4">
      {/* Top filter and search bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-charcoal-900/60 p-3 border border-charcoal-800 rounded">
        {/* Category Filters */}
        <div className="flex flex-wrap gap-1.5">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold border transition-all ${
                activeFilter === filter
                  ? 'bg-forest-950 text-white border-forest-550 shadow-[0_0_10px_rgba(39,146,76,0.06)]'
                  : 'bg-charcoal-950/40 text-charcoal-350 border-charcoal-800/80 hover:text-white hover:bg-charcoal-800/65'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Local Map Search bar */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-charcoal-450" />
          <input
            type="text"
            placeholder="Search map elements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-charcoal-950 border border-charcoal-800 rounded pl-9 pr-4 py-2 text-xs text-white placeholder-charcoal-500 focus:outline-none focus:border-charcoal-700 transition-all font-mono"
          />
        </div>
      </div>

      {/* Main split view: Map left, list sidebar right */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        
        {/* GIS Map */}
        <div className="flex-1 h-full min-h-[350px]">
          <MapPanel height="100%" activeFilter={activeFilter} />
        </div>

        {/* Sidebar directory list */}
        <GlassCard className="w-full lg:w-80 h-full flex flex-col min-h-0 overflow-hidden" hoverGlow={false}>
          <div className="pb-2 border-b border-charcoal-800/60 mb-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Map Directory</h4>
            <p className="text-[10px] text-charcoal-450 mt-0.5 font-mono">Located items matching filter</p>
          </div>

          {/* List Wrapper */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1.5 custom-scrollbar font-mono text-[10px]">
            
            {/* Fires Section */}
            {(activeFilter === 'All' || activeFilter === 'Fires') && filteredFires.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-charcoal-500 font-bold uppercase tracking-wider text-[9px] block">🔥 Fire Detections</span>
                {filteredFires.map((fire) => (
                  <div key={fire.id} className="p-2 border border-red-950/40 bg-red-950/10 rounded flex justify-between items-center hover:bg-red-950/20">
                    <div>
                      <span className="font-bold text-white text-[10px]">{fire.id}</span>
                      <p className="text-charcoal-400 text-[9px] mt-0.5">Conf: {fire.confidence}% | Temp: {fire.temperature}°C</p>
                    </div>
                    <StatusBadge status={fire.riskLevel} className="text-[8px]" />
                  </div>
                ))}
              </div>
            )}

            {/* Sensors Section */}
            {(activeFilter === 'All' || activeFilter === 'IoT') && filteredSensors.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-charcoal-500 font-bold uppercase tracking-wider text-[9px] block">📡 IoT Telemetry Nodes</span>
                {filteredSensors.map((sensor) => (
                  <div key={sensor.id} className={`p-2 border border-charcoal-800 bg-charcoal-950/50 rounded flex justify-between items-center ${sensor.connectivity === 'Offline' ? 'opacity-50' : ''}`}>
                    <div>
                      <span className="font-bold text-white text-[10px]">{sensor.id}</span>
                      <p className="text-charcoal-400 text-[9px] mt-0.5">{sensor.name}</p>
                    </div>
                    <StatusBadge status={sensor.connectivity} className="text-[8px]" />
                  </div>
                ))}
              </div>
            )}

            {/* Deforestation Section */}
            {(activeFilter === 'All' || activeFilter === 'Deforestation') && filteredDeforest.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-charcoal-500 font-bold uppercase tracking-wider text-[9px] block">🌳 Deforestation Alerts</span>
                {filteredDeforest.map((def) => (
                  <div key={def.id} className="p-2 border border-yellow-950/40 bg-yellow-950/10 rounded flex justify-between items-center">
                    <div>
                      <span className="font-bold text-white text-[10px]">{def.id}</span>
                      <p className="text-charcoal-400 text-[9px] mt-0.5">Area: {def.areaKm2} km²</p>
                    </div>
                    <StatusBadge status={def.status} className="text-[8px]" />
                  </div>
                ))}
              </div>
            )}

            {filteredFires.length === 0 && filteredSensors.length === 0 && filteredDeforest.length === 0 && (
              <div className="text-center text-charcoal-500 py-10">
                No items found matching your filters.
              </div>
            )}

          </div>

          <div className="mt-3 pt-2.5 border-t border-charcoal-800/50 text-[9px] text-charcoal-500 leading-relaxed">
            Click on markers directly on the map to view detailed sensor reports, fire confidence, wind vectors, and local telemetry popups.
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default ForestMap;
