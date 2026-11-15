import React from 'react';
import GlassCard from './GlassCard';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  headerActions?: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  headerActions
}) => {
  return (
    <GlassCard className={`flex flex-col ${className}`}>
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-charcoal-800/40">
        <div>
          <h4 className="font-semibold text-white text-sm tracking-wide uppercase">{title}</h4>
          {subtitle && <p className="text-xs text-charcoal-450 mt-0.5">{subtitle}</p>}
        </div>
        {headerActions && <div className="flex items-center space-x-2">{headerActions}</div>}
      </div>
      <div className="flex-1 w-full min-h-[220px] flex items-center justify-center">
        {children}
      </div>
    </GlassCard>
  );
};

export default ChartCard;
