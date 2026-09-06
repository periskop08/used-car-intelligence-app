"use client";

import React from "react";
import { VEHICLE_COLORS, normalizeVehicleColor, isApprovedVehicleColor } from "@used-car-intelligence/shared";

interface VehicleColorSelectProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  id?: string;
}

export function VehicleColorSelect({
  value,
  onChange,
  disabled = false,
  className = "",
  required = false,
  id,
}: VehicleColorSelectProps) {
  // Normalize value if it's a known equivalent (e.g. "siyah" -> "Siyah")
  const normalizedValue = normalizeVehicleColor(value) || value;
  const isLegacyUnknown = !!value && !isApprovedVehicleColor(value);

  return (
    <div className="relative w-full">
      <select
        id={id}
        value={normalizedValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className={`w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <option value="" disabled className="bg-slate-900 text-slate-500">
          Renk Seçiniz...
        </option>

        {/* If this listing has a legacy historical color, preserve it as an option so state is not lost */}
        {isLegacyUnknown && (
          <option value={value} className="bg-slate-900 text-amber-400">
            {value} (Mevcut / Özel Renk)
          </option>
        )}

        {VEHICLE_COLORS.map((c) => (
          <option key={c} value={c} className="bg-slate-900 text-slate-200">
            {c}
          </option>
        ))}
      </select>

      {/* Down chevron icon */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
