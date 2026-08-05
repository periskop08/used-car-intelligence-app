"use client";

import React from "react";

interface ListingFiltersProps {
  urgentOnly: boolean;
  onUrgentOnlyChange: (val: boolean) => void;
  className?: string;
}

export default function ListingFilters({
  urgentOnly,
  onUrgentOnlyChange,
  className = "",
}: ListingFiltersProps) {
  return (
    <div className={`p-4 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-3 ${className}`}>
      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300 block">Özel İlan Filtreleri</span>

      {/* Urgent Only Filter Checkbox */}
      <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-red-500/20 hover:border-red-500/40 transition cursor-pointer select-none">
        <input
          type="checkbox"
          checked={urgentOnly}
          onChange={(e) => onUrgentOnlyChange(e.target.checked)}
          className="w-4 h-4 accent-red-600 rounded cursor-pointer"
        />
        <div className="flex flex-col">
          <span className="text-xs font-bold text-red-400 flex items-center gap-1">
            <span>🚨</span> Sadece acil ilanları göster
          </span>
          <span className="text-[10px] text-slate-400">Hızlı satış amacıyla işaretlenmiş araçlar</span>
        </div>
      </label>
    </div>
  );
}
