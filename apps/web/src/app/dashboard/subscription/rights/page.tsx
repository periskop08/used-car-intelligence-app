"use client";

import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function RightsPage() {
  const [quota, setQuota] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    Promise.all([
      fetch(`${API_URL}/me/listing-quota`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
      fetch(`${API_URL}/me/listings`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
    ])
      .then(([quotaData, listingsData]) => {
        setQuota(quotaData);
        setListings(Array.isArray(listingsData) ? listingsData : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const limit = quota?.limit || 1;
  const activeCount = quota?.activeCount || 0;
  const remaining = quota?.remaining || 0;
  const passiveCount = listings.filter((l) => l.status === "PASSIVE" || l.status === "DEACTIVATED").length;

  const usagePercent = Math.min(100, Math.round((activeCount / limit) * 100));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Paket Haklarım</h1>
        <p className="text-slate-400 text-xs">Mevcut paketinizin kullanım limitlerini ve istatistiklerini takip edin.</p>
      </div>

      <div className="glass border border-white/5 rounded-3xl bg-[#090d1a]/45 backdrop-blur-md p-6 space-y-8">
        {/* Graphical progress bar */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-slate-300">
            <span>Aktif İlan Kullanım Oranı</span>
            <span className="text-orange-400">{activeCount} / {limit} İlan ({usagePercent}%)</span>
          </div>
          <div className="w-full bg-[#05070f] h-3.5 rounded-full overflow-hidden border border-white/5 p-0.5">
            <div
              className="bg-gradient-to-r from-orange-600 to-orange-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>

        {/* Detailed stats grids */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-white/5">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mevcut Paket</span>
            <div className="text-sm font-black text-slate-200">{quota?.tier || "FREE"}</div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Kalan İlan Hakkı</span>
            <div className="text-sm font-black text-green-400">{remaining} İlan</div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Aktif İlan Sayısı</span>
            <div className="text-sm font-black text-slate-200">{activeCount} İlan</div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pasif İlan Sayısı</span>
            <div className="text-sm font-black text-slate-400">{passiveCount} İlan</div>
          </div>
        </div>

        {/* Listing durations */}
        <div className="border-t border-white/5 pt-6 space-y-4">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Süre Limitleri</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5 text-xs font-bold text-slate-300">
              <span>İlanın Yayında Kalma Süresi</span>
              <span className="text-slate-200">
                {quota?.tier === "PREMIUM" ? "45 Gün" : "30 Gün"}
              </span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5 text-xs font-bold text-slate-300">
              <span>Pasif İlanın Saklanma Süresi</span>
              <span className="text-slate-200">15 Gün</span>
            </div>
          </div>
        </div>

        {quota?.tier !== "PREMIUM" && (
          <div className="border-t border-white/5 pt-6 flex justify-end">
            <a
              href="/#packages"
              className="px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-orange-500/10"
            >
              Limitlerimi Yükselt
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
