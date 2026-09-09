"use client";

import React, { useEffect, useState, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Share2,
  Heart,
  FileText,
  MessageSquare,
  Sparkles,
  RefreshCw,
  X,
  ShieldCheck,
} from "lucide-react";
import {
  VehicleBodyConditionMap,
  CompactVehicleBodySvg,
} from "@/components/VehicleBodyConditionMap";
import {
  BODY_PART_LABELS,
  VehicleBodyPart,
} from "@used-car-intelligence/shared";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://used-car-intelligence-app.onrender.com";

const STORAGE_KEY_ITEMS = "torquescout_feed_items";
const STORAGE_KEY_INDEX = "torquescout_feed_index";
const STORAGE_KEY_SEED = "torquescout_feed_seed";

interface FeedSeller {
  id: string;
  displayName: string;
  memberSince: string;
  avatarUrl?: string | null;
}

interface FeedVehicle {
  brand: string;
  modelFamily: string;
  modelName: string;
  year: number;
  fuelType: string;
  transmissionType: string;
  mileage: number;
  bodyType?: string;
  enginePower?: string;
  engineCapacity?: string;
  color?: string;
}

interface FeedItem {
  id: string;
  title: string;
  price: number;
  currency: string;
  listingDate: string;
  listingNo: string;
  description?: string;
  location: { city: string; district: string };
  seller: FeedSeller;
  vehicle: FeedVehicle;
  photos: { id: string; url: string; order: number }[];
  breadcrumb: string[];
  isFavorite: boolean;
  isUrgent?: boolean;
  isShowcaseFeedActive?: boolean;
  localPaintedParts?: string[];
  paintedParts?: string[];
  changedParts?: string[];
  damageRecord?: string | null;
  tramerAmount?: number;
}

const FUEL_LABELS: Record<string, string> = {
  PETROL: "Benzin",
  DIESEL: "Dizel",
  LPG: "Benzin & LPG",
  HYBRID: "Hibrit",
  ELECTRIC: "Elektrik",
  BENZIN: "Benzin",
  DIZEL: "Dizel",
  HIBRIT: "Hibrit",
  ELEKTRIK: "Elektrik",
};

const TRANSMISSION_LABELS: Record<string, string> = {
  AUTOMATIC: "Otomatik",
  MANUAL: "Manuel",
  SEMI_AUTOMATIC: "Yarı Otomatik",
  OTOMATIK: "Otomatik",
  MANUEL: "Manuel",
  YARI_OTOMATIK: "Yarı Otomatik",
};

const formatFuel = (fuel?: string) => {
  if (!fuel) return "-";
  return FUEL_LABELS[fuel.toUpperCase()] || fuel;
};

const formatTransmission = (trans?: string) => {
  if (!trans) return "-";
  return TRANSMISSION_LABELS[trans.toUpperCase()] || trans;
};

