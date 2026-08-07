"use client";

import React, { useEffect, useState, Suspense } from "react";
import ListingCard from "../../../components/listings/ListingCard";
import { Star } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function FeedContent() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [token, setToken] = useState("");

  useEffect(() => {
    const savedToken = localStorage.getItem("accessToken");
    if (savedToken) setToken(savedToken);
  }, []);

  useEffect(() => {
    setLoading(true);
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    fetch(`${API_URL}/listings?showcaseOnly=true&page=${page}&limit=12&sort=newest`, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.items)) {
          setListings(data.items);
          setTotal(data.total || data.items.length);
        } else if (Array.isArray(data)) {
          setListings(data);
          setTotal(data.length);
        } else {
          setListings([]);
          setTotal(0);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("İlan Akışı yüklenirken hata:", err);
        setListings([]);
        setLoading(false);
      });
  }, [page, token]);

  const handleFavoriteToggle = (listingId: string) => {
    if (!token) {
      window.location.href = `/login?redirect=/kesfet/ilan-akisi`;
      return;
    }

    fetch(`${API_URL}/listings/${listingId}/favorite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setListings((prev) =>
          prev.map((item) =>
            item.id === listingId
              ? {
                  ...item,
                  isFavorited: data.isFavorited,
                  favoriteCount:
                    data.favoriteCount !== undefined
                      ? data.favoriteCount
                      : data.isFavorited
                      ? (item.favoriteCount || 0) + 1
                      : Math.max(0, (item.favoriteCount || 0) - 1),
                }
              : item
          )
        );
      })
      .catch((err) => console.error("Error toggling favorite on feed page:", err));
  };

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8 w-full">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-orange-950/50 border border-amber-500/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-3 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Star className="w-6 h-6" />
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">İlan Akışı (Vitrin)</h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
          Vitrin + Akış promosyonu ile öne çıkarılmış, yüksek görünürlüğe sahip özel araç ilanları.
        </p>
      </div>

      {/* Listing Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-900/40 border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-white/10 space-y-3">
          <span className="text-4xl block">⭐</span>
          <h3 className="text-base font-bold text-slate-200">Şu an aktif vitrin/akış ilanı bulunmamaktadır</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Yeni vitrin ilanları eklendiğinde bu alanda otomatik olarak listelenecektir.
          </p>
          <a
            href="/listings"
            className="inline-block px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-bold text-slate-200 transition mt-2"
          >
            Tüm İlanları İncele
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((item) => (
            <ListingCard
              key={item.id}
              listing={item}
              isFavorite={item.isFavorited}
              onFavoriteToggle={(id) => handleFavoriteToggle(id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center text-xs text-slate-400">Yükleniyor...</div>}>
      <FeedContent />
    </Suspense>
  );
}
