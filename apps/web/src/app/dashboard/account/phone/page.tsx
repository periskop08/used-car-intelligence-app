"use client";

import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function PhonePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const fetchProfile = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
        setPhone(data.phone || "");
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setSaving(true);

    const token = localStorage.getItem("accessToken");
    fetch(`${API_URL}/users/me/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ phone: phone || null }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Telefon numarası güncellenemedi.");
        }
        return data;
      })
      .then(() => {
        setMessage({ type: "success", text: "Telefon numaranız başarıyla güncellendi!" });
        setSaving(false);
        fetchProfile();
      })
      .catch((err) => {
        setMessage({ type: "error", text: err.message });
        setSaving(false);
      });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Telefon Numarası</h1>
        <p className="text-slate-400 text-xs">Hesabınıza kayıtlı telefon numarasını düzenleyin ve doğrulayın.</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-2xl text-xs font-bold ${
          message.type === "success" 
            ? "bg-green-500/10 text-green-400 border border-green-500/20" 
            : "bg-red-500/10 text-red-400 border border-red-500/20"
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="glass border border-white/5 rounded-3xl bg-[#090d1a]/45 backdrop-blur-md p-6 space-y-6">
        <div className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400">Telefon Numarası</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+90 5xx xxx xx xx"
              className="w-full bg-[#05070f] border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition"
            />
            <div className="flex items-center justify-between gap-4 mt-2">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                profile?.phoneVerifiedAt 
                  ? "bg-green-500/20 text-green-400" 
                  : "bg-amber-500/20 text-amber-400"
              }`}>
                {profile?.phoneVerifiedAt ? "Doğrulandı" : "Doğrulanmadı"}
              </span>
              {!profile?.phoneVerifiedAt && phone && (
                <button
                  type="button"
                  onClick={() => alert("Doğrulama kodu telefonunuza SMS olarak gönderildi. (Simülasyon)")}
                  className="text-[10px] font-bold text-orange-400 hover:underline"
                >
                  Doğrulama Kodu Gönder
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving || phone === profile?.phone}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl text-xs font-bold cursor-pointer transition shadow-lg shadow-orange-500/10"
          >
            {saving ? "Güncelleniyor..." : "Numarayı Güncelle"}
          </button>
        </div>
      </form>
    </div>
  );
}
