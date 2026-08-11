'use client';

import React, { useEffect, useState } from 'react';
import {
  Database,
  Search,
  Plus,
  Edit2,
  Save,
  X,
  Archive,
  AlertTriangle,
  History,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

export default function VehicleVariantDatabasePage() {
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [bodyFilter, setBodyFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVariants, setTotalVariants] = useState(0);

  // Expanded and Editing Rows (Dirty State Tracking)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [draftEdits, setDraftEdits] = useState<Record<string, any>>({});
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals: New Variant, Impact Analysis, Audit History
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSubmitting, setNewSubmitting] = useState(false);
  const [newForm, setNewForm] = useState({
    brandName: '',
    modelName: '',
    year: new Date().getFullYear(),
    bodyType: 'SEDAN',
    engineCode: '',
    displacement: 1598,
    horsepower: 120,
    torque: 200,
    fuelType: 'PETROL',
    transmissionType: 'AUTOMATIC',
    speeds: 6,
    trimName: '',
    marketRegion: 'TR',
  });

  // Impact Analysis State
  const [impactVariantId, setImpactVariantId] = useState<string | null>(null);
  const [impactData, setImpactData] = useState<any | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);

  // Audit Log State
  const [auditVariantId, setAuditVariantId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchVariants = () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (statusFilter) params.append('status', statusFilter);
    if (bodyFilter) params.append('bodyType', bodyFilter);
    params.append('page', page.toString());
    params.append('limit', '15');

    fetch(`${API_BASE_URL}/vehicles/admin/variants/all?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Araç varyant veritabanı yüklenemedi.');
        return res.json();
      })
      .then((data) => {
        setVariants(data.variants || []);
        setTotalPages(data.totalPages || 1);
        setTotalVariants(data.total || 0);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVariants();
  }, [page, statusFilter, bodyFilter]);

  const handleRowClick = (variantId: string) => {
    if (editingRowId === variantId) return;
    setExpandedRowId((prev) => (prev === variantId ? null : variantId));
  };

  const startEditRow = (v: any) => {
    setEditingRowId(v.id);
    setExpandedRowId(v.id);
    setDraftEdits({
      [v.id]: {
        trimName: v.trim?.name || '',
        engineCode: v.engine?.code || '',
        horsepower: v.engine?.horsepower || 100,
        torque: v.engine?.torque || 150,
        year: v.year,
        bodyType: v.bodyType || 'SEDAN',
        fuelType: v.fuelType || 'PETROL',
        status: v.status || 'APPROVED',
        marketRegion: v.marketRegion || 'TR',
      },
    });
  };

  const cancelEditRow = (variantId: string) => {
    setEditingRowId(null);
    setDraftEdits((prev) => {
      const next = { ...prev };
      delete next[variantId];
      return next;
    });
  };

  const handleSaveRow = async (variantId: string) => {
    const draft = draftEdits[variantId];
    if (!draft) return;

    setSavingRowId(variantId);
    const token = localStorage.getItem('accessToken');

    try {
      const res = await fetch(`${API_BASE_URL}/vehicles/admin/variants/${variantId}/full`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draft),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Gözden geçirilen kayıt güncellenemedi.');
      }

      showToast('Varyant güncellendi.');
      setEditingRowId(null);
      fetchVariants();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingRowId(null);
    }
  };

  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewSubmitting(true);
    const token = localStorage.getItem('accessToken');

    try {
      const res = await fetch(`${API_BASE_URL}/vehicles/admin/variants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Yeni varyant oluşturulamadı.');
      }

      showToast('Yeni araç varyantı başarıyla eklendi.');
      setShowNewModal(false);
      fetchVariants();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setNewSubmitting(false);
    }
  };

  const handleArchiveVariant = async (variantId: string) => {
    if (!confirm('Bu araç varyantını pasife/arşive almak istediğinize emin misiniz?')) return;
    const token = localStorage.getItem('accessToken');

    try {
      const res = await fetch(`${API_BASE_URL}/vehicles/admin/variants/${variantId}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Arşivleme işlemi başarısız.');

      showToast('Varyant arşivlendi.');
      fetchVariants();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const fetchImpact = (variantId: string) => {
    setImpactVariantId(variantId);
    setImpactLoading(true);
    const token = localStorage.getItem('accessToken');

    fetch(`${API_BASE_URL}/vehicles/admin/variants/${variantId}/impact`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setImpactData(data))
      .catch((err) => alert(err.message))
      .finally(() => setImpactLoading(false));
  };

  const fetchAuditLogs = (variantId: string) => {
    setAuditVariantId(variantId);
    setAuditLoading(true);
    const token = localStorage.getItem('accessToken');

    fetch(`${API_BASE_URL}/vehicles/admin/variants/${variantId}/audit`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setAuditLogs(Array.isArray(data) ? data : []))
      .catch((err) => alert(err.message))
      .finally(() => setAuditLoading(false));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-emerald-500 text-white rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Araç Varyant Veritabanı</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Hızlı Araç Sorgulama ve sistem genelinde kullanılan canonical {totalVariants} araç kombinasyonu.
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-orange-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>+ Yeni Araç / Varyant</span>
        </button>
      </div>

      {/* Filter Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          fetchVariants();
        }}
        className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-wrap gap-4 items-center justify-between"
      >
        <div className="flex flex-1 min-w-[280px] items-center gap-2 px-3.5 py-2 bg-slate-950 rounded-xl border border-white/10 focus-within:border-orange-500/50 transition">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Marka, model, motor kodu veya donanım paketi yazarak ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-bold text-slate-300 outline-none cursor-pointer"
          >
            <option value="">Tüm Durumlar</option>
            <option value="APPROVED">APPROVED (Onaylı)</option>
            <option value="PENDING">PENDING (Bekliyor)</option>
            <option value="ARCHIVED">ARCHIVED (Arşivli)</option>
          </select>

          <select
            value={bodyFilter}
            onChange={(e) => {
              setBodyFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-bold text-slate-300 outline-none cursor-pointer"
          >
            <option value="">Tüm Kasa Tipleri</option>
            <option value="SEDAN">Sedan</option>
            <option value="HATCHBACK">Hatchback</option>
            <option value="SUV">SUV</option>
            <option value="COUPE">Coupe</option>
            <option value="WAGON">Wagon</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Filtrele
          </button>
        </div>
      </form>

      {/* Variants Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Araç varyant veritabanı yükleniyor...</div>
        ) : error ? (
          <div className="p-6 text-center text-rose-400 font-bold text-xs">{error}</div>
        ) : variants.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-xs">Aradığınız kriterlerde araç varyantı bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5">
                <tr>
                  <th className="p-4">Marka / Model</th>
                  <th className="p-4">Yıl</th>
                  <th className="p-4">Kasa</th>
                  <th className="p-4">Motor / Versiyon</th>
                  <th className="p-4">Yakıt</th>
                  <th className="p-4">Şanzıman</th>
                  <th className="p-4">Donanım (Trim)</th>
                  <th className="p-4">Market</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {variants.map((v) => {
                  const isEditing = editingRowId === v.id;
                  const isExpanded = expandedRowId === v.id;
                  const draft = draftEdits[v.id] || {};

                  return (
                    <React.Fragment key={v.id}>
                      <tr
                        onClick={() => handleRowClick(v.id)}
                        className={`hover:bg-white/[0.03] transition cursor-pointer ${
                          isExpanded ? 'bg-white/[0.02]' : ''
                        }`}
                      >
                        <td className="p-4 font-bold text-white">
                          <div>{v.brand?.name} {v.model?.name}</div>
                          <span className="text-[10px] text-slate-500 font-mono font-normal">ID: {v.id.slice(0, 8)}...</span>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-300">
                          {isEditing ? (
                            <input
                              type="number"
                              value={draft.year}
                              onChange={(e) =>
                                setDraftEdits((prev) => ({
                                  ...prev,
                                  [v.id]: { ...prev[v.id], year: e.target.value },
                                }))
                              }
                              className="w-16 px-2 py-1 bg-slate-950 border border-white/20 rounded text-xs text-white"
                            />
                          ) : (
                            v.year
                          )}
                        </td>
                        <td className="p-4 font-semibold text-slate-300">
                          {isEditing ? (
                            <select
                              value={draft.bodyType}
                              onChange={(e) =>
                                setDraftEdits((prev) => ({
                                  ...prev,
                                  [v.id]: { ...prev[v.id], bodyType: e.target.value },
                                }))
                              }
                              className="px-2 py-1 bg-slate-950 border border-white/20 rounded text-xs text-white"
                            >
                              <option value="SEDAN">SEDAN</option>
                              <option value="HATCHBACK">HATCHBACK</option>
                              <option value="SUV">SUV</option>
                              <option value="COUPE">COUPE</option>
                              <option value="WAGON">WAGON</option>
                            </select>
                          ) : (
                            v.bodyType || '-'
                          )}
                        </td>
                        <td className="p-4 font-mono text-slate-300">
                          {isEditing ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={draft.engineCode}
                                onChange={(e) =>
                                  setDraftEdits((prev) => ({
                                    ...prev,
                                    [v.id]: { ...prev[v.id], engineCode: e.target.value },
                                  }))
                                }
                                className="w-24 px-2 py-1 bg-slate-950 border border-white/20 rounded text-xs text-white"
                              />
                              <div className="flex gap-1">
                                <input
                                  type="number"
                                  placeholder="hp"
                                  value={draft.horsepower}
                                  onChange={(e) =>
                                    setDraftEdits((prev) => ({
                                      ...prev,
                                      [v.id]: { ...prev[v.id], horsepower: e.target.value },
                                    }))
                                  }
                                  className="w-12 px-1 py-0.5 bg-slate-950 border border-white/20 rounded text-[10px] text-white"
                                />
                                <input
                                  type="number"
                                  placeholder="Nm"
                                  value={draft.torque}
                                  onChange={(e) =>
                                    setDraftEdits((prev) => ({
                                      ...prev,
                                      [v.id]: { ...prev[v.id], torque: e.target.value },
                                    }))
                                  }
                                  className="w-12 px-1 py-0.5 bg-slate-950 border border-white/20 rounded text-[10px] text-white"
                                />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div>{v.engine?.code}</div>
                              <div className="text-[10px] text-slate-500">
                                {v.engine?.displacement}cc • {v.engine?.horsepower}hp • {v.engine?.torque}Nm
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-semibold text-slate-400">{v.fuelType || v.engine?.fuelType || '-'}</td>
                        <td className="p-4 font-semibold text-slate-400">{v.transmission?.name || '-'}</td>
                        <td className="p-4 font-bold text-orange-400 font-mono">
                          {isEditing ? (
                            <input
                              type="text"
                              value={draft.trimName}
                              onChange={(e) =>
                                setDraftEdits((prev) => ({
                                  ...prev,
                                  [v.id]: { ...prev[v.id], trimName: e.target.value },
                                }))
                              }
                              className="w-28 px-2 py-1 bg-slate-950 border border-white/20 rounded text-xs text-white"
                            />
                          ) : (
                            v.trim?.name || '-'
                          )}
                        </td>
                        <td className="p-4 font-mono text-slate-400">{v.marketRegion || 'TR'}</td>
                        <td className="p-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              v.status === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : v.status === 'ARCHIVED'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {v.status}
                          </span>
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => cancelEditRow(v.id)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                                title="İptal"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleSaveRow(v.id)}
                                disabled={savingRowId === v.id}
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer"
                                title="Kaydet"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => startEditRow(v)}
                                className="p-1.5 bg-slate-800 hover:bg-orange-500 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                                title="Satır Düzenle"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => fetchImpact(v.id)}
                                className="p-1.5 bg-slate-800 hover:bg-amber-500 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                                title="Etki Analizi"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => fetchAuditLogs(v.id)}
                                className="p-1.5 bg-slate-800 hover:bg-cyan-500 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                                title="Değişiklik Geçmişi"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleArchiveVariant(v.id)}
                                className="p-1.5 bg-slate-800 hover:bg-rose-500 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                                title="Pasife Al / Arşivle"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Row Detail */}
                      {isExpanded && !isEditing && (
                        <tr className="bg-slate-950/60 border-b border-white/5">
                          <td colSpan={10} className="p-4 space-y-3 text-xs">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-slate-900/60 rounded-xl border border-white/5">
                              <div>
                                <span className="text-slate-500 text-[10px] uppercase font-bold">Generation</span>
                                <p className="font-bold text-slate-300">{v.generation?.name || '-'}</p>
                              </div>
                              <div>
                                <span className="text-slate-500 text-[10px] uppercase font-bold">Country</span>
                                <p className="font-bold text-slate-300">{v.country?.name || 'Türkiye'}</p>
                              </div>
                              <div>
                                <span className="text-slate-500 text-[10px] uppercase font-bold">İlgili İlan Sayısı</span>
                                <p className="font-mono font-bold text-orange-400">{v._count?.listings || 0}</p>
                              </div>
                              <div>
                                <span className="text-slate-500 text-[10px] uppercase font-bold">Kronik Problemler</span>
                                <p className="font-mono font-bold text-cyan-400">{v._count?.problems || 0}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <span>
            Sayfa <strong>{page}</strong> / {totalPages} (Toplam {totalVariants} varyant)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              Önceki
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>

      {/* NEW VARIANT MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-2xl w-full bg-[#0b0f19] border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white">+ Yeni Araç / Varyant Ekle</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVariant} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Marka Adı</label>
                  <input
                    type="text"
                    placeholder="Örn: Toyota"
                    value={newForm.brandName}
                    onChange={(e) => setNewForm({ ...newForm, brandName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Model Adı</label>
                  <input
                    type="text"
                    placeholder="Örn: Corolla"
                    value={newForm.modelName}
                    onChange={(e) => setNewForm({ ...newForm, modelName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Model Yılı</label>
                  <input
                    type="number"
                    value={newForm.year}
                    onChange={(e) => setNewForm({ ...newForm, year: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Kasa Tipi</label>
                  <select
                    value={newForm.bodyType}
                    onChange={(e) => setNewForm({ ...newForm, bodyType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white outline-none"
                  >
                    <option value="SEDAN">SEDAN</option>
                    <option value="HATCHBACK">HATCHBACK</option>
                    <option value="SUV">SUV</option>
                    <option value="COUPE">COUPE</option>
                    <option value="WAGON">WAGON</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Yakıt Türü</label>
                  <select
                    value={newForm.fuelType}
                    onChange={(e) => setNewForm({ ...newForm, fuelType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white outline-none"
                  >
                    <option value="PETROL">Benzin</option>
                    <option value="DIESEL">Dizel</option>
                    <option value="HYBRID">Hibrit</option>
                    <option value="ELECTRIC">Elektrik</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Motor Kodu</label>
                  <input
                    type="text"
                    placeholder="Örn: 1.5 VVT-i"
                    value={newForm.engineCode}
                    onChange={(e) => setNewForm({ ...newForm, engineCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Hacim (cc)</label>
                  <input
                    type="number"
                    value={newForm.displacement}
                    onChange={(e) => setNewForm({ ...newForm, displacement: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Güç (hp)</label>
                  <input
                    type="number"
                    value={newForm.horsepower}
                    onChange={(e) => setNewForm({ ...newForm, horsepower: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Tork (Nm)</label>
                  <input
                    type="number"
                    value={newForm.torque}
                    onChange={(e) => setNewForm({ ...newForm, torque: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Şanzıman Tipi</label>
                  <select
                    value={newForm.transmissionType}
                    onChange={(e) => setNewForm({ ...newForm, transmissionType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white outline-none"
                  >
                    <option value="AUTOMATIC">AUTOMATIC</option>
                    <option value="MANUAL">MANUAL</option>
                    <option value="CVT">CVT</option>
                    <option value="DCT">DCT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Vites Sayısı</label>
                  <input
                    type="number"
                    value={newForm.speeds}
                    onChange={(e) => setNewForm({ ...newForm, speeds: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Donanım Paketi (Trim)</label>
                  <input
                    type="text"
                    placeholder="Örn: Dream"
                    value={newForm.trimName}
                    onChange={(e) => setNewForm({ ...newForm, trimName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white outline-none"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 font-semibold flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>Kaydetmeden önce 8 temel alanın exact duplicate kontrolü otomatik olarak çalışacaktır.</span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-900 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={newSubmitting}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-40"
                >
                  {newSubmitting ? 'Kaydediliyor...' : 'Varyantı Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPACT ANALYSIS MODAL */}
      {impactVariantId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-[#0b0f19] border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>Etki Analizi (Impact Analysis)</span>
              </h3>
              <button onClick={() => setImpactVariantId(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {impactLoading ? (
              <div className="p-8 text-center text-xs text-slate-400 font-bold">Etki ilişkileri hesaplanıyor...</div>
            ) : impactData ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Bu araç varyantı silinir veya pasife alınırsa etkilenen ilişkili kayıt sayıları:
                </p>

                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between p-3 bg-slate-950 rounded-xl border border-white/5">
                    <span className="text-slate-400">İlişkili İkinci El İlanlar:</span>
                    <strong className="text-orange-400">{impactData.impacts?.listings || 0} kayıt</strong>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-950 rounded-xl border border-white/5">
                    <span className="text-slate-400">Araç Rehberi Kartları:</span>
                    <strong className="text-cyan-400">{impactData.impacts?.profiles || 0} kayıt</strong>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-950 rounded-xl border border-white/5">
                    <span className="text-slate-400">AI Rapor Cache Kayıtları:</span>
                    <strong className="text-purple-400">{impactData.impacts?.reports || 0} kayıt</strong>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-950 rounded-xl border border-white/5">
                    <span className="text-slate-400">Kullanıcı Favorileri:</span>
                    <strong className="text-emerald-400">{impactData.impacts?.favorites || 0} kayıt</strong>
                  </div>
                </div>

                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] text-rose-300 font-bold">
                  Toplam Etkilenen Kayıt: {impactData.totalRelatedRecords || 0} adet
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* AUDIT LOGS MODAL */}
      {auditVariantId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-xl w-full bg-[#0b0f19] border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-cyan-400" />
                <span>Değişiklik Geçmişi (Audit Logs)</span>
              </h3>
              <button onClick={() => setAuditVariantId(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {auditLoading ? (
              <div className="p-8 text-center text-xs text-slate-400 font-bold">Audit kayıtları yükleniyor...</div>
            ) : auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-semibold">Bu varyant için kayıtlı audit log bulunamadı.</div>
            ) : (
              <div className="space-y-3 font-mono text-xs">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span className="font-bold text-orange-400">{log.action}</span>
                      <span>{new Date(log.createdAt).toLocaleString('tr-TR')}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans">Yönetici: {log.adminEmail || log.adminUserId}</p>
                    {log.changedFields && log.changedFields.length > 0 && (
                      <p className="text-[10px] text-cyan-300">Değişen Alanlar: {log.changedFields.join(', ')}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
