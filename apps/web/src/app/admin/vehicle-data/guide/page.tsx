'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Edit,
  Search,
  Image as ImageIcon,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';
import VehicleGuideCardEditor from '@/components/VehicleGuideCardEditor';
import { translateBodyType } from '@/components/VehicleGuideCardLayout';

export default function AdminVehicleGuidePage() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'published' | 'draft'>('all');

  // Live Card Editor State
  const [editingCard, setEditingCard] = useState<any | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchCards = () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('accessToken');

    fetch(`${API_BASE_URL}/admin/vehicle-guide/cards`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Araç rehberi kartları yüklenemedi.');
        return res.json();
      })
      .then((data) => setCards(Array.isArray(data) ? data : []))
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleOpenNewCard = () => {
    setEditingCard(null);
    setShowEditor(true);
  };

  const handleOpenEditCard = (card: any) => {
    setEditingCard(card);
    setShowEditor(true);
  };

  const handleSaveCard = async (payload: any) => {
    setSubmitting(true);
    const token = localStorage.getItem('accessToken');

    const url = editingCard
      ? `${API_BASE_URL}/admin/vehicle-guide/cards/${editingCard.id}`
      : `${API_BASE_URL}/admin/vehicle-guide/cards`;
    const method = editingCard ? 'PATCH' : 'POST';

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
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Araç rehberi kartı kaydedilemedi.');
      }

      setShowEditor(false);
      setEditingCard(null);
      fetchCards();
    } catch (err: any) {
      alert(err.message || 'Kaydetme sırasında bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCards = cards.filter((c) => {
    const brandName = c.brand || '';
    const modelName = c.model || '';
    const title = `${brandName} ${modelName}`;

    const query = search.toLowerCase();
    const searchMatch =
      title.toLowerCase().includes(query) ||
      brandName.toLowerCase().includes(query) ||
      modelName.toLowerCase().includes(query);

    const isPublished = c.status === 'APPROVED';

    if (filterType === 'published') return searchMatch && isPublished;
    if (filterType === 'draft') return searchMatch && !isPublished;

    return searchMatch;
  });

  const publishedCount = cards.filter((c) => c.status === 'APPROVED').length;
  const draftCount = cards.filter((c) => c.status !== 'APPROVED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Araç Rehberi Yönetimi</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Mevcut tüm Araç Rehberi araçlarını yönetin, satıra tıklayarak canlı editörde düzenleyin veya yeni rehber ekleyin.
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

      {/* FILTER & SEARCH BAR */}
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

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterType === 'all'
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-slate-950 text-slate-400 border border-white/10 hover:text-white'
            }`}
          >
            Tümü ({cards.length})
          </button>
          <button
            onClick={() => setFilterType('published')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterType === 'published'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-950 text-slate-400 border border-white/10 hover:text-white'
            }`}
          >
            Yayında ({publishedCount})
          </button>
          <button
            onClick={() => setFilterType('draft')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterType === 'draft'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-slate-950 text-slate-400 border border-white/10 hover:text-white'
            }`}
          >
            Taslak ({draftCount})
          </button>
        </div>
      </div>

      {/* ROW-BASED TABLE VIEW */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium bg-slate-900/60 rounded-2xl border border-white/5">
          Araç rehberi kartları yükleniyor...
        </div>
      ) : error ? (
        <div className="p-6 text-center text-rose-400 font-bold text-xs bg-rose-500/10 border border-rose-500/20 rounded-2xl">
          {error}
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-medium text-xs bg-slate-900/60 rounded-2xl border border-white/5">
          Kriterlerinize uygun rehber kartı bulunamadı.
        </div>
      ) : (
        <div className="bg-slate-900/80 rounded-2xl border border-white/10 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-white/10 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3.5 px-4 w-16">Görsel</th>
                  <th className="py-3.5 px-4">Marka / Model</th>
                  <th className="py-3.5 px-4">Üretim Yılları</th>
                  <th className="py-3.5 px-4">Kasa Tipi</th>
                  <th className="py-3.5 px-4">Durum</th>
                  <th className="py-3.5 px-4">Son Güncelleme</th>
                  <th className="py-3.5 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCards.map((c) => {
                  const isPublished = c.status === 'APPROVED';
                  const heroUrl = c.heroImageUrl || c.imageUrl;
                  const title = `${c.brand || ''} ${c.model || ''}`;
                  const yearStr = `${c.yearStart || ''} - ${c.yearEnd || 'Günümüz'}`;
                  const formattedDate = c.updatedAt
                    ? new Date(c.updatedAt).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : '-';

                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleOpenEditCard(c)}
                      className="hover:bg-orange-500/5 transition duration-150 cursor-pointer group"
                    >
                      {/* Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="w-12 h-9 rounded-lg bg-slate-950 border border-white/10 overflow-hidden flex items-center justify-center">
                          {heroUrl && heroUrl.trim().length > 0 ? (
                            <img src={heroUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                      </td>

                      {/* Brand / Model */}
                      <td className="py-3 px-4">
                        <div className="font-black text-white text-xs group-hover:text-orange-400 transition">
                          {title}
                        </div>
                        {c.generationCode && (
                          <span className="text-[10px] text-slate-500 font-mono">{c.generationCode}</span>
                        )}
                      </td>

                      {/* Production Years */}
                      <td className="py-3 px-4 text-slate-300 font-mono font-bold text-[11px]">
                        📅 {yearStr}
                      </td>

                      {/* Body Type (Kasa Tipi) */}
                      <td className="py-3 px-4 text-orange-300 font-bold text-[11px]">
                        🚗 {translateBodyType(c.bodyType || 'SUV')}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {isPublished ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                            🚀 Yayında
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-[10px]">
                            📝 Taslak
                          </span>
                        )}
                      </td>

                      {/* Last Updated */}
                      <td className="py-3 px-4 text-slate-400 text-[11px] font-mono">
                        {formattedDate}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditCard(c);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-orange-600 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Düzenle</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LIVE STEP-BY-STEP VEHICLE GUIDE CARD EDITOR OVERLAY */}
      {showEditor && (
        <VehicleGuideCardEditor
          initialData={editingCard}
          onClose={() => {
            setShowEditor(false);
            setEditingCard(null);
          }}
          onSave={handleSaveCard}
          submitting={submitting}
        />
      )}
    </div>
  );
}
