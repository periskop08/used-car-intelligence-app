"use client";

import React, { useEffect, useState } from "react";
import {
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  Star,
  UserCheck,
  ThumbsUp,
  X,
  Check,
} from "lucide-react";

export default function AdminResearchCommentsPage() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState<{
    variants: any[];
    summary: {
      totalPending: number;
      totalApproved: number;
      totalRejected: number;
      totalComments: number;
    };
  }>({
    variants: [],
    summary: { totalPending: 0, totalApproved: 0, totalRejected: 0, totalComments: 0 },
  });

  const [search, setSearch] = useState("");
  const [mainFilter, setMainFilter] = useState<"PENDING_ONLY" | "WITH_COMMENTS" | "ALL">("PENDING_ONLY");

  // Modal / Drawer State
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [variantReviewsData, setVariantReviewsData] = useState<{
    variant: any;
    reviews: any[];
  } | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [modalStatusFilter, setModalStatusFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  const getAuthToken = () => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("accessToken") || localStorage.getItem("token") || "";
  };

  const fetchOverview = async (overrideToken?: string) => {
    const authToken = overrideToken || token || getAuthToken();
    if (!authToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/vehicle-reviews/overview`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOverviewData(data);
      } else {
        console.error("Failed to fetch overview, status:", res.status);
      }
    } catch (err) {
      console.error("fetchOverview error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = getAuthToken();
    setToken(savedToken);
    fetchOverview(savedToken);
  }, []);

  const openVariantReviewsModal = async (
    variant: any,
    initialFilter: "PENDING" | "APPROVED" | "REJECTED" | "ALL" = "PENDING"
  ) => {
    setSelectedVariant(variant);
    setModalStatusFilter(initialFilter);
    fetchVariantReviews(variant.id, initialFilter);
  };

  const fetchVariantReviews = async (variantId: string, filter: string, overrideToken?: string) => {
    const authToken = overrideToken || token || getAuthToken();
    if (!authToken) return;
    setDrawerLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filter && filter !== "ALL") queryParams.append("status", filter);

      const res = await fetch(`${API_URL}/admin/vehicle-reviews/variant/${variantId}?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVariantReviewsData(data);
      } else {
        console.error("Failed to fetch variant reviews, status:", res.status);
      }
    } catch (err) {
      console.error("fetchVariantReviews error:", err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleModerateReview = async (reviewId: string, status: "APPROVED" | "REJECTED") => {
    const authToken = token || getAuthToken();
    setActionLoadingId(reviewId);
    try {
      const res = await fetch(`${API_URL}/admin/vehicle-reviews/${reviewId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const errObj = await res.json().catch(() => ({}));
        throw new Error(errObj.message || "İşlem başarısız.");
      }

      // Refresh drawer & overview
      if (selectedVariant) {
        await fetchVariantReviews(selectedVariant.id, modalStatusFilter, authToken);
      }
      await fetchOverview(authToken);
    } catch (err: any) {
      alert(err.message || "Hata oluştu.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredVariants = overviewData.variants.filter((v) => {
    // Main Tab Filter
    if (mainFilter === "PENDING_ONLY" && v.pendingCount === 0) return false;
    if (mainFilter === "WITH_COMMENTS" && v.totalCount === 0) return false;

    // Search Query Filter
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const title = `${v.brand} ${v.model} ${v.trimName || ""} ${v.engineName || ""}`.toLowerCase();
    return title.includes(q);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-slate-100 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-sky-400" />
            <span>Araç Sorgula Kullanıcı Yorumları</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Araç Sorgula (VehicleVariant) kayıtlarına gelen kullanıcı deneyim yorumlarının onay ve moderasyon paneli.
          </p>
        </div>
      </div>

      {/* GLOBAL SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Bekleyen Yorum
          </span>
          <span className="text-2xl font-black text-amber-400">{overviewData.summary.totalPending}</span>
        </div>

        <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" /> Onaylanan
          </span>
          <span className="text-2xl font-black text-emerald-400">{overviewData.summary.totalApproved}</span>
        </div>

        <div className="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> Reddedilen
          </span>
          <span className="text-2xl font-black text-rose-400">{overviewData.summary.totalRejected}</span>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/10 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Toplam Yorum</span>
          <span className="text-2xl font-black text-white">{overviewData.summary.totalComments}</span>
        </div>
      </div>

      {/* SEARCH AND MAIN TABS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Main Quick Filters */}
        <div className="p-1 bg-[#050714] border border-white/10 rounded-2xl flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMainFilter("PENDING_ONLY")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              mainFilter === "PENDING_ONLY"
                ? "bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ⏳ Bekleyen Yorumu Olan ({overviewData.variants.filter((v) => v.pendingCount > 0).length})
          </button>

          <button
            type="button"
            onClick={() => setMainFilter("WITH_COMMENTS")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              mainFilter === "WITH_COMMENTS"
                ? "bg-sky-500 text-slate-950 font-black shadow-lg shadow-sky-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            💬 Yorumu Olan Araçlar ({overviewData.variants.length})
          </button>

          <button
            type="button"
            onClick={() => setMainFilter("ALL")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              mainFilter === "ALL" ? "bg-slate-700 text-white font-black" : "text-slate-400 hover:text-white"
            }`}
          >
            Tümü
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 px-4 rounded-2xl bg-slate-900/40 border border-white/5 flex items-center gap-3 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Araç sorgula varyantı ara (Marka, Model, Trim...)"
            className="w-full bg-transparent border-none text-xs font-medium text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* VARIANTS WITH REVIEWS TABLE */}
      <div className="rounded-3xl bg-slate-900/60 border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#050714] text-slate-400 font-bold uppercase text-[10px] border-b border-white/10 tracking-wider">
              <tr>
                <th className="py-4 px-6">Araç Sorgula Kaydı (Varyant)</th>
                <th className="py-4 px-4 text-center">Bekleyen Yorum</th>
                <th className="py-4 px-4 text-center">Onaylanan</th>
                <th className="py-4 px-4 text-center">Reddedilen</th>
                <th className="py-4 px-4 text-center">Toplam</th>
                <th className="py-4 px-6 text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 animate-pulse">
                    Yorum yapılan araç varyantları yükleniyor...
                  </td>
                </tr>
              ) : filteredVariants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    {mainFilter === "PENDING_ONLY"
                      ? "Bekleyen kullanıcı yorumu bulunmuyor. Tüm yorumlar incelendi ve onaylandı!"
                      : "Arama kriterlerinize uygun araç sorgula yorumu bulunamadı."}
                  </td>
                </tr>
              ) : (
                filteredVariants.map((v) => (
                  <tr key={v.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3.5 px-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-black text-white text-sm">
                          {v.brand} {v.model} {v.trimName || ""}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {v.engineName || ""} • {v.fuelType || ""} • {v.transmission || ""} • {v.yearStart}-{v.yearEnd || "Günümüz"}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {v.pendingCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => openVariantReviewsModal(v, "PENDING")}
                          className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 font-black text-xs hover:scale-105 transition cursor-pointer animate-pulse"
                        >
                          ⏳ {v.pendingCount} Bekleyen
                        </button>
                      ) : (
                        <span className="text-slate-500 font-mono">0</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="text-emerald-400 font-bold">{v.approvedCount}</span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="text-rose-400 font-bold">{v.rejectedCount}</span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="text-slate-300 font-bold">{v.totalCount}</span>
                    </td>

                    <td className="py-3.5 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => openVariantReviewsModal(v, "ALL")}
                        className="px-4 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-xl font-bold text-xs transition inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Yorumları Gör</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL / DRAWER FOR SELECTED VARIANT REVIEWS */}
      {selectedVariant && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] bg-[#090d1a] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-[#050714] border-b border-white/10 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-white">
                  {selectedVariant.brand} {selectedVariant.model} {selectedVariant.trimName || ""} — Araç Sorgula Yorumları
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {selectedVariant.engineName || ""} • {selectedVariant.fuelType || ""} • {selectedVariant.transmission || ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedVariant(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Filter Sub-Tabs inside Modal */}
            <div className="p-4 bg-slate-900/40 border-b border-white/10 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setModalStatusFilter("PENDING");
                  fetchVariantReviews(selectedVariant.id, "PENDING");
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  modalStatusFilter === "PENDING"
                    ? "bg-amber-500 text-slate-950 font-black"
                    : "text-slate-400 hover:bg-white/5"
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> Bekleyen
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalStatusFilter("APPROVED");
                  fetchVariantReviews(selectedVariant.id, "APPROVED");
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  modalStatusFilter === "APPROVED"
                    ? "bg-emerald-500 text-white font-black"
                    : "text-slate-400 hover:bg-white/5"
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" /> Onaylanan
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalStatusFilter("REJECTED");
                  fetchVariantReviews(selectedVariant.id, "REJECTED");
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  modalStatusFilter === "REJECTED"
                    ? "bg-rose-500 text-white font-black"
                    : "text-slate-400 hover:bg-white/5"
                }`}
              >
                <XCircle className="w-3.5 h-3.5" /> Reddedilen
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalStatusFilter("ALL");
                  fetchVariantReviews(selectedVariant.id, "ALL");
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  modalStatusFilter === "ALL" ? "bg-slate-700 text-white font-black" : "text-slate-400 hover:bg-white/5"
                }`}
              >
                Tümü
              </button>
            </div>

            {/* Modal Body / Reviews List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {drawerLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs animate-pulse font-medium">
                  Araç yorumları yükleniyor...
                </div>
              ) : !variantReviewsData || variantReviewsData.reviews.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-medium">
                  Bu filtreye uygun araç sorgula yorumu bulunmamaktadır.
                </div>
              ) : (
                variantReviewsData.reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-5 rounded-2xl bg-[#050714] border border-white/10 flex flex-col gap-3"
                  >
                    {/* User info & Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{rev.displayName}</span>
                        {rev.customerNo && (
                          <span className="px-2 py-0.5 rounded bg-white/10 text-sky-400 text-[10px] font-mono font-bold">
                            {rev.customerNo}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">({rev.email})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {rev.status === "PENDING" && (
                          <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center gap-1">
                            <Clock className="w-3 h-3" /> BEKLEYEN
                          </span>
                        )}
                        {rev.status === "APPROVED" && (
                          <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> ONAYLANDI
                          </span>
                        )}
                        {rev.status === "REJECTED" && (
                          <span className="px-3 py-1 rounded-xl bg-rose-500/20 text-rose-400 font-bold text-[10px] flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> REDDEDİLDİ
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                      {rev.usageDuration > 0 && (
                        <span className="px-2.5 py-0.5 rounded-md bg-sky-500/10 text-sky-400">
                          {rev.usageDuration} Ay Kullanım
                        </span>
                      )}
                      {rev.isOwner && (
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" /> Araç Sahibi
                        </span>
                      )}
                      {rev.recommend && (
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" /> Tavsiye Ediyor
                        </span>
                      )}
                      <span className="text-slate-400 ml-auto font-mono">
                        {new Date(rev.createdAt).toLocaleString("tr-TR")}
                      </span>
                    </div>

                    {/* Comment text */}
                    <p className="text-xs leading-relaxed text-slate-200 font-medium whitespace-pre-wrap">
                      {rev.comment}
                    </p>

                    {/* 7 Star Ratings breakdown */}
                    {rev.rating && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 text-[10px] text-slate-400 font-bold">
                        <span className="text-amber-400 font-black">Genel: {rev.rating.overall} ⭐</span>
                        <span>• Güvenilirlik: {rev.rating.reliability}</span>
                        <span>• Yakıt: {rev.rating.fuelConsumption}</span>
                        <span>• Konfor: {rev.rating.comfort}</span>
                        <span>• Parça: {rev.rating.partCost}</span>
                        <span>• Bakım: {rev.rating.maintenanceCost}</span>
                        <span>• Satış: {rev.rating.resaleEase}</span>
                      </div>
                    )}

                    {/* Moderation Actions (If PENDING) */}
                    {rev.status === "PENDING" && (
                      <div className="flex items-center gap-3 pt-3 border-t border-white/5 justify-end">
                        <button
                          type="button"
                          disabled={actionLoadingId === rev.id}
                          onClick={() => handleModerateReview(rev.id, "REJECTED")}
                          className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-600/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-4 h-4" /> REDDET
                        </button>

                        <button
                          type="button"
                          disabled={actionLoadingId === rev.id}
                          onClick={() => handleModerateReview(rev.id, "APPROVED")}
                          className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" /> ONAYLA
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
