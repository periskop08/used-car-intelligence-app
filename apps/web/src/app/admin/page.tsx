"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const PART_LABELS: Record<string, string> = {
  FRONT_BUMPER: "Ön Tampon",
  LEFT_FRONT_FENDER: "Sol Ön Çamurluk",
  HOOD: "Kaput (Motor Kaputu)",
  RIGHT_FRONT_FENDER: "Sağ Ön Çamurluk",
  LEFT_FRONT_DOOR: "Sol Ön Kapı",
  ROOF: "Tavan",
  RIGHT_FRONT_DOOR: "Sağ Ön Kapı",
  LEFT_REAR_DOOR: "Sol Arka Kapı",
  RIGHT_REAR_DOOR: "Sağ Arka Kapı",
  LEFT_REAR_FENDER: "Sol Arka Çamurluk",
  TRUNK: "Bagaj Kapağı",
  RIGHT_REAR_FENDER: "Sağ Arka Çamurluk",
  REAR_BUMPER: "Arka Tampon"
};

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

const displayBodyType = (body: string) => {
  if (!body) return "-";
  const mapping: Record<string, string> = {
    SEDAN: "Sedan",
    HATCHBACK: "Hatchback",
    CONVERTIBLE: "Cabrio",
    COUPE: "Coupe",
    SUV: "SUV",
    WAGON: "Station Wagon",
    PICKUP: "Pickup",
    VAN: "Van",
    MINIVAN: "Minivan"
  };
  return mapping[body.toUpperCase()] || body;
};

const FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
  GENERAL_SUGGESTION: "Genel Öneri",
  BUG_REPORT: "Hata Bildirimi",
  VEHICLE_QUERY_AI_REPORT: "Araç Sorgulama / AI Rapor",
  INCORRECT_VEHICLE_DATA: "Eksik veya Hatalı Araç Bilgisi",
  LISTINGS: "İlanlar",
  MESSAGES: "Mesajlar",
  FAVORITES: "Favoriler",
  SUBSCRIPTION_PACKAGES: "Abonelik / Paketler",
  ACCOUNT_PROFILE: "Hesap / Profil",
  VEHICLE_GUIDE: "Araç Rehberi",
  VEHICLE_COMPARISON: "Araç Karşılaştırma",
  FIND_MY_CAR: "Aracını Bul",
  DESIGN_USABILITY: "Tasarım / Kullanım Kolaylığı",
  SECURITY_SUSPICIOUS_ACTIVITY: "Güvenlik / Şüpheli İşlem",
  OTHER: "Diğer"
};

const FEEDBACK_STATUS_LABELS: Record<string, string> = {
  NEW: "Yeni",
  IN_REVIEW: "İnceleniyor",
  RESOLVED: "Çözüldü",
  REJECTED: "Reddedildi",
  ARCHIVED: "Arşivlendi"
};

