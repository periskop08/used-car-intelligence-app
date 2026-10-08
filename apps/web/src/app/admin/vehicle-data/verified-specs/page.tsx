'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Database,
  Search,
  Edit2,
  Trash2,
  Save,
  X,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Car,
  Bike,
  Truck,
  Layers,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

interface VerifiedSpecItem {
  id: string;
  vehicleType: string;
  brand: string;
  model: string;
  year?: number | null;
  bodyType?: string | null;
  engine?: string | null;
  fuelType?: string | null;
  transmission?: string | null;
  trim?: string | null;
  variantId?: string | null;
  modelId?: string | null;
  displacementCc: number;
  powerHp: number;
  candidatePowers?: number[];
  powerRange?: string | null;
  verificationStatus: string;
  verificationSource: string;
  sourceUrl?: string | null;
  notes?: string | null;
  verifiedAt: string;
  createdAt: string;
}

interface SpecStats {
  total: number;
  cars: number;
  suvs: number;
  commercials: number;
  motorcycles: number;
  verifiedLast24h: number;
}

const VEHICLE_TYPE_TABS = [
  { key: '', label: 'Tümü' },
  { key: 'CAR', label: 'Otomobil' },
  { key: 'SUV', label: 'Arazi, SUV & Pickup' },
  { key: 'COMMERCIAL', label: 'Minivan & Panelvan' },
  { key: 'MOTORCYCLE', label: 'Motosiklet' },
];

