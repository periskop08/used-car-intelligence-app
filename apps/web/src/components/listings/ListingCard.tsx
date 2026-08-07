"use client";

import React from "react";
import UrgentListingBadge from "./UrgentListingBadge";
import { formatImageUrl } from "../../utils/media";

interface ListingCardProps {
  listing: any;
  onFavoriteToggle?: (id: string) => void;
  isFavorite?: boolean;
}

export default function ListingCard({ listing, onFavoriteToggle, isFavorite }: ListingCardProps) {
  const coverImage = listing.media && listing.media.length > 0 
    ? formatImageUrl(listing.media[0].url) 
    : "/placeholder-car.jpg";

  const formattedPrice = Number(listing.priceAmount || 0).toLocaleString("tr-TR");

  return (
    <div className="group bg-[#0b0f19] border border-white/10 rounded-2xl overflow-hidden hover:border-orange-500/40 transition duration-300 shadow-xl flex flex-col justify-between relative">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
        <img
          src={coverImage}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
        />

        {/* Top Left: Urgent Badge */}
        {listing.isUrgent && (
          <div className="absolute top-3 left-3 z-20">
            <UrgentListingBadge size="small" animated />
          </div>
        )}

        {/* Top Right: Favorite Button with Count */}
        {onFavoriteToggle && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFavoriteToggle(listing.id);
            }}
            className={`absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md transition text-xs font-bold shadow-lg ${
              isFavorite 
                ? "bg-red-500/90 text-white border border-red-400/50" 
                : "bg-slate-950/80 text-slate-300 hover:text-white border border-white/15"
            }`}
            title={isFavorite ? "Favorilerden Kaldır" : "Favoriye Ekle"}
          >
            <span>{isFavorite ? "❤️" : "🤍"}</span>
            {listing.favoriteCount !== undefined && listing.favoriteCount > 0 && (
              <span className="text-[11px] font-extrabold">{listing.favoriteCount}</span>
            )}
          </button>
        )}
      </div>

      <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{listing.modelYear} • {listing.kilometers?.toLocaleString("tr-TR")} KM</span>
            <span>{listing.city}</span>
          </div>
          <a href={`/listings/${listing.id}`} className="font-bold text-slate-100 hover:text-orange-400 transition text-sm line-clamp-1">
            {listing.title}
          </a>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
          <span className="text-base font-black text-white">{formattedPrice} {listing.currency || "TRY"}</span>
          <a
            href={`/listings/${listing.id}`}
            className="px-3 py-1.5 rounded-xl bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white border border-orange-500/30 text-xs font-bold transition"
          >
            İncele
          </a>
        </div>
      </div>
    </div>
  );
}
