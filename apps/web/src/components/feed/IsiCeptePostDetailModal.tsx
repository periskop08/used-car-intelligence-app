"use client";

import React, { useEffect } from "react";
import { IsiCepteProviderPostFeedItem } from "@used-car-intelligence/shared";

interface IsiCeptePostDetailModalProps {
  post: IsiCepteProviderPostFeedItem;
  isOpen: boolean;
  onClose: () => void;
}

export default function IsiCeptePostDetailModal({
  post,
  isOpen,
  onClose,
}: IsiCeptePostDetailModalProps) {
  // Prevent body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Content */}
      <div
        className="relative w-full max-w-2xl bg-[#090d16] border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] text-slate-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center overflow-hidden font-bold text-orange-400 text-sm">
              {post.profileImageUrl ? (
                <img
                  src={post.profileImageUrl}
                  alt={post.businessName}
                  className="w-full h-full object-cover"
                />
              ) : (
                post.businessName.slice(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  {post.businessName}
                </h3>
                {post.isShowcaseActive && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Öne Çıkan
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {post.cityName} {post.districtName ? `• ${post.districtName}` : ""}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
          {/* Post Image */}
          {post.postImageUrl && (
            <div className="w-full h-72 sm:h-80 rounded-2xl overflow-hidden bg-slate-950 border border-white/5 relative">
              <img
                src={post.postImageUrl}
                alt={post.postTitle}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-semibold text-orange-400 border border-white/10">
                🔧 Servis & Bakım Paylaşımı
              </div>
            </div>
          )}

          {/* Post Title & Description */}
          <div>
            <h2 className="text-xl font-bold text-white mb-2">{post.postTitle}</h2>
            <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
              {post.postDescription}
            </p>
          </div>

          {/* Provider Details Card */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Servis & Usta Bilgileri
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {post.rating && (
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-400 block text-[10px]">Müşteri Puanı</span>
                  <span className="text-amber-400 font-bold text-sm">
                    ⭐ {post.rating.toFixed(1)} / 5.0
                  </span>
                </div>
              )}

              {post.phone && (
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-400 block text-[10px]">İletişim Hattı</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    📞 {post.phone}
                  </span>
                </div>
              )}
            </div>

            {post.address && (
              <div className="text-xs text-slate-400 flex items-start gap-1.5 pt-1">
                <span>📍</span>
                <span>{post.address}</span>
              </div>
            )}

            {/* Supported Brands */}
            {post.supportedBrands && post.supportedBrands.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] text-slate-400 block mb-1.5">
                  Hizmet Verilen Markalar:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {post.supportedBrands.map((brand, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-white/5"
                    >
                      {brand}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Service Categories */}
            {post.serviceCategories && post.serviceCategories.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] text-slate-400 block mb-1.5">
                  Uzmanlık & Hizmet Alanları:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {post.serviceCategories.map((cat, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-white/5"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer / CTAs */}
        <div className="p-4 sm:px-6 border-t border-white/10 bg-slate-900/40 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Kapat
          </button>

          {post.profileUrl ? (
            <a
              href={post.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20 transition flex items-center gap-1.5"
            >
              <span>İşiCepte'de Profili Aç</span>
              <span>➔</span>
            </a>
          ) : (
            <a
              href="/isicepte-oneriyor"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition flex items-center gap-1.5"
            >
              <span>Tüm Servisleri Gör</span>
              <span>➔</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
