import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverGlow?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick, hoverGlow = true }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-charcoal-900/50 backdrop-blur-md border border-charcoal-800/50 rounded p-5 shadow-xl transition-all duration-300 ${
        hoverGlow ? 'hover:border-forest-700/40 hover:shadow-[0_0_15px_rgba(39,146,76,0.08)]' : ''
      } ${onClick ? 'cursor-pointer hover:bg-charcoal-800/40' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
export default GlassCard;
