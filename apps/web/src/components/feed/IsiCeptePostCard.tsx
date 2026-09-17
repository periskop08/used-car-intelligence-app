"use client";

import React, { useState } from "react";
import { IsiCepteProviderPostFeedItem } from "@used-car-intelligence/shared";
import IsiCeptePostDetailModal from "./IsiCeptePostDetailModal";

interface IsiCeptePostCardProps {
  post: IsiCepteProviderPostFeedItem;
}

export default function IsiCeptePostCard({ post }: IsiCeptePostCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setModalOpen(true)}
        className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-b from-[#0e1424] to-[#070a12] border border-blue-500/20 hover:border-blue-400/40 shadow-xl transition-all duration-300 hover:shadow-blue-500/10 cursor-pointer p-5"
      >
        {/* Top Header: Provider Info & Tags */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center font-bold text-blue-400 text-sm overflow-hidden shrink-0">
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
                <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition">
                  {post.businessName}
                </h3>
                {post.isShowcaseActive && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Öne Çıkan
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <span>📍</span>
                <span>{post.cityName}</span>
                {post.districtName && <span>• {post.districtName}</span>}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-400/20">
              İşiCepte Usta
            </span>
          </div>
        </div>

        {/* Media (Image) */}
        {post.postImageUrl ? (
          <div className="relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden bg-slate-950/80 border border-white/5 mb-4 group-hover:brightness-105 transition">
            <img
              src={post.postImageUrl}
              alt={post.postTitle}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-slate-200">
              <span className="font-semibold bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                🔧 Gerçek Servis Kaydı
              </span>
              {post.rating && (
                <span className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 text-amber-400 font-bold">
                  ⭐ {post.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-40 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-col items-center justify-center text-slate-500 mb-4">
            <span className="text-3xl mb-1">🛠️</span>
            <span className="text-xs">Servis ve Bakım Paylaşımı</span>
          </div>
        )}

        {/* Post Title & Description Preview */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h4 className="text-base font-bold text-white mb-1.5 line-clamp-1 group-hover:text-blue-300 transition">
              {post.postTitle}
            </h4>
            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-4">
              {post.postDescription}
            </p>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              İşiCepte onaylı servis kaydı
            </span>
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/30 transition flex items-center gap-1.5"
            >
              <span>İncele</span>
              <span>➔</span>
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <IsiCeptePostDetailModal
        post={post}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