const FEEDBACK_PRIORITY_LABELS: Record<string, string> = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  URGENT: "Acil"
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function UnifiedAdminPage() {
  const router = useRouter();

  // Auth states
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [token, setToken] = useState("");

  // Tab State
  const [activeTab, setActiveTab] = useState<"listings" | "jobs" | "variants" | "feedbacks">("listings");

  // Feedbacks State
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState("");
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState("");
  const [feedbackPriorityFilter, setFeedbackPriorityFilter] = useState("");
  const [feedbackSearch, setFeedbackSearch] = useState("");

  // Listings state
  const [listings, setListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);

  // Jobs state
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [submittingJob, setSubmittingJob] = useState(false);
  const [variantId, setVariantId] = useState("");
  const [userId, setUserId] = useState("");
  const [jobLanguage, setJobLanguage] = useState("tr");
  const [jobPriority, setJobPriority] = useState("MEDIUM");

  // Error/Success
  const [errorMsg, setErrorMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Suggested variants states
  const [variants, setVariants] = useState<any[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);

  // Variant editing states
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editEngine, setEditEngine] = useState("");
  const [editTrim, setEditTrim] = useState("");
  const [editYear, setEditYear] = useState("");

  // Verify Admin Role on Mount
  useEffect(() => {
    const savedToken = localStorage.getItem("accessToken");
    if (!savedToken) {
      router.push("/login?redirect=/admin");
      return;
    }

    setToken(savedToken);

    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser.role !== "ADMIN") {
          setErrorMsg("Bu sayfaya erişim yetkiniz bulunamadı. Yalnızca yöneticiler girebilir.");
          setAuthLoading(false);
        } else {
          setIsAdmin(true);
          setAuthLoading(false);
          // Initial fetches
          fetchAdminListings(savedToken);
          fetchResearchJobs(savedToken);
          fetchPendingVariants(savedToken);
          fetchFeedbacks(savedToken);
        }
      } catch (e) {
        setErrorMsg("Oturum doğrulanamadı.");
        setAuthLoading(false);
      }
    } else {
      setErrorMsg("Oturum bulunamadı. Lütfen giriş yapın.");
      setAuthLoading(false);
    }
  }, []);

  const fetchFeedbacks = (jwtToken: string) => {
    setFeedbacksLoading(true);
    const queryParams = new URLSearchParams();
    if (feedbackCategoryFilter) queryParams.append("category", feedbackCategoryFilter);
    if (feedbackStatusFilter) queryParams.append("status", feedbackStatusFilter);
    if (feedbackPriorityFilter) queryParams.append("priority", feedbackPriorityFilter);
    if (feedbackSearch) queryParams.append("search", feedbackSearch);

    fetch(`${API_URL}/admin/feedbacks?${queryParams.toString()}`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Geri bildirimler yüklenemedi.");
        return res.json();
      })
      .then((data) => {
        setFeedbacks(Array.isArray(data) ? data : []);
        setFeedbacksLoading(false);
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setFeedbacksLoading(false);
      });
  };

  const handleUpdateFeedbackStatus = (feedbackId: string, status: string) => {
    setActionLoading(true);
    fetch(`${API_URL}/admin/feedbacks/${feedbackId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((err) => { throw new Error(err.message); });
        return res.json();
      })
      .then(() => {
        fetchFeedbacks(token);
        setActionLoading(false);
      })
      .catch((err) => {
        alert(err.message);
        setActionLoading(false);
      });
  };

  const handleUpdateFeedbackPriority = (feedbackId: string, priority: string) => {
    setActionLoading(true);
    fetch(`${API_URL}/admin/feedbacks/${feedbackId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ priority }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((err) => { throw new Error(err.message); });
        return res.json();
      })
      .then(() => {
        fetchFeedbacks(token);
        setActionLoading(false);
      })
      .catch((err) => {
        alert(err.message);
        setActionLoading(false);
      });
  };

  useEffect(() => {
    if (token && isAdmin) {
      fetchFeedbacks(token);
    }
  }, [feedbackCategoryFilter, feedbackStatusFilter, feedbackPriorityFilter, feedbackSearch, token, isAdmin]);

  const fetchAdminListings = (jwtToken: string) => {
    setListingsLoading(true);
    fetch(`${API_URL}/admin/listings`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("İlanlar yüklenemedi.");
        return res.json();
      })
      .then((data) => {
        setListings(Array.isArray(data) ? data : []);
        setListingsLoading(false);
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setListingsLoading(false);
      });
  };

  const fetchResearchJobs = (jwtToken: string) => {
    setJobsLoading(true);
    fetch(`${API_URL}/research/jobs`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Araştırma işleri yüklenemedi.");
        return res.json();
      })
      .then((data) => {
        setJobs(Array.isArray(data) ? data : []);
        setJobsLoading(false);
      })
      .catch(() => {
        setJobsLoading(false);
      });
  };

  const handleUpdateStatus = (listingId: string, status: string) => {
    let rejectionReason = "";
    if (status === "REJECTED") {
      const reason = prompt("Lütfen ilan reddetme gerekçesini giriniz:");
      if (!reason) return;
      rejectionReason = reason;
    }

    setActionLoading(true);
    fetch(`${API_URL}/admin/listings/${listingId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status,
        rejectionReason,
        adminNote: rejectionReason ? `Red gerekçesi: ${rejectionReason}` : "Moderasyon işlemi",
      }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((err) => { throw new Error(err.message); });
        return res.json();
      })
      .then(() => {
        alert("İlan durumu başarıyla güncellendi!");
        fetchAdminListings(token);
      })
      .catch((err) => {
        alert(`Hata: ${err.message}`);
      })
      .finally(() => {
        setActionLoading(false);
      });
  };

  const handleUpdateMediaModeration = (listingId: string, mediaId: string, moderationStatus: string) => {
    setActionLoading(true);
    fetch(`${API_URL}/admin/listings/${listingId}/media/${mediaId}/moderation`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ moderationStatus }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((err) => { throw new Error(err.message); });
        return res.json();
      })
      .then(() => {
        alert("Görsel durumu güncellendi!");
        fetchAdminListings(token);
      })
      .catch((err) => {
        alert(`Hata: ${err.message}`);
      })
      .finally(() => {
        setActionLoading(false);
      });
  };

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantId || !userId) {
      alert("Varyant ID ve Kullanıcı ID zorunludur.");
      return;
    }

    setSubmittingJob(true);
    fetch(`${API_URL}/research/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        variantId,
        userId,
        languageCode: jobLanguage,
        priority: jobPriority,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setSubmittingJob(false);
        if (data.success) {
          alert("İş başarıyla kuyruğa eklendi. ID: " + data.jobId);
          setVariantId("");
          setUserId("");
          fetchResearchJobs(token);
        } else {
          alert("Hata: " + data.message);
        }
      })
      .catch((err) => {
        setSubmittingJob(false);
        alert("İş oluşturulurken hata: " + err.message);
      });
  };

  const handleProcessNext = () => {
    setActionLoading(true);
    fetch(`${API_URL}/research/process-next`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setActionLoading(false);
        if (data.processed) {
          alert("Kuyruktaki bir iş başarıyla işlendi!");
          fetchResearchJobs(token);
        } else {
          alert("Kuyrukta beklenecek uygun iş bulunamadı veya işleme başarısız oldu.");
        }
      })
      .catch((err) => {
        setActionLoading(false);
        alert("Kuyruk işlenirken hata: " + err.message);
      });
  };

  const fetchPendingVariants = (jwtToken: string) => {
    setVariantsLoading(true);
    fetch(`${API_URL}/vehicles/admin/pending`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Varyantlar yüklenemedi.");
        return res.json();
      })
      .then((data) => {
        setVariants(Array.isArray(data) ? data : []);
        setVariantsLoading(false);
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setVariantsLoading(false);
      });
  };

  const handleApproveVariant = (variantId: string) => {
    setActionLoading(true);
    fetch(`${API_URL}/vehicles/admin/${variantId}/approve`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) return res.json().then((err) => { throw new Error(err.message); });
        return res.json();
      })
      .then(() => {
        alert("Araç varyantı başarıyla onaylandı ve yayına alındı!");
        fetchPendingVariants(token);
      })
      .catch((err) => {
        alert(`Hata: ${err.message}`);
      })
      .finally(() => {
        setActionLoading(false);
      });
  };

  const handleRejectVariant = (variantId: string) => {
    const reason = prompt("Lütfen araç reddetme gerekçesini giriniz:");
    if (!reason) return;

    setActionLoading(true);
    fetch(`${API_URL}/vehicles/admin/${variantId}/reject`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((err) => { throw new Error(err.message); });
        return res.json();
      })
      .then(() => {
        alert("Araç varyantı reddedildi!");
        fetchPendingVariants(token);
      })
      .catch((err) => {
        alert(`Hata: ${err.message}`);
      })
      .finally(() => {
        setActionLoading(false);
      });
  };

  const handleEditVariant = (variantId: string, updatedFields: any) => {
    setActionLoading(true);
    fetch(`${API_URL}/vehicles/admin/${variantId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updatedFields),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((err) => { throw new Error(err.message); });
        return res.json();
      })
      .then(() => {
        alert("Araç varyantı başarıyla güncellendi!");
        fetchPendingVariants(token);
      })
      .catch((err) => {
        alert(`Hata: ${err.message}`);
      })
      .finally(() => {
        setActionLoading(false);
      });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <span className="animate-spin text-4xl">⏳</span>
        <span className="text-slate-400 font-bold text-base">Yönetici yetkileri sorgulanıyor...</span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="w-full max-w-xl mx-auto py-24 text-center flex flex-col gap-4">
        <span className="text-5xl">🛑</span>
        <h2 className="text-xl font-bold text-slate-200">{errorMsg}</h2>
        <a href="/" className="text-orange-500 font-bold hover:underline">Anasayfaya Dön</a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-12 flex flex-col gap-10">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-black text-slate-200 tracking-tight">Yönetim Paneli (Admin)</h1>
        <p className="text-sm text-slate-400 mt-1">Sitedeki ilanların moderasyonunu ve AI araştırma işlerini yönetin.</p>
      </div>

      {/* Tabs Menu Selector */}
      <div className="flex gap-2 border-b border-white/5 pb-1">
        <button
          onClick={() => setActiveTab("listings")}
          className={`px-4 py-2 font-bold text-sm transition-all rounded-t-xl ${
            activeTab === "listings"
              ? "bg-slate-900 border-t border-x border-white/10 text-orange-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          🚗 İlan Moderasyonu ({listings.length})
        </button>
        <button
          onClick={() => setActiveTab("jobs")}
          className={`px-4 py-2 font-bold text-sm transition-all rounded-t-xl ${
            activeTab === "jobs"
              ? "bg-slate-900 border-t border-x border-white/10 text-orange-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          ⚡ Araştırma Kuyruğu ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab("variants")}
          className={`px-4 py-2 font-bold text-sm transition-all rounded-t-xl ${
            activeTab === "variants"
              ? "bg-slate-900 border-t border-x border-white/10 text-orange-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          📋 Araç Onayları ({variants.length})
        </button>
        <button
          onClick={() => setActiveTab("feedbacks")}
          className={`px-4 py-2 font-bold text-sm transition-all rounded-t-xl ${
            activeTab === "feedbacks"
              ? "bg-slate-900 border-t border-x border-white/10 text-orange-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          💬 Geri Bildirimler ({feedbacks.length})
        </button>
      </div>

      {/* TAB CONTENT: Listings Moderation */}
      {activeTab === "listings" && (
        <div className="flex flex-col gap-6">
          {listingsLoading ? (
            <div className="text-center py-12 text-slate-400">İlan verileri yükleniyor...</div>
          ) : listings.length === 0 ? (
            <p className="text-slate-400 italic text-center py-12">Sistemde onay bekleyen veya aktif ilan bulunmuyor.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {listings.map((listing) => (
                <div key={listing.id} className="p-6 bg-slate-900/20 border border-white/5 rounded-3xl flex flex-col gap-4">
                  {/* Summary */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
                    <div>
                      <h4 className="font-extrabold text-slate-200 text-sm">{listing.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Satıcı: <strong className="text-slate-300">{listing.seller?.email}</strong> • Şehir: {listing.city} • Varyant ID: {listing.vehicleVariantId || "Manuel Varyant Girişi"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${
                        listing.status === "ACTIVE"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : listing.status === "PENDING_REVIEW"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-slate-800 text-slate-450"
                      }`}>
                        {listing.status}
                      </span>
                      <span className="text-sm font-black text-orange-400">
                        {Number(listing.priceAmount).toLocaleString('tr-TR')} {listing.currency}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
                    <div className="flex flex-col gap-1 bg-slate-950/20 p-4 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Teknik Detaylar</span>
                      <span>Model Yılı: {listing.modelYear}</span>
                      <span>KM: {listing.kilometers.toLocaleString('tr-TR')} km</span>
                      <span>Yakıt: {translateFuelType(listing.fuelType)}</span>
                      <span>Şanzıman: {translateTransmission(listing.transmission)}</span>
                    </div>

                    <div className="flex flex-col gap-1 bg-slate-950/20 p-4 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Hasar & Tramer</span>
                      <span>Hasar Tutarı: {listing.tramerAmount > 0 ? `${listing.tramerAmount.toLocaleString('tr-TR')} TL` : "Hasarsız"}</span>
                      <span>Gerekçe/Not: {listing.damageRecord || "Yok"}</span>
                      <span>Boyalı Parçalar: {listing.paintedParts?.length > 0 ? listing.paintedParts.map((p: string) => PART_LABELS[p] || p).join(', ') : "Yok"}</span>
                      <span>Lokal Boyalı: {listing.localPaintedParts?.length > 0 ? listing.localPaintedParts.map((p: string) => PART_LABELS[p] || p).join(', ') : "Yok"}</span>
                      <span>Değişen Parçalar: {listing.changedParts?.length > 0 ? listing.changedParts.map((p: string) => PART_LABELS[p] || p).join(', ') : "Yok"}</span>
                    </div>

                    <div className="flex flex-col justify-center gap-2">
                      {listing.status === "PENDING_REVIEW" && (
                        <>
                          <button
                            disabled={actionLoading}
                            onClick={() => handleUpdateStatus(listing.id, "ACTIVE")}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition text-xs"
                          >
                            İlanı Onayla (Yayına Al)
                          </button>
                          <button
                            disabled={actionLoading}
                            onClick={() => handleUpdateStatus(listing.id, "REJECTED")}
                            className="bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl transition text-xs"
                          >
                            Reddet
                          </button>
                        </>
                      )}
                      {listing.status === "ACTIVE" && (
                        <button
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(listing.id, "PASSIVE")}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-2.5 rounded-xl transition text-xs"
                        >
                          Pasife Al
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Media gallery with moderation */}
                  <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Yüklenen Fotoğraflar & Moderasyon</span>
                    {listing.media && listing.media.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {listing.media.map((img: any) => (
                          <div key={img.id} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10 group">
                            <img src={img.url} alt="listing attachment" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition p-2">
                              <button
                                onClick={() => handleUpdateMediaModeration(listing.id, img.id, "APPROVED")}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1 rounded text-[9px] transition"
                              >
                                Onay
                              </button>
                              <button
                                onClick={() => handleUpdateMediaModeration(listing.id, img.id, "REJECTED")}
                                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-1 rounded text-[9px] transition"
                              >
                                Red
                              </button>
                            </div>
                            <span className={`absolute bottom-2 left-2 text-[8px] font-bold px-1.5 py-0.5 rounded ${
                              img.moderationStatus === "APPROVED"
                                ? "bg-emerald-600 text-white"
                                : img.moderationStatus === "REJECTED"
                                ? "bg-red-600 text-white"
                                : "bg-amber-500 text-black"
                            }`}>
                              {img.moderationStatus}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic">İlanda görsel bulunmuyor.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Research Jobs */}
      {activeTab === "jobs" && (
        <div className="flex flex-col gap-6">
          {/* Create Job Form */}
          <form onSubmit={handleCreateJob} className="p-6 bg-slate-900/20 border border-white/5 rounded-3xl flex flex-col gap-4">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">Yeni AI Araştırma İşi Ekle</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Varyant ID</label>
                <input
                  type="text"
                  required
                  value={variantId}
                  onChange={(e) => setVariantId(e.target.value)}
                  placeholder="Variant UUID"
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Talep Eden Kullanıcı ID</label>
                <input
                  type="text"
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="User UUID"
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Öncelik</label>
                <select
                  value={jobPriority}
                  onChange={(e) => setJobPriority(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-250 outline-none focus:border-orange-500"
                >
                  <option value="LOW">Düşük</option>
                  <option value="MEDIUM">Orta</option>
                  <option value="HIGH">Yüksek</option>
                </select>
              </div>
              <div className="flex flex-col justify-end">
                <button
                  type="submit"
                  disabled={submittingJob}
                  className="bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition text-xs"
                >
                  {submittingJob ? "Ekleniyor..." : "Kuyruğa Ekle"}
                </button>
              </div>
            </div>
          </form>

          {/* Action trigger queue */}
          <div className="flex items-center justify-between p-6 bg-slate-900/10 border border-white/5 rounded-3xl">
            <div>
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">Kuyruğu Manuel Çalıştır</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Kuyruktaki ilk bekleme sırasındaki işi OpenAI/AI motoruyla tetikler.</p>
            </div>
            <button
              onClick={handleProcessNext}
              disabled={actionLoading}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-6 rounded-xl transition text-xs"
            >
              Kuyruktaki Bir İşi İşle ⚡
            </button>
          </div>

          {/* Table list */}
          <div className="p-6 bg-slate-900/20 border border-white/5 rounded-3xl flex flex-col gap-4">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">Kuyruk Sıralaması</h3>
            {jobsLoading ? (
              <div className="text-center py-6 text-slate-400">Yükleniyor...</div>
            ) : jobs.length === 0 ? (
              <p className="text-slate-400 italic text-center py-6">Kuyrukta beklemede veya işlemde olan bir araştırma işi yok.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">İş ID</th>
                      <th className="py-2.5 px-3">Durum</th>
                      <th className="py-2.5 px-3">Öncelik</th>
                      <th className="py-2.5 px-3">Model/Varyant</th>
                      <th className="py-2.5 px-3">Son Güncelleme</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id} className="border-b border-white/5 hover:bg-slate-950/20 text-slate-300">
                        <td className="py-2.5 px-3 font-mono text-[10px]">{job.id ? job.id.substring(0, 8) : ""}...</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            job.status === "COMPLETED"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : job.status === "PENDING"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-red-500/20 text-red-400"
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold">{job.priority}</td>
                        <td className="py-2.5 px-3 font-mono text-[10px]">{job.variantId ? job.variantId.substring(0, 8) : "N/A"}...</td>
                        <td className="py-2.5 px-3">{formatDate(job.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Variants Moderation */}
      {activeTab === "variants" && (
        <div className="flex flex-col gap-6">
          {variantsLoading ? (
            <div className="text-center py-12 text-slate-400">Onay bekleyen araçlar yükleniyor...</div>
          ) : variants.length === 0 ? (
            <p className="text-slate-400 italic text-center py-12">Onay bekleyen yeni araç önerisi bulunmuyor.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {variants.map((variant) => (
                <div key={variant.id} className="p-6 bg-slate-900/20 border border-white/5 rounded-3xl flex flex-col gap-4">
                  
                  {/* Header info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
                    <div>
                      <h4 className="font-extrabold text-slate-200 text-sm">
                        {variant.brand?.name} {variant.model?.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Öneren: <strong className="text-slate-300">{variant.createdBy?.email || "Anonim"}</strong> • Tarih: {formatDate(variant.createdAt)}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      ONAY BEKLİYOR
                    </span>
                  </div>

                  {/* Body Info / Form for editing */}
                  {editingVariantId === variant.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Motor</label>
                        <input
                          type="text"
                          value={editEngine}
                          onChange={(e) => setEditEngine(e.target.value)}
                          className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-slate-200 outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Donanım Paketi</label>
                        <input
                          type="text"
                          value={editTrim}
                          onChange={(e) => setEditTrim(e.target.value)}
                          className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-slate-200 outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Yıl</label>
                        <input
                          type="number"
                          value={editYear}
                          onChange={(e) => setEditYear(e.target.value)}
                          className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-slate-200 outline-none"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <button
                          onClick={() => {
                            handleEditVariant(variant.id, {
                              engine: editEngine,
                              trimName: editTrim,
                              year: Number(editYear)
                            });
                            setEditingVariantId(null);
                          }}
                          className="bg-orange-655 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded-xl transition"
                        >
                          Kaydet
                        </button>
                        <button
                          onClick={() => setEditingVariantId(null)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-2 px-4 rounded-xl transition"
                        >
                          İptal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs text-slate-300 bg-slate-950/20 p-4 rounded-2xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Kasa Tipi</span>
                        <span className="font-semibold">{displayBodyType(variant.bodyType)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Motor</span>
                        <span className="font-semibold">{variant.engine?.code}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Yakıt</span>
                        <span className="font-semibold">{translateFuelType(variant.engine?.fuelType)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Donanım</span>
                        <span className="font-semibold">{variant.trim?.name}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Şanzıman & Yıl</span>
                        <span className="font-semibold">{translateTransmission(variant.transmission?.type)} ({variant.year})</span>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {editingVariantId !== variant.id && (
                    <div className="flex items-center gap-3 border-t border-white/5 pt-3 justify-end">
                      <button
                        onClick={() => {
                          setEditingVariantId(variant.id);
                          setEditEngine(variant.engine?.code || "");
                          setEditTrim(variant.trim?.name || "");
                          setEditYear(variant.year?.toString() || "");
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded-xl transition text-xs"
                        disabled={actionLoading}
                      >
                        ✏️ Düzenle
                      </button>
                      <button
                        onClick={() => handleApproveVariant(variant.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl transition text-xs"
                        disabled={actionLoading}
                      >
                        ✅ Onayla (Yayına Al)
                      </button>
                      <button
                        onClick={() => handleRejectVariant(variant.id)}
                        className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-xl transition text-xs"
                        disabled={actionLoading}
                      >
                        ❌ Reddet
                      </button>
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Feedbacks Management */}
      {activeTab === "feedbacks" && (
        <div className="flex flex-col gap-6 animate-in fade-in-50 duration-200">
          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-5 bg-slate-900/20 border border-white/5 rounded-3xl backdrop-blur-sm">
            {/* Search */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Kullanıcı Ara</label>
              <input
                type="text"
                placeholder="E-posta veya kullanıcı adı..."
                value={feedbackSearch}
                onChange={(e) => setFeedbackSearch(e.target.value)}
                className="bg-[#05070f] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Konu Filtrele</label>
              <select
                value={feedbackCategoryFilter}
                onChange={(e) => setFeedbackCategoryFilter(e.target.value)}
                className="bg-[#05070f] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition cursor-pointer"
              >
                <option value="">Tüm Konular</option>
                {Object.entries(FEEDBACK_CATEGORY_LABELS).map(([val, lbl]) => (
                  <option key={val} value={val} className="bg-[#090d1a]">{lbl}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Durum Filtrele</label>
              <select
                value={feedbackStatusFilter}
                onChange={(e) => setFeedbackStatusFilter(e.target.value)}
                className="bg-[#05070f] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition cursor-pointer"
              >
                <option value="">Tüm Durumlar</option>
                {Object.entries(FEEDBACK_STATUS_LABELS).map(([val, lbl]) => (
                  <option key={val} value={val} className="bg-[#090d1a]">{lbl}</option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Öncelik Filtrele</label>
              <select
                value={feedbackPriorityFilter}
                onChange={(e) => setFeedbackPriorityFilter(e.target.value)}
                className="bg-[#05070f] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition cursor-pointer"
              >
                <option value="">Tüm Öncelikler</option>
                {Object.entries(FEEDBACK_PRIORITY_LABELS).map(([val, lbl]) => (
                  <option key={val} value={val} className="bg-[#090d1a]">{lbl}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Feedback list */}
          {feedbacksLoading ? (
            <div className="text-center py-12 text-slate-400">Geri bildirim verileri yükleniyor...</div>
          ) : feedbacks.length === 0 ? (
            <p className="text-slate-400 italic text-center py-12">Kriterlere uygun geri bildirim bulunamadı.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {feedbacks.map((fb) => {
                const priorityColor = fb.priority === "URGENT" ? "bg-red-500/10 text-red-400 border-red-500/20" : fb.priority === "HIGH" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : fb.priority === "NORMAL" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-slate-800 text-slate-400 border-white/5";
                const statusColor = fb.status === "NEW" ? "bg-sky-500/10 text-sky-400 border-sky-500/20" : fb.status === "IN_REVIEW" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : fb.status === "RESOLVED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : fb.status === "REJECTED" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-slate-800 text-slate-400 border-white/5";
                
                return (
                  <div key={fb.id} className="p-6 bg-slate-900/20 border border-white/5 rounded-3xl flex flex-col gap-4">
                    {/* User and Meta Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center font-bold text-orange-400 text-xs shrink-0">
                          {fb.user?.profilePhotoUrl ? (
                            <img src={fb.user.profilePhotoUrl} alt="Avatar" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            (fb.user?.firstName || fb.user?.email || "U").slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-xs font-bold text-slate-200 truncate">
                            {fb.user?.firstName && fb.user?.lastName ? `${fb.user.firstName} ${fb.user.lastName}` : fb.user?.username || "Bilinmeyen Kullanıcı"}
                          </span>
                          <span className="text-[10px] text-slate-500 truncate">{fb.user?.email}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Category Badge */}
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-white/5">
                          📂 {FEEDBACK_CATEGORY_LABELS[fb.subjectCategory] || fb.subjectCategory}
                        </span>

                        {/* Priority Badge */}
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${priorityColor}`}>
                          ⚡ {FEEDBACK_PRIORITY_LABELS[fb.priority] || fb.priority}
                        </span>

                        {/* Status Badge */}
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${statusColor}`}>
                          📌 {FEEDBACK_STATUS_LABELS[fb.status] || fb.status}
                        </span>

                        {/* Date */}
                        <span className="text-[10px] text-slate-500 font-semibold sm:ml-2">
                          📅 {formatDate(fb.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Message body */}
                    <div className="text-xs font-medium text-slate-300 whitespace-pre-wrap bg-[#05070f]/50 p-4 rounded-2xl border border-white/5 leading-relaxed">
                      {fb.message}
                    </div>

                    {/* Screenshot attachment preview */}
                    {fb.attachmentUrl && (
                      <div className="flex flex-col gap-1.5 self-start">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Ekran Görüntüsü</span>
                        <a href={fb.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block group relative overflow-hidden rounded-xl border border-white/10 hover:border-orange-500 transition-all max-w-[200px]">
                          <img src={fb.attachmentUrl} alt="Feedback Screenshot" className="max-h-24 w-auto object-cover rounded-xl transition duration-300 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold transition">🔎 Büyüt</div>
                        </a>
                      </div>
                    )}

                    {/* Actions and Status Updates */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/5 pt-4 mt-1">
                      <span className="text-[10px] text-slate-500 font-medium">Geri Bildirim ID: {fb.id}</span>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Status update select */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Durum:</span>
                          <select
                            value={fb.status}
                            onChange={(e) => handleUpdateFeedbackStatus(fb.id, e.target.value)}
                            disabled={actionLoading}
                            className="bg-[#05070f] border border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition cursor-pointer"
                          >
                            {Object.entries(FEEDBACK_STATUS_LABELS).map(([val, lbl]) => (
                              <option key={val} value={val} className="bg-[#090d1a]">{lbl}</option>
                            ))}
                          </select>
                        </div>

                        {/* Priority update select */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Öncelik:</span>
                          <select
                            value={fb.priority}
                            onChange={(e) => handleUpdateFeedbackPriority(fb.id, e.target.value)}
                            disabled={actionLoading}
                            className="bg-[#05070f] border border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition cursor-pointer"
                          >
                            {Object.entries(FEEDBACK_PRIORITY_LABELS).map(([val, lbl]) => (
                              <option key={val} value={val} className="bg-[#090d1a]">{lbl}</option>
                            ))}
                          </select>
                        </div>

                        {/* Quick Archive Button */}
                        {fb.status !== "ARCHIVED" && (
                          <button
                            onClick={() => handleUpdateFeedbackStatus(fb.id, "ARCHIVED")}
                            disabled={actionLoading}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-1.5 px-3 rounded-xl transition text-[11px]"
                          >
                            📦 Arşivle
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
