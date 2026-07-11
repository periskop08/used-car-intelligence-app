"use client";

import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [settings, setSettings] = useState<any>({
    emailMessages: true,
    emailListingUpdates: true,
    emailSavedSearchAlerts: true,
    emailSubscriptionUpdates: true,
    pushMessages: true,
    pushListingUpdates: true,
    pushSavedSearchAlerts: true,
  });

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.notificationSettings) {
          setSettings(data.notificationSettings);
        }
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

    const token = localStorage.getItem("accessToken");
    fetch(`${API_URL}/users/me/notifications`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(settings),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Bildirim ayarları güncellenemedi.");
        }
        return data;
      })
      .then((data) => {
        setMessage({ type: "success", text: "Bildirim ayarlarınız başarıyla kaydedildi!" });
        setSettings(data);
        setSaving(false);
      })
      .catch((err) => {
        setMessage({ type: "error", text: err.message });
        setSaving(false);
      });
  };

  const handleToggle = (key: string, val: boolean) => {
    setSettings((prev: any) => ({
      ...prev,
      [key]: val,
    }));
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
        <h1 className="text-2xl font-bold text-slate-100">Bildirim Ayarları</h1>
        <p className="text-slate-400 text-xs">Platform içi ve e-posta bildirim tercihlerinizi özelleştirin.</p>
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
        <div className="space-y-6">
          {/* Email Settings */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">E-posta Bildirimleri</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:border-white/10 transition">
                <input
                  type="checkbox"
                  checked={settings.emailMessages}
                  onChange={(e) => handleToggle("emailMessages", e.target.checked)}
                  className="accent-orange-500 w-4 h-4"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-300">Yeni Mesajlar</span>
                  <span className="text-[10px] text-slate-550">Alıcı veya satıcılardan yeni mesaj aldığınızda e-posta gönderilir.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:border-white/10 transition">
                <input
                  type="checkbox"
                  checked={settings.emailListingUpdates}
                  onChange={(e) => handleToggle("emailListingUpdates", e.target.checked)}
                  className="accent-orange-500 w-4 h-4"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-300">İlan Güncellemeleri</span>
                  <span className="text-[10px] text-slate-550">İlanlarınız onaylandığında veya süresi dolduğunda bilgilendirme alırsınız.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:border-white/10 transition">
                <input
                  type="checkbox"
                  checked={settings.emailSavedSearchAlerts}
                  onChange={(e) => handleToggle("emailSavedSearchAlerts", e.target.checked)}
                  className="accent-orange-500 w-4 h-4"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-300">Favori Arama Alarmları</span>
                  <span className="text-[10px] text-slate-550">Favoriye kaydettiğiniz kriterlere uygun yeni ilan yüklendiğinde bildirim alırsınız.</span>
                </div>
              </label>
            </div>
          </div>

          {/* Push Settings */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Anlık (Push) Bildirimler</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:border-white/10 transition">
                <input
                  type="checkbox"
                  checked={settings.pushMessages}
                  onChange={(e) => handleToggle("pushMessages", e.target.checked)}
                  className="accent-orange-500 w-4 h-4"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-300">Anlık Mesajlar</span>
                  <span className="text-[10px] text-slate-550">Yeni bir chat mesajı geldiğinde tarayıcı üzerinden bildirim gösterilir.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:border-white/10 transition">
                <input
                  type="checkbox"
                  checked={settings.pushListingUpdates}
                  onChange={(e) => handleToggle("pushListingUpdates", e.target.checked)}
                  className="accent-orange-500 w-4 h-4"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-300">İlan Güncellemeleri</span>
                  <span className="text-[10px] text-slate-550">İlanlarınız onaylandığında tarayıcınızda anlık uyarı alırsınız.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:border-white/10 transition">
                <input
                  type="checkbox"
                  checked={settings.pushSavedSearchAlerts}
                  onChange={(e) => handleToggle("pushSavedSearchAlerts", e.target.checked)}
                  className="accent-orange-500 w-4 h-4"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-300">Favori Arama Alarmları</span>
                  <span className="text-[10px] text-slate-550">Tarayıcınız açıkken favori aramalarınızın eşleştiği anlık bildirimleri alırsınız.</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl text-xs font-bold cursor-pointer transition shadow-lg shadow-orange-500/10"
          >
            {saving ? "Kaydediliyor..." : "Tercihleri Kaydet"}
          </button>
        </div>
      </form>
    </div>
  );
}
