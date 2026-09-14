"use client";

import React, { useState } from "react";
import { Siren, AlertCircle } from "lucide-react";

export interface UrgentListingBadgeProps {
  size?: "xs" | "small" | "sm" | "medium" | "md" | "lg";
  animated?: boolean;
  className?: string;
  withTooltip?: boolean;
  interactive?: boolean;
}

export default function UrgentListingBadge({
  size = "small",
  animated = true,
  className = "",
  withTooltip = false,
  interactive = true,
}: UrgentListingBadgeProps) {
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
      <style jsx>{`
        @keyframes urgentCompactFlash {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
            box-shadow: 0 0 6px rgba(239, 68, 68, 0.65), inset 0 0 3px rgba(255, 255, 255, 0.35);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.05);
            box-shadow: 0 0 12px rgba(239, 68, 68, 0.95), 0 0 6px rgba(255, 0, 0, 0.6);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .urgent-badge-glow {
            animation: none !important;
          }
        }
        .urgent-badge-glow {
          ${animated ? "animation: urgentCompactFlash 1.5s ease-in-out infinite;" : ""}
        }
      `}</style>

      {interactive ? (
        <button
          type="button"
          role="status"
          aria-label="Acil İlan"
          title="Acil İlan"
          onClick={(e) => {
            if (withTooltip) {
              e.stopPropagation();
              setShowTooltip(!showTooltip);
            }
          }}
          onMouseEnter={() => withTooltip && setShowTooltip(true)}
          onMouseLeave={() => withTooltip && setShowTooltip(false)}
          className={`urgent-badge-glow aspect-square flex items-center justify-center bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white shadow-md border border-red-300/60 backdrop-blur-xs select-none transition-transform ${sizeClasses}`}
        >
          <Siren className="w-full h-full text-white shrink-0 drop-shadow-xs" />
        </button>
      ) : (
        <span
          role="status"
          aria-label="Acil İlan"
          className={`urgent-badge-glow aspect-square flex items-center justify-center bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white shadow-md border border-red-300/60 backdrop-blur-xs select-none ${sizeClasses}`}
        >
          <Siren className="w-full h-full text-white shrink-0 drop-shadow-xs" />
        </span>
      )}

      {withTooltip && showTooltip && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full mt-1.5 w-60 p-2.5 rounded-xl bg-slate-900/95 backdrop-blur-md border border-red-500/30 text-[11px] text-slate-300 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 leading-relaxed pointer-events-none"
        >
          <div className="flex items-start gap-1.5 font-medium">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>
              Satıcı bu ilanı <strong>Acil İlan</strong> olarak öne çıkarmıştır.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export { UrgentListingBadge as UrgentBadge };
