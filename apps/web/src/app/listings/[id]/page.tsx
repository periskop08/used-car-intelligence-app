"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function ListingDetail() {
  const { id } = useParams();

  // Data states
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activePhoto, setActivePhoto] = useState("");

  // Lead Form States
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [message, setMessage] = useState("Merhaba, araç ile ilgileniyorum. Detaylar için görüşebilir miyiz?");
  const [communicationGranted, setCommunicationGranted] = useState(false);
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState("");
  const [leadError, setLeadError] = useState("");

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

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLeadLoading(true);
    setLeadSuccess("");
    setLeadError("");

    fetch(`${API_URL}/listings/${id}/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerName,
        buyerPhone,
        buyerEmail,
        message,
        communicationGranted,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.message || "Talep gönderilemedi.");
          });
        }
        return res.json();
      })
      .then(() => {
        setLeadSuccess("Talebiniz satıcıya başarıyla iletildi! En kısa sürede dönüş yapılacaktır.");
        setBuyerName("");
        setBuyerPhone("");
        setBuyerEmail("");
        setCommunicationGranted(false);
        setLeadLoading(false);
      })
      .catch((err) => {
        setLeadError(err.message);
        setLeadLoading(false);
      });
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
        setListing((prev: any) => ({ ...prev, isFavorited: data.isFavorited }));
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

  const [hoveredPart, setHoveredPart] = useState("");

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
    <div className="w-full max-w-7xl mx-auto px-6 py-12 flex flex-col gap-10">
      {/* Back button */}
      <div>
        <a href="/listings" className="text-xs text-orange-500 hover:underline font-bold">← İlan Listesine Dön</a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Photo & Specs & Condition */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Title & Price Header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-white/5 pb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight">{listing.title}</h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                {listing.modelYear} • {listing.kilometers.toLocaleString('tr-TR')} km • {listing.city} {listing.district ? `/ ${listing.district}` : ""}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl md:text-3xl font-black bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">
                {Number(listing.priceAmount).toLocaleString('tr-TR')} {listing.currency}
              </span>
              <p className="text-[10px] text-slate-500 mt-1 font-mono">KDV Dahil</p>
            </div>
          </div>

          {/* Photo Gallery Grid */}
          <div className="flex flex-col gap-3">
            <div className="relative aspect-[16/9] w-full rounded-3xl overflow-hidden bg-slate-950 border border-white/5 shadow-xl">
              {/* Favorite Toggle Button */}
              <button
                onClick={handleToggleFavorite}
                className={`absolute top-4 right-4 z-10 w-10 h-10 rounded-full border flex items-center justify-center transition shadow-lg backdrop-blur-sm cursor-pointer select-none hover:scale-105 ${
                  listing.isFavorited
                    ? "bg-red-500/20 text-red-500 border-red-500/40"
                    : "bg-slate-950/80 text-slate-400 border-white/10 hover:text-white"
                }`}
                title={listing.isFavorited ? "Favorilerden Kaldır" : "Favoriye Ekle"}
              >
                {listing.isFavorited ? "❤️" : "🤍"}
              </button>

              <img
                src={activePhoto || defaultImage}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
              {listing.isAiReady && (
                <span className="absolute top-4 left-4 text-xs font-bold px-3 py-1 rounded-full bg-orange-600/90 text-white border border-orange-500/30 backdrop-blur-sm">
                  ✨ AI Analizli İlan
                </span>
              )}
            </div>

            {/* Thumbnails list */}
            {listing.media && listing.media.length > 0 && (
              <div className="flex items-center gap-3 overflow-x-auto py-1">
                {listing.media.map((img: any) => (
                  <button
                    key={img.id}
                    onClick={() => setActivePhoto(img.url)}
                    className={`relative w-20 aspect-[4/3] rounded-xl overflow-hidden border-2 transition ${
                      activePhoto === img.url ? "border-orange-500 scale-95" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img.url} alt="thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Core Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-slate-900/20 border border-white/5 rounded-3xl">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-black">Yıl</span>
              <span className="text-sm font-bold text-slate-200 mt-0.5">{listing.modelYear}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-black">Kilometre</span>
              <span className="text-sm font-bold text-slate-200 mt-0.5">{listing.kilometers.toLocaleString('tr-TR')} km</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-black">Yakıt</span>
              <span className="text-sm font-bold text-slate-200 mt-0.5">{listing.fuelType || "Belirtilmedi"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-black">Şanzıman</span>
              <span className="text-sm font-bold text-slate-200 mt-0.5">{listing.transmission || "Belirtilmedi"}</span>
            </div>
          </div>

          {/* Description */}
          {listing.description && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider">Açıklama</h3>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line bg-slate-900/10 p-6 rounded-3xl border border-white/5">
                {listing.description}
              </p>
            </div>
          )}

          {/* Condition Details (Boyalı / Değişen / Tramer) */}
          <div className="flex flex-col gap-4 p-6 bg-slate-900/20 border border-white/5 rounded-3xl">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest border-b border-white/5 pb-3">Ekspertiz ve Boya/Değişen Durumu</h3>

            {/* Visual Car Silhouette Grid (Read-only) */}
            <div className="flex flex-col gap-4 bg-slate-950/20 p-6 border border-white/5 rounded-3xl mt-2">
              <span className="text-xs font-black text-slate-200 uppercase tracking-wider">Boyalı veya Değişen Parça Görseli</span>
              
              <div className="flex items-center gap-4 text-[10px] font-bold mt-1">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-3 h-3 rounded bg-slate-900 border border-white/10 block"></span> Orijinal
                </span>
                <span className="flex items-center gap-1.5 text-orange-400">
                  <span className="w-3.5 h-3.5 rounded bg-orange-500/25 border border-orange-500/40 block"></span> Lokal Boyalı
                </span>
                <span className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-3 h-3 rounded bg-blue-500/25 border border-blue-500/40 block"></span> Boyalı
                </span>
                <span className="flex items-center gap-1.5 text-red-400">
                  <span className="w-3 h-3 rounded bg-red-500/25 border border-red-500/40 block"></span> Değişen
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center mt-4">
                {/* 1. Car Visual Silhouette (SVG - Read-only) */}
                <div className="md:col-span-6 flex flex-col items-center gap-2">
                  <div className="relative w-full max-w-[240px] p-4 bg-slate-950/40 border border-white/5 rounded-3xl flex justify-center shadow-xl">
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
                  <span className="text-[11px] font-bold text-slate-400 min-h-[16px] block text-center mt-1">
                    {hoveredPart ? hoveredPart : "Ekspertiz detayı için parçanın üzerine gelin"}
                  </span>
                </div>

                {/* 2. Side Lists: Summarizing current selections */}
                <div className="md:col-span-6 grid grid-cols-1 gap-4 h-full align-top">
                  <div className="flex flex-col gap-2 bg-slate-950/45 p-4 border border-white/5 rounded-2xl h-fit">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">🎨 Boyalı Parçalar</span>
                    <ul className="text-[11px] text-slate-350 flex flex-col gap-1.5">
                      {Array.isArray(listing.localPaintedParts) && listing.localPaintedParts.map((p: string) => (
                        <li key={p} className="flex items-center justify-between bg-orange-500/10 px-2 py-1 rounded-md text-[10px] border border-orange-500/10">
                          <span>{PART_LABELS[p] || p.replace(/_/g, " ")}</span>
                          <span className="font-bold text-orange-400">Lokal Boya</span>
                        </li>
                      ))}
                      {Array.isArray(listing.paintedParts) && listing.paintedParts.map((p: string) => (
                        <li key={p} className="flex items-center justify-between bg-blue-500/10 px-2 py-1 rounded-md text-[10px] border border-blue-500/10">
                          <span>{PART_LABELS[p] || p.replace(/_/g, " ")}</span>
                          <span className="font-bold text-blue-400">Boyalı</span>
                        </li>
                      ))}
                      {(!listing.localPaintedParts || listing.localPaintedParts.length === 0) && (!listing.paintedParts || listing.paintedParts.length === 0) && (
                        <span className="text-slate-500 font-bold text-[10px] italic">Boyalı parça yok.</span>
                      )}
                    </ul>
                  </div>

                  <div className="flex flex-col gap-2 bg-slate-950/45 p-4 border border-white/5 rounded-2xl h-fit">
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-wider">🔄 Değişen Parçalar</span>
                    <ul className="text-[11px] text-slate-350 flex flex-col gap-1.5">
                      {Array.isArray(listing.changedParts) && listing.changedParts.map((p: string) => (
                        <li key={p} className="flex items-center justify-between bg-red-500/10 px-2 py-1 rounded-md text-[10px] border border-red-500/10">
                          <span>{PART_LABELS[p] || p.replace(/_/g, " ")}</span>
                          <span className="font-bold text-red-400">Değişen</span>
                        </li>
                      ))}
                      {(!listing.changedParts || listing.changedParts.length === 0) && (
                        <span className="text-slate-500 font-bold text-[10px] italic">Değişen parça yok.</span>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 my-2"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400">Tramer Kaydı:</span>
                <span className="text-sm font-black text-red-400 mt-1">
                  {listing.tramerAmount > 0 ? `${listing.tramerAmount.toLocaleString('tr-TR')} TL` : "Hasar Kaydı Yok"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400">Bakım Geçmişi:</span>
                <span className="text-xs text-slate-300 mt-1">{listing.maintenanceHistory || "Belirtilmedi"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Lead Form & AI Report widget */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          {/* Seller Lead Contact Form */}
          <div className="glass p-6 rounded-3xl border border-white/5 flex flex-col gap-4 shadow-xl">
            <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider">Satıcıya Mesaj Gönder</h3>

            <form onSubmit={handleLeadSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Adınız Soyadınız</label>
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Ahmet Yılmaz"
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Telefon Numaranız</label>
                <input
                  type="text"
                  required
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="05551234567"
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">E-posta Adresiniz</label>
                <input
                  type="email"
                  required
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="ahmet@gmail.com"
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Mesajınız</label>
                <textarea
                  rows={3}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 transition resize-none"
                />
              </div>

              <div className="flex items-start gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  required
                  id="consentCheckbox"
                  checked={communicationGranted}
                  onChange={(e) => setCommunicationGranted(e.target.checked)}
                  className="accent-orange-500 rounded border-white/10 mt-0.5"
                />
                <label htmlFor="consentCheckbox" className="text-[10px] text-slate-400 select-none leading-tight cursor-pointer">
                  KVKK / İletişim izni şartlarını kabul ediyorum. Satıcı benimle paylaştığım iletişim kanalları üzerinden irtibat kurabilir.
                </label>
              </div>

              {leadSuccess && <p className="text-xs font-bold text-emerald-400 mt-2 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">{leadSuccess}</p>}
              {leadError && <p className="text-xs font-bold text-red-400 mt-2 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">{leadError}</p>}

              <button
                type="submit"
                disabled={leadLoading}
                className="w-full mt-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 rounded-xl transition text-xs shadow-lg shadow-orange-500/10"
              >
                {leadLoading ? "Gönderiliyor..." : "Bilgileri Satıcıya Gönder"}
              </button>
            </form>
          </div>

          {/* AI Intelligence widget block */}
          {listing.isAiReady && vehicle ? (
            <div className="glass p-6 rounded-3xl border border-orange-500/25 bg-orange-950/5 flex flex-col gap-4 shadow-xl relative overflow-hidden">
              <span className="absolute -top-10 -right-10 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl"></span>

              <div>
                <h3 className="text-sm font-extrabold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                  ✨ Bu Varyant Hakkında AI Analizi
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {vehicle.brand.name} {vehicle.model.name} {vehicle.year} varyantı için sistem verileri
                </p>
              </div>

              {/* Tabs selector */}
              <div className="grid grid-cols-4 gap-1 bg-slate-950/40 p-1 rounded-xl">
                <button
                  onClick={() => setActiveAiTab("problems")}
                  className={`text-[9px] font-bold py-1.5 rounded-lg transition ${
                    activeAiTab === "problems" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sorunlar
                </button>
                <button
                  onClick={() => setActiveAiTab("recalls")}
                  className={`text-[9px] font-bold py-1.5 rounded-lg transition ${
                    activeAiTab === "recalls" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Recall
                </button>
                <button
                  onClick={() => setActiveAiTab("questions")}
                  className={`text-[9px] font-bold py-1.5 rounded-lg transition ${
                    activeAiTab === "questions" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sorular
                </button>
                <button
                  onClick={() => setActiveAiTab("checklist")}
                  className={`text-[9px] font-bold py-1.5 rounded-lg transition ${
                    activeAiTab === "checklist" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Checklist
                </button>
              </div>

              {/* Tab Contents */}
              <div className="bg-slate-950/20 p-4 rounded-2xl border border-white/5 min-h-[220px] flex flex-col gap-4 text-xs">
                {activeAiTab === "problems" && (
                  <div className="flex flex-col gap-3">
                    <p className="text-[10px] text-slate-400 italic">
                      ⚠️ Bu varyantta bazı kullanıcılar tarafından raporlanmıştır. Her araçta görülmeyebilir. Alım öncesi ekspertiz önerilir.
                    </p>
                    {vehicle.problems && vehicle.problems.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {vehicle.problems.map((p: any) => (
                          <div key={p.id} className="flex flex-col gap-1 border-l-2 border-orange-500/40 pl-3">
                            <span className="font-bold text-slate-200 text-xs">{p.name}</span>
                            <span className="text-[11px] text-slate-400 leading-relaxed">{p.description}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Bu varyanta ait bilinen kronik bir sorun bulunmamaktadır.</span>
                    )}
                  </div>
                )}

                {activeAiTab === "recalls" && (
                  <div className="flex flex-col gap-3">
                    {vehicle.recalls && vehicle.recalls.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {vehicle.recalls.map((r: any) => (
                          <div key={r.id} className="flex flex-col gap-1 border-l-2 border-red-500/40 pl-3">
                            <span className="font-bold text-slate-200 text-xs">{r.name}</span>
                            <span className="text-[11px] text-slate-400 leading-relaxed">{r.description}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Bu araç varyantı için resmi bir geri çağırma (recall) kaydı bulunmamaktadır.</span>
                    )}
                  </div>
                )}

                {activeAiTab === "questions" && (
                  <div className="flex flex-col gap-3">
                    <p className="text-[10px] text-slate-400">Araç sahibiyle konuşurken şu soruları mutlaka sorun:</p>
                    {vehicle.questions && vehicle.questions.length > 0 ? (
                      <ul className="flex flex-col gap-2.5">
                        {vehicle.questions.map((q: any) => (
                          <li key={q.id} className="text-slate-300 leading-relaxed pl-2 relative before:content-['•'] before:absolute before:left-0 before:text-orange-500">
                            {q.question}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-400 italic">Özel satıcı sorusu bulunmamaktadır.</span>
                    )}
                  </div>
                )}

                {activeAiTab === "checklist" && (
                  <div className="flex flex-col gap-3">
                    <p className="text-[10px] text-slate-400">Ekspertize gittiğinizde özellikle şu noktaları kontrol ettirin:</p>
                    {vehicle.checklists && vehicle.checklists.length > 0 ? (
                      <ul className="flex flex-col gap-2.5">
                        {vehicle.checklists.map((c: any) => (
                          <li key={c.id} className="text-slate-300 leading-relaxed pl-2 relative before:content-['✓'] before:absolute before:left-0 before:text-emerald-500">
                            {c.item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-400 italic">Özel kontrol checklisti bulunmamaktadır.</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-3xl border border-white/5 bg-slate-900/10 text-center flex flex-col gap-3">
              <span className="text-3xl">⏳</span>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">AI Analizi Hazırlanıyor</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Bu ilandaki araç için varyant eşleştirmesi veya AI analiz raporları henüz moderasyon tarafından onaylanmamış. En kısa sürede güncellenecektir.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
