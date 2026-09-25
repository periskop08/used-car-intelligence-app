'use client';

import React from 'react';

export type VehicleSearchMode = 
  | 'AUTOMOBILE' 
  | 'SUV_PICKUP' 
  | 'ELECTRIC' 
  | 'COMMERCIAL' 
  | 'MOTORCYCLE';

interface VehicleSearchModeSelectorProps {
  value: VehicleSearchMode;
  onChange: (mode: VehicleSearchMode) => void;
  className?: string;
}

const MODES: { key: VehicleSearchMode; label: string; icon: string }[] = [
  { key: 'AUTOMOBILE', label: 'Otomobil', icon: '🚗' },
  { key: 'SUV_PICKUP', label: 'Arazi, SUV & Pickup', icon: '🚙' },
  { key: 'ELECTRIC', label: 'Elektrikli Araçlar', icon: '⚡' },
  { key: 'COMMERCIAL', label: 'Minivan & Panelvan', icon: '🚐' },
  { key: 'MOTORCYCLE', label: 'Motosiklet', icon: '🏍️' },
];

export const VehicleSearchModeSelector: React.FC<VehicleSearchModeSelectorProps> = ({
  value,
  onChange,
  className = '',
}) => {
  return (
    <div
      role="group"
      aria-label="Taşıt Türü Seçimi"
      className={`flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-wrap ${className}`}
    >
      {MODES.map((mode) => {
        const isActive = value === mode.key;
        return (
          <button
            key={mode.key}
            type="button"
            role="button"
            aria-pressed={isActive}
            onClick={() => onChange(mode.key)}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 shrink-0 ${
              isActive
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-orange-500/25 border border-amber-400/30 font-extrabold'
                : 'bg-white/[0.04] text-slate-300 border border-white/10 hover:bg-white/[0.08] hover:text-white font-semibold'
            }`}
          >
            <span>{mode.icon}</span>
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
};
