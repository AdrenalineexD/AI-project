import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardProvider } from './context/DashboardContext';
import DashboardLayout from './layouts/DashboardLayout';
import Landing from './pages/Landing';
import Overview from './pages/Overview';
import LiveMonitoring from './pages/LiveMonitoring';
import ForestMap from './pages/ForestMap';
import FireIntelligence from './pages/FireIntelligence';
import Deforestation from './pages/Deforestation';
import IoTSensors from './pages/IoTSensors';
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { CommandCenter } from './pages/CommandCenter';

function App() {
  return (
    <DashboardProvider>
      <BrowserRouter>
        <Routes>
          {/* Full-screen Landing Page (outside dashboard shell) */}
          <Route path="/landing" element={<Landing />} />

          {/* Dashboard shell with sidebar */}
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="live" element={<LiveMonitoring />} />
            <Route path="map" element={<ForestMap />} />
            <Route path="fire-intelligence" element={<FireIntelligence />} />
            <Route path="deforestation" element={<Deforestation />} />
            <Route path="sensors" element={<IoTSensors />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            {/* NEW: Real-time command center backed by Forest-management backend */}
            <Route path="command-center" element={<CommandCenter />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DashboardProvider>
  );
}

export default App;
