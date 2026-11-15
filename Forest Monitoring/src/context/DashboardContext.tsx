import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { FireDetection, SensorNode, DeforestationAlert, Alert, AIDecision, AIRecommendation, EnvironmentalStats } from '../types';
import type { Incident, BEDetection, BEAlert, WSMessage } from '../types/backend';
import { mockFires } from '../data/fires';
import { mockSensors } from '../data/sensors';
import { mockDeforestationAlerts, mockDeforestationStats } from '../data/deforestation';
import { mockAlerts } from '../data/alerts';
import { mockAIDecisions, mockAIRecommendations } from '../data/ai';

interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface DashboardContextProps {
  fires: FireDetection[];
  sensors: SensorNode[];
  deforestationAlerts: DeforestationAlert[];
  alerts: Alert[];
  aiDecisions: AIDecision[];
  aiRecommendations: AIRecommendation[];
  environmentalStats: EnvironmentalStats;
  deforestationStats: typeof mockDeforestationStats;
  toasts: Toast[];
  
  // Backend integration
  wsConnected: boolean;
  beIncidents: Incident[];
  beDetections: BEDetection[];
  beAlerts: BEAlert[];
  
  // Alert Actions
  updateAlertStatus: (id: string, status: Alert['status']) => void;
  
  // AI Actions
  approveRecommendation: (id: string) => void;
  
  // Sensor Actions
  toggleSensorStatus: (id: string) => void;
  
  // Simulation Actions
  simulateFire: () => void;
  simulateSmoke: () => void;
  simulateSensorFailure: () => void;
  simulateDeforestation: () => void;
  simulateCriticalRisk: () => void;
  
  // Toast Utilities
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
}

