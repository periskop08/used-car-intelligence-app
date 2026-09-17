"use client";

import React, { useState, useRef, useEffect } from "react";
import { CANONICAL_TURKEY_CITIES } from "@used-car-intelligence/shared";
import { useGlobalCity } from "../../context/GlobalCityContext";

interface GlobalCitySelectorProps {
  compact?: boolean;
  className?: string;
  onSelectCallback?: () => void;
}

export default function GlobalCitySelector({
  compact = false,
  className = "",
  onSelectCallback,
}: GlobalCitySelectorProps) {
  const { activeCityId, activeCityName, setActiveCity, errorMessage, clearError } = useGlobalCity();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Auto focus search input
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const filteredCities = CANONICAL_TURKEY_CITIES.filter((c) => {
    const q = searchQuery.trim().toLocaleLowerCase("tr-TR");
    if (!q) return true;
    return (
      c.name.toLocaleLowerCase("tr-TR").includes(q) ||
      c.plateCode.toString().includes(q) ||
      c.id.toLocaleLowerCase("tr-TR").includes(q)
    );
  });

  const handleSelectCity = async (cityId: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    await setActiveCity(cityId);
    setIsOpen(false);
    setSearchQuery("");
    if (onSelectCallback) {
      onSelectCallback();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`flex items-center gap-1.5 transition rounded-xl font-medium cursor-pointer border ${
          activeCityId
            ? "bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
            : "bg-slate-800/80 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
        } ${
          compact
            ? "px-2 py-1 text-[11px]"
            : "px-3 py-1.5 text-xs shadow-sm"
        }`}
        title="Aktif Şehir Seçimi"
      >
        <span className="text-xs">📍</span>
        <span className="font-semibold max-w-[120px] truncate">{activeCityName}</span>
        <span className="text-[8px] opacity-60">▼</span>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-64 bg-[#0a0e17]/98 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl p-2 z-[60] animate-in fade-in slide-in-from-top-2 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-2 py-1.5 border-b border-white/10 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Şehir Seçimi
            </span>
            {activeCityId && (
              <button
                type="button"
                onClick={(e) => handleSelectCity(null, e)}
                className="text-[10px] text-orange-400 hover:text-orange-300 transition underline cursor-pointer"
              >
                Sıfırla
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="p-1.5">
            <input
              ref={inputRef}
              type="text"
              placeholder="İl ara veya plaka..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/60"
            />
          </div>

          {/* Error notice if rollback occurred */}
          {errorMessage && (
            <div className="mx-1.5 mb-1.5 p-2 bg-red-950/80 border border-red-500/30 rounded-xl text-[10px] text-red-300 flex items-center justify-between">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={clearError}
                className="text-slate-400 hover:text-white text-xs ml-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* City Options List */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin scrollbar-thumb-white/10">
            {/* Tüm Türkiye Option */}
            {(!searchQuery || "tüm türkiye".includes(searchQuery.toLowerCase())) && (
              <button
                type="button"
                onClick={(e) => handleSelectCity(null, e)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeCityId === null
                    ? "bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[10px]">🇹🇷</span>
                  <span>Tüm Türkiye</span>
                </div>
                {activeCityId === null && <span className="text-orange-400 text-xs">✓</span>}
              </button>
            )}

            {/* 81 Provinces */}
            {filteredCities.map((city) => {
              const isSelected = activeCityId === city.id;
              return (
                <button
                  key={city.id}
                  type="button"
                  onClick={(e) => handleSelectCity(city.id, e)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer ${
                    isSelected
                      ? "bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500 w-4 text-right">
                      {city.plateCode.toString().padStart(2, "0")}
                    </span>
                    <span>{city.name}</span>
                  </div>
                  {isSelected && <span className="text-orange-400 text-xs">✓</span>}
                </button>
              );
            })}

            {filteredCities.length === 0 && (
              <div className="text-center py-4 text-xs text-slate-500">
                Eşleşen şehir bulunamadı
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
