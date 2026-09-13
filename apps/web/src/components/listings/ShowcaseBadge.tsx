"use client";

import React, { useState } from "react";
import { Star } from "lucide-react";

export interface ShowcaseBadgeProps {
  size?: "xs" | "small" | "sm" | "medium" | "md" | "lg";
  className?: string;
  withTooltip?: boolean;
}

export default function ShowcaseBadge({
  size = "small",
  className = "",
  withTooltip = false,
}: ShowcaseBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Normalize size alias
  const isXs = size === "xs";
  const isSm = size === "small" || size === "sm";
  const isMd = size === "medium" || size === "md";
  const isLg = size === "lg";

  const sizeClasses = isXs
    ? "w-[18px] h-[18px] p-[2.5px] rounded-[5px]"
    : isMd
    ? "w-7 h-7 sm:w-8 sm:h-8 p-1.5 rounded-lg"
    : isLg
    ? "w-9 h-9 p-2 rounded-xl"
    : "w-[22px] h-[22px] sm:w-6 sm:h-6 p-1 rounded-md"; // default: sm

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <button
        type="button"
        role="status"
        aria-label="Vitrin İlan"
        title="Vitrin İlan"
        onClick={(e) => {
          if (withTooltip) {
            e.stopPropagation();
            setShowTooltip(!showTooltip);
          }
        }}
        onMouseEnter={() => withTooltip && setShowTooltip(true)}
        onMouseLeave={() => withTooltip && setShowTooltip(false)}
        className={`aspect-square flex items-center justify-center bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-500 text-amber-950 shadow-md shadow-amber-500/20 border border-amber-200/70 select-none transition-transform hover:scale-105 active:scale-95 ${sizeClasses}`}
      >
        <Star className="w-full h-full fill-amber-950 text-amber-950 shrink-0 drop-shadow-xs" />
      </button>

      {withTooltip && showTooltip && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full mt-1.5 w-56 p-2.5 rounded-xl bg-slate-900/95 backdrop-blur-md border border-amber-500/30 text-[11px] text-slate-300 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 leading-relaxed pointer-events-none"
        >
          <div className="flex items-start gap-1.5 font-medium">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Satıcı bu ilanı <strong>Vitrin İlan</strong> olarak öne çıkarmıştır.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export { ShowcaseBadge };
