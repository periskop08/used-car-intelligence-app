'use client';

import React from 'react';
import { Car, Truck, Bike } from 'lucide-react';

export type VehicleSearchMode = 
  | 'AUTOMOBILE' 
  | 'SUV_PICKUP' 
  | 'ELECTRIC' 
  | 'COMMERCIAL' 
  | 'COMMERCIAL_VEHICLE' 
  | 'MOTORCYCLE';

interface VehicleSearchModeSelectorProps {
  value: VehicleSearchMode;
  onChange: (mode: VehicleSearchMode) => void;
  className?: string;
}

const SuvPickupIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 14h18v3a1 1 0 0 1-1 1h-1.5" />
    <path d="M3 14v-3l2.5-4.5A2 2 0 0 1 7.25 5.5h6.5a2 2 0 0 1 1.85 1.25L17 10.5h3a1 1 0 0 1 1 1V14" />
    <path d="M5.5 18h-1A1.5 1.5 0 0 1 3 16.5V14" />
    <circle cx="7.5" cy="18" r="2.5" />
    <circle cx="16.5" cy="18" r="2.5" />
    <path d="M10 18h4" />
  </svg>
);

const MODES: { key: VehicleSearchMode; label: string; Icon: any }[] = [
  { key: 'AUTOMOBILE', label: 'Otomobil', Icon: Car },
  { key: 'SUV_PICKUP', label: 'Arazi, SUV & Pickup', Icon: SuvPickupIcon },
  { key: 'COMMERCIAL', label: 'Minivan & Panelvan', Icon: Truck },
  { key: 'MOTORCYCLE', label: 'Motosiklet', Icon: Bike },
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
      className={`flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none flex-nowrap w-full ${className}`}
    >
      {MODES.map((mode) => {
        const isActive = value === mode.key;
        const Icon = mode.Icon;
        return (
          <button
            key={mode.key}
            type="button"
            role="button"
            aria-pressed={isActive}
            onClick={() => onChange(mode.key)}
            className={`flex-1 min-w-fit flex items-center justify-center gap-2 text-center px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 whitespace-nowrap shrink-0 ${
              isActive
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-orange-500/25 border border-amber-400/30 font-extrabold'
                : 'bg-white/[0.04] text-slate-300 border border-white/10 hover:bg-white/[0.08] hover:text-white font-semibold'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
};
