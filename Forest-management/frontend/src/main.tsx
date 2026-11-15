/**
 * Wildfire Intelligence Platform — Frontend
 * Landing + Command Center + Heatmap + role modals + real geolocation.
 */
import React, {
  useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import ReactDOM from "react-dom/client";
import { MapContainer, TileLayer, CircleMarker, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, MapPin, Bell, Radio, Play, Square, Shield, Users, Activity,
  Camera, AlertTriangle, CheckCircle2, Eye, Crosshair, BookOpen,
  ChevronRight, Send, Wifi, WifiOff, Layers, Box, Phone, Globe, Sparkles,
} from "lucide-react";
import "./styles.css";
import type {
  Role, Incident, Alert as AlertT, Detection, AuditEntry, AppConfig,
  WSMessage, GlobalState, SeverityLevel, ActiveTab,
} from "./types";
import { DetectionOverlay } from "./components/DetectionOverlay";
import { FireCursor } from "./components/FireCursor";
import { LandingPage } from "./components/LandingPage";
import { HeatmapView } from "./components/HeatmapView";
import { RoleAlertModal } from "./components/RoleAlertModal";
import { ErrorBoundary } from "./components/ErrorBoundary";

const API = "http://localhost:8000";
const WS = "ws://localhost:8000/ws";

// ------------------------------------------------------------------
// Utilities
// ------------------------------------------------------------------
const fmtTime = (iso: string): string => new Date(iso).toLocaleTimeString();

const SEV_COLORS: Record<SeverityLevel, string> = {
  0: "#3a3f4b", 1: "#4b6b8a", 2: "#c9a227",
  3: "#e07b2b", 4: "#c0392b", 5: "#ff2d2d",
};

const ROLE_BADGE: Record<Role, string> = {
  CITIZEN: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  FIREFIGHTER: "bg-red-500/20 text-red-300 border-red-500/40",
  FOREST_OFFICIAL: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  EMERGENCY_OPERATOR: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  DISASTER_MANAGER: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40",
  ADMIN: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  OBSERVER: "bg-slate-500/20 text-slate-300 border-slate-500/40",
};

const ROLE_ORDER: Role[] = [
  "CITIZEN", "FIREFIGHTER", "FOREST_OFFICIAL",
  "EMERGENCY_OPERATOR", "DISASTER_MANAGER", "ADMIN", "OBSERVER",
];

// ------------------------------------------------------------------
// Store
// ------------------------------------------------------------------
const useStore = (() => {
  let state: GlobalState = {
    incidents: [],
    alerts: [],
    audit: [],
    detections: [],
    config: null,
    connected: false,
    role: "FOREST_OFFICIAL",
    userId: "user-demo",
    location: { lat: 0, lon: 0 },   // world origin — replaced by geolocation
    activeTab: "landing",
    activeIncident: null,
    simulationOn: false,
  };
  const subs = new Set<() => void>();
  const get = (): GlobalState => state;
  const set = (patch: Partial<GlobalState> | ((s: GlobalState) => Partial<GlobalState>)) => {
    const next = typeof patch === "function" ? patch(state) : patch;
    state = { ...state, ...next };
    subs.forEach((fn) => fn());
  };
  const sub = (fn: () => void): (() => void) => {
    subs.add(fn);
    return () => { subs.delete(fn); };
  };
  return { get, set, sub };
})();

function useGlobal(): GlobalState {
  const [, force] = useState(0);
  useEffect(() => useStore.sub(() => force((n) => n + 1)), []);
  return useStore.get();
}

// ------------------------------------------------------------------
// Utilities: dedupe
// ------------------------------------------------------------------
function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    if (!it || typeof it.id !== "string") continue;
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

// ------------------------------------------------------------------
// WebSocket
// ------------------------------------------------------------------
function useSocket() {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let closed = false;
    const connect = () => {
      if (closed) return;
      const ws = new WebSocket(WS);
      wsRef.current = ws;

      ws.onopen = () => useStore.set({ connected: true });
      ws.onclose = () => {
        useStore.set({ connected: false });
        if (!closed) setTimeout(connect, 2000);
      };
      ws.onmessage = (ev: MessageEvent<string>) => {
        try {
          const msg = JSON.parse(ev.data) as WSMessage;
          handleMessage(msg);
        } catch (err) {
          console.error("[WS] message handler crashed:", err, ev.data);
        }
      };
    };
    connect();
    return () => {
      closed = true;
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, []);
}

function handleMessage(msg: WSMessage): void {
  const s = useStore.get();
  switch (msg.type) {
    case "snapshot":
      useStore.set({
        incidents: dedupeById(msg.payload.incidents ?? []),
        audit: msg.payload.audit ?? [],
        config: (msg.payload.config as AppConfig | undefined) ?? s.config,
      });
      break;
    case "detections":
      useStore.set({ detections: [...msg.payload, ...s.detections].slice(0, 200) });
      break;
    case "incident": {
      const list = s.incidents.filter((i) => i.id !== msg.payload.id);
      useStore.set({ incidents: [msg.payload, ...list] });
      break;
    }
    case "alert":
      useStore.set({ alerts: [msg.payload, ...s.alerts].slice(0, 100) });
      break;
    case "user_report":
      break;
    case "simulation":
      useStore.set({ simulationOn: msg.payload.status === "started" });
      break;
  }
}

// ------------------------------------------------------------------
// Geolocation
// ------------------------------------------------------------------
function useGeolocation() {
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      console.warn("[Geo] Geolocation not supported by this browser.");
      return;
    }
    let cancelled = false;

    const onSuccess = (pos: GeolocationPosition) => {
      if (cancelled) return;
      const { latitude, longitude, accuracy } = pos.coords;
      console.log(
        `[Geo] Location acquired: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (±${Math.round(accuracy)}m)`
      );
      useStore.set({ location: { lat: latitude, lon: longitude } });
    };

    const onError = (err: GeolocationPositionError) => {
      if (cancelled) return;
      console.warn(
        `[Geo] Location unavailable (code ${err.code}): ${err.message}. Using fallback.`
      );
      // Fallback so the app still has something on the map
      if (useStore.get().location.lat === 0 && useStore.get().location.lon === 0) {
        useStore.set({ location: { lat: 19.076, lon: 72.8777 } });
      }
    };

    const watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      maximumAge: 30_000,
      timeout: 15_000,
    });

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);
}

