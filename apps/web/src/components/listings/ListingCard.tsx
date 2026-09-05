"use client";

import React, { useState } from "react";
import UrgentListingBadge from "./UrgentListingBadge";
import { formatImageUrl } from "../../utils/media";
import { formatCurrency } from "../../utils/formatters";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface ListingCardProps {
  listing: any;
  onFavoriteToggle?: (id: string) => void;
  isFavorite?: boolean;
}

export default function ListingCard({ listing, onFavoriteToggle, isFavorite }: ListingCardProps) {
  const [internalIsFav, setInternalIsFav] = useState<boolean>(
    isFavorite !== undefined ? isFavorite : !!listing.isFavorited
  );
  const [internalFavCount, setInternalFavCount] = useState<number>(
    listing.favoriteCount !== undefined ? listing.favoriteCount : 0
  );

  const favState = isFavorite !== undefined ? isFavorite : internalIsFav;
  const favCount = listing.favoriteCount !== undefined ? listing.favoriteCount : internalFavCount;

  const coverImage = listing.media && listing.media.length > 0 
    ? formatImageUrl(listing.media[0].url) 
    : "/placeholder-car.jpg";

  const handleHeartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onFavoriteToggle) {
      onFavoriteToggle(listing.id);
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      window.location.href = `/login?redirect=/listings`;
      return;
    }

    fetch(`${API_URL}/listings/${listing.id}/favorite`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setInternalIsFav(data.isFavorited);
        if (data.favoriteCount !== undefined) {
          setInternalFavCount(data.favoriteCount);
        } else {
          setInternalFavCount((prev) => (data.isFavorited ? prev + 1 : Math.max(0, prev - 1)));
        }
      })
      .catch((err) => console.error("Error toggling favorite on card:", err));
  };

  return (
    <a 
      href={`/listings/${listing.id}`}
      className="group bg-[#0b0f19] border border-white/10 rounded-2xl overflow-hidden hover:border-orange-500/40 transition duration-300 shadow-xl flex flex-col justify-between relative cursor-pointer"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
        <img
          src={coverImage}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder-car.jpg";
          }}
        />

        {/* Top Left: Badges */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-1 items-start">
          {listing.isUrgent && <UrgentListingBadge size="small" animated />}
          {listing.isShowcaseFeedActive && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/90 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-lg border border-amber-300/40">
              ⭐ Vitrin
            </span>
          )}
        </div>

        {/* Top Right: Favorite Button with Count */}
        <button
          type="button"
          onClick={handleHeartClick}
          className={`absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md transition text-xs font-bold shadow-lg ${
            favState 
              ? "bg-red-500/90 text-white border border-red-400/50" 
              : "bg-slate-950/80 text-slate-300 hover:text-white border border-white/15"
          }`}
          title={favState ? "Favorilerden Kaldır" : "Favoriye Ekle"}
        >
          <span>{favState ? "❤️" : "🤍"}</span>
          {favCount > 0 && (
            <span className="text-[11px] font-extrabold">{favCount}</span>
          )}
        </button>
      </div>

      <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{listing.modelYear || listing.year} • {(listing.kilometers ?? listing.mileage)?.toLocaleString("tr-TR")} KM</span>
            <span>{listing.city}</span>
          </div>
          <h3 className="font-bold text-slate-100 group-hover:text-orange-400 transition text-sm line-clamp-1">
            {listing.title}
          </h3>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
          <span className="text-base font-black text-white">{formatCurrency(listing.priceAmount, listing.currency)}</span>
          <span className="px-3 py-1.5 rounded-xl bg-orange-600/20 group-hover:bg-orange-600 text-orange-400 group-hover:text-white border border-orange-500/30 text-xs font-bold transition">
            İncele
          </span>
        </div>
      </div>
    </a>
  );
}
