import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import GlassCard from '../components/GlassCard';
import ChartCard from '../components/ChartCard';
import StatusBadge from '../components/StatusBadge';
import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts';
import { fireRiskTrend } from '../data/analytics';
import { Flame, Wind, Thermometer, Droplets, CloudRain, AlertTriangle, ShieldAlert } from 'lucide-react';

export const FireIntelligence: React.FC = () => {
  const { fires, environmentalStats } = useDashboard();

  // Metrics calculation
  const activeCount = fires.filter(f => f.status === 'Active').length;
  const criticalCount = fires.filter(f => f.status === 'Active' && f.riskLevel === 'Critical').length;
  const averageConfidence = fires.length > 0
    ? (fires.reduce((acc, f) => acc + f.confidence, 0) / fires.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Wildfire Risk Intelligence</h1>
        <p className="text-xs text-charcoal-400 mt-1">Pre-wildfire index forecasting, spreading predictors, and climate metrics</p>
      </div>

      {/* Grid: Statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="flex items-center space-x-4" hoverGlow={false}>
          <div className="p-3 bg-red-950 text-red-400 border border-red-900 rounded">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] text-charcoal-400 uppercase tracking-widest font-bold font-mono">Active Incidents</p>
            <p className="text-2xl font-bold text-white font-mono mt-0.5">{activeCount}</p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center space-x-4" hoverGlow={false}>
          <div className="p-3 bg-orange-950 text-orange-400 border border-orange-900 rounded">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-charcoal-400 uppercase tracking-widest font-bold font-mono">Critical Fires</p>
            <p className="text-2xl font-bold text-white font-mono mt-0.5">{criticalCount}</p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center space-x-4" hoverGlow={false}>
          <div className="p-3 bg-charcoal-850 text-white border border-charcoal-750 rounded">
            <ShieldAlert className="w-5 h-5 text-forest-400 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] text-charcoal-400 uppercase tracking-widest font-bold font-mono">Avg Confidence</p>
            <p className="text-2xl font-bold text-white font-mono mt-0.5">{averageConfidence}%</p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center space-x-4" hoverGlow={false}>
          <div className="p-3 bg-amber-950 text-amber-400 border border-amber-900 rounded">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-charcoal-400 uppercase tracking-widest font-bold font-mono">Fires Detected Today</p>
            <p className="text-2xl font-bold text-white font-mono mt-0.5">02</p>
          </div>
        </GlassCard>
      </div>

      {/* Grid: Charts & Environmental conditions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Fire Risk Historical chart */}
        <div className="lg:col-span-2">
          <ChartCard 
            title="Historical Fire Risk Indices" 
            subtitle="Incident severity counts over the last 5 weeks"
          >
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={fireRiskTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#282828" vertical={false} />
                <XAxis dataKey="name" stroke="#666666" tick={{ fill: '#888888', fontSize: 10 }} />
                <YAxis stroke="#666666" tick={{ fill: '#888888', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#181818', border: '1px solid #282828', fontSize: 11, borderRadius: 4 }}
                  labelStyle={{ fontWeight: 'bold', color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Area type="monotone" dataKey="low" name="Low Risk" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLow)" />
                <Area type="monotone" dataKey="medium" name="Medium Risk" stroke="#eab308" fillOpacity={1} fill="url(#colorMedium)" />
                <Area type="monotone" dataKey="high" name="High Risk" stroke="#f97316" fillOpacity={1} fill="url(#colorHigh)" />
                <Area type="monotone" dataKey="critical" name="Critical Risk" stroke="#ef4444" fillOpacity={1} fill="url(#colorCritical)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Environmental conditions summary */}
        <GlassCard hoverGlow={false} className="flex flex-col justify-between">
          <div className="pb-2 border-b border-charcoal-800/40 mb-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Environmental Sensors</h4>
            <p className="text-[10px] text-charcoal-450 font-mono mt-0.5">Atmospheric Telemetry Fusions</p>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-2 border-b border-charcoal-900">
              <div className="flex items-center space-x-2 text-orange-400">
                <Thermometer className="w-4 h-4" />
                <span className="text-white">Temperature</span>
              </div>
              <span className="font-bold text-white">{environmentalStats.temperature}°C</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-charcoal-900">
              <div className="flex items-center space-x-2 text-blue-400">
                <Droplets className="w-4 h-4" />
                <span className="text-white">Humidity</span>
              </div>
              <span className="font-bold text-white">{environmentalStats.humidity}%</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-charcoal-900">
              <div className="flex items-center space-x-2 text-forest-400">
                <Wind className="w-4 h-4" />
                <span className="text-white">Wind Speed</span>
              </div>
              <span className="font-bold text-white">{environmentalStats.windSpeed} km/h</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-charcoal-900">
              <div className="flex items-center space-x-2 text-forest-400">
                <Wind className="w-4 h-4" />
                <span className="text-white">Wind Direction</span>
              </div>
              <span className="font-bold text-white">{environmentalStats.windDirection}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-charcoal-900">
              <div className="flex items-center space-x-2 text-blue-300">
                <CloudRain className="w-4 h-4" />
                <span className="text-white">Rainfall</span>
              </div>
              <span className="font-bold text-white">{environmentalStats.rainfallMm} mm</span>
            </div>

            <div className="flex justify-between items-center py-2 text-red-400 font-bold">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="">Fire Weather Index</span>
              </div>
              <span>{environmentalStats.fireWeatherIndex.toFixed(1)}</span>
            </div>
          </div>

          <div className="mt-4 p-2 bg-charcoal-950 rounded border border-charcoal-850 font-mono text-[9px] text-charcoal-500 text-center select-none">
            DATA RETRIEVED FROM ESP32 NODES ALPHA/BETA
          </div>
        </GlassCard>
      </div>

      {/* Model Spread Predictions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 24 Hour spread prediction */}
        <GlassCard className="flex flex-col justify-between p-5 border-charcoal-800 bg-charcoal-900/40" hoverGlow={true}>
          <div>
            <div className="flex justify-between items-start pb-2 border-b border-charcoal-850 mb-3.5">
              <div>
                <h4 className="font-bold text-xs uppercase text-white font-mono">24-Hour Spread Prediction</h4>
                <p className="text-[9px] text-charcoal-550 font-mono mt-0.5">LSTM Recurrent Neural Networks</p>
              </div>
              <span className="px-2 py-0.5 bg-yellow-950/30 text-yellow-400 border border-yellow-800/40 rounded text-[9px] font-mono font-bold uppercase">MODEL: CNN + LSTM</span>
            </div>
            
            <p className="text-xs text-charcoal-300 leading-relaxed font-mono">
              Prediction vector indicates high spreading probability (rate: +0.4 km²/hr) along the northwest perimeter. High wind speed vectors and sparse fuel-moisture layers in Sector G will escalate warning flags.
            </p>
          </div>

          <div className="mt-4 pt-3.5 border-t border-charcoal-850 flex justify-between items-center font-mono text-[9px] text-charcoal-500 select-none">
            <span>MODEL NOT CONNECTED — DEMO DATA</span>
            <span>ACCURACY PROFILE: 88.4%</span>
          </div>
        </GlassCard>

        {/* 72 Hour spread prediction */}
        <GlassCard className="flex flex-col justify-between p-5 border-charcoal-800 bg-charcoal-900/40" hoverGlow={true}>
          <div>
            <div className="flex justify-between items-start pb-2 border-b border-charcoal-850 mb-3.5">
              <div>
                <h4 className="font-bold text-xs uppercase text-white font-mono">72-Hour Spread Prediction</h4>
                <p className="text-[9px] text-charcoal-550 font-mono mt-0.5">Atmospheric Attention Transformer</p>
              </div>
              <span className="px-2 py-0.5 bg-yellow-950/30 text-yellow-400 border border-yellow-800/40 rounded text-[9px] font-mono font-bold uppercase">MODEL: TRANSFORMER</span>
            </div>

            <p className="text-xs text-charcoal-300 leading-relaxed font-mono">
              Extended prediction indicates moderate fire front confinement by August 18 due to forecast relative humidity increases to 45%. Major threat remains in low-elevation fuel dense pockets.
            </p>
          </div>

          <div className="mt-4 pt-3.5 border-t border-charcoal-850 flex justify-between items-center font-mono text-[9px] text-charcoal-500 select-none">
            <span>MODEL NOT CONNECTED — DEMO DATA</span>
            <span>ACCURACY PROFILE: 81.2%</span>
          </div>
        </GlassCard>

      </div>
    </div>
  );
};

export default FireIntelligence;
