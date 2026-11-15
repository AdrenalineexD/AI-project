// import React, { useEffect, useRef, useState, useMemo } from "react";
// import { MapContainer, TileLayer, useMap } from "react-leaflet";
// import "leaflet/dist/leaflet.css";
// import { Flame, Layers, Sliders, Activity, ShieldAlert, Sparkles, RefreshCw } from "lucide-react";
// import type { Detection, Incident, GeoPoint } from "../types";

// interface HeatmapViewProps {
//   detections: Detection[];
//   incidents: Incident[];
//   userLocation: GeoPoint;
// }

// type PaletteType = "fire" | "infrared" | "magma" | "nightvision";

// // Palette color configurations
// const PALETTES: Record<PaletteType, { name: string; gradient: string[]; css: string }> = {
//   fire: {
//     name: "Fire Hazard (Default)",
//     gradient: ["rgba(0,0,0,0)", "#0022ff", "#00ffaa", "#ffff00", "#ff3300", "#ffffff"],
//     css: "from-blue-600 via-yellow-400 to-red-600",
//   },
//   infrared: {
//     name: "Infrared Thermal",
//     gradient: ["rgba(0,0,0,0)", "#110022", "#8800ff", "#ff00aa", "#ffaa00", "#ffffff"],
//     css: "from-purple-800 via-pink-500 to-amber-300",
//   },
//   magma: {
//     name: "Magma Spectrum",
//     gradient: ["rgba(0,0,0,0)", "#1a0826", "#51127c", "#b63679", "#fb8861", "#fcfdbf"],
//     css: "from-purple-950 via-rose-600 to-yellow-200",
//   },
//   nightvision: {
//     name: "Thermal Nightvision",
//     gradient: ["rgba(0,0,0,0)", "#002b1c", "#008855", "#00ff88", "#aaffff", "#ffffff"],
//     css: "from-emerald-950 via-emerald-400 to-cyan-100",
//   },
// };

// // ----------------------------------------------------------------------
// // Leaflet Custom Canvas Heatmap Overlay Layer
// // ----------------------------------------------------------------------
// function HeatmapCanvasLayer({
//   points,
//   radius,
//   blur,
//   opacity,
//   palette,
// }: {
//   points: { lat: number; lon: number; weight: number }[];
//   radius: number;
//   blur: number;
//   opacity: number;
//   palette: PaletteType;
// }) {
//   const map = useMap();
//   const canvasRef = useRef<HTMLCanvasElement | null>(null);

//   useEffect(() => {
//     const canvas = document.createElement("canvas");
//     canvas.style.position = "absolute";
//     canvas.style.top = "0";
//     canvas.style.left = "0";
//     canvas.style.pointerEvents = "none";
//     canvas.style.zIndex = "400";
//     canvasRef.current = canvas;

//     const pane = map.getPanes().overlayPane;
//     pane.appendChild(canvas);

//     // Create palette gradient lookup canvas (1 x 256)
//     const paletteCanvas = document.createElement("canvas");
//     paletteCanvas.width = 1;
//     paletteCanvas.height = 256;
//     const pCtx = paletteCanvas.getContext("2d");
//     if (pCtx) {
//       const gradConfig = PALETTES[palette].gradient;
//       const grad = pCtx.createLinearGradient(0, 0, 0, 256);
//       gradConfig.forEach((color, idx) => {
//         grad.addColorStop(idx / (gradConfig.length - 1), color);
//       });
//       pCtx.fillStyle = grad;
//       pCtx.fillRect(0, 0, 1, 256);
//     }
//     const paletteImg = pCtx?.getImageData(0, 0, 1, 256).data;

//     const draw = () => {
//       if (!canvasRef.current || !paletteImg) return;

//       const size = map.getSize();
//       const bounds = map.getBounds();

//       canvas.width = size.x;
//       canvas.height = size.y;

//       const topLeft = map.latLngToLayerPoint(bounds.getNorthWest());
//       canvas.style.transform = `translate3d(${topLeft.x}px, ${topLeft.y}px, 0)`;

//       const ctx = canvas.getContext("2d");
//       if (!ctx) return;

//       ctx.clearRect(0, 0, size.x, size.y);

//       // Create alpha mask canvas
//       const maskCanvas = document.createElement("canvas");
//       maskCanvas.width = size.x;
//       maskCanvas.height = size.y;
//       const mCtx = maskCanvas.getContext("2d");
//       if (!mCtx) return;

