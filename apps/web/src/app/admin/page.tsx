"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SellerBasedListingModeration } from "./components/SellerBasedListingModeration";
import AdminFeedbackOperationCenter from "./components/AdminFeedbackOperationCenter";
import VehicleProfileEditor from "./components/VehicleProfileEditor";

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
  const [activeTab, setActiveTab] = useState<"listings" | "jobs" | "variants" | "feedbacks" | "vehicle-profiles">("listings");

  // Vehicle Profiles state
  const [vehicleProfiles, setVehicleProfiles] = useState<any[]>([]);
  const [vehicleProfilesLoading, setVehicleProfilesLoading] = useState(false);
  const [vehicleProfileFilter, setVehicleProfileFilter] = useState<"all" | "guide" | "discovery">("all");
  const [vehicleProfileSearch, setVehicleProfileSearch] = useState("");
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [editorDefaultGuide, setEditorDefaultGuide] = useState(true);
  const [editorDefaultDiscovery, setEditorDefaultDiscovery] = useState(true);

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
          fetchVehicleProfiles(savedToken);
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

  const fetchVehicleProfiles = (jwtToken: string) => {
    setVehicleProfilesLoading(true);
    fetch(`${API_URL}/admin/vehicle-profiles`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Ortak araç profilleri yüklenemedi.");
        return res.json();
      })
      .then((data) => {
        setVehicleProfiles(Array.isArray(data) ? data : []);
        setVehicleProfilesLoading(false);
      })
      .catch((err) => {
        setVehicleProfilesLoading(false);
      });
  };

  const handleSaveVehicleProfile = async (payload: any) => {
    setActionLoading(true);
    const url = editingProfile
      ? `${API_URL}/admin/vehicle-profiles/${editingProfile.id}`
      : `${API_URL}/admin/vehicle-profiles`;
    const method = editingProfile ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      setActionLoading(false);
      throw new Error(err.message || "Araç profili kaydedilemedi.");
    }

    setIsProfileEditorOpen(false);
    setEditingProfile(null);
    setActionLoading(false);
    fetchVehicleProfiles(token);
  };

  const handleArchiveVehicleProfile = async (id: string) => {
    if (!confirm("Bu araç profilini arşivlemek istediğinize emin misiniz?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/vehicle-profiles/${id}/archive`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Arşivleme başarısız.");
      fetchVehicleProfiles(token);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

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
          onClick={() => setActiveTab("vehicle-profiles")}
          className={`px-4 py-2 font-bold text-sm transition-all rounded-t-xl ${
            activeTab === "vehicle-profiles"
              ? "bg-slate-900 border-t border-x border-white/10 text-orange-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          🚘 Ortak Araç Yönetimi ({vehicleProfiles.length})
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
        <a
          href="/admin/reports"
          className="px-4 py-2 font-bold text-sm transition-all rounded-t-xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-400 border-t border-x border-orange-500/30 hover:from-orange-500/30 hover:to-amber-500/30 shadow-lg shadow-orange-500/10 flex items-center gap-1.5"
        >
          <span>📊</span>
          <span>TORK SCOUT RAPORLAR</span>
        </a>
      </div>

      {/* TAB CONTENT: Seller-Based Listing Moderation & Approval Operations Center */}
      {activeTab === "listings" && <SellerBasedListingModeration />}

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

      {/* TAB CONTENT: Vehicle Profiles (Ortak Araç Yönetimi) */}
      {activeTab === "vehicle-profiles" && (
        <div className="flex flex-col gap-6 animate-in fade-in-50 duration-200">
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
            <div>
              <h2 className="text-base font-bold text-slate-200">Ortak Araç Profil Listesi (`VehicleProfile`)</h2>
              <p className="text-xs text-slate-400">
                Hem <strong>Araç Rehberi</strong> hem de <strong>Aracını Bul</strong> özelliklerini besleyen tek ortak araç havuzu.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingProfile(null);
                  setEditorDefaultGuide(true);
                  setEditorDefaultDiscovery(true);
                  setIsProfileEditorOpen(true);
                }}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>➕</span>
                <span>Yeni Araç Profili Ekle</span>
              </button>
            </div>
          </div>

          {/* Editor Modal */}
          {isProfileEditorOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <VehicleProfileEditor
                  initialData={editingProfile}
                  defaultShowInGuide={editorDefaultGuide}
                  defaultShowInDiscovery={editorDefaultDiscovery}
                  onSave={handleSaveVehicleProfile}
                  onCancel={() => {
                    setIsProfileEditorOpen(false);
                    setEditingProfile(null);
                  }}
                  loading={actionLoading}
                />
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <input
              type="text"
              placeholder="Marka, model veya isim ile filtrele..."
              value={vehicleProfileSearch}
              onChange={(e) => setVehicleProfileSearch(e.target.value)}
              className="w-full md:w-96 bg-[#050914] border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-200 focus:border-orange-500 focus:outline-none"
            />
            <div className="flex gap-2 text-xs font-bold">
              <button
                onClick={() => setVehicleProfileFilter("all")}
                className={`px-3 py-1.5 rounded-lg border ${
                  vehicleProfileFilter === "all"
                    ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                    : "bg-slate-900 text-slate-400 border-white/5"
                }`}
              >
                Tümü ({vehicleProfiles.length})
              </button>
              <button
                onClick={() => setVehicleProfileFilter("guide")}
                className={`px-3 py-1.5 rounded-lg border ${
                  vehicleProfileFilter === "guide"
                    ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                    : "bg-slate-900 text-slate-400 border-white/5"
                }`}
              >
                Rehber'de Aktif ({vehicleProfiles.filter((p) => p.showInGuide).length})
              </button>
              <button
                onClick={() => setVehicleProfileFilter("discovery")}
                className={`px-3 py-1.5 rounded-lg border ${
                  vehicleProfileFilter === "discovery"
                    ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                    : "bg-slate-900 text-slate-400 border-white/5"
                }`}
              >
                Aracını Bul'da Aktif ({vehicleProfiles.filter((p) => p.showInDiscovery).length})
              </button>
            </div>
          </div>

          {/* Profiles Grid / Table */}
          {vehicleProfilesLoading ? (
            <div className="p-12 text-center text-slate-400 font-bold text-xs">Profil havuzu yükleniyor...</div>
          ) : vehicleProfiles.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs bg-slate-950/20 rounded-2xl border border-white/5">
              Henüz tanımlanmış araç profili bulunmuyor. Eklemek için yukarıdaki butonu kullanın.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicleProfiles
                .filter((p) => {
                  if (vehicleProfileFilter === "guide") return p.showInGuide;
                  if (vehicleProfileFilter === "discovery") return p.showInDiscovery;
                  return true;
                })
                .filter((p) => {
                  if (!vehicleProfileSearch) return true;
                  const q = vehicleProfileSearch.toLowerCase();
                  return (
                    p.brand.toLowerCase().includes(q) ||
                    p.model.toLowerCase().includes(q) ||
                    p.displayName.toLowerCase().includes(q)
                  );
                })
                .map((profile) => (
                  <div
                    key={profile.id}
                    className="p-4 bg-slate-900/60 border border-white/10 rounded-2xl flex flex-col justify-between gap-3 hover:border-orange-500/30 transition"
                  >
                    <div>
                      {profile.heroImageUrl && (
                        <img
                          src={profile.heroImageUrl}
                          alt={profile.displayName}
                          className="w-full h-36 object-cover rounded-xl border border-white/5 mb-3"
                        />
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-white truncate">{profile.displayName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {profile.bodyType}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {profile.discoverySummary || profile.guideSummary || "Özet açıklama girilmemiş."}
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-white/5 pt-3">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-400">Yayın Durumu:</span>
                        <div className="flex gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded ${
                              profile.showInGuide
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-slate-800 text-slate-500"
                            }`}
                          >
                            Rehber
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded ${
                              profile.showInDiscovery
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-slate-800 text-slate-500"
                            }`}
                          >
                            Aracını Bul
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingProfile(profile);
                            setIsProfileEditorOpen(true);
                          }}
                          className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition"
                        >
                          ✏️ Düzenle
                        </button>
                        <button
                          onClick={() => handleArchiveVehicleProfile(profile.id)}
                          className="py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold rounded-lg transition"
                        >
                          🗑️ Arşivle
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Feedbacks Management Operation Center */}
      {activeTab === "feedbacks" && (
        <div className="animate-in fade-in-50 duration-200">
          <AdminFeedbackOperationCenter token={token} />
        </div>
      )}
    </div>
  );
}