export default function VerifiedSpecLibraryPage() {
  const [items, setItems] = useState<VerifiedSpecItem[]>([]);
  const [stats, setStats] = useState<SpecStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<VerifiedSpecItem | null>(null);
  const [editDisplacement, setEditDisplacement] = useState<number>(0);
  const [editPower, setEditPower] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/vehicle-data/verified-specs/stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Stats loading failed:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (selectedType) params.append('vehicleType', selectedType);
    if (statusFilter) params.append('status', statusFilter);
    params.append('page', page.toString());
    params.append('limit', '20');

    try {
      const res = await fetch(`${API_BASE_URL}/admin/vehicle-data/verified-specs?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Doğrulanan teknik veriler yüklenemedi.');
      const data = await res.json();
      setItems(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, selectedType, statusFilter, page]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleOpenEdit = (item: VerifiedSpecItem) => {
    setEditingItem(item);
    setEditDisplacement(item.displacementCc);
    setEditPower(item.powerHp);
    setEditNotes(item.notes || '');
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setSavingEdit(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/vehicle-data/verified-specs/${editingItem.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          displacementCc: editDisplacement,
          powerHp: editPower,
          notes: editNotes,
        }),
      });

      if (!res.ok) throw new Error('Güncelleme başarısız oldu.');
      showToast('Teknik veriler başarıyla güncellendi.');
      setEditingItem(null);
      fetchItems();
      fetchStats();
    } catch (err: any) {
      alert(err.message || 'Hata oluştu');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu doğrulanmış kütüphane kaydını silmek istediğinize emin misiniz?')) return;
    setDeletingId(id);
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/vehicle-data/verified-specs/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Silme işlemi başarısız oldu.');
      showToast('Kayıt kütüphaneden silindi.');
      fetchItems();
      fetchStats();
    } catch (err: any) {
      alert(err.message || 'Hata oluştu');
    } finally {
      setDeletingId(null);
    }
  };

  const getVehicleTypeIcon = (type: string) => {
    switch (type) {
      case 'MOTORCYCLE':
        return <Bike className="w-4 h-4 text-emerald-400" />;
      case 'COMMERCIAL':
        return <Truck className="w-4 h-4 text-amber-400" />;
      case 'SUV':
        return <Layers className="w-4 h-4 text-purple-400" />;
      default:
        return <Car className="w-4 h-4 text-blue-400" />;
    }
  };

  const getVehicleTypeLabel = (type: string) => {
    switch (type) {
      case 'MOTORCYCLE':
        return 'Motosiklet';
      case 'COMMERCIAL':
        return 'Minivan & Panelvan';
      case 'SUV':
        return 'Arazi, SUV & Pickup';
      default:
        return 'Otomobil';
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6 text-slate-100">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-semibold animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle className="w-4 h-4" />
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-orange-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Doğrulanan Teknik Veri Kütüphanesi
                <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  Canlı AI & Katalog Önbelleği
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Kullanıcılar ilan verirken veya sorgulama yaparken doğrulanan Motor Hacmi (cc) ve Motor Gücü (HP) kayıtları burada saklanır ve anında sunulur.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            fetchStats();
            fetchItems();
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-white/10 hover:border-white/20 rounded-xl text-xs font-bold text-slate-200 transition hover:bg-slate-800"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-[#0f1523] border border-white/10 p-4 rounded-2xl relative overflow-hidden">
          <div className="text-xs text-slate-400 font-semibold">Toplam Doğrulanan</div>
          <div className="text-2xl font-black text-white mt-1">
            {statsLoading ? '...' : (stats?.total || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Tüm Vasıta Tipleri</div>
        </div>

        <div className="bg-[#0f1523] border border-white/10 p-4 rounded-2xl relative overflow-hidden">
          <div className="text-xs text-blue-400 font-semibold flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5" /> Otomobil
          </div>
          <div className="text-2xl font-black text-blue-100 mt-1">
            {statsLoading ? '...' : (stats?.cars || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Binek Araçlar</div>
        </div>

        <div className="bg-[#0f1523] border border-white/10 p-4 rounded-2xl relative overflow-hidden">
          <div className="text-xs text-purple-400 font-semibold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Arazi & SUV
          </div>
          <div className="text-2xl font-black text-purple-100 mt-1">
            {statsLoading ? '...' : (stats?.suvs || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">4x4 & Pickup</div>
        </div>

        <div className="bg-[#0f1523] border border-white/10 p-4 rounded-2xl relative overflow-hidden">
          <div className="text-xs text-amber-400 font-semibold flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" /> Minivan & Panelvan
          </div>
          <div className="text-2xl font-black text-amber-100 mt-1">
            {statsLoading ? '...' : (stats?.commercials || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Hafif Ticari</div>
        </div>

        <div className="bg-[#0f1523] border border-white/10 p-4 rounded-2xl relative overflow-hidden">
          <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
            <Bike className="w-3.5 h-3.5" /> Motosiklet
          </div>
          <div className="text-2xl font-black text-emerald-100 mt-1">
            {statsLoading ? '...' : (stats?.motorcycles || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">50cc - 2500cc</div>
        </div>

        <div className="bg-[#0f1523] border border-white/10 p-4 rounded-2xl relative overflow-hidden">
          <div className="text-xs text-orange-400 font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Son 24 Saat
          </div>
          <div className="text-2xl font-black text-orange-200 mt-1">
            {statsLoading ? '...' : (stats?.verifiedLast24h || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Yeni Doğrulamalar</div>
        </div>
      </div>

      {/* Tabs & Search Controls */}
      <div className="bg-[#0f1523] border border-white/10 rounded-2xl p-4 space-y-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-3">
          {VEHICLE_TYPE_TABS.map((tab) => {
            const active = selectedType === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setSelectedType(tab.key);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  active
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.key === 'MOTORCYCLE' && <Bike className="w-3.5 h-3.5" />}
                {tab.key === 'COMMERCIAL' && <Truck className="w-3.5 h-3.5" />}
                {tab.key === 'SUV' && <Layers className="w-3.5 h-3.5" />}
                {tab.key === 'CAR' && <Car className="w-3.5 h-3.5" />}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filter bar */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Marka, model veya motor adına göre ara..."
              className="w-full bg-[#0a0e17] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
            >
              <option value="">Tüm Durumlar</option>
              <option value="VERIFIED">VERIFIED (Doğrulanmış)</option>
              <option value="PENDING">PENDING (Beklemede)</option>
              <option value="MANUAL_OVERRIDE">MANUAL_OVERRIDE (Manuel Düzeltme)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#0f1523] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0a0e17] border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Vasıta Tipi</th>
                <th className="py-3 px-4">Marka & Model</th>
                <th className="py-3 px-4">Yıl</th>
                <th className="py-3 px-4">Motor / Donanım</th>
                <th className="py-3 px-4 text-right">Motor Hacmi</th>
                <th className="py-3 px-4 text-right">Motor Gücü</th>
                <th className="py-3 px-4">Doğrulama Kaynağı</th>
                <th className="py-3 px-4">Tarih</th>
                <th className="py-3 px-4 text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-orange-400" />
                      Doğrulanmış teknik veriler taranıyor...
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle className="w-8 h-8 text-amber-500/60" />
                      <span>Seçilen filtrelere uygun doğrulanmış teknik kayıt bulunamadı.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition">
                    {/* Vehicle Type */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-semibold text-[11px]">
                        {getVehicleTypeIcon(item.vehicleType)}
                        {getVehicleTypeLabel(item.vehicleType)}
                      </span>
                    </td>

                    {/* Brand & Model */}
                    <td className="py-3 px-4 font-bold text-white">
                      <div>
                        {item.brand} {item.model}
                      </div>
                      {item.variantId && (
                        <div className="text-[10px] font-mono text-slate-500 font-normal">
                          ID: {item.variantId.slice(0, 8)}...
                        </div>
                      )}
                    </td>

                    {/* Year */}
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {item.year || '—'}
                    </td>

                    {/* Engine / Trim */}
                    <td className="py-3 px-4 text-slate-300">
                      <div className="font-semibold text-slate-200">
                        {item.engine || '—'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {[item.bodyType, item.trim].filter(Boolean).join(' • ') || '—'}
                      </div>
                    </td>

                    {/* Displacement */}
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono font-bold">
                        {item.displacementCc > 0 ? `${item.displacementCc} cc` : '—'}
                      </span>
                    </td>

                    {/* Power */}
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold">
                        {item.powerHp > 0 ? `${item.powerHp} HP` : '—'}
                      </span>
                    </td>

                    {/* Verification Source */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 font-semibold text-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span className="truncate max-w-[130px]">{item.verificationSource}</span>
                      </div>
                      {item.notes && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[180px]" title={item.notes}>
                          {item.notes}
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-slate-400 text-[11px] font-mono">
                      {new Date(item.verifiedAt || item.createdAt).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition"
                          title="Teknik Verileri Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-400 transition disabled:opacity-30"
                          title="Kütüphaneden Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-[#0a0e17] border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div>
            Toplam <span className="text-white font-bold">{totalCount}</span> doğrulanmış kayıt (Sayfa {page} / {totalPages})
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 text-white hover:bg-white/10 transition"
            >
              Önceki
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 text-white hover:bg-white/10 transition"
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1523] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Teknik Veri Düzenleme</h3>
                <p className="text-xs text-slate-400">
                  {editingItem.brand} {editingItem.model} ({editingItem.year})
                </p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold uppercase text-[10px]">
                  Motor Hacmi (cc)
                </label>
                <input
                  type="number"
                  value={editDisplacement}
                  onChange={(e) => setEditDisplacement(Number(e.target.value))}
                  className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold uppercase text-[10px]">
                  Motor Gücü (HP)
                </label>
                <input
                  type="number"
                  value={editPower}
                  onChange={(e) => setEditPower(Number(e.target.value))}
                  className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold uppercase text-[10px]">
                  Yönetici / Katalog Notu
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Manuel doğrulama veya katalog referansı..."
                  className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold"
              >
                İptal
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {savingEdit ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
