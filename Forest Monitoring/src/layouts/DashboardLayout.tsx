import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  Menu, X, Bell, Search, Cpu, ShieldCheck, 
  LayoutDashboard, Video, Map, Flame, TreePine, 
  Radio, AlertTriangle, BarChart3, FileText, Settings, User,
  Zap, ExternalLink
} from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import CommandPalette from '../components/CommandPalette';
import SimulationController from '../components/SimulationController';

export const DashboardLayout: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  const location = useLocation();
  const { alerts, toasts, removeToast } = useDashboard();

  // Tick clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Sidebar Nav Items
  const navItems = [
    { name: 'Overview', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: 'Live Monitoring', path: '/live', icon: <Video className="w-4 h-4" /> },
    { name: 'Forest Map', path: '/map', icon: <Map className="w-4 h-4" /> },
    { name: 'Fire Intelligence', path: '/fire-intelligence', icon: <Flame className="w-4 h-4" /> },
    { name: 'Deforestation', path: '/deforestation', icon: <TreePine className="w-4 h-4" /> },
    { name: 'IoT Sensors', path: '/sensors', icon: <Radio className="w-4 h-4" /> },
    { name: 'Alerts', path: '/alerts', icon: <AlertTriangle className="w-4 h-4" />, badge: alerts.filter(a => a.status === 'New').length },
    { name: 'Analytics', path: '/analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { name: 'Reports', path: '/reports', icon: <FileText className="w-4 h-4" /> },
    { name: 'Settings', path: '/settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const commandNavItems = [
    { name: 'Command Center', path: '/command-center', icon: <Zap className="w-4 h-4" />, badge: 0 },
  ];

  const getPageTitle = (path: string) => {
    const matched = navItems.find(item => item.path === path);
    return matched ? matched.name : 'AETHER Command Center';
  };

  const activeAlertsCount = alerts.filter(a => a.status === 'New' || a.status === 'Investigating').length;

  return (
    <div className="min-h-screen bg-charcoal-950 text-white font-sans flex flex-col md:flex-row overflow-x-hidden">
      
      {/* 1. Mobile Top Nav Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-charcoal-900 border-b border-charcoal-800 z-30 w-full">
        <div className="flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-forest-400" />
          <span className="font-bold tracking-widest text-sm text-white font-mono">AETHER AI</span>
        </div>
        <button 
          onClick={() => setIsMobileOpen(!isMobileOpen)} 
          className="p-1 text-charcoal-400 hover:text-white rounded hover:bg-charcoal-800"
        >
          {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* 2. Sidebar Layout (Persistent Desktop / Drawer Mobile) */}
      <aside className={`
        fixed inset-y-0 left-0 transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 transition-transform duration-250 ease-in-out
        w-60 bg-charcoal-900 border-r border-charcoal-800/80 flex flex-col justify-between z-40 
        md:flex-shrink-0 h-screen overflow-y-auto
      `}>
        {/* Sidebar Logo */}
        <div>
          <div className="px-6 py-5 border-b border-charcoal-800/50 flex items-center space-x-3 bg-charcoal-950/40">
            <Cpu className="w-6 h-6 text-forest-400 animate-pulse" />
            <div>
              <h1 className="font-black tracking-widest text-base text-white font-mono">AETHER</h1>
              <p className="text-[9px] text-charcoal-450 tracking-wider font-mono">FOREST MONITORING AI</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    flex items-center justify-between px-3 py-2 rounded text-xs font-medium tracking-wide transition-all duration-150
                    ${isActive 
                      ? 'bg-forest-950 text-white border-l-2 border-forest-500 font-semibold shadow-[inset_0_0_12px_rgba(39,146,76,0.06)]' 
                      : 'text-charcoal-300 hover:bg-charcoal-850 hover:text-white'}
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <span className={isActive ? 'text-forest-400' : 'text-charcoal-400'}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono bg-red-950/60 text-red-400 border border-red-800/30">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}

            {/* Separator */}
            <div className="pt-2 pb-1">
              <p className="px-3 text-[9px] text-charcoal-600 uppercase tracking-widest font-mono font-bold">AI Backend</p>
            </div>

            {commandNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    flex items-center justify-between px-3 py-2 rounded text-xs font-medium tracking-wide transition-all duration-150
                    ${isActive 
                      ? 'bg-amber-950/60 text-white border-l-2 border-amber-500 font-semibold' 
                      : 'text-charcoal-300 hover:bg-charcoal-850 hover:text-white'}
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <span className={isActive ? 'text-amber-400' : 'text-amber-600'}>{item.icon}</span>
                    <span>{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-charcoal-800/50 bg-charcoal-950/30 font-mono text-[10px]">
          <div className="flex items-center space-x-2 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="font-bold tracking-wider">SYSTEM ONLINE</span>
          </div>
          <div className="mt-2 text-charcoal-450 leading-relaxed">
            <p className="font-bold text-charcoal-300">AETHER AI ENGINE</p>
            <p>Scanning 12,480 km²</p>
          </div>
          <Link
            to="/landing"
            className="mt-3 flex items-center space-x-1.5 text-amber-600 hover:text-amber-400 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span>View Landing Page</span>
          </Link>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header Controls (Desktop) */}
        <header className="hidden md:flex items-center justify-between px-6 py-3.5 bg-charcoal-900 border-b border-charcoal-800/80 z-20">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">{getPageTitle(location.pathname)}</h2>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="text-[10px] text-charcoal-450 uppercase tracking-widest font-mono">AETHER UI /</span>
              <span className="text-[10px] text-forest-400 uppercase tracking-widest font-mono font-semibold">
                {location.pathname === '/' ? 'Overview' : location.pathname.substring(1).replace('-', ' ')}
              </span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center space-x-5">
            {/* Live Clock */}
            <div className="text-right font-mono text-[11px] text-charcoal-400 border-r border-charcoal-800 pr-5 select-none">
              <span className="text-white font-bold">{formatDate(time)}</span>
              <span className="mx-2 text-charcoal-600">|</span>
              <span className="text-forest-400 font-semibold">{formatTime(time)}</span>
            </div>

            {/* Quick Search */}
            <div 
              onClick={() => {
                const event = new KeyboardEvent('keydown', { ctrlKey: true, key: 'k' });
                window.dispatchEvent(event);
              }}
              className="relative cursor-pointer group flex items-center space-x-2 bg-charcoal-950/80 border border-charcoal-800 rounded px-2.5 py-1 text-charcoal-450 hover:border-charcoal-700/80 transition-all w-48 text-left"
            >
              <Search className="w-3.5 h-3.5 text-charcoal-400 group-hover:text-white" />
              <span className="text-xs text-charcoal-450 select-none group-hover:text-charcoal-300">Search commands...</span>
              <span className="absolute right-2 px-1 py-0.5 rounded text-[8px] bg-charcoal-800 text-charcoal-400 font-mono">Ctrl+K</span>
            </div>

            {/* Diagnostic Alert Indicator */}
            <div className="flex items-center space-x-2 bg-charcoal-950/60 border border-charcoal-800/85 px-3 py-1 rounded select-none">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-bold font-mono tracking-wider">ALL SYSTEMS OPERATIONAL</span>
            </div>

            {/* Notification Bell */}
            <Link 
              to="/alerts" 
              className="relative p-1.5 bg-charcoal-800/60 border border-charcoal-700/50 hover:bg-charcoal-700 rounded text-charcoal-350 hover:text-white transition-colors"
            >
              <Bell className="w-4 h-4" />
              {activeAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-charcoal-900 animate-pulse"></span>
              )}
            </Link>

            {/* Profile Avatar */}
            <div className="flex items-center space-x-2.5 pl-1">
              <div className="w-7 h-7 rounded bg-charcoal-800 border border-charcoal-750 flex items-center justify-center text-forest-400">
                <User className="w-4 h-4" />
              </div>
              <div className="text-left font-mono">
                <p className="text-[10px] font-bold leading-none text-white">OP-E71</p>
                <p className="text-[8px] text-charcoal-500 mt-0.5 leading-none">Duty Operator</p>
              </div>
            </div>
          </div>
        </header>

        {/* 3. Main Route Scroll Container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-charcoal-950 text-charcoal-200">
          <Outlet />
        </main>
      </div>

      {/* Global Utilities */}
      <CommandPalette />
      <SimulationController />

      {/* Dynamic Slide-in Toast Overlay */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none select-none max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              p-3.5 rounded border shadow-xl flex justify-between items-start pointer-events-auto
              transition-all duration-300 transform translate-y-0 opacity-100 animate-slide-in
              ${toast.type === 'error' ? 'bg-red-950/90 border-red-800 text-red-300' : ''}
              ${toast.type === 'warning' ? 'bg-orange-950/90 border-orange-800 text-orange-300' : ''}
              ${toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-800 text-emerald-300' : ''}
              ${toast.type === 'info' ? 'bg-charcoal-900/95 border-charcoal-750 text-white' : ''}
            `}
          >
            <div className="flex items-start space-x-2.5">
              <Cpu className={`w-4.5 h-4.5 mt-0.5 flex-shrink-0 ${
                toast.type === 'error' ? 'text-red-400' : 
                toast.type === 'warning' ? 'text-orange-400' : 
                toast.type === 'success' ? 'text-emerald-400' : 'text-forest-400'
              }`} />
              <p className="text-xs font-semibold leading-normal">{toast.message}</p>
            </div>
            <button 
              onClick={() => removeToast(toast.id)} 
              className="p-0.5 hover:bg-charcoal-800 rounded ml-3 text-charcoal-450 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardLayout;
