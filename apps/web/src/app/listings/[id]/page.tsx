"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Send, MessageSquare, Phone, User, CheckCircle2, AlertCircle, X, Heart, ListFilter, ChevronUp, ChevronDown, Wrench, Sparkles } from "lucide-react";
import ListingAiAdvisorCard from "../components/ListingAiAdvisorCard";
import UrgentListingBadge from "@/components/listings/UrgentListingBadge";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const mockSimilarListings = [
  { id: 'sim-1', title: 'Audi A3 Sedan 35 TFSI Sport', year: 2020, km: '89.000', location: 'İstanbul / Kadıköy', price: '1.250.000 TL', imageUrl: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=400&auto=format&fit=crop&q=80' },
  { id: 'sim-2', title: 'BMW 320i Executive M Sport', year: 2019, km: '115.000', location: 'Ankara / Çankaya', price: '1.480.000 TL', imageUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&auto=format&fit=crop&q=80' },
  { id: 'sim-3', title: 'Mercedes C200d AMG 9G-Tronic', year: 2018, km: '124.000', location: 'İzmir / Bornova', price: '1.390.000 TL', imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=400&auto=format&fit=crop&q=80' },
  { id: 'sim-4', title: 'Volkswagen Golf 1.5 TSI R-Line', year: 2021, km: '62.000', location: 'Bursa / Nilüfer', price: '1.180.000 TL', imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&auto=format&fit=crop&q=80' },
  { id: 'sim-5', title: 'Renault Megane 1.3 TCe Icon EDG', year: 2022, km: '45.000', location: 'Antalya / Muratpaşa', price: '985.000 TL', imageUrl: 'https://images.unsplash.com/photo-1541348263662-e082662d82da?w=400&auto=format&fit=crop&q=80' },
  { id: 'sim-6', title: 'Toyota Corolla 1.8 Hybrid Passion', year: 2020, km: '78.000', location: 'Kocaeli / İzmit', price: '1.090.000 TL', imageUrl: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&auto=format&fit=crop&q=80' },
  { id: 'sim-7', title: 'Honda Civic 1.5 VTEC Turbo Executive', year: 2019, km: '92.000', location: 'Adana / Seyhan', price: '1.140.000 TL', imageUrl: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400&auto=format&fit=crop&q=80' },
  { id: 'sim-8', title: 'Ford Focus 1.5 EcoBlue ST-Line', year: 2020, km: '84.000', location: 'Eskişehir / Tepebaşı', price: '1.030.000 TL', imageUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&auto=format&fit=crop&q=80' },
  { id: 'sim-9', title: 'Peugeot 308 1.2 PureTech GT', year: 2021, km: '53.000', location: 'İstanbul / Maltepe', price: '1.120.000 TL', imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&auto=format&fit=crop&q=80' },
];

const mockIsiCepteRecommendations = [
  { id: 'isi-1', name: 'Master Auto // Uzman Özel Servis', category: 'Motor, Şanzıman & Periyodik Bakım', brandSpec: 'Marka Uzmanı', location: 'İstanbul / Maslak Sanayi', rating: '4.9', image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=150&auto=format&fit=crop&q=80', link: 'https://isicepte.com' },
  { id: 'isi-2', name: 'Özkan Garaj // Mekanik & Diagnostik', category: 'Bilgisayarlı Arıza Tespit & Elektrik', brandSpec: 'Sertifikalı Usta', location: 'İstanbul / İkitelli OSB', rating: '4.8', image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=150&auto=format&fit=crop&q=80', link: 'https://isicepte.com' },
  { id: 'isi-3', name: 'Eksper Pro // Detaylı Muayene Noktası', category: 'Boya, Kaporta & Şasi Ölçüm', brandSpec: 'Yetkili Servis Noktası', location: 'İstanbul / Bostancı Sanayi', rating: '5.0', image: 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?w=150&auto=format&fit=crop&q=80', link: 'https://isicepte.com' }
];

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

export default function ListingDetail() {
  const { id } = useParams();
  const router = useRouter();
  const similarListingsRef = useRef<HTMLDivElement>(null);

  // Data states
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activePhoto, setActivePhoto] = useState("");
  const [hoveredPart, setHoveredPart] = useState("");
  const [isSellerFavorited, setIsSellerFavorited] = useState(false);
  const [togglingSellerFav, setTogglingSellerFav] = useState(false);

  // Messaging Modal States
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState("Merhaba, araç ile ilgileniyorum. Detaylar için görüşebilir miyiz?");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSuccess, setMessageSuccess] = useState(false);
  const [messageError, setMessageError] = useState("");

  // Tab State for AI Analysis Box
  const [activeAiTab, setActiveAiTab] = useState<"problems" | "recalls" | "questions" | "checklist">("problems");

  const [token, setToken] = useState("");

  useEffect(() => {
    if (!id) return;

    const savedToken = localStorage.getItem("accessToken");
    if (savedToken) setToken(savedToken);

    const headers: any = {};
    if (savedToken) headers["Authorization"] = `Bearer ${savedToken}`;

    fetch(`${API_URL}/listings/${id}`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error("İlan yüklenemedi.");
        return res.json();
      })
      .then((data) => {
        setListing(data);
        setIsSellerFavorited(data.isSellerFavorited || false);
        if (data.media && data.media.length > 0) {
          setActivePhoto(data.media[0].url);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const handleToggleFavoriteSeller = async () => {
    const savedToken = token || localStorage.getItem("accessToken");
    if (!savedToken) {
      window.location.href = `/login?redirect=/listings/${id}`;
      return;
    }
    if (!listing?.sellerId || togglingSellerFav) return;

    setTogglingSellerFav(true);
    try {
      const res = await fetch(`${API_URL}/favorites/sellers/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${savedToken}`,
        },
        body: JSON.stringify({ sellerId: listing.sellerId }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsSellerFavorited(data.favorited);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingSellerFav(false);
    }
  };

  const handleOpenMessageModal = () => {
    const savedToken = token || localStorage.getItem("accessToken");
    if (!savedToken) {
      window.location.href = `/login?redirect=/listings/${id}`;
      return;
    }
    setMessageSuccess(false);
    setMessageError("");
    setShowMessageModal(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    const savedToken = token || localStorage.getItem("accessToken");
    if (!savedToken) {
      window.location.href = `/login?redirect=/listings/${id}`;
      return;
    }

    setSendingMessage(true);
    setMessageError("");

    try {
      const res = await fetch(`${API_URL}/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${savedToken}`,
        },
        body: JSON.stringify({
          listingId: id,
          firstMessage: messageText.trim(),
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("accessToken");
          setToken("");
          throw new Error("Oturumunuzun süresi dolmuş. Mesaj göndermek için lütfen tekrar giriş yapın.");
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Mesaj gönderilirken bir hata oluştu.");
      }

      setMessageSuccess(true);
      setSendingMessage(false);
    } catch (err: any) {
      setMessageError(err.message || "Mesaj gönderilemedi.");
      setSendingMessage(false);
    }
  };

  const handleToggleFavorite = () => {
    if (!token) {
      window.location.href = `/login?redirect=/listings/${id}`;
      return;
    }

    fetch(`${API_URL}/listings/${id}/favorite`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("İşlem başarısız.");
        return res.json();
      })
      .then((data) => {
        setListing((prev: any) => ({
          ...prev,
          isFavorited: data.isFavorited,
          favoriteCount: data.favoriteCount !== undefined ? data.favoriteCount : (data.isFavorited ? (prev.favoriteCount || 0) + 1 : Math.max(0, (prev.favoriteCount || 0) - 1)),
        }));
      })
      .catch((err) => console.error("Error toggling favorite:", err));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <span className="animate-spin text-4xl">⏳</span>
        <span className="text-slate-400 font-bold text-base">İlan yükleniyor...</span>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="w-full max-w-xl mx-auto py-24 text-center flex flex-col gap-4">
        <span className="text-5xl">⚠️</span>
        <h2 className="text-xl font-bold text-slate-200">İlan bulunamadı veya silinmiş olabilir.</h2>
        <a href="/listings" className="text-orange-500 font-bold hover:underline">Tüm İlanlara Dön</a>
      </div>
    );
  }

  const PART_LABELS: Record<string, string> = {
    FRONT_BUMPER: "Ön Tampon",
    LEFT_FRONT_FENDER: "Sol Ön Çamurluk",
    HOOD: "Kaput (Motor Kaputu)",
    RIGHT_FRONT_FENDER: "Sağ Ön Çamurluk",
    LEFT_FRONT_DOOR: "Sol Ön Kapı",
    ROOF: "Tavan",
    RIGHT_FRONT_DOOR: "Sağ Ön Kapı",
    LEFT_REAR_DOOR: "Sol Arka Kapı",
    RIGHT_REAR_DOOR: "Sağ Arka Kapı",
    LEFT_REAR_FENDER: "Sol Arka Çamurluk",
    TRUNK: "Bagaj Kapağı",
    RIGHT_REAR_FENDER: "Sağ Arka Çamurluk",
    REAR_BUMPER: "Arka Tampon"
  };

  const translateFuelType = (fuel: string) => {
    if (!fuel) return "-";
    const mapping: Record<string, string> = {
      PETROL: "Benzin",
      DIESEL: "Dizel",
      LPG: "LPG",
      HYBRID: "Hibrit",
      PLUG_IN_HYBRID: "Plug-in Hibrit",
      ELECTRIC: "Elektrik",
      OTHER: "Diğer"
    };
    return mapping[fuel.toUpperCase()] || fuel;
  };

  const translateTransmission = (trans: string) => {
    if (!trans) return "-";
    const mapping: Record<string, string> = {
      MANUAL: "Manuel",
      AUTOMATIC: "Otomatik",
      SEMI_AUTOMATIC: "Yarı Otomatik"
    };
    return mapping[trans.toUpperCase()] || trans;
  };

  const getPartColorClass = (partKey: string) => {
    const isChanged = Array.isArray(listing.changedParts) && listing.changedParts.includes(partKey);
    const isPainted = Array.isArray(listing.paintedParts) && listing.paintedParts.includes(partKey);
    const isLocalPainted = Array.isArray(listing.localPaintedParts) && listing.localPaintedParts.includes(partKey);

    if (isChanged) {
      return "fill-red-500/25 stroke-red-500/50";
    }
    if (isPainted) {
      return "fill-blue-500/25 stroke-blue-500/50";
    }
    if (isLocalPainted) {
      return "fill-orange-500/25 stroke-orange-500/50";
    }
    return "fill-slate-900/50 stroke-white/10";
  };

  const defaultImage = "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800&auto=format&fit=crop&q=80";
  const vehicle = listing.vehicleVariant;

  return (
    <div className="w-full min-h-screen px-2 md:px-4 py-3 flex justify-center items-start gap-4 xl:gap-5 min-[1600px]:gap-6">
      
      {/* SOL GOOGLE ADS REKLAM KOLONU (1280px ve üzeri ekranlarda temiz boşluk olarak kalır) */}
      <div className="hidden xl:block w-[160px] min-[1600px]:w-[200px] min-[1920px]:w-[280px] shrink-0 sticky top-16 h-[600px]" />

      {/* MERKEZ ANA İÇERİK KONTEYNERİ (1060px Ortalanmış Kompakt) */}
      <div className="w-full max-w-[1060px] flex flex-col gap-4 shrink-0">
        
        {/* Back button & Title & Price Header (Aligned with 3 Columns Below) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5 items-end border-b border-white/10 pb-2.5">
          {/* Sol Kolon (lg:col-span-6): Başlık ve İlan Detay Bilgileri */}
          <div className="lg:col-span-6">
            <a href="/listings" className="text-[10px] text-orange-500 hover:underline font-bold block mb-0.5">← İlan Listesine Dön</a>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg md:text-xl font-black text-slate-100 canvas-title tracking-tight">{listing.title}</h1>
              {listing.isUrgent && <UrgentListingBadge size="medium" animated />}
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
                ❤️ {listing.favoriteCount || 0} Favori
              </span>
            </div>
            <p className="text-[11px] text-slate-400 canvas-subtitle font-bold uppercase tracking-wider mt-0.5">
              {listing.modelYear} • {listing.kilometers.toLocaleString('tr-TR')} km • {listing.city} {listing.district ? `/ ${listing.district}` : ""}
            </p>
          </div>

          {/* Orta Kolon (lg:col-span-3): Fiyat (Araç Bilgileri Kartının Üstüne Alındı) */}
          <div className="lg:col-span-3 text-left">
            <span className="text-xl md:text-2xl font-black bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent block">
              {Number(listing.priceAmount).toLocaleString('tr-TR')} {listing.currency}
            </span>
          </div>

          {/* Sağ Kolon (lg:col-span-3): Satıcı Hizalaması */}
          <div className="hidden lg:block lg:col-span-3" />
        </div>

        {/* 3-Column Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5 items-start">
          
          {/* 1. SOL KOLON (lg:col-span-6): Görsel Galerisi (Kompakt), Açıklama, Ekspertiz */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            {/* Photo Gallery Grid */}
            <div className="flex flex-col gap-2">
              <div className="relative aspect-[16/10] max-h-[290px] w-full rounded-xl overflow-hidden bg-slate-950 border border-white/10 shadow-xl">
              {/* Favorite Toggle Button */}
              <button
                onClick={handleToggleFavorite}
                className={`absolute top-2.5 right-2.5 z-10 px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition shadow-lg backdrop-blur-sm cursor-pointer select-none hover:scale-105 text-xs font-bold ${
                  listing.isFavorited
                    ? "bg-red-500/20 text-red-400 border-red-500/40"
                    : "bg-slate-950/80 text-slate-400 border-white/10 hover:text-white"
                }`}
                title={listing.isFavorited ? "Favorilerden Kaldır" : "Favoriye Ekle"}
              >
                <span>{listing.isFavorited ? "❤️" : "🤍"}</span>
                {listing.favoriteCount !== undefined && listing.favoriteCount > 0 && (
                  <span className="text-[11px] font-extrabold">{listing.favoriteCount}</span>
                )}
              </button>

              <img
                src={activePhoto || defaultImage}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
              {listing.isAiReady && (
                <span className="absolute top-2.5 left-2.5 text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-600/90 text-white border border-orange-500/30 backdrop-blur-sm">
                  ✨ AI Analizli İlan
                </span>
              )}
            </div>

            {/* Thumbnails list */}
            {listing.media && listing.media.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
                {listing.media.map((img: any) => (
                  <button
                    key={img.id}
                    onClick={() => setActivePhoto(img.url)}
                    className={`relative w-14 aspect-[4/3] rounded-md overflow-hidden border-2 transition shrink-0 ${
                      activePhoto === img.url ? "border-orange-500 scale-95" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img.url} alt="thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          {listing.description && (
            <div className="flex flex-col gap-1">
              <h3 className="text-[11px] font-extrabold text-slate-200 uppercase tracking-wider">Açıklama</h3>
              <p className="text-slate-300 text-xs leading-snug whitespace-pre-line bg-slate-900/30 p-3 rounded-xl border border-white/5">
                {listing.description}
              </p>
            </div>
          )}

          {/* Condition Details (Boyalı / Değişen / Tramer) */}
          <div className="flex flex-col gap-4 p-5 bg-slate-900/20 border border-white/5 rounded-2xl">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest border-b border-white/5 pb-2">Ekspertiz ve Boya/Değişen Durumu</h3>

            {/* Visual Car Silhouette Grid (Read-only) */}
            <div className="flex flex-col gap-3 bg-slate-950/20 p-4 border border-white/5 rounded-2xl mt-1">
              <span className="text-xs font-black text-slate-200 uppercase tracking-wider">Boyalı veya Değişen Parça Görseli</span>
              
              <div className="flex items-center gap-3 text-[10px] font-bold mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded bg-slate-900 border border-white/10 block"></span> Orijinal
                </span>
                <span className="flex items-center gap-1 text-orange-400">
                  <span className="w-2.5 h-2.5 rounded bg-orange-500/25 border border-orange-500/40 block"></span> Lokal Boyalı
                </span>
                <span className="flex items-center gap-1 text-blue-400">
                  <span className="w-2.5 h-2.5 rounded bg-blue-500/25 border border-blue-500/40 block"></span> Boyalı
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <span className="w-2.5 h-2.5 rounded bg-red-500/25 border border-red-500/40 block"></span> Değişen
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mt-2">
                {/* 1. Car Visual Silhouette (SVG - Read-only) */}
                <div className="md:col-span-6 flex flex-col items-center gap-1">
                  <div className="relative w-full max-w-[200px] p-3 bg-slate-950/40 border border-white/5 rounded-2xl flex justify-center shadow-xl">
                    <svg viewBox="0 0 200 380" className="w-full h-auto">
                      {/* Static Tires */}
                      <rect x="23" y="55" width="14" height="32" rx="4" fill="#1e293b" />
                      <rect x="163" y="55" width="14" height="32" rx="4" fill="#1e293b" />
                      <rect x="23" y="280" width="14" height="32" rx="4" fill="#1e293b" />
                      <rect x="163" y="280" width="14" height="32" rx="4" fill="#1e293b" />

                      {/* FRONT BUMPER */}
                      <path
                        d="M 50 35 Q 100 20 150 35 L 142 45 Q 100 35 58 45 Z"
                        onMouseEnter={() => setHoveredPart(PART_LABELS["FRONT_BUMPER"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`transition duration-200 ${getPartColorClass("FRONT_BUMPER")}`}
                      />

                      {/* HOOD */}
                      <path
                        d="M 58 45 Q 100 35 142 45 L 135 110 L 65 110 Z"
                        onMouseEnter={() => setHoveredPart(PART_LABELS["HOOD"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`transition duration-200 ${getPartColorClass("HOOD")}`}
                      />

                      {/* LEFT FRONT FENDER */}
                      <path
                        d="M 50 35 L 58 45 L 65 110 L 38 110 C 34 85 36 55 50 35 Z"
                        onMouseEnter={() => setHoveredPart(PART_LABELS["LEFT_FRONT_FENDER"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`transition duration-200 ${getPartColorClass("LEFT_FRONT_FENDER")}`}
                      />

                      {/* RIGHT FRONT FENDER */}
                      <path
                        d="M 150 35 C 164 55 166 85 162 110 L 135 110 L 142 45 Z"
                        onMouseEnter={() => setHoveredPart(PART_LABELS["RIGHT_FRONT_FENDER"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`transition duration-200 ${getPartColorClass("RIGHT_FRONT_FENDER")}`}
                      />

                      {/* LEFT FRONT DOOR */}
                      <path
                        d="M 38 110 L 65 110 L 65 180 L 38 180 Z"
                        onMouseEnter={() => setHoveredPart(PART_LABELS["LEFT_FRONT_DOOR"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`transition duration-200 ${getPartColorClass("LEFT_FRONT_DOOR")}`}
                      />

                      {/* RIGHT FRONT DOOR */}
                      <path
                        d="M 135 110 L 162 110 L 162 180 L 135 180 Z"
                        onMouseEnter={() => setHoveredPart(PART_LABELS["RIGHT_FRONT_DOOR"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`transition duration-200 ${getPartColorClass("RIGHT_FRONT_DOOR")}`}
                      />

                      {/* ROOF */}
                      <rect
                        x="65" y="110" width="70" height="140" rx="8"
                        onMouseEnter={() => setHoveredPart(PART_LABELS["ROOF"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`transition duration-200 ${getPartColorClass("ROOF")}`}
                      />

                      {/* LEFT REAR DOOR */}
                      <path
                        d="M 38 180 L 65 180 L 65 250 L 38 250 Z"
                        onMouseEnter={() => setHoveredPart(PART_LABELS["LEFT_REAR_DOOR"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`transition duration-200 ${getPartColorClass("LEFT_REAR_DOOR")}`}
                      />

                      {/* RIGHT REAR DOOR */}
                      <path
                        d="M 135 180 L 162 180 L 162 250 L 135 250 Z"
                        onMouseEnter={() => setHoveredPart(PART_LABELS["RIGHT_REAR_DOOR"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`transition duration-200 ${getPartColorClass("RIGHT_REAR_DOOR")}`}
                      />

                      {/* LEFT REAR FENDER */}
                      <path
                        d="M 38 250 L 65 250 L 60 330 L 53 340 C 36 320 34 280 38 250 Z"
                        onMouseEnter={() => setHoveredPart(PART_LABELS["LEFT_REAR_FENDER"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`transition duration-200 ${getPartColorClass("LEFT_REAR_FENDER")}`}
                      />

                      {/* TRUNK */}
                      <path
                        d="M 65 250 L 135 250 L 140 330 Q 100 340 60 330 Z"
                        onMouseEnter={() => setHoveredPart(PART_LABELS["TRUNK"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`transition duration-200 ${getPartColorClass("TRUNK")}`}
                      />

                      {/* RIGHT REAR FENDER */}
                      <path
                        d="M 135 250 L 162 250 C 166 280 164 320 147 340 L 140 330 Z"
                        onMouseEnter={() => setHoveredPart(PART_LABELS["RIGHT_REAR_FENDER"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`transition duration-200 ${getPartColorClass("RIGHT_REAR_FENDER")}`}
                      />

                      {/* REAR BUMPER */}
                      <path
                        d="M 53 340 Q 100 350 147 340 L 152 350 Q 100 365 48 350 Z"
                        onMouseEnter={() => setHoveredPart(PART_LABELS["REAR_BUMPER"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`transition duration-200 ${getPartColorClass("REAR_BUMPER")}`}
                      />

                      {/* Headlights and Tail lights */}
                      <ellipse cx="61" cy="41" rx="5" ry="2.5" fill="#fef08a" transform="rotate(-10 61 41)" opacity="0.9" pointerEvents="none" />
                      <ellipse cx="139" cy="41" rx="5" ry="2.5" fill="#fef08a" transform="rotate(10 139 41)" opacity="0.9" pointerEvents="none" />
                      <rect x="52" y="342" width="10" height="3" rx="0.5" fill="#ef4444" opacity="0.9" pointerEvents="none" />
                      <rect x="138" y="342" width="10" height="3" rx="0.5" fill="#ef4444" opacity="0.9" pointerEvents="none" />
                    </svg>
                  </div>
                  
                  {/* Hover status label indicator */}
                  <span className="text-[10px] font-bold text-slate-400 min-h-[14px] block text-center mt-1">
                    {hoveredPart ? hoveredPart : "Ekspertiz detayı için parçanın üzerine gelin"}
                  </span>
                </div>

                {/* 2. Side Lists: Summarizing current selections */}
                <div className="md:col-span-6 flex flex-col gap-3">
                  <div className="flex flex-col gap-1 bg-slate-950/45 p-3 border border-white/5 rounded-xl">
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-wider">🎨 Boyalı Parçalar</span>
                    <ul className="text-[10px] text-slate-350 flex flex-col gap-1">
                      {Array.isArray(listing.localPaintedParts) && listing.localPaintedParts.map((p: string) => (
                        <li key={p} className="flex items-center justify-between bg-orange-500/10 px-2 py-0.5 rounded text-[9px] border border-orange-500/10">
                          <span>{PART_LABELS[p] || p.replace(/_/g, " ")}</span>
                          <span className="font-bold text-orange-400">Lokal Boya</span>
                        </li>
                      ))}
                      {Array.isArray(listing.paintedParts) && listing.paintedParts.map((p: string) => (
                        <li key={p} className="flex items-center justify-between bg-blue-500/10 px-2 py-0.5 rounded text-[9px] border border-blue-500/10">
                          <span>{PART_LABELS[p] || p.replace(/_/g, " ")}</span>
                          <span className="font-bold text-blue-400">Boyalı</span>
                        </li>
                      ))}
                      {(!listing.localPaintedParts || listing.localPaintedParts.length === 0) && (!listing.paintedParts || listing.paintedParts.length === 0) && (
                        <span className="text-slate-500 font-bold text-[9px] italic">Boyalı parça yok.</span>
                      )}
                    </ul>
                  </div>

                  <div className="flex flex-col gap-1 bg-slate-950/45 p-3 border border-white/5 rounded-xl">
                    <span className="text-[9px] font-black text-red-400 uppercase tracking-wider">🔄 Değişen Parçalar</span>
                    <ul className="text-[10px] text-slate-350 flex flex-col gap-1">
                      {Array.isArray(listing.changedParts) && listing.changedParts.map((p: string) => (
                        <li key={p} className="flex items-center justify-between bg-red-500/10 px-2 py-0.5 rounded text-[9px] border border-red-500/10">
                          <span>{PART_LABELS[p] || p.replace(/_/g, " ")}</span>
                          <span className="font-bold text-red-400">Değişen</span>
                        </li>
                      ))}
                      {(!listing.changedParts || listing.changedParts.length === 0) && (
                        <span className="text-slate-500 font-bold text-[9px] italic">Değişen parça yok.</span>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5 text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400">Tramer Kaydı:</span>
                <span className="text-xs font-black text-red-400 mt-0.5">
                  {listing.tramerAmount > 0 ? `${listing.tramerAmount.toLocaleString('tr-TR')} TL` : "Hasar Kaydı Yok"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400">Bakım Geçmişi:</span>
                <span className="text-xs text-slate-300 mt-0.5">{listing.maintenanceHistory || "Belirtilmedi"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. ORTA KOLON (lg:col-span-3): Sahibinden Tarzı Daraltılmış Kompakt Araç Bilgileri Tablosu */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-[#0b0f19]/95 backdrop-blur-md border border-white/10 p-3.5 rounded-2xl flex flex-col gap-2 shadow-xl max-w-[270px] w-full">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-xs font-black text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                <span>📋 Araç Bilgileri</span>
              </h3>
              <span className="text-[9px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded">
                Teknik Detaylar
              </span>
            </div>

            <div className="flex flex-col text-[11px]">
              {/* İlan No */}
              <div className="grid grid-cols-[105px_1fr] items-center gap-2 py-1 border-b border-dashed border-white/10">
                <span className="font-bold text-slate-400">İlan No</span>
                <span className="font-black text-red-400 font-mono text-right">{listing.listingNo || listing.id.slice(0, 10).toUpperCase()}</span>
              </div>

              {/* İlan Tarihi */}
              <div className="grid grid-cols-[105px_1fr] items-center gap-2 py-1 border-b border-dashed border-white/10">
                <span className="font-bold text-slate-400">İlan Tarihi</span>
                <span className="font-semibold text-slate-200 text-right">
                  {new Date(listing.createdAt || Date.now()).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              {/* Marka */}
              <div className="grid grid-cols-[105px_1fr] items-center gap-2 py-1 border-b border-dashed border-white/10">
                <span className="font-bold text-slate-400">Marka</span>
                <span className="font-semibold text-slate-200 text-right">{listing.vehicleVariant?.brand?.name || listing.brand || "Belirtilmedi"}</span>
              </div>

              {/* Seri */}
              <div className="grid grid-cols-[105px_1fr] items-center gap-2 py-1 border-b border-dashed border-white/10">
                <span className="font-bold text-slate-400">Seri</span>
                <span className="font-semibold text-slate-200 text-right">{listing.vehicleVariant?.model?.name || listing.series || "Belirtilmedi"}</span>
              </div>

              {/* Model */}
              <div className="grid grid-cols-[105px_1fr] items-center gap-2 py-1 border-b border-dashed border-white/10">
                <span className="font-bold text-slate-400">Model</span>
                <span className="font-semibold text-slate-200 text-right truncate" title={listing.vehicleVariant?.trim?.name || listing.model}>
                  {listing.vehicleVariant?.trim?.name || listing.vehicleVariant?.engine?.name || listing.model || "Belirtilmedi"}
                </span>
              </div>

              {/* Yıl */}
              <div className="grid grid-cols-[105px_1fr] items-center gap-2 py-1 border-b border-dashed border-white/10">
                <span className="font-bold text-slate-400">Yıl</span>
                <span className="font-semibold text-slate-200 text-right">{listing.modelYear}</span>
              </div>

              {/* Yakıt Tipi */}
              <div className="grid grid-cols-[105px_1fr] items-center gap-2 py-1 border-b border-dashed border-white/10">
                <span className="font-bold text-slate-400">Yakıt Tipi</span>
                <span className="font-semibold text-slate-200 text-right">{translateFuelType(listing.fuelType)}</span>
              </div>

              {/* Vites */}
              <div className="grid grid-cols-[105px_1fr] items-center gap-2 py-1 border-b border-dashed border-white/10">
                <span className="font-bold text-slate-400">Vites</span>
                <span className="font-semibold text-slate-200 text-right">{translateTransmission(listing.transmission)}</span>
              </div>

              {/* Araç Durumu */}
              <div className="grid grid-cols-[105px_1fr] items-center gap-2 py-1 border-b border-dashed border-white/10">
                <span className="font-bold text-slate-400">Araç Durumu</span>
                <span className="font-semibold text-slate-200 text-right">{listing.condition || "İkinci El"}</span>
              </div>

              {/* KM */}
              <div className="grid grid-cols-[105px_1fr] items-center gap-2 py-1 border-b border-dashed border-white/10">
                <span className="font-bold text-slate-400">KM</span>
                <span className="font-semibold text-slate-200 text-right">{Number(listing.kilometers).toLocaleString('tr-TR')} km</span>
              </div>

              {/* Kasa Tipi */}
              <div className="grid grid-cols-[105px_1fr] items-center gap-2 py-1 border-b border-dashed border-white/10">
                <span className="font-bold text-slate-400">Kasa Tipi</span>
                <span className="font-semibold text-slate-200 text-right">{listing.vehicleVariant?.bodyType || listing.bodyType || "Sedan"}</span>
              </div>

              {/* Motor Gücü */}
              <div className="grid grid-cols-[105px_1fr] items-center gap-2 py-1 border-b border-dashed border-white/10">
                <span className="font-bold text-slate-400">Motor Gücü</span>
                <span className="font-semibold text-slate-200 text-right">{listing.vehicleVariant?.power || listing.enginePower || "-"}</span>
              </div>

              {/* Motor Hacmi */}
              <div className="grid grid-cols-[105px_1fr] items-center gap-2 py-1 border-b border-dashed border-white/10">
                <span className="font-bold text-slate-400">Motor Hacmi</span>
                <span className="font-semibold text-slate-200 text-right">{listing.vehicleVariant?.engineCapacity || listing.engineCapacity || "-"}</span>
              </div>

              {/* Çekiş */}
              <div className="grid grid-cols-[105px_1fr] items-center gap-2 py-1 border-b border-dashed border-white/10">
                <span className="font-bold text-slate-400">Çekiş</span>
                <span className="font-semibold text-slate-200 text-right">{listing.drivetrain || "Önden Çekiş"}</span>
              </div>

              {/* Renk */}
              <div className="grid grid-cols-[105px_1fr] items-center gap-2 py-1 border-b border-dashed border-white/10">
                <span className="font-bold text-slate-400">Renk</span>
                <span className="font-semibold text-slate-200 text-right">{listing.color || "Belirtilmedi"}</span>
              </div>

              {/* Garanti */}
              <div className="grid grid-cols-[105px_1fr] items-center gap-2 py-1 border-b border-dashed border-white/10">
                <span className="font-bold text-slate-400">Garanti</span>
                <span className="font-semibold text-slate-200 text-right">{listing.warranty ? "Evet" : "Hayır"}</span>
              </div>

              {/* Ağır Hasar Kayıtlı */}
              <div className="grid grid-cols-[105px_1fr] items-center gap-2 py-1 border-b border-dashed border-white/10">
                <span className="font-bold text-slate-400">Ağır Hasar Kayıtlı</span>
                <span className="font-semibold text-slate-200 text-right">{listing.tramerAmount > 200000 || listing.heavyDamage ? "Evet" : "Hayır"}</span>
              </div>

              {/* Plaka / Uyruk */}
              <div className="grid grid-cols-[105px_1fr] items-center gap-2 py-1 border-b border-dashed border-white/10">
                <span className="font-bold text-slate-400">Plaka / Uyruk</span>
                <span className="font-semibold text-slate-200 text-right">{listing.plateOrigin || "Türkiye (TR) Plakalı"}</span>
              </div>

              {/* Kimden */}
              <div className="grid grid-cols-[105px_1fr] items-center gap-2 py-1 border-b border-dashed border-white/10">
                <span className="font-bold text-slate-400">Kimden</span>
                <span className="font-extrabold text-red-400 text-right">{listing.sellerType === 'GALLERY' ? 'Galeriden' : 'Sahibinden'}</span>
              </div>

              {/* Takas */}
              <div className="grid grid-cols-[105px_1fr] items-center gap-2 py-1">
                <span className="font-bold text-slate-400">Takas</span>
                <span className="font-semibold text-slate-200 text-right">{listing.exchange ? "Evet" : "Hayır"}</span>
              </div>
            </div>
          </div>

          {/* AI Intelligence widget block (Araç Bilgileri Kartının Altına Alındı) */}
          {listing.isAiReady && vehicle ? (
            <div className="glass p-4 rounded-2xl border border-orange-500/25 bg-orange-950/5 flex flex-col gap-3 shadow-xl relative overflow-hidden w-full">
              <span className="absolute -top-10 -right-10 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl"></span>

              <div>
                <h3 className="text-xs font-extrabold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                  ✨ AI Varyant Analizi
                </h3>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  {vehicle.brand?.name} {vehicle.model?.name} {vehicle.year} varyant verileri
                </p>
              </div>

              {/* Tabs selector */}
              <div className="grid grid-cols-2 gap-1 bg-slate-950/40 p-1 rounded-xl">
                <button
                  onClick={() => setActiveAiTab("problems")}
                  className={`text-[9px] font-bold py-1 rounded transition ${
                    activeAiTab === "problems" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sık Karşılaşılan
                </button>
                <button
                  onClick={() => setActiveAiTab("recalls")}
                  className={`text-[9px] font-bold py-1 rounded transition ${
                    activeAiTab === "recalls" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Recall Kaydı
                </button>
                <button
                  onClick={() => setActiveAiTab("questions")}
                  className={`text-[9px] font-bold py-1 rounded transition ${
                    activeAiTab === "questions" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sorular
                </button>
                <button
                  onClick={() => setActiveAiTab("checklist")}
                  className={`text-[9px] font-bold py-1 rounded transition ${
                    activeAiTab === "checklist" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Checklist
                </button>
              </div>

              {/* Tab Contents */}
              <div className="bg-slate-950/20 p-3 rounded-xl border border-white/5 min-h-[160px] flex flex-col gap-2.5 text-xs">
                {activeAiTab === "problems" && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[9px] text-slate-400 italic">
                      ⚠️ Bu varyantta kullanıcılarca dile getirilmiş noktalar:
                    </p>
                    {vehicle.problems && vehicle.problems.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {vehicle.problems.map((p: any) => (
                          <div key={p.id} className="flex flex-col gap-0.5 border-l-2 border-orange-500/40 pl-2">
                            <span className="font-bold text-slate-200 text-[11px]">{p.name}</span>
                            <span className="text-[10px] text-slate-400 leading-tight">{p.description}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Sık karşılaşılan bir durum bulunmamaktadır.</span>
                    )}
                  </div>
                )}

                {activeAiTab === "recalls" && (
                  <div className="flex flex-col gap-2">
                    {vehicle.recalls && vehicle.recalls.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {vehicle.recalls.map((r: any) => (
                          <div key={r.id} className="flex flex-col gap-0.5 border-l-2 border-red-500/40 pl-2">
                            <span className="font-bold text-slate-200 text-[11px]">{r.name}</span>
                            <span className="text-[10px] text-slate-400 leading-tight">{r.description}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Resmi bir recall kaydı bulunmamaktadır.</span>
                    )}
                  </div>
                )}

                {activeAiTab === "questions" && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[9px] text-slate-400">Satıcıya sorun:</p>
                    {vehicle.questions && vehicle.questions.length > 0 ? (
                      <ul className="flex flex-col gap-1.5">
                        {vehicle.questions.map((q: any) => (
                          <li key={q.id} className="text-[10px] text-slate-300 leading-tight pl-2 relative before:content-['•'] before:absolute before:left-0 before:text-orange-500">
                            {q.question}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Özel soru bulunmamaktadır.</span>
                    )}
                  </div>
                )}

                {activeAiTab === "checklist" && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[9px] text-slate-400">Ekspertiz kontrol listesi:</p>
                    {vehicle.checklists && vehicle.checklists.length > 0 ? (
                      <ul className="flex flex-col gap-1.5">
                        {vehicle.checklists.map((c: any) => (
                          <li key={c.id} className="text-[10px] text-slate-300 leading-tight pl-2 relative before:content-['✓'] before:absolute before:left-0 before:text-emerald-500">
                            {c.item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Özel checklist bulunmamaktadır.</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* İŞİ CEPTE ÖNERİYOR (Orta Kolona, AI Analizi Kartının Altına Alındı) */}
          <div className="glass p-4 rounded-2xl border border-orange-500/30 bg-gradient-to-b from-orange-950/20 via-[#0b0f19] to-[#0b0f19] flex flex-col gap-3 shadow-xl relative overflow-hidden">
            <span className="absolute -top-10 -right-10 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl"></span>

            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-1">
                  <Wrench className="w-3 h-3 text-orange-400" /> İŞİ CEPTE ÖNERİYOR
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5 font-medium">
                  {listing.brand || vehicle?.brand?.name || "Bu Araç"} Markası İle Uyumlu Servisler
                </span>
              </div>
              <span className="text-[8px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded">
                Özel Öneri
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {mockIsiCepteRecommendations.map((shop) => (
                <div key={shop.id} className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col gap-2 hover:border-orange-500/30 transition">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border border-white/10 shrink-0">
                      <img src={shop.image} alt={shop.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-[11px] font-extrabold text-slate-100 truncate">{shop.name}</h4>
                        <span className="text-[8.5px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">⭐ {shop.rating}</span>
                      </div>
                      <span className="text-[9.5px] text-orange-400 font-semibold truncate">{shop.category}</span>
                      <span className="text-[9px] text-slate-400 truncate">📍 {shop.location} • {shop.brandSpec}</span>
                    </div>
                  </div>
                  <a
                    href={shop.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-1.5 rounded-lg bg-gradient-to-r from-orange-500/15 to-amber-500/15 hover:from-orange-500/25 hover:to-amber-500/25 border border-orange-500/30 text-orange-400 font-bold text-[10px] text-center transition flex items-center justify-center gap-1"
                  >
                    <span>Servise Git</span>
                    <span>→</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. SAĞ KOLON (lg:col-span-3): Dikey Sıralı 2 Kart */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          
          {/* 1. KART: İlan Sahibi Bilgileri Kartı */}
          <div className="glass p-5 rounded-2xl border border-white/5 flex flex-col gap-4 shadow-xl">
            {/* Seller Avatar Header */}
            <div className="flex items-center gap-4 pb-2 border-b border-white/5">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center font-black text-white text-2xl shadow-lg shadow-orange-500/20 border border-white/20 shrink-0">
                {listing.seller?.profilePhotoUrl ? (
                  <img
                    src={formatImageUrl(listing.seller.profilePhotoUrl)}
                    alt="Seller Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-black text-white text-2xl tracking-tighter drop-shadow">T</span>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block">İlan Sahibi</span>
                <h3 className="text-base font-extrabold text-slate-100 truncate mt-0.5">
                  {listing.seller
                    ? `${listing.seller.firstName || ""} ${listing.seller.lastName || ""}`.trim() || listing.seller.email.split("@")[0]
                    : "Satıcı Bilgisi Yok"}
                </h3>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {/* Seller Full Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Adı Soyadı</label>
                <div className="bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-slate-200 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {listing.seller
                      ? `${listing.seller.firstName || ""} ${listing.seller.lastName || ""}`.trim() || listing.seller.email.split("@")[0]
                      : "Satıcı Bilgisi Yok"}
                  </span>
                </div>
              </div>

              {/* Seller Phone Number */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telefon Numarası</label>
                <div className="bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{listing.seller?.phone || "Telefon Belirtilmedi"}</span>
                  </div>
                  {listing.seller?.phone && (
                    <a
                      href={`tel:${listing.seller.phone}`}
                      className="text-[10px] text-orange-400 hover:underline font-semibold"
                    >
                      Ara
                    </a>
                  )}
                </div>
              </div>

              {/* Send Message Button */}
              <button
                type="button"
                onClick={handleOpenMessageModal}
                className="w-full mt-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3.5 rounded-xl transition text-xs shadow-lg shadow-orange-500/15 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Satıcıya Mesaj Gönder</span>
              </button>

              {/* Two sub-action links */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                <a
                  href={`/listings?sellerId=${listing.sellerId}`}
                  className="w-full text-center py-2.5 px-3 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/5 text-slate-300 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ListFilter className="w-3.5 h-3.5 text-orange-400" />
                  <span>Satıcının Tüm İlanları</span>
                </a>

                <button
                  type="button"
                  onClick={handleToggleFavoriteSeller}
                  disabled={togglingSellerFav}
                  className={`w-full text-center py-2.5 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    isSellerFavorited
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                      : "bg-white/[0.03] hover:bg-white/10 border-white/5 text-slate-300"
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isSellerFavorited ? "fill-rose-400 text-rose-400" : "text-slate-400"}`} />
                  <span>{isSellerFavorited ? "Favori Satıcılarımda" : "Favori Satıcılarıma Ekle"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. KART: Benzer İlanlar (YouTube Sağ Panel Dikey Liste Mantığı) */}
          <div className="glass p-4 rounded-2xl border border-white/5 flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="text-xs font-black text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                <span>🚗 Benzer İlanlar</span>
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => similarListingsRef.current?.scrollBy({ top: -140, behavior: 'smooth' })}
                  className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
                  title="Yukarı Kaydır"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => similarListingsRef.current?.scrollBy({ top: 140, behavior: 'smooth' })}
                  className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
                  title="Aşağı Kaydır"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Scrollable vertical list (YouTube sidebar style) */}
            <div
              ref={similarListingsRef}
              className="max-h-[770px] overflow-y-auto pr-1 flex flex-col gap-2.5 scrollbar-thin scrollbar-thumb-white/10 overscroll-contain"
            >
              {mockSimilarListings.map((item) => (
                <a
                  key={item.id}
                  href={`/listings/${id}`}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 transition group"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-16 h-12 rounded-lg object-cover border border-white/10 shrink-0 group-hover:scale-105 transition"
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[11px] font-extrabold text-slate-200 truncate group-hover:text-orange-400 transition">
                      {item.title}
                    </span>
                    <span className="text-[9.5px] text-slate-400 font-medium truncate mt-0.5">
                      {item.year} • {item.km} km • {item.location}
                    </span>
                    <span className="text-[11px] font-black text-orange-400 mt-0.5">
                      {item.price}
                    </span>
                  </div>
                </a>
              ))}
          </div>

          </div>

        </div>
      </div>

      {/* 4. ALT DİKDÖRTGEN BÖLÜM: TorqueScout İlan Zekası (Araç Raporu + Chatbot Danışmanı) */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <ListingAiAdvisorCard listingId={listing.id} publicListingNo={listing.publicListingNo} />
      </div>

      {/* Send Message Modal Popup */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#090d1a] border border-white/10 p-6 rounded-[28px] max-w-lg w-full shadow-2xl flex flex-col gap-5 relative">
            {/* Close Button */}
            <button
              onClick={() => setShowMessageModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-2xl">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-100">Satıcıya Mesaj Gönder</h3>
                <p className="text-[11px] text-slate-400">İlan ve satıcı ile doğrudan iletişime geçin.</p>
              </div>
            </div>

            {/* Listing Summary Card */}
            <div className="bg-slate-900/60 border border-white/5 p-4 rounded-2xl flex items-center gap-3">
              {activePhoto && (
                <img src={activePhoto} alt="listing thumbnail" className="w-14 h-14 object-cover rounded-xl border border-white/10" />
              )}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-extrabold text-slate-200 truncate">{listing.title}</span>
                <span className="text-xs font-black text-orange-400 mt-0.5">
                  {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(listing.priceAmount)}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Satıcı: {listing.seller ? `${listing.seller.firstName || ""} ${listing.seller.lastName || ""}`.trim() || listing.seller.email : "Bilinmiyor"}
                </span>
              </div>
            </div>

            {messageSuccess ? (
              <div className="flex flex-col items-center justify-center text-center gap-3 py-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                <h4 className="text-sm font-extrabold text-slate-100">Mesajınız Gönderildi!</h4>
                <p className="text-xs text-slate-400 max-w-xs">
                  Mesajınız satıcıya iletildi. Satıcının yanıtlarını ve mesaj geçmişinizi Mesajlarım sayfasından takip edebilirsiniz.
                </p>
                <div className="flex gap-3 w-full mt-4">
                  <button
                    onClick={() => setShowMessageModal(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-3 rounded-xl text-xs transition cursor-pointer"
                  >
                    Kapat
                  </button>
                  <button
                    onClick={() => router.push("/dashboard/messages")}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3 rounded-xl text-xs transition cursor-pointer shadow-lg shadow-orange-500/15"
                  >
                    Mesajlarıma Git
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Mesajınız</label>
                  <textarea
                    rows={4}
                    required
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Merhabalar, araç hakkında detaylı bilgi alabilir miyim?"
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-orange-500 transition resize-none"
                  />
                </div>

                {messageError && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-2xl flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{messageError}</span>
                    </div>
                    {(messageError.includes("giriş yapın") || messageError.includes("authentication token") || messageError.includes("expired")) && (
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem("accessToken");
                          window.location.href = `/login?redirect=/listings/${id}`;
                        }}
                        className="mt-1 w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 rounded-xl text-xs transition text-center cursor-pointer shadow-md shadow-orange-500/20"
                      >
                        Giriş Yap Sayfasına Git
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMessageModal(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 font-bold py-3.5 rounded-xl text-xs transition cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={sendingMessage || !messageText.trim()}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3.5 rounded-xl text-xs transition shadow-lg shadow-orange-500/15 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingMessage ? "Gönderiliyor..." : "Mesajı Gönder"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      </div>

      {/* SAĞ GOOGLE ADS REKLAM KOLONU (1280px ve üzeri ekranlarda temiz boşluk olarak kalır) */}
      <div className="hidden xl:block w-[160px] min-[1600px]:w-[200px] min-[1920px]:w-[280px] shrink-0 static h-[600px]" />

    </div>
  );
}
