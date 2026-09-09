"use client";

import React, { useState, useMemo } from "react";
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
  variant?: "default" | "sidebar";
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(price || 0);
};

/**
 * Double fail-safe client URL resolver:
 * Converts any raw Cloudflare R2 development URL (`*.r2.dev/`) to the canonical media-proxy URL,
 * preventing connection reset errors in restricted regions (TR).
 */
function resolveDisplayImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.includes(".r2.dev/")) {
    const key = url.split(".r2.dev/")[1];
    if (key) {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL ||
        "https://used-car-api-hzmu.onrender.com";
      return `${apiBase}/listings/media-proxy/${key}`;
    }
  }
  return url;
}

/**
 * Shared Presentational Component for Compact Listing Cards.
 * Used in "Bu Aracın İlanları" (report page) and "Benzer İlanlar" (listing detail sidebar).
 *
 * Variants:
 * - 'sidebar': Specially tuned for narrow columns (~240-270px width). 84x63 landscape photo leaving ample room for title & badges.
 * - 'default': Tuned for standard/wider columns. 105x78 landscape photo.
 */
export default function CompactListingCard({
  listing,
  href,
  className = "",
  onClick,
  variant = "default",
}: CompactListingCardProps) {
  const [imageError, setImageError] = useState(false);

  const targetHref = href || `/listings/${listing.listingNo || listing.id}`;
  const displayImageUrl = useMemo(
    () => resolveDisplayImageUrl(listing.imageUrl),
    [listing.imageUrl]
  );

  const locationText = listing.district
    ? `${listing.city || ""} / ${listing.district}`
    : listing.city || "";

  const isSidebar = variant === "sidebar";

  return (
    <Link
      href={targetHref}
      onClick={onClick}
      className={`flex items-center ${
        isSidebar ? "gap-2.5 p-2 rounded-xl" : "gap-3 p-2.5 rounded-xl"
      } bg-[#0a1122]/90 hover:bg-[#101b33] border border-white/5 hover:border-orange-500/40 transition group shadow-sm select-none shrink-0 ${className}`}
    >
      {/* 1. THUMBNAIL (Landscape 4/3 ratio, tailored to variant) */}
      <div
        className={`${
          isSidebar
            ? "w-[84px] h-[63px] rounded-lg"
            : "w-[100px] sm:w-[110px] h-[75px] sm:h-[82px] rounded-xl"
        } overflow-hidden bg-slate-900 border border-white/10 shrink-0 relative flex items-center justify-center`}
      >
        {displayImageUrl && !imageError ? (
          <img
            src={displayImageUrl}
            alt={listing.title}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
          />
        ) : (
          <div className="w-full h-full bg-slate-950 flex items-center justify-center text-slate-600">
            <Car
              className={`${
                isSidebar ? "w-5 h-5 text-slate-600" : "w-6 h-6 text-slate-500"
              }`}
            />
          </div>
        )}

        {/* Small ACİL Chip (strictly top-left, compact size ~60% of original, never covers vehicle) */}
        {listing.isUrgent && (
          <span
            className={`absolute top-1 left-1 z-10 inline-flex items-center ${
              isSidebar
                ? "gap-0.5 px-1 py-0.2 text-[8px]"
                : "gap-1 px-1.5 py-0.5 text-[9px]"
            } rounded bg-red-600/95 text-white font-extrabold tracking-wider uppercase shadow-md border border-red-400/40 backdrop-blur-xs`}
          >
            <span
              className={`${
                isSidebar ? "w-1 h-1" : "w-1.5 h-1.5"
              } rounded-full bg-white animate-pulse shrink-0`}
            />
            <span>ACİL</span>
          </span>
        )}
      </div>

      {/* 2. RIGHT TEXT COLUMN (Title + VİTRİN chip, Year/Km/Location, Price) */}
      <div className="flex flex-col min-w-0 flex-1 justify-center py-0.5">
        {/* Row 1: Title + Small VİTRİN Chip (Next to title, NEVER on thumbnail) */}
        <div className="flex items-center gap-1.5 min-w-0">
          <h4
            className={`${
              isSidebar ? "text-[11.5px]" : "text-[12px]"
            } font-bold text-slate-200 truncate group-hover:text-orange-400 transition leading-snug`}
            title={listing.title}
          >
            {listing.title}
          </h4>
          {listing.isShowcaseFeedActive && (
            <span
              className={`shrink-0 inline-flex items-center gap-0.5 ${
                isSidebar ? "px-1 py-0.2 text-[7.5px]" : "px-1.5 py-0.5 text-[8px]"
              } rounded-md bg-amber-500 text-slate-950 font-black uppercase tracking-wider shadow-xs border border-amber-300`}
            >
              <span className="text-[8px]">⭐</span>
              <span>VİTRİN</span>
            </span>
          )}
        </div>

        {/* Row 2: Year • Km • Location */}
        <div
          className={`${
            isSidebar ? "text-[9.5px] mt-0.5" : "text-[10px] mt-1"
          } text-slate-400 font-medium truncate`}
          title={`${listing.modelYear} • ${(
            listing.kilometers ?? 0
          ).toLocaleString("tr-TR")} km${
            locationText ? ` • ${locationText}` : ""
          }`}
        >
          {listing.modelYear} • {(listing.kilometers ?? 0).toLocaleString("tr-TR")}{" "}
          km
          {locationText ? ` • ${locationText}` : ""}
        </div>

        {/* Row 3: Highlighted Price */}
        <div
          className={`${
            isSidebar ? "text-[12px] mt-1" : "text-[12.5px] mt-1"
          } font-black text-orange-400 leading-none`}
        >
          {formatPrice(listing.priceAmount || 0)}
        </div>
      </div>
    </Link>
  );
}