//       points.forEach((pt) => {
//         const pixelPoint = map.latLngToContainerPoint([pt.lat, pt.lon]);

//         const rad = radius;
//         const grad = mCtx.createRadialGradient(
//           pixelPoint.x,
//           pixelPoint.y,
//           rad * blur,
//           pixelPoint.x,
//           pixelPoint.y,
//           rad
//         );
//         grad.addColorStop(0, `rgba(0,0,0,${Math.min(1, pt.weight)})`);
//         grad.addColorStop(1, "rgba(0,0,0,0)");

//         mCtx.fillStyle = grad;
//         mCtx.beginPath();
//         mCtx.arc(pixelPoint.x, pixelPoint.y, rad, 0, Math.PI * 2);
//         mCtx.fill();
//       });

//       // Colorize mask with thermal palette
//       const maskData = mCtx.getImageData(0, 0, size.x, size.y);
//       const pixels = maskData.data;

//       for (let i = 0; i < pixels.length; i += 4) {
//         const alpha = pixels[i + 3];
//         if (alpha > 0) {
//           const paletteIdx = alpha * 4;
//           pixels[i] = paletteImg[paletteIdx];
//           pixels[i + 1] = paletteImg[paletteIdx + 1];
//           pixels[i + 2] = paletteImg[paletteIdx + 2];
//           pixels[i + 3] = Math.min(255, alpha * opacity);
//         }
//       }

//       ctx.putImageData(maskData, 0, 0);
//     };

//     draw();

//     map.on("move zoom resize", draw);

//     return () => {
//       map.off("move zoom resize", draw);
//       if (canvasRef.current && pane.contains(canvasRef.current)) {
//         pane.removeChild(canvasRef.current);
//       }
//     };
//   }, [map, points, radius, blur, opacity, palette]);

//   return null;
// }

// export const HeatmapView: React.FC<HeatmapViewProps> = ({
//   detections,
//   incidents,
//   userLocation,
// }) => {
//   const [radius, setRadius] = useState<number>(35);
//   const [blur, setBlur] = useState<number>(0.2);
//   const [opacity, setOpacity] = useState<number>(0.85);
//   const [palette, setPalette] = useState<PaletteType>("fire");
//   const [minConfidence, setMinConfidence] = useState<number>(0.3);

//   // Synthesize weighted points from detections & incidents
//   const heatPoints = useMemo(() => {
//     const pts: { lat: number; lon: number; weight: number }[] = [];

//     // From detections
//     detections.forEach((d) => {
//       if (d.confidence >= minConfidence) {
//         const w = d.class.includes("fire") ? d.confidence * 1.2 : d.confidence * 0.8;
//         pts.push({ lat: d.location.lat, lon: d.location.lon, weight: w });
//       }
//     });

//     // From incidents
//     incidents.forEach((inc) => {
//       const w = (inc.severity + 1) / 5;
//       pts.push({ lat: inc.location.lat, lon: inc.location.lon, weight: w });
//     });

//     // Default fallback hotspots around user if empty
//     if (pts.length === 0) {
//       const baseLat = userLocation.lat || 19.076;
//       const baseLon = userLocation.lon || 72.8777;
//       pts.push(
//         { lat: baseLat + 0.02, lon: baseLon + 0.03, weight: 0.95 },
//         { lat: baseLat - 0.015, lon: baseLon - 0.02, weight: 0.75 },
//         { lat: baseLat + 0.04, lon: baseLon - 0.01, weight: 0.85 },
//         { lat: baseLat - 0.03, lon: baseLon + 0.025, weight: 0.6 }
//       );
//     }

//     return pts;
//   }, [detections, incidents, userLocation, minConfidence]);

//   const center: [number, number] = [userLocation.lat || 19.076, userLocation.lon || 72.8777];

//   return (
//     <div className="wf-page flex flex-col space-y-4">
//       {/* Page Header */}
//       <div className="wf-page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <div className="wf-kicker text-red-400 font-mono text-xs font-semibold uppercase tracking-wider">
//             ANALYTICAL GEOSPATIAL INTELLIGENCE
//           </div>
//           <h1 className="wf-h1 text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
//             <Flame className="w-7 h-7 text-orange-500 animate-pulse" />
//             <span>Accurate Wildfire Thermal Heatmap</span>
//           </h1>
//           <div className="wf-sub text-xs text-slate-400">
//             Real-time heat accumulation density calculated from optical detections and severity models.
//           </div>
//         </div>