const DashboardContext = createContext<DashboardContextProps | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fires, setFires] = useState<FireDetection[]>(mockFires);
  const [sensors, setSensors] = useState<SensorNode[]>(mockSensors);
  const [deforestationAlerts, setDeforestationAlerts] = useState<DeforestationAlert[]>(mockDeforestationAlerts);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [aiDecisions, setAiDecisions] = useState<AIDecision[]>(mockAIDecisions);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>(mockAIRecommendations);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Backend WebSocket state
  const [wsConnected, setWsConnected] = useState(false);
  const [beIncidents, setBeIncidents] = useState<Incident[]>([]);
  const [beDetections, setBeDetections] = useState<BEDetection[]>([]);
  const [beAlerts, setBeAlerts] = useState<BEAlert[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [environmentalStats, setEnvironmentalStats] = useState<EnvironmentalStats>({
    temperature: 38,
    humidity: 27,
    windSpeed: 24,
    windDirection: 'NW',
    rainfallMm: 0.2,
    fireWeatherIndex: 31.4
  });

  const [deforestationStats, setDeforestationStats] = useState(mockDeforestationStats);

  // ---------- Backend WebSocket connection ----------
  const connectWs = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    try {
      const ws = new WebSocket('/ws');
      wsRef.current = ws;
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => {
        setWsConnected(false);
        reconnectRef.current = setTimeout(connectWs, 5000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (ev) => {
        try {
          const msg: WSMessage = JSON.parse(ev.data);
          if (msg.type === 'snapshot') {
            setBeIncidents(msg.payload.incidents ?? []);
          } else if (msg.type === 'incident') {
            setBeIncidents(prev => {
              const deduped = [msg.payload, ...prev.filter(i => i.id !== msg.payload.id)];
              return deduped.slice(0, 100);
            });
          } else if (msg.type === 'detections') {
            setBeDetections(prev => {
              const ids = new Set(msg.payload.map(d => d.id));
              return [...msg.payload, ...prev.filter(d => !ids.has(d.id))].slice(0, 200);
            });
          } else if (msg.type === 'alert') {
            setBeAlerts(prev => [msg.payload, ...prev.filter(a => a.id !== msg.payload.id)].slice(0, 50));
          }
        } catch { /* ignore */ }
      };
    } catch { /* backend not available */ }
  };

  useEffect(() => {
    connectWs();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, []);

  // Toast Management
  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Actions
  const updateAlertStatus = (id: string, status: Alert['status']) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
    addToast(`Alert ${id} status updated to: ${status}`, 'success');
  };

  const approveRecommendation = (id: string) => {
    setAiRecommendations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Approved' as const } : r))
    );
    addToast(`AI Recommendation ${id} approved and dispatched.`, 'success');
  };

  const toggleSensorStatus = (id: string) => {
    setSensors((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextConn = s.connectivity === 'Online' ? 'Offline' : 'Online';
          addToast(`Sensor node ${id} is now ${nextConn.toUpperCase()}`, nextConn === 'Online' ? 'success' : 'warning');
          return {
            ...s,
            connectivity: nextConn,
            lastUpdated: '1 sec ago'
          };
        }
        return s;
      })
    );
  };

  // Simulation Triggers
  const simulateFire = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const fireId = `FIRE-${randomSuffix}`;
    const lat = 18.5204 + (Math.random() - 0.5) * 0.05;
    const lng = 73.8567 + (Math.random() - 0.5) * 0.05;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Add fire
    const newFire: FireDetection = {
      id: fireId,
      latitude: lat,
      longitude: lng,
      confidence: 94.2,
      detectedAt: time,
      temperature: 39,
      humidity: 23,
      windSpeed: 28,
      windDirection: 'NNW',
      riskLevel: 'Critical',
      status: 'Active'
    };
    setFires((prev) => [newFire, ...prev]);

    // Add alert
    const newAlert: Alert = {
      id: `ALT-${randomSuffix}`,
      type: 'Fire',
      location: `Sector Grid ${lat.toFixed(3)}, ${lng.toFixed(3)}`,
      severity: 'Critical',
      timestamp: `2026-08-16 ${time}`,
      confidence: 94.2,
      status: 'New',
      message: `Active Wildfire SIMULATION event: Hotspot registered with critical 94.2% confidence.`
    };
    setAlerts((prev) => [newAlert, ...prev]);

    // Add AI Decision log
    const newDecision: AIDecision = {
      id: `DEC-${randomSuffix}`,
      timestamp: time,
      event: 'Autonomous Wildfire Simulation Alert',
      source: 'YOLO Target Detection Simulator',
      details: `Discovered hotspot at (${lat.toFixed(4)}, ${lng.toFixed(4)}). Initiated emergency dispatch pipeline.`,
      severity: 'Critical'
    };
    setAiDecisions((prev) => [newDecision, ...prev]);

    addToast(`[SIMULATION] Fire Alert Detected: ${fireId}`, 'error');
  };

  const simulateSmoke = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newAlert: Alert = {
      id: `ALT-${randomSuffix}`,
      type: 'Smoke',
      location: 'Eastern Buffer Sector',
      severity: 'High',
      timestamp: `2026-08-16 ${time}`,
      confidence: 89.0,
      status: 'New',
      message: `Plume signature detected by CAM-02 visual scanning algorithms. High risk of ignition.`
    };
    setAlerts((prev) => [newAlert, ...prev]);

    const newDecision: AIDecision = {
      id: `DEC-${randomSuffix}`,
      timestamp: time,
      event: 'Simulated Plume Signal Identified',
      source: 'AETHER Vision Sub-System',
      details: 'Dense grey particulate movement tracked by CAM-02 camera. Cross-referencing wind speeds.',
      severity: 'High'
    };
    setAiDecisions((prev) => [newDecision, ...prev]);

    addToast(`[SIMULATION] Smoke detected at Eastern Buffer`, 'warning');
  };

  const simulateSensorFailure = () => {
    // Find online sensor to offline
    const onlineSensors = sensors.filter(s => s.connectivity === 'Online');
    if (onlineSensors.length === 0) {
      addToast('No online sensors available to fail.', 'info');
      return;
    }
    const target = onlineSensors[Math.floor(Math.random() * onlineSensors.length)];
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setSensors(prev => prev.map(s => s.id === target.id ? { ...s, connectivity: 'Offline', batteryLevel: 5, lastUpdated: 'Just now' } : s));

    const newAlert: Alert = {
      id: `ALT-${Math.floor(200 + Math.random() * 800)}`,
      type: 'Sensor Failure',
      location: target.location,
      severity: 'Medium',
      timestamp: `2026-08-16 ${time}`,
      confidence: 100,
      status: 'New',
      message: `Node ${target.id} (${target.name}) ceased heartbeat communication. Battery critical or hardware error.`
    };
    setAlerts((prev) => [newAlert, ...prev]);

    addToast(`[SIMULATION] Sensor Node ${target.id} failed`, 'warning');
  };

  const simulateDeforestation = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const defId = `DEF-${randomSuffix}`;
    const lat = 18.5204 + (Math.random() - 0.5) * 0.08;
    const lng = 73.8567 + (Math.random() - 0.5) * 0.08;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newDefAlert: DeforestationAlert = {
      id: defId,
      region: 'Central Reserve (Sector G)',
      date: '2026-08-16',
      areaKm2: parseFloat((Math.random() * 3 + 0.5).toFixed(1)),
      confidence: 91,
      severity: 'High',
      status: 'New',
      latitude: lat,
      longitude: lng
    };
    setDeforestationAlerts((prev) => [newDefAlert, ...prev]);

    // Update stats
    setDeforestationStats(prev => ({
      ...prev,
      forestLossMonth: parseFloat((prev.forestLossMonth + newDefAlert.areaKm2).toFixed(1)),
      forestLossYear: parseFloat((prev.forestLossYear + newDefAlert.areaKm2).toFixed(1)),
      estimatedAffectedArea: parseFloat((prev.estimatedAffectedArea + newDefAlert.areaKm2 * 1.5).toFixed(1))
    }));

    const newAlert: Alert = {
      id: `ALT-${randomSuffix}`,
      type: 'Deforestation',
      location: 'Central Reserve (Sector G)',
      severity: 'High',
      timestamp: `2026-08-16 ${time}`,
      confidence: 91.0,
      status: 'New',
      message: `Canopy loss detected! Multispectral satellite differential shows ${newDefAlert.areaKm2} km² removal.`
    };
    setAlerts((prev) => [newAlert, ...prev]);

    addToast(`[SIMULATION] Deforestation Alert: ${defId}`, 'info');
  };

  const simulateCriticalRisk = () => {
    // Escalate environment stats
    setEnvironmentalStats(prev => ({
      ...prev,
      temperature: 42.1,
      humidity: 12.5,
      windSpeed: 34.0,
      fireWeatherIndex: 44.5 // Extreme risk
    }));

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newAlert: Alert = {
      id: `ALT-${Math.floor(900 + Math.random() * 99)}`,
      type: 'Environmental Risk',
      location: 'Regional Canopy',
      severity: 'Critical',
      timestamp: `2026-08-16 ${time}`,
      confidence: 99.0,
      status: 'New',
      message: 'CRITICAL ENVIRONMENTAL DANGER: Fire Weather Index has crossed extreme threshold (44.5).'
    };
    setAlerts((prev) => [newAlert, ...prev]);

    const newDecision: AIDecision = {
      id: `DEC-${Math.floor(900 + Math.random() * 99)}`,
      timestamp: time,
      event: 'Weather Index Crisis Triggered',
      source: 'AETHER Environmental Agent',
      details: 'Elevated regional temperature to 42°C and humidity drop to 12% indicates extreme risk of wildfire ignition. Safety systems set to hot standby.',
      severity: 'Critical'
    };
    setAiDecisions((prev) => [newDecision, ...prev]);

    addToast('[SIMULATION] Critical Risk Level Triggered', 'error');
  };

  return (
    <DashboardContext.Provider
      value={{
        fires,
        sensors,
        deforestationAlerts,
        alerts,
        aiDecisions,
        aiRecommendations,
        environmentalStats,
        deforestationStats,
        toasts,
        wsConnected,
        beIncidents,
        beDetections,
        beAlerts,
        updateAlertStatus,
        approveRecommendation,
        toggleSensorStatus,
        simulateFire,
        simulateSmoke,
        simulateSensorFailure,
        simulateDeforestation,
        simulateCriticalRisk,
        addToast,
        removeToast
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