function FeedCardDeck() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"info" | "expertise">("info");
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [isDescModalOpen, setIsDescModalOpen] = useState(false);
  const [isExpertiseModalOpen, setIsExpertiseModalOpen] = useState(false);
  const [seed, setSeed] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isScrollingRef = useRef(false);
  const loadingMoreRef = useRef(false);

  // Mount logic: Check sessionStorage first to restore state on back navigation
  useEffect(() => {
    try {
      const cachedItems = sessionStorage.getItem(STORAGE_KEY_ITEMS);
      const cachedIndex = sessionStorage.getItem(STORAGE_KEY_INDEX);
      const cachedSeed = sessionStorage.getItem(STORAGE_KEY_SEED);

      if (cachedItems) {
        const parsed = JSON.parse(cachedItems);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
          const parsedIdx = cachedIndex ? parseInt(cachedIndex, 10) : 0;
          setCurrentIndex(isNaN(parsedIdx) ? 0 : Math.max(0, Math.min(parsedIdx, parsed.length - 1)));
          if (cachedSeed) setSeed(cachedSeed);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Could not parse cached feed:", e);
    }

    const initialSeed = Math.random().toString(36).substring(2, 15);
    setSeed(initialSeed);
    try {
      sessionStorage.setItem(STORAGE_KEY_SEED, initialSeed);
    } catch (_) {}
    loadFeed(initialSeed, true);
  }, []);

  // Persist currentIndex in sessionStorage on every step
  useEffect(() => {
    if (items.length > 0) {
      try {
        sessionStorage.setItem(STORAGE_KEY_INDEX, String(currentIndex));
      } catch (_) {}
    }
  }, [currentIndex, items.length]);

  // Persist items in sessionStorage whenever new items are fetched
  useEffect(() => {
    if (items.length > 0) {
      try {
        sessionStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
      } catch (_) {}
    }
  }, [items]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const loadFeed = async (activeSeed: string, replace: boolean) => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    if (replace) setLoading(true);

    try {
      const headers: Record<string, string> = {};
      const savedToken = localStorage.getItem("accessToken");
      if (savedToken) headers["Authorization"] = `Bearer ${savedToken}`;

      const res = await fetch(`${API_BASE_URL}/listings/feed?limit=20&seed=${activeSeed}`, {
        headers,
      });

      if (!res.ok) {
        throw new Error("Akış alınamadı");
      }

      const data = await res.json();
      const rawList: FeedItem[] = data.items || [];

      if (rawList.length === 0 && replace) {
        // Fallback: Vitrin ve Acil ilanlarını getir
        const fallbackRes = await fetch(`${API_BASE_URL}/listings?showcaseOnly=true&limit=20`, {
          headers,
        });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          const fallbackItems = fallbackData.items || [];
          const mappedFallback: FeedItem[] = fallbackItems.map((x: any) => ({
            id: x.id,
            title: x.title,
            price: Number(x.priceAmount),
            currency: x.currency || "TRY",
            listingDate: new Date(x.publishedAt || x.createdAt).toLocaleDateString("tr-TR"),
            listingNo: x.id.replace(/^TEST-SIMILAR-/, "SIM-").substring(0, 8).toUpperCase(),
            description: x.description,
            location: { city: x.city, district: x.district || "Merkez" },
            seller: {
              id: x.sellerId,
              displayName: x.seller?.firstName ? `${x.seller.firstName} ${x.seller.lastName}` : "İlan Sahibi",
              memberSince: "Temmuz 2026",
            },
            vehicle: {
              brand: x.vehicleVariant?.brand?.name || x.customBrand || "Otomobil",
              modelFamily: x.vehicleVariant?.model?.name || x.customModel || "",
              modelName: x.vehicleVariant?.model?.name || x.customModel || "",
              year: x.modelYear,
              fuelType: x.fuelType,
              transmissionType: x.transmission,
              mileage: x.kilometers,
            },
            photos: x.media?.map((m: any, idx: number) => ({ id: m.id || String(idx), url: m.url, order: idx })) || [],
            breadcrumb: [
              "Vasıta",
              "Otomobil",
              x.customBrand || x.vehicleVariant?.brand?.name || "Araç",
              x.customModel || x.vehicleVariant?.model?.name || "",
            ].filter(Boolean),
            isFavorite: !!x.isFavorited,
            isUrgent: !!x.isUrgent,
            isShowcaseFeedActive: !!x.isShowcaseFeedActive,
          }));
          setItems(mappedFallback);
          return;
        }
      }

      if (replace) {
        setItems(rawList);
        setCurrentIndex(0);
        setActivePhotoIdx(0);
        const favMap: Record<string, boolean> = {};
        rawList.forEach((it) => {
          favMap[it.id] = it.isFavorite;
        });
        setFavorites(favMap);
      } else {
        setItems((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          const newOnes = rawList.filter((it) => !ids.has(it.id));
          return [...prev, ...newOnes];
        });
      }
    } catch (err) {
      console.error("İlan Akışı yüklenirken hata:", err);
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
    }
  };

  // Sonraki İlan (Functional state update ile yarış koşullarını ve atlamaları engeller)
  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = prev + 1;
      if (next < items.length) {
        setActivePhotoIdx(0);
        setActiveTab("info");
        // Sona 3 ilan kala arka planda yeni ilanlar ekle
        if (next >= items.length - 3) {
          loadFeed(seed, false);
        }
        return next;
      }
      return prev;
    });
  }, [items.length, seed]);

  // Önceki İlan (Kullanıcı geri bastığında her zaman tam olarak az önce geçtiği doğru kartı gösterir)
  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev > 0) {
        setActivePhotoIdx(0);
        setActiveTab("info");
        return prev - 1;
      }
      return 0;
    });
  }, []);

  // Klavye ok tuşları ile önceki / sonraki geçiş
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev]);

  // Mouse wheel ile yukarı/aşağı geçiş (debounce ile)
  const handleWheel = (e: React.WheelEvent) => {
    if (isScrollingRef.current) return;
    if (Math.abs(e.deltaY) > 30) {
      isScrollingRef.current = true;
      if (e.deltaY > 0) {
        handleNext();
      } else {
        handlePrev();
      }
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 450);
    }
  };

  const handleFavoriteToggle = async (listingId: string) => {
    const savedToken = localStorage.getItem("accessToken");
    if (!savedToken) {
      window.location.href = `/login?redirect=/kesfet/ilan-akisi`;
      return;
    }

    const current = favorites[listingId] || false;
    setFavorites((prev) => ({ ...prev, [listingId]: !current }));

    try {
      await fetch(`${API_BASE_URL}/listings/${listingId}/favorite`, {
        method: "POST",
        headers: { Authorization: `Bearer ${savedToken}` },
      });
      showToast(!current ? "❤️ Favorilere eklendi" : "Favorilerden kaldırıldı");
    } catch {
      setFavorites((prev) => ({ ...prev, [listingId]: current }));
      showToast("Favori işlemi başarısız oldu");
    }
  };

  const handleShare = (item: FeedItem) => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/listings/${item.id}` : "";
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast("🔗 İlan bağlantısı kopyalandı!");
    }
  };

  const currentItem = items[currentIndex];

  if (loading && items.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4 text-center">
        <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-300">Vitrin & Akış İlanları Hazırlanıyor...</p>
      </div>
    );
  }

  if (!currentItem || items.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <Sparkles className="w-10 h-10" />
        </div>
        <h2 className="text-lg font-black text-white">Aktif Vitrin veya Acil İlan Bulunmuyor</h2>
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
          Şu anda Vitrin + Akış ve Hızlı Satış paketi bulunan aktif ilan bulunmamaktadır.
        </p>
        <button
          onClick={() => {
            const newSeed = Math.random().toString(36).substring(2, 15);
            setSeed(newSeed);
            try {
              sessionStorage.setItem(STORAGE_KEY_SEED, newSeed);
              sessionStorage.removeItem(STORAGE_KEY_ITEMS);
              sessionStorage.removeItem(STORAGE_KEY_INDEX);
            } catch (_) {}
            loadFeed(newSeed, true);
          }}
          className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Yeniden Dene</span>
        </button>
      </div>
    );
  }

  const currentPhotoUrl =
    currentItem.photos[activePhotoIdx]?.url ||
    "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80";

  return (
    <div
      onWheel={handleWheel}
      className="relative min-h-[calc(100vh-80px)] py-4 sm:py-6 flex items-center justify-center px-3 sm:px-4 select-none"
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 z-[9999] px-4 py-2 rounded-xl bg-slate-900/95 border border-orange-500/40 text-xs font-bold text-white shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Main Responsive Wrapper: Left (Önceki İlan) - Central Card - Right (Sonraki İlan) */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-8 w-full max-w-5xl mx-auto">
        {/* ========================================================================= */}
        {/* SOL YÖN OKU: ÖNCEKİ İLAN (KARTIN SOLUNDA VE ALTINDA METİN) */}
        {/* ========================================================================= */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border flex items-center justify-center transition-all shadow-xl cursor-pointer ${
              currentIndex === 0
                ? "bg-slate-900/40 border-white/5 text-slate-600 cursor-not-allowed opacity-30"
                : "bg-[#0a1224] hover:bg-[#142240] border-white/10 text-white hover:border-orange-500/50 hover:scale-110 active:scale-95 shadow-orange-500/5"
            }`}
            title="Önceki İlan (Sol / Yukarı Tuşu)"
          >
            <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
          <span className="text-[11px] sm:text-xs font-bold text-slate-400 select-none tracking-tight">
            Önceki İlan
          </span>
        </div>

        {/* ========================================================================= */}
        {/* MERKEZ: İLAN KARTI (GÖRSEL 1 YAPISI, SOL ÜSTTE AYARLAR YOK) */}
        {/* ========================================================================= */}
        <div className="w-full max-w-[430px] sm:max-w-[450px] bg-[#0a1224] border border-white/10 rounded-[28px] p-4 sm:p-5 shadow-2xl flex flex-col justify-between relative overflow-hidden transition-all duration-300">
          {/* 1. Header Bar: Ayarlar butonu kaldırıldı, Başlık solda/ortada, Paylaş & Kalp sağda */}
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg">📦</span>
              <span className="text-xs sm:text-sm font-black text-white tracking-widest uppercase">
                İlan Akışı
              </span>
            </div>

            {/* Right: Share & Favorite */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleShare(currentItem)}
                className="w-9 h-9 rounded-full bg-[#0c1527] hover:bg-[#15223e] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition shadow-sm cursor-pointer"
                title="Paylaş"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleFavoriteToggle(currentItem.id)}
                className={`w-9 h-9 rounded-full border flex items-center justify-center transition shadow-sm cursor-pointer ${
                  favorites[currentItem.id]
                    ? "bg-red-500/20 border-red-500/50 text-red-500"
                    : "bg-[#0c1527] hover:bg-[#15223e] border-white/10 text-slate-300 hover:text-white"
                }`}
                title="Favorilere Ekle"
              >
                <Heart
                  className={`w-4 h-4 ${favorites[currentItem.id] ? "fill-red-500" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* 2. Photo Section with Badges */}
          <div className="mt-3.5 relative w-full h-48 sm:h-52 rounded-2xl overflow-hidden bg-slate-950 border border-white/10 group flex items-center justify-center">
            <img
              src={currentPhotoUrl}
              alt={currentItem.title}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            />

            {/* Top-Left Badges: Acil & Vitrin */}
            <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-2 flex-wrap">
              {currentItem.isUrgent && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600 text-white font-black text-[10px] uppercase tracking-wider shadow-lg border border-red-400/50 animate-pulse">
                  <span>•</span>
                  <span>🔥</span>
                  <span>ACİL</span>
                </div>
              )}
              {currentItem.isShowcaseFeedActive && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-lg border border-amber-300">
                  <span>★</span>
                  <span>VİTRİN</span>
                </div>
              )}
            </div>

            {/* Photo Counter */}
            {currentItem.photos.length > 1 && (
              <div className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10">
                {activePhotoIdx + 1} / {currentItem.photos.length}
              </div>
            )}

            {/* Multi-Photo Navigation Arrows */}
            {currentItem.photos.length > 1 && (
              <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIdx((prev) => Math.max(0, prev - 1));
                  }}
                  className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition pointer-events-auto border border-white/10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIdx((prev) =>
                      Math.min(currentItem.photos.length - 1, prev + 1)
                    );
                  }}
                  className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition pointer-events-auto border border-white/10"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* 3. Title & Seller Row */}
          <div className="mt-3 space-y-1">
            <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wide truncate">
              {currentItem.title}
            </h3>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span className="truncate max-w-[60%]">
                👤 {currentItem.seller.displayName} ({currentItem.seller.memberSince})
              </span>
              <span className="truncate max-w-[40%] text-right text-slate-300">
                📍 {currentItem.location.city}, {currentItem.location.district || "Merkez"}
              </span>
            </div>
          </div>

          {/* 4. Breadcrumb Chip */}
          <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-400 text-[10.5px] font-bold truncate">
            {currentItem.breadcrumb && currentItem.breadcrumb.length > 0
              ? currentItem.breadcrumb.join(" > ")
              : `Vasıta > Otomobil > ${currentItem.vehicle.brand} > ${currentItem.vehicle.modelFamily}`}
          </div>

          {/* 5. Segmented Tabs (Özellikler & Ekspertiz Durumu) */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`py-2 rounded-xl text-xs font-black transition border cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "info"
                  ? "bg-orange-500/10 border-orange-500 text-orange-400 shadow-sm"
                  : "bg-white/[0.02] border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <span>📋</span>
              <span>Özellikler</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("expertise")}
              className={`py-2 rounded-xl text-xs font-black transition border cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "expertise"
                  ? "bg-orange-500/10 border-orange-500 text-orange-400 shadow-sm"
                  : "bg-white/[0.02] border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <span>🛡️</span>
              <span>Ekspertiz Durumu</span>
            </button>
          </div>

          {/* 6. Tab Content Table (Sabit Boyutlandırılmış / Kart Fiziki Yapısını Değiştirmez) */}
          <div className="mt-2.5 p-3 rounded-2xl bg-[#060d1b] border border-white/5 relative h-[116px] min-h-[116px] flex flex-col justify-center overflow-hidden">
            {/* Right Floating Scroll Guide Indicator Pill */}
            <div
              onClick={handleNext}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-[#0c162b] border border-orange-500/40 rounded-xl px-1 py-1.5 flex flex-col items-center justify-center gap-0.5 text-orange-400 shadow-md cursor-pointer hover:bg-orange-500/20 transition z-20"
              title="Sonraki İlana Geç"
            >
              <ChevronUp className="w-2.5 h-2.5 text-slate-400" />
              <ArrowUpDown className="w-3 h-3 text-orange-400" />
              <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
            </div>

            {activeTab === "info" ? (
              <div className="space-y-1.5 pr-7 text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-white/[0.04]">
                  <span className="text-slate-400 font-medium">Fiyat</span>
                  <span className="font-black text-orange-400 text-sm">
                    {currentItem.price.toLocaleString("tr-TR")} {currentItem.currency || "TL"}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-1 border-b border-white/[0.04]">
                  <span className="text-slate-400 font-medium">İlan No</span>
                  <span className="font-mono font-bold text-slate-200">
                    {currentItem.listingNo}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-1 border-b border-white/[0.04]">
                  <span className="text-slate-400 font-medium">Yıl / KM</span>
                  <span className="font-semibold text-slate-200">
                    {currentItem.vehicle.year} • {currentItem.vehicle.mileage.toLocaleString("tr-TR")} km
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Yakıt / Vites</span>
                  <span className="font-semibold text-slate-200 truncate max-w-[170px]">
                    {formatFuel(currentItem.vehicle.fuelType)} • {formatTransmission(currentItem.vehicle.transmissionType)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 pr-7 h-full">
                {/* Sol: Ölçeklendirilmiş SVG Araç Şeması (Tıklanınca Tam Ekran Açar) */}
                <div
                  onClick={() => setIsExpertiseModalOpen(true)}
                  className="w-[50px] h-[92px] shrink-0 bg-slate-950/70 rounded-xl border border-white/10 p-1 flex items-center justify-center cursor-pointer hover:border-orange-500/50 hover:bg-slate-900/80 transition group"
                  title="Detaylı Ekspertiz Şemasını Büyüt"
                >
                  <CompactVehicleBodySvg
                    localPaintedParts={currentItem.localPaintedParts}
                    paintedParts={currentItem.paintedParts}
                    changedParts={currentItem.changedParts}
                    className="w-full h-full group-hover:scale-105 transition"
                  />
                </div>

                {/* Sağ: Ekspertiz Özeti ve Buton */}
                <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1 text-xs">
                  {(() => {
                    const localList = currentItem.localPaintedParts || [];
                    const paintedList = currentItem.paintedParts || [];
                    const changedList = currentItem.changedParts || [];
                    const hasDamages =
                      localList.length > 0 || paintedList.length > 0 || changedList.length > 0;

                    if (!hasDamages) {
                      return (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-emerald-400 font-black text-xs">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>Hatasız & Orijinal</span>
                          </div>
                          <p className="text-[10.5px] text-slate-400 leading-tight">
                            Boya ve değişen parça bulunmamaktadır.
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsExpertiseModalOpen(true)}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 font-black flex items-center gap-1 cursor-pointer pt-0.5"
                          >
                            <span>Detaylı Şemayı Aç ➔</span>
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-0.5">
                        {localList.length > 0 && (
                          <div className="flex items-center gap-1.5 text-[10.5px] text-orange-400 font-bold truncate">
                            <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 shadow-sm" />
                            <span className="truncate">
                              Lokal ({localList.length}): {localList.map((p) => BODY_PART_LABELS[p as VehicleBodyPart] || p).join(", ")}
                            </span>
                          </div>
                        )}
                        {paintedList.length > 0 && (
                          <div className="flex items-center gap-1.5 text-[10.5px] text-blue-400 font-bold truncate">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 shadow-sm" />
                            <span className="truncate">
                              Boyalı ({paintedList.length}): {paintedList.map((p) => BODY_PART_LABELS[p as VehicleBodyPart] || p).join(", ")}
                            </span>
                          </div>
                        )}
                        {changedList.length > 0 && (
                          <div className="flex items-center gap-1.5 text-[10.5px] text-red-400 font-bold truncate">
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 shadow-sm" />
                            <span className="truncate">
                              Değişen ({changedList.length}): {changedList.map((p) => BODY_PART_LABELS[p as VehicleBodyPart] || p).join(", ")}
                            </span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsExpertiseModalOpen(true)}
                          className="text-[10px] text-orange-400 hover:text-orange-300 font-black flex items-center gap-1 cursor-pointer pt-0.5"
                        >
                          <span>Detaylı Şemayı Gör ➔</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* 7. Dedicated Description Card */}
          <div className="mt-2.5 p-3 rounded-2xl bg-[#060d1b] border border-white/5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1">
                <span>📝</span>
                <span>İlan Açıklaması</span>
              </span>
              <button
                type="button"
                onClick={() => setIsDescModalOpen(true)}
                className="text-[11px] font-bold text-orange-400 hover:text-orange-300 transition cursor-pointer"
              >
                Tümünü Gör ➔
              </button>
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
              {currentItem.description
                ? currentItem.description.replace(/\n+/g, " ").trim()
                : "Bu araç TorqueScout yapay zeka analizinden geçmiştir. Ekspertiz, hasar ve kronik sorun kayıtları denetlenmiştir."}
            </p>
          </div>

          {/* 8. Bottom Action Buttons */}
          <div className="mt-3.5 grid grid-cols-2 gap-2.5 pt-1">
            <Link
              href={`/listings/${currentItem.id}`}
              className="py-2.5 px-3 rounded-xl bg-[#0e182e] hover:bg-[#162547] border border-white/15 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FileText className="w-4 h-4 text-slate-300" />
              <span>İlana Git</span>
            </Link>
            <Link
              href={`/dashboard/messages?listingId=${currentItem.id}`}
              className="py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-orange-600/30 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Mesaj Gönder</span>
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SAĞ YÖN OKU: SONRAKİ İLAN (KARTIN SAĞINDA VE ALTINDA METİN) */}
        {/* ========================================================================= */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleNext}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#0a1224] hover:bg-[#142240] border border-white/10 text-white hover:border-orange-500/50 hover:scale-110 active:scale-95 flex items-center justify-center transition-all shadow-xl cursor-pointer shadow-orange-500/5"
            title="Sonraki İlan (Sağ / Aşağı Tuşu)"
          >
            <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
          <span className="text-[11px] sm:text-xs font-bold text-slate-400 select-none tracking-tight">
            Sonraki İlan
          </span>
        </div>
      </div>

      {/* Full Description Modal Popup */}
      {isDescModalOpen && (
        <div
          onClick={() => setIsDescModalOpen(false)}
          className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#0a1224] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h4 className="text-sm font-black text-white uppercase flex items-center gap-2">
                <span>📝</span>
                <span>İlan Açıklaması</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsDescModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar text-xs text-slate-300 leading-relaxed whitespace-pre-line">
              {currentItem.description ||
                "Bu araç TorqueScout yapay zeka analizinden geçmiştir. Ekspertiz, hasar ve kronik sorun kayıtları denetlenmiştir."}
            </div>
          </div>
        </div>
      )}

      {/* Full Expertise / Vehicle Condition Modal (Görsel 1 ile Birebir Aynı Şema) */}
      {isExpertiseModalOpen && (
        <div
          onClick={() => setIsExpertiseModalOpen(false)}
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-[#0a1224] border border-white/10 rounded-3xl p-5 sm:p-7 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🛡️</span>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                    Ekspertiz ve Boya/Değişen Durumu
                  </h4>
                  <p className="text-xs text-slate-400 font-medium">
                    {currentItem.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpertiseModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <VehicleBodyConditionMap
              mode="readOnly"
              localPaintedParts={currentItem.localPaintedParts || []}
              paintedParts={currentItem.paintedParts || []}
              changedParts={currentItem.changedParts || []}
              showTitle={true}
            />

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsExpertiseModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition shadow-md cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FeedPage() {
  return (
    <main className="min-h-screen bg-[#030712] text-slate-100">
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#030712] flex items-center justify-center text-xs text-slate-400">
            Yükleniyor...
          </div>
        }
      >
        <FeedCardDeck />
      </Suspense>
    </main>
  );
}
