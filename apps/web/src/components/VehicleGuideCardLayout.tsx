"use client";

import React from "react";
import { API_BASE_URL } from "@/utils/apiConfig";

export interface CardFactItem {
  id?: string;
  title: string;
  description: string;
}

export interface TechnicalInfoData {
  productionYears?: string;
  segment?: string;
  drivetrain?: string;
  engineOptions?: string[];
  fuelTypes?: string[];
  transmissionOptions?: string[];
  averageConsumption?: string;
  powerRange?: string;
  torqueRange?: string;
  trunkVolume?: string;
  safetyInfo?: string;
  localizedNotes?: string;
}

export interface VehicleGuideCardLayoutProps {
  brand: string;
  model: string;
  generationCode?: string;
  yearStart: number | string;
  yearEnd?: number | string | null;
  bodyType: string;
  heroImageUrl?: string;
  placeholderImageUrl?: string;
  imageAltText?: string;
  imageSource?: string;
  imageLicense?: string;
  licenseLabelPosition?: string;
  imageFitMode?: string;
  imageObjectPosition?: string;
  shortSummary: string;
  facts: CardFactItem[];
  
  // Technical Drawer
  techOpen?: boolean;
  onToggleTech?: () => void;
  technicalInfo?: TechnicalInfoData | null;
  loadingTech?: boolean;

  // Read-only User CTAs & Navigation
  isReadonly?: boolean;
  onSwipePrev?: () => void;
  onSwipeNext?: () => void;
  hasPrev?: boolean;
  onCtaClick?: () => void;

  // Custom Slots for Admin Editor
  customHeroSlot?: React.ReactNode;
  customIdentitySlot?: React.ReactNode;
  customSummarySlot?: React.ReactNode;
  customFactsSlot?: React.ReactNode;
  customFooterSlot?: React.ReactNode;
  customTechDrawerSlot?: React.ReactNode;

  slideDirection?: "up" | "down" | "none";
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: () => void;
}

export const translateFuel = (fuel: string) => {
  if (!fuel) return "-";
  const mapping: Record<string, string> = {
    PETROL: "Benzin",
    DIESEL: "Dizel",
    HYBRID: "Hibrit",
    LPG: "LPG",
    ELECTRIC: "Elektrik"
  };
  return mapping[fuel.toUpperCase()] || fuel;
};

export const translateTransmission = (transmission: string) => {
  if (!transmission) return "-";
  const mapping: Record<string, string> = {
    AUTOMATIC: "Otomatik",
    MANUAL: "Manuel",
    SEMI_AUTOMATIC: "Yarı Otomatik"
  };
  return mapping[transmission.toUpperCase()] || transmission;
};

export const translateDrivetrain = (drivetrain: string) => {
  if (!drivetrain) return "-";
  const mapping: Record<string, string> = {
    FWD: "Önden Çekiş",
    RWD: "Arkadan İtiş",
    AWD: "Dört Tekerden Çekiş (AWD)",
    "4WD": "4x4 (4WD)"
  };
  return mapping[drivetrain.toUpperCase()] || drivetrain;
};

export const translateBodyType = (bodyType: string) => {
  if (!bodyType) return "Kasa Tipi";
  const mapping: Record<string, string> = {
    SEDAN: "Sedan",
    HATCHBACK: "Hatchback",
    SUV: "SUV",
    COUPE: "Kupe",
    STATION_WAGON: "Station Wagon",
    WAGON: "Station Wagon",
    CONVERTIBLE: "Cabriolet",
    MINIVAN: "Minivan",
    VAN: "Van / Minivan",
    PICKUP: "Pickup"
  };
  return mapping[bodyType.toUpperCase()] || bodyType;
};

const formatImageUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("/")) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || API_BASE_URL || "http://localhost:3000";
    return `${baseUrl.replace(/\/$/, '')}${url}`;
  }
  return url;
};

