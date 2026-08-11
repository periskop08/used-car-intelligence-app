'use client';

import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Plus,
  Edit,
  Eye,
  CheckCircle2,
  XCircle,
  Archive,
  Image as ImageIcon,
  Search,
  X,
  Check,
  Link as LinkIcon,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

export default function AdminVehicleGuidePage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'published' | 'draft'>('all');

  // Edit Modal State
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    vehicleVariantId: '',
    title: '',
    shortSummary: '',
    imageUrl: '',
    isGuideVisible: true,
    isDiscoveryVisible: true,
    highlights: '',
  });

  const fetchProfiles = () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('accessToken');

    fetch(`${API_BASE_URL}/admin/vehicle-profiles`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Araç rehberi profilleri yüklenemedi.');
        return res.json();
      })
      .then((data) => setProfiles(Array.isArray(data) ? data : []))
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const openNewModal = () => {
    setEditingProfile(null);
    setForm({
      vehicleVariantId: '',
      title: '',
      shortSummary: '',
      imageUrl: '',
      isGuideVisible: true,
      isDiscoveryVisible: true,
      highlights: '',
    });
    setShowEditModal(true);
  };

  const openEditModal = (p: any) => {
    setEditingProfile(p);
    setForm({
      vehicleVariantId: p.variantId || p.vehicleVariantId || '',
      title: p.title || `${p.brandName || ''} ${p.modelName || ''}`.trim(),
      shortSummary: p.shortSummary || p.summary || '',
      imageUrl: p.imageUrl || p.photoUrl || '',
      isGuideVisible: p.isGuideVisible ?? true,
      isDiscoveryVisible: p.isDiscoveryVisible ?? true,
      highlights: Array.isArray(p.highlights) ? p.highlights.join(', ') : p.highlights || '',
    });
    setShowEditModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const token = localStorage.getItem('accessToken');

    const payload = {
      ...form,
      highlights: form.highlights.split(',').map((s) => s.trim()).filter(Boolean),
    };

    const url = editingProfile
      ? `${API_BASE_URL}/admin/vehicle-profiles/${editingProfile.id}`
      : `${API_BASE_URL}/admin/vehicle-profiles`;
    const method = editingProfile ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Araç rehberi kartı kaydedilemedi.');
      }

      setShowEditModal(false);
      fetchProfiles();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (profileId: string, currentStatus: boolean) => {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`${API_BASE_URL}/admin/vehicle-profiles/${profileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isGuideVisible: !currentStatus }),
      });
      if (!res.ok) throw new Error('Yayın durumu güncellenemedi.');
      fetchProfiles();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = profiles.filter((p) => {
    const titleMatch = `${p.title || ''} ${p.brandName || ''} ${p.modelName || ''}`
      .toLowerCase()
      .includes(search.toLowerCase());
    if (filterType === 'published') return titleMatch && p.isGuideVisible;
    if (filterType === 'draft') return titleMatch && !p.isGuideVisible;
    return titleMatch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Araç Rehberi Yönetimi</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Kullanıcılara gösterilen Araç Rehberi editoryal kartlarının canlı görsel yönetimi.
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-orange-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>+ Yeni Rehber Kartı</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-1 min-w-[280px] items-center gap-2 px-3.5 py-2 bg-slate-950 rounded-xl border border-white/10 focus-within:border-orange-500/50 transition">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Araç marka, model veya rehber başlığı ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterType === 'all'
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-slate-950 text-slate-400 border border-white/10 hover:text-white'
            }`}
          >
            Tümü ({profiles.length})
          </button>
          <button
            onClick={() => setFilterType('published')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterType === 'published'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-950 text-slate-400 border border-white/10 hover:text-white'
            }`}
          >
            Yayında
          </button>
          <button
            onClick={() => setFilterType('draft')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterType === 'draft'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-slate-950 text-slate-400 border border-white/10 hover:text-white'
            }`}
          >
            Taslak / Gizli
          </button>
        </div>
      </div>

      {/* CARD GRID VIEW */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium bg-slate-900/60 rounded-2xl border border-white/5">
          Araç rehberi kartları yükleniyor...
        </div>
      ) : error ? (
        <div className="p-6 text-center text-rose-400 font-bold text-xs bg-rose-500/10 border border-rose-500/20 rounded-2xl">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-medium text-xs bg-slate-900/60 rounded-2xl border border-white/5">
          Kriterlerinize uygun rehber kartı bulunamadı.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="bg-slate-900/80 rounded-2xl border border-white/10 overflow-hidden flex flex-col justify-between hover:border-orange-500/40 transition group"
            >
              {/* Card Image */}
              <div className="relative h-44 bg-slate-950 overflow-hidden flex items-center justify-center">
                {p.imageUrl || p.photoUrl ? (
                  <img
                    src={p.imageUrl || p.photoUrl}
                    alt={p.title || 'Vehicle'}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-600 gap-2">
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-[10px] font-bold">Görsel Yok</span>
                  </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  {p.isGuideVisible ? (
                    <span className="px-2.5 py-1 bg-emerald-500/90 backdrop-blur-md text-white font-bold text-[10px] rounded-lg shadow-lg">
                      YAYINDA
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-amber-500/90 backdrop-blur-md text-white font-bold text-[10px] rounded-lg shadow-lg">
                      TASLAK
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white line-clamp-1">
                    {p.title || `${p.brandName || ''} ${p.modelName || ''}`}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {p.shortSummary || p.summary || 'Özet açıklama eklenmemiş.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span className="flex items-center gap-1">
                    <LinkIcon className="w-3 h-3 text-orange-400" />
                    <span>Variant ID: {(p.variantId || p.vehicleVariantId || 'bağsız').slice(0, 8)}</span>
                  </span>
                </div>
              </div>

              {/* Card Actions Footer */}
              <div className="p-3 bg-slate-950/80 border-t border-white/5 flex items-center justify-between gap-2">
                <button
                  onClick={() => openEditModal(p)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-800 hover:bg-orange-500 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Düzenle</span>
                </button>

                <button
                  onClick={() => handleTogglePublish(p.id, p.isGuideVisible)}
                  className={`p-1.5 rounded-xl border transition cursor-pointer ${
                    p.isGuideVisible
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                  }`}
                  title={p.isGuideVisible ? 'Yayından Kaldır (Taslak Yap)' : 'Yayınla'}
                >
                  {p.isGuideVisible ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDIT / CREATE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-xl w-full bg-[#0b0f19] border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white">
                {editingProfile ? 'Araç Rehberi Kartını Düzenle' : '+ Yeni Araç Rehberi Kartı'}
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Araç Varyant ID (Linked Technical Identity)
                </label>
                <input
                  type="text"
                  placeholder="Araç Varyant Veritabanı ID'sini yapıştırın..."
                  value={form.vehicleVariantId}
                  onChange={(e) => setForm({ ...form, vehicleVariantId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Kart Başlığı</label>
                <input
                  type="text"
                  placeholder="Örn: Toyota Corolla 1.5 Passion X-Pack (2022)"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Görsel URL (Cloudflare R2 veya CDN)</label>
                <input
                  type="text"
                  placeholder="https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/..."
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white outline-none"
                />
                {form.imageUrl && (
                  <div className="mt-2 h-32 rounded-xl overflow-hidden bg-slate-950 border border-white/10 flex items-center justify-center">
                    <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Kısa Özet & Editoryal Not</label>
                <textarea
                  rows={3}
                  placeholder="Araç hakkında genel yayın özeti..."
                  value={form.shortSummary}
                  onChange={(e) => setForm({ ...form, shortSummary: e.target.value })}
                  className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Öne Çıkan Özellikler (Virgülle ayırın)</label>
                <input
                  type="text"
                  placeholder="Örn: Düşük Yakıt Tüketimi, Yüksek İkinci El Değeri, Konforlu Sürüş"
                  value={form.highlights}
                  onChange={(e) => setForm({ ...form, highlights: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isGuideVisible}
                    onChange={(e) => setForm({ ...form, isGuideVisible: e.target.checked })}
                    className="accent-orange-500"
                  />
                  <span>Araç Rehberi'nde Yayınla</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isDiscoveryVisible}
                    onChange={(e) => setForm({ ...form, isDiscoveryVisible: e.target.checked })}
                    className="accent-orange-500"
                  />
                  <span>Aracını Bul / Keşfet'te Görünsün</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-900 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-40"
                >
                  {submitting ? 'Kaydediliyor...' : 'Kartı Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
