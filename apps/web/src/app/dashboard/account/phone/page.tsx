"use client";

import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function PhonePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [phone3, setPhone3] = useState("");
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
        setPhone2(data.phone2 || "");
        setPhone3(data.phone3 || "");
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
      body: JSON.stringify({
        phone: phone || null,
        phone2: phone2 || null,
        phone3: phone3 || null,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Telefon numaraları güncellenemedi.");
        }
        return data;
      })
      .then(() => {
        setMessage({ type: "success", text: "Telefon numaralarınız başarıyla güncellendi!" });
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

  const isUnchanged =
    phone === (profile?.phone || "") &&
    phone2 === (profile?.phone2 || "") &&
    phone3 === (profile?.phone3 || "");

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-100">Telefon Numaraları</h1>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
            Maks. 3 Telefon
          </span>
        </div>
        <p className="text-slate-400 text-xs mt-1">
          Hesabınıza kayıtlı telefon numaralarını düzenleyin. İlanlarınızda alıcıların size kolayca ulaşabilmesi için 3 numaraya kadar ekleyebilirsiniz.
        </p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Telefon 1 */}
          <div className="space-y-1.5 bg-[#05070f]/60 p-4 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">1. Telefon (Birincil / Cep)</label>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                profile?.phoneVerifiedAt 
                  ? "bg-green-500/20 text-green-400" 
                  : "bg-amber-500/20 text-amber-400"
              }`}>
                {profile?.phoneVerifiedAt ? "Doğrulandı" : "Doğrulanmadı"}
              </span>
            </div>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+90 5xx xxx xx xx"
              className="w-full bg-[#090d1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition"
            />
            <p className="text-[10px] text-slate-500">Hesap ve birincil iletişim numaranız.</p>
            {!profile?.phoneVerifiedAt && phone && (
              <button
                type="button"
                onClick={() => alert("Doğrulama kodu telefonunuza SMS olarak gönderildi. (Simülasyon)")}
                className="text-[10px] font-bold text-orange-400 hover:underline pt-1 inline-block"
              >
                Doğrulama Kodu Gönder
              </button>
            )}
          </div>

          {/* Telefon 2 */}
          <div className="space-y-1.5 bg-[#05070f]/60 p-4 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">2. Telefon (Ofis / Sabit / Yetkili)</label>
              <span className="text-[9px] font-medium text-slate-500">Opsiyonel</span>
            </div>
            <input
              type="text"
              value={phone2}
              onChange={(e) => setPhone2(e.target.value)}
              placeholder="+90 2xx xxx xx xx veya +90 5xx..."
              className="w-full bg-[#090d1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition"
            />
            <p className="text-[10px] text-slate-500">Galeri/ofis sabit hattı veya 2. yetkili no.</p>
          </div>

          {/* Telefon 3 */}
          <div className="space-y-1.5 bg-[#05070f]/60 p-4 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">3. Telefon (Ortak / Satış / Destek)</label>
              <span className="text-[9px] font-medium text-slate-500">Opsiyonel</span>
            </div>
            <input
              type="text"
              value={phone3}
              onChange={(e) => setPhone3(e.target.value)}
              placeholder="+90 5xx xxx xx xx"
              className="w-full bg-[#090d1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition"
            />
            <p className="text-[10px] text-slate-500">Şirket ortağı veya 3. yetkili no.</p>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving || isUnchanged}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl text-xs font-bold cursor-pointer transition shadow-lg shadow-orange-500/10"
          >
            {saving ? "Güncelleniyor..." : "Numaraları Kaydet"}
          </button>
        </div>
      </form>
    </div>
  );
}
