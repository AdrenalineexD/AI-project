import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useDashboard } from '../context/DashboardContext';
import { Flame, Cpu, TreePine, Navigation, Eye } from 'lucide-react';
import StatusBadge from './StatusBadge';

interface MapPanelProps {
  height?: string;
  activeFilter?: 'All' | 'Fires' | 'High Risk' | 'IoT' | 'Deforestation' | 'Monitoring Stations';
}

// Custom Leaflet DivIcon Creators to bypass the leaflet default image path bug
const createFireIcon = () => L.divIcon({
  className: 'custom-marker-fire',
  html: `
    <div class="relative flex items-center justify-center w-6 h-6">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
      <span class="relative inline-flex rounded-full h-3 w-3 bg-red-600 border border-white"></span>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const createRiskIcon = () => L.divIcon({
  className: 'custom-marker-risk',
  html: `
    <div class="relative flex items-center justify-center w-5 h-5">
      <span class="absolute inline-flex h-full w-full rounded-full bg-orange-400/20"></span>
      <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500 border border-white"></span>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const createIoTIcon = (online: boolean) => L.divIcon({
  className: 'custom-marker-iot',
  html: `
    <div class="relative flex items-center justify-center w-5 h-5">
      <span class="relative inline-flex rounded-full h-3 w-3 ${online ? 'bg-blue-500' : 'bg-charcoal-600'} border border-white"></span>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const createDeforestationIcon = () => L.divIcon({
  className: 'custom-marker-deforestation',
  html: `
    <div class="relative flex items-center justify-center w-6 h-6">
      <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-yellow-500 border border-white flex items-center justify-center text-[7px] text-black font-bold">D</span>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const createStationIcon = () => L.divIcon({
  className: 'custom-marker-station',
  html: `
    <div class="relative flex items-center justify-center w-5 h-5">
      <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white flex items-center justify-center text-[6px] text-white">★</span>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

export const MapPanel: React.FC<MapPanelProps> = ({ 
  height = '400px', 
  activeFilter = 'All' 
}) => {
  const { fires, sensors, deforestationAlerts } = useDashboard();
  const defaultCenter: [number, number] = [18.5204, 73.8567];

  // Static mock monitoring stations
  const monitoringStations = [
    { id: 'STATION-01', name: 'West Command Tower', lat: 18.5304, lng: 73.8820, range: 2500 },
    { id: 'STATION-02', name: 'Valley Surveillance Station', lat: 18.5090, lng: 73.8410, range: 1800 }
  ];

  return (
    <div className="relative w-full rounded border border-charcoal-800/80 overflow-hidden bg-charcoal-950" style={{ height }}>
      {/* Map Container */}
      <MapContainer 
        center={defaultCenter} 
        zoom={13} 
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', background: '#0d0d0d' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* 1. Fire Markers */}
        {(activeFilter === 'All' || activeFilter === 'Fires') && fires.map((fire) => (
          <React.Fragment key={fire.id}>
            <Marker position={[fire.latitude, fire.longitude]} icon={createFireIcon()}>
              <Popup className="custom-popup">
                <div className="p-2 font-sans text-xs bg-charcoal-900 text-white min-w-[200px]">
                  <div className="flex justify-between items-center pb-1 border-b border-charcoal-800 mb-2">
                    <span className="font-bold text-red-500 font-mono">{fire.id}</span>
                    <StatusBadge status={fire.riskLevel} />
                  </div>
                  <div className="space-y-1 text-charcoal-300 font-mono text-[10px]">
                    <p><span className="text-charcoal-500">Confidence:</span> {fire.confidence}%</p>
                    <p><span className="text-charcoal-500">Detected:</span> {fire.detectedAt}</p>
                    <p><span className="text-charcoal-500">Position:</span> {fire.latitude.toFixed(4)}, {fire.longitude.toFixed(4)}</p>
                    <div className="grid grid-cols-3 gap-1 pt-1.5 mt-1 border-t border-charcoal-800 text-[9px]">
                      <div>
                        <p className="text-charcoal-500">Temp</p>
                        <p className="font-bold text-white">{fire.temperature}°C</p>
                      </div>
                      <div>
                        <p className="text-charcoal-500">Hum</p>
                        <p className="font-bold text-white">{fire.humidity}%</p>
                      </div>
                      <div>
                        <p className="text-charcoal-500">Wind</p>
                        <p className="font-bold text-white">{fire.windSpeed} km/h</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
            {/* Draw threat circle for critical fires */}
            {fire.riskLevel === 'Critical' && (
              <Circle 
                center={[fire.latitude, fire.longitude]} 
                radius={800} 
                pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1, weight: 1 }}
              />
            )}
          </React.Fragment>
        ))}

        {/* 2. High Risk Region Circles */}
        {(activeFilter === 'All' || activeFilter === 'High Risk') && (
          <>
            <Marker position={[18.5350, 73.8650]} icon={createRiskIcon()}>
              <Popup>
                <div className="p-1 text-xs">
                  <span className="font-bold text-orange-400">High Risk Sector G</span>
                  <p className="text-[10px] text-charcoal-400 font-mono mt-1">Elevated FWI due to dry brush accumulation.</p>
                </div>
              </Popup>
            </Marker>
            <Circle 
              center={[18.5350, 73.8650]} 
              radius={1200} 
              pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.08, weight: 1, dashArray: '5,5' }}
            />
          </>
        )}

        {/* 3. IoT Sensor Node Markers */}
        {(activeFilter === 'All' || activeFilter === 'IoT') && sensors.map((sensor) => (
          <Marker key={sensor.id} position={[sensor.latitude, sensor.longitude]} icon={createIoTIcon(sensor.connectivity === 'Online')}>
            <Popup>
              <div className="p-1 font-sans text-xs min-w-[150px]">
                <div className="flex justify-between items-center pb-1 border-b border-charcoal-800">
                  <span className="font-bold text-blue-400 font-mono">{sensor.id}</span>
                  <StatusBadge status={sensor.connectivity} />
                </div>
                <p className="text-[10px] font-semibold mt-1">{sensor.name}</p>
                <div className="mt-1 space-y-0.5 text-[9px] text-charcoal-350 font-mono">
                  <p>Temp: {sensor.connectivity === 'Online' ? `${sensor.temperature}°C` : '--'}</p>
                  <p>Humidity: {sensor.connectivity === 'Online' ? `${sensor.humidity}%` : '--'}</p>
                  <p>Smoke: {sensor.connectivity === 'Online' ? sensor.smokeLevel : '--'}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 4. Deforestation Indicators */}
        {(activeFilter === 'All' || activeFilter === 'Deforestation') && deforestationAlerts.map((def) => (
          <React.Fragment key={def.id}>
            <Marker position={[def.latitude, def.longitude]} icon={createDeforestationIcon()}>
              <Popup>
                <div className="p-1 text-xs min-w-[160px]">
                  <div className="flex justify-between items-center pb-1 border-b border-charcoal-800">
                    <span className="font-bold text-yellow-500 font-mono">{def.id}</span>
                    <StatusBadge status={def.status} />
                  </div>
                  <p className="text-[10px] mt-1 font-medium">{def.region}</p>
                  <p className="text-[9px] text-charcoal-400 mt-0.5">Area Affected: {def.areaKm2} km²</p>
                </div>
              </Popup>
            </Marker>
            <Circle 
              center={[def.latitude, def.longitude]} 
              radius={def.areaKm2 * 300} 
              pathOptions={{ color: '#eab308', fillColor: '#eab308', fillOpacity: 0.12, weight: 1 }}
            />
          </React.Fragment>
        ))}

        {/* 5. Monitoring Command Towers */}
        {(activeFilter === 'All' || activeFilter === 'Monitoring Stations') && monitoringStations.map((station) => (
          <React.Fragment key={station.id}>
            <Marker position={[station.lat, station.lng]} icon={createStationIcon()}>
              <Popup>
                <div className="p-1 text-xs">
                  <span className="font-bold text-emerald-400">{station.name}</span>
                  <p className="text-[9px] font-mono text-charcoal-400 mt-1">Optical YOLO & LiDAR Tower Range: {(station.range / 1000).toFixed(1)} km</p>
                </div>
              </Popup>
            </Marker>
            <Circle 
              center={[station.lat, station.lng]} 
              radius={station.range} 
              pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.03, weight: 0.8, dashArray: '3,6' }}
            />
          </React.Fragment>
        ))}
      </MapContainer>

      {/* Embedded Map Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-charcoal-950/90 border border-charcoal-800/85 backdrop-blur-md rounded px-2.5 py-2 text-[10px] font-mono text-white flex flex-col space-y-1.5 shadow-lg select-none">
        <span className="font-bold border-b border-charcoal-800 pb-1 mb-1 text-[9px] uppercase tracking-wider text-charcoal-400">Map Legend</span>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block border border-white"></span>
          <span>🔴 Active Fire</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block border border-white"></span>
          <span>🟠 High Risk</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block border border-white"></span>
          <span>🟡 Warning / Loss</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block border border-white"></span>
          <span>🔵 IoT Sensor</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block border border-white flex items-center justify-center text-[5px] text-white">★</span>
          <span>🟢 Station</span>
        </div>
      </div>
    </div>
  );
};

export default MapPanel;
