import React from 'react';
import ChartCard from '../components/ChartCard';
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area 
} from 'recharts';
import { 
  fireDetectionsOverTime, smokeDetections, tempHumidityTrends, 
  fireRiskTrend, forestLossData, iotNodeAvailability, fireVsRainfall 
} from '../data/analytics';
import { BarChart3, TrendingUp, Calendar, Cpu } from 'lucide-react';

export const Analytics: React.FC = () => {
  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Historical Analytics</h1>
          <p className="text-xs text-charcoal-400 mt-1">Deep analysis of environmental telemetry, fire correlations, and sensor availability logs</p>
        </div>
        
        <div className="flex items-center space-x-2 bg-charcoal-900/65 px-3 py-1.5 rounded border border-charcoal-800 text-xs font-mono select-none">
          <BarChart3 className="w-4 h-4 text-forest-400" />
          <span className="text-white font-bold font-mono">ANALYTICS ENGINE V1.2</span>
        </div>
      </div>

      {/* Grid of 8 charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Fire Detections Over Time */}
        <ChartCard 
          title="Fire Detections Over Time" 
          subtitle="Monthly historical count of active and critical hotspots"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={fireDetectionsOverTime} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#282828" vertical={false} />
              <XAxis dataKey="name" stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
              <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#181818', border: '1px solid #282828', fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="detections" name="Total Fires" fill="#f97316" radius={[2, 2, 0, 0]} />
              <Bar dataKey="critical" name="Critical Incidents" fill="#ef4444" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 2: Smoke Detections */}
        <ChartCard 
          title="Smoke Detections Count" 
          subtitle="Monthly optical plume trigger instances logged by YOLO"
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={smokeDetections} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
              <defs>
                <linearGradient id="colorSmoke" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a4a4a4" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#a4a4a4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#282828" vertical={false} />
              <XAxis dataKey="name" stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
              <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#181818', border: '1px solid #282828', fontSize: 11 }} />
              <Area type="monotone" dataKey="count" name="Plume Counts" stroke="#a4a4a4" strokeWidth={1.8} fillOpacity={1} fill="url(#colorSmoke)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 3: Average Temperature Trends */}
        <ChartCard 
          title="Average Temperature & Humidity" 
          subtitle="Diurnal environmental trends tracked hourly"
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={tempHumidityTrends} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#282828" vertical={false} />
              <XAxis dataKey="time" stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
              <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#181818', border: '1px solid #282828', fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="temp" name="Temperature (°C)" stroke="#f97316" strokeWidth={2} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#3b82f6" strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 4: Fire Risk Trend */}
        <ChartCard 
          title="Fire-Risk Severity Trends" 
          subtitle="Aggregated regional threat levels over time"
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={fireRiskTrend} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#282828" vertical={false} />
              <XAxis dataKey="name" stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
              <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#181818', border: '1px solid #282828', fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Area type="monotone" dataKey="low" name="Low Risk" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
              <Area type="monotone" dataKey="medium" name="Medium Risk" stackId="1" stroke="#eab308" fill="#eab308" fillOpacity={0.1} />
              <Area type="monotone" dataKey="high" name="High Risk" stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.1} />
              <Area type="monotone" dataKey="critical" name="Critical Risk" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 5: Forest Loss */}
        <ChartCard 
          title="Annual Forest Coverage Loss" 
          subtitle="Cumulative deforested area in km² verified via satellite scans"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={forestLossData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#282828" vertical={false} />
              <XAxis dataKey="year" stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
              <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#181818', border: '1px solid #282828', fontSize: 11 }} />
              <Bar dataKey="loss" name="Forest Area Loss (km²)" fill="#27924c" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 6: IoT Node Availability */}
        <ChartCard 
          title="IoT Node Availability" 
          subtitle="Weekly count of online ESP32 sensor hardware units"
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={iotNodeAvailability} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#282828" vertical={false} />
              <XAxis dataKey="day" stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
              <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#181818', border: '1px solid #282828', fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="step" dataKey="online" name="Online Nodes" stroke="#38b261" strokeWidth={2.2} />
              <Line type="step" dataKey="total" name="Total Nodes" stroke="#666" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 7: Fire Detections vs Rainfall */}
        <ChartCard 
          title="Fire Activity vs. Precipitation" 
          subtitle="Hotspot frequency correlated against rain volumes (mm)"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={fireVsRainfall} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#282828" vertical={false} />
              <XAxis dataKey="month" stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
              <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#181818', border: '1px solid #282828', fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="fires" name="Fires Count" fill="#ef4444" radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="rainfall" name="Rainfall (mm)" stroke="#3b82f6" strokeWidth={2.2} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>
    </div>
  );
};

export default Analytics;
