"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function SellerDashboard() {
  const router = useRouter();

  // Data states
  const [listings, setListings] = useState<any[]>([]);
  const [quota, setQuota] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [expandedLeads, setExpandedLeads] = useState<Record<string, boolean>>({});
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
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
          <h1 className="text-3xl font-black text-slate-200 tracking-tight">Satıcı Paneli</h1>
          <p className="text-sm text-slate-400 mt-1">İlanlarınızı, yayın durumlarını ve aktif kota haklarınızı yönetin.</p>
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

      {/* Listings list */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider">İlanlarım</h3>

        {listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 border border-dashed border-white/10 rounded-3xl bg-slate-950/5">
            <span className="text-4xl">🚗</span>
            <span className="text-slate-300 font-bold text-lg">Henüz hiç ilan eklememişsiniz.</span>
            <button
              onClick={() => router.push("/listings/create")}
              className="text-xs text-orange-500 font-bold hover:underline"
            >
              Hemen ilk ilanınızı ekleyin
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {listings.map((listing) => {
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
                          <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${
                            listing.status === "ACTIVE"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : listing.status === "PENDING_REVIEW"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : listing.status === "PASSIVE"
                              ? "bg-slate-800 text-slate-400"
                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }`}>
                            {listing.status}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {listing.modelYear} • {listing.kilometers.toLocaleString('tr-TR')} km • {listing.city}
                        </span>

                        {/* Dynamic Duration Badges */}
                        <div className="mt-2 text-xs flex flex-col gap-0.5">
                          {listing.status === "ACTIVE" && (
                            <span className="text-emerald-400 font-bold">
                              🟢 Yayında • Kalan süre: {remDays} gün (Bitiş: {formatDate(listing.expiresAt)})
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
                          {listing.status === "REJECTED" && (
                             <div className="flex flex-col gap-1.5 bg-red-500/10 border border-red-500/25 p-3.5 rounded-xl mt-1 w-full max-w-md">
                               <span className="text-red-450 font-bold text-xs">🔴 İlanınız Reddedildi</span>
                               {listing.rejectionReason && (
                                 <p className="text-slate-350 text-[11px] leading-relaxed">
                                   <strong className="text-slate-400">Gerekçe:</strong> {listing.rejectionReason}
                                 </p>
                               )}
                               <p className="text-[10px] text-slate-500">
                                 Lütfen ilanı düzenleyerek gerekli düzeltmeleri yapın ve onaylanması için tekrar yayınlayın.
                                </p>
                             </div>
                           )}
                           {listing.status === "PENDING_REVIEW" && (
                             <span className="text-amber-400 font-bold text-[11px]">
                               🟡 İlanınız onay bekliyor • Editörlerimiz tarafından incelenmektedir.
                             </span>
                           )}
                        </div>

                        {/* Leads Button */}
                        {listing.leads && listing.leads.length > 0 && (
                          <button
                            onClick={() => setExpandedLeads(prev => ({ ...prev, [listing.id]: !prev[listing.id] }))}
                            className="mt-2 text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-lg w-fit hover:bg-orange-500/20 transition flex items-center gap-1"
                          >
                            📩 Gelen Talepler ({listing.leads.length})
                          </button>
                        )}
                      </div>
                    </div>

                     {/* Actions Column */}
                    <div className="flex items-center gap-2">
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
                          onClick={() => handleStatusChange(listing.id, "PASSIVE")}
                          className="text-xs font-bold px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-750 transition"
                        >
                          Pasife Al
                        </button>
                      )}
                      {listing.status === "ACTIVE" && (
                        <button
                          onClick={() => handleStatusChange(listing.id, "SOLD")}
                          className="text-xs font-bold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition"
                        >
                          Satıldı İşaretle
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
        )}
      </div>
    </div>
  );
}
