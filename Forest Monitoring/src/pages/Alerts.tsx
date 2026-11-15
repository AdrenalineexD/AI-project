import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import AlertCard from '../components/AlertCard';
import StatusBadge from '../components/StatusBadge';
import GlassCard from '../components/GlassCard';
import { Search, ShieldAlert, CheckCircle, Navigation, Radio, Terminal, X } from 'lucide-react';
import { Alert } from '../types';

export const Alerts: React.FC = () => {
  const { alerts, updateAlertStatus } = useDashboard();
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(alerts[0] || null);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Filter handlers
  const filteredAlerts = alerts.filter((a) => {
    const matchesSearch = 
      a.id.toLowerCase().includes(search.toLowerCase()) ||
      a.location.toLowerCase().includes(search.toLowerCase()) ||
      a.message.toLowerCase().includes(search.toLowerCase());
      
    const matchesSeverity = severityFilter === 'All' || a.severity === severityFilter;
    const matchesCategory = categoryFilter === 'All' || a.type === categoryFilter;

    return matchesSearch && matchesSeverity && matchesCategory;
  });

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'Fire': return '🔥';
      case 'Smoke': return '🌫';
      case 'Deforestation': return '🌳';
      case 'Environmental Risk': return '🌡';
      case 'Sensor Failure': return '⚠';
      case 'Satellite Anomaly': return '🛰';
      default: return '●';
    }
  };

  const getActionLog = (alert: Alert) => {
    switch (alert.status) {
      case 'New':
        return [
          { time: alert.timestamp, event: 'Alert registered on dispatch stream' },
          { time: alert.timestamp, event: 'AI confidence evaluated' }
        ];
      case 'Investigating':
        return [
          { time: alert.timestamp, event: 'Alert registered on dispatch stream' },
          { time: 'Just now', event: 'Operator flagged for active inspection' }
        ];
      case 'Confirmed':
        return [
          { time: alert.timestamp, event: 'Alert registered on dispatch stream' },
          { time: 'Moments ago', event: 'Active inspection validated by operator' },
          { time: 'Just now', event: 'Confirmed hazard. Ground notification sent' }
        ];
      case 'Resolved':
        return [
          { time: alert.timestamp, event: 'Alert registered on dispatch stream' },
          { time: 'Earlier', event: 'Confirmed hazard. Incident logged' },
          { time: 'Just now', event: 'Mitigation completed. Resolved state signed' }
        ];
      default:
        return [];
    }
  };

  return (
    <div className="h-[85vh] flex flex-col space-y-4">
      
      {/* Search and filter controls bar */}
      <div className="bg-charcoal-900/60 p-3.5 border border-charcoal-800 rounded flex flex-col xl:flex-row xl:items-center justify-between gap-4 font-mono">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search bar */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-charcoal-450" />
            <input
              type="text"
              placeholder="Search alert database..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-charcoal-950 border border-charcoal-800 rounded pl-9 pr-4 py-2 text-xs text-white placeholder-charcoal-500 focus:outline-none"
            />
          </div>

          {/* Category Filter dropdown */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-charcoal-450">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-charcoal-950 border border-charcoal-800 rounded px-2 py-1 text-xs text-white focus:outline-none"
            >
              <option value="All">All Categories</option>
              <option value="Fire">Fire</option>
              <option value="Smoke">Smoke</option>
              <option value="Deforestation">Deforestation</option>
              <option value="Environmental Risk">Environmental Risk</option>
              <option value="Sensor Failure">Sensor Failure</option>
              <option value="Satellite Anomaly">Satellite Anomaly</option>
            </select>
          </div>

          {/* Severity Filter dropdown */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-charcoal-450">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-charcoal-950 border border-charcoal-800 rounded px-2 py-1 text-xs text-white focus:outline-none"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        <div className="text-right text-[10px] text-charcoal-500 uppercase">
          Displaying {filteredAlerts.length} matching logs
        </div>
      </div>

      {/* Main split-pane */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        
        {/* Left pane: Alert Cards List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1.5 custom-scrollbar h-full min-h-[300px]">
          {filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onSelect={(alt) => setSelectedAlert(alt)}
            />
          ))}
          {filteredAlerts.length === 0 && (
            <div className="text-center text-charcoal-500 py-16">
              No matching alerts currently logged.
            </div>
          )}
        </div>

        {/* Right pane: Inspection Dashboard */}
        <GlassCard className="w-full lg:w-[420px] h-full flex flex-col min-h-0 overflow-hidden" hoverGlow={false}>
          {selectedAlert ? (
            <div className="flex-1 flex flex-col justify-between h-full">
              
              {/* Header inspect */}
              <div>
                <div className="flex justify-between items-center pb-3.5 border-b border-charcoal-800/80 mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getAlertIcon(selectedAlert.type)}</span>
                    <div>
                      <h4 className="font-bold text-white text-sm font-mono">{selectedAlert.id}</h4>
                      <p className="text-[10px] text-charcoal-450 font-mono">Triage Analysis Panel</p>
                    </div>
                  </div>
                  <div className="flex space-x-1.5">
                    <StatusBadge status={selectedAlert.severity} />
                    <StatusBadge status={selectedAlert.status} />
                  </div>
                </div>

                {/* Inspect Details */}
                <div className="space-y-4 font-mono text-[11px] leading-relaxed">
                  <div>
                    <span className="text-charcoal-550 block font-bold uppercase tracking-wider text-[9px]">Sensor location</span>
                    <span className="text-white mt-1 block font-semibold">{selectedAlert.location}</span>
                  </div>

                  <div>
                    <span className="text-charcoal-550 block font-bold uppercase tracking-wider text-[9px]">Timestamp</span>
                    <span className="text-white mt-1 block">{selectedAlert.timestamp}</span>
                  </div>

                  <div>
                    <span className="text-charcoal-550 block font-bold uppercase tracking-wider text-[9px]">AI Confidence Rating</span>
                    <span className="text-forest-400 font-bold block mt-1">{selectedAlert.confidence.toFixed(1)}%</span>
                  </div>

                  <div>
                    <span className="text-charcoal-550 block font-bold uppercase tracking-wider text-[9px]">Hazard description</span>
                    <p className="text-charcoal-300 mt-1.5 leading-normal bg-charcoal-950 p-2.5 rounded border border-charcoal-850">
                      {selectedAlert.message}
                    </p>
                  </div>
                </div>

                {/* Simulated Audit Trail */}
                <div className="mt-5 space-y-2">
                  <span className="text-charcoal-550 block font-bold font-mono uppercase tracking-wider text-[9px]">System Audit Trail</span>
                  <div className="bg-charcoal-950/40 border border-charcoal-800 p-2.5 rounded font-mono text-[10px] space-y-1.5 max-h-[140px] overflow-y-auto">
                    {getActionLog(selectedAlert).map((log, index) => (
                      <div key={index} className="flex justify-between text-charcoal-400">
                        <span className="text-charcoal-500 font-bold">{log.time.substring(11, 19) || log.time}</span>
                        <span className="truncate ml-2">{log.event}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions footer */}
              <div className="mt-6 pt-3.5 border-t border-charcoal-800/80 space-y-2 font-mono">
                <p className="text-[9px] text-charcoal-550 text-center uppercase tracking-widest font-bold">Operator Triage Directives</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      updateAlertStatus(selectedAlert.id, 'Investigating');
                      setSelectedAlert(prev => prev ? { ...prev, status: 'Investigating' } : null);
                    }}
                    disabled={selectedAlert.status === 'Resolved' || selectedAlert.status === 'Confirmed'}
                    className="py-2 text-[10px] bg-charcoal-800 text-charcoal-200 border border-charcoal-700/60 rounded hover:bg-charcoal-700 hover:text-white font-bold transition-all disabled:opacity-30 disabled:pointer-events-none"
                  >
                    Investigate
                  </button>

                  <button
                    onClick={() => {
                      updateAlertStatus(selectedAlert.id, 'Confirmed');
                      setSelectedAlert(prev => prev ? { ...prev, status: 'Confirmed' } : null);
                    }}
                    disabled={selectedAlert.status === 'Resolved'}
                    className="py-2 text-[10px] bg-red-950/45 text-red-400 border border-red-900/50 rounded hover:bg-red-900/40 hover:text-red-300 font-bold transition-all disabled:opacity-30 disabled:pointer-events-none"
                  >
                    Confirm
                  </button>

                  <button
                    onClick={() => {
                      updateAlertStatus(selectedAlert.id, 'Resolved');
                      setSelectedAlert(prev => prev ? { ...prev, status: 'Resolved' } : null);
                    }}
                    className="py-2 text-[10px] bg-forest-950/40 text-forest-400 border border-forest-800/55 rounded hover:bg-forest-900/40 hover:text-forest-300 font-bold transition-all"
                  >
                    Resolve
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center font-mono text-xs text-charcoal-500 py-10">
              <Terminal className="w-8 h-8 text-charcoal-600 mb-2 animate-pulse" />
              <span>Select an alert node from the triage log to inspect telemetry logs.</span>
            </div>
          )}
        </GlassCard>

      </div>
    </div>
  );
};

export default Alerts;
