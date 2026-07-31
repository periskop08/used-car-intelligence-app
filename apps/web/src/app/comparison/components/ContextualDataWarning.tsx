import React from 'react';
import { DataWarning } from '@used-car-intelligence/shared';

interface ContextualDataWarningProps {
  warnings?: DataWarning[];
  section: 'TECHNICAL' | 'RELIABILITY' | 'OWNERSHIP' | 'RESALE' | 'COMFORT' | 'GENERAL';
  vehicleId?: string;
}

export const ContextualDataWarning: React.FC<ContextualDataWarningProps> = ({ warnings, section, vehicleId }) => {
  if (!warnings || warnings.length === 0) return null;

  const filtered = warnings.filter(
    w => w.section === section && (!vehicleId || !w.vehicleId || w.vehicleId === vehicleId)
  );

  if (filtered.length === 0) return null;

  return (
    <div className="space-y-2 my-2">
      {filtered.map((w, i) => (
        <div key={i} className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs p-3 rounded-xl flex items-center gap-2">
          <span>ℹ️</span>
          <span>{w.message}</span>
        </div>
      ))}
    </div>
  );
};