//         {/* Heatmap summary stats */}
//         <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl text-xs font-mono">
//           <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg">
//             <Activity className="w-4 h-4" />
//             <span>{heatPoints.length} Heat Signals</span>
//           </div>
//           <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg">
//             <ShieldAlert className="w-4 h-4" />
//             <span>High Risk Cluster</span>
//           </div>
//         </div>
//       </div>

//       {/* Main Grid: Controls + Map */}
//       <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
//         {/* Controls Sidebar */}
//         <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-5 shadow-xl">
//           <div className="flex items-center gap-2 text-sm font-bold text-slate-200 border-b border-slate-800 pb-3">
//             <Sliders className="w-4 h-4 text-amber-400" />
//             <span>Heatmap Configuration</span>
//           </div>

//           {/* Palette Selector */}
//           <div className="space-y-2">
//             <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
//               <Layers className="w-3.5 h-3.5 text-orange-400" />
//               <span>Thermal Palette</span>
//             </label>
//             <div className="grid grid-cols-2 gap-2">
//               {(Object.keys(PALETTES) as PaletteType[]).map((pKey) => (
//                 <button
//                   key={pKey}
//                   onClick={() => setPalette(pKey)}
//                   className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex flex-col gap-1 ${palette === pKey
//                       ? "bg-amber-500/20 text-amber-300 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
//                       : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700"
//                     }`}
//                 >
//                   <span>{PALETTES[pKey].name.split(" ")[0]}</span>
//                   <div className={`w-full h-2 rounded-full bg-gradient-to-r ${PALETTES[pKey].css}`} />
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Radius Slider */}
//           <div className="space-y-1.5">
//             <div className="flex justify-between text-xs font-mono">
//               <span className="text-slate-300">Heat Radius</span>
//               <span className="text-amber-400 font-bold">{radius}px</span>
//             </div>
//             <input
//               type="range"
//               min="10"
//               max="80"
//               value={radius}
//               onChange={(e) => setRadius(Number(e.target.value))}
//               className="w-full accent-orange-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
//             />
//           </div>

//           {/* Blur Control */}
//           <div className="space-y-1.5">
//             <div className="flex justify-between text-xs font-mono">
//               <span className="text-slate-300">Blur Diffusion</span>
//               <span className="text-amber-400 font-bold">{(blur * 100).toFixed(0)}%</span>
//             </div>
//             <input
//               type="range"
//               min="0.05"
//               max="0.5"
//               step="0.05"
//               value={blur}
//               onChange={(e) => setBlur(Number(e.target.value))}
//               className="w-full accent-orange-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
//             />
//           </div>

//           {/* Opacity Control */}
//           <div className="space-y-1.5">
//             <div className="flex justify-between text-xs font-mono">
//               <span className="text-slate-300">Thermal Opacity</span>
//               <span className="text-amber-400 font-bold">{(opacity * 100).toFixed(0)}%</span>
//             </div>
//             <input
//               type="range"
//               min="0.2"
//               max="1.0"
//               step="0.05"
//               value={opacity}
//               onChange={(e) => setOpacity(Number(e.target.value))}
//               className="w-full accent-orange-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
//             />
//           </div>

//           {/* Confidence Filter */}
//           <div className="space-y-1.5">
//             <div className="flex justify-between text-xs font-mono">
//               <span className="text-slate-300">Min Confidence Filter</span>
//               <span className="text-amber-400 font-bold">{(minConfidence * 100).toFixed(0)}%</span>
//             </div>
//             <input
//               type="range"
//               min="0.1"
//               max="0.9"
//               step="0.05"
//               value={minConfidence}
//               onChange={(e) => setMinConfidence(Number(e.target.value))}
//               className="w-full accent-orange-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
//             />
//           </div>
//         </div>

//         {/* Map Canvas Container */}
//         <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden relative shadow-2xl h-[560px]">
//           <MapContainer
//             center={center}
//             zoom={12}
//             style={{ height: "100%", width: "100%" }}
//             className="w-full h-full"
//           >
//             <TileLayer
//               attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
//               url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
//             />
//             <HeatmapCanvasLayer
//               points={heatPoints}
//               radius={radius}
//               blur={blur}
//               opacity={opacity}
//               palette={palette}
//             />
//           </MapContainer>
//         </div>
//       </div>
//     </div>
//   );
// };
// frontend/src/components/HeatmapView.tsx
import React, { useMemo } from "react";
import { MapContainer, TileLayer, Circle, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Detection, Incident, GeoPoint } from "../types";

