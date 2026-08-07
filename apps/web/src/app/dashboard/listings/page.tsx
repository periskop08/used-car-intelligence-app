"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import UrgentListingBadge from "@/components/listings/UrgentListingBadge";
import ListingPromotionsManagement from "@/components/listings/ListingPromotionsManagement";

interface ConfirmModalState {
  isOpen: boolean;
  listingId: string;
  listingTitle: string;
  targetStatus: string;
  title: string;
  message: string;
  confirmBtnText: string;
  confirmBtnClass: string;
}

const translateFuelType = (fuel: string) => {
  if (!fuel) return "-";
  const mapping: Record<string, string> = {
    PETROL: "Benzin",
    DIESEL: "Dizel",
    LPG: "LPG",
    HYBRID: "Hibrit",
    PLUG_IN_HYBRID: "Plug-in Hibrit",
    ELECTRIC: "Elektrik",
    OTHER: "Diğer"
  };
  return mapping[fuel.toUpperCase()] || fuel;
};

const translateTransmission = (trans: string) => {
  if (!trans) return "-";
  const mapping: Record<string, string> = {
    MANUAL: "Manuel",
    AUTOMATIC: "Otomatik",
    SEMI_AUTOMATIC: "Yarı Otomatik"
  };
  return mapping[trans.toUpperCase()] || trans;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function SellerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "past" ? "past" : "active";

  // Data states
  const [activeTab, setActiveTab] = useState<"active" | "past">(initialTab);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [quota, setQuota] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [expandedLeads, setExpandedLeads] = useState<Record<string, boolean>>({});
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [promotionModalListing, setPromotionModalListing] = useState<any | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "past") setActiveTab("past");
    else if (tabParam === "active") setActiveTab("active");
  }, [searchParams]);

  const requestStatusChange = (listing: any, targetStatus: string) => {
    if (targetStatus === "PASSIVE") {
      setConfirmModal({
        isOpen: true,
        listingId: listing.id,
        listingTitle: listing.title,
        targetStatus: "PASSIVE",
        title: "⏸️ İlanı Pasife Al",
        message: `"${listing.title}" başlıklı ilanınızı pasife almak istediğinize emin misiniz? İlanınız geçici olarak arama sonuçlarından ve yayından kaldırılacaktır.`,
        confirmBtnText: "Evet, Pasife Al",
        confirmBtnClass: "bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer",
      });
    } else if (targetStatus === "SOLD") {
      setConfirmModal({
        isOpen: true,
        listingId: listing.id,
        listingTitle: listing.title,
        targetStatus: "SOLD",
        title: "🤝 İlanı Satıldı Olarak İşaretle",
        message: `"${listing.title}" başlıklı ilanınızı Satıldı olarak işaretlemek istediğinize emin misiniz? İlanınız yayından kaldırılacak ve "Geçmiş İlanlarım" sekmesine aktarılacaktır.`,
        confirmBtnText: "Evet, Satıldı İşaretle",
        confirmBtnClass: "bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer",
      });
    } else if (targetStatus === "ACTIVE") {
      setConfirmModal({
        isOpen: true,
        listingId: listing.id,
        listingTitle: listing.title,
        targetStatus: "ACTIVE",
        title: "🟢 İlanı Tekrar Yayına Al",
        message: `"${listing.title}" başlıklı ilanınızı tekrar aktif olarak yayına almak istediğinize emin misiniz?`,
        confirmBtnText: "Evet, Tekrar Yayına Al",
        confirmBtnClass: "bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer",
      });
    } else {
      handleStatusChange(listing.id, targetStatus);
    }
  };

  const refreshListings = () => {
    const activeToken = token || localStorage.getItem("accessToken");
    if (!activeToken) return;
    Promise.all([
      fetch(`${API_URL}/me/listings`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      }).then((res) => res.json()),
      fetch(`${API_URL}/me/listing-quota`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      }).then((res) => res.json()),
    ])
      .then(([listingsData, quotaData]) => {
        setListings(Array.isArray(listingsData) ? listingsData : []);
        setQuota(quotaData);
      })
      .catch((err) => console.error("Error refreshing listings:", err));
  };
  useEffect(() => {
    const savedToken = localStorage.getItem("accessToken");
    if (!savedToken) {
      router.push("/login?redirect=/dashboard/listings");
      return;
    }
    setToken(savedToken);

    // Fetch user listings & quota
    Promise.all([
      fetch(`${API_URL}/me/listings`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      }).then((res) => res.json()),
      fetch(`${API_URL}/me/listing-quota`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      }).then((res) => res.json()),
    ])
      .then(([listingsData, quotaData]) => {
        setListings(Array.isArray(listingsData) ? listingsData : []);
        setQuota(quotaData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard load failed:", err);
        setLoading(false);
      });
  }, []);

  const handleRenew = (listingId: string) => {
    setActionError("");
    setActionSuccess("");

    fetch(`${API_URL}/listings/${listingId}/renew`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.message || "İlan yenilenemedi.");
          });
        }
        return res.json();
      })
      .then(() => {
        setActionSuccess("İlanınız başarıyla tekrar aktif edildi!");
        // Refresh page data
        return Promise.all([
          fetch(`${API_URL}/me/listings`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => res.json()),
          fetch(`${API_URL}/me/listing-quota`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => res.json()),
        ]);
      })
      .then(([listingsData, quotaData]) => {
        setListings(listingsData);
        setQuota(quotaData);
      })
      .catch((err) => {
        setActionError(err.message);
      });
  };

  const handleStatusChange = (listingId: string, newStatus: string) => {
    setActionError("");
    setActionSuccess("");

    fetch(`${API_URL}/listings/${listingId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.message || "İlan durumu güncellenemedi.");
          });
        }
        return res.json();
      })
      .then(() => {
        setActionSuccess("İlan durumu başarıyla güncellendi!");
        // Refresh page data
        return Promise.all([
          fetch(`${API_URL}/me/listings`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => res.json()),
          fetch(`${API_URL}/me/listing-quota`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => res.json()),
        ]);
      })
      .then(([listingsData, quotaData]) => {
        setListings(listingsData);
        setQuota(quotaData);
      })
      .catch((err) => {
        setActionError(err.message);
      });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  };

  const getRemainingDays = (targetDateString?: string) => {
    if (!targetDateString) return 0;
    const diffTime = new Date(targetDateString).getTime() - Date.now();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const handleSendReply = (listingId: string, leadId: string) => {
    const textToSend = replyTexts[leadId];
    if (!textToSend) return;

    setActionError("");
    setActionSuccess("");

    fetch(`${API_URL}/listings/${listingId}/leads/${leadId}/reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ replyMessage: textToSend }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((err) => { throw new Error(err.message); });
        return res.json();
      })
      .then(() => {
        setActionSuccess("Mesaj yanıtınız başarıyla kaydedildi!");
        setReplyTexts(prev => ({ ...prev, [leadId]: "" }));
        return Promise.all([
          fetch(`${API_URL}/me/listings`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => res.json()),
          fetch(`${API_URL}/me/listing-quota`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((res) => res.json()),
        ]);
      })
      .then(([listingsData, quotaData]) => {
        setListings(listingsData);
        setQuota(quotaData);
      })
      .catch((err) => {
        setActionError(err.message);
      });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <span className="animate-spin text-4xl">⏳</span>
        <span className="text-slate-400 font-bold text-base">Dashboard yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-12 flex flex-col gap-10">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-200 tracking-tight">
            {activeTab === "past" ? "📜 Geçmiş İlanlarım" : "Satıcı Paneli"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {activeTab === "past"
              ? "Satıldı veya süresi doldu olarak işaretlenmiş geçmiş araç ilanlarınız."
              : "İlanlarınızı, yayın durumlarını ve aktif kota haklarınızı yönetin."}
          </p>
        </div>
        <button
          onClick={() => router.push("/listings/create")}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-6 rounded-2xl transition text-sm shadow-lg shadow-orange-500/10"
        >
          ➕ Yeni İlan Ekle
        </button>
      </div>

      {actionError && <p className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">{actionError}</p>}
      {actionSuccess && <p className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">{actionSuccess}</p>}

      {/* Quota Summary & Package Info Card */}
      {quota && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-900/20 border border-white/5 rounded-3xl">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-black uppercase">Aktif Paket</span>
            <span className="text-xl font-black text-orange-400 mt-0.5">{quota.tier} Paket</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-black uppercase">Kullanılan İlan Kotası</span>
            <span className="text-xl font-black text-slate-200 mt-0.5">{quota.activeCount} / {quota.limit} İlan</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-black uppercase">Kalan İlan Hakkı</span>
            <span className="text-xl font-black text-emerald-400 mt-0.5">{quota.remaining} İlan</span>
          </div>
        </div>
      )}

      {/* Listings list with Tabs */}
      <div className="flex flex-col gap-5">
        {/* Tabs */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-3 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setActiveTab("active");
              router.push("/dashboard/listings");
            }}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === "active"
                ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20"
                : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-850 border border-white/5"
            }`}
          >
            <span>🚗</span> Yayındaki & Aktif İlanlarım
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === "active" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
            }`}>
              {listings.filter((l) => l.status !== "SOLD" && l.status !== "EXPIRED").length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("past");
              router.push("/dashboard/listings?tab=past");
            }}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === "past"
                ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20"
                : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-850 border border-white/5"
            }`}
          >
            <span>📜</span> Geçmiş İlanlarım (Satılan & Doldu)
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === "past" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
            }`}>
              {listings.filter((l) => l.status === "SOLD" || l.status === "EXPIRED").length}
            </span>
          </button>
        </div>

        {(() => {
          const displayedListings = activeTab === "active"
            ? listings.filter((l) => l.status !== "SOLD" && l.status !== "EXPIRED")
            : listings.filter((l) => l.status === "SOLD" || l.status === "EXPIRED");

          if (displayedListings.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-white/10 rounded-3xl bg-slate-950/5">
                <span className="text-4xl">{activeTab === "active" ? "🚗" : "📜"}</span>
                <span className="text-slate-300 font-bold text-sm">
                  {activeTab === "active"
                    ? "Henüz aktif bir ilanınız bulunmamaktadır."
                    : "Geçmişte satılan veya süresi dolan ilanınız bulunmamaktadır."}
                </span>
                {activeTab === "active" && (
                  <button
                    onClick={() => router.push("/listings/create")}
                    className="text-xs text-orange-500 font-bold hover:underline mt-1"
                  >
                    Hemen yeni ilan ekleyin
                  </button>
                )}
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 gap-4">
              {displayedListings.map((listing) => {
                const coverImg = listing.media && listing.media[0] ? listing.media[0].url : "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&auto=format&fit=crop&q=60";
                const remDays = getRemainingDays(listing.expiresAt);
                const passiveRemDays = getRemainingDays(listing.passiveUntil);

                return (
                  <div key={listing.id} className="flex flex-col p-6 bg-slate-900/40 border border-white/5 rounded-3xl gap-4 hover:border-white/10 transition">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* Cover Photo */}
                        <div className="w-24 aspect-[4/3] rounded-xl overflow-hidden bg-slate-950 border border-white/10 flex-shrink-0">
                          <img src={coverImg} alt={listing.title} className="w-full h-full object-cover" />
                        </div>

                        {/* Listing Summary Info */}
                        <div className="flex flex-col text-center md:text-left gap-1">
                          <div className="flex items-center justify-center md:justify-start gap-2">
                            <h4 className="font-extrabold text-slate-200 text-sm line-clamp-1">{listing.title}</h4>
                            {listing.isUrgent && <UrgentListingBadge size="small" animated />}
                            <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${
                              listing.status === "ACTIVE"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : listing.status === "PENDING_REVIEW"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : listing.status === "PASSIVE"
                                ? "bg-slate-800 text-slate-400"
                                : listing.status === "SOLD"
                                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                : "bg-red-500/20 text-red-400 border border-red-500/30"
                            }`}>
                              {listing.status === "SOLD" ? "🤝 SATILDI" : listing.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium flex-wrap">
                            <span>{listing.modelYear} • {listing.kilometers.toLocaleString('tr-TR')} km • {listing.city}</span>
                            <span className="inline-flex items-center gap-1 font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full text-[10px]">
                              ❤️ {listing.favoriteCount || 0} Favoriye Eklendi
                            </span>
                          </div>

                          {/* Dynamic Duration Badges */}
                          <div className="mt-2 text-xs flex flex-col gap-0.5">
                            {listing.status === "ACTIVE" && (
                              <span className="text-emerald-400 font-bold">
                                🟢 Yayında • Kalan süre: {remDays} gün (Bitiş: {formatDate(listing.expiresAt)})
                              </span>
                            )}
                            {listing.status === "SOLD" && (
                              <span className="text-purple-400 font-bold">
                                🤝 Bu araç satıldı olarak işaretlenmiştir. İlanınız yayından kaldırılmıştır.
                              </span>
                            )}
                            {listing.status === "PASSIVE" && (
                              <div className="flex flex-col gap-1.5 mt-1">
                                <span className="text-slate-400 font-medium">
                                  ⚪ Pasifte • Yenilemek için kalan süre: {passiveRemDays} gün (Son gün: {formatDate(listing.passiveUntil)})
                                </span>
                                <button
                                  onClick={() => handleRenew(listing.id)}
                                  className="w-fit bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1 px-3 rounded-lg text-[10px] transition"
                                >
                                  Tekrar Yayına Al (Yenile)
                                </button>
                              </div>
                            )}
                            {listing.status === "EXPIRED" && (
                              <span className="text-red-400 font-bold">
                                🔴 Süresi doldu • Yeniden yayınlamak için tekrar yayınlama akışını başlatın.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions Column */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => router.push(`/listings/${listing.id}`)}
                          className="text-xs font-bold px-4 py-2 rounded-xl bg-slate-850 border border-white/5 text-slate-300 hover:bg-white/5 transition"
                        >
                          İlanı Gör
                        </button>
                        <button
                          onClick={() => router.push(`/listings/${listing.id}/edit`)}
                          className="text-xs font-bold px-4 py-2 rounded-xl bg-orange-600/10 border border-orange-500/20 text-orange-400 hover:bg-orange-600/20 transition"
                        >
                          Düzenle
                        </button>
                        {listing.status === "ACTIVE" && (
                          <button
                            type="button"
                            onClick={() => setPromotionModalListing(listing)}
                            className="text-xs font-black px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white transition shadow-lg shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer"
                          >
                            🚀 Öne Çıkar
                          </button>
                        )}
                        {(listing.status === "DRAFT" || listing.status === "REJECTED") && (
                          <button
                            onClick={() => handleStatusChange(listing.id, "PENDING_REVIEW")}
                            className="text-xs font-bold px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white transition"
                          >
                            Yayınla
                          </button>
                        )}
                        {listing.status === "ACTIVE" && (
                          <button
                            onClick={() => requestStatusChange(listing, "PASSIVE")}
                            className="text-xs font-bold px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-750 transition"
                          >
                            Pasife Al
                          </button>
                        )}
                        {listing.status === "ACTIVE" && (
                          <button
                            onClick={() => requestStatusChange(listing, "SOLD")}
                            className="text-xs font-bold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition"
                          >
                            Satıldı İşaretle
                          </button>
                        )}
                        {listing.status === "SOLD" && (
                          <button
                            onClick={() => requestStatusChange(listing, "ACTIVE")}
                            className="text-xs font-black px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white transition shadow-lg shadow-orange-600/20 cursor-pointer"
                          >
                            ↩️ Tekrar Yayına Al (Satılmadı)
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Leads Dropdown Section */}
                    {expandedLeads[listing.id] && listing.leads && listing.leads.length > 0 && (
                      <div className="mt-4 border-t border-white/5 pt-4 flex flex-col gap-3">
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">İlanınıza Gelen İletişim Talepleri</span>
                        <div className="grid grid-cols-1 gap-3">
                          {listing.leads.map((lead: any) => (
                            <div key={lead.id} className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl flex flex-col gap-2 text-xs">
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                <span>Müşteri: <strong className="text-slate-200">{lead.buyerName}</strong></span>
                                <span>Tarih: {formatDate(lead.createdAt)}</span>
                              </div>
                              <div className="flex flex-wrap gap-x-6 gap-y-1 text-[10px] text-slate-450 border-b border-white/5 pb-2">
                                <span>Telefon: <a href={`tel:${lead.buyerPhone}`} className="text-orange-400 hover:underline">{lead.buyerPhone}</a></span>
                                <span>E-posta: <a href={`mailto:${lead.buyerEmail}`} className="text-orange-400 hover:underline">{lead.buyerEmail}</a></span>
                              </div>
                              <p className="text-slate-300 italic leading-relaxed whitespace-pre-wrap">
                                "{lead.message}"
                              </p>
                              
                              {lead.replyMessage ? (
                                <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col gap-1 text-[11px]">
                                  <span className="font-bold text-emerald-400">🟢 Yanıtınız:</span>
                                  <p className="text-slate-200">{lead.replyMessage}</p>
                                  <span className="text-[9px] text-slate-500 text-right mt-1">{formatDate(lead.repliedAt)}</span>
                                </div>
                              ) : (
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSendReply(listing.id, lead.id);
                                  }}
                                  className="mt-3 flex gap-2"
                                >
                                  <input
                                    type="text"
                                    placeholder="Müşteriye yanıt yazın..."
                                    value={replyTexts[lead.id] || ""}
                                    required
                                    onChange={(e) => setReplyTexts(prev => ({ ...prev, [lead.id]: e.target.value }))}
                                    className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-250 outline-none focus:border-orange-500 transition"
                                  />
                                  <button
                                    type="submit"
                                    className="bg-orange-650 hover:bg-orange-600 text-white font-bold px-4 py-1.5 rounded-xl text-xs transition"
                                  >
                                    Cevapla
                                  </button>
                                </form>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Promotion Management Modal */}
      {promotionModalListing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-[#0b0f19] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-orange-400 tracking-wider">İlan Promosyon Yönetimi</span>
                <h3 className="text-lg font-black text-white mt-0.5">{promotionModalListing.title}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {promotionModalListing.modelYear} • {promotionModalListing.kilometers?.toLocaleString('tr-TR')} km • {promotionModalListing.city}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPromotionModalListing(null)}
                className="w-8 h-8 rounded-full bg-slate-900 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Promotion Cards Component */}
            <ListingPromotionsManagement
              listingId={promotionModalListing.id}
              token={token}
              onSuccess={() => {
                setActionSuccess("Promosyon ilanınıza başarıyla uygulandı!");
                refreshListings();
              }}
            />
          </div>
        </div>
      )}

      {/* Status Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#0b0f19] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">{confirmModal.title}</h3>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {confirmModal.message}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/5 transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  const { listingId, targetStatus } = confirmModal;
                  setConfirmModal(null);
                  handleStatusChange(listingId, targetStatus);
                }}
                className={confirmModal.confirmBtnClass}
              >
                {confirmModal.confirmBtnText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SellerDashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-32 text-slate-400 text-xs font-bold">Dashboard Yükleniyor...</div>}>
      <SellerDashboardContent />
    </Suspense>
  );
}
