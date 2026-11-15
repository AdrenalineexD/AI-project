import React from 'react';
import { Alert } from '../types';
import { Flame, Cloud, TreePine, AlertTriangle, Cpu, Globe, ArrowRight } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { useDashboard } from '../context/DashboardContext';

interface AlertCardProps {
  alert: Alert;
  onSelect?: (alert: Alert) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert, onSelect }) => {
  const { updateAlertStatus } = useDashboard();

  const getIcon = (type: Alert['type']) => {
    switch (type) {
      case 'Fire':
        return <Flame className="w-5 h-5 text-red-500 animate-pulse" />;
      case 'Smoke':
        return <Cloud className="w-5 h-5 text-orange-400" />;
      case 'Deforestation':
        return <TreePine className="w-5 h-5 text-forest-400" />;
      case 'Environmental Risk':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'Sensor Failure':
        return <Cpu className="w-5 h-5 text-charcoal-400" />;
      case 'Satellite Anomaly':
        return <Globe className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className={`p-4 border bg-charcoal-900/40 border-charcoal-800/80 hover:border-charcoal-700/60 rounded flex flex-col justify-between transition-all duration-200`}>
      <div>
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-charcoal-950 border border-charcoal-800 rounded">
              {getIcon(alert.type)}
            </span>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-semibold text-charcoal-400 font-mono">{alert.id}</span>
                <span className="text-xs text-charcoal-500 font-mono">| {alert.timestamp}</span>
              </div>
              <h4 className="font-semibold text-white text-sm mt-0.5">{alert.type} Alert — {alert.location}</h4>
            </div>
          </div>
          <div className="flex space-x-1.5">
            <StatusBadge status={alert.severity} />
            <StatusBadge status={alert.status} />
          </div>
        </div>
        
        <p className="text-xs text-charcoal-300 mt-3 leading-relaxed">{alert.message}</p>
        
        <div className="mt-2 flex items-center space-x-2">
          <span className="text-[10px] text-charcoal-500 font-mono uppercase">AI Confidence:</span>
          <span className="text-[10px] text-forest-400 font-mono font-semibold">{alert.confidence.toFixed(1)}%</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-charcoal-800/45 flex justify-between items-center">
        {onSelect ? (
          <button 
            onClick={() => onSelect(alert)}
            className="text-xs text-forest-400 hover:text-forest-300 flex items-center space-x-1 font-medium transition-colors"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="w-1" />
        )}

        <div className="flex space-x-2">
          {alert.status === 'New' && (
            <button
              onClick={() => updateAlertStatus(alert.id, 'Investigating')}
              className="px-2.5 py-1 text-[11px] bg-charcoal-800 text-charcoal-200 border border-charcoal-700/60 rounded hover:bg-charcoal-700 hover:text-white transition-all font-semibold"
            >
              Investigate
            </button>
          )}
          {(alert.status === 'New' || alert.status === 'Investigating') && (
            <button
              onClick={() => updateAlertStatus(alert.id, 'Confirmed')}
              className="px-2.5 py-1 text-[11px] bg-red-950/45 text-red-400 border border-red-900/50 rounded hover:bg-red-900/40 hover:text-red-300 transition-all font-semibold"
            >
              Confirm
            </button>
          )}
          {alert.status !== 'Resolved' && (
            <button
              onClick={() => updateAlertStatus(alert.id, 'Resolved')}
              className="px-2.5 py-1 text-[11px] bg-forest-950/40 text-forest-400 border border-forest-800/55 rounded hover:bg-forest-900/40 hover:text-forest-300 transition-all font-semibold"
            >
              Resolve
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertCard;