export default function VehicleGuideCardLayout({
  brand,
  model,
  generationCode,
  yearStart,
  yearEnd,
  bodyType,
  heroImageUrl,
  placeholderImageUrl,
  imageAltText,
  imageSource,
  imageLicense,
  licenseLabelPosition = "bottom-right",
  imageFitMode = "cover",
  imageObjectPosition = "center center",
  shortSummary,
  facts,
  techOpen = false,
  onToggleTech,
  technicalInfo,
  loadingTech = false,
  isReadonly = true,
  onSwipePrev,
  onSwipeNext,
  hasPrev = false,
  onCtaClick,
  customHeroSlot,
  customIdentitySlot,
  customSummarySlot,
  customFactsSlot,
  customFooterSlot,
  customTechDrawerSlot,
  slideDirection = "none",
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: VehicleGuideCardLayoutProps) {

  const rawUrl = heroImageUrl || placeholderImageUrl;
  const imageUrl = rawUrl ? formatImageUrl(rawUrl) : "";

  return (
    <div
      className="w-full max-w-[430px] md:max-w-[840px] h-[85vh] max-h-[760px] md:h-[580px] bg-[#090d1a] border border-white/10 rounded-[48px] shadow-2xl relative flex flex-col overflow-hidden select-none font-sans"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className={`flex-1 flex flex-col md:flex-row transition-transform duration-300 h-full overflow-hidden ${
        slideDirection === "up" ? "-translate-y-full opacity-0" : 
        slideDirection === "down" ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
      }`}>

        {/* LEFT COLUMN: Hero Image + Identity & Summary */}
        <div className="w-full md:w-[42%] flex flex-col border-b md:border-b-0 md:border-r border-white/5 h-auto md:h-full bg-[#080c18] flex-none md:flex-1">
          {/* HERO IMAGE CONTAINER */}
          <div className="relative w-full aspect-[16/9] overflow-hidden flex-none bg-[#080d1d] border-b border-white/5 group">
            {imageUrl ? (
              <>
                {imageFitMode === "contain" && (
                  <div 
                    className="absolute inset-0 bg-cover bg-center blur-2xl opacity-50 scale-110 pointer-events-none z-0"
                    style={{ backgroundImage: `url(${imageUrl})` }}
                  />
                )}
                <img 
                  src={imageUrl} 
                  alt={imageAltText || `${brand} ${model}`} 
                  className="w-full h-full relative z-10 block"
                  style={{
                    objectFit: (imageFitMode || "cover") as any,
                    objectPosition: imageObjectPosition || "center center",
                  }}
                />
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0f24] text-slate-500 gap-2 p-4 text-center">
                <span className="text-2xl">📷</span>
                <span className="text-xs font-bold">Görsel Yükleyin</span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-[#080c18] via-transparent to-black/60 z-20 pointer-events-none" />

            {imageSource && (
              <div className="absolute bottom-2 right-3 z-30 text-[9px] text-white/40 bg-black/40 px-2 py-0.5 rounded-md border border-white/5 backdrop-blur-sm pointer-events-none">
                Görsel: {imageSource} ({imageLicense || "Lisanslı"})
              </div>
            )}

            {/* Custom Overlay Slot for Admin Upload / Replace */}
            {customHeroSlot && (
              <div className="absolute inset-0 z-40 flex items-center justify-center">
                {customHeroSlot}
              </div>
            )}
          </div>

          {/* LEFT DETAILS */}
          <div className="p-5 md:p-6 flex-1 flex flex-col gap-2.5 justify-center overflow-y-auto">
            {customIdentitySlot ? (
              customIdentitySlot
            ) : (
              <>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">
                    {brand || "MARKA"} <span className="text-orange-500">{model || "MODEL"}</span>
                  </h1>
                  {generationCode && (
                    <span className="text-[10px] font-mono font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded text-slate-400">
                      {generationCode}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                  <span>📅 {yearStart || "YYYY"} - {yearEnd || "Günümüz"}</span>
                  <span className="text-slate-600">•</span>
                  <span>🚗 {translateBodyType(bodyType)}</span>
                </div>
              </>
            )}

            {customSummarySlot ? (
              customSummarySlot
            ) : (
              <p className="text-xs text-slate-350 leading-relaxed italic bg-white/5 border border-white/5 p-3.5 rounded-2xl">
                "{shortSummary || "Araç hakkında kısa editoryal yayın özeti..."}"
              </p>
            )}

            {/* User Navigation Buttons */}
            {isReadonly && (
              <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-white/5 flex-none">
                <button 
                  onClick={onSwipePrev}
                  disabled={!hasPrev}
                  className={`group flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer select-none transition ${
                    hasPrev 
                      ? "bg-white/5 hover:bg-white/10 border-white/10 text-white/80 hover:text-white" 
                      : "bg-white/0 border-white/5 text-white/20 cursor-not-allowed opacity-50"
                  }`}
                >
                  <span className={`inline-block transition-transform duration-300 ${hasPrev ? "group-hover:-translate-x-1.5 animate-pulse" : ""}`}>←</span>
                  Önceki
                </button>

                <button 
                  onClick={onSwipeNext}
                  className="group flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition text-xs font-bold cursor-pointer select-none"
                >
                  Sonraki
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-1.5 animate-pulse">→</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Facts Grid + Footer CTA */}
        <div className="flex-1 flex flex-col h-full justify-between bg-[#090d1a]">
          
          <div className="flex-1 p-5 md:p-6 overflow-y-auto flex flex-col gap-2.5 justify-center">
            <div className="flex items-center justify-between w-full mb-2">
              <h2 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                🔍 ARAÇ HAKKINDA KRİTİK BİLGİLER
              </h2>
              <span className="text-[9px] font-black tracking-wider text-white bg-orange-600/90 border border-orange-500/25 px-2.5 py-0.5 rounded-full uppercase">
                REHBER
              </span>
            </div>

            {customFactsSlot ? (
              customFactsSlot
            ) : (
              <div className="flex flex-col gap-2 md:gap-2.5">
                {facts.slice(0, 4).map((fact, idx) => (
                  <div 
                    key={fact.id || idx} 
                    className="bg-white/5 border border-white/5 hover:border-orange-500/20 rounded-2xl p-3 md:p-2.5 flex flex-col gap-1 transition duration-300"
                  >
                    <h3 className="text-xs font-black text-slate-200 uppercase tracking-wide">
                      {fact.title || `KRİTİK BİLGİ ${idx + 1}`}
                    </h3>
                    <p className="text-[10.5px] leading-relaxed text-slate-400 font-medium">
                      {fact.description || "Kritik bilgi açıklaması..."}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Controls */}
          {customFooterSlot ? (
            customFooterSlot
          ) : (
            <div className="p-5 md:p-6 border-t border-white/5 flex flex-col gap-3.5 bg-[#070b17] flex-none relative">
              <div className="flex items-center gap-3">
                <button 
                  onClick={onToggleTech}
                  className="flex-1 py-3 px-4 rounded-2xl bg-[#0f172a] border border-blue-900/60 hover:bg-[#1e293b] text-xs font-bold text-blue-300 hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer select-none"
                >
                  <span>🛠️ Teknik Bilgiler</span>
                  <span>{techOpen ? "↑" : "↓"}</span>
                </button>

                <button 
                  onClick={onCtaClick}
                  className="flex-1 py-3 px-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-xs font-black tracking-wide text-white shadow-lg shadow-orange-500/10 transition cursor-pointer select-none"
                >
                  <span>🔍 İlanlarını Gör</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Technical Info Drawer Overlay */}
      {techOpen && (
        customTechDrawerSlot ? (
          customTechDrawerSlot
        ) : (
          <div className="absolute inset-x-0 bottom-0 bg-[#090d1e] border-t border-white/15 rounded-t-[32px] p-6 shadow-2xl z-50 transition-transform duration-300 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <h2 className="text-sm font-black text-white uppercase tracking-wider">🛠️ Detaylı Teknik Veriler</h2>
              <button 
                onClick={onToggleTech}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs text-slate-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {loadingTech ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-400">Veriler yükleniyor...</span>
              </div>
            ) : technicalInfo ? (
              <div className="flex flex-col gap-4 max-h-[360px] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Üretim Yılları</span>
                    <span className="text-xs font-semibold text-slate-200">{technicalInfo.productionYears || "-"}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Kasa Tipi / Çekiş</span>
                    <span className="text-xs font-semibold text-slate-200">
                      {technicalInfo.segment || "-"} / {technicalInfo.drivetrain ? translateDrivetrain(technicalInfo.drivetrain) : "-"}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Motor Seçenekleri</span>
                    <span className="text-xs font-semibold text-slate-200">
                      {Array.isArray(technicalInfo.engineOptions) ? technicalInfo.engineOptions.join(", ") : "-"}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Şanzıman / Yakıt</span>
                    <span className="text-xs font-semibold text-slate-200">
                      {Array.isArray(technicalInfo.transmissionOptions) ? technicalInfo.transmissionOptions.map(translateTransmission).join(", ") : "-"} ({Array.isArray(technicalInfo.fuelTypes) ? technicalInfo.fuelTypes.map(translateFuel).join(" / ") : "-"})
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Ortalama Tüketim</span>
                    <span className="text-xs font-semibold text-slate-200">{technicalInfo.averageConsumption || "-"}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Güç / Tork Aralığı</span>
                    <span className="text-xs font-semibold text-slate-200">
                      {technicalInfo.powerRange || "-"} / {technicalInfo.torqueRange || "-"}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Bagaj Hacmi</span>
                    <span className="text-xs font-semibold text-slate-200">{technicalInfo.trunkVolume || "-"}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Güvenlik Değerlendirmesi</span>
                    <span className="text-xs font-semibold text-slate-200">{technicalInfo.safetyInfo || "-"}</span>
                  </div>
                </div>

                {technicalInfo.localizedNotes && (
                  <div className="mt-2 bg-orange-500/5 border border-orange-500/15 p-3 rounded-2xl flex flex-col gap-1">
                    <span className="text-[9px] font-extrabold text-orange-400 uppercase tracking-wider">💡 TorqueScout Uzman Notu</span>
                    <p className="text-[10px] leading-relaxed text-slate-300 font-medium">
                      {technicalInfo.localizedNotes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">Teknik bilgiler bulunamadı.</p>
            )}
          </div>
        )
      )}
    </div>
  );
}
