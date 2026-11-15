import React from 'react';

type BadgeType =
  | 'Critical'
  | 'High'
  | 'Medium'
  | 'Low'
  | 'Online'
  | 'Offline'
  | 'New'
  | 'Investigating'
  | 'Confirmed'
  | 'Resolved'
  | 'Active'
  | 'Contained'
  | 'Extinguished'
  | 'Under Review'
  | 'Action Taken'
  | 'Normal'
  | 'Elevated';

interface StatusBadgeProps {
  status: BadgeType | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getStyles = (val: string) => {
    switch (val) {
      case 'Critical':
      case 'Active':
      case 'error':
        return 'bg-red-950/40 text-red-400 border-red-800/40';
      case 'High':
      case 'Elevated':
      case 'warning':
        return 'bg-orange-950/40 text-orange-400 border-orange-800/40';
      case 'Medium':
      case 'Investigating':
      case 'Under Review':
        return 'bg-yellow-950/40 text-yellow-400 border-yellow-800/40';
      case 'Low':
      case 'Resolved':
      case 'Extinguished':
      case 'Action Taken':
        return 'bg-blue-950/40 text-blue-400 border-blue-800/40';
      case 'Online':
      case 'Normal':
      case 'Contained':
      case 'success':
        return 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40';
      case 'Offline':
      default:
        return 'bg-charcoal-800 text-charcoal-400 border-charcoal-700/60';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wider ${getStyles(
        status
      )} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse"></span>
      {status}
    </span>
  );
};

export default StatusBadge;
