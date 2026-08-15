'use client';

import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/utils/apiConfig';
import { Settings, Save, CheckCircle2 } from 'lucide-react';

export default function AdminClubSettingsPage() {
  const [settings, setSettings] = useState({
    rulesText: '',
    supportUrl: '',
    commentCharLimit: 1000,
    commentRateLimitSeconds: 10,
    dailyCommentLimit: 50,
    maxImagesPerPost: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchSettings = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error('Fetch settings error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    setSaving(true);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/settings`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        setSuccessMsg('Club ayarları başarıyla güncellendi ve Audit Log yazıldı.');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        alert('Ayarlar güncellenemedi.');
      }
    } catch (e) {
      alert('Hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono text-xs">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500 mx-auto mb-3"></div>
        <p className="text-xs font-bold font-sans">Ayarlar Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6 font-mono text-xs">
      <div className="pb-4 border-b border-white/10">
        <h1 className="text-xl font-black text-white tracking-tight font-sans">
          Club Topluluk & Güvenlik Ayarları
        </h1>
        <p className="text-xs text-slate-400 font-sans mt-1">
          Topluluk kurallarını, yorum ve görsel güvenlik limitlerini yönetin.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/60 space-y-6">
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-2 font-sans">
            Topluluk Kuralları Metni:
          </label>
          <textarea
            rows={4}
            value={settings.rulesText}
            onChange={(e) => setSettings({ ...settings, rulesText: e.target.value })}
            className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-sans"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-2 font-sans">
              Yorum Karakter Limiti:
            </label>
            <input
              type="number"
              value={settings.commentCharLimit}
              onChange={(e) => setSettings({ ...settings, commentCharLimit: Number(e.target.value) })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-2 font-sans">
              Gönderi Başına Maksimum Fotoğraf:
            </label>
            <input
              type="number"
              value={settings.maxImagesPerPost}
              onChange={(e) => setSettings({ ...settings, maxImagesPerPost: Number(e.target.value) })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-white/10">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-slate-950 font-black rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" /> Ayarları Kaydet & Audit Log Yaz
          </button>
        </div>
      </div>
    </div>
  );
}
