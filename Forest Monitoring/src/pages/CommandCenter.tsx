import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Wifi, WifiOff, AlertTriangle, CheckCircle2, Clock,
  MapPin, Crosshair, Flame, Wind, Eye, Send, RefreshCw, Zap,
  Shield, ChevronRight, Circle, Radio
} from 'lucide-react';
import type {
  Incident, BEDetection, BEAlert, AuditEntry, WSMessage, SeverityLevel
} from '../types/backend';
import { DetectionOverlay } from '../components/DetectionOverlay';

const WS_URL = '/ws';
const API_URL = 'http://localhost:8000';

const SEV_COLORS: Record<SeverityLevel, string> = {
  0: '#3a3f4b', 1: '#4b6b8a', 2: '#c9a227',
  3: '#e07b2b', 4: '#c0392b', 5: '#ff2d2d',
};

const SEV_LABELS: Record<SeverityLevel, string> = {
  0: 'NORMAL', 1: 'OBSERVATION', 2: 'PERSISTENT',
  3: 'POTENTIAL', 4: 'VERIFIED', 5: 'EMERGENCY',
};

function SeverityBadge({ level }: { level: SeverityLevel }) {
  const color = SEV_COLORS[level];
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono border"
      style={{ color, borderColor: color + '55', background: color + '18' }}
    >
      {SEV_LABELS[level]}
    </span>
  );
}

function ConnectionStatus({ connected }: { connected: boolean }) {
  return (
    <div className={`flex items-center space-x-2 px-3 py-1.5 rounded border text-xs font-mono font-bold
      ${connected
        ? 'bg-emerald-950/50 border-emerald-800/50 text-emerald-400'
        : 'bg-red-950/50 border-red-800/50 text-red-400'}`}>
      {connected ? (
        <><Wifi className="w-3.5 h-3.5" /><span>BACKEND LIVE</span></>
      ) : (
        <><WifiOff className="w-3.5 h-3.5" /><span>BACKEND OFFLINE</span></>
      )}
    </div>
  );
}

function IncidentCard({ incident, onSelect }: { incident: Incident; onSelect: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="border border-charcoal-800 rounded p-3 bg-charcoal-900/60 hover:border-charcoal-700 cursor-pointer transition-all group"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <Flame
            className="w-3.5 h-3.5 flex-shrink-0"
            style={{ color: SEV_COLORS[incident.severity] }}
          />
          <span className="text-xs font-mono text-charcoal-300 truncate">{incident.id}</span>
        </div>
        <SeverityBadge level={incident.severity} />
      </div>

      <div className="mt-2 flex items-center space-x-1.5 text-[10px] text-charcoal-400 font-mono">
        <MapPin className="w-3 h-3" />
        <span>{incident.location.lat.toFixed(4)}, {incident.location.lon.toFixed(4)}</span>
      </div>

      <div className="mt-1.5 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-[10px] text-charcoal-500">
          <span className="uppercase font-mono">{incident.state}</span>
          <span>·</span>
          <span>{(incident.confidence * 100).toFixed(0)}% conf</span>
        </div>
        <ChevronRight className="w-3 h-3 text-charcoal-600 group-hover:text-charcoal-400 transition-colors" />
      </div>
    </motion.div>
  );
}

