"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function MyFavorites() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const savedToken = localStorage.getItem("accessToken");
    if (!savedToken) {
      router.push("/login?redirect=/dashboard/favorites");
      return;
    }
    setToken(savedToken);

    fetchFavorites(savedToken);
  }, []);

  const fetchFavorites = (authToken: string) => {
    setLoading(true);
    fetch(`${API_URL}/me/favorites`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Favori ilanlar yüklenemedi.");
        return res.json();
      })
      .then((data) => {
        setListings(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setLoading(false);
      });
  };

  const handleRemoveFavorite = (e: React.MouseEvent, listingId: string) => {
    e.preventDefault();
    e.stopPropagation();

    fetch(`${API_URL}/listings/${listingId}/favorite`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("İşlem başarısız.");
        return res.json();
      })
      .then(() => {
        // Remove item from UI state
        setListings((prev) => prev.filter((item) => item.id !== listingId));
      })
      .catch((err) => console.error("Error toggling favorite:", err));
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-12 flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-black text-slate-200 tracking-tight">❤️ Favori İlanlarım</h1>
        <p className="text-sm text-slate-400 mt-1">Takip ettiğiniz, güncellemelerini izlediğiniz favori ilanlarınız.</p>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-bold">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <span className="animate-spin text-3xl">⏳</span>
          <span className="text-slate-400 font-bold text-sm">Favorileriniz yükleniyor, lütfen bekleyin...</span>
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 border border-dashed border-white/10 rounded-3xl bg-slate-950/5">
          <span className="text-4xl">⭐</span>
          <span className="text-slate-300 font-bold text-lg">Henüz hiçbir ilanı favorilerinize eklemediniz.</span>
          <a
            href="/listings"
            className="text-xs bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded-xl transition"
          >
            İlanları İncele
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {listings.map((listing) => {
            const cover = listing.media && listing.media[0] ? listing.media[0].url : "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&auto=format&fit=crop&q=60";
            return (
              <a
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="group flex flex-col bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/5 transition duration-300 relative"
              >
                {/* Remove Favorite Button */}
                <button
                  onClick={(e) => handleRemoveFavorite(e, listing.id)}
                  className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-slate-950/80 border border-white/10 flex items-center justify-center text-red-500 hover:scale-110 transition shadow-lg backdrop-blur-sm"
                  title="Favorilerden Kaldır"
                >
                  ❤️
                </button>

                <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
                  <img
                    src={cover}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  {listing.isAiReady && (
                    <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded bg-orange-600/90 text-white backdrop-blur-sm border border-orange-500/30 shadow-md">
                      ✨ AI Analizli
                    </span>
                  )}
                </div>

                <div className="p-4 flex flex-col justify-between flex-1 gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {listing.modelYear} • {listing.city}
                    </span>
                    <h3 className="font-bold text-slate-200 text-sm line-clamp-1 group-hover:text-orange-400 transition mt-1">
                      {listing.title}
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">
                      {listing.kilometers.toLocaleString('tr-TR')} km
                    </p>
                  </div>

                  <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                    <span className="font-black text-slate-100 text-sm">
                      {Number(listing.priceAmount).toLocaleString('tr-TR')} {listing.currency === "TRY" ? "TL" : listing.currency}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {listing.vehicleVariant?.brand.name}
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
