import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import StatCard from '../components/StatCard';
import MapPanel from '../components/MapPanel';
import GlassCard from '../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import { Flame, TreePine, Radio, Navigation, Cpu, AlertTriangle, ArrowRight, Wifi, WifiOff, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Overview: React.FC = () => {
  const { 
    fires, 
    sensors, 
    deforestationAlerts, 
    alerts, 
    aiDecisions, 
    environmentalStats,
    deforestationStats,
    wsConnected,
    beIncidents,
  } = useDashboard();

  // Computations based on state
  const activeFiresCount = fires.filter(f => f.status === 'Active').length;
  const criticalFiresCount = fires.filter(f => f.status === 'Active' && f.riskLevel === 'Critical').length;
  const onlineSensors = sensors.filter(s => s.connectivity === 'Online').length;
  const totalSensors = sensors.length;

  const fwi = environmentalStats.fireWeatherIndex;
  const riskStatusText = fwi > 40 ? 'CRITICAL' : fwi > 30 ? 'HIGH' : fwi > 20 ? 'MEDIUM' : 'LOW';

  const activeBeIncidents = beIncidents.filter(i => !['RESOLVED','FALSE_POSITIVE'].includes(i.state));

  return (
    <div className="space-y-6">
      
      {/* 1. Header Area */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Forest Intelligence Overview</h1>
          <p className="text-xs text-charcoal-400 mt-1">Real-time environmental monitoring and AI-powered risk assessment</p>
        </div>
        {/* Backend status banner */}
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded border text-[10px] font-mono font-bold
            ${wsConnected
              ? 'bg-emerald-950/50 border-emerald-800/50 text-emerald-400'
              : 'bg-charcoal-900 border-charcoal-700 text-charcoal-500'}`}>
            {wsConnected
              ? <><Wifi className="w-3 h-3" /><span>AI BACKEND LIVE · {activeBeIncidents.length} incidents</span></>
              : <><WifiOff className="w-3 h-3" /><span>AI BACKEND OFFLINE</span></>}
          </div>
          <Link
            to="/command-center"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded border border-amber-700/60 bg-amber-950/40 text-amber-400 text-[10px] font-mono font-bold hover:border-amber-500 hover:text-amber-300 transition-all"
          >
            <Zap className="w-3 h-3" />
            <span>Command Center</span>
          </Link>
        </div>
      </div>

      {/* 2. KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard
          title="Active Fires"
          value={activeFiresCount.toString().padStart(2, '0')}
          statusText={criticalFiresCount > 0 ? `${criticalFiresCount} Critical` : 'Monitoring'}
          icon={<Flame className="w-5 h-5" />}
          trend={{ value: '2 hrs ago', isPositive: false }}
        />
        
        <StatCard
          title="Forest Risk"
          value={riskStatusText}
          statusText={`FWI: ${fwi.toFixed(1)}`}
          icon={<AlertTriangle className="w-5 h-5" />}
          trend={{ value: 'Elevated', isPositive: false }}
        />
        
        <StatCard
          title="Deforestation Alerts"
          value={deforestationAlerts.length.toString().padStart(2, '0')}
          statusText="Canopy Loss"
          icon={<TreePine className="w-5 h-5" />}
          trend={{ value: `${deforestationStats.forestLossMonth} km² mo`, isPositive: false }}
        />
        
        <StatCard
          title="Monitored Area"
          value="12,480 km²"
          subtitle="Sentinel-2 grid"
          icon={<Navigation className="w-5 h-5" />}
        />
        
        <StatCard
          title="IoT Nodes"
          value={`${onlineSensors} / ${totalSensors}`}
          statusText={onlineSensors === totalSensors ? 'All Online' : 'Faults Det.'}
          icon={<Radio className="w-5 h-5" />}
        />
        
        <StatCard
          title="AI Confidence"
          value="94.7%"
          subtitle="Model Consensus"
          icon={<Cpu className="w-5 h-5" />}
        />
      </div>

      {/* 3. Map & Decisions Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Interactive Map */}
        <div className="lg:col-span-2 flex flex-col space-y-2">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-bold text-charcoal-400 uppercase tracking-widest">Active GIS Monitoring Map</h3>
            <Link to="/map" className="text-xs text-forest-400 hover:text-forest-300 font-bold flex items-center space-x-1">
              <span>Fullscreen Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <MapPanel height="410px" activeFilter="All" />
        </div>

        {/* AI Decision Timeline */}
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-bold text-charcoal-400 uppercase tracking-widest">AETHER Agent Core Logs</h3>
            <Link to="/settings" className="text-xs text-forest-400 hover:text-forest-300 font-bold flex items-center space-x-1">
              <span>AI Panel</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <GlassCard className="flex-1 flex flex-col justify-between" hoverGlow={false}>
            <div className="flex justify-between items-center border-b border-charcoal-800/60 pb-2 mb-3">
              <span className="text-[10px] font-mono text-charcoal-500 uppercase tracking-wider">PID-4932 Daemon</span>
              <StatusBadge status="Active" />
            </div>

            <div className="flex-1 font-mono text-[10px] text-charcoal-350 space-y-3.5 overflow-y-auto max-h-[300px] pr-1.5 custom-scrollbar">
              {aiDecisions.slice(0, 4).map((dec, i) => (
                <div key={dec.id || i} className="border-l border-charcoal-800 pl-3 relative">
                  <span className="absolute -left-[3.5px] top-1 w-1.5 h-1.5 rounded-full bg-forest-500"></span>
                  <div className="flex justify-between text-charcoal-450 font-bold">
                    <span>{dec.timestamp}</span>
                    <span>{dec.source}</span>
                  </div>
                  <p className="text-white font-semibold mt-0.5">{dec.event}</p>
                  <p className="text-charcoal-400 text-[9px] mt-0.5">{dec.details}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-2 border-t border-charcoal-800/40 text-[9px] text-charcoal-550 font-mono flex justify-between uppercase">
              <span>Target: Autonomous Verification</span>
              <span>Output: Simulated</span>
            </div>
          </GlassCard>
        </div>

      </div>

      {/* 4. Bottom Row: Recent Alerts Table & Environmental Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Alerts List */}
        <GlassCard className="lg:col-span-2 flex flex-col" hoverGlow={false}>
          <div className="flex justify-between items-center pb-2 border-b border-charcoal-800/40 mb-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Active System Alerts</h4>
            <Link to="/alerts" className="text-xs text-forest-400 hover:text-forest-300 font-bold flex items-center space-x-1">
              <span>Alert Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-charcoal-850 text-left text-xs font-mono">
              <thead className="bg-charcoal-950/70 text-charcoal-450 uppercase tracking-widest">
                <tr>
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Location</th>
                  <th className="px-4 py-2">Severity</th>
                  <th className="px-4 py-2">Time</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-900 text-charcoal-300">
                {alerts.slice(0, 4).map((alert) => (
                  <tr key={alert.id} className="hover:bg-charcoal-900/40">
                    <td className="px-4 py-2 font-bold text-white">{alert.id}</td>
                    <td className="px-4 py-2">{alert.type}</td>
                    <td className="px-4 py-2 truncate max-w-[120px]">{alert.location}</td>
                    <td className="px-4 py-2"><StatusBadge status={alert.severity} className="text-[9px]" /></td>
                    <td className="px-4 py-2">{alert.timestamp.substring(11, 19) || alert.timestamp}</td>
                    <td className="px-4 py-2"><StatusBadge status={alert.status} className="text-[9px]" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Environmental Telemetry summary */}
        <GlassCard hoverGlow={false}>
          <div className="flex justify-between items-center pb-2 border-b border-charcoal-800/40 mb-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Environmental Metrics</h4>
            <Link to="/fire-intelligence" className="text-xs text-forest-400 hover:text-forest-300 font-bold flex items-center space-x-1">
              <span>Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3.5 text-xs">
            <div className="bg-charcoal-950/50 p-3 rounded border border-charcoal-850">
              <span className="text-charcoal-500 font-semibold font-mono uppercase tracking-wider block">Temperature</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">{environmentalStats.temperature}°C</span>
            </div>
            <div className="bg-charcoal-950/50 p-3 rounded border border-charcoal-850">
              <span className="text-charcoal-500 font-semibold font-mono uppercase tracking-wider block">Humidity</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">{environmentalStats.humidity}%</span>
            </div>
            <div className="bg-charcoal-950/50 p-3 rounded border border-charcoal-850">
              <span className="text-charcoal-500 font-semibold font-mono uppercase tracking-wider block">Wind Speed</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">{environmentalStats.windSpeed} km/h</span>
            </div>
            <div className="bg-charcoal-950/50 p-3 rounded border border-charcoal-850">
              <span className="text-charcoal-500 font-semibold font-mono uppercase tracking-wider block">Wind Direction</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">{environmentalStats.windDirection}</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-red-950/15 border border-red-900/30 rounded text-center">
            <span className="text-[10px] text-red-400 uppercase tracking-widest font-mono font-bold">Fire Weather Index (FWI)</span>
            <span className="text-2xl font-extrabold font-mono text-red-500 mt-1 block tracking-tight">{environmentalStats.fireWeatherIndex.toFixed(1)}</span>
            <span className="text-[9px] text-charcoal-400 font-mono block mt-1">Extreme spreading potential active</span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Overview;