function IncidentDetail({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-full overflow-y-auto space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white font-mono">{incident.id}</h3>
        <button
          onClick={onClose}
          className="text-xs text-charcoal-500 hover:text-white transition-colors px-2 py-1 border border-charcoal-800 rounded"
        >
          ← Back
        </button>
      </div>

      <div className="p-3 border border-charcoal-800 rounded bg-charcoal-950/50 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div><span className="text-charcoal-500">State: </span><span className="text-white">{incident.state}</span></div>
          <div><span className="text-charcoal-500">Class: </span><span className="text-orange-400">{incident.primary_class.toUpperCase()}</span></div>
          <div><span className="text-charcoal-500">Confidence: </span><span className="text-white">{(incident.confidence * 100).toFixed(1)}%</span></div>
          <div><span className="text-charcoal-500">Severity: </span><SeverityBadge level={incident.severity} /></div>
        </div>
        <div className="text-[10px] font-mono text-charcoal-400">
          <span className="text-charcoal-500">Location: </span>
          {incident.location.lat.toFixed(5)}, {incident.location.lon.toFixed(5)}
        </div>
        {incident.ai_summary && (
          <div className="mt-2 p-2 bg-forest-950/40 border border-forest-800/30 rounded text-[10px] text-emerald-300 leading-relaxed">
            <span className="text-emerald-500 font-bold">AI SUMMARY: </span>{incident.ai_summary}
          </div>
        )}
      </div>

      {/* Timeline */}
      {incident.timeline.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-charcoal-500 uppercase tracking-widest font-mono font-bold">Timeline</p>
          {incident.timeline.slice(-8).map((e, i) => (
            <div key={i} className="flex items-start space-x-2 text-[10px] font-mono">
              <Circle className="w-2 h-2 mt-1 text-forest-500 flex-shrink-0" />
              <div>
                <span className="text-charcoal-400">{new Date(e.ts).toLocaleTimeString()} </span>
                <span className="text-white">{e.event}</span>
                {e.detail && <div className="text-charcoal-500 mt-0.5">{e.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Checklist */}
      {incident.checklist.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-charcoal-500 uppercase tracking-widest font-mono font-bold">Checklist</p>
          {incident.checklist.map((item) => (
            <div key={item.key} className={`flex items-center space-x-2 text-[10px] font-mono ${item.done ? 'text-emerald-400' : 'text-charcoal-400'}`}>
              {item.done ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function DetectionFeed({ detections }: { detections: BEDetection[] }) {
  return (
    <div className="space-y-1.5 max-h-64 overflow-y-auto">
      <AnimatePresence initial={false}>
        {detections.slice(0, 20).map((d) => (
          <motion.div
            key={d.id}
            layout
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center space-x-2 py-1 border-b border-charcoal-800/50 text-[10px] font-mono"
          >
            <Crosshair
              className="w-3 h-3 flex-shrink-0"
              style={{ color: d.class === 'fire' ? '#ff3300' : d.class === 'smoke' ? '#ffaa00' : '#6ab0ff' }}
            />
            <span className="uppercase text-charcoal-300 w-14 flex-shrink-0">{d.class}</span>
            <span className="text-charcoal-500">{(d.confidence * 100).toFixed(0)}%</span>
            <span className="text-charcoal-600 flex-1 truncate">{d.source_id}</span>
            <span className="text-charcoal-600">{new Date(d.ts).toLocaleTimeString()}</span>
          </motion.div>
        ))}
      </AnimatePresence>
      {detections.length === 0 && (
        <div className="text-[10px] text-charcoal-600 font-mono text-center py-4">
          No detections yet — backend offline or awaiting frames
        </div>
      )}
    </div>
  );
}

function AlertFeed({ alerts }: { alerts: BEAlert[] }) {
  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto">
      <AnimatePresence initial={false}>
        {alerts.slice(0, 10).map((a) => (
          <motion.div
            key={a.id}
            layout
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-2 rounded border text-[10px] font-mono
              ${a.priority === 'CRITICAL' ? 'bg-red-950/50 border-red-800/60 text-red-300' :
                a.priority === 'HIGH' ? 'bg-orange-950/50 border-orange-800/50 text-orange-300' :
                a.priority === 'WARNING' ? 'bg-yellow-950/50 border-yellow-800/40 text-yellow-300' :
                'bg-charcoal-900/60 border-charcoal-800 text-charcoal-300'}`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-bold">[{a.priority}]</span>
              <span className="text-charcoal-500">{a.role}</span>
            </div>
            <div className="text-xs font-semibold leading-snug">{a.title}</div>
            <div className="mt-0.5 text-charcoal-400 line-clamp-2">{a.body}</div>
          </motion.div>
        ))}
      </AnimatePresence>
      {alerts.length === 0 && (
        <div className="text-[10px] text-charcoal-600 font-mono text-center py-3">
          No backend alerts received
        </div>
      )}
    </div>
  );
}

function AuditLog({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="space-y-1 max-h-40 overflow-y-auto">
      {entries.slice(0, 15).map((e, i) => (
        <div key={i} className="flex items-start space-x-2 text-[10px] font-mono text-charcoal-500">
          <Clock className="w-2.5 h-2.5 mt-0.5 flex-shrink-0 text-charcoal-600" />
          <span className="text-charcoal-600 flex-shrink-0">{new Date(e.ts).toLocaleTimeString()}</span>
          <span className="text-charcoal-400">{e.event}</span>
          {e.source && <span className="text-charcoal-600 truncate">{String(e.source)}</span>}
        </div>
      ))}
      {entries.length === 0 && (
        <div className="text-[10px] text-charcoal-600 font-mono text-center py-3">
          Audit log empty
        </div>
      )}
    </div>
  );
}

export const CommandCenter: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [detections, setDetections] = useState<BEDetection[]>([]);
  const [beAlerts, setBeAlerts] = useState<BEAlert[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dedupeById = <T extends { id: string }>(items: T[]): T[] => {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      reconnectRef.current = setTimeout(connect, 3000);
    };
    ws.onerror = () => ws.close();

    ws.onmessage = (ev) => {
      try {
        const msg: WSMessage = JSON.parse(ev.data);
        if (msg.type === 'snapshot') {
          setIncidents(msg.payload.incidents ?? []);
          setAudit(msg.payload.audit ?? []);
        } else if (msg.type === 'incident') {
          setIncidents((prev) => dedupeById([msg.payload, ...prev]).slice(0, 100));
        } else if (msg.type === 'detections') {
          setDetections((prev) => dedupeById([...msg.payload, ...prev]).slice(0, 200));
        } else if (msg.type === 'alert') {
          setBeAlerts((prev) => dedupeById([msg.payload, ...prev]).slice(0, 50));
        }
      } catch { /* ignore parse errors */ }
    };
  };

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, []);

  const runSimulation = async () => {
    setSimulationLoading(true);
    try {
      await fetch(`${API_URL}/simulate`, { method: 'POST' });
    } catch { /* backend may not be running */ }
    setTimeout(() => setSimulationLoading(false), 2000);
  };

  const activeIncidents = incidents.filter(
    (i) => !['RESOLVED', 'FALSE_POSITIVE'].includes(i.state)
  );
  const criticalCount = incidents.filter((i) => i.severity >= 4).length;
  const fireDetections = detections.filter((d) => d.class === 'fire').length;
  const smokeDetections = detections.filter((d) => d.class === 'smoke').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Wildfire Command Center</h1>
          <p className="text-xs text-charcoal-400 mt-1 font-mono">
            Real-time AI detection pipeline · SAINet v11.1 + YOLOv8n
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <ConnectionStatus connected={connected} />
          <button
            onClick={runSimulation}
            disabled={simulationLoading}
            className="flex items-center space-x-2 px-3 py-1.5 rounded border border-charcoal-700 bg-charcoal-900 text-xs font-mono text-charcoal-300 hover:border-forest-600 hover:text-white transition-all disabled:opacity-50"
          >
            {simulationLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            <span>Run Simulation</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Incidents', value: activeIncidents.length, icon: AlertTriangle, color: 'text-red-400' },
          { label: 'Critical', value: criticalCount, icon: Flame, color: 'text-red-500' },
          { label: 'Fire Detections', value: fireDetections, icon: Eye, color: 'text-orange-400' },
          { label: 'Smoke Detections', value: smokeDetections, icon: Wind, color: 'text-yellow-400' },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center space-x-3 p-3 border border-charcoal-800 rounded bg-charcoal-900/60">
            <div className={`p-2 bg-charcoal-800 rounded ${stat.color}`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-charcoal-500 uppercase tracking-widest font-mono">{stat.label}</p>
              <p className="text-2xl font-bold text-white font-mono">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main layout: Incidents + Detail + Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left: Incident List */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-3.5 h-3.5 text-forest-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Incidents</h2>
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono bg-red-950/60 text-red-400 border border-red-800/30">
              {activeIncidents.length}
            </span>
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {incidents.length === 0 ? (
                <div className="text-xs text-charcoal-600 font-mono text-center py-8 border border-charcoal-800 rounded">
                  {connected ? 'No incidents — system monitoring' : 'Connect backend to see live incidents'}
                </div>
              ) : (
                incidents.slice(0, 30).map((inc) => (
                  <IncidentCard
                    key={inc.id}
                    incident={inc}
                    onSelect={() => setSelectedIncident(inc)}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Middle: Incident detail or detections overlay */}
        <div className="border border-charcoal-800 rounded p-4 bg-charcoal-900/40 min-h-[420px]">
          <AnimatePresence mode="wait">
            {selectedIncident ? (
              <IncidentDetail
                key={selectedIncident.id}
                incident={selectedIncident}
                onClose={() => setSelectedIncident(null)}
              />
            ) : (
              <motion.div
                key="detection-panel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2">
                  <Crosshair className="w-3.5 h-3.5 text-orange-400" />
                  <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Live Detections</h2>
                  <span className="text-[9px] font-mono text-charcoal-500 ml-auto">{detections.length} buffered</span>
                </div>
                {/* Detection Overlay Demo */}
                <div className="relative bg-charcoal-950 rounded border border-charcoal-800 overflow-hidden" style={{ height: 200 }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-[10px] text-charcoal-700 font-mono">
                      {detections.length > 0 ? 'DETECTION FRAME BUFFER' : 'AWAITING FRAMES FROM BACKEND'}
                    </div>
                  </div>
                  <DetectionOverlay
                    detections={detections.slice(0, 5)}
                    width="100%"
                    height="200px"
                    sourceWidth={640}
                    sourceHeight={480}
                  />
                </div>
                <DetectionFeed detections={detections} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Alerts + Audit */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Backend Alerts</h2>
            </div>
            <AlertFeed alerts={beAlerts} />
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-3.5 h-3.5 text-violet-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Audit Log</h2>
            </div>
            <AuditLog entries={audit} />
          </div>
        </div>
      </div>

      {/* Backend instructions when offline */}
      {!connected && (
        <div className="p-4 border border-charcoal-700 rounded bg-charcoal-900/50 text-xs font-mono text-charcoal-400">
          <div className="flex items-center space-x-2 mb-2">
            <WifiOff className="w-4 h-4 text-red-400" />
            <span className="text-white font-bold">Backend not connected</span>
          </div>
          <p className="leading-relaxed">
            Start the Forest-management backend to enable real-time data:
          </p>
          <pre className="mt-2 p-2 bg-charcoal-950 rounded text-[10px] text-emerald-400 overflow-x-auto">
{`cd "Forest-management"
python -m venv .venv && .venv\\Scripts\\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --app-dir backend`}
          </pre>
        </div>
      )}
    </div>
  );
};

export default CommandCenter;
