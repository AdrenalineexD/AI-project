import React from 'react';
import { SensorNode } from '../types';
import { Battery, BatteryLow, BatteryWarning, Wifi, WifiOff, Thermometer, Droplets, ShieldAlert, Cpu } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { useDashboard } from '../context/DashboardContext';

interface SensorCardProps {
  sensor: SensorNode;
  onViewHistory?: (sensor: SensorNode) => void;
}

export const SensorCard: React.FC<SensorCardProps> = ({ sensor, onViewHistory }) => {
  const { toggleSensorStatus } = useDashboard();

  const getBatteryIcon = (level: number) => {
    if (level < 20) return <BatteryWarning className="w-4 h-4 text-red-500 animate-bounce" />;
    if (level < 50) return <BatteryLow className="w-4 h-4 text-orange-400" />;
    return <Battery className="w-4 h-4 text-emerald-400" />;
  };

  const getSignalStrengthColor = (strength: SensorNode['signalStrength']) => {
    switch (strength) {
      case 'Excellent': return 'text-emerald-400';
      case 'Good': return 'text-forest-400';
      case 'Fair': return 'text-yellow-400';
      case 'Poor': return 'text-red-400';
    }
  };

  return (
    <div className={`p-4 border rounded bg-charcoal-900/40 border-charcoal-800/80 transition-all duration-200 ${sensor.connectivity === 'Offline' ? 'opacity-60 border-red-950/40' : 'hover:border-charcoal-700/60'}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-charcoal-950 border border-charcoal-800 rounded text-forest-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm font-mono">{sensor.id}</h4>
            <p className="text-[11px] text-charcoal-400">{sensor.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5">
          <StatusBadge status={sensor.connectivity} />
        </div>
      </div>

      <p className="text-xs text-charcoal-400 mt-2 font-medium">{sensor.location}</p>

      {/* Grid of Telemetry values */}
      <div className="grid grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-charcoal-800/40">
        <div className="flex items-center space-x-2 bg-charcoal-950/40 p-2 rounded border border-charcoal-850">
          <Thermometer className="w-4 h-4 text-orange-400" />
          <div>
            <p className="text-[10px] text-charcoal-500 font-semibold uppercase">Temp</p>
            <p className="text-sm font-bold text-white font-mono">{sensor.connectivity === 'Online' ? `${sensor.temperature}°C` : '--'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-charcoal-950/40 p-2 rounded border border-charcoal-850">
          <Droplets className="w-4 h-4 text-blue-400" />
          <div>
            <p className="text-[10px] text-charcoal-500 font-semibold uppercase">Humidity</p>
            <p className="text-sm font-bold text-white font-mono">{sensor.connectivity === 'Online' ? `${sensor.humidity}%` : '--'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-charcoal-950/40 p-2 rounded border border-charcoal-850">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <div>
            <p className="text-[10px] text-charcoal-500 font-semibold uppercase">Smoke</p>
            <p className={`text-xs font-bold font-mono ${sensor.smokeLevel === 'High' ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
              {sensor.connectivity === 'Online' ? sensor.smokeLevel : '--'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-charcoal-950/40 p-2 rounded border border-charcoal-850">
          {sensor.connectivity === 'Online' ? (
            <Wifi className={`w-4 h-4 ${getSignalStrengthColor(sensor.signalStrength)}`} />
          ) : (
            <WifiOff className="w-4 h-4 text-charcoal-500" />
          )}
          <div>
            <p className="text-[10px] text-charcoal-500 font-semibold uppercase">Signal</p>
            <p className="text-xs font-bold text-white font-mono">{sensor.connectivity === 'Online' ? sensor.signalStrength : 'None'}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-2 border-t border-charcoal-800/40 flex justify-between items-center text-[10px] text-charcoal-500 font-mono">
        <div className="flex items-center space-x-1">
          {getBatteryIcon(sensor.batteryLevel)}
          <span className="font-semibold">{sensor.batteryLevel}%</span>
        </div>
        <div>
          <span>Updated: {sensor.lastUpdated}</span>
        </div>
      </div>

      <div className="mt-3 flex space-x-2">
        {onViewHistory && sensor.connectivity === 'Online' && (
          <button
            onClick={() => onViewHistory(sensor)}
            className="flex-1 px-2.5 py-1 text-xs bg-charcoal-800 text-charcoal-200 border border-charcoal-700/60 rounded hover:bg-charcoal-700 hover:text-white font-semibold transition-colors"
          >
            History & Diagnostics
          </button>
        )}
        <button
          onClick={() => toggleSensorStatus(sensor.id)}
          className={`px-2 py-1 text-xs border rounded font-semibold transition-all ${
            sensor.connectivity === 'Online'
              ? 'border-red-950/45 text-red-400 bg-red-950/10 hover:bg-red-950/30'
              : 'border-forest-800/50 text-forest-400 bg-forest-950/10 hover:bg-forest-950/30'
          }`}
        >
          {sensor.connectivity === 'Online' ? 'Simulate Fault' : 'Reconnect Node'}
        </button>
      </div>
    </div>
  );
};

export default SensorCard;
