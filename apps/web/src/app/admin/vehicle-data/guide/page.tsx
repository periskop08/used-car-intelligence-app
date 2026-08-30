'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Edit,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Search,
  Link as LinkIcon,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';
import VehicleGuideCardEditor from '@/components/VehicleGuideCardEditor';

export default function AdminVehicleGuidePage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'published' | 'draft' | 'discovery'>('all');

  // Live Card Editor State
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const handleOpenNewCard = () => {
    setEditingProfile(null);
    setShowEditor(true);
  };

  const handleOpenEditCard = (profile: any) => {
    setEditingProfile(profile);
    setShowEditor(true);
  };

  const handleSaveProfile = async (payload: any) => {
    setSubmitting(true);
    const token = localStorage.getItem('accessToken');

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

      setShowEditor(false);
      setEditingProfile(null);
      fetchProfiles();
    } catch (err: any) {
      alert(err.message || 'Kaydetme sırasında bir hata oluştu.');
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
        body: JSON.stringify({ showInGuide: !currentStatus }),
      });
      if (!res.ok) throw new Error('Yayın durumu güncellenemedi.');
      fetchProfiles();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const brandName = p.brand || p.brandName || '';
    const modelName = p.model || p.modelName || '';
    const title = p.title || `${brandName} ${modelName}`;
    const variantId = p.variantId || p.vehicleVariantId || p.variantMappings?.[0]?.variantId || '';

    const query = search.toLowerCase();
    const searchMatch =
      title.toLowerCase().includes(query) ||
      brandName.toLowerCase().includes(query) ||
      modelName.toLowerCase().includes(query) ||
      variantId.toLowerCase().includes(query);

    const isGuideVisible = p.showInGuide ?? p.isGuideVisible ?? true;
    const isDiscoveryVisible = p.showInDiscovery ?? p.isDiscoveryVisible ?? true;

    if (filterType === 'published') return searchMatch && isGuideVisible;
    if (filterType === 'draft') return searchMatch && !isGuideVisible;
    if (filterType === 'discovery') return searchMatch && isDiscoveryVisible;

    return searchMatch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Araç Rehberi Yönetimi</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Kullanıcılara gösterilen Araç Rehberi kartlarının canlı WYSIWYG editörü ile yönetimi.
          </p>
        </div>
        <button
          onClick={handleOpenNewCard}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-lg shadow-orange-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>+ Yeni Araç Rehberi Kartı</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-1 min-w-[280px] items-center gap-2 px-3.5 py-2 bg-slate-950 rounded-xl border border-white/10 focus-within:border-orange-500/50 transition">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Araç marka, model, rehber başlığı veya Variant ID ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
          <button
            onClick={() => setFilterType('discovery')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterType === 'discovery'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-950 text-slate-400 border border-white/10 hover:text-white'
            }`}
          >
            Keşfet'te
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
      ) : filteredProfiles.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-medium text-xs bg-slate-900/60 rounded-2xl border border-white/5">
          Kriterlerinize uygun rehber kartı bulunamadı.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProfiles.map((p) => {
            const isGuideVisible = p.showInGuide ?? p.isGuideVisible ?? true;
            const heroUrl = p.heroImageUrl || p.imageUrl || p.photoUrl;
            const title = p.brand && p.model ? `${p.brand} ${p.model}` : p.title || 'İsimsiz Araç';
            const yearStr = `${p.yearStart || ''} - ${p.yearEnd || 'Günümüz'}`;
            const variantId = p.variantId || p.vehicleVariantId || p.variantMappings?.[0]?.variantId || '';

            return (
              <div
                key={p.id}
                className="bg-slate-900/80 rounded-2xl border border-white/10 overflow-hidden flex flex-col justify-between hover:border-orange-500/40 transition group"
              >
                {/* Card Image Thumbnail */}
                <div className="relative h-44 bg-slate-950 overflow-hidden flex items-center justify-center">
                  {heroUrl ? (
                    <img
                      src={heroUrl}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-600 gap-2">
                      <ImageIcon className="w-8 h-8" />
                      <span className="text-[10px] font-bold">Görsel Yok</span>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {isGuideVisible ? (
                      <span className="px-2.5 py-1 bg-emerald-500/90 backdrop-blur-md text-white font-black text-[9px] rounded-lg shadow-lg">
                        YAYINDA
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-amber-500/90 backdrop-blur-md text-white font-black text-[9px] rounded-lg shadow-lg">
                        TASLAK
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Info Body */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-orange-400 mb-1">
                      <span>🚗 {p.bodyType || 'SUV'}</span>
                      <span className="text-slate-400 font-mono">📅 {yearStr}</span>
                    </div>
                    <h3 className="font-black text-sm text-white uppercase line-clamp-1">
                      {title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed italic">
                      "{p.guideSummary || p.shortSummary || p.summary || 'Özet açıklama bulunmuyor.'}"
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <LinkIcon className="w-3 h-3 text-orange-400" />
                      <span>Variant ID: {variantId ? variantId.slice(0, 8) : 'Bağsız'}</span>
                    </span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-slate-950/80 border-t border-white/5 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenEditCard(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-orange-600 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Düzenle</span>
                  </button>

                  <button
                    onClick={() => handleTogglePublish(p.id, isGuideVisible)}
                    className={`p-2 rounded-xl border transition cursor-pointer ${
                      isGuideVisible
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                    }`}
                    title={isGuideVisible ? 'Yayından Kaldır (Taslak Yap)' : 'Yayınla'}
                  >
                    {isGuideVisible ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIVE STEP-BY-STEP VEHICLE GUIDE CARD EDITOR OVERLAY */}
      {showEditor && (
        <VehicleGuideCardEditor
          initialData={editingProfile}
          onClose={() => {
            setShowEditor(false);
            setEditingProfile(null);
          }}
          onSave={handleSaveProfile}
          submitting={submitting}
        />
      )}
    </div>
  );
}
