import React from 'react';

interface DataTableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}

export const DataTable: React.FC<DataTableProps> = ({ headers, children, className = '' }) => {
  return (
    <div className={`w-full overflow-x-auto border border-charcoal-850 rounded bg-charcoal-900/30 backdrop-blur-sm ${className}`}>
      <table className="min-w-full divide-y divide-charcoal-800/60 text-left text-sm">
        <thead className="bg-charcoal-950/70 text-xs font-semibold text-charcoal-400 uppercase tracking-wider">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-6 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-charcoal-800/30 text-charcoal-200">
          {children}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
