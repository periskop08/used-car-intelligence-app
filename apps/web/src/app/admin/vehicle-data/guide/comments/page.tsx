"use client";

import React, { useEffect, useState } from "react";
import {
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  ChevronRight,
  Eye,
  Star,
  UserCheck,
  ThumbsUp,
  AlertTriangle,
  X,
  Check,
} from "lucide-react";

export default function AdminGuideCommentsPage() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState<{
    cards: any[];
    summary: {
      totalPending: number;
      totalApproved: number;
      totalRejected: number;
      totalComments: number;
    };
  }>({
    cards: [],
    summary: { totalPending: 0, totalApproved: 0, totalRejected: 0, totalComments: 0 },
  });

  const [search, setSearch] = useState("");
  const [mainFilter, setMainFilter] = useState<"PENDING_ONLY" | "WITH_COMMENTS" | "ALL">("PENDING_ONLY");

  // Drawer / Modal State
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [cardCommentsData, setCardCommentsData] = useState<{
    guideCard: any;
    comments: any[];
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
      const res = await fetch(`${API_URL}/admin/vehicle-guide/comments/overview`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOverviewData(data);
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

  const openCardCommentsModal = async (card: any, initialFilter: "PENDING" | "APPROVED" | "REJECTED" | "ALL" = "PENDING") => {
    setSelectedCard(card);
    setModalStatusFilter(initialFilter);
    fetchCardComments(card.id, initialFilter);
  };

  const fetchCardComments = async (guideCardId: string, filter: string, overrideToken?: string) => {
    const authToken = overrideToken || token || getAuthToken();
    if (!authToken) return;
    setDrawerLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filter && filter !== "ALL") queryParams.append("status", filter);

      const res = await fetch(`${API_URL}/admin/vehicle-guide/comments/card/${guideCardId}?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCardCommentsData(data);
      }
    } catch (err) {
      console.error("fetchCardComments error:", err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleModerateComment = async (commentId: string, status: "APPROVED" | "REJECTED") => {
    const authToken = token || getAuthToken();
    let rejectionReason: string | undefined = undefined;
    if (status === "REJECTED") {
      const reasonInput = prompt("Lütfen reddetme sebebini yazın (Opsiyonel):");
      if (reasonInput === null) return; // User cancelled
      rejectionReason = reasonInput.trim() || undefined;
    }

    setActionLoadingId(commentId);
    try {
      const res = await fetch(`${API_URL}/admin/vehicle-guide/comments/${commentId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          rejectionReason,
        }),
      });

      if (!res.ok) {
        const errObj = await res.json().catch(() => ({}));
        throw new Error(errObj.message || "İşlem başarısız.");
      }

      // Refresh drawer & overview
      if (selectedCard) {
        await fetchCardComments(selectedCard.id, modalStatusFilter, authToken);
      }
      await fetchOverview(authToken);
    } catch (err: any) {
      alert(err.message || "Hata oluştu.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredCards = overviewData.cards.filter((c) => {
    // Main Tab Filter
    if (mainFilter === "PENDING_ONLY" && c.pendingCount === 0) return false;
    if (mainFilter === "WITH_COMMENTS" && c.totalCount === 0) return false;

    // Search Query Filter
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const title = `${c.brand} ${c.model} ${c.generationName || ""}`.toLowerCase();
    return title.includes(q);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-slate-100 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-orange-400" />
            <span>Araç Rehberi Kullanıcı Yorumları</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Araç Rehberi (VehicleGuideCard) kayıtlarına yazılan bağımsız kullanıcı yorumlarının moderasyonu.
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
            ⏳ Bekleyen Yorumu Olanlar ({overviewData.cards.filter((c) => c.pendingCount > 0).length})
          </button>

          <button
            type="button"
            onClick={() => setMainFilter("WITH_COMMENTS")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              mainFilter === "WITH_COMMENTS"
                ? "bg-orange-500 text-slate-950 font-black shadow-lg shadow-orange-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            💬 Yorumu Olanlar ({overviewData.cards.length})
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
            placeholder="Araç rehberi ara (Marka, Model, Kasa...)"
            className="w-full bg-transparent border-none text-xs font-medium text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* GUIDE CARDS TABLE */}
      <div className="rounded-3xl bg-slate-900/60 border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#050714] text-slate-400 font-bold uppercase text-[10px] border-b border-white/10 tracking-wider">
              <tr>
                <th className="py-4 px-6">Görsel</th>
                <th className="py-4 px-6">Araç Rehberi Kaydı</th>
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
                  <td colSpan={7} className="py-8 text-center text-slate-400 animate-pulse">
                    Rehber araçları yükleniyor...
                  </td>
                </tr>
              ) : filteredCards.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    {mainFilter === "PENDING_ONLY"
                      ? "Moderasyon bekleyen Araç Rehberi yorumu bulunmuyor."
                      : "Henüz Araç Rehberi kullanıcı yorumu bulunmuyor."}
                  </td>
                </tr>
              ) : (
                filteredCards.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-6">
                      <div className="w-16 h-10 rounded-xl overflow-hidden bg-slate-800 border border-white/10">
                        {c.heroImageUrl ? (
                          <img src={c.heroImageUrl} alt={c.model} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500 font-bold">
                            Görsel Yok
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-black text-white text-sm">
                          {c.brand} {c.model}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {c.generationName || c.generationCode || "Nesil Belirtilmedi"} • {c.yearStart} - {c.yearEnd || "Günümüz"}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {c.pendingCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => openCardCommentsModal(c, "PENDING")}
                          className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 font-black text-xs hover:scale-105 transition cursor-pointer animate-pulse"
                        >
                          ⏳ {c.pendingCount} Bekleyen
                        </button>
                      ) : (
                        <span className="text-slate-500 font-mono">0</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="text-emerald-400 font-bold">{c.approvedCount}</span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="text-rose-400 font-bold">{c.rejectedCount}</span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="text-slate-300 font-bold">{c.totalCount}</span>
                    </td>

                    <td className="py-3 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => openCardCommentsModal(c, "ALL")}
                        className="px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-xl font-bold text-xs transition inline-flex items-center gap-1.5 cursor-pointer"
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

      {/* MODAL / DRAWER FOR SELECTED GUIDE CARD COMMENTS */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] bg-[#090d1a] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-[#050714] border-b border-white/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {selectedCard.heroImageUrl && (
                  <img
                    src={selectedCard.heroImageUrl}
                    alt={selectedCard.model}
                    className="w-14 h-10 rounded-xl object-cover border border-white/10"
                  />
                )}
                <div>
                  <h3 className="text-base font-black text-white">
                    {selectedCard.brand} {selectedCard.model} — Kullanıcı Yorumları
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {selectedCard.yearStart} - {selectedCard.yearEnd || "Günümüz"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCard(null)}
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
                  fetchCardComments(selectedCard.id, "PENDING");
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
                  fetchCardComments(selectedCard.id, "APPROVED");
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
                  fetchCardComments(selectedCard.id, "REJECTED");
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
                  fetchCardComments(selectedCard.id, "ALL");
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  modalStatusFilter === "ALL" ? "bg-slate-700 text-white font-black" : "text-slate-400 hover:bg-white/5"
                }`}
              >
                Tümü
              </button>
            </div>

            {/* Modal Body / Comments List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {drawerLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs animate-pulse font-medium">
                  Yorumlar yükleniyor...
                </div>
              ) : !cardCommentsData || cardCommentsData.comments.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-medium">
                  Bu filtreye uygun yorum bulunmamaktadır.
                </div>
              ) : (
                cardCommentsData.comments.map((cm) => (
                  <div
                    key={cm.id}
                    className="p-5 rounded-2xl bg-[#050714] border border-white/10 flex flex-col gap-3"
                  >
                    {/* User info & Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{cm.displayName}</span>
                        {cm.customerNo && (
                          <span className="px-2 py-0.5 rounded bg-white/10 text-orange-400 text-[10px] font-mono font-bold">
                            {cm.customerNo}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">({cm.email})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {cm.status === "PENDING" && (
                          <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center gap-1">
                            <Clock className="w-3 h-3" /> BEKLEYEN
                          </span>
                        )}
                        {cm.status === "APPROVED" && (
                          <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> ONAYLANDI
                          </span>
                        )}
                        {cm.status === "REJECTED" && (
                          <span className="px-3 py-1 rounded-xl bg-rose-500/20 text-rose-400 font-bold text-[10px] flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> REDDEDİLDİ
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                      {cm.usageMonths > 0 && (
                        <span className="px-2.5 py-0.5 rounded-md bg-orange-500/10 text-orange-400">
                          {cm.usageMonths} Ay Kullanım
                        </span>
                      )}
                      {cm.isOwner && (
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400">
                          ✓ Araç Sahibi
                        </span>
                      )}
                      {cm.recommends && (
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400">
                          ✓ Tavsiye Ediyor
                        </span>
                      )}
                      <span className="text-slate-400 ml-auto font-mono">
                        {new Date(cm.createdAt).toLocaleString("tr-TR")}
                      </span>
                    </div>

                    {/* Comment text */}
                    <p className="text-xs leading-relaxed text-slate-200 font-medium whitespace-pre-wrap">
                      {cm.comment}
                    </p>

                    {/* Ratings */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 text-[10px] text-slate-400 font-bold">
                      <span className="text-amber-400 font-black">Genel: {cm.overallRating} ⭐</span>
                      <span>• Güvenilirlik: {cm.reliabilityRating}</span>
                      <span>• Yakıt: {cm.fuelRating}</span>
                      <span>• Konfor: {cm.comfortRating}</span>
                      <span>• Parça: {cm.partsRating}</span>
                      <span>• Bakım: {cm.maintenanceRating}</span>
                      <span>• Satış: {cm.resaleRating}</span>
                    </div>

                    {/* Moderation Actions (If PENDING) */}
                    {cm.status === "PENDING" && (
                      <div className="flex items-center gap-3 pt-3 border-t border-white/5 justify-end">
                        <button
                          type="button"
                          disabled={actionLoadingId === cm.id}
                          onClick={() => handleModerateComment(cm.id, "REJECTED")}
                          className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-600/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-4 h-4" /> REDDET
                        </button>

                        <button
                          type="button"
                          disabled={actionLoadingId === cm.id}
                          onClick={() => handleModerateComment(cm.id, "APPROVED")}
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
