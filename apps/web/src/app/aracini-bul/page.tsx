"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Check, 
  X, 
  ArrowRight, 
  RefreshCcw, 
  Sparkles, 
  Car, 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  ChevronRight, 
  SlidersHorizontal,
  Info
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

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

const formatPrice = (amount: number | string) => {
  const value = Number(amount);
  if (isNaN(value)) return "-";
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);
};

interface DiscoveryCard {
  id: string;
  brand: string;
  modelFamily: string;
  bodyType: string;
  fuelType: string;
  transmissionType: string;
  engineVersion: string;
  power: string;
  torque: string;
  productionYears: string;
  averageConsumption: string;
  drivetrain: string;
  imageUrl: string;
  tags: string[];
}

interface RecommendedVariant {
  id: string;
  brand: { name: string };
  model: { name: string };
  generation?: { name: string };
  engine?: { name: string };
  transmission?: { name: string; type: string; speeds: number };
  trim?: { name: string };
  priceSnapshot?: { estimatedMin: number; estimatedMax: number; medianPrice: number };
  listings: Array<{
    id: string;
    title: string;
    priceAmount: number;
    modelYear: number;
    kilometers: number;
    city: string;
    media: Array<{ url: string }>;
  }>;
}

interface RecommendationResult {
  message: string;
  scoringProfile: {
    bodyTypeScores: Record<string, number>;
    fuelTypeScores: Record<string, number>;
    transmissionScores: Record<string, number>;
    brandScores: Record<string, number>;
    modelFamilyScores: Record<string, number>;
  };
  recommendations: RecommendedVariant[];
}

const translateBodyType = (bodyType: string) => {
  if (!bodyType) return "";
  const mapping: Record<string, string> = {
    SEDAN: "Sedan",
    HATCHBACK: "Hatchback",
    SUV: "SUV",
    WAGON: "Station Wagon",
    PICKUP: "Pickup",
    VAN: "Minivan / Panelvan",
    OTHER: "Diğer"
  };
  return mapping[bodyType.toUpperCase()] || bodyType;
};

const translateFuelType = (fuel: string) => {
  if (!fuel) return "";
  const f = fuel.toUpperCase();
  if (f === "PETROL" || f === "BENZINLI") return "Benzinli";
  if (f === "DIESEL" || f === "DIZEL") return "Dizel";
  if (f === "HYBRID" || f === "HIBRIT") return "Hibrit";
  if (f === "ELECTRIC" || f === "ELEKTRIK") return "Elektrikli";
  if (f === "LPG") return "LPG";
  return fuel;
};

const translateTransmission = (trans: string) => {
  if (!trans) return "";
  const t = trans.toUpperCase();
  if (t === "AUTOMATIC" || t === "OTOMATIK") return "Otomatik";
  if (t === "MANUAL" || t === "MANUEL") return "Manuel";
  return trans;
};

