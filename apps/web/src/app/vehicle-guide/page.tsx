"use client";

import React, { useEffect, useState, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface Fact {
  id: string;
  factType: string;
  title: string;
  description: string;
  iconKey: string;
  displayOrder: number;
}

interface Card {
  id: string;
  brand: string;
  model: string;
  generationName: string;
  generationCode: string;
  bodyType: string;
  yearStart: number;
  yearEnd: number;
  heroImageUrl: string;
  imageAltText: string;
  imageSource: string;
  imageLicense: string;
  placeholderImageUrl: string;
  ratingScore: number;
  ratingCount: number;
  shortSummary: string;
  facts: Fact[];
}

interface TechnicalInfo {
  engineOptions?: string[];
  fuelTypes?: string[];
  transmissionOptions?: string[];
  bodyTypes?: string[];
  productionYears?: string;
  averageConsumption?: string;
  powerRange?: string;
  torqueRange?: string;
  drivetrain?: string;
  segment?: string;
  trunkVolume?: string;
  safetyInfo?: string;
  localizedNotes?: string;
}

const translateFuel = (fuel: string) => {
  const mapping: Record<string, string> = {
    PETROL: "Benzin",
    DIESEL: "Dizel",
    HYBRID: "Hibrit",
    LPG: "LPG",
    ELECTRIC: "Elektrik"
  };
  return mapping[fuel.toUpperCase()] || fuel;
};

const translateTransmission = (transmission: string) => {
  const mapping: Record<string, string> = {
    AUTOMATIC: "Otomatik",
    MANUAL: "Manuel",
    SEMI_AUTOMATIC: "Yarı Otomatik"
  };
  return mapping[transmission.toUpperCase()] || transmission;
};

const translateDrivetrain = (drivetrain: string) => {
  const mapping: Record<string, string> = {
    FWD: "Önden Çekiş",
    RWD: "Arkadan İtiş",
    AWD: "Dört Tekerden Çekiş (AWD)",
    "4WD": "4x4 (4WD)"
  };
  return mapping[drivetrain.toUpperCase()] || drivetrain;
};

const translateBodyType = (bodyType: string) => {
  const mapping: Record<string, string> = {
    SEDAN: "Sedan",
    HATCHBACK: "Hatchback",
    SUV: "SUV",
    COUPE: "Kupe",
    STATION_WAGON: "Station Wagon",
    CONVERTIBLE: "Cabriolet",
    MINIVAN: "Minivan"
  };
  return mapping[bodyType.toUpperCase()] || bodyType;
};

export default function VehicleGuidePage() {
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [techOpen, setTechOpen] = useState(false);
  const [technicalInfo, setTechnicalInfo] = useState<TechnicalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTech, setLoadingTech] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"up" | "down" | "none">("none");
  const [isFavorited, setIsFavorited] = useState(false);

  const touchStartY = useRef<number>(0);
  const touchEndY = useRef<number>(0);
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    let sessId = localStorage.getItem("guide_session_id");
    if (!sessId) {
      sessId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem("guide_session_id", sessId);
    }
    setSessionId(sessId);
    fetchRandomCard(sessId, []);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (techOpen) return;
      if (e.key === "ArrowDown") {
        handleSwipeNext();
      } else if (e.key === "ArrowUp") {
        handleSwipePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentCard, historyStack, techOpen, sessionId]);

  const fetchRandomCard = async (sessId: string, currentHistory: string[]) => {
    setLoading(true);
    try {
      const headers: any = {
        "Content-Type": "application/json",
        "x-session-id": sessId,
      };
      const token = localStorage.getItem("accessToken");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/vehicle-guide/cards/random?locale=tr`, { headers });
      if (!res.ok) throw new Error("No card found.");
      const data = await res.json();
      
      setCurrentCard(data);
      setTechOpen(false);
      setTechnicalInfo(null);
      setIsFavorited(false);

      logAnalyticsEvent(data.id, "GUIDE_CARD_VIEW", sessId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const logAnalyticsEvent = async (cardId: string, eventType: string, sessId?: string) => {
    try {
      const headers: any = {
        "Content-Type": "application/json",
      };
      const token = localStorage.getItem("accessToken");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      await fetch(`${API_URL}/vehicle-guide/cards/${cardId}/event`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          eventType,
          sessionId: sessId || sessionId,
          durationMs: 0,
          deviceType: "WEB_DESKTOP",
          locale: "tr",
        }),
      });
    } catch (err) {}
  };

  const handleSwipeNext = () => {
    if (!currentCard) return;
    setSlideDirection("up");
    setTimeout(async () => {
      const newHistory = [...historyStack, currentCard.id];
      setHistoryStack(newHistory);
      logAnalyticsEvent(currentCard.id, "GUIDE_CARD_SWIPE_UP");
      await fetchRandomCard(sessionId, newHistory);
      setSlideDirection("none");
    }, 300);
  };

  const handleSwipePrev = async () => {
    if (historyStack.length === 0) return;
    setSlideDirection("down");
    setTimeout(async () => {
      const prevId = historyStack[historyStack.length - 1];
      const newHistory = historyStack.slice(0, -1);
      setHistoryStack(newHistory);

      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/vehicle-guide/cards/${prevId}?locale=tr`);
        if (!res.ok) throw new Error("Previous card not found.");
        const data = await res.json();
        setCurrentCard(data);
        setTechOpen(false);
        setTechnicalInfo(null);
        setIsFavorited(false);
        logAnalyticsEvent(prevId, "GUIDE_CARD_SWIPE_DOWN");
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setSlideDirection("none");
      }
    }, 300);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const diffY = touchStartY.current - touchEndY.current;
    if (Math.abs(diffY) > 60) {
      if (diffY > 0) {
        handleSwipeNext();
      } else {
        handleSwipePrev();
      }
    }
  };

  const fetchTechnicalInfo = async () => {
    if (!currentCard) return;
    if (techOpen) {
      setTechOpen(false);
      logAnalyticsEvent(currentCard.id, "GUIDE_TECHNICAL_INFO_CLOSED");
      return;
    }

    setTechOpen(true);
    logAnalyticsEvent(currentCard.id, "GUIDE_TECHNICAL_INFO_OPENED");

    if (technicalInfo) return;

    setLoadingTech(true);
    try {
      const res = await fetch(`${API_URL}/vehicle-guide/cards/${currentCard.id}/technical-info?locale=tr`);
      if (res.ok) {
        const data = await res.json();
        setTechnicalInfo(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTech(false);
    }
  };

  const handleCtaClick = () => {
    if (!currentCard) return;
    logAnalyticsEvent(currentCard.id, "GUIDE_LISTING_CTA_CLICKED");
    
    const query = new URLSearchParams();
    query.set("brand", currentCard.brand);
    query.set("model", currentCard.model);
    query.set("minYear", currentCard.yearStart.toString());
    if (currentCard.yearEnd) {
      query.set("maxYear", currentCard.yearEnd.toString());
    }
    if (currentCard.bodyType) {
      query.set("bodyType", currentCard.bodyType);
    }
    
    window.location.href = `/listings?${query.toString()}`;
  };

  const getIcon = (key?: string) => {
    switch (key) {
      case "ruler":
      case "chassis":
      case "weight":
        return "📏";
      case "comfort":
      case "sound":
      case "cabin":
      case "ride":
        return "🛋️";
      case "gearbox":
        return "⚙️";
      case "engine":
        return "🔌";
      case "lpg":
        return "🔥";
      case "bodywork":
        return "🚗";
      case "lights":
        return "💡";
      case "price":
        return "💎";
      case "reliability":
        return "🛡️";
      default:
        return "📢";
    }
  };

  const toggleFavorite = () => {
    setIsFavorited(!isFavorited);
    if (currentCard) {
      logAnalyticsEvent(currentCard.id, isFavorited ? "GUIDE_CARD_SHARED" : "GUIDE_CARD_FAVORITED");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans overflow-hidden">

      <main className="flex-1 flex items-center justify-center p-4 relative">
        <div 
          className="w-full max-w-[430px] md:max-w-[840px] h-[85vh] max-h-[760px] md:h-[580px] bg-[#090d1a] border border-white/10 rounded-[48px] shadow-2xl relative flex flex-col overflow-hidden select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm font-bold">Harika bilgiler hazırlanıyor...</p>
            </div>
          ) : currentCard ? (
            <div className={`flex-1 flex flex-col md:flex-row transition-transform duration-300 h-full overflow-hidden ${
              slideDirection === "up" ? "-translate-y-full opacity-0" : 
              slideDirection === "down" ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
            }`}>
              
              {/* LEFT COLUMN: Hero Image + Title & Summary */}
              <div className="w-full md:w-[42%] flex flex-col border-b md:border-b-0 md:border-r border-white/5 h-auto md:h-full bg-[#080c18] flex-none md:flex-1">
                <div className="h-[200px] md:h-[250px] relative w-full overflow-hidden flex-none">
                  <img 
                    src={currentCard.heroImageUrl || currentCard.placeholderImageUrl || "/brand-placeholder.png"} 
                    alt={currentCard.imageAltText || "Araç görseli"} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080c18] via-transparent to-black/60" />

                  {currentCard.imageSource && (
                    <div className="absolute bottom-2 right-3 text-[9px] text-white/40 bg-black/30 px-2 py-0.5 rounded-md border border-white/5 backdrop-blur-sm">
                      Görsel: {currentCard.imageSource} ({currentCard.imageLicense || "Lisanslı"})
                    </div>
                  )}
                </div>

                <div className="p-5 md:p-6 flex-1 flex flex-col gap-2.5 justify-center overflow-y-auto">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h1 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">
                      {currentCard.brand} <span className="text-orange-500">{currentCard.model}</span>
                    </h1>
                    {currentCard.generationCode && (
                      <span className="text-[10px] font-mono font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded text-slate-400">
                        {currentCard.generationCode}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                    <span>📅 {currentCard.yearStart} - {currentCard.yearEnd || "Günümüz"}</span>
                    {currentCard.bodyType && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span>🚗 {translateBodyType(currentCard.bodyType)}</span>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-slate-350 leading-relaxed italic bg-white/5 border border-white/5 p-3.5 rounded-2xl">
                    "{currentCard.shortSummary}"
                  </p>

                  {/* Previous / Next buttons placed side-by-side in left column */}
                  <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-white/5 flex-none">
                    <button 
                      onClick={handleSwipePrev}
                      disabled={historyStack.length === 0}
                      className={`group flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer select-none transition ${
                        historyStack.length > 0 
                          ? "bg-white/5 hover:bg-white/10 border-white/10 text-white/80 hover:text-white" 
                          : "bg-white/0 border-white/5 text-white/20 cursor-not-allowed opacity-50"
                      }`}
                    >
                      <span className={`inline-block transition-transform duration-300 ${historyStack.length > 0 ? "group-hover:-translate-x-1.5 animate-pulse" : ""}`}>←</span>
                      Önceki
                    </button>

                    <button 
                      onClick={handleSwipeNext}
                      className="group flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition text-xs font-bold cursor-pointer select-none"
                    >
                      Sonraki
                      <span className="inline-block transition-transform duration-300 group-hover:translate-x-1.5 animate-pulse">→</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Facts Grid + Footer CTA */}
              <div className="flex-1 flex flex-col h-full justify-between bg-[#090d1a]">
                
                {/* Facts section with no scrollbar on desktop */}
                <div className="flex-1 p-5 md:p-6 overflow-y-auto md:overflow-hidden flex flex-col gap-2.5 justify-center">
                  <div className="flex items-center justify-between w-full mb-2">
                    <h2 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      🔍 Araç Hakkında Kritik Bilgiler
                    </h2>
                    <span className="text-[9px] font-black tracking-wider text-white bg-orange-600/90 border border-orange-500/25 px-2.5 py-0.5 rounded-full uppercase">
                      Rehber
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 md:gap-2.5">
                    {currentCard.facts.slice(0, 4).map((fact) => (
                      <div 
                        key={fact.id} 
                        className="bg-white/5 border border-white/5 hover:border-orange-500/20 rounded-2xl p-3 md:p-2.5 flex flex-col gap-1 transition duration-300"
                      >
                        <h3 className="text-xs font-black text-slate-200 uppercase tracking-wide">
                          {fact.title}
                        </h3>
                        <p className="text-[10.5px] leading-relaxed text-slate-400 font-medium">
                          {fact.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Controls & CTA */}
                <div className="p-5 md:p-6 border-t border-white/5 flex flex-col gap-3.5 bg-[#070b17] flex-none relative">
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={fetchTechnicalInfo}
                      className="flex-1 py-3 px-4 rounded-2xl bg-[#0f172a] border border-blue-900/60 hover:bg-[#1e293b] text-xs font-bold text-blue-300 hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer select-none"
                    >
                      <span>🛠️ Teknik Bilgiler</span>
                      <span>{techOpen ? "↑" : "↓"}</span>
                    </button>

                    <button 
                      onClick={handleCtaClick}
                      className="flex-1 py-3 px-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-xs font-black tracking-wide text-white shadow-lg shadow-orange-500/10 transition cursor-pointer select-none"
                    >
                      <span>🔍 İlanlarını Gör</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <p className="text-slate-400 text-sm font-bold">Görüntülenecek aktif rehber bulunamadı.</p>
            </div>
          )}

          {techOpen && (
            <div className="absolute inset-x-0 bottom-0 bg-[#090d1e] border-t border-white/15 rounded-t-[32px] p-6 shadow-2xl z-30 transition-transform duration-300 animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <h2 className="text-sm font-black text-white uppercase tracking-wider">🛠️ Detaylı Teknik Veriler</h2>
                <button 
                  onClick={() => setTechOpen(false)}
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
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Segment / Çekiş</span>
                      <span className="text-xs font-semibold text-slate-200">
                        {technicalInfo.segment || "-"} Segment / {technicalInfo.drivetrain ? translateDrivetrain(technicalInfo.drivetrain) : "-"}
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

                  <button 
                    onClick={handleCtaClick}
                    className="w-full mt-2 py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs font-black tracking-wide text-white transition cursor-pointer select-none"
                  >
                    🚗 Bu Modelin İlanlarını Listele
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">Teknik bilgiler alınamadı.</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
