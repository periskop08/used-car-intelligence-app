"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import UrgentListingBadge from "@/components/listings/UrgentListingBadge";
import ListingPromotionsManagement from "@/components/listings/ListingPromotionsManagement";
import { AlertCircle, Trash2, X, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";

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

interface PublishWarningModalState {
  isOpen: boolean;
  title: string;
  message: string;
  actionUrl: string;
  actionText: string;
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

  const getInitialTab = (): "active" | "correction" | "past" => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "past") return "past";
    if (tabParam === "correction") return "correction";
    return "active";
  };

  // Data states
  const [activeTab, setActiveTab] = useState<"active" | "correction" | "past">(getInitialTab());
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const [publishWarningModal, setPublishWarningModal] = useState<PublishWarningModalState | null>(null);
  const [deleteDraftModalListing, setDeleteDraftModalListing] = useState<any | null>(null);

  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [listings, setListings] = useState<any[]>([]);
  const [quota, setQuota] = useState<any>(null);
  const [hasUnreadCorrection, setHasUnreadCorrection] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [promotionModalListing, setPromotionModalListing] = useState<any | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "past") setActiveTab("past");
    else if (tabParam === "correction") setActiveTab("correction");
    else if (tabParam === "active") setActiveTab("active");
  }, [searchParams]);

  const refreshListings = () => {
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("accessToken") || "" : "");
    if (!activeToken) return;
    Promise.all([
      fetch(`${API_URL}/me/listings`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      }).then((res) => res.json()),
      fetch(`${API_URL}/me/listing-quota`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      }).then((res) => res.json()),
      fetch(`${API_URL}/me/messages`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      }).then((res) => res.ok ? res.json() : []).catch(() => []),
    ])
      .then(([listingsData, quotaData, messagesData]) => {
        setListings(Array.isArray(listingsData) ? listingsData : []);
        setQuota(quotaData);

        // Check if there are unread correction notifications
        if (Array.isArray(messagesData)) {
          const unread = messagesData.some(
            (m: any) => m.subject?.includes("düzeltme") && (!m.isRead && m.isRead !== true)
          );
          setHasUnreadCorrection(unread);
        }
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

    // Fetch user listings & quota & messages
    Promise.all([
      fetch(`${API_URL}/me/listings`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      }).then((res) => res.json()),
      fetch(`${API_URL}/me/listing-quota`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      }).then((res) => res.json()),
      fetch(`${API_URL}/me/messages`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      }).then((res) => res.ok ? res.json() : []).catch(() => []),
    ])
      .then(([listingsData, quotaData, messagesData]) => {
        setListings(Array.isArray(listingsData) ? listingsData : []);
        setQuota(quotaData);
        if (Array.isArray(messagesData)) {
          const unread = messagesData.some(
            (m: any) => m.subject?.includes("düzeltme") && (!m.isRead && m.isRead !== true)
          );
          setHasUnreadCorrection(unread);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard load failed:", err);
        setLoading(false);
      });
  }, []);

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

  const handleStatusChange = (listingId: string, newStatus: string) => {
    setActionError("");
    setActionSuccess("");

    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("accessToken") || "" : "");
    if (!activeToken) {
      router.push("/login?redirect=/dashboard/listings");
      return;
    }

    setPublishingId(listingId);

    fetch(`${API_URL}/listings/${listingId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${activeToken}`,
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
        refreshListings();
      })
      .catch((err: any) => {
        const errorMsg = err.message || "İlan durumu güncellenemedi.";
        setActionError(errorMsg);

        // Open warning modal with exact reason & direct navigation action
        if (errorMsg.includes("görsel") || errorMsg.includes("fotoğraf") || errorMsg.includes("varyant")) {
          setPublishWarningModal({
            isOpen: true,
            title: "İlan İçeriği Eksik",
            message: `${errorMsg} İlanınızı yayınlayabilmek için eksik fotoğrafları veya araç verilerini tamamlamanız gerekmektedir.`,
            actionUrl: `/listings/${listingId}/edit`,
            actionText: "İlanı Düzenle & Fotoğraf Ekle",
          });
        } else if (errorMsg.includes("kota") || errorMsg.includes("paket")) {
          setPublishWarningModal({
            isOpen: true,
            title: "İlan Yayınlama Kotası Doldu",
            message: `${errorMsg} Yayınlama sınırınız dolmuştur. Paketinizi yükseltebilir veya mevcut aktif bir ilanınızı pasife alabilirsiniz.`,
            actionUrl: "/pricing",
            actionText: "Paketleri İncele",
          });
        } else {
          setPublishWarningModal({
            isOpen: true,
            title: "Yayınlama Uyarısı",
            message: errorMsg,
            actionUrl: `/listings/${listingId}/edit`,
            actionText: "İlan Detayını Düzenle",
          });
        }
      })
      .finally(() => {
        setPublishingId(null);
      });
  };

  const handleExecuteDeleteDraft = () => {
    if (!deleteDraftModalListing) return;
    const listingId = deleteDraftModalListing.id;
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("accessToken") || "" : "");
    if (!activeToken) return;

    setActionError("");
    setActionSuccess("");
    setDeletingId(listingId);

    fetch(`${API_URL}/listings/${listingId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${activeToken}` },
    })
      .then((res) => {
        if (!res.ok) {
          return fetch(`${API_URL}/listings/${listingId}/delete`, {
            method: "POST",
            headers: { Authorization: `Bearer ${activeToken}` },
          }).then((altRes) => {
            if (!altRes.ok) {
              return altRes.json().then((err) => {
                throw new Error(err.message || "Taslak ilan silinemedi.");
              });
            }
            return altRes.json();
          });
        }
        return res.json();
      })
      .then(() => {
        setActionSuccess("Taslak ilan silindi.");
        setDeleteDraftModalListing(null);
        refreshListings();
      })
      .catch((err: any) => {
        setActionError(err.message || "Taslak ilan silinemedi.");
      })
      .finally(() => {
        setDeletingId(null);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <span className="animate-spin text-4xl">⏳</span>
        <span className="text-slate-400 font-bold text-base font-sans">Dashboard yükleniyor...</span>
      </div>
    );
  }

  // Categorize Listings Strictly
  const correctionListings = listings.filter(
    (l) =>
      l.status === "REVISION_REQUIRED" ||
      (l.status === "PASSIVE" && !!l.rejectionReason) ||
      (l.status === "PENDING_REVIEW" && !!l.rejectionReason)
  );

  const activeListings = listings.filter(
    (l) =>
      ["ACTIVE", "DRAFT"].includes(l.status) ||
      (l.status === "PASSIVE" && !l.rejectionReason) ||
      (l.status === "PENDING_REVIEW" && !l.rejectionReason)
  );

  const pastListings = listings.filter((l) => ["SOLD", "EXPIRED", "REJECTED"].includes(l.status));

  const displayedListings =
    activeTab === "correction"
      ? correctionListings
      : activeTab === "past"
      ? pastListings
      : activeListings;

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-12 flex flex-col gap-10">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-200 tracking-tight">
            {activeTab === "past"
              ? "📜 Geçmiş İlanlarım"
              : activeTab === "correction"
              ? "⚠️ Düzeltme İstenen İlanlarım"
              : "Satıcı Paneli"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {activeTab === "past"
              ? "Satıldı veya süresi doldu olarak işaretlenmiş geçmiş araç ilanlarınız."
              : activeTab === "correction"
              ? "Moderasyon ekibi tarafından düzeltme talep edilen ve incelemedeki ilanlarınız."
              : "İlanlarınızı, yayın durumlarını ve aktif kota haklarınızı yönetin."}
          </p>
        </div>
        <button
          onClick={() => router.push("/listings/create")}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-6 rounded-2xl transition text-sm shadow-lg shadow-orange-500/10 cursor-pointer"
        >
          ➕ Yeni İlan Ekle
        </button>
      </div>

      {actionError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-between font-sans text-xs font-bold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError("")} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {actionSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-between font-sans text-xs font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess("")} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quota Summary & Package Info Card */}
      {quota && (() => {
        const usedCount = quota.usedActiveListings ?? quota.activeCount ?? 0;
        const maxCount = quota.maxActiveListings ?? quota.limit ?? 1;
        const remaining = Math.max(0, maxCount - usedCount);
        const percent = Math.min(100, Math.round((usedCount / maxCount) * 100));

        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-900/20 border border-white/5 rounded-3xl">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Mevcut Paketiniz</span>
              <span className="text-xl font-black text-orange-400">{quota.tierName || "Ücretsiz"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Aktif İlan Kullanımı</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-slate-200">
                  {usedCount} / {maxCount}
                </span>
                <span className="text-xs text-slate-400">
                  ({remaining} İlan Hakkınız Var)
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1 justify-center">
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percent}%`,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-white/5 pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab("active")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === "active"
              ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20"
              : "bg-slate-900/40 text-slate-400 border border-white/5 hover:text-slate-200"
          }`}
        >
          <span>🚀 Yayındaki & Aktif İlanlarım</span>
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black">
            {activeListings.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("correction");
            setHasUnreadCorrection(false);
          }}
          className={`relative flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === "correction"
              ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20"
              : "bg-slate-900/40 text-slate-400 border border-white/5 hover:text-slate-200"
          }`}
        >
          <span>⚠️ DÜZELTME İSTENEN İLANLAR</span>
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black">
            {correctionListings.length}
          </span>
          {hasUnreadCorrection && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 border-2 border-slate-950 rounded-full animate-ping" />
          )}
          {hasUnreadCorrection && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 border-2 border-slate-950 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("past")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === "past"
              ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20"
              : "bg-slate-900/40 text-slate-400 border border-white/5 hover:text-slate-200"
          }`}
        >
          <span>📜 Geçmiş İlanlarım (Satılan & Doldu)</span>
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black">
            {pastListings.length}
          </span>
        </button>
      </div>

      {/* Listings List */}
      {displayedListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-slate-900/10 border border-white/5 rounded-3xl gap-4 text-center font-sans">
          <span className="text-5xl">🚗</span>
          <h3 className="text-lg font-bold text-slate-300">
            {activeTab === "past"
              ? "Geçmiş ilanınız bulunmuyor"
              : activeTab === "correction"
              ? "Düzeltme istenen ilanınız bulunmuyor."
              : "Henüz yayınlanmış bir ilanınız yok"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm">
            {activeTab === "past"
              ? "Satılan veya pasife alınan ilanlarınız burada listelenir."
              : activeTab === "correction"
              ? "Moderasyon ekibi tarafından düzeltme istenen herhangi bir ilanınız bulunmamaktadır."
              : "Aracınızı TorqueScout üzerinde binlerce potansiyel alıcıya ulaştırmak için hemen bir ilan oluşturun."}
          </p>
          {activeTab === "active" && (
            <button
              onClick={() => router.push("/listings/create")}
              className="mt-2 bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition cursor-pointer"
            >
              ➕ Hemen İlan Verme Adımına Git
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {displayedListings.map((listing) => {
            const isPublishing = publishingId === listing.id;
            const isDeleting = deletingId === listing.id;
            const isResubmitted = listing.status === "PENDING_REVIEW" && !!listing.rejectionReason;

            return (
              <div
                key={listing.id}
                className="flex flex-col bg-slate-900/20 border border-white/5 rounded-3xl overflow-hidden hover:border-white/10 transition p-6 gap-4"
              >
                {/* Main Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Thumbnail & Info */}
                  <div className="flex items-center gap-5 flex-1 min-w-0">
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-slate-800 flex-shrink-0 border border-white/5">
                      {listing.media && listing.media.length > 0 ? (
                        <img
                          src={listing.media[0].url}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🚗</div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-bold text-slate-200 truncate">{listing.title}</h2>
                        {listing.isUrgent && <UrgentListingBadge size="small" />}
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            isResubmitted
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              : listing.status === "REVISION_REQUIRED" || listing.rejectionReason
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : listing.status === "ACTIVE"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : listing.status === "DRAFT"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : listing.status === "PASSIVE"
                              ? "bg-slate-700/40 text-slate-400 border border-white/10"
                              : listing.status === "SOLD"
                              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {isResubmitted
                            ? "TEKRAR İNCELEMEDE"
                            : listing.status === "REVISION_REQUIRED" || listing.rejectionReason
                            ? "DÜZELTME İSTENİYOR"
                            : listing.status === "ACTIVE"
                            ? "AKTİF"
                            : listing.status === "DRAFT"
                            ? "TASLAK (DRAFT)"
                            : listing.status === "PENDING_REVIEW"
                            ? "İNCELEMEDE"
                            : listing.status === "PASSIVE"
                            ? "PASİF"
                            : listing.status === "SOLD"
                            ? "SATILDI"
                            : listing.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                        <span>
                          {listing.year} • {listing.mileage?.toLocaleString("tr-TR")} km • {listing.locationCity || "Şehir Belirtilmedi"}
                        </span>
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          ❤️ {listing._count?.favorites || listing.favoriteCount || 0} Favoriye Eklendi
                        </span>
                      </div>

                      {listing.status === "ACTIVE" && listing.expiresAt && (
                        <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-bold mt-1">
                          <span>🟢 Yayında • Kalan süre: {getRemainingDays(listing.expiresAt)} gün (Bitiş: {formatDate(listing.expiresAt)})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                      onClick={() => router.push(`/listings/${listing.id}`)}
                      className="text-xs font-bold px-4 py-2 rounded-xl bg-slate-850 border border-white/5 text-slate-300 hover:bg-white/5 transition cursor-pointer"
                    >
                      İlanı Gör
                    </button>
                    <button
                      onClick={() => router.push(`/listings/${listing.id}/edit`)}
                      className="text-xs font-bold px-4 py-2 rounded-xl bg-orange-600/10 border border-orange-500/20 text-orange-400 hover:bg-orange-600/20 transition cursor-pointer"
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

                    {/* Show Yayınla only for DRAFT / REJECTED when NOT in correction flow */}
                    {(listing.status === "DRAFT" || listing.status === "REJECTED") && !listing.rejectionReason && (
                      <button
                        onClick={() => handleStatusChange(listing.id, "PENDING_REVIEW")}
                        disabled={isPublishing || isDeleting}
                        className="text-xs font-bold px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        Yayınla
                      </button>
                    )}

                    {listing.status === "DRAFT" && (
                      <button
                        onClick={() => setDeleteDraftModalListing(listing)}
                        disabled={isDeleting || isPublishing}
                        className="text-xs font-bold px-4 py-2 rounded-xl bg-rose-600/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 font-sans"
                      >
                        {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        Sil
                      </button>
                    )}

                    {listing.status === "ACTIVE" && (
                      <button
                        onClick={() => requestStatusChange(listing, "PASSIVE")}
                        className="text-xs font-bold px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-750 transition cursor-pointer"
                      >
                        Pasife Al
                      </button>
                    )}

                    {listing.status === "ACTIVE" && (
                      <button
                        onClick={() => requestStatusChange(listing, "SOLD")}
                        className="text-xs font-bold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
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

                {/* Moderation Reason Banner on Card */}
                {listing.rejectionReason && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex flex-col gap-1 font-sans text-xs">
                    <span className="font-bold text-rose-400 flex items-center gap-1.5 text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      Düzeltme Nedeni:
                    </span>
                    <p className="text-slate-200 font-mono text-[11px] bg-slate-950/50 p-2.5 rounded-xl border border-white/5 leading-relaxed">
                      {listing.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for General Status Changes */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl font-mono text-xs">
            <h4 className="font-bold text-white text-base font-sans">{confirmModal.title}</h4>
            <p className="text-slate-300 font-sans text-xs leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end gap-2 font-sans pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
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

      {/* Delete Draft Listing Confirmation Modal */}
      {deleteDraftModalListing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </span>
              <h4 className="font-bold text-white text-base font-sans">Taslak İlanı Sil</h4>
            </div>

            <p className="text-slate-300 font-sans text-xs leading-relaxed">
              Bu taslak ilan kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </p>

            <div className="p-3 bg-slate-900/80 border border-white/5 rounded-xl text-[11px] font-sans text-slate-400">
              <span className="font-bold text-white block mb-0.5">Silinecek Taslak:</span>
              "{deleteDraftModalListing.title}"
            </div>

            <div className="flex justify-end gap-2 font-sans pt-2">
              <button
                onClick={() => setDeleteDraftModalListing(null)}
                disabled={deletingId === deleteDraftModalListing.id}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer font-sans"
              >
                Vazgeç
              </button>
              <button
                onClick={handleExecuteDeleteDraft}
                disabled={deletingId === deleteDraftModalListing.id}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 font-sans"
              >
                {deletingId === deleteDraftModalListing.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                İlanı Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Warning Modal */}
      {publishWarningModal && publishWarningModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <AlertCircle className="w-5 h-5" />
              </span>
              <h4 className="font-bold text-white text-base font-sans">{publishWarningModal.title}</h4>
            </div>

            <p className="text-slate-300 font-sans text-xs leading-relaxed">
              {publishWarningModal.message}
            </p>

            <div className="flex justify-end gap-2 font-sans pt-2">
              <button
                onClick={() => setPublishWarningModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Kapat
              </button>
              <button
                onClick={() => {
                  const url = publishWarningModal.actionUrl;
                  setPublishWarningModal(null);
                  router.push(url);
                }}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer flex items-center gap-1"
              >
                {publishWarningModal.actionText} ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promotions Management Modal */}
      {promotionModalListing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-white/10 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setPromotionModalListing(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <ListingPromotionsManagement
              listingId={promotionModalListing.id}
              token={token || (typeof window !== "undefined" ? localStorage.getItem("accessToken") || "" : "")}
              onSuccess={() => {
                setPromotionModalListing(null);
                refreshListings();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function SellerDashboardPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400 font-mono text-xs">Yükleniyor...</div>}>
      <SellerDashboardContent />
    </Suspense>
  );
}
