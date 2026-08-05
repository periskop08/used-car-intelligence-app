"use client";

import React, { useState } from "react";
import { AlertCircle } from "lucide-react";

interface UrgentListingBadgeProps {
  size?: "small" | "medium";
  animated?: boolean;
  className?: string;
}

export default function UrgentListingBadge({
  size = "small",
  animated = true,
  className = "",
}: UrgentListingBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const paddingClass = size === "medium" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]";

  return (
    <div className={`relative inline-block ${className}`}>
      <style jsx>{`
        @keyframes urgentFlash {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
            box-shadow: 0 0 10px rgba(239, 68, 68, 0.7), inset 0 0 6px rgba(255, 255, 255, 0.4);
            filter: brightness(1);
          }
          50% {
            opacity: 0.85;
            transform: scale(1.05);
            box-shadow: 0 0 20px rgba(239, 68, 68, 1), 0 0 10px rgba(255, 0, 0, 0.8);
            filter: brightness(1.25);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .urgent-badge-glow {
            animation: none !important;
          }
        }
        .urgent-badge-glow {
          ${animated ? "animation: urgentFlash 1.5s ease-in-out infinite;" : ""}
        }
      `}</style>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowTooltip(!showTooltip);
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`urgent-badge-glow font-black uppercase tracking-wider rounded-md bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white shadow-lg border border-red-400/60 flex items-center gap-1.5 cursor-pointer select-none ${paddingClass}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        <span>🚨 ACİL</span>
      </button>

      {showTooltip && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full mt-1.5 w-64 p-2.5 rounded-xl bg-slate-900/95 backdrop-blur-md border border-red-500/30 text-[11px] text-slate-300 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 leading-relaxed"
        >
          <div className="flex items-start gap-1.5 font-medium">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>
              Satıcı bu ilanı ücretli <strong>Acil İlan</strong> olarak işaretlemiştir. TorqueScout satış aciliyetini doğrulamamaktadır.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