interface HeatmapViewProps {
  detections: Detection[];
  incidents: Incident[];
  userLocation: GeoPoint;
}

interface HeatCell {
  lat: number;
  lon: number;
  weight: number;
  count: number;
  classes: Record<string, number>;
}

export const HeatmapView: React.FC<HeatmapViewProps> = ({
  detections,
  incidents,
  userLocation,
}) => {
  const cells: HeatCell[] = useMemo(() => {
    const GRID = 0.02;
    const now = Date.now();
    const HALF_LIFE_MS = 15 * 60 * 1000;
    const grid: Record<string, HeatCell> = {};

    const add = (loc: GeoPoint | undefined, weight: number, cls: string, ts: string) => {
      if (!loc || typeof loc.lat !== "number" || typeof loc.lon !== "number") return;
      const gx = Math.round(loc.lat / GRID) * GRID;
      const gy = Math.round(loc.lon / GRID) * GRID;
      const key = `${gx.toFixed(3)}|${gy.toFixed(3)}`;
      const ageMs = now - new Date(ts).getTime();
      const decay = Math.pow(0.5, ageMs / HALF_LIFE_MS);
      const w = weight * decay;
      if (!grid[key]) grid[key] = { lat: gx, lon: gy, weight: 0, count: 0, classes: {} };
      grid[key].weight += w;
      grid[key].count += 1;
      grid[key].classes[cls] = (grid[key].classes[cls] || 0) + 1;
    };

    for (const d of detections) {
      const clsLower = (d.class || "").toLowerCase();
      const w = clsLower === "fire" ? 1.0 : clsLower === "smoke" ? 0.7 : 0.3;
      add(d.location, w * (d.confidence || 0.5), clsLower, d.ts);
    }
    for (const i of incidents) {
      const w = 1.5 + i.severity * 0.4;
      add(i.location, w, i.primary_class, i.created_at);
    }
    return Object.values(grid);
  }, [detections, incidents]);

  const maxWeight = cells.reduce((m, c) => Math.max(m, c.weight), 0) || 1;
  const center: [number, number] = [
    userLocation?.lat ?? 19.076,
    userLocation?.lon ?? 72.8777,
  ];

  return (
    <div className="wf-page">
      <div className="wf-page-header">
        <div>
          <div className="wf-kicker">SPATIO-TEMPORAL</div>
          <h1 className="wf-h1">Thermal Heatmap</h1>
          <div className="wf-sub">
            Cells decay with a 15-minute half-life. Brighter = more recent,
            more corroborated, or higher severity.
          </div>
        </div>
      </div>

      <div className="wf-panel" style={{ padding: 0, overflow: "hidden" }}>
        <MapContainer
          center={center}
          zoom={11}
          style={{ height: 620, width: "100%" }}
          className="wf-map"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {cells.map((c, idx) => {
            const t = c.weight / maxWeight;
            const radius = 400 + t * 2600;
            const color = t > 0.7 ? "#ff2d2d" : t > 0.4 ? "#ff6a3d" : "#ffb703";
            return (
              <Circle
                key={`h-${idx}`}
                center={[c.lat, c.lon]}
                radius={radius}
                pathOptions={{
                  color: "transparent",
                  fillColor: color,
                  fillOpacity: 0.12 + t * 0.35,
                  weight: 0,
                }}
              />
            );
          })}

          {cells.map((c, idx) => (
            <CircleMarker
              key={`m-${idx}`}
              center={[c.lat, c.lon]}
              radius={4}
              pathOptions={{
                color: "#fff",
                fillColor: "#ff6a3d",
                fillOpacity: 0.85,
                weight: 1,
              }}
            >
              <Popup>
                <div className="wf-popup">
                  <strong>{c.count} event{c.count > 1 ? "s" : ""}</strong>
                  <div>Weight: {c.weight.toFixed(2)}</div>
                  <div>
                    {Object.entries(c.classes)
                      .map(([k, v]) => `${k}×${v}`)
                      .join(" · ")}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          <CircleMarker
            center={center}
            radius={6}
            pathOptions={{
              color: "#00f0ff",
              fillColor: "#00f0ff",
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>Your location</Popup>
          </CircleMarker>
        </MapContainer>
      </div>

      {cells.length === 0 && (
        <div className="wf-panel">
          <div className="wf-empty">
            No detections yet. Start the camera or run the demo scenario.
          </div>
        </div>
      )}
    </div>
  );
};

export default HeatmapView;