export default function FindMyCarPage() {
  const [sessionId, setSessionId] = useState<string>("");
  const [token, setToken] = useState<string | null>(null);
  
  // Game states: 'intro' | 'loading' | 'swiping' | 'result' | 'empty' | 'error'
  const [gameState, setGameState] = useState<"intro" | "loading" | "swiping" | "result" | "empty" | "error">("intro");
  
  const [currentCard, setCurrentCard] = useState<DiscoveryCard | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [sessionVersion, setSessionVersion] = useState<number>(0);
  const [targetCount, setTargetCount] = useState<number>(20);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  
  const [resultsData, setResultsData] = useState<RecommendationResult | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);

  // Filter States
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [selectedBodies, setSelectedBodies] = useState<string[]>([]);
  const [selectedFuels, setSelectedFuels] = useState<string[]>([]);
  const [selectedTransmissions, setSelectedTransmissions] = useState<string[]>([]);

  // Swipe animation states
  const [offsetX, setOffsetX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Body Styles Options (6 Basic Types)
  const bodyStyles = [
    { key: "SEDAN", label: "Sedan" },
    { key: "HATCHBACK", label: "Hatchback" },
    { key: "SUV", label: "SUV" },
    { key: "WAGON", label: "Station Wagon" },
    { key: "PICKUP", label: "Pickup" },
    { key: "VAN", label: "Minivan / Panelvan" }
  ];

  // Fuel Options
  const fuelOptions = [
    { key: "PETROL", label: "Benzinli" },
    { key: "DIESEL", label: "Dizel" },
    { key: "HYBRID", label: "Hibrit" },
    { key: "ELECTRIC", label: "Elektrikli" },
    { key: "LPG", label: "LPG" }
  ];

  // Transmission Options
  const transmissionOptions = [
    { key: "MANUAL", label: "Manuel" },
    { key: "AUTOMATIC", label: "Otomatik" }
  ];

  // customFetch helper to support both localstorage fallback and credentials
  const customFetch = async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const headers = { ...(options.headers as Record<string, string> || {}) };
    
    // 1. Bearer Token if authenticated user
    const activeToken = token || localStorage.getItem("accessToken");
    if (activeToken) {
      headers["Authorization"] = `Bearer ${activeToken}`;
    }

    // 2. x-guest-token if guest identity token is saved
    const savedGuestToken = localStorage.getItem("discoveryGuestToken");
    if (savedGuestToken) {
      headers["x-guest-token"] = savedGuestToken;
    }

    const mergedOptions: RequestInit = {
      ...options,
      headers,
      credentials: "include"
    };

    const res = await fetch(url, mergedOptions);

    // 3. Extract x-guest-token response header to save it for fallback
    const newGuestToken = res.headers.get("x-guest-token");
    if (newGuestToken) {
      localStorage.setItem("discoveryGuestToken", newGuestToken);
    }

    return res;
  };

  // Load Session and Cookies
  useEffect(() => {
    const savedToken = localStorage.getItem("accessToken");
    setToken(savedToken);

    // Initial Session Startup
    startOrResumeSession(savedToken);
  }, []);

  // Keyboard navigation for swipes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== "swiping" || exitDirection) return;
      if (e.key === "ArrowRight") {
        handleSwipe("right");
      } else if (e.key === "ArrowLeft") {
        handleSwipe("left");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, exitDirection, currentCard, sessionVersion]);

  // Start or resume discovery session
  const startOrResumeSession = async (authToken?: string | null): Promise<string> => {
    try {
      const activeToken = authToken !== undefined ? authToken : token;

      // POST /sessions
      const res = await customFetch(`${API_URL}/vehicle-discovery/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: {
            minimumPrice: minPrice ? Number(minPrice) : undefined,
            maximumPrice: maxPrice ? Number(maxPrice) : undefined,
            bodyTypes: selectedBodies.length > 0 ? selectedBodies : undefined,
            fuelTypes: selectedFuels.length > 0 ? selectedFuels : undefined,
            transmissions: selectedTransmissions.length > 0 ? selectedTransmissions : undefined
          }
        })
      });

      if (res.status === 201 || res.status === 200) {
        const data = await res.json();
        setSessionId(data.session.id);
        setCurrentIndex(data.session.currentIndex);
        setSessionVersion(data.session.version);
        setTargetCount(data.session.targetCount);
        setWarningMessage(data.warning);

        if (data.session.status === "COMPLETED") {
          await loadResults(data.session.id, activeToken);
        } else {
          // Sync existing filter variables
          setMinPrice(data.session.minimumPrice ? String(data.session.minimumPrice) : "");
          setMaxPrice(data.session.maximumPrice ? String(data.session.maximumPrice) : "");
          setSelectedBodies(data.session.bodyTypes || []);
          setSelectedFuels(data.session.fuelTypes || []);
          setSelectedTransmissions(data.session.transmissions || []);
        }

        // Merge session swipes if authenticated and just started
        if (activeToken) {
          customFetch(`${API_URL}/vehicle-discovery/merge`, { method: "POST" })
            .then(async (mergeRes) => {
              if (mergeRes.status === 200 || mergeRes.status === 201) {
                localStorage.removeItem("discoveryGuestToken");
              }
            })
            .catch((e) => console.error("Error merging swipes:", e));
        }

        return data.session.id;
      } else {
        setGameState("error");
        return "";
      }
    } catch (e) {
      console.error("Error starting discovery session:", e);
      setGameState("error");
      return "";
    }
  };

  const startDiscovery = async () => {
    setGameState("loading");
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      const activeToken = token || localStorage.getItem("accessToken");
      activeSessionId = await startOrResumeSession(activeToken);
    }
    if (activeSessionId) {
      await fetchNextCard(activeSessionId);
    }
  };

  // Submit filters changes
  const applyFilters = async () => {
    setGameState("loading");
    setShowFilterPanel(false);
    try {
      if (!sessionId) {
        const activeToken = token || localStorage.getItem("accessToken");
        const newSId = await startOrResumeSession(activeToken);
        if (newSId) {
          await fetchNextCard(newSId);
        }
        return;
      }

      const res = await customFetch(`${API_URL}/vehicle-discovery/sessions/${sessionId}/filters`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: {
            minimumPrice: minPrice ? Number(minPrice) : 0,
            maximumPrice: maxPrice ? Number(maxPrice) : null,
            bodyTypes: selectedBodies,
            fuelTypes: selectedFuels,
            transmissions: selectedTransmissions
          }
        })
      });

      if (res.status === 200) {
        const data = await res.json();
        setCurrentIndex(data.session.currentIndex);
        setSessionVersion(data.session.version);
        setWarningMessage(data.warning);
        await fetchNextCard(sessionId);
      } else {
        setGameState("error");
      }
    } catch (e) {
      console.error("Error updating filters:", e);
      setGameState("error");
    }
  };

  // Reset Session
  const resetDiscovery = async () => {
    setGameState("loading");
    try {
      setMinPrice("");
      setMaxPrice("");
      setSelectedBodies([]);
      setSelectedFuels([]);
      setSelectedTransmissions([]);
      setWarningMessage(null);
      setCurrentCard(null);

      const res = await customFetch(`${API_URL}/vehicle-discovery/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: {} })
      });

      if (res.status === 201 || res.status === 200) {
        const data = await res.json();
        setSessionId(data.session.id);
        setCurrentIndex(data.session.currentIndex);
        setSessionVersion(data.session.version);
        setTargetCount(data.session.targetCount);
        setGameState("intro");
      } else {
        setGameState("error");
      }
    } catch (e) {
      console.error("Error resetting discovery:", e);
      setGameState("error");
    }
  };

  // Fetch Next Card
  const fetchNextCard = async (targetSessionId?: string) => {
    const sId = targetSessionId || sessionId;
    if (!sId) return;
    try {
      const res = await customFetch(
        `${API_URL}/vehicle-discovery/sessions/${sId}/next`
      );

      if (res.status === 200) {
        const data = await res.json();
        if (data.status === "COMPLETED") {
          await loadResults(sId);
          return;
        }

        const card = data.card;
        if (!card) {
          await loadResults(sId);
          return;
        }

        setCurrentCard(card);
        setCurrentIndex(data.currentIndex);
        setSessionVersion(data.version);
        setGameState("swiping");
      } else {
        setGameState("error");
      }
    } catch (e) {
      console.error("Error fetching next card:", e);
      setGameState("error");
    }
  };

  // Record Swipe
  const handleSwipe = async (direction: "left" | "right") => {
    if (!currentCard || exitDirection || !sessionId) return;

    const action = direction === "right" ? "LIKE" : "DISLIKE";
    setExitDirection(direction);

    setTimeout(async () => {
      try {
        const res = await customFetch(`${API_URL}/vehicle-discovery/sessions/${sessionId}/swipes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardId: currentCard.id,
            action,
            version: sessionVersion
          })
        });

        if (res.status === 201 || res.status === 200) {
          const data = await res.json();
          setCurrentIndex(data.currentIndex);
          setSessionVersion(data.version);
          setOffsetX(0);
          setExitDirection(null);

          if (data.status === "COMPLETED") {
            await loadResults(sessionId);
            return;
          }

          // Fetch next card now that the index has been incremented
          setGameState("loading");
          await fetchNextCard(sessionId);
        } else if (res.status === 409) {
          // Version conflict, reload session candidate card
          setOffsetX(0);
          setExitDirection(null);
          setGameState("loading");
          await fetchNextCard(sessionId);
        } else {
          setExitDirection(null);
          setGameState("error");
        }
      } catch (e) {
        console.error("Error submitting swipe:", e);
        setExitDirection(null);
        setGameState("error");
      }
    }, 250);
  };

  // Load final recommendations results
  const loadResults = async (sId: string, authToken?: string | null) => {
    setGameState("loading");
    try {
      const res = await customFetch(`${API_URL}/vehicle-discovery/sessions/${sId}/results`);
      if (res.status === 200) {
        const data = await res.json();
        setResultsData(data);
        setGameState("result");
      } else {
        setGameState("empty");
      }
    } catch (e) {
      console.error("Error loading recommendations:", e);
      setGameState("error");
    }
  };

  // Drag Gesture Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (exitDirection) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const diffX = e.clientX - dragStart.current.x;
    setOffsetX(diffX);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (offsetX > 130) {
      handleSwipe("right");
    } else if (offsetX < -130) {
      handleSwipe("left");
    } else {
      setOffsetX(0);
    }
  };

  // Touch Drag Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (exitDirection) return;
    setIsDragging(true);
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diffX = e.touches[0].clientX - dragStart.current.x;
    setOffsetX(diffX);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (offsetX > 110) {
      handleSwipe("right");
    } else if (offsetX < -110) {
      handleSwipe("left");
    } else {
      setOffsetX(0);
    }
  };

  const getCardStyle = () => {
    if (exitDirection) {
      return {
        transform: `translateX(${exitDirection === "right" ? 500 : -500}px) rotate(${
          exitDirection === "right" ? 15 : -15
        }deg)`,
        opacity: 0,
        transition: "all 0.25s ease-in-out",
      };
    }

    if (isDragging) {
      return {
        transform: `translateX(${offsetX}px) rotate(${offsetX * 0.04}deg)`,
        transition: "none",
      };
    }

    return {
      transform: "translateX(0px) rotate(0deg)",
      transition: "transform 0.25s ease-out",
    };
  };

  // Multi-select Toggle Helpers
  const toggleBody = (key: string) => {
    setSelectedBodies(prev => 
      prev.includes(key) ? prev.filter(b => b !== key) : [...prev, key]
    );
  };

  const toggleFuel = (key: string) => {
    setSelectedFuels(prev => 
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
    );
  };

  const toggleTrans = (key: string) => {
    setSelectedTransmissions(prev => 
      prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]
    );
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Background aesthetics */}
      <div className="absolute right-1/4 top-1/4 w-[350px] h-[350px] bg-orange-600/5 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute left-1/4 bottom-1/4 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-8 max-w-6xl mx-auto w-full relative">
        {/* Warning messages */}
        {warningMessage && gameState === "swiping" && (
          <div className="w-full max-w-md bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3.5 rounded-2xl flex items-start gap-3 text-xs mb-6 backdrop-blur-md shadow-lg">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">{warningMessage}</div>
          </div>
        )}

        {/* INTRO STATE */}
        {gameState === "intro" && (
          <div className="text-center max-w-md bg-slate-900/40 border border-white/5 p-8 rounded-[32px] backdrop-blur-md shadow-2xl relative">
            <div className="bg-gradient-to-tr from-orange-500/20 to-amber-500/10 border border-orange-500/20 text-orange-400 p-5 rounded-3xl w-fit mx-auto mb-6">
              <Car className="w-10 h-10" />
            </div>

            <h1 className="text-3xl font-black bg-gradient-to-r from-orange-400 to-amber-200 bg-clip-text text-transparent mb-3 tracking-tight">
              Aracını Bul
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Hangi aracı alacağından emin değil misin? Karşına gelen araç kartlarını beğenip geçerek
              tercihlerini keşfet, yapay zeka destekli TorqueScout modeliyle en uygun araçları bulalım.
            </p>

            <div className="flex flex-col gap-3">
              {/* Start Discovery */}
              <button
                onClick={startDiscovery}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-orange-500/15 hover:shadow-orange-500/25 transition duration-150 flex items-center justify-center gap-2 cursor-pointer group"
              >
                <span>{currentIndex > 0 ? `Kaldığın Yerden Devam Et (${currentIndex})` : "Keşfe Başla"}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Reset Session Option if partially completed */}
              {currentIndex > 0 && (
                <button
                  onClick={resetDiscovery}
                  className="w-full bg-white/5 hover:bg-white/10 text-slate-300 font-semibold py-3.5 px-6 rounded-2xl border border-white/10 transition duration-150 cursor-pointer"
                >
                  Oturumu Sıfırla
                </button>
              )}

              {/* Configure Filters Trigger */}
              <button
                onClick={() => setShowFilterPanel(true)}
                className="w-full bg-white/[0.02] border border-white/5 hover:bg-white/5 text-slate-400 font-semibold py-3.5 px-6 rounded-2xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Kriterleri Yapılandır</span>
              </button>
            </div>

            <div className="mt-4 text-[10px] text-slate-500">
              En az 20 aracı değerlendirerek sana en uygun listeyi oluştur.
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {gameState === "loading" && (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <div className="relative">
              <div className="w-14 h-14 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
              <Sparkles className="w-6 h-6 text-orange-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <div className="text-slate-400 text-sm font-semibold tracking-wide">Yapay zeka önerileri taranıyor...</div>
          </div>
        )}

        {/* SWIPING SCREEN STATE */}
        {gameState === "swiping" && currentCard && (
          <div className="w-full flex flex-col lg:flex-row items-stretch justify-center gap-8 max-w-5xl">
            
            {/* Filter settings panel (Left/Top) */}
            <div className="lg:w-[320px] bg-slate-900/40 border border-white/5 p-6 rounded-[28px] backdrop-blur-md shadow-2xl flex flex-col gap-6 flex-shrink-0">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-orange-400" />
                  <h3 className="font-extrabold text-slate-200">Keşif Kriterleri</h3>
                </div>
              </div>

              {/* Price Filter */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fiyat Aralığı (TL)</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/5 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-500/40"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/5 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-500/40"
                  />
                </div>
              </div>

              {/* Body Types Select */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kasa Tipi</span>
                <div className="flex flex-wrap gap-1.5">
                  {bodyStyles.map(body => {
                    const isSelected = selectedBodies.includes(body.key);
                    return (
                      <button
                        key={body.key}
                        onClick={() => toggleBody(body.key)}
                        className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-orange-500/10 border-orange-500/40 text-orange-400 font-bold" 
                            : "bg-white/[0.01] border-white/5 text-slate-400 hover:bg-white/5"
                        }`}
                      >
                        {body.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fuel Type Select */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Yakıt Türü</span>
                <div className="flex flex-wrap gap-1.5">
                  {fuelOptions.map(fuel => {
                    const isSelected = selectedFuels.includes(fuel.key);
                    return (
                      <button
                        key={fuel.key}
                        onClick={() => toggleFuel(fuel.key)}
                        className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-orange-500/10 border-orange-500/40 text-orange-400 font-bold" 
                            : "bg-white/[0.01] border-white/5 text-slate-400 hover:bg-white/5"
                        }`}
                      >
                        {fuel.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Transmission Type Select */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Şanzıman</span>
                <div className="flex flex-wrap gap-1.5">
                  {transmissionOptions.map(trans => {
                    const isSelected = selectedTransmissions.includes(trans.key);
                    return (
                      <button
                        key={trans.key}
                        onClick={() => toggleTrans(trans.key)}
                        className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-orange-500/10 border-orange-500/40 text-orange-400 font-bold" 
                            : "bg-white/[0.01] border-white/5 text-slate-400 hover:bg-white/5"
                        }`}
                      >
                        {trans.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Apply Filters Trigger */}
              <button
                onClick={applyFilters}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition duration-150 cursor-pointer text-sm"
              >
                Filtreleri Uygula
              </button>
            </div>

            {/* Swipe Game Container */}
            <div className="flex-1 flex flex-col items-center">
              {/* Progress counter */}
              <div className="w-full max-w-sm mb-4 text-center">
                <div className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1">
                  Araç Keşif Süreci
                </div>
                <div className="text-xl font-black text-slate-200">
                  {currentIndex} / {targetCount}
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-400 h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (currentIndex / targetCount) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Card Container */}
              <div className="relative w-full max-w-sm h-[480px] mb-6 select-none">
                {/* Visual stacked cards background */}
                <div className="absolute inset-0 bg-[#090d1a]/80 border border-white/5 rounded-[28px] scale-95 translate-y-3 opacity-60 -z-10 shadow-lg pointer-events-none" />
                <div className="absolute inset-0 bg-[#090d1a]/50 border border-white/5 rounded-[28px] scale-90 translate-y-6 opacity-30 -z-20 shadow-md pointer-events-none" />

                {/* Left/Right Desktop buttons */}
                <button
                  onClick={() => handleSwipe("left")}
                  disabled={!!exitDirection}
                  className="w-12 h-12 bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/30 hover:border-red-500/50 rounded-full flex items-center justify-center transition duration-150 shadow-md cursor-pointer active:scale-95 absolute top-1/2 -translate-y-1/2 -left-16 z-20"
                >
                  <X className="w-5 h-5" />
                </button>

                <button
                  onClick={() => handleSwipe("right")}
                  disabled={!!exitDirection}
                  className="w-12 h-12 bg-green-500/10 hover:bg-green-500/25 text-green-400 border border-green-500/30 hover:border-green-500/50 rounded-full flex items-center justify-center transition duration-150 shadow-md cursor-pointer active:scale-95 absolute top-1/2 -translate-y-1/2 -right-16 z-20"
                >
                  <Check className="w-5 h-5" />
                </button>

                {/* Card markup */}
                <div
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  style={getCardStyle()}
                  className={`absolute inset-0 bg-[#0c1224] border border-white/10 rounded-[28px] overflow-hidden shadow-2xl flex flex-col cursor-grab active:cursor-grabbing ${
                    isDragging ? "select-none" : ""
                  }`}
                >
                  {/* Photo area */}
                  <div className="relative h-44 w-full bg-slate-950 pointer-events-none flex-none border-b border-white/5 overflow-hidden">
                    <div 
                      className="absolute inset-0 bg-cover bg-center blur-xl opacity-35 scale-110 pointer-events-none"
                      style={{ backgroundImage: `url(${formatImageUrl(currentCard.imageUrl)})` }}
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formatImageUrl(currentCard.imageUrl)}
                      alt={currentCard.modelFamily}
                      className="w-full h-full object-contain relative z-10"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c1224] to-transparent z-20" />

                    <div className="absolute bottom-3 left-5 right-5 z-30">
                      <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block mb-0.5">
                        {currentCard.brand}
                      </span>
                      <h4 className="text-lg font-black text-slate-100 leading-tight">
                        {currentCard.modelFamily}
                      </h4>
                    </div>

                    {/* Drag indicator banners */}
                    {offsetX > 40 && (
                      <div className="absolute top-4 left-4 bg-green-500/20 border border-green-500/40 text-green-400 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider rotate-[-10deg] backdrop-blur-md z-30">
                        BEĞENDİM
                      </div>
                    )}
                    {offsetX < -40 && (
                      <div className="absolute top-4 right-4 bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider rotate-[10deg] backdrop-blur-md z-30">
                        GEÇTİM
                      </div>
                    )}
                  </div>

                  {/* Specification Details */}
                  <div className="flex-1 p-5 flex flex-col justify-between overflow-y-auto pointer-events-none">
                    <div className="grid grid-cols-2 gap-3 text-[11px] leading-tight">
                      <div>
                        <span className="text-slate-500 block mb-0.5">Kasa Tipi</span>
                        <span className="font-semibold text-slate-300">{translateBodyType(currentCard.bodyType)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5">Yakıt</span>
                        <span className="font-semibold text-slate-300">{translateFuelType(currentCard.fuelType)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5">Şanzıman</span>
                        <span className="font-semibold text-slate-300">{translateTransmission(currentCard.transmissionType)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5">Motor</span>
                        <span className="font-semibold text-slate-300">{currentCard.engineVersion}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5">Güç / Tork</span>
                        <span className="font-semibold text-slate-300">{currentCard.power} / {currentCard.torque}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5">Ort. Tüketim</span>
                        <span className="font-semibold text-slate-300">{currentCard.averageConsumption}</span>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 border-t border-white/5 pt-3.5 mt-2">
                      {currentCard.tags.map(t => (
                        <span key={t} className="bg-white/5 text-[9px] text-slate-400 px-2 py-0.5 rounded-md">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile control triggers */}
              <div className="flex md:hidden justify-between w-full max-w-sm px-6">
                <button
                  onClick={() => handleSwipe("left")}
                  disabled={!!exitDirection}
                  className="w-14 h-14 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center cursor-pointer hover:bg-red-500/20 transition active:scale-95"
                >
                  <X className="w-6 h-6" />
                </button>
                <button
                  onClick={() => handleSwipe("right")}
                  disabled={!!exitDirection}
                  className="w-14 h-14 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full flex items-center justify-center cursor-pointer hover:bg-green-500/20 transition active:scale-95"
                >
                  <Check className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* THREE-SECTION RESULTS SCREEN (WOW!) */}
        {gameState === "result" && resultsData && (
          <div className="w-full max-w-4xl flex flex-col gap-8 animate-fade-in">
            {/* Header matches summary */}
            <div className="text-center max-w-2xl mx-auto">
              <span className="bg-gradient-to-r from-orange-500/20 to-amber-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-full inline-block mb-3.5">
                🌟 Yapay Zeka Sonuç Raporu
              </span>
              <h2 className="text-3xl font-black text-slate-100 tracking-tight mb-2">
                Tercihlerinize En Uygun Modeller Belirlendi
              </h2>
            </div>

            {/* Section 1: Tercih Profilin (Personality Match) */}
            <div className="bg-slate-900/40 border border-white/5 p-6 rounded-[28px] backdrop-blur-md shadow-2xl flex flex-col md:flex-row gap-6 items-stretch">
              <div className="flex-1 flex flex-col justify-between gap-4">
                <div className="flex items-center gap-2 text-sm font-bold text-orange-400">
                  <Sparkles className="w-5 h-5" />
                  <span>Karakteristik Özet</span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{resultsData.message}</p>
                
                {/* Stats scores breakdown */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Kasa Tipi</span>
                    <span className="text-xs font-black text-slate-200 capitalize">
                      {Object.keys(resultsData.scoringProfile.bodyTypeScores)[0] 
                        ? translateBodyType(Object.keys(resultsData.scoringProfile.bodyTypeScores)[0])
                        : "-"}
                    </span>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Motor/Yakıt</span>
                    <span className="text-xs font-black text-slate-200 capitalize">
                      {Object.keys(resultsData.scoringProfile.fuelTypeScores)[0]
                        ? translateFuelType(Object.keys(resultsData.scoringProfile.fuelTypeScores)[0])
                        : "-"}
                    </span>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Şanzıman</span>
                    <span className="text-xs font-black text-slate-200 capitalize">
                      {Object.keys(resultsData.scoringProfile.transmissionScores)[0]
                        ? translateTransmission(Object.keys(resultsData.scoringProfile.transmissionScores)[0])
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Önerilen Modeller (Recommended Cards) */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Car className="w-5 h-5 text-orange-400" />
                <h3 className="font-extrabold text-slate-200 text-lg">Önerilen Araç Modelleri</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resultsData.recommendations.map(v => (
                  <div 
                    key={v.id}
                    className="bg-slate-900/40 border border-white/5 rounded-[24px] overflow-hidden flex flex-col justify-between backdrop-blur-md hover:border-orange-500/20 transition-all duration-300"
                  >
                    <div className="p-5 flex flex-col gap-3">
                      <div>
                        <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest block mb-0.5">
                          {v.brand.name}
                        </span>
                        <h4 className="font-black text-slate-100 text-base leading-tight">
                          {v.model.name} {v.trim?.name || ""}
                        </h4>
                      </div>

                      {v.priceSnapshot && (
                        <div className="bg-orange-500/5 border border-orange-500/10 px-3 py-2.5 rounded-xl text-center">
                          <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Piyasa Fiyat Tahmini</span>
                          <span className="text-xs font-black text-orange-400 block">
                            {formatPrice(v.priceSnapshot.estimatedMin)} - {formatPrice(v.priceSnapshot.estimatedMax)}
                          </span>
                        </div>
                      )}

                      {/* Specs pills */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="bg-white/5 text-[9px] text-slate-400 px-2 py-0.5 rounded-md">
                          {v.engine?.name || "Standart"}
                        </span>
                        <span className="bg-white/5 text-[9px] text-slate-400 px-2 py-0.5 rounded-md">
                          {v.transmission ? `${v.transmission.speeds} İleri ${translateTransmission(v.transmission.type)}` : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Uygun İkinci El İlanlar (Active Listings) */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-orange-400" />
                <h3 className="font-extrabold text-slate-200 text-lg">Önerilen Araçlara Uyan Canlı İlanlar</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resultsData.recommendations.flatMap(v => v.listings).map(listing => (
                  <a
                    key={listing.id}
                    href={`/listings/${listing.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#0b0f1a]/80 border border-white/5 rounded-[22px] overflow-hidden flex gap-4 hover:border-orange-500/20 hover:bg-[#0c1224]/90 transition-all duration-300 p-3 group cursor-pointer"
                  >
                    {/* Cover Photo */}
                    <div className="w-24 h-24 bg-slate-950 rounded-xl overflow-hidden flex-shrink-0 relative">
                      {listing.media?.[0]?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={formatImageUrl(listing.media[0].url)}
                          alt={listing.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-900">
                          <Car className="w-8 h-8" />
                        </div>
                      )}
                    </div>

                    {/* Text Details */}
                    <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                      <div>
                        <h4 className="font-extrabold text-slate-200 text-sm leading-tight truncate group-hover:text-orange-400 transition-colors">
                          {listing.title}
                        </h4>
                        <div className="text-[10px] text-slate-400 mt-1 flex gap-2">
                          <span>{listing.modelYear} Model</span>
                          <span>•</span>
                          <span>{listing.kilometers.toLocaleString("tr-TR")} KM</span>
                          <span>•</span>
                          <span className="truncate">{listing.city}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-black text-orange-400">
                          {formatPrice(listing.priceAmount)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </a>
                ))}
                
                {resultsData.recommendations.flatMap(v => v.listings).length === 0 && (
                  <div className="col-span-2 bg-slate-900/20 border border-dashed border-white/5 p-8 rounded-2xl text-center">
                    <Info className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-xs">Bu araç kriterlerine uygun aktif satış ilanı bulunamadı.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Results Actions */}
            <div className="flex flex-col md:flex-row gap-4 mt-6">
              {currentIndex < 50 && (
                <button
                  onClick={async () => {
                    setGameState("loading");
                    try {
                      const res = await customFetch(`${API_URL}/vehicle-discovery/sessions/${sessionId}/filters`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          filters: {
                            minimumPrice: minPrice ? Number(minPrice) : 0,
                            maximumPrice: maxPrice ? Number(maxPrice) : null,
                            bodyTypes: selectedBodies,
                            fuelTypes: selectedFuels,
                            transmissions: selectedTransmissions
                          },
                          targetCount: 50
                        })
                      });
                      if (res.status === 200) {
                        const data = await res.json();
                        setCurrentIndex(data.session.currentIndex);
                        setSessionVersion(data.session.version);
                        setTargetCount(data.session.targetCount);
                        setWarningMessage(data.warning);
                        await fetchNextCard(sessionId);
                      } else {
                        setGameState("error");
                      }
                    } catch (e) {
                      console.error("Error extending session:", e);
                      setGameState("error");
                    }
                  }}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-3.5 px-6 rounded-2xl border border-white/5 transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCcw className="w-4 h-4" />
                  <span>20 Araç Daha Değerlendir</span>
                </button>
              )}

              <button
                onClick={resetDiscovery}
                className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-3.5 px-6 rounded-2xl border border-white/5 transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCcw className="w-4 h-4" />
                <span>Seçimleri Sıfırla ve Yeniden Keşfet</span>
              </button>
            </div>
          </div>
        )}

        {/* CONFIGURE FILTERS SCREEN MODAL OVERLAY */}
        {showFilterPanel && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/5 p-6 rounded-[28px] max-w-md w-full shadow-2xl flex flex-col gap-5 animate-scale-up">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="font-extrabold text-slate-200">Keşif Kriterlerini Yapılandır</h3>
                <button
                  onClick={() => setShowFilterPanel(false)}
                  className="text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Price price inputs */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fiyat Filtresi (TL)</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Minimum"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                  <input
                    type="number"
                    placeholder="Maksimum"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Body Selection */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kasa Tipi</span>
                <div className="flex flex-wrap gap-1.5">
                  {bodyStyles.map(b => (
                    <button
                      key={b.key}
                      onClick={() => toggleBody(b.key)}
                      className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        selectedBodies.includes(b.key)
                          ? "bg-orange-500/10 border-orange-500/40 text-orange-400 font-bold"
                          : "bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/5"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fuel selection */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Yakıt Türü</span>
                <div className="flex flex-wrap gap-1.5">
                  {fuelOptions.map(f => (
                    <button
                      key={f.key}
                      onClick={() => toggleFuel(f.key)}
                      className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        selectedFuels.includes(f.key)
                          ? "bg-orange-500/10 border-orange-500/40 text-orange-400 font-bold"
                          : "bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/5"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transmission selection */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Şanzıman</span>
                <div className="flex flex-wrap gap-1.5">
                  {transmissionOptions.map(t => (
                    <button
                      key={t.key}
                      onClick={() => toggleTrans(t.key)}
                      className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        selectedTransmissions.includes(t.key)
                          ? "bg-orange-500/10 border-orange-500/40 text-orange-400 font-bold"
                          : "bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/5"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 border-t border-white/5 pt-4 mt-2">
                <button
                  onClick={() => setShowFilterPanel(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 font-bold py-3 px-4 rounded-xl text-sm transition cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  onClick={applyFilters}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3 px-4 rounded-xl text-sm transition cursor-pointer shadow-lg shadow-orange-500/15"
                >
                  Uygula
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {gameState === "error" && (
          <div className="text-center max-w-sm bg-slate-900/40 border border-white/5 p-8 rounded-3xl backdrop-blur-md shadow-2xl">
            <RefreshCcw className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Veri Bağlantısı Hatası</h2>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              Platform veri tabanı veya servis bağlantısında geçici bir kesinti oluştu. Lütfen tekrar deneyin.
            </p>
            <button
              onClick={startDiscovery}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-6 rounded-2xl transition duration-150 cursor-pointer"
            >
              Tekrar Dene
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
