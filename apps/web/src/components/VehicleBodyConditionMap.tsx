"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  VEHICLE_BODY_PARTS,
  VehicleBodyPart,
  BODY_PART_LABELS,
  BodyPartStatus,
  BODY_PART_STATUS_LABELS,
  resolveBodyPartStatusMap,
  convertStatusMapToListingArrays,
} from "@used-car-intelligence/shared";

export interface VehicleBodyConditionMapProps {
  mode?: "editable" | "readOnly";
  theme?: "dark" | "light";
  localPaintedParts?: string[];
  paintedParts?: string[];
  changedParts?: string[];
  onChange?: (data: {
    localPaintedParts: string[];
    paintedParts: string[];
    changedParts: string[];
  }) => void;
  className?: string;
  showTitle?: boolean;
}

export function VehicleBodyConditionMap({
  mode = "readOnly",
  theme = "dark",
  localPaintedParts = [],
  paintedParts = [],
  changedParts = [],
  onChange,
  className = "",
  showTitle = true,
}: VehicleBodyConditionMapProps) {
  const isLight = theme === "light";
  const [hoveredPart, setHoveredPart] = useState<string>("");
  const [selectedPartForEdit, setSelectedPartForEdit] = useState<VehicleBodyPart | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setSelectedPartForEdit(null);
      }
    }
    if (selectedPartForEdit) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedPartForEdit]);

  // Use the canonical resolver: listing arrays -> unified status map
  const statusMap = resolveBodyPartStatusMap({
    localPaintedParts,
    paintedParts,
    changedParts,
  });

  const getPartColorClass = (part: VehicleBodyPart) => {
    const status = statusMap[part];
    if (status === BodyPartStatus.REPLACED) {
      if (isLight) {
        return mode === "editable"
          ? "fill-red-500/35 stroke-red-600 hover:fill-red-500/50 cursor-pointer"
          : "fill-red-500/35 stroke-red-600";
      }
      return mode === "editable"
        ? "fill-rose-500/50 stroke-rose-400 hover:fill-rose-500/65 cursor-pointer"
        : "fill-rose-500/50 stroke-rose-400";
    }
    if (status === BodyPartStatus.PAINTED) {
      if (isLight) {
        return mode === "editable"
          ? "fill-blue-500/35 stroke-blue-600 hover:fill-blue-500/50 cursor-pointer"
          : "fill-blue-500/35 stroke-blue-600";
      }
      return mode === "editable"
        ? "fill-blue-500/50 stroke-blue-400 hover:fill-blue-500/65 cursor-pointer"
        : "fill-blue-500/50 stroke-blue-400";
    }
    if (status === BodyPartStatus.LOCAL_PAINTED) {
      if (isLight) {
        return mode === "editable"
          ? "fill-amber-500/35 stroke-amber-600 hover:fill-amber-500/50 cursor-pointer"
          : "fill-amber-500/35 stroke-amber-600";
      }
      return mode === "editable"
        ? "fill-amber-500/45 stroke-amber-400 hover:fill-amber-500/60 cursor-pointer"
        : "fill-amber-500/45 stroke-amber-400";
    }
    // ORIGINAL - default unfilled
    if (isLight) {
      return mode === "editable"
        ? "fill-white stroke-slate-300 hover:fill-slate-100 cursor-pointer"
        : "fill-white stroke-slate-300";
    }
    return mode === "editable"
      ? "fill-[#0a1730]/70 stroke-blue-500/25 hover:fill-[#0f2142] cursor-pointer"
      : "fill-[#0a1730]/70 stroke-blue-500/25";
  };

  const handlePartClick = (part: VehicleBodyPart) => {
    if (mode !== "editable") return;
    setSelectedPartForEdit(part);
  };

  const handleSetPartStatus = (part: VehicleBodyPart, newStatus: BodyPartStatus) => {
    if (!onChange || mode !== "editable") return;

    const newStatusMap = {
      ...statusMap,
      [part]: newStatus,
    };

    const sanitized = convertStatusMapToListingArrays(newStatusMap);
    onChange(sanitized);
    setSelectedPartForEdit(null);
  };

  // Group parts for summary view
  const localPaintedList: VehicleBodyPart[] = [];
  const paintedList: VehicleBodyPart[] = [];
  const replacedList: VehicleBodyPart[] = [];

  for (const part of VEHICLE_BODY_PARTS) {
    const status = statusMap[part];
    if (status === BodyPartStatus.LOCAL_PAINTED) localPaintedList.push(part);
    else if (status === BodyPartStatus.PAINTED) paintedList.push(part);
    else if (status === BodyPartStatus.REPLACED) replacedList.push(part);
  }

  const getHoverStatusText = () => {
    if (!hoveredPart) {
      return mode === "editable"
        ? "Durumu değiştirmek için parçaya tıklayın"
        : "Ekspertiz detayı için parçanın üzerine gelin";
    }
    const partKey = hoveredPart as VehicleBodyPart;
    const partLabel = BODY_PART_LABELS[partKey] || hoveredPart;
    const status = statusMap[partKey];
    const statusLabel = status ? BODY_PART_STATUS_LABELS[status] : "Orijinal";
    return `${partLabel} — ${statusLabel}`;
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {showTitle && (
        <div className="flex flex-col gap-1">
          <span className={`text-xs font-black uppercase tracking-wider ${isLight ? "text-slate-900" : "text-slate-200"}`}>
            Boyalı veya Değişen Parça Görseli
          </span>
          <p className={`text-[11px] ${isLight ? "text-slate-600" : "text-slate-400"}`}>
            {mode === "editable"
              ? "Aracın kaporta durumunu aşağıdaki görsel üzerinden ilgili parçalara tıklayarak seçebilirsiniz."
              : "Aracın ekspertiz ve kaporta durumu şeffaf olarak listelenmiştir."}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className={`flex items-center gap-3.5 text-[10px] font-bold flex-wrap p-2.5 rounded-xl border ${
        isLight
          ? "bg-slate-50 border-slate-200"
          : "bg-[#060e1d]/80 border-blue-500/15"
      }`}>
        <span className={`flex items-center gap-1.5 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
          <span className={`w-2.5 h-2.5 rounded-full inline-block ${
            isLight ? "bg-white border border-slate-300 shadow-xs" : "bg-blue-600/60 border border-blue-400/40 shadow-xs"
          }`} />
          Orijinal
        </span>
        <span className={`flex items-center gap-1.5 ${isLight ? "text-amber-800" : "text-amber-400"}`}>
          <span className={`w-2.5 h-2.5 rounded-full inline-block ${
            isLight ? "bg-amber-100 border border-amber-500 shadow-xs" : "bg-amber-400 shadow-xs"
          }`} />
          Lokal Boyalı
        </span>
        <span className={`flex items-center gap-1.5 ${isLight ? "text-blue-800" : "text-sky-400"}`}>
          <span className={`w-2.5 h-2.5 rounded-full inline-block ${
            isLight ? "bg-blue-100 border border-blue-500 shadow-xs" : "bg-blue-500 shadow-xs"
          }`} />
          Boyalı
        </span>
        <span className={`flex items-center gap-1.5 ${isLight ? "text-red-800" : "text-rose-400"}`}>
          <span className={`w-2.5 h-2.5 rounded-full inline-block ${
            isLight ? "bg-red-100 border border-red-500 shadow-xs" : "bg-rose-500 shadow-xs"
          }`} />
          Değişen
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Sol Kolon: SVG Araç Silüeti Haritası */}
        <div className={`md:col-span-6 flex flex-col items-center justify-center p-3 rounded-2xl border relative ${
          isLight
            ? "bg-slate-50/80 border-slate-200"
            : "bg-[#050c1b]/85 border-blue-500/20"
        }`}>
          <div className="relative w-[200px] h-[370px] flex items-center justify-center">
            <svg viewBox="0 0 200 370" className="w-full h-full drop-shadow-md select-none">
              {/* Car Body Outer Shell (Ghost Line) */}
              <path
                d="M 50 35 C 50 25, 150 25, 150 35 C 165 60, 168 110, 162 180 C 168 250, 165 300, 152 350 C 150 360, 50 360, 48 350 C 35 300, 32 250, 38 180 C 32 110, 35 60, 50 35 Z"
                fill={isLight ? "#f1f5f9" : "#09152b"}
                stroke={isLight ? "#cbd5e1" : "#1c3258"}
                strokeWidth="1.5"
                className={isLight ? "opacity-90" : "opacity-75"}
              />

              {/* Wheels */}
              <rect x="23" y="60" width="14" height="32" rx="4" fill={isLight ? "#475569" : "#0f1d38"} />
              <rect x="163" y="60" width="14" height="32" rx="4" fill={isLight ? "#475569" : "#0f1d38"} />
              <rect x="23" y="280" width="14" height="32" rx="4" fill={isLight ? "#475569" : "#0f1d38"} />
              <rect x="163" y="280" width="14" height="32" rx="4" fill={isLight ? "#475569" : "#0f1d38"} />

              {/* 1. FRONT BUMPER */}
              <path
                d="M 50 35 Q 100 20 150 35 L 142 45 Q 100 35 58 45 Z"
                onClick={() => handlePartClick("FRONT_BUMPER")}
                onMouseEnter={() => setHoveredPart("FRONT_BUMPER")}
                onMouseLeave={() => setHoveredPart("")}
                className={`transition-colors duration-150 ${getPartColorClass("FRONT_BUMPER")}`}
                aria-label="Ön Tampon"
              />

              {/* 2. HOOD */}
              <path
                d="M 58 45 Q 100 35 142 45 L 135 110 L 65 110 Z"
                onClick={() => handlePartClick("HOOD")}
                onMouseEnter={() => setHoveredPart("HOOD")}
                onMouseLeave={() => setHoveredPart("")}
                className={`transition-colors duration-150 ${getPartColorClass("HOOD")}`}
                aria-label="Kaput"
              />

              {/* 3. LEFT FRONT FENDER */}
              <path
                d="M 50 35 L 58 45 L 65 110 L 38 110 C 34 85 36 55 50 35 Z"
                onClick={() => handlePartClick("LEFT_FRONT_FENDER")}
                onMouseEnter={() => setHoveredPart("LEFT_FRONT_FENDER")}
                onMouseLeave={() => setHoveredPart("")}
                className={`transition-colors duration-150 ${getPartColorClass("LEFT_FRONT_FENDER")}`}
                aria-label="Sol Ön Çamurluk"
              />

              {/* 4. RIGHT FRONT FENDER */}
              <path
                d="M 150 35 C 164 55 166 85 162 110 L 135 110 L 142 45 Z"
                onClick={() => handlePartClick("RIGHT_FRONT_FENDER")}
                onMouseEnter={() => setHoveredPart("RIGHT_FRONT_FENDER")}
                onMouseLeave={() => setHoveredPart("")}
                className={`transition-colors duration-150 ${getPartColorClass("RIGHT_FRONT_FENDER")}`}
                aria-label="Sağ Ön Çamurluk"
              />

              {/* 5. LEFT FRONT DOOR */}
              <path
                d="M 38 110 L 65 110 L 65 180 L 38 180 Z"
                onClick={() => handlePartClick("LEFT_FRONT_DOOR")}
                onMouseEnter={() => setHoveredPart("LEFT_FRONT_DOOR")}
                onMouseLeave={() => setHoveredPart("")}
                className={`transition-colors duration-150 ${getPartColorClass("LEFT_FRONT_DOOR")}`}
                aria-label="Sol Ön Kapı"
              />

              {/* 6. RIGHT FRONT DOOR */}
              <path
                d="M 135 110 L 162 110 L 162 180 L 135 180 Z"
                onClick={() => handlePartClick("RIGHT_FRONT_DOOR")}
                onMouseEnter={() => setHoveredPart("RIGHT_FRONT_DOOR")}
                onMouseLeave={() => setHoveredPart("")}
                className={`transition-colors duration-150 ${getPartColorClass("RIGHT_FRONT_DOOR")}`}
                aria-label="Sağ Ön Kapı"
              />

              {/* 7. ROOF */}
              <rect
                x="65"
                y="110"
                width="70"
                height="140"
                rx="8"
                onClick={() => handlePartClick("ROOF")}
                onMouseEnter={() => setHoveredPart("ROOF")}
                onMouseLeave={() => setHoveredPart("")}
                className={`transition-colors duration-150 ${getPartColorClass("ROOF")}`}
                aria-label="Tavan"
              />

              {/* 8. LEFT REAR DOOR */}
              <path
                d="M 38 180 L 65 180 L 65 250 L 38 250 Z"
                onClick={() => handlePartClick("LEFT_REAR_DOOR")}
                onMouseEnter={() => setHoveredPart("LEFT_REAR_DOOR")}
                onMouseLeave={() => setHoveredPart("")}
                className={`transition-colors duration-150 ${getPartColorClass("LEFT_REAR_DOOR")}`}
                aria-label="Sol Arka Kapı"
              />

              {/* 9. RIGHT REAR DOOR */}
              <path
                d="M 135 180 L 162 180 L 162 250 L 135 250 Z"
                onClick={() => handlePartClick("RIGHT_REAR_DOOR")}
                onMouseEnter={() => setHoveredPart("RIGHT_REAR_DOOR")}
                onMouseLeave={() => setHoveredPart("")}
                className={`transition-colors duration-150 ${getPartColorClass("RIGHT_REAR_DOOR")}`}
                aria-label="Sağ Arka Kapı"
              />

              {/* 10. LEFT REAR FENDER */}
              <path
                d="M 38 250 L 65 250 L 60 330 L 53 340 C 36 320 34 280 38 250 Z"
                onClick={() => handlePartClick("LEFT_REAR_FENDER")}
                onMouseEnter={() => setHoveredPart("LEFT_REAR_FENDER")}
                onMouseLeave={() => setHoveredPart("")}
                className={`transition-colors duration-150 ${getPartColorClass("LEFT_REAR_FENDER")}`}
                aria-label="Sol Arka Çamurluk"
              />

              {/* 11. TRUNK */}
              <path
                d="M 65 250 L 135 250 L 140 330 Q 100 340 60 330 Z"
                onClick={() => handlePartClick("TRUNK")}
                onMouseEnter={() => setHoveredPart("TRUNK")}
                onMouseLeave={() => setHoveredPart("")}
                className={`transition-colors duration-150 ${getPartColorClass("TRUNK")}`}
                aria-label="Bagaj Kapağı"
              />

              {/* 12. RIGHT REAR FENDER */}
              <path
                d="M 135 250 L 162 250 C 166 280 164 320 147 340 L 140 330 Z"
                onClick={() => handlePartClick("RIGHT_REAR_FENDER")}
                onMouseEnter={() => setHoveredPart("RIGHT_REAR_FENDER")}
                onMouseLeave={() => setHoveredPart("")}
                className={`transition-colors duration-150 ${getPartColorClass("RIGHT_REAR_FENDER")}`}
                aria-label="Sağ Arka Çamurluk"
              />

              {/* 13. REAR BUMPER */}
              <path
                d="M 53 340 Q 100 350 147 340 L 152 350 Q 100 365 48 350 Z"
                onClick={() => handlePartClick("REAR_BUMPER")}
                onMouseEnter={() => setHoveredPart("REAR_BUMPER")}
                onMouseLeave={() => setHoveredPart("")}
                className={`transition-colors duration-150 ${getPartColorClass("REAR_BUMPER")}`}
                aria-label="Arka Tampon"
              />

              {/* Headlights and Tail lights */}
              <ellipse cx="61" cy="41" rx="5" ry="2.5" fill="#fef08a" transform="rotate(-10 61 41)" opacity="0.9" pointerEvents="none" />
              <ellipse cx="139" cy="41" rx="5" ry="2.5" fill="#fef08a" transform="rotate(10 139 41)" opacity="0.9" pointerEvents="none" />
              <rect x="52" y="342" width="10" height="3" rx="0.5" fill="#ef4444" opacity="0.9" pointerEvents="none" />
              <rect x="138" y="342" width="10" height="3" rx="0.5" fill="#ef4444" opacity="0.9" pointerEvents="none" />
            </svg>

            {/* Context Popover for Editable Mode */}
            {mode === "editable" && selectedPartForEdit && (
              <div
                ref={popoverRef}
                className="absolute z-20 bg-slate-900/95 border border-white/15 backdrop-blur-md rounded-2xl p-4 shadow-2xl w-60 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150"
                style={{ top: "40px" }}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-black text-slate-100">
                    {BODY_PART_LABELS[selectedPartForEdit]}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedPartForEdit(null)}
                    className="text-slate-400 hover:text-white text-xs p-0.5 rounded cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSetPartStatus(selectedPartForEdit, BodyPartStatus.LOCAL_PAINTED)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl transition text-left cursor-pointer ${
                      statusMap[selectedPartForEdit] === BodyPartStatus.LOCAL_PAINTED
                        ? "bg-orange-500/20 text-orange-300 font-bold border border-orange-500/40"
                        : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-transparent"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />
                      Lokal Boyalı
                    </span>
                    {statusMap[selectedPartForEdit] === BodyPartStatus.LOCAL_PAINTED && <span>✓</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetPartStatus(selectedPartForEdit, BodyPartStatus.PAINTED)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl transition text-left cursor-pointer ${
                      statusMap[selectedPartForEdit] === BodyPartStatus.PAINTED
                        ? "bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40"
                        : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-transparent"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
                      Boyalı
                    </span>
                    {statusMap[selectedPartForEdit] === BodyPartStatus.PAINTED && <span>✓</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetPartStatus(selectedPartForEdit, BodyPartStatus.REPLACED)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl transition text-left cursor-pointer ${
                      statusMap[selectedPartForEdit] === BodyPartStatus.REPLACED
                        ? "bg-red-500/20 text-red-300 font-bold border border-red-500/40"
                        : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-transparent"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                      Değişen
                    </span>
                    {statusMap[selectedPartForEdit] === BodyPartStatus.REPLACED && <span>✓</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetPartStatus(selectedPartForEdit, BodyPartStatus.ORIGINAL)}
                    className="flex items-center justify-center gap-1 px-3 py-2 mt-1 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 text-[11px] font-semibold transition border border-white/5 cursor-pointer"
                  >
                    <span>↺ Orijinale Döndür / Temizle</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hover Status Label Indicator */}
          <span className={`text-[11px] font-bold min-h-[16px] block text-center mt-2 ${
            isLight ? "text-slate-600" : "text-slate-400"
          }`}>
            {getHoverStatusText()}
          </span>
        </div>

        {/* Sağ Kolon: Seçilen Parçalar Özeti (3 Ayrı Grup) */}
        <div className="md:col-span-6 flex flex-col gap-3 h-full">
          {/* 1. LOKAL BOYALI PARÇALAR */}
          <div className={`flex flex-col gap-2 p-3.5 border rounded-2xl ${
            isLight
              ? "bg-amber-50/70 border-amber-200"
              : "bg-[#071123]/90 border-blue-500/20"
          }`}>
            <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
              isLight ? "text-amber-900" : "text-amber-400"
            }`}>
              <span className={`w-2 h-2 rounded-full ${isLight ? "bg-amber-600" : "bg-amber-400"}`} />
              Lokal Boyalı Parçalar ({localPaintedList.length})
            </span>
            <ul className={`text-xs flex flex-col gap-1.5 ${isLight ? "text-slate-900" : "text-slate-200"}`}>
              {localPaintedList.map((p) => (
                <li
                  key={p}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border ${
                    isLight
                      ? "bg-white border-amber-200/80 shadow-2xs"
                      : "bg-[#0c1833]/90 border-blue-500/25"
                  }`}
                >
                  <span className={`font-semibold ${isLight ? "text-slate-900" : "text-slate-200"}`}>{BODY_PART_LABELS[p]}</span>
                  <span className={`font-bold text-[10px] ${isLight ? "text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded" : "text-amber-400"}`}>Lokal Boya</span>
                </li>
              ))}
              {localPaintedList.length === 0 && (
                <span className={`font-medium text-[11px] italic py-0.5 ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                  Lokal boyalı parça yok.
                </span>
              )}
            </ul>
          </div>

          {/* 2. BOYALI PARÇALAR */}
          <div className={`flex flex-col gap-2 p-3.5 border rounded-2xl ${
            isLight
              ? "bg-blue-50/70 border-blue-200"
              : "bg-[#071123]/90 border-blue-500/20"
          }`}>
            <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
              isLight ? "text-blue-900" : "text-sky-400"
            }`}>
              <span className={`w-2 h-2 rounded-full ${isLight ? "bg-blue-600" : "bg-blue-500"}`} />
              Boyalı Parçalar ({paintedList.length})
            </span>
            <ul className={`text-xs flex flex-col gap-1.5 ${isLight ? "text-slate-900" : "text-slate-200"}`}>
              {paintedList.map((p) => (
                <li
                  key={p}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border ${
                    isLight
                      ? "bg-white border-blue-200/80 shadow-2xs"
                      : "bg-[#0c1833]/90 border-blue-500/25"
                  }`}
                >
                  <span className={`font-semibold ${isLight ? "text-slate-900" : "text-slate-200"}`}>{BODY_PART_LABELS[p]}</span>
                  <span className={`font-bold text-[10px] ${isLight ? "text-blue-800 bg-blue-100/90 px-1.5 py-0.5 rounded" : "text-sky-400"}`}>Boyalı</span>
                </li>
              ))}
              {paintedList.length === 0 && (
                <span className={`font-medium text-[11px] italic py-0.5 ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                  Boyalı parça yok.
                </span>
              )}
            </ul>
          </div>

          {/* 3. DEĞİŞEN PARÇALAR */}
          <div className={`flex flex-col gap-2 p-3.5 border rounded-2xl ${
            isLight
              ? "bg-red-50/70 border-red-200"
              : "bg-[#071123]/90 border-rose-500/25"
          }`}>
            <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
              isLight ? "text-red-900" : "text-rose-400"
            }`}>
              <span className={`w-2 h-2 rounded-full ${isLight ? "bg-red-600" : "bg-rose-500"}`} />
              Değişen Parçalar ({replacedList.length})
            </span>
            <ul className={`text-xs flex flex-col gap-1.5 ${isLight ? "text-slate-900" : "text-slate-200"}`}>
              {replacedList.map((p) => (
                <li
                  key={p}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border ${
                    isLight
                      ? "bg-white border-red-200/80 shadow-2xs"
                      : "bg-[#0c1833]/90 border-rose-500/20"
                  }`}
                >
                  <span className={`font-semibold ${isLight ? "text-slate-900" : "text-slate-200"}`}>{BODY_PART_LABELS[p]}</span>
                  <span className={`font-bold text-[10px] ${isLight ? "text-red-800 bg-red-100/90 px-1.5 py-0.5 rounded" : "text-rose-400"}`}>Değişen</span>
                </li>
              ))}
              {replacedList.length === 0 && (
                <span className={`font-medium text-[11px] italic py-0.5 ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                  Değişen parça yok.
                </span>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompactVehicleBodySvg({
  localPaintedParts = [],
  paintedParts = [],
  changedParts = [],
  className = "",
}: {
  localPaintedParts?: string[] | null;
  paintedParts?: string[] | null;
  changedParts?: string[] | null;
  className?: string;
}) {
  const statusMap = resolveBodyPartStatusMap({
    localPaintedParts: localPaintedParts || [],
    paintedParts: paintedParts || [],
    changedParts: changedParts || [],
  });

  const getPartColor = (part: VehicleBodyPart) => {
    const status = statusMap[part];
    if (status === BodyPartStatus.REPLACED) {
      return { fill: "rgba(239, 68, 68, 0.65)", stroke: "#f87171" };
    }
    if (status === BodyPartStatus.PAINTED) {
      return { fill: "rgba(59, 130, 246, 0.65)", stroke: "#60a5fa" };
    }
    if (status === BodyPartStatus.LOCAL_PAINTED) {
      return { fill: "rgba(249, 115, 22, 0.65)", stroke: "#fb923c" };
    }
    return { fill: "#0f172a", stroke: "#334155" };
  };

  return (
    <svg viewBox="0 0 200 370" className={`drop-shadow-md select-none ${className}`}>
      {/* Ghost Outline */}
      <path
        d="M 50 35 C 50 25, 150 25, 150 35 C 165 60, 168 110, 162 180 C 168 250, 165 300, 152 350 C 150 360, 50 360, 48 350 C 35 300, 32 250, 38 180 C 32 110, 35 60, 50 35 Z"
        fill="#080f1d"
        stroke="#1e293b"
        strokeWidth="1.5"
      />
      {/* Wheels */}
      <rect x="23" y="60" width="14" height="32" rx="4" fill="#1e293b" />
      <rect x="163" y="60" width="14" height="32" rx="4" fill="#1e293b" />
      <rect x="23" y="280" width="14" height="32" rx="4" fill="#1e293b" />
      <rect x="163" y="280" width="14" height="32" rx="4" fill="#1e293b" />

      {/* 1. FRONT BUMPER */}
      <path
        d="M 50 35 Q 100 20 150 35 L 142 45 Q 100 35 58 45 Z"
        fill={getPartColor("FRONT_BUMPER").fill}
        stroke={getPartColor("FRONT_BUMPER").stroke}
        strokeWidth="1.5"
      />
      {/* 2. HOOD */}
      <path
        d="M 58 45 Q 100 35 142 45 L 135 110 L 65 110 Z"
        fill={getPartColor("HOOD").fill}
        stroke={getPartColor("HOOD").stroke}
        strokeWidth="1.5"
      />
      {/* 3. LEFT FRONT FENDER */}
      <path
        d="M 50 35 L 58 45 L 65 110 L 38 110 C 34 85 36 55 50 35 Z"
        fill={getPartColor("LEFT_FRONT_FENDER").fill}
        stroke={getPartColor("LEFT_FRONT_FENDER").stroke}
        strokeWidth="1.5"
      />
      {/* 4. RIGHT FRONT FENDER */}
      <path
        d="M 150 35 C 164 55 166 85 162 110 L 135 110 L 142 45 Z"
        fill={getPartColor("RIGHT_FRONT_FENDER").fill}
        stroke={getPartColor("RIGHT_FRONT_FENDER").stroke}
        strokeWidth="1.5"
      />
      {/* 5. LEFT FRONT DOOR */}
      <path
        d="M 38 110 L 65 110 L 65 180 L 38 180 Z"
        fill={getPartColor("LEFT_FRONT_DOOR").fill}
        stroke={getPartColor("LEFT_FRONT_DOOR").stroke}
        strokeWidth="1.5"
      />
      {/* 6. RIGHT FRONT DOOR */}
      <path
        d="M 135 110 L 162 110 L 162 180 L 135 180 Z"
        fill={getPartColor("RIGHT_FRONT_DOOR").fill}
        stroke={getPartColor("RIGHT_FRONT_DOOR").stroke}
        strokeWidth="1.5"
      />
      {/* 7. ROOF */}
      <rect
        x="65"
        y="110"
        width="70"
        height="140"
        rx="8"
        fill={getPartColor("ROOF").fill}
        stroke={getPartColor("ROOF").stroke}
        strokeWidth="1.5"
      />
      {/* 8. LEFT REAR DOOR */}
      <path
        d="M 38 180 L 65 180 L 65 250 L 38 250 Z"
        fill={getPartColor("LEFT_REAR_DOOR").fill}
        stroke={getPartColor("LEFT_REAR_DOOR").stroke}
        strokeWidth="1.5"
      />
      {/* 9. RIGHT REAR DOOR */}
      <path
        d="M 135 180 L 162 180 L 162 250 L 135 250 Z"
        fill={getPartColor("RIGHT_REAR_DOOR").fill}
        stroke={getPartColor("RIGHT_REAR_DOOR").stroke}
        strokeWidth="1.5"
      />
      {/* 10. LEFT REAR FENDER */}
      <path
        d="M 38 250 L 65 250 L 60 330 L 53 340 C 36 320 34 280 38 250 Z"
        fill={getPartColor("LEFT_REAR_FENDER").fill}
        stroke={getPartColor("LEFT_REAR_FENDER").stroke}
        strokeWidth="1.5"
      />
      {/* 11. TRUNK */}
      <path
        d="M 65 250 L 135 250 L 140 330 Q 100 340 60 330 Z"
        fill={getPartColor("TRUNK").fill}
        stroke={getPartColor("TRUNK").stroke}
        strokeWidth="1.5"
      />
      {/* 12. RIGHT REAR FENDER */}
      <path
        d="M 135 250 L 162 250 C 166 280 164 320 147 340 L 140 330 Z"
        fill={getPartColor("RIGHT_REAR_FENDER").fill}
        stroke={getPartColor("RIGHT_REAR_FENDER").stroke}
        strokeWidth="1.5"
      />
      {/* 13. REAR BUMPER */}
      <path
        d="M 53 340 Q 100 350 147 340 L 152 350 Q 100 365 48 350 Z"
        fill={getPartColor("REAR_BUMPER").fill}
        stroke={getPartColor("REAR_BUMPER").stroke}
        strokeWidth="1.5"
      />
      {/* Headlights & Taillights */}
      <ellipse cx="61" cy="41" rx="5" ry="2.5" fill="#fef08a" transform="rotate(-10 61 41)" opacity="0.9" />
      <ellipse cx="139" cy="41" rx="5" ry="2.5" fill="#fef08a" transform="rotate(10 139 41)" opacity="0.9" />
      <rect x="52" y="342" width="10" height="3" rx="0.5" fill="#ef4444" opacity="0.9" />
      <rect x="138" y="342" width="10" height="3" rx="0.5" fill="#ef4444" opacity="0.9" />
    </svg>
  );
}
