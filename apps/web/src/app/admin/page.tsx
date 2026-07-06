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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function UnifiedAdminPage() {
  const router = useRouter();

  // Auth states
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [token, setToken] = useState("");

  // Tab State
  const [activeTab, setActiveTab] = useState<"listings" | "jobs">("listings");

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
          setErrorMsg("Bu sayfaya erişim yetkiniz bulunmamaktadır. Yalnızca yöneticiler girebilir.");
          setAuthLoading(false);
        } else {
          setIsAdmin(true);
          setAuthLoading(false);
          // Initial fetches
          fetchAdminListings(savedToken);
          fetchResearchJobs(savedToken);
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
    </div>
  );
}
