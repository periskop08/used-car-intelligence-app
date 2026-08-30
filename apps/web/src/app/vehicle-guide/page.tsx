"use client";

import React, { useEffect, useState, useRef } from "react";
import VehicleGuideCardLayout from "@/components/VehicleGuideCardLayout";

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
  imageObjectPosition?: string;
  imageFitMode?: string;
  licenseLabelPosition?: string;
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

const getLicensePositionClass = (position?: string) => {
  switch (position) {
    case "bottom-left":
      return "bottom-2 left-3";
    case "top-right":
      return "top-2 right-3";
    case "top-left":
      return "top-2 left-3";
    case "bottom-right":
    default:
      return "bottom-2 right-3";
  }
};

const formatImageUrl = (url?: string) => {
  if (!url) return "";
  if (url.includes("r2.dev") || url.includes("cloudflarestorage.com")) {
    const parts = url.split(".r2.dev/");
    if (parts.length > 1) {
      return `${API_URL}/listings/media-proxy/${parts[1]}`;
    }
  }
  return url;
};

// Trigger build: Force fresh Vercel build to fetch the brand new AI-generated images and 75 models from Neon database
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
        {loading ? (
          <div className="w-full max-w-[430px] md:max-w-[840px] h-[580px] bg-[#090d1a] border border-white/10 rounded-[48px] shadow-2xl flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm font-bold">Harika bilgiler hazırlanıyor...</p>
          </div>
        ) : currentCard ? (
          <VehicleGuideCardLayout
            brand={currentCard.brand}
            model={currentCard.model}
            generationCode={currentCard.generationCode}
            yearStart={currentCard.yearStart}
            yearEnd={currentCard.yearEnd}
            bodyType={currentCard.bodyType}
            heroImageUrl={currentCard.heroImageUrl}
            placeholderImageUrl={currentCard.placeholderImageUrl}
            imageAltText={currentCard.imageAltText}
            imageSource={currentCard.imageSource}
            imageLicense={currentCard.imageLicense}
            licenseLabelPosition={currentCard.licenseLabelPosition}
            imageFitMode={currentCard.imageFitMode}
            imageObjectPosition={currentCard.imageObjectPosition}
            shortSummary={currentCard.shortSummary}
            facts={currentCard.facts}
            techOpen={techOpen}
            onToggleTech={fetchTechnicalInfo}
            technicalInfo={technicalInfo}
            loadingTech={loadingTech}
            isReadonly={true}
            onSwipePrev={handleSwipePrev}
            onSwipeNext={handleSwipeNext}
            hasPrev={historyStack.length > 0}
            onCtaClick={handleCtaClick}
            slideDirection={slideDirection}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        ) : (
          <div className="w-full max-w-[430px] md:max-w-[840px] h-[580px] bg-[#090d1a] border border-white/10 rounded-[48px] shadow-2xl flex items-center justify-center p-6 text-center">
            <p className="text-slate-400 text-sm font-bold">Görüntülenecek aktif rehber bulunamadı.</p>
          </div>
        )}
      </main>
    </div>
  );
}
