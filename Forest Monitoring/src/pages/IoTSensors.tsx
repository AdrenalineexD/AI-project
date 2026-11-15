import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import SensorCard from '../components/SensorCard';
import GlassCard from '../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Radio, Battery, Wifi, Flame, Thermometer, Droplets, X } from 'lucide-react';
import { SensorNode } from '../types';

export const IoTSensors: React.FC = () => {
  const { sensors } = useDashboard();
  const [selectedNode, setSelectedNode] = useState<SensorNode | null>(null);

  const onlineNodes = sensors.filter(s => s.connectivity === 'Online').length;
  const totalNodes = sensors.length;

  // Mock historical diagnostics data for selected node modal
  const mockHistoricalData = [
    { time: '18:00', temp: 31.4, humidity: 44, battery: 89 },
    { time: '18:10', temp: 32.1, humidity: 43, battery: 88 },
    { time: '18:20', temp: 33.5, humidity: 42, battery: 88 },
    { time: '18:30', temp: 34.6, humidity: 41, battery: 87 },
    { time: '18:40', temp: 35.8, humidity: 39, battery: 87 },
    { time: '18:50', temp: 37.9, humidity: 28, battery: 86 }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">IoT Telemetry Grid</h1>
          <p className="text-xs text-charcoal-400 mt-1">Distributed ESP32 hardware node metrics and battery diagnostics</p>
        </div>
        <div className="flex items-center space-x-2 bg-charcoal-900/60 border border-charcoal-800/80 px-3 py-1 rounded text-xs font-mono select-none">
          <Radio className="w-4 h-4 text-forest-400 animate-pulse" />
          <span className="text-charcoal-400">NETWORK UPTIME:</span>
          <span className="font-bold text-white font-mono">{((onlineNodes / totalNodes) * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Network Overview Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard hoverGlow={false} className="flex justify-between items-center">
          <div>
            <p className="text-[10px] text-charcoal-450 uppercase font-mono font-bold tracking-wider">Nodes Connected</p>
            <h3 className="text-2xl font-bold text-white font-mono mt-1">{onlineNodes} / {totalNodes}</h3>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 uppercase">
            Active Grid
          </span>
        </GlassCard>

        <GlassCard hoverGlow={false} className="flex justify-between items-center">
          <div>
            <p className="text-[10px] text-charcoal-450 uppercase font-mono font-bold tracking-wider">Average Temp</p>
            <h3 className="text-2xl font-bold text-white font-mono mt-1">32.3°C</h3>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-950/45 text-orange-400 border border-orange-850/40 uppercase">
            Thermal Ok
          </span>
        </GlassCard>

        <GlassCard hoverGlow={false} className="flex justify-between items-center">
          <div>
            <p className="text-[10px] text-charcoal-450 uppercase font-mono font-bold tracking-wider">Grid Battery State</p>
            <h3 className="text-2xl font-bold text-white font-mono mt-1">66.6%</h3>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950/30 text-blue-400 border border-blue-800/30 uppercase font-bold">
            Solar Powered
          </span>
        </GlassCard>
      </div>

      {/* Sensor Nodes Grid */}
      <div>
        <div className="flex justify-between items-center pb-2 border-b border-charcoal-800 mb-4 px-1">
          <h3 className="text-xs font-bold text-charcoal-450 uppercase tracking-widest font-mono">ESP32 Node Directory</h3>
          <span className="text-[9px] font-mono text-charcoal-550 uppercase">SIMULATED ESP32 DATA</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sensors.map((sensor) => (
            <SensorCard 
              key={sensor.id} 
              sensor={sensor} 
              onViewHistory={(node) => setSelectedNode(node)} 
            />
          ))}
        </div>
      </div>

      {/* Node diagnostics detail modal */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/85 backdrop-blur-sm cursor-pointer"
            onClick={() => setSelectedNode(null)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-2xl bg-charcoal-900 border border-charcoal-800 rounded shadow-2xl overflow-hidden flex flex-col font-mono">
            {/* Header */}
            <div className="px-5 py-4 border-b border-charcoal-800 flex justify-between items-center">
              <div className="flex items-center space-x-2.5">
                <Radio className="w-5 h-5 text-forest-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">{selectedNode.id} — Diagnostics Summary</h3>
                  <p className="text-[10px] text-charcoal-400">{selectedNode.name} // {selectedNode.location}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="p-1 bg-charcoal-950/40 hover:bg-charcoal-800 rounded text-charcoal-450 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
              
              {/* Telemetry row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="bg-charcoal-950 p-3 rounded border border-charcoal-800 text-center">
                  <span className="text-charcoal-550 block font-bold text-[9px] uppercase">Temperature</span>
                  <span className="text-lg font-bold text-white block mt-1">{selectedNode.temperature}°C</span>
                </div>
                <div className="bg-charcoal-950 p-3 rounded border border-charcoal-800 text-center">
                  <span className="text-charcoal-550 block font-bold text-[9px] uppercase">Humidity</span>
                  <span className="text-lg font-bold text-white block mt-1">{selectedNode.humidity}%</span>
                </div>
                <div className="bg-charcoal-950 p-3 rounded border border-charcoal-800 text-center">
                  <span className="text-charcoal-550 block font-bold text-[9px] uppercase">Battery level</span>
                  <span className="text-lg font-bold text-white block mt-1">{selectedNode.batteryLevel}%</span>
                </div>
                <div className="bg-charcoal-950 p-3 rounded border border-charcoal-800 text-center">
                  <span className="text-charcoal-550 block font-bold text-[9px] uppercase">Signal Strength</span>
                  <span className="text-lg font-bold text-white block mt-1">{selectedNode.signalStrength}</span>
                </div>
              </div>

              {/* Recharts chart */}
              <div className="border border-charcoal-800 rounded p-4 bg-charcoal-950/30">
                <h4 className="text-xs font-semibold text-charcoal-450 uppercase mb-4 tracking-wider">1-Hour Telemetry Trend Line</h4>
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mockHistoricalData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#282828" vertical={false} />
                      <XAxis dataKey="time" stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
                      <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#181818', border: '1px solid #282828', fontSize: 11 }}
                        labelStyle={{ color: '#aaa', fontWeight: 'bold' }}
                      />
                      <Line type="monotone" dataKey="temp" name="Temperature (°C)" stroke="#f97316" strokeWidth={2} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#3b82f6" strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Hardware diagnostics */}
              <div className="space-y-2 text-[11px] text-charcoal-350">
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Hardware Logs</h4>
                <div className="bg-charcoal-950 p-3 rounded border border-charcoal-800 font-mono space-y-1 text-charcoal-400">
                  <p><span className="text-emerald-500">[OK]</span> WiFi RSSI: -42dBm (Signal excellent)</p>
                  <p><span className="text-emerald-500">[OK]</span> DHT22 Sensor initialization successful</p>
                  <p><span className="text-emerald-500">[OK]</span> MQ-2 gas calibration completed: baseline 120ppm</p>
                  <p><span className="text-emerald-500">[OK]</span> Battery solar charger online. Input power: 1.2W</p>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="bg-charcoal-950 border-t border-charcoal-800 px-5 py-3 flex justify-between items-center text-[10px] text-charcoal-500">
              <span>LAT: {selectedNode.latitude.toFixed(4)} N // LON: {selectedNode.longitude.toFixed(4)} E</span>
              <span>Hardware: ESP32-WROOM-32D</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default IoTSensors;
