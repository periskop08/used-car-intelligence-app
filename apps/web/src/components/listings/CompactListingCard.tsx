"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Car } from "lucide-react";

export interface CompactListingData {
  id: string;
  listingNo?: string | number | null;
  title: string;
  modelYear: number;
  kilometers: number;
  priceAmount: number;
  currency?: string;
  city?: string | null;
  district?: string | null;
  imageUrl?: string | null;
  isUrgent?: boolean;
  isShowcaseFeedActive?: boolean;
}

export interface CompactListingCardProps {
  listing: CompactListingData;
  href?: string;
  className?: string;
  onClick?: () => void;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(price || 0);
};

/**
 * Shared Presentational Component for Compact Listing Cards.
 * Used in "Bu Aracın İlanları" (report page) and "Benzer İlanlar" (listing detail page).
 *
 * Design Invariants:
 * - Photo ~15-20% larger (~105-120px landscape 4/3 ratio).
 * - Small ACİL pill strictly at top-left of photo (doesn't block image).
 * - Small VİTRİN chip next to title in the text column (never stacked on photo).
 * - Text hierarchy: Photo > Title > Price > Badges.
 */
export default function CompactListingCard({
  listing,
  href,
  className = "",
  onClick,
}: CompactListingCardProps) {
  const [imageError, setImageError] = useState(false);

  const targetHref = href || `/listings/${listing.listingNo || listing.id}`;

  const locationText = listing.district
    ? `${listing.city || ""} / ${listing.district}`
    : listing.city || "";

  return (
    <Link
      href={targetHref}
      onClick={onClick}
      className={`flex items-center gap-3 p-2 sm:p-2.5 rounded-xl bg-[#0a1122]/90 hover:bg-[#101b33] border border-white/5 hover:border-orange-500/40 transition group shadow-sm select-none shrink-0 ${className}`}
    >
      {/* 1. THUMBNAIL (Landscape 4/3 ratio, larger image, strictly top-left small ACİL chip) */}
      <div className="w-[100px] sm:w-[115px] h-[75px] sm:h-[86px] rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0 relative flex items-center justify-center">
        {listing.imageUrl && !imageError ? (
          <img
            src={listing.imageUrl}
            alt={listing.title}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
          />
        ) : (
          <div className="w-full h-full bg-slate-950 flex items-center justify-center text-slate-600">
            <Car className="w-6 h-6 text-slate-500" />
          </div>
        )}

        {/* Small ACİL Chip (strictly top-left, compact size ~60% of original, never covers vehicle) */}
        {listing.isUrgent && (
          <span className="absolute top-1 left-1 z-10 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600/95 text-white font-extrabold text-[9px] tracking-wider uppercase shadow-md border border-red-400/40 backdrop-blur-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
            <span>ACİL</span>
          </span>
        )}
      </div>

      {/* 2. RIGHT TEXT COLUMN (Title + VİTRİN chip, Year/Km/Location, Price) */}
      <div className="flex flex-col min-w-0 flex-1 justify-center py-0.5">
        {/* Row 1: Title + Small VİTRİN Chip (Next to title, NEVER on thumbnail) */}
        <div className="flex items-center gap-1.5 min-w-0">
          <h4 className="text-[12px] font-bold text-slate-200 truncate group-hover:text-orange-400 transition leading-snug">
            {listing.title}
          </h4>
          {listing.isShowcaseFeedActive && (
            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[8px] uppercase tracking-wider shadow-xs border border-amber-300">
              <span className="text-[8.5px]">⭐</span>
              <span>VİTRİN</span>
            </span>
          )}
        </div>

        {/* Row 2: Year • Km • Location */}
        <div className="text-[10px] text-slate-400 font-medium truncate mt-1">
          {listing.modelYear} • {(listing.kilometers ?? 0).toLocaleString("tr-TR")} km
          {locationText ? ` • ${locationText}` : ""}
        </div>

        {/* Row 3: Highlighted Price */}
        <div className="text-[12.5px] font-black text-orange-400 mt-1 leading-none">
          {formatPrice(listing.priceAmount || 0)}
        </div>
      </div>
    </Link>
  );
}