// ------------------------------------------------------------------
// API client
// ------------------------------------------------------------------
const api = {
  async get<T>(path: string): Promise<T> {
    const r = await fetch(API + path);
    return r.json() as Promise<T>;
  },
  async post<T>(path: string, body: unknown): Promise<T> {
    const r = await fetch(API + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return r.json() as Promise<T>;
  },
  async frame(blob: Blob, sourceId: string, lat: number, lon: number) {
    const fd = new FormData();
    fd.append("file", blob, "frame.jpg");
    fd.append("source_id", sourceId);
    fd.append("lat", String(lat));
    fd.append("lon", String(lon));
    const r = await fetch(API + "/api/frame", { method: "POST", body: fd });
    return r.json();
  },
};

// ------------------------------------------------------------------
// Shell
// ------------------------------------------------------------------
function Shell({ children }: { children: ReactNode }) {
  const s = useGlobal();
  const tabs: { key: ActiveTab; label: string; icon: typeof Activity }[] = [
    { key: "landing", label: "Landing 3D", icon: Globe },
    { key: "dashboard", label: "Dashboard", icon: Activity },
    { key: "incidents", label: "Incidents", icon: Flame },
    { key: "map", label: "Map", icon: MapPin },
    { key: "heatmap", label: "Heatmap", icon: Sparkles },
    { key: "alerts", label: "Alerts", icon: Bell },
    { key: "guide", label: "Guide", icon: BookOpen },
    { key: "admin", label: "Admin", icon: Shield },
  ];

  return (
    <div className="wf-app">
      <aside className="wf-sidebar">
        <div className="wf-brand">
          <div className="wf-brand-mark"><Flame size={22} /></div>
          <div>
            <div className="wf-brand-title">WILDFIRE INTELLIGENCE</div>
            <div className="wf-brand-sub">Detect · Verify · Alert · Guide</div>
          </div>
        </div>

        <nav className="wf-nav">
          {tabs.map((t) => (
            <button key={t.key}
              className={"wf-nav-item " + (s.activeTab === t.key ? "active" : "")}
              onClick={() => useStore.set({ activeTab: t.key })}>
              <t.icon size={16} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="wf-sidebar-footer">
          <div className={"wf-status " + (s.connected ? "online" : "offline")}>
            {s.connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {s.connected ? "LIVE" : "OFFLINE"}
          </div>
          <div className="wf-user">
            <span className={"wf-role-badge " + ROLE_BADGE[s.role]}>{s.role}</span>
            <select value={s.role}
              onChange={(e) => useStore.set({ role: e.target.value as Role })}
              className="wf-role-select">
              {ROLE_ORDER.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </aside>

      <main className="wf-main">{children}</main>

      <nav className="wf-mobile-nav">
        {tabs.slice(0, 5).map((t) => (
          <button key={t.key}
            className={"wf-mobile-nav-item " + (s.activeTab === t.key ? "active" : "")}
            onClick={() => useStore.set({ activeTab: t.key })}>
            <t.icon size={20} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ------------------------------------------------------------------
// Location control (manual override + status)
// ------------------------------------------------------------------
function LocationControl() {
  const s = useGlobal();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const requestNow = () => {
    if (!("geolocation" in navigator)) {
      setMsg("Geolocation not supported by this browser.");
      return;
    }
    setBusy(true);
    setMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        useStore.set({
          location: { lat: pos.coords.latitude, lon: pos.coords.longitude },
        });
        setMsg(
          `Updated: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)} (±${Math.round(pos.coords.accuracy)}m)`
        );
        setBusy(false);
      },
      (err) => {
        setMsg(`Denied or unavailable: ${err.message}`);
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  return (
    <div className="wf-panel" style={{ marginBottom: 18 }}>
      <div className="wf-panel-header">
        <MapPin size={16} /> Detection Location
      </div>
      <div className="wf-kv">
        <div><span>Latitude</span><b>{s.location.lat.toFixed(6)}</b></div>
        <div><span>Longitude</span><b>{s.location.lon.toFixed(6)}</b></div>
      </div>
      <div className="wf-row">
        <button className="wf-btn primary" onClick={requestNow} disabled={busy}>
          <MapPin size={14} /> {busy ? "Locating…" : "Use My Location"}
        </button>
      </div>
      {msg && <div className="wf-hint">{msg}</div>}
      <div className="wf-hint">
        Every detection is stamped with these coordinates. If they don't match
        where you actually are, click the button above — the browser will ask
        for permission.
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Camera
// ------------------------------------------------------------------
interface FrameResult {
  detections: Detection[];
  observations: Detection[];
  context: Detection[];
  incidents: Incident[];
}

function CameraPanel() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [lastResult, setLastResult] = useState<FrameResult | null>(null);
  const [sourceId, setSourceId] = useState("CAMERA-001");
  const [busy, setBusy] = useState(false);
  const [frameDims, setFrameDims] = useState({ w: 640, h: 480 });
  const s = useGlobal();

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setLastResult(null);
      setStreaming(true);
    } catch (e) {
      alert("Cannot access camera: " + (e as Error).message);
    }
  };

  const stop = () => {
    const v = videoRef.current;
    if (v && v.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      v.srcObject = null;
    }
    setStreaming(false);
    setLastResult(null);
  };

  const captureAndSend = async () => {
    if (busy) return;
    setBusy(true);
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) { setBusy(false); return; }
    const w = v.videoWidth || 640;
    const h = v.videoHeight || 480;
    c.width = w;
    c.height = h;
    setFrameDims({ w, h });
    const ctx = c.getContext("2d");
    if (!ctx) { setBusy(false); return; }
    ctx.drawImage(v, 0, 0);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.85));
    if (blob) {
      try {
        const result = (await api.frame(blob, sourceId, s.location.lat, s.location.lon)) as FrameResult;
        setLastResult(result);
      } catch (e) {
        console.error(e);
      }
    }
    setBusy(false);
  };

  useEffect(() => {
    if (!streaming) return;
    const id = setInterval(captureAndSend, 2000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming, sourceId]);

  // Boxes render only while the camera is live.
  const overlayDetections: Detection[] = streaming
    ? (lastResult?.detections ?? [])
    : [];

  return (
    <div className="wf-panel">
      <div className="wf-panel-header">
        <Camera size={16} />
        <span>SAINet Vision Feed</span>
        <span className="wf-panel-tag">{streaming ? "STREAMING" : "IDLE"}</span>
      </div>

      <div className="wf-camera-stage">
        <video ref={videoRef} muted playsInline className="wf-video" />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <div className="wf-camera-scanline" />

        <DetectionOverlay
          detections={overlayDetections}
          showLabels={true}
          sourceWidth={frameDims.w}
          sourceHeight={frameDims.h}
        />

        {!streaming && (
          <div className="wf-camera-placeholder">
            <Camera size={48} />
            <div>Camera idle</div>
          </div>
        )}
      </div>

      <div className="wf-row">
        <input value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          className="wf-input" placeholder="Source ID" />
        {!streaming
          ? <button className="wf-btn primary" onClick={start}><Play size={14} /> Start</button>
          : <button className="wf-btn danger" onClick={stop}><Square size={14} /> Stop</button>}
      </div>
      <div className="wf-hint">
        Frames are sent every 2 s. SAINet detects fire and smoke; the context
        model detects people, vehicles, and animals. Detection boxes only
        render while streaming.
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Map (guarded)
// ------------------------------------------------------------------
interface MapProps {
  incident?: Incident | null;
  height?: number;
  showLayers?: boolean;
}

interface LayerState {
  incidents: boolean;
  detections: boolean;
  cameras: boolean;
  reports: boolean;
}

function IncidentMap({ incident = null, height = 360, showLayers = true }: MapProps) {
  const s = useGlobal();
  const [layers, setLayers] = useState<LayerState>({
    incidents: true, detections: true, cameras: true, reports: true,
  });

  // Guard: only pass well-formed incidents to Leaflet.
  const safeIncidents = s.incidents.filter(
    (i): i is Incident =>
      !!i &&
      !!i.location &&
      typeof i.location.lat === "number" &&
      typeof i.location.lon === "number" &&
      isFinite(i.location.lat) &&
      isFinite(i.location.lon)
  );

  // Guard: only pass well-formed detections to Leaflet.
  const safeDetections = s.detections.filter(
    (d): d is Detection =>
      !!d &&
      !!d.location &&
      typeof d.location.lat === "number" &&
      typeof d.location.lon === "number" &&
      isFinite(d.location.lat) &&
      isFinite(d.location.lon)
  );

  const center: [number, number] =
    incident &&
      incident.location &&
      typeof incident.location.lat === "number" &&
      isFinite(incident.location.lat) &&
      isFinite(incident.location.lon)
      ? [incident.location.lat, incident.location.lon]
      : [s.location.lat, s.location.lon];

  return (
    <div className="wf-panel" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
      {showLayers && (
        <div className="wf-map-layers">
          <Layers size={14} />
          {(Object.keys(layers) as (keyof LayerState)[]).map((k) => (
            <button key={k}
              className={"wf-layer-chip " + (layers[k] ? "on" : "")}
              onClick={() => setLayers({ ...layers, [k]: !layers[k] })}>
              {k}
            </button>
          ))}
        </div>
      )}
      <MapContainer center={center} zoom={12} style={{ height, width: "100%" }}
        className="wf-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {layers.incidents && safeIncidents.map((i) => (
          <React.Fragment key={i.id}>
            <CircleMarker
              center={[i.location.lat, i.location.lon]}
              radius={10}
              pathOptions={{
                color: SEV_COLORS[i.severity] || "#888",
                fillColor: SEV_COLORS[i.severity] || "#888",
                fillOpacity: 0.6, weight: 2,
              }}>
              <Popup>
                <div className="wf-popup">
                  <strong>{i.id}</strong>
                  <div>{i.severity_label}</div>
                  <div>{(i.confidence * 100).toFixed(0)}% · {i.sources.length} src</div>
                </div>
              </Popup>
            </CircleMarker>
            <Circle
              center={[i.location.lat, i.location.lon]}
              radius={800}
              pathOptions={{
                color: SEV_COLORS[i.severity],
                fillOpacity: 0.05, weight: 1, dashArray: "4 4",
              }}
            />
          </React.Fragment>
        ))}

        {layers.detections && safeDetections.slice(0, 40).map((d) => (
          <CircleMarker key={d.id}
            center={[d.location.lat, d.location.lon]}
            radius={4}
            pathOptions={{ color: "#6ab0ff", fillOpacity: 0.9 }}>
            <Popup>
              <div className="wf-popup">
                <strong>{d.source_id}</strong>
                <div>{d.class} · {(d.confidence * 100).toFixed(0)}%</div>
                <div>{fmtTime(d.ts)}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

// ------------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------------
function Dashboard() {
  const s = useGlobal();
  const active = s.incidents.filter(
    (i) => !["RESOLVED", "FALSE_POSITIVE"].includes(i.state)
  );
  const stats = [
    { label: "Active", value: active.length, icon: Flame },
    { label: "Critical", value: active.filter((i) => i.severity >= 4).length, icon: AlertTriangle },
    { label: "Sources", value: new Set(s.detections.map((d) => d.source_id)).size, icon: Radio },
    { label: "Alerts", value: s.alerts.length, icon: Bell },
  ];

  return (
    <div className="wf-page">
      <div className="wf-page-header">
        <div>
          <div className="wf-kicker">COMMAND CENTER</div>
          <h1 className="wf-h1">Wildfire Intelligence</h1>
          <div className="wf-sub">Detect → Verify → Alert → Guide → Respond</div>
        </div>
        <SimControls />
      </div>

      <LocationControl />

      <div className="wf-stats">
        {stats.map((sx) => (
          <div key={sx.label} className="wf-stat">
            <sx.icon size={16} />
            <div>
              <div className="wf-stat-value">{sx.value}</div>
              <div className="wf-stat-label">{sx.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="wf-grid-2">
        <CameraPanel />
        <IncidentQueue />
      </div>

      <div className="wf-grid-2">
        <IncidentMap height={380} />
        <AuditFeed />
      </div>
    </div>
  );
}

function SimControls() {
  const s = useGlobal();
  const toggle = async () => {
    if (s.simulationOn) await api.post("/api/simulation/stop", {});
    else await api.post("/api/simulation/start", {});
  };
  return (
    <button className={"wf-btn " + (s.simulationOn ? "danger" : "primary")}
      onClick={toggle}>
      {s.simulationOn ? <Square size={14} /> : <Play size={14} />}
      {s.simulationOn ? "Stop Simulation" : "Run Demo Scenario"}
    </button>
  );
}

// ------------------------------------------------------------------
// Incident queue
// ------------------------------------------------------------------
function IncidentQueue() {
  const s = useGlobal();
  const list = s.incidents.slice(0, 20);
  return (
    <div className="wf-panel">
      <div className="wf-panel-header">
        <Flame size={16} />
        <span>Incident Queue</span>
        <span className="wf-panel-tag">{list.length}</span>
      </div>
      <div className="wf-queue">
        {list.length === 0 && (
          <div className="wf-empty">
            No incidents yet. Start the demo or run the camera to generate observations.
          </div>
        )}
        {list.map((i) => (
          <motion.button
            key={i.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="wf-queue-card"
            onClick={() => useStore.set({ activeIncident: i.id, activeTab: "incidents" })}>
            <div className="wf-queue-top">
              <span className="wf-queue-id">{i.id}</span>
              <span className="wf-sev-dot" style={{ background: SEV_COLORS[i.severity] }} />
            </div>
            <div className="wf-queue-label">{i.severity_label}</div>
            <div className="wf-queue-meta">
              {i.primary_class} · {(i.confidence * 100).toFixed(0)}% ·
              {" "}{i.sources.length} src · {i.state}
            </div>
            <div className="wf-queue-time">{fmtTime(i.created_at)}</div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Audit
// ------------------------------------------------------------------
function AuditFeed() {
  const s = useGlobal();
  const log = s.audit.slice(-30).reverse();
  return (
    <div className="wf-panel">
      <div className="wf-panel-header">
        <Activity size={16} />
        <span>Audit Timeline</span>
      </div>
      <div className="wf-audit">
        {log.map((a: AuditEntry, idx) => (
          <div key={idx} className="wf-audit-row">
            <span className="wf-audit-time">{new Date(a.ts).toLocaleTimeString()}</span>
            <span className="wf-audit-event">{a.event}</span>
            <span className="wf-audit-detail">
              {a.incident_id || a.source || a.role || ""}
            </span>
          </div>
        ))}
        {log.length === 0 && <div className="wf-empty">No events yet.</div>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Incidents
// ------------------------------------------------------------------
function IncidentsView() {
  const s = useGlobal();
  const activeId = s.activeIncident;
  const active = s.incidents.find((i) => i.id === activeId) || s.incidents[0];

  return (
    <div className="wf-page">
      <div className="wf-page-header">
        <div>
          <div className="wf-kicker">INCIDENTS</div>
          <h1 className="wf-h1">Incident Command View</h1>
        </div>
      </div>

      <div className="wf-grid-incident">
        <div className="wf-panel" style={{ maxHeight: "80vh", overflowY: "auto" }}>
          <div className="wf-panel-header"><Flame size={16} /> All Incidents</div>
          {s.incidents.map((i) => (
            <div key={i.id}
              className={"wf-inc-list-item " + (active && active.id === i.id ? "active" : "")}
              onClick={() => useStore.set({ activeIncident: i.id })}>
              <div className="wf-queue-top">
                <span className="wf-queue-id">{i.id}</span>
                <span className="wf-sev-dot" style={{ background: SEV_COLORS[i.severity] }} />
              </div>
              <div className="wf-queue-label">{i.severity_label}</div>
              <div className="wf-queue-meta">{i.state} · {i.sources.length} src</div>
            </div>
          ))}
          {s.incidents.length === 0 && <div className="wf-empty">No incidents.</div>}
        </div>

        <div>
          {active
            ? <IncidentDetail incident={active} />
            : <div className="wf-panel"><div className="wf-empty">Select an incident.</div></div>}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Incident detail
// ------------------------------------------------------------------
function IncidentDetail({ incident }: { incident: Incident }) {
  const s = useGlobal();
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState<string | null>(incident.ai_summary ?? null);

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    await api.post(`/api/incidents/${incident.id}/action`, {
      action, actor: s.userId, role: s.role, ...extra,
    });
  };

  const generateSummary = () => {
    const known = [
      `Detection class: ${incident.primary_class}`,
      `Confidence: ${(incident.confidence * 100).toFixed(0)}%`,
      `Persistence: ${incident.persistence?.duration?.toFixed(1) || 0}s`,
      `Sources: ${incident.sources.length} (distinct ${new Set(incident.sources.map((x) => x.source_id)).size})`,
      `Location: ${incident.location.lat.toFixed(4)}, ${incident.location.lon.toFixed(4)}`,
    ];
    const unknown = [
      "Actual fire perimeter", "Fire intensity", "Rate of spread",
      "Cause", "Weather conditions (not connected)",
    ];
    const text = [
      `AI INCIDENT SUMMARY — ${incident.id}`,
      ``,
      `At ${fmtTime(incident.created_at)} a ${incident.primary_class} signal was detected.`,
      `Current state: ${incident.state}. Severity: ${incident.severity_label}.`,
      ``,
      `KNOWN:`,
      ...known.map((x) => "• " + x),
      ``,
      `UNKNOWN / NOT AVAILABLE:`,
      ...unknown.map((x) => "• " + x),
      ``,
      `Recommended next step: review the latest imagery and follow the`,
      `applicable organizational response procedure.`,
    ].join("\n");
    setSummary(text);
    useStore.set({
      incidents: s.incidents.map((i) =>
        i.id === incident.id ? { ...i, ai_summary: text } : i),
    });
  };

  return (
    <div className="wf-detail">
      <div className="wf-detail-head">
        <div>
          <div className="wf-kicker">INCIDENT {incident.id}</div>
          <h2 className="wf-h2" style={{ color: SEV_COLORS[incident.severity] }}>
            {incident.severity_label.replace("_", " ")}
          </h2>
        </div>
        <div className="wf-detail-actions">
          <button className="wf-btn" onClick={() => act("acknowledge")}>
            <CheckCircle2 size={14} /> Acknowledge
          </button>
          <button className="wf-btn" onClick={() => act("escalate")}>
            <AlertTriangle size={14} /> Escalate
          </button>
          <button className="wf-btn" onClick={() => act("verify")}>
            <Shield size={14} /> Mark Verified
          </button>
          <button className="wf-btn danger" onClick={() => act("false_positive")}>
            False Positive
          </button>
          <button className="wf-btn primary" onClick={() => act("resolve")}>
            Resolve
          </button>
        </div>
      </div>

      <div className="wf-detail-grid">
        <IncidentMap incident={incident} height={320} />
        <div className="wf-panel">
          <div className="wf-panel-header"><Eye size={16} /> AI Detection</div>
          <div className="wf-kv">
            <div><span>Class</span><b>{incident.primary_class}</b></div>
            <div><span>Confidence</span><b>{(incident.confidence * 100).toFixed(0)}%</b></div>
            <div><span>Persistence</span><b>{incident.persistence?.duration?.toFixed(1) || 0}s</b></div>
            <div><span>Persistent</span><b>{incident.persistence?.persistent ? "YES" : "NO"}</b></div>
            <div><span>Sources</span><b>{incident.sources.length}</b></div>
            <div><span>State</span><b>{incident.state}</b></div>
          </div>
          <div className="wf-source-list">
            {incident.sources.map((src, i) => (
              <div key={i} className="wf-source-row">
                <Radio size={12} /> {src.source_id}
                <span className="wf-source-tag">{src.relation}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="wf-panel">
        <div className="wf-panel-header">
          <Box size={16} /> AI Incident Summary
          <button className="wf-btn small" style={{ marginLeft: "auto" }}
            onClick={generateSummary}>Generate</button>
        </div>
        <pre className="wf-summary">{summary || "No summary yet. Click Generate."}</pre>
        <div className="wf-disclaimer">
          AI-GENERATED SUMMARY — not an official instruction. Distinguish FACT / INTERPRETATION / UNKNOWN.
        </div>
      </div>

      <div className="wf-detail-grid-2">
        <div className="wf-panel">
          <div className="wf-panel-header">Event Timeline</div>
          <div className="wf-timeline">
            {incident.timeline.map((t, i) => (
              <div key={i} className="wf-timeline-row">
                <span className="wf-timeline-dot" />
                <span className="wf-timeline-time">{fmtTime(t.ts)}</span>
                <span className="wf-timeline-event">{t.event}</span>
                <span className="wf-timeline-detail">{t.detail}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="wf-panel">
          <div className="wf-panel-header">Incident Checklist</div>
          <div className="wf-checklist">
            {incident.checklist.map((c) => (
              <label key={c.key} className="wf-check">
                <input type="checkbox" checked={c.done}
                  onChange={(e) => act("checklist", { key: c.key, done: e.target.checked })} />
                <span>{c.label}</span>
              </label>
            ))}
          </div>
          <div className="wf-note-box">
            <input value={note} onChange={(e) => setNote(e.target.value)}
              className="wf-input" placeholder="Add note…" />
            <button className="wf-btn primary"
              onClick={() => { act("note", { text: note }); setNote(""); }}>
              <Send size={14} /> Send
            </button>
          </div>
          <div className="wf-notes">
            {(incident.notes || []).map((n, i) => (
              <div key={i} className="wf-note">
                <b>{n.actor}</b> · {fmtTime(n.ts)} — {n.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      <ResponseGuide incident={incident} />
    </div>
  );
}

// ------------------------------------------------------------------
// Response Guide
// ------------------------------------------------------------------
function ResponseGuide({ incident }: { incident: Incident }) {
  const s = useGlobal();
  const role = s.role;

  const blocks: Record<Role, [string, string][]> = {
    CITIZEN: [
      ["WHAT HAPPENED", `A potential ${incident.primary_class} event was detected near your area.`],
      ["WHAT IS KNOWN", `Detection from ${incident.sources.length} source(s); confidence ${(incident.confidence * 100).toFixed(0)}%.`],
      ["WHAT IS UNKNOWN", `Fire perimeter, intensity, and cause are UNKNOWN / NOT AVAILABLE.`],
      ["DO NOW",
        "1. Stay away from the affected area.\n" +
        "2. Do not approach the fire.\n" +
        "3. Monitor official emergency instructions.\n" +
        "4. Keep emergency access routes clear.\n" +
        "5. If smoke is affecting your location, move indoors."],
      ["AVOID",
        "• Entering the affected area.\n" +
        "• Attempting to fight a large or spreading fire.\n" +
        "• Blocking emergency vehicles.\n" +
        "• Sharing unverified information as confirmed."],
    ],
    FIREFIGHTER: [
      ["INCIDENT", `${incident.id} · ${incident.severity_label}`],
      ["LOCATION", `${incident.location.lat.toFixed(5)}, ${incident.location.lon.toFixed(5)}`],
      ["SOURCES", `${incident.sources.length} detection source(s).`],
      ["BEFORE ACTION",
        "□ Verify incident location\n" +
        "□ Review latest imagery\n" +
        "□ Check latest available weather (may be unavailable)\n" +
        "□ Check official hazard information\n" +
        "□ Review agency SOP\n" +
        "□ Confirm incident command assignment\n" +
        "□ Confirm communication channel"],
      ["NOTE", "Follow your agency's incident command procedures. This platform does not issue tactical orders."],
    ],
    FOREST_OFFICIAL: [
      ["INITIAL ASSESSMENT",
        "1. Review detection confidence.\n" +
        "2. Review persistence.\n" +
        "3. Examine source imagery.\n" +
        "4. Check nearby detection sources.\n" +
        "5. Review available environmental information.\n" +
        "6. Verify against official/local sources.\n" +
        "7. Assign appropriate response.\n" +
        "8. Update incident status."],
    ],
    EMERGENCY_OPERATOR: [
      ["OPERATOR QUEUE ACTIONS",
        "• Acknowledge and assign\n" +
        "• Escalate if verification requested\n" +
        "• Add notes to incident\n" +
        "• Correlate with adjacent incidents\n" +
        "• Confirm responsible organization per region"],
    ],
    ADMIN: [
      ["ADMIN", "Review system-wide incident activity. Confirm notification rules and escalations."],
    ],
    OBSERVER: [
      ["OBSERVER", "Read-only view. Information may be under verification."],
    ],
    DISASTER_MANAGER: [
      ["DISASTER MANAGER", "Cross-incident situational awareness. Multi-role coordination."],
    ],
  };
  const rows = blocks[role];

  const steps: [string, string][] = [
    ["UNDERSTAND", `Potential ${incident.primary_class} detected.`],
    ["VERIFY", "Review the latest camera frame."],
    ["ASSESS", "Check available location / environmental data."],
    ["NOTIFY", "Notify the appropriate responsible personnel."],
    ["RESPOND", "Follow your organization's official procedure."],
    ["UPDATE", "Record what happened and update the incident."],
  ];

  return (
    <div className="wf-panel wf-guide">
      <div className="wf-panel-header">
        <BookOpen size={16} />
        Response Guide — for role <span className={"wf-role-badge " + ROLE_BADGE[role]}>{role}</span>
      </div>

      <div className="wf-guide-steps">
        {steps.map(([t, d], i) => (
          <div key={t} className="wf-guide-step">
            <div className="wf-guide-step-index">{i + 1}</div>
            <div>
              <div className="wf-guide-step-title">{t}</div>
              <div className="wf-guide-step-desc">{d}</div>
            </div>
            {i < steps.length - 1 && <ChevronRight size={16} className="wf-guide-chev" />}
          </div>
        ))}
      </div>

      <div className="wf-guide-blocks">
        {rows.map(([title, body]) => (
          <div key={title} className="wf-guide-block">
            <div className="wf-guide-block-title">{title}</div>
            <pre className="wf-guide-block-body">{body}</pre>
          </div>
        ))}
      </div>

      <div className="wf-disclaimer">
        AI-GENERATED GUIDANCE — not an official order. Official procedures must be
        configured by an authorized organization.
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Alerts
// ------------------------------------------------------------------
function AlertsView() {
  const s = useGlobal();
  return (
    <div className="wf-page">
      <div className="wf-page-header">
        <div>
          <div className="wf-kicker">ALERT CENTER</div>
          <h1 className="wf-h1">Alerts</h1>
          <div className="wf-sub">
            Simulated in DEV mode — no real emergency contacts are made.
          </div>
        </div>
      </div>

      <div className="wf-alert-list">
        {s.alerts.length === 0 && (
          <div className="wf-panel"><div className="wf-empty">
            No alerts yet. Start the demo or run detection.
          </div></div>
        )}
        <AnimatePresence>
          {s.alerts.map((a: AlertT) => (
            <motion.div key={a.id} className="wf-alert-card"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}>
              <div className="wf-alert-head">
                <span className="wf-alert-priority" data-p={a.priority}>{a.priority}</span>
                <span className={"wf-role-badge " + (ROLE_BADGE[a.role] || "")}>{a.role}</span>
                <span className="wf-alert-time">{fmtTime(a.created_at)}</span>
              </div>
              <div className="wf-alert-title">{a.title}</div>
              <pre className="wf-alert-body">{a.body}</pre>
              <div className="wf-alert-actions">
                {a.actions.map((x) => (
                  <button key={x} className="wf-btn small">{x.replaceAll("_", " ")}</button>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Map view
// ------------------------------------------------------------------
function MapView() {
  return (
    <div className="wf-page">
      <div className="wf-page-header">
        <div>
          <div className="wf-kicker">GEOSPATIAL</div>
          <h1 className="wf-h1">Incident Map</h1>
          <div className="wf-sub">Layers reflect only data actually present.</div>
        </div>
      </div>
      <IncidentMap height={620} />
    </div>
  );
}

// ------------------------------------------------------------------
// Guide view
// ------------------------------------------------------------------
function GuideView() {
  const s = useGlobal();
  const inc = s.incidents[0];
  if (!inc) {
    return (
      <div className="wf-page">
        <div className="wf-panel"><div className="wf-empty">
          No incident loaded. Run the demo scenario to generate a guide.
        </div></div>
      </div>
    );
  }
  return (
    <div className="wf-page">
      <ResponseGuide incident={inc} />
    </div>
  );
}

// ------------------------------------------------------------------
// Admin
// ------------------------------------------------------------------
function AdminView() {
  const s = useGlobal();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  const sendTest = async () => {
    setLoading(true);
    const r = await api.post("/api/admin/test-alert", { role: "ADMIN" });
    setResult(r);
    setLoading(false);
  };

  return (
    <div className="wf-page">
      <div className="wf-page-header">
        <div>
          <div className="wf-kicker">ADMIN · DEV MODE</div>
          <h1 className="wf-h1">System Controls</h1>
          <div className="wf-sub">
            Notification mode: <b>{s.config?.notification_mode || "DEV"}</b> — no real
            emergency contacts will be made.
          </div>
        </div>
      </div>

      <div className="wf-grid-2">
        <div className="wf-panel">
          <div className="wf-panel-header"><Shield size={16} /> Test Alert</div>
          <div className="wf-hint">
            This will simulate dispatch across all roles. It will NOT contact real
            emergency services.
          </div>
          <button className="wf-btn primary" disabled={loading} onClick={sendTest}>
            {loading ? "Sending…" : "Send Test Alert"}
          </button>
          {result !== null && (
            <pre className="wf-summary" style={{ marginTop: 12 }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>

        <div className="wf-panel">
          <div className="wf-panel-header"><Crosshair size={16} /> Experimental AR / 3D</div>
          <div className="wf-hint">
            Prototype visualization. Not production AR. Data reflects current incidents.
          </div>
          <div className="wf-ar-stage">
            {s.incidents.slice(0, 3).map((i, idx) => (
              <div key={i.id}
                className="wf-ar-object"
                style={{
                  left: `${20 + idx * 25}%`,
                  top: `${30 + idx * 10}%`,
                  color: SEV_COLORS[i.severity],
                }}>
                <Flame size={20} />
                <span>{i.id}</span>
                <span>{(i.confidence * 100).toFixed(0)}%</span>
              </div>
            ))}
            {s.incidents.length === 0 && (
              <div className="wf-empty">No incident anchors.</div>
            )}
          </div>
          <div className="wf-disclaimer">
            EXPERIMENTAL AR — anchors are illustrative.
          </div>
        </div>

        <div className="wf-panel">
          <div className="wf-panel-header"><Phone size={16} /> Contact Directory (config-driven)</div>
          <div className="wf-hint">
            Organisations, roles and emergency channels are configuration — not hard-coded.
          </div>
          <div className="wf-kv">
            <div><span>Forest Division — North Region</span><b>Duty Officer</b></div>
            <div><span>Fire Response — Sector 4</span><b>[not configured]</b></div>
            <div><span>Disaster Cell — State</span><b>[not configured]</b></div>
          </div>
        </div>

        <div className="wf-panel">
          <div className="wf-panel-header"><Users size={16} /> Roles &amp; RBAC</div>
          <div className="wf-hint">
            Switch role in the sidebar to see role-specific views and alerts.
          </div>
          <div className="wf-kv">
            {ROLE_ORDER.map((r) => (
              <div key={r}>
                <span className={"wf-role-badge " + ROLE_BADGE[r]}>{r}</span>
                <b>{
                  r === "CITIZEN" ? "view alerts · safety guide · report" :
                    r === "FIREFIGHTER" ? "view assigned · acknowledge · update" :
                      r === "FOREST_OFFICIAL" ? "regional incidents · verify" :
                        r === "EMERGENCY_OPERATOR" ? "dispatch · assign · escalate" :
                          r === "ADMIN" ? "users · rules · providers · config" :
                            "read-only"
                }</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Root
// ------------------------------------------------------------------
function Root() {
  useSocket();
  useGeolocation();
  const s = useGlobal();

  useEffect(() => {
    api.get<AppConfig>("/api/config")
      .then((c) => useStore.set({ config: c }))
      .catch(() => { });
    api.get<Incident[]>("/api/incidents")
      .then((list) => useStore.set({ incidents: dedupeById(list) }))
      .catch(() => { });
  }, []);

  const view = useMemo<ReactNode>(() => {
    switch (s.activeTab) {
      case "dashboard": return <Dashboard />;
      case "incidents": return <IncidentsView />;
      case "map": return <MapView />;
      case "heatmap": return (
        <HeatmapView
          detections={s.detections}
          incidents={s.incidents}
          userLocation={s.location}
        />
      );
      case "alerts": return <AlertsView />;
      case "guide": return <GuideView />;
      case "admin": return <AdminView />;
      default: return <Dashboard />;
    }
  }, [s.activeTab, s.incidents, s.detections, s.location]);

  return (
    <>
      <FireCursor />
      <RoleAlertModal alerts={s.alerts} userRole={s.role} />
      {s.activeTab === "landing" ? (
        <LandingPage
          incidents={s.incidents}
          onNavigate={(t) => useStore.set({ activeTab: t })}
        />
      ) : (
        <Shell>{view}</Shell>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </React.StrictMode>
);