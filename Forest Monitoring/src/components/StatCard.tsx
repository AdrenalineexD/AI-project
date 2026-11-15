import React from 'react';
import GlassCard from './GlassCard';
import StatusBadge from './StatusBadge';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  statusText?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  statusText,
  trend,
  className = ''
}) => {
  return (
    <GlassCard className={`flex flex-col justify-between min-h-[140px] ${className}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-bold tracking-tight text-white mt-2 font-mono">{value}</h3>
        </div>
        <div className="p-2 bg-charcoal-800/80 rounded border border-charcoal-700/50 text-forest-400">
          {icon}
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center mt-4 pt-2 border-t border-charcoal-800/60 text-xs">
        <div className="flex items-center space-x-2">
          {statusText && <StatusBadge status={statusText} />}
          {subtitle && <span className="text-charcoal-400">{subtitle}</span>}
        </div>

        {trend && (
          <span
            className={`font-semibold font-mono ${
              trend.isPositive ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
    </GlassCard>
  );
};

export default StatCard;
