"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function AdminClubReportsPage() {
  const searchParams = useSearchParams();
  const sectionFilter = searchParams.get("section") || "ENGAGEMENT";
  const rangeFilter = searchParams.get("range") || "30D";

  const [reportsData, setReportsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const res = await fetch(
        `${API_URL}/api/admin/club/reports?section=${sectionFilter}&range=${rangeFilter}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setReportsData(data);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [sectionFilter, rangeFilter]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-black text-white">Club Etkileşim ve Performans Raporları</h2>
        <p className="text-xs text-slate-400">
          Ziyaretçi, yorumcu, içerik performansı ve paket bazlı kullanım analizi.
        </p>
      </div>

      {/* Section Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          {[
            { key: "ENGAGEMENT", label: "Etkileşim" },
            { key: "MODERATION", label: "Moderasyon" },
            { key: "CONTENT", label: "İçerik Performansı" },
            { key: "PACKAGE_USAGE", label: "Paket Kullanımı" },
          ].map((sec) => (
            <Link
              key={sec.key}
              href={`/admin/club/reports?section=${sec.key}&range=${rangeFilter}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                sectionFilter === sec.key
                  ? "bg-orange-500 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {sec.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {["7D", "30D"].map((r) => (
            <Link
              key={r}
              href={`/admin/club/reports?section=${sectionFilter}&range=${r}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                rangeFilter === r
                  ? "bg-white/20 text-white border border-white/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {r === "7D" ? "Son 7 Gün" : "Son 30 Gün"}
            </Link>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500 mx-auto mb-3"></div>
          <p className="text-xs font-bold">Rapor Verileri Yükleniyor...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/60">
            <span className="text-xs font-bold text-slate-400 block mb-1">Tahmini Ziyaretçi</span>
            <span className="text-3xl font-black text-white">
              {reportsData?.metrics?.totalVisitors?.toLocaleString("tr-TR") || 0}
            </span>
          </div>

          <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/60">
            <span className="text-xs font-bold text-slate-400 block mb-1">Tekil Yorumcu</span>
            <span className="text-3xl font-black text-emerald-400">
              {reportsData?.metrics?.uniqueCommenters?.toLocaleString("tr-TR") || 0}
            </span>
          </div>

          <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/60">
            <span className="text-xs font-bold text-slate-400 block mb-1">Toplam Yorum</span>
            <span className="text-3xl font-black text-orange-400">
              {reportsData?.metrics?.totalComments?.toLocaleString("tr-TR") || 0}
            </span>
          </div>

          <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/60">
            <span className="text-xs font-bold text-slate-400 block mb-1">Gönderi Başı Ort. Yorum</span>
            <span className="text-3xl font-black text-blue-400">
              {reportsData?.metrics?.avgCommentsPerPost || 0}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
