"use client";

import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function EmailPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
        setNewEmail(data.email || "");
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setSaving(true);

    // Mock implementation for change email request
    setTimeout(() => {
      setMessage({ type: "success", text: "E-posta değişikliği doğrulama bağlantısı adresinize gönderildi!" });
      setSaving(false);
    }, 1000);
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
        <h1 className="text-2xl font-bold text-slate-100">E-posta Adresi</h1>
        <p className="text-slate-400 text-xs">Hesabınızın iletişim ve oturum açma e-posta adresini yönetin.</p>
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
            <label className="text-xs font-bold text-slate-400">Mevcut E-posta Adresi</label>
            <div className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-xs font-bold text-slate-400 select-none">
              {profile?.email}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400">Yeni E-posta Adresi</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              placeholder="yeni@eposta.com"
              className="w-full bg-[#05070f] border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition"
            />
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving || newEmail === profile?.email}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl text-xs font-bold cursor-pointer transition shadow-lg shadow-orange-500/10"
          >
            {saving ? "İşlem yapılıyor..." : "E-posta Adresini Güncelle"}
          </button>
        </div>
      </form>
    </div>
  );
}
