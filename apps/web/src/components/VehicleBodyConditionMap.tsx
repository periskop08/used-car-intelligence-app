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
  mode: "editable" | "readOnly";
  localPaintedParts?: string[] | null;
  paintedParts?: string[] | null;
  changedParts?: string[] | null;
  onChange?: (updated: {
    localPaintedParts: string[];
    paintedParts: string[];
    changedParts: string[];
  }) => void;
  className?: string;
  showTitle?: boolean;
}

export function VehicleBodyConditionMap({
  mode = "readOnly",
  localPaintedParts = [],
  paintedParts = [],
  changedParts = [],
  onChange,
  className = "",
  showTitle = true,
}: VehicleBodyConditionMapProps) {
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
      return mode === "editable"
        ? "fill-red-500/40 stroke-red-400 hover:fill-red-500/55 cursor-pointer"
        : "fill-red-500/40 stroke-red-400";
    }
    if (status === BodyPartStatus.PAINTED) {
      return mode === "editable"
        ? "fill-blue-500/40 stroke-blue-400 hover:fill-blue-500/55 cursor-pointer"
        : "fill-blue-500/40 stroke-blue-400";
    }
    if (status === BodyPartStatus.LOCAL_PAINTED) {
      return mode === "editable"
        ? "fill-orange-500/40 stroke-orange-400 hover:fill-orange-500/55 cursor-pointer"
        : "fill-orange-500/40 stroke-orange-400";
    }
    // ORIGINAL - default unfilled
    return mode === "editable"
      ? "fill-slate-900/50 stroke-white/10 hover:fill-slate-800/60 cursor-pointer"
      : "fill-slate-900/50 stroke-white/10";
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
          <span className="text-xs font-black text-slate-200 uppercase tracking-wider">
            Boyalı veya Değişen Parça Görseli
          </span>
          <p className="text-[11px] text-slate-400">
            {mode === "editable"
              ? "Aracın kaporta durumunu aşağıdaki görsel üzerinden ilgili parçalara tıklayarak seçebilirsiniz."
              : "Aracın ekspertiz ve kaporta durumu şeffaf olarak listelenmiştir."}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3.5 text-[10px] font-bold flex-wrap bg-slate-950/30 p-2.5 rounded-xl border border-white/5">
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="w-3 h-3 rounded bg-slate-900 border border-white/10 inline-block shadow-inner" />
          Orijinal
        </span>
        <span className="flex items-center gap-1.5 text-orange-400">
          <span className="w-3 h-3 rounded bg-orange-500/40 border border-orange-400 inline-block shadow-sm" />
          Lokal Boyalı
        </span>
        <span className="flex items-center gap-1.5 text-blue-400">
          <span className="w-3 h-3 rounded bg-blue-500/40 border border-blue-400 inline-block shadow-sm" />
          Boyalı
        </span>
        <span className="flex items-center gap-1.5 text-red-400">
          <span className="w-3 h-3 rounded bg-red-500/40 border border-red-400 inline-block shadow-sm" />
          Değişen
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Sol Kolon: SVG Araç Silüeti Haritası */}
        <div className="md:col-span-6 flex flex-col items-center justify-center p-3 bg-slate-950/40 rounded-2xl border border-white/5 relative">
          <div className="relative w-[200px] h-[370px] flex items-center justify-center">
            <svg viewBox="0 0 200 370" className="w-full h-full drop-shadow-md select-none">
              {/* Car Body Outer Shell (Ghost Line) */}
              <path
                d="M 50 35 C 50 25, 150 25, 150 35 C 165 60, 168 110, 162 180 C 168 250, 165 300, 152 350 C 150 360, 50 360, 48 350 C 35 300, 32 250, 38 180 C 32 110, 35 60, 50 35 Z"
                fill="#0f172a"
                stroke="#334155"
                strokeWidth="1.5"
                className="opacity-70"
              />

              {/* Wheels */}
              <rect x="23" y="60" width="14" height="32" rx="4" fill="#1e293b" />
              <rect x="163" y="60" width="14" height="32" rx="4" fill="#1e293b" />
              <rect x="23" y="280" width="14" height="32" rx="4" fill="#1e293b" />
              <rect x="163" y="280" width="14" height="32" rx="4" fill="#1e293b" />

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
          <span className="text-[11px] font-bold text-slate-400 min-h-[16px] block text-center mt-2">
            {getHoverStatusText()}
          </span>
        </div>

        {/* Sağ Kolon: Seçilen Parçalar Özeti (3 Ayrı Grup) */}
        <div className="md:col-span-6 flex flex-col gap-3 h-full">
          {/* 1. LOKAL BOYALI PARÇALAR */}
          <div className="flex flex-col gap-2 bg-slate-950/45 p-3.5 border border-white/5 rounded-2xl">
            <span className="text-[10px] font-black text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              Lokal Boyalı Parçalar ({localPaintedList.length})
            </span>
            <ul className="text-xs text-slate-300 flex flex-col gap-1.5">
              {localPaintedList.map((p) => (
                <li
                  key={p}
                  className="flex items-center justify-between bg-orange-500/10 px-2.5 py-1 rounded-lg text-[11px] border border-orange-500/20"
                >
                  <span className="font-medium text-slate-200">{BODY_PART_LABELS[p]}</span>
                  <span className="font-bold text-orange-400 text-[10px]">Lokal Boya</span>
                </li>
              ))}
              {localPaintedList.length === 0 && (
                <span className="text-slate-500 font-medium text-[11px] italic py-0.5">
                  Lokal boyalı parça yok.
                </span>
              )}
            </ul>
          </div>

          {/* 2. BOYALI PARÇALAR */}
          <div className="flex flex-col gap-2 bg-slate-950/45 p-3.5 border border-white/5 rounded-2xl">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Boyalı Parçalar ({paintedList.length})
            </span>
            <ul className="text-xs text-slate-300 flex flex-col gap-1.5">
              {paintedList.map((p) => (
                <li
                  key={p}
                  className="flex items-center justify-between bg-blue-500/10 px-2.5 py-1 rounded-lg text-[11px] border border-blue-500/20"
                >
                  <span className="font-medium text-slate-200">{BODY_PART_LABELS[p]}</span>
                  <span className="font-bold text-blue-400 text-[10px]">Boyalı</span>
                </li>
              ))}
              {paintedList.length === 0 && (
                <span className="text-slate-500 font-medium text-[11px] italic py-0.5">
                  Boyalı parça yok.
                </span>
              )}
            </ul>
          </div>

          {/* 3. DEĞİŞEN PARÇALAR */}
          <div className="flex flex-col gap-2 bg-slate-950/45 p-3.5 border border-white/5 rounded-2xl">
            <span className="text-[10px] font-black text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Değişen Parçalar ({replacedList.length})
            </span>
            <ul className="text-xs text-slate-300 flex flex-col gap-1.5">
              {replacedList.map((p) => (
                <li
                  key={p}
                  className="flex items-center justify-between bg-red-500/10 px-2.5 py-1 rounded-lg text-[11px] border border-red-500/20"
                >
                  <span className="font-medium text-slate-200">{BODY_PART_LABELS[p]}</span>
                  <span className="font-bold text-red-400 text-[10px]">Değişen</span>
                </li>
              ))}
              {replacedList.length === 0 && (
                <span className="text-slate-500 font-medium text-[11px] italic py-0.5">
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
