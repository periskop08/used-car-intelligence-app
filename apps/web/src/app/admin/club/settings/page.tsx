"use client";

import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function AdminClubSettingsPage() {
  const [settings, setSettings] = useState({
    rulesText: "",
    supportUrl: "",
    commentCharLimit: 1000,
    commentRateLimitSeconds: 10,
    dailyCommentLimit: 50,
    maxImagesPerPost: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/club/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/club/settings`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        alert("Club ayarları başarıyla güncellendi!");
      } else {
        alert("Ayarlar güncellenemedi.");
      }
    } catch (e) {
      alert("Hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500 mx-auto mb-3"></div>
        <p className="text-xs font-bold">Ayarlar Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-black text-white">Club Topluluk Ayarları</h2>
        <p className="text-xs text-slate-400">
          Topluluk kurallarını, yorum ve görsel güvenlik limitlerini yönetin.
        </p>
      </div>

      <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/60 space-y-6">
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-2">
            Topluluk Kuralları Metni:
          </label>
          <textarea
            rows={4}
            value={settings.rulesText}
            onChange={(e) => setSettings({ ...settings, rulesText: e.target.value })}
            className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-300 block mb-2">
            Destek ve Yardım URL'si:
          </label>
          <input
            type="text"
            value={settings.supportUrl}
            onChange={(e) => setSettings({ ...settings, supportUrl: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Yorum Karakter Limiti (100 - 3000):
            </label>
            <input
              type="number"
              min={100}
              max={3000}
              value={settings.commentCharLimit}
              onChange={(e) =>
                setSettings({ ...settings, commentCharLimit: Number(e.target.value) })
              }
              className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Yorum Rate Limit Saniyesi (5 - 60 sn):
            </label>
            <input
              type="number"
              min={5}
              max={60}
              value={settings.commentRateLimitSeconds}
              onChange={(e) =>
                setSettings({ ...settings, commentRateLimitSeconds: Number(e.target.value) })
              }
              className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Günlük Yorum Limiti (1 - 100):
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={settings.dailyCommentLimit}
              onChange={(e) =>
                setSettings({ ...settings, dailyCommentLimit: Number(e.target.value) })
              }
              className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Maksimum Görsel Sayısı (1 - 10):
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={settings.maxImagesPerPost}
              onChange={(e) =>
                setSettings({ ...settings, maxImagesPerPost: Number(e.target.value) })
              }
              className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex justify-end">
          <button
            disabled={saving}
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-black text-xs shadow-lg shadow-orange-500/20 transition"
          >
            {saving ? "Kaydediliyor..." : "Ayarları Kaydet 💾"}
          </button>
        </div>
      </div>
    </div>
  );
}
