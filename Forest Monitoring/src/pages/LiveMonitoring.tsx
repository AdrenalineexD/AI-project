import React, { useCallback, useEffect, useRef, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { useDashboard } from '../context/DashboardContext';
import {
  Camera, CameraOff, Play, Square, Activity, AlertTriangle,
  Flame, Wind, Trees, RefreshCw, ChevronDown, ShieldAlert, Eye
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type CamState = 'idle' | 'requesting' | 'active' | 'denied' | 'stopped' | 'error';

interface DetectionBand {
  label: string;
  value: number; // 0-100
  color: string;
  textColor: string;
  barColor: string;
  borderColor: string;
}

interface EventEntry {
  id: string;
  ts: string;
  label: string;
  detail: string;
  severity: 'critical' | 'high' | 'normal';
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function sampleBrightness(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  const { width: w, height: h } = canvas;
  const step = 16;
  const data = ctx.getImageData(0, 0, w, h).data;
  let sum = 0, count = 0;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      sum += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      count++;
    }
  }
  return count > 0 ? sum / count : 0; // 0-255
}

function sampleRedDominance(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  const { width: w, height: h } = canvas;
  const step = 16;
  const data = ctx.getImageData(0, 0, w, h).data;
  let redScore = 0, count = 0;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      // fire-like: high R, moderate-low G, low B
      if (r > 140 && r > g * 1.3 && r > b * 1.5) redScore++;
      count++;
    }
  }
  return count > 0 ? (redScore / count) * 100 * 8 : 0; // amplified for demo
}

function sampleGreyDominance(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  const { width: w, height: h } = canvas;
  const step = 16;
  const data = ctx.getImageData(0, 0, w, h).data;
  let greyScore = 0, count = 0;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const avg = (r + g + b) / 3;
      const diff = Math.max(Math.abs(r - avg), Math.abs(g - avg), Math.abs(b - avg));
      if (diff < 25 && avg > 80 && avg < 200) greyScore++;
      count++;
    }
  }
  return count > 0 ? (greyScore / count) * 100 * 5 : 0;
}

