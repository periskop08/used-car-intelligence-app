"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, X, ArrowRight, RefreshCcw, Sparkles, Car, Settings, CheckCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

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

interface ProfileResult {
  id: string;
  totalSwipes: number;
  likeCount: number;
  dislikeCount: number;
  confidenceLevel: string;
  resultSummary: string;
  topBodyTypes: string[];
  topFuelTypes: string[];
  topTransmissionTypes: string[];
  topBrands: string[];
}

export default function FindMyCarPage() {
  const [sessionId, setSessionId] = useState<string>("");
  const [token, setToken] = useState<string | null>(null);
  
  // Game states: 'intro' | 'loading' | 'swiping' | 'result' | 'empty' | 'error'
  const [gameState, setGameState] = useState<"intro" | "loading" | "swiping" | "result" | "empty" | "error">("intro");

  const getOrInitSessionId = (): string => {
    if (sessionId) return sessionId;
    let savedSessionId = localStorage.getItem("discoverySessionId");
    if (!savedSessionId) {
      savedSessionId = crypto.randomUUID();
      localStorage.setItem("discoverySessionId", savedSessionId);
    }
    return savedSessionId;
  };
  
  const [currentCard, setCurrentCard] = useState<DiscoveryCard | null>(null);
  const [nextCardCache, setNextCardCache] = useState<DiscoveryCard | null>(null);
  const [swipesCount, setSwipesCount] = useState<number>(0);
  const [profile, setProfile] = useState<ProfileResult | null>(null);

  // Swipe animation states
  const [offsetX, setOffsetX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Get or Create Session ID & Merge if token exists
  useEffect(() => {
    const savedToken = localStorage.getItem("accessToken");
    setToken(savedToken);

    let savedSessionId = localStorage.getItem("discoverySessionId");
    if (!savedSessionId) {
      savedSessionId = crypto.randomUUID();
      localStorage.setItem("discoverySessionId", savedSessionId);
    }
    setSessionId(savedSessionId);

    // Merge session swipes if authenticated
    if (savedToken && savedSessionId) {
      fetch(`${API_URL}/vehicle-discovery/merge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${savedToken}`,
        },
        body: JSON.stringify({ sessionId: savedSessionId }),
      })
        .then((res) => res.json())
        .catch((e) => console.error("Error merging swipes:", e));
    }
  }, []);

  const startDiscovery = async () => {
    setGameState("loading");
    await fetchNextCard(true);
  };

  const fetchNextCard = async (initiateStateChange = false) => {
    try {
      const activeSession = getOrInitSessionId();
      const headers: any = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(
        `${API_URL}/vehicle-discovery/cards/next?sessionId=${activeSession}`,
        { headers }
      );

      if (res.status === 404) {
        setGameState("error");
        return;
      }

      if (res.status !== 200) {
        setGameState("error");
        return;
      }

      const card = await res.json();

      if (!card) {
        if (initiateStateChange) {
          // If initiating and no cards returned, check if we already have 30+ swipes to show results
          await checkProfileResults();
        } else {
          setNextCardCache(null);
        }
        return;
      }

      if (initiateStateChange) {
        setCurrentCard(card);
        setGameState("swiping");
        // Pre-fetch next card for cache
        fetchNextCard(false);
      } else {
        setNextCardCache(card);
      }
    } catch (e) {
      console.error("Error fetching next card:", e);
      setGameState("error");
    }
  };

  const checkProfileResults = async () => {
    try {
      const activeSession = getOrInitSessionId();
      const headers: any = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/vehicle-discovery/profile/${activeSession}`, {
        headers,
      });

      if (res.status === 200) {
        const data = await res.json();
        setProfile(data);
        setSwipesCount(data.totalSwipes);
        setGameState("result");
      } else {
        setGameState("empty");
      }
    } catch (e) {
      console.error("Error loading preference profile:", e);
      setGameState("error");
    }
  };

  const handleSwipe = async (direction: "left" | "right") => {
    if (!currentCard) return;

    const action = direction === "right" ? "LIKE" : "DISLIKE";
    setExitDirection(direction);

    // Wait for exit transition
    setTimeout(async () => {
      try {
        const headers: any = {
          "Content-Type": "application/json",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${API_URL}/vehicle-discovery/swipe`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            sessionId,
            cardId: currentCard.id,
            action,
          }),
        });

        const data = await res.json();
        const newCount = data.totalSwipes;
        setSwipesCount(newCount);
        setOffsetX(0);
        setExitDirection(null);

        // Limit to 50 swipes max
        if (newCount >= 50) {
          await checkProfileResults();
          return;
        }

        // Show results at 30 swipes unless they choose to continue
        if (newCount === 30 && action === "LIKE") {
          // At exactly 30, pause to show results. They can opt to continue.
          await checkProfileResults();
          return;
        }

        // Load next card
        if (nextCardCache) {
          setCurrentCard(nextCardCache);
          setNextCardCache(null);
          // Fetch next one in background
          fetchNextCard(false);
        } else {
          // Cache empty, load sync
          setGameState("loading");
          await fetchNextCard(true);
        }
      } catch (e) {
        console.error("Error submitting swipe:", e);
      }
    }, 300);
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

    if (offsetX > 140) {
      handleSwipe("right");
    } else if (offsetX < -140) {
      handleSwipe("left");
    } else {
      setOffsetX(0);
    }
  };

  // Touch handlers for mobile swipe
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

    if (offsetX > 120) {
      handleSwipe("right");
    } else if (offsetX < -120) {
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
        transition: "all 0.3s ease-in-out",
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
      transition: "transform 0.3s ease-out",
    };
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-200">
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-8 max-w-4xl mx-auto w-full">
        {/* INTRO STATE */}
        {gameState === "intro" && (
          <div className="text-center max-w-lg bg-white/[0.02] border border-white/5 p-8 rounded-3xl backdrop-blur-md shadow-2xl relative overflow-hidden">
            <div className="absolute -right-16 -top-16 w-36 h-36 bg-orange-500/10 rounded-full blur-2xl" />
            <div className="absolute -left-16 -bottom-16 w-36 h-36 bg-orange-600/10 rounded-full blur-2xl" />

            <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 p-4 rounded-2xl w-fit mx-auto mb-6">
              <Car className="w-10 h-10" />
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 to-amber-200 bg-clip-text text-transparent mb-4">
              Aracını Bul
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Nasıl bir araç istediğinden emin değil misin? Beğendiğin ve sana uygun gelmeyen araçları seç,
              TorqueScout sana en yakın araç tiplerini çıkarsın.
            </p>

            <button
              onClick={startDiscovery}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-orange-500/15 hover:shadow-orange-500/25 transition duration-150 flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>Keşfe Başla</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="mt-4 text-[11px] text-slate-500">
              30 aracı değerlendir, sana en uygun araç tipini çıkaralım.
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {gameState === "loading" && (
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
              <Sparkles className="w-5 h-5 text-orange-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <div className="text-slate-400 text-sm font-semibold">Bir sonraki araç hazırlanıyor...</div>
          </div>
        )}

        {/* SWIPING STATE */}
        {gameState === "swiping" && currentCard && (
          <div className="w-full flex flex-col items-center max-w-sm">
            {/* Progress Indicators */}
            <div className="w-full mb-6 text-center">
              <div className="text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1">
                {swipesCount < 30 ? "Ön Keşif Aşaması" : "Detaylı Analiz Aşaması"}
              </div>
              <div className="text-lg font-extrabold text-slate-200">
                {swipesCount < 30 ? `${swipesCount} / 30` : `${swipesCount} / 50`}
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-400 h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (swipesCount / (swipesCount < 30 ? 30 : 50)) * 100)}%` }}
                />
              </div>
              {swipesCount >= 30 && (
                <div className="text-[11px] text-slate-400 mt-1.5 animate-pulse">
                  Daha isabetli sonuç için devam edebilirsin
                </div>
              )}
            </div>

            {/* Stack Container */}
            <div className="relative w-full h-[520px] mb-8 select-none">
              {/* Back Card 2 (Visual stacked card) */}
              <div className="absolute inset-0 bg-[#090d1a]/90 border border-white/5 rounded-3xl scale-95 translate-y-3 opacity-60 -z-10 shadow-lg pointer-events-none" />
              {/* Back Card 3 (Visual stacked card) */}
              <div className="absolute inset-0 bg-[#090d1a]/80 border border-white/5 rounded-3xl scale-90 translate-y-6 opacity-30 -z-20 shadow-md pointer-events-none" />

              {/* Main Active Card */}
              <div
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={getCardStyle()}
                className={`absolute inset-0 bg-[#0c1224] border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col cursor-grab active:cursor-grabbing ${
                  isDragging ? "select-none" : ""
                }`}
              >
                {/* Image & Main Info Overlay */}
                <div className="relative h-48 w-full bg-slate-900 pointer-events-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentCard.imageUrl}
                    alt={currentCard.modelFamily}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c1224] via-transparent to-black/40" />

                  {/* Brand & Model Overlay */}
                  <div className="absolute bottom-4 left-6 right-6">
                    <div className="text-xs font-bold text-orange-400 uppercase tracking-widest">
                      {currentCard.brand}
                    </div>
                    <h2 className="text-2xl font-black text-white leading-tight">
                      {currentCard.modelFamily}
                    </h2>
                  </div>

                  {/* Drag Direction Indicators */}
                  {offsetX > 40 && (
                    <div className="absolute top-6 left-6 bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-extrabold px-3 py-1.5 rounded-xl uppercase tracking-widest rotate-[-12deg] backdrop-blur-md">
                      BEĞENDİM
                    </div>
                  )}
                  {offsetX < -40 && (
                    <div className="absolute top-6 right-6 bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-extrabold px-3 py-1.5 rounded-xl uppercase tracking-widest rotate-[12deg] backdrop-blur-md">
                      BANA GÖRE DEĞİL
                    </div>
                  )}
                </div>

                {/* Technical Specifications Grid */}
                <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar pointer-events-none">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-0.5">Kasa Tipi</span>
                      <span className="font-semibold text-slate-200">{currentCard.bodyType}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Yakıt Türü</span>
                      <span className="font-semibold text-slate-200">
                        {currentCard.fuelType === "PETROL"
                          ? "Benzinli"
                          : currentCard.fuelType === "DIESEL"
                          ? "Dizel"
                          : currentCard.fuelType === "HYBRID"
                          ? "Hibrit"
                          : "Elektrikli"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Şanzıman Tipi</span>
                      <span className="font-semibold text-slate-200">
                        {currentCard.transmissionType === "AUTOMATIC" ? "Otomatik" : "Manuel"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Motor / Versiyon</span>
                      <span className="font-semibold text-slate-200">{currentCard.engineVersion}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Motor Gücü</span>
                      <span className="font-semibold text-slate-200">{currentCard.power}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Tork Değeri</span>
                      <span className="font-semibold text-slate-200">{currentCard.torque}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Üretim Yılları</span>
                      <span className="font-semibold text-slate-200">{currentCard.productionYears}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Ort. Tüketim</span>
                      <span className="font-semibold text-slate-200">{currentCard.averageConsumption}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 block mb-0.5">Çekiş Tipi</span>
                      <span className="font-semibold text-slate-200">{currentCard.drivetrain}</span>
                    </div>
                  </div>

                  {/* Standardized Tags */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {currentCard.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-white/5 border border-white/5 text-[10px] text-slate-400 px-2 py-0.5 rounded-md"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Swipe Controls Button Bar */}
            <div className="flex justify-center items-center gap-6 w-full px-6">
              <button
                onClick={() => handleSwipe("left")}
                disabled={!!exitDirection}
                className="w-14 h-14 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/50 rounded-full flex items-center justify-center transition duration-150 cursor-pointer shadow-lg shadow-red-500/5 active:scale-95"
                title="Bana Göre Değil"
              >
                <X className="w-6 h-6" />
              </button>

              <button
                onClick={() => handleSwipe("right")}
                disabled={!!exitDirection}
                className="w-14 h-14 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 hover:border-green-500/50 rounded-full flex items-center justify-center transition duration-150 cursor-pointer shadow-lg shadow-green-500/5 active:scale-95"
                title="Beğendim"
              >
                <Check className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* RESULTS SCREEN */}
        {gameState === "result" && profile && (
          <div className="w-full max-w-xl bg-white/[0.02] border border-white/5 p-8 rounded-3xl backdrop-blur-md shadow-2xl relative overflow-hidden flex flex-col gap-6">
            <div className="absolute -right-16 -top-16 w-36 h-36 bg-orange-500/10 rounded-full blur-2xl" />

            <div className="text-center">
              <span className="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full inline-block mb-3">
                🏆 Tercih Profilin Hazır
              </span>
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">
                {swipesCount >= 50 ? "Profilin Güçlendirildi" : "Tercih Analizin Tamamlandı"}
              </h2>
            </div>

            {/* Turkish Summary description */}
            <div className="bg-white/5 border border-white/5 p-5 rounded-2xl leading-relaxed text-sm text-slate-300 relative">
              <Sparkles className="w-4 h-4 text-orange-400 absolute right-4 top-4" />
              {profile.resultSummary}
            </div>

            {/* Profile Characteristics Breakdown */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 block mb-1">KASA TERCİHİ</span>
                <span className="text-xs font-bold text-slate-200 capitalize">
                  {profile.topBodyTypes[0] || "-"}
                </span>
              </div>
              <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 block mb-1">YAKIT TERCİHİ</span>
                <span className="text-xs font-bold text-slate-200 capitalize">
                  {profile.topFuelTypes[0] || "-"}
                </span>
              </div>
              <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 block mb-1">ŞANZIMAN</span>
                <span className="text-xs font-bold text-slate-200 capitalize">
                  {profile.topTransmissionTypes[0] || "-"}
                </span>
              </div>
            </div>

            {/* Recommended Brands/Models */}
            {profile.topBrands.length > 0 && (
              <div className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3">
                  Sana Yakın Markalar
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.topBrands.map((brand) => (
                    <span
                      key={brand}
                      className="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold px-3 py-1 rounded-xl"
                    >
                      {brand}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 mt-4">
              <a
                href={`/listings?preferenceProfileId=${profile.id}&sessionId=${sessionId}`}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-orange-500/15 hover:shadow-orange-500/25 transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Sana Uygun İlanları Gör</span>
                <ArrowRight className="w-5 h-5" />
              </a>

              {swipesCount < 50 && (
                <button
                  onClick={() => {
                    setGameState("loading");
                    fetchNextCard(true);
                  }}
                  className="w-full bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-3.5 px-6 rounded-2xl border border-white/5 transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCcw className="w-4 h-4" />
                  <span>20 Araç Daha Değerlendir</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {gameState === "empty" && (
          <div className="text-center max-w-sm bg-white/[0.02] border border-white/5 p-8 rounded-3xl backdrop-blur-md">
            <Settings className="w-12 h-12 text-slate-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-bold mb-2">Gösterilecek Yeni Araç Kalmadı</h2>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              Platformdaki tüm araç kartlarını değerlendirdin! İlanları tercih profiline göre sıralanmış
              şekilde görüntüleyebilirsin.
            </p>
            {profile ? (
              <a
                href={`/listings?preferenceProfileId=${profile.id}&sessionId=${sessionId}`}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-6 rounded-2xl transition duration-150 inline-block text-center cursor-pointer"
              >
                İlanları Görüntüle
              </a>
            ) : (
              <button
                onClick={checkProfileResults}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-6 rounded-2xl transition duration-150 cursor-pointer"
              >
                Tercih Profilini Yükle
              </button>
            )}
          </div>
        )}

        {/* ERROR STATE */}
        {gameState === "error" && (
          <div className="text-center max-w-sm bg-white/[0.02] border border-white/5 p-8 rounded-3xl backdrop-blur-md">
            <RefreshCcw className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Bağlantı Kurulamadı</h2>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              Platform veri bağlantısı kurulamadı. Sunucu güncelleniyor veya uykuda olabilir. Lütfen tekrar deneyin.
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
