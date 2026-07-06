"use client";

import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function AdminListingsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Auto-login as admin on mount to get JWT token
  useEffect(() => {
    fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@usedcarintel.com",
        password: "$2b$12$demoAdminHashForTestingPassword123!",
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Admin login failed.");
        return res.json();
      })
      .then((data) => {
        setToken(data.accessToken);
        fetchAdminListings(data.accessToken);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const fetchAdminListings = (jwtToken: string) => {
    setLoading(true);
    fetch(`${API_URL}/admin/listings`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("İlanlar yüklenemedi.");
        return res.json();
      })
      .then((data) => {
        setListings(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
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
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.message || "İlan durumu güncellenemedi.");
          });
        }
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
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.message || "Fotoğraf durumu güncellenemedi.");
          });
        }
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <span className="animate-spin text-3xl">⏳</span>
        <span className="text-slate-400 font-bold text-sm">İlanlar yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-200">İLAN MODERASYONU</h1>
        <p className="text-sm text-slate-400 mt-1">Sistemdeki satılık araç ilanlarını ve fotoğraflarını inceleyip onaylayın.</p>
      </div>

      {error && <p className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">{error}</p>}

      {/* Listings Moderation List */}
      <div className="border border-slate-800 bg-slate-950/10 p-6 rounded-2xl flex flex-col gap-6">
        {listings.length === 0 ? (
          <p className="text-sm text-slate-400 italic text-center py-8">Sistemde henüz hiç ilan bulunmuyor.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {listings.map((listing) => (
              <div key={listing.id} className="border border-slate-800/80 bg-slate-900/10 p-5 rounded-xl flex flex-col gap-4">
                {/* Header Information */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-extrabold text-slate-200 text-sm">{listing.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Satıcı: <strong className="text-slate-300">{listing.seller?.email}</strong> • Konum: {listing.city} • Varyant ID: {listing.vehicleVariantId || "Seçilmemiş"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      listing.status === "ACTIVE"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : listing.status === "PENDING_REVIEW"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-slate-800 text-slate-400"
                    }`}>
                      {listing.status}
                    </span>
                    <span className="text-xs font-black text-orange-400">
                      {Number(listing.priceAmount).toLocaleString('tr-TR')} {listing.currency}
                    </span>
                  </div>
                </div>

                {/* Body Content Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-300">
                  <div className="flex flex-col gap-1 bg-slate-950/20 p-3 rounded-lg border border-slate-850">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Araç Detayları</span>
                    <span>Yıl: {listing.modelYear}</span>
                    <span>KM: {listing.kilometers.toLocaleString('tr-TR')} km</span>
                    <span>Yakıt: {listing.fuelType || "Belirtilmedi"}</span>
                    <span>Şanzıman: {listing.transmission || "Belirtilmedi"}</span>
                  </div>

                  <div className="flex flex-col gap-1 bg-slate-950/20 p-3 rounded-lg border border-slate-850">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Boya & Hasar Durumu</span>
                    <span>Tramer: {listing.tramerAmount > 0 ? `${listing.tramerAmount.toLocaleString('tr-TR')} TL` : "Hasarsız"}</span>
                    <span className="line-clamp-2">Hasar Detayı: {listing.damageRecord || "Yok"}</span>
                    <span className="line-clamp-1">Boyalı Parçalar: {listing.paintedParts && listing.paintedParts.length > 0 ? listing.paintedParts.join(', ') : "Yok"}</span>
                  </div>

                  {/* Approve / Reject Controls */}
                  <div className="flex flex-col justify-center gap-2">
                    {listing.status === "PENDING_REVIEW" && (
                      <div className="flex gap-2">
                        <button
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(listing.id, "ACTIVE")}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2 rounded-lg text-xs transition"
                        >
                          Onayla (ACTIVE)
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(listing.id, "REJECTED")}
                          className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-2 rounded-lg text-xs transition"
                        >
                          Reddet
                        </button>
                      </div>
                    )}
                    {listing.status === "ACTIVE" && (
                      <button
                        disabled={actionLoading}
                        onClick={() => handleUpdateStatus(listing.id, "PASSIVE")}
                        className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-400 font-bold py-2 rounded-lg text-xs transition"
                      >
                        Pasife Al
                      </button>
                    )}
                  </div>
                </div>

                {/* Associated Media Uploads */}
                <div className="flex flex-col gap-2 border-t border-slate-800/60 pt-3">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Yüklenen Fotoğraflar & Moderasyon</span>
                  {listing.media && listing.media.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-1">
                      {listing.media.map((img: any) => (
                        <div key={img.id} className="relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-850 group">
                          <img src={img.url} alt="Listing asset" className="w-full h-full object-cover" />
                          
                          {/* Moderation Overlay Actions */}
                          <div className="absolute inset-0 bg-black/75 flex flex-col justify-center gap-1.5 p-2 opacity-0 group-hover:opacity-100 transition duration-200">
                            <span className="text-[8px] font-bold text-center text-slate-400">Moderasyon</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleUpdateMediaModeration(listing.id, img.id, "APPROVED")}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-1 rounded text-[8px] transition"
                              >
                                Onay
                              </button>
                              <button
                                onClick={() => handleUpdateMediaModeration(listing.id, img.id, "REJECTED")}
                                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-1 rounded text-[8px] transition"
                              >
                                Red
                              </button>
                            </div>
                          </div>

                          {/* Moderation status indicator */}
                          <span className={`absolute bottom-2 left-2 text-[8px] font-bold px-1.5 py-0.5 rounded ${
                            img.moderationStatus === "APPROVED"
                              ? "bg-emerald-500 text-white"
                              : img.moderationStatus === "REJECTED"
                              ? "bg-red-500 text-white"
                              : "bg-amber-500 text-black"
                          }`}>
                            {img.moderationStatus}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic">İlanda henüz hiç görsel yüklü değil.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