function sampleGreenDominance(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  const { width: w, height: h } = canvas;
  const step = 16;
  const data = ctx.getImageData(0, 0, w, h).data;
  let greenScore = 0, count = 0;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (g > r * 1.1 && g > b * 1.1 && g > 60) greenScore++;
      count++;
    }
  }
  return count > 0 ? (greenScore / count) * 100 * 3 : 0;
}

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export const LiveMonitoring: React.FC = () => {
  const { aiDecisions, addToast } = useDashboard();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null); // off-screen sampling
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const [camState, setCamState] = useState<CamState>('idle');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [showDevicePicker, setShowDevicePicker] = useState(false);

  const [bands, setBands] = useState<DetectionBand[]>([
    { label: 'Fire', value: 0, color: 'text-red-400', textColor: 'text-red-400', barColor: 'bg-red-500', borderColor: 'border-red-500' },
    { label: 'Smoke', value: 0, color: 'text-orange-400', textColor: 'text-orange-400', barColor: 'bg-orange-500', borderColor: 'border-orange-500' },
    { label: 'Forest Cover', value: 0, color: 'text-emerald-400', textColor: 'text-emerald-400', barColor: 'bg-emerald-500', borderColor: 'border-emerald-500' },
    { label: 'Brightness', value: 0, color: 'text-yellow-400', textColor: 'text-yellow-400', barColor: 'bg-yellow-500', borderColor: 'border-yellow-400' },
  ]);

  const [events, setEvents] = useState<EventEntry[]>([]);
  const [fps, setFps] = useState(0);

  // ── Load available cameras ──────────────────────────────────────────────────
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(all => {
      const cams = all.filter(d => d.kind === 'videoinput');
      setDevices(cams);
      if (cams.length > 0) setSelectedDevice(cams[0].deviceId);
    }).catch(() => {});
  }, []);

  // ── Analysis loop ───────────────────────────────────────────────────────────
  const startAnalysis = useCallback((stream: MediaStream) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    video.srcObject = stream;
    video.play().catch(() => {});

    let frameCount = 0;
    let lastFpsTs = performance.now();
    let prevFire = 0, prevSmoke = 0;

    const tick = () => {
      if (video.readyState >= 2 && canvas) {
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 480;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);

          const fireRaw = clamp(sampleRedDominance(canvas));
          const smokeRaw = clamp(sampleGreyDominance(canvas));
          const forestRaw = clamp(sampleGreenDominance(canvas));
          const bri = clamp((sampleBrightness(canvas) / 255) * 100);

          // Smooth values
          const fire = clamp(prevFire * 0.82 + fireRaw * 0.18);
          const smoke = clamp(prevSmoke * 0.82 + smokeRaw * 0.18);
          prevFire = fire;
          prevSmoke = smoke;

          setBands([
            { label: 'Fire', value: fire, color: 'text-red-400', textColor: 'text-red-400', barColor: fire > 30 ? 'bg-red-500 animate-pulse' : 'bg-red-500', borderColor: 'border-red-500' },
            { label: 'Smoke', value: smoke, color: 'text-orange-400', textColor: 'text-orange-400', barColor: smoke > 30 ? 'bg-orange-500 animate-pulse' : 'bg-orange-500', borderColor: 'border-orange-500' },
            { label: 'Forest Cover', value: forestRaw, color: 'text-emerald-400', textColor: 'text-emerald-400', barColor: 'bg-emerald-500', borderColor: 'border-emerald-500' },
            { label: 'Brightness', value: bri, color: 'text-yellow-400', textColor: 'text-yellow-400', barColor: 'bg-yellow-400', borderColor: 'border-yellow-400' },
          ]);

          // Emit events on threshold crossings
          if (fire > 35) {
            setEvents(prev => {
              if (prev[0]?.label === 'FIRE SIGNATURE') return prev;
              const e: EventEntry = { id: crypto.randomUUID(), ts: now(), label: 'FIRE SIGNATURE', detail: `Red-channel dominance ${fire.toFixed(0)}% — possible flame.`, severity: 'critical' };
              addToast('[LIVE] Fire signature detected in frame', 'error');
              return [e, ...prev].slice(0, 20);
            });
          } else if (smoke > 30) {
            setEvents(prev => {
              if (prev[0]?.label === 'SMOKE PATTERN') return prev;
              const e: EventEntry = { id: crypto.randomUUID(), ts: now(), label: 'SMOKE PATTERN', detail: `Grey-channel density ${smoke.toFixed(0)}% — possible plume.`, severity: 'high' };
              return [e, ...prev].slice(0, 20);
            });
          }
        }

        frameCount++;
        const elapsed = performance.now() - lastFpsTs;
        if (elapsed >= 1000) {
          setFps(Math.round((frameCount * 1000) / elapsed));
          frameCount = 0;
          lastFpsTs = performance.now();
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [addToast]);

  // ── Start camera ─────────────────────────────────────────────────────────────
  const startCamera = useCallback(async (deviceId?: string) => {
    setCamState('requesting');
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Refresh device list with labels now that permission is granted
      const all = await navigator.mediaDevices.enumerateDevices();
      const cams = all.filter(d => d.kind === 'videoinput');
      setDevices(cams);

      setCamState('active');
      startAnalysis(stream);
      addToast('Camera feed started — AETHER Vision ACTIVE', 'success');

      setEvents(prev => [{
        id: crypto.randomUUID(),
        ts: now(),
        label: 'STREAM STARTED',
        detail: 'Camera initialised. Live pixel analysis running.',
        severity: 'normal'
      }, ...prev].slice(0, 20));
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setCamState('denied');
      } else {
        setCamState('error');
      }
    }
  }, [startAnalysis, addToast]);

  // ── Stop camera ───────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamState('stopped');
    setBands(b => b.map(x => ({ ...x, value: 0 })));
    setFps(0);
    addToast('Camera feed stopped', 'info');
  }, [addToast]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Switch device ─────────────────────────────────────────────────────────────
  const switchCamera = useCallback(async (deviceId: string) => {
    setSelectedDevice(deviceId);
    setShowDevicePicker(false);
    if (camState === 'active') {
      stopCamera();
      setTimeout(() => startCamera(deviceId), 300);
    }
  }, [camState, stopCamera, startCamera]);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const isActive = camState === 'active';
  const fireBand = bands.find(b => b.label === 'Fire')!;
  const riskLevel = fireBand.value > 50 ? 'CRITICAL' : fireBand.value > 30 ? 'HIGH' : fireBand.value > 10 ? 'MEDIUM' : 'CLEAR';
  const riskColor = fireBand.value > 50 ? 'text-red-400' : fireBand.value > 30 ? 'text-orange-400' : fireBand.value > 10 ? 'text-yellow-400' : 'text-emerald-400';

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Live Monitoring Terminal</h1>
          <p className="text-xs text-charcoal-400 mt-1 font-mono">
            Real-time camera feed · AETHER Vision pixel analysis
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Risk badge */}
          <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded border text-[10px] font-mono font-bold
            ${isActive
              ? riskLevel === 'CLEAR'
                ? 'bg-emerald-950/50 border-emerald-800/50 text-emerald-400'
                : riskLevel === 'MEDIUM'
                  ? 'bg-yellow-950/50 border-yellow-800/50 text-yellow-400'
                  : 'bg-red-950/50 border-red-800/50 text-red-400'
              : 'bg-charcoal-900 border-charcoal-700 text-charcoal-500'}`}>
            {isActive
              ? <><span className="w-1.5 h-1.5 rounded-full bg-current animate-ping mr-0.5" />LIVE · RISK {riskLevel}</>
              : <><CameraOff className="w-3 h-3 mr-0.5" />FEED OFFLINE</>}
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Camera Feed ───────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col space-y-3">

          {/* Camera view */}
          <div className="relative aspect-video rounded border border-charcoal-800 bg-charcoal-950 overflow-hidden shadow-inner">

            {/* Off-screen sampling canvas */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Live video */}
            <video
              ref={videoRef}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`}
              muted
              playsInline
            />

            {/* Scanline overlay */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[size:100%_4px]" />

            {/* HUD corners */}
            {(['top-3 left-3 border-t-2 border-l-2', 'top-3 right-3 border-t-2 border-r-2',
               'bottom-3 left-3 border-b-2 border-l-2', 'bottom-3 right-3 border-b-2 border-r-2'
              ]).map((cls, i) => (
              <div key={i} className={`absolute w-4 h-4 ${cls} border-charcoal-600 pointer-events-none`} />
            ))}

            {/* ── IDLE / STOPPED: permission request screen ─────────────────── */}
            {(camState === 'idle' || camState === 'stopped') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-5 bg-charcoal-950/95 z-20 p-6">
                <div className="w-20 h-20 rounded-full border-2 border-charcoal-700 flex items-center justify-center bg-charcoal-900">
                  <Camera className="w-9 h-9 text-charcoal-500" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-white font-bold text-base">
                    {camState === 'idle' ? 'Start Camera Feed' : 'Feed Stopped'}
                  </p>
                  <p className="text-xs text-charcoal-400 max-w-xs leading-relaxed font-mono">
                    {camState === 'idle'
                      ? 'Click below to grant camera access. The browser will ask for permission.'
                      : 'Camera was stopped. Click to restart the live analysis feed.'}
                  </p>
                </div>
                <button
                  id="start-camera-btn"
                  onClick={() => startCamera(selectedDevice || undefined)}
                  className="flex items-center space-x-2 px-6 py-3 rounded border border-forest-700 bg-forest-950/60 text-forest-400 font-bold text-sm hover:border-forest-500 hover:text-white hover:bg-forest-900/60 transition-all shadow-lg"
                >
                  <Play className="w-4 h-4" />
                  <span>{camState === 'idle' ? 'Allow Camera & Start' : 'Restart Feed'}</span>
                </button>
              </div>
            )}

            {/* ── REQUESTING: waiting for permission ────────────────────────── */}
            {camState === 'requesting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-charcoal-950/95 z-20">
                <RefreshCw className="w-10 h-10 text-forest-400 animate-spin" />
                <p className="text-white font-bold font-mono text-sm">Requesting camera access…</p>
                <p className="text-xs text-charcoal-400 font-mono">Check your browser's permission prompt</p>
              </div>
            )}

            {/* ── DENIED: permission refused ────────────────────────────────── */}
            {camState === 'denied' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-charcoal-950/95 z-20 p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-800/60 flex items-center justify-center">
                  <CameraOff className="w-7 h-7 text-red-400" />
                </div>
                <div>
                  <p className="text-red-400 font-bold font-mono">Camera Access Denied</p>
                  <p className="text-xs text-charcoal-400 mt-1 leading-relaxed max-w-xs font-mono">
                    Please enable camera permissions in your browser settings, then try again.
                  </p>
                </div>
                <button
                  onClick={() => startCamera(selectedDevice || undefined)}
                  className="px-5 py-2 rounded border border-charcoal-700 text-charcoal-300 text-xs font-mono hover:border-charcoal-500 hover:text-white transition-all"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* ── ERROR ─────────────────────────────────────────────────────── */}
            {camState === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-charcoal-950/95 z-20 p-6 text-center">
                <AlertTriangle className="w-10 h-10 text-orange-400" />
                <div>
                  <p className="text-orange-400 font-bold font-mono">Camera Error</p>
                  <p className="text-xs text-charcoal-400 mt-1 font-mono">Camera could not be accessed. Check it is not in use by another app.</p>
                </div>
                <button
                  onClick={() => setCamState('idle')}
                  className="px-5 py-2 rounded border border-charcoal-700 text-xs font-mono text-charcoal-300 hover:text-white transition-all"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* ── ACTIVE: HUD overlays ──────────────────────────────────────── */}
            {isActive && (
              <>
                {/* Top-left: live badge */}
                <div className="absolute top-4 left-5 z-10 font-mono text-[10px] space-y-0.5 pointer-events-none select-none">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    <span className="text-white font-bold tracking-wider">● LIVE</span>
                  </div>
                  <p className="text-charcoal-400">AETHER VISION ACTIVE</p>
                </div>

                {/* Top-right */}
                <div className="absolute top-4 right-5 z-10 font-mono text-[10px] text-right pointer-events-none select-none">
                  <p className="text-forest-400 font-bold">MODE: PIXEL ANALYSIS</p>
                  <p className="text-charcoal-500">FPS: {fps}</p>
                </div>

                {/* Bottom-right: risk level */}
                <div className={`absolute bottom-4 right-5 z-10 font-mono text-[10px] text-right pointer-events-none select-none font-bold ${riskColor}`}>
                  <p>RISK: {riskLevel}</p>
                  <p>FIRE: {fireBand.value.toFixed(1)}%</p>
                </div>

                {/* Center crosshair */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                  <div className="relative w-8 h-8">
                    <div className="absolute inset-0 border border-dashed border-charcoal-700 rounded-full opacity-50" />
                    <div className="absolute top-1/2 left-0 w-full h-px bg-charcoal-700 opacity-40" />
                    <div className="absolute left-1/2 top-0 w-px h-full bg-charcoal-700 opacity-40" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Controls bar */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {/* Start / Stop */}
            {!isActive ? (
              <button
                id="cam-start-btn"
                onClick={() => startCamera(selectedDevice || undefined)}
                disabled={camState === 'requesting'}
                className="flex items-center space-x-2 px-4 py-2 rounded border border-forest-700 bg-forest-950/50 text-forest-400 text-xs font-bold font-mono hover:border-forest-500 hover:text-white transition-all disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Camera</span>
              </button>
            ) : (
              <button
                id="cam-stop-btn"
                onClick={stopCamera}
                className="flex items-center space-x-2 px-4 py-2 rounded border border-red-800/60 bg-red-950/40 text-red-400 text-xs font-bold font-mono hover:border-red-600 hover:text-red-300 transition-all"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop Feed</span>
              </button>
            )}

            {/* Camera selector */}
            {devices.length > 1 && (
              <div className="relative">
                <button
                  id="cam-picker-btn"
                  onClick={() => setShowDevicePicker(v => !v)}
                  className="flex items-center space-x-2 px-3 py-2 rounded border border-charcoal-700 bg-charcoal-900 text-charcoal-300 text-xs font-mono hover:border-charcoal-500 hover:text-white transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span className="max-w-[140px] truncate">
                    {devices.find(d => d.deviceId === selectedDevice)?.label || 'Select Camera'}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showDevicePicker && (
                  <div className="absolute top-full mt-1 left-0 z-50 min-w-[240px] bg-charcoal-900 border border-charcoal-700 rounded shadow-xl overflow-hidden">
                    {devices.map((d, i) => (
                      <button
                        key={d.deviceId}
                        onClick={() => switchCamera(d.deviceId)}
                        className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors
                          ${d.deviceId === selectedDevice
                            ? 'bg-forest-950/60 text-forest-400'
                            : 'text-charcoal-300 hover:bg-charcoal-800 hover:text-white'}`}
                      >
                        {d.label || `Camera ${i + 1}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Status chip */}
            <div className={`ml-auto flex items-center space-x-1.5 px-3 py-1.5 rounded border text-[10px] font-mono font-bold
              ${isActive ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400'
                : camState === 'requesting' ? 'bg-yellow-950/40 border-yellow-800/50 text-yellow-400'
                : camState === 'denied' ? 'bg-red-950/40 border-red-800/50 text-red-400'
                : 'bg-charcoal-900 border-charcoal-700 text-charcoal-500'}`}>
              <Eye className="w-3 h-3" />
              <span>
                {camState === 'idle' ? 'AWAITING START' :
                 camState === 'requesting' ? 'REQUESTING...' :
                 camState === 'active' ? 'VISION ACTIVE' :
                 camState === 'denied' ? 'PERMISSION DENIED' :
                 camState === 'stopped' ? 'STOPPED' : 'ERROR'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Right Panel ───────────────────────────────────────────────────── */}
        <div className="flex flex-col space-y-4">

          {/* Detection bands */}
          <GlassCard hoverGlow={false}>
            <div className="pb-2 border-b border-charcoal-800/40 mb-3 flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-forest-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Pixel Analysis</h4>
            </div>
            <div className="space-y-4 py-1">
              {bands.map((band) => (
                <div key={band.label}>
                  <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                    <span className="font-semibold text-white">{band.label}</span>
                    <span className={`${band.textColor} font-bold`}>{band.value.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-charcoal-950 border border-charcoal-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${band.barColor}`}
                      style={{ width: `${band.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {!isActive && (
              <p className="text-[10px] text-charcoal-600 font-mono text-center mt-3 pt-2 border-t border-charcoal-800/30">
                Start the camera to see live readings
              </p>
            )}
          </GlassCard>

          {/* Event log */}
          <GlassCard className="flex-1 flex flex-col" hoverGlow={false}>
            <div className="pb-2 border-b border-charcoal-800/40 mb-3 flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-forest-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Vision Event Log</h4>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[260px] space-y-3 pr-1 font-mono text-[10px]">
              {events.length === 0 && (
                <p className="text-charcoal-600 text-center py-6">
                  {isActive ? 'Monitoring… No events yet' : 'Start feed to log events'}
                </p>
              )}
              {events.map((ev) => (
                <div key={ev.id} className="border-l pl-3 relative border-charcoal-800">
                  <span className={`absolute -left-[3.5px] top-1.5 w-1.5 h-1.5 rounded-full
                    ${ev.severity === 'critical' ? 'bg-red-500 animate-pulse' :
                      ev.severity === 'high' ? 'bg-orange-500' : 'bg-forest-500'}`}
                  />
                  <div className="flex justify-between text-charcoal-500 font-bold">
                    <span>{ev.ts}</span>
                    <span className={ev.severity === 'critical' ? 'text-red-400' : ev.severity === 'high' ? 'text-orange-400' : 'text-forest-400'}>
                      {ev.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-white font-semibold mt-0.5">{ev.label}</p>
                  <p className="text-charcoal-400 text-[9px] leading-relaxed mt-0.5">{ev.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-2 border-t border-charcoal-800/40 text-[9px] text-charcoal-600 font-mono text-center">
              AETHER VISION CONTROLLER · PIXEL ANALYSIS MODE
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitoring;
