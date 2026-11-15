import React from 'react';

interface TimelineItem {
  id?: string;
  timestamp: string;
  event: string;
  source?: string;
  details?: string;
  severity?: 'Critical' | 'High' | 'Medium' | 'Low' | 'Normal';
}

interface TimelineProps {
  items: TimelineItem[];
  maxItems?: number;
}

export const Timeline: React.FC<TimelineProps> = ({ items, maxItems }) => {
  const displayedItems = maxItems ? items.slice(0, maxItems) : items;

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-500 border-red-950';
      case 'High':
        return 'bg-orange-500 border-orange-950';
      case 'Medium':
        return 'bg-yellow-500 border-yellow-950';
      case 'Low':
        return 'bg-blue-500 border-blue-950';
      case 'Normal':
      default:
        return 'bg-emerald-500 border-emerald-950';
    }
  };

  return (
    <div className="relative border-l border-charcoal-800 ml-2.5 pl-6 space-y-5 text-xs py-1">
      {displayedItems.map((item, idx) => (
        <div key={item.id || idx} className="relative">
          {/* Timeline Dot */}
          <span className={`absolute -left-[30px] top-1 flex h-2 w-2 items-center justify-center rounded-full border-2 ${getSeverityColor(item.severity)}`} />

          <div className="flex flex-col space-y-1">
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="font-bold text-white text-xs font-mono">{item.timestamp}</span>
              <span className="text-charcoal-200 font-semibold text-xs">{item.event}</span>
              {item.source && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-charcoal-950 text-charcoal-400 border border-charcoal-850 font-mono">
                  {item.source}
                </span>
              )}
            </div>
            {item.details && (
              <p className="text-charcoal-400 text-xs leading-relaxed max-w-2xl">{item.details}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Timeline;
