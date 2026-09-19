'use client';

import React from 'react';

export type VehicleSearchMode = 'AUTOMOBILE' | 'MOTORCYCLE';

interface VehicleSearchModeSelectorProps {
  value: VehicleSearchMode;
  onChange: (mode: VehicleSearchMode) => void;
  className?: string;
}

export const VehicleSearchModeSelector: React.FC<VehicleSearchModeSelectorProps> = ({
  value,
  onChange,
  className = '',
}) => {
  return (
    <div
      role="group"
      aria-label="Taşıt Türü Seçimi"
      className={`flex items-center gap-2.5 ${className}`}
    >
      <button
        type="button"
        role="button"
        aria-pressed={value === 'AUTOMOBILE'}
        onClick={() => onChange('AUTOMOBILE')}
        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
          value === 'AUTOMOBILE'
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-orange-500/25 border border-amber-400/30 font-bold'
            : 'bg-white/[0.04] text-slate-300 border border-white/10 hover:bg-white/[0.08] hover:text-white font-semibold'
        }`}
      >
        Otomobil
      </button>

      <button
        type="button"
        role="button"
        aria-pressed={value === 'MOTORCYCLE'}
        onClick={() => onChange('MOTORCYCLE')}
        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
          value === 'MOTORCYCLE'
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-orange-500/25 border border-amber-400/30 font-bold'
            : 'bg-white/[0.04] text-slate-300 border border-white/10 hover:bg-white/[0.08] hover:text-white font-semibold'
        }`}
      >
        Motosiklet
      </button>
    </div>
  );
};
