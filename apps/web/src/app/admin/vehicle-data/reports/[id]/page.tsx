'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit3,
  Save,
  Send,
  RefreshCw,
  History,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  Bot,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';
import VehicleReportShell from '@/app/vehicle-report/components/VehicleReportShell';

export default function AdminVehicleReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Core Data
  const [reportRecord, setReportRecord] = useState<any | null>(null);
  const [variant, setVariant] = useState<any | null>(null);
  const [canonicalSpecs, setCanonicalSpecs] = useState<any | null>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  // Mode: 'preview' (Exact User View) vs 'edit' (WYSIWYG Section Editor)
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');

  // Working editable copy of reportData
  const [editedReportData, setEditedReportData] = useState<any | null>(null);
  const [changeNote, setChangeNote] = useState('');
  const [savingAction, setSavingAction] = useState<'draft' | 'publish' | 'refresh' | 'delete' | null>(null);

  // Modals
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [previewingRevisionId, setPreviewingRevisionId] = useState<string | null>(null);
  const [resolvingFeedbackId, setResolvingFeedbackId] = useState<string | null>(null);
  const [feedbackResolutionNote, setFeedbackResolutionNote] = useState('');

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const getAuthToken = () => {
    return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  };

  const fetchDetail = useCallback(async (targetId: string = reportId) => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/admin/vehicle-reports/${targetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Rapor detayı yüklenemedi: HTTP ${res.status}`);
      }

      const data = await res.json();
      setReportRecord(data.report);
      setVariant(data.variant);
      setCanonicalSpecs(data.canonicalSpecs);
      setRevisions(data.revisions || []);
      setFeedbacks(data.feedbacks || []);
      setEditedReportData(JSON.parse(JSON.stringify(data.report.reportData || {})));
      setChangeNote(data.report.changeNote || '');
    } catch (err: any) {
      setError(err.message || 'Veri yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    if (reportId) {
      fetchDetail();
    }
  }, [reportId, fetchDetail]);

  // Handle Draft Save (Rule 20)
  const handleSaveDraft = async () => {
    if (!editedReportData) return;
    setSavingAction('draft');
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/admin/vehicle-reports/${reportRecord.id}/draft`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportData: editedReportData,
          changeNote: changeNote.trim() || 'Admin içerik düzenlemesi',
          expectedVersion: reportRecord.versionNumber,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Taslak kaydedilemedi.');
      }

      const newDraft = await res.json();
      showToast('Taslak başarıyla kaydedildi! (Kullanıcılara yansıtılmaz)', 'success');
      setMode('preview');
      // Navigate or re-fetch with new draft ID
      router.push(`/admin/vehicle-data/reports/${newDraft.id}`);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingAction(null);
    }
  };

  // Handle Publish (Rule 21)
  const handlePublish = async () => {
    if (!editedReportData) return;
    setSavingAction('publish');
    try {
      const token = getAuthToken();

      // First ensure edits are saved to a draft
      let targetRevisionId = reportRecord.id;
      if (mode === 'edit') {
        const draftRes = await fetch(`${API_BASE_URL}/admin/vehicle-reports/${reportRecord.id}/draft`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reportData: editedReportData,
            changeNote: changeNote.trim() || 'Admin yayınlama güncellemesi',
            expectedVersion: reportRecord.versionNumber,
          }),
        });

        if (!draftRes.ok) {
          const errData = await draftRes.json().catch(() => ({}));
          throw new Error(errData.message || 'Önceki düzenlemeler kaydedilemedi.');
        }

        const draftData = await draftRes.json();
        targetRevisionId = draftData.id;
      }

      // Publish the target revision atomically
      const pubRes = await fetch(
        `${API_BASE_URL}/admin/vehicle-reports/${reportRecord.id}/revisions/${targetRevisionId}/publish`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            changeNote: changeNote.trim() || 'Yayınlanan güncel sürüm',
          }),
        },
      );

      if (!pubRes.ok) {
        const errData = await pubRes.json().catch(() => ({}));
        throw new Error(errData.message || 'Rapor yayınlanamadı.');
      }

      showToast('Rapor başarıyla YAYINLANDI! Kullanıcılar artık bu sürümü görecek.', 'success');
      setMode('preview');
      router.push(`/admin/vehicle-data/reports/${targetRevisionId}`);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingAction(null);
    }
  };

  // Handle Delete Report
  const handleDeleteReport = async () => {
    const confirm = window.confirm(
      'DİKKAT: Bu araç raporunu kalıcı olarak silmek istediğinize emin misiniz?\n\n' +
      'Rapor silindiğinde bu versiyona ait tüm kayıtlar ve oylar kaldırılır.',
    );
    if (!confirm) return;

    setSavingAction('delete');
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/admin/vehicle-reports/${reportRecord.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Rapor silinemedi.');
      }

      showToast('Rapor başarıyla silindi.', 'success');
      router.push('/admin/vehicle-data/reports');
    } catch (err: any) {
      showToast(err.message, 'error');
      setSavingAction(null);
    }
  };

  // Handle Research Refresh (Rule 25, 27, 28: creates DRAFT, does not auto-publish)
  const handleResearchRefresh = async () => {
    const confirm = window.confirm(
      'Mevcut araç verisi ve TorqueScout web araştırma pipeline\'ı üzerinden sıfırdan yeni bir araştırma yapılsın mı?\n\n' +
      'Not: Mevcut yayındaki rapor etkilenmez, yeni sonuç incelenmek üzere yeni bir TASLAK olarak kaydedilir.',
    );
    if (!confirm) return;

    setSavingAction('refresh');
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/admin/vehicle-reports/${reportRecord.id}/research-refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Yeniden araştırma başarısız oldu.');
      }

      const result = await res.json();
      showToast(result.message || 'Araştırma tamamlandı ve yeni taslak oluşturuldu!', 'success');
      if (result.draftReportId) {
        router.push(`/admin/vehicle-data/reports/${result.draftReportId}`);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingAction(null);
    }
  };

  // Handle Restore Revision (Rule 23: Clones old snapshot to new draft)
  const handleRestoreRevision = async (targetRevId: string) => {
    const confirm = window.confirm(
      'Bu sürümü YENİ BİR TASLAK olarak geri yüklemek istediğinize emin misiniz?\n(Geçmiş versiyonlar bozulmaz, yeni bir taslak sürüm oluşturulur)',
    );
    if (!confirm) return;

    try {
      const token = getAuthToken();
      const res = await fetch(
        `${API_BASE_URL}/admin/vehicle-reports/${reportRecord.id}/revisions/${targetRevId}/restore`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Sürüm geri yüklenemedi.');
      }

      const newDraft = await res.json();
      showToast(`v${newDraft.versionNumber} yeni taslak olarak geri yüklendi!`, 'success');
      setShowHistoryModal(false);
      router.push(`/admin/vehicle-data/reports/${newDraft.id}`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Handle Feedback Resolution (Rule 40)
  const handleResolveFeedback = async (feedbackId: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/admin/vehicle-reports/feedback/${feedbackId}/resolve`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resolutionNote: feedbackResolutionNote }),
      });

      if (!res.ok) {
        throw new Error('Bildirim çözümlenemedi.');
      }

      showToast('Kullanıcı bildirimi çözüldü olarak işaretlendi.', 'success');
      setResolvingFeedbackId(null);
      setFeedbackResolutionNote('');
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-orange-400" />
        <p className="font-semibold text-white">Araç Raporu ve Versiyon Geçmişi Yükleniyor...</p>
      </div>
    );
  }

  if (error || !reportRecord || !reportRecord.reportData) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        <div className="flex items-center gap-3 text-rose-400">
          <AlertTriangle className="w-6 h-6" />
          <h2 className="text-lg font-bold">Rapor Yüklenemedi</h2>
        </div>
        <p className="text-sm text-slate-300">{error || 'Rapor içeriği mevcut değil.'}</p>
        <Link
          href="/admin/vehicle-data/reports"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Rapor Listesine Dön</span>
        </Link>
      </div>
    );
  }

  const isPublished = reportRecord.isCurrentPublished && !reportRecord.isDraft;
  const rawReportData = mode === 'edit' ? editedReportData : reportRecord.reportData;
  const currentReportData = rawReportData
    ? {
        ...rawReportData,
        reportId: reportRecord.id,
        likeCount: reportRecord.likeCount ?? 0,
        dislikeCount: reportRecord.dislikeCount ?? 0,
      }
    : null;
  const pendingFeedbacks = feedbacks.filter((f) => f.status !== 'RESOLVED' && f.status !== 'REJECTED');

  // Technical conflict detection (Rule 31)
  const reportHp =
    currentReportData?.performanceUsage?.powerHp ||
    currentReportData?.expertDecisionSynthesis?.technicalSpecifications?.enginePowerHp;
  const hasHpConflict =
    canonicalSpecs?.powerHp && reportHp && Number(canonicalSpecs.powerHp) !== Number(reportHp);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-3 animate-fade-in ${
            toastMsg.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
              : toastMsg.type === 'error'
              ? 'bg-rose-950/90 text-rose-300 border-rose-500/40'
              : 'bg-blue-950/90 text-blue-300 border-blue-500/40'
          }`}
        >
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* STICKY ADMIN TOOLBAR (Rule 10) */}
      <div className="sticky top-4 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Identity & Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/vehicle-data/reports"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Listeye Geri Dön"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base">
                {currentReportData.vehicleIdentity?.modelYear || ''} {currentReportData.vehicleIdentity?.brand || ''} {currentReportData.vehicleIdentity?.model || ''}
              </span>
              <span className="text-xs text-slate-400 font-mono">v{reportRecord.versionNumber}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {isPublished ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Yayında (Güncel)
                </span>
              ) : reportRecord.isDraft ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Taslak
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400">
                  Arşiv
                </span>
              )}

              <span className="text-[11px] text-slate-400">
                Kaynak: <strong>{reportRecord.sourceType}</strong>
              </span>

              {reportRecord.changeNote && (
                <span className="text-[11px] text-slate-400 max-w-[200px] truncate" title={reportRecord.changeNote}>
                  • {reportRecord.changeNote}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Version History Modal Button */}
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <History className="w-3.5 h-3.5 text-blue-400" />
            <span>Versiyonlar ({revisions.length})</span>
          </button>

          {/* User Feedbacks Modal Button */}
          <button
            type="button"
            onClick={() => setShowFeedbackModal(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              pendingFeedbacks.length > 0
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
            <span>Bildirimler {pendingFeedbacks.length > 0 && `(${pendingFeedbacks.length})`}</span>
          </button>

          {/* Research Refresh Button */}
          <button
            type="button"
            onClick={handleResearchRefresh}
            disabled={savingAction !== null}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${savingAction === 'refresh' ? 'animate-spin' : ''}`} />
            <span>Yeniden Araştır</span>
          </button>

          {/* Edit Mode Toggle / Actions */}
          {mode === 'preview' ? (
            <button
              type="button"
              onClick={() => setMode('edit')}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition shadow-lg"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Düzenle (WYSIWYG)</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditedReportData(JSON.parse(JSON.stringify(reportRecord.reportData || {})));
                  setMode('preview');
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                İptal
              </button>

              <button
                type="button"
                onClick={handleDeleteReport}
                disabled={savingAction !== null}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{savingAction === 'delete' ? 'Siliniyor...' : 'Raporu Sil'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingAction !== null}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-amber-950/60 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingAction === 'draft' ? 'Kaydediliyor...' : 'Taslak Kaydet'}</span>
              </button>

              <button
                type="button"
                onClick={handlePublish}
                disabled={savingAction !== null}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition shadow-lg disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{savingAction === 'publish' ? 'Yayınlanıyor...' : 'Yayınla'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TECHNICAL CONFLICT WARNING BANNER (Rule 31) */}
      {hasHpConflict && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <strong>Teknik Veri Farkı Uyarısı:</strong> Raporda belirtilen motor gücü (
              <strong>{reportHp} HP</strong>), veritabanındaki canonical araç verisinden (
              <strong>{canonicalSpecs?.powerHp} HP</strong>) farklıdır. Araç varyant verisi otomatik değiştirilmez.
            </div>
          </div>
          <span className="px-2.5 py-1 bg-amber-500/20 rounded-lg text-[10px] font-bold text-amber-300 shrink-0">
            Farklılık Korunuyor
          </span>
        </div>
      )}

      {/* EDIT MODE TOOLBAR (Change Note Input) */}
      {mode === 'edit' && (
        <div className="p-4 bg-purple-950/20 border border-purple-500/30 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-purple-300 text-xs font-bold">
            <Edit3 className="w-4 h-4" />
            <span>WYSIWYG Bölüm Bazlı Düzenleme Modu Aktif</span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="text"
              placeholder="Değişiklik Notu (örn. Şanzıman ekspertiz maddesi güncellendi)..."
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              className="flex-1 px-4 py-2 bg-slate-950 border border-purple-500/30 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
            />
            <span className="text-[11px] text-slate-400 shrink-0">
              Düzenleme sonrası 'Taslak Kaydet' veya doğrudan 'Yayınla' diyebilirsiniz.
            </span>
          </div>
        </div>
      )}

      {/* REPORT CONTENT AREA: Exact Public View vs In-Place WYSIWYG Editor */}
      {mode === 'preview' ? (
        <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {/* USER VIEW SOURCE OF TRUTH (Rule 7, 8, 9) */}
          <VehicleReportShell report={currentReportData} />
        </div>
      ) : (
        /* SECTION-LEVEL WYSIWYG EDITOR (Rule 11, 12, 13, 14) */
        <div className="space-y-6">
          {/* Section 1: Teknik Özellikler Edit */}
          <div className="bg-[#090d1a] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <span>📋</span>
              <span>Teknik Özellikler</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold uppercase block mb-1">Motor Gücü (HP)</label>
                <input
                  type="number"
                  value={editedReportData.performanceUsage?.powerHp || ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    setEditedReportData((prev: any) => ({
                      ...prev,
                      performanceUsage: { ...prev.performanceUsage, powerHp: val },
                    }));
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold uppercase block mb-1">Tork (Nm)</label>
                <input
                  type="number"
                  value={editedReportData.performanceUsage?.torqueNm || ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    setEditedReportData((prev: any) => ({
                      ...prev,
                      performanceUsage: { ...prev.performanceUsage, torqueNm: val },
                    }));
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold uppercase block mb-1">Motor Hacmi (cc)</label>
                <input
                  type="number"
                  value={editedReportData.vehicleIdentity?.engineDisplacementCc || ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    setEditedReportData((prev: any) => ({
                      ...prev,
                      vehicleIdentity: { ...prev.vehicleIdentity, engineDisplacementCc: val },
                    }));
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold uppercase block mb-1">Maksimum Hız (km/h)</label>
                <input
                  type="number"
                  value={editedReportData.performanceUsage?.topSpeedKmh || ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    setEditedReportData((prev: any) => ({
                      ...prev,
                      performanceUsage: { ...prev.performanceUsage, topSpeedKmh: val },
                    }));
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold uppercase block mb-1">0-100 Hızlanma (sn)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editedReportData.performanceUsage?.zeroToHundredSec || ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseFloat(e.target.value) : undefined;
                    setEditedReportData((prev: any) => ({
                      ...prev,
                      performanceUsage: { ...prev.performanceUsage, zeroToHundredSec: val },
                    }));
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold uppercase block mb-1">Ort. Tüketim (lt/100km)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editedReportData.performanceUsage?.combinedFuelL100km || ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseFloat(e.target.value) : undefined;
                    setEditedReportData((prev: any) => ({
                      ...prev,
                      performanceUsage: { ...prev.performanceUsage, combinedFuelL100km: val },
                    }));
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold uppercase block mb-1">Bagaj Hacmi (lt)</label>
                <input
                  type="number"
                  value={editedReportData.performanceUsage?.trunkCapacityLiters || ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    setEditedReportData((prev: any) => ({
                      ...prev,
                      performanceUsage: { ...prev.performanceUsage, trunkCapacityLiters: val },
                    }));
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold uppercase block mb-1">Boş Ağırlık (kg)</label>
                <input
                  type="number"
                  value={editedReportData.performanceUsage?.curbWeightKg || ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    setEditedReportData((prev: any) => ({
                      ...prev,
                      performanceUsage: { ...prev.performanceUsage, curbWeightKg: val },
                    }));
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Bu Araç Nasıl Bir Otomobil? (Vehicle Character) */}
          <div className="bg-[#090d1a] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-sm font-black text-orange-400 uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 block" />
              <span>Bu Araç Nasıl Bir Otomobil?</span>
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold uppercase block mb-1">Karakter Başlığı</label>
                <input
                  type="text"
                  value={editedReportData.expertDecisionSynthesis?.vehicleCharacter?.headline || ''}
                  onChange={(e) => {
                    const text = e.target.value;
                    setEditedReportData((prev: any) => ({
                      ...prev,
                      expertDecisionSynthesis: {
                        ...prev.expertDecisionSynthesis,
                        vehicleCharacter: {
                          ...prev.expertDecisionSynthesis?.vehicleCharacter,
                          headline: text,
                        },
                      },
                    }));
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold uppercase block mb-1">Derin Otomotiv Analizi</label>
                <textarea
                  rows={5}
                  value={editedReportData.expertDecisionSynthesis?.vehicleCharacter?.detailedAssessment || ''}
                  onChange={(e) => {
                    const text = e.target.value;
                    setEditedReportData((prev: any) => ({
                      ...prev,
                      expertDecisionSynthesis: {
                        ...prev.expertDecisionSynthesis,
                        vehicleCharacter: {
                          ...prev.expertDecisionSynthesis?.vehicleCharacter,
                          detailedAssessment: text,
                        },
                      },
                    }));
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 leading-relaxed font-normal"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold uppercase block mb-1">Şehir İçi Kullanım</label>
                  <textarea
                    rows={2}
                    value={editedReportData.expertDecisionSynthesis?.dailyUseAssessment?.cityUse || ''}
                    onChange={(e) => {
                      const text = e.target.value;
                      setEditedReportData((prev: any) => ({
                        ...prev,
                        expertDecisionSynthesis: {
                          ...prev.expertDecisionSynthesis,
                          dailyUseAssessment: {
                            ...prev.expertDecisionSynthesis?.dailyUseAssessment,
                            cityUse: text,
                          },
                        },
                      }));
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-semibold uppercase block mb-1">Otoyol ve Seyir Kullanımı</label>
                  <textarea
                    rows={2}
                    value={editedReportData.expertDecisionSynthesis?.dailyUseAssessment?.highwayUse || ''}
                    onChange={(e) => {
                      const text = e.target.value;
                      setEditedReportData((prev: any) => ({
                        ...prev,
                        expertDecisionSynthesis: {
                          ...prev.expertDecisionSynthesis,
                          dailyUseAssessment: {
                            ...prev.expertDecisionSynthesis?.dailyUseAssessment,
                            highwayUse: text,
                          },
                        },
                      }));
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Tercih Etmek İçin Güçlü Nedenler (List Editor) */}
          <div className="bg-[#090d1a] border border-emerald-500/20 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
              <h2 className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Tercih Etmek İçin Güçlü Nedenler</span>
              </h2>
              <button
                type="button"
                onClick={() => {
                  const items = [...(editedReportData.expertDecisionSynthesis?.strongestReasonsToChoose || [])];
                  items.push({ title: 'Yeni Güçlü Neden', explanation: 'Açıklama girin...' });
                  setEditedReportData((prev: any) => ({
                    ...prev,
                    expertDecisionSynthesis: { ...prev.expertDecisionSynthesis, strongestReasonsToChoose: items },
                  }));
                }}
                className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Madde Ekle</span>
              </button>
            </div>

            <div className="space-y-3">
              {(editedReportData.expertDecisionSynthesis?.strongestReasonsToChoose || []).map((item: any, idx: number) => (
                <div key={idx} className="p-3.5 bg-slate-950 border border-emerald-500/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={item.title || ''}
                      onChange={(e) => {
                        const items = [...(editedReportData.expertDecisionSynthesis?.strongestReasonsToChoose || [])];
                        items[idx] = { ...items[idx], title: e.target.value };
                        setEditedReportData((prev: any) => ({
                          ...prev,
                          expertDecisionSynthesis: { ...prev.expertDecisionSynthesis, strongestReasonsToChoose: items },
                        }));
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-emerald-300 font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const items = [...(editedReportData.expertDecisionSynthesis?.strongestReasonsToChoose || [])];
                        items.splice(idx, 1);
                        setEditedReportData((prev: any) => ({
                          ...prev,
                          expertDecisionSynthesis: { ...prev.expertDecisionSynthesis, strongestReasonsToChoose: items },
                        }));
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={item.explanation || ''}
                    onChange={(e) => {
                      const items = [...(editedReportData.expertDecisionSynthesis?.strongestReasonsToChoose || [])];
                      items[idx] = { ...items[idx], explanation: e.target.value };
                      setEditedReportData((prev: any) => ({
                        ...prev,
                        expertDecisionSynthesis: { ...prev.expertDecisionSynthesis, strongestReasonsToChoose: items },
                      }));
                    }}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Bilinecek Tavizler (List Editor) */}
          <div className="bg-[#090d1a] border border-amber-500/20 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <h2 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Satın Almadan Önce Bilinecek Tavizler</span>
              </h2>
              <button
                type="button"
                onClick={() => {
                  const items = [...(editedReportData.expertDecisionSynthesis?.compromisesAndLimitations || [])];
                  items.push({ title: 'Yeni Taviz', explanation: 'Açıklama girin...' });
                  setEditedReportData((prev: any) => ({
                    ...prev,
                    expertDecisionSynthesis: { ...prev.expertDecisionSynthesis, compromisesAndLimitations: items },
                  }));
                }}
                className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Madde Ekle</span>
              </button>
            </div>

            <div className="space-y-3">
              {(editedReportData.expertDecisionSynthesis?.compromisesAndLimitations || []).map((item: any, idx: number) => (
                <div key={idx} className="p-3.5 bg-slate-950 border border-amber-500/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={item.title || ''}
                      onChange={(e) => {
                        const items = [...(editedReportData.expertDecisionSynthesis?.compromisesAndLimitations || [])];
                        items[idx] = { ...items[idx], title: e.target.value };
                        setEditedReportData((prev: any) => ({
                          ...prev,
                          expertDecisionSynthesis: { ...prev.expertDecisionSynthesis, compromisesAndLimitations: items },
                        }));
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-amber-300 font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const items = [...(editedReportData.expertDecisionSynthesis?.compromisesAndLimitations || [])];
                        items.splice(idx, 1);
                        setEditedReportData((prev: any) => ({
                          ...prev,
                          expertDecisionSynthesis: { ...prev.expertDecisionSynthesis, compromisesAndLimitations: items },
                        }));
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={item.explanation || ''}
                    onChange={(e) => {
                      const items = [...(editedReportData.expertDecisionSynthesis?.compromisesAndLimitations || [])];
                      items[idx] = { ...items[idx], explanation: e.target.value };
                      setEditedReportData((prev: any) => ({
                        ...prev,
                        expertDecisionSynthesis: { ...prev.expertDecisionSynthesis, compromisesAndLimitations: items },
                      }));
                    }}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Satıcıya Sorulacak Sorular */}
          <div className="bg-[#090d1a] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-sm font-black text-purple-400 uppercase tracking-wider flex items-center gap-2">
                <span>❓</span>
                <span>Satıcıya Sorulacak Sorular</span>
              </h2>
              <button
                type="button"
                onClick={() => {
                  const questions = [...(editedReportData.sellerQuestions || [])];
                  questions.push({
                    questionText: 'Yeni Soru?',
                    expectedAnswerHint: 'Beklenen makul cevap',
                    redFlagAnswerHint: 'Şüphe uyandıracak cevap',
                  });
                  setEditedReportData((prev: any) => ({
                    ...prev,
                    sellerQuestions: questions,
                  }));
                }}
                className="inline-flex items-center gap-1 px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Soru Ekle</span>
              </button>
            </div>

            <div className="space-y-3">
              {(editedReportData.sellerQuestions || []).map((q: any, idx: number) => (
                <div key={idx} className="p-3.5 bg-slate-950 border border-white/10 rounded-xl space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      placeholder="Soru metni..."
                      value={q.questionText || ''}
                      onChange={(e) => {
                        const list = [...(editedReportData.sellerQuestions || [])];
                        list[idx] = { ...list[idx], questionText: e.target.value };
                        setEditedReportData((prev: any) => ({ ...prev, sellerQuestions: list }));
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-purple-300 font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const list = [...(editedReportData.sellerQuestions || [])];
                        list.splice(idx, 1);
                        setEditedReportData((prev: any) => ({ ...prev, sellerQuestions: list }));
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Beklenen olumlu cevap..."
                      value={q.expectedAnswerHint || ''}
                      onChange={(e) => {
                        const list = [...(editedReportData.sellerQuestions || [])];
                        list[idx] = { ...list[idx], expectedAnswerHint: e.target.value };
                        setEditedReportData((prev: any) => ({ ...prev, sellerQuestions: list }));
                      }}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-emerald-400"
                    />
                    <input
                      type="text"
                      placeholder="Şüphe uyandıracak cevap..."
                      value={q.redFlagAnswerHint || ''}
                      onChange={(e) => {
                        const list = [...(editedReportData.sellerQuestions || [])];
                        list[idx] = { ...list[idx], redFlagAnswerHint: e.target.value };
                        setEditedReportData((prev: any) => ({ ...prev, sellerQuestions: list }));
                      }}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-rose-400"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VERSION HISTORY MODAL (Rule 22 & 23) */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Versiyon Geçmişi</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {revisions.map((rev) => {
                const isCurrent = rev.id === reportRecord.id;
                const isPub = rev.isCurrentPublished && !rev.isDraft;

                return (
                  <div
                    key={rev.id}
                    className={`p-4 rounded-2xl border transition space-y-2 ${
                      isCurrent
                        ? 'bg-blue-950/20 border-blue-500/40 ring-1 ring-blue-500/30'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-white">v{rev.versionNumber}</span>
                        {isPub ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Yayında
                          </span>
                        ) : rev.isDraft ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Taslak
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400">
                            Arşiv
                          </span>
                        )}
                        <span className="text-xs text-slate-400">({rev.sourceType})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isCurrent && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setShowHistoryModal(false);
                                router.push(`/admin/vehicle-data/reports/${rev.id}`);
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                            >
                              İncele
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRestoreRevision(rev.id)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Yeni Taslak Olarak Geri Yükle</span>
                            </button>
                          </>
                        )}
                        {isCurrent && (
                          <span className="text-xs font-bold text-blue-400">Şu Anki Görüntülenen</span>
                        )}
                      </div>
                    </div>

                    {rev.changeNote && (
                      <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                        📝 {rev.changeNote}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>Tarih: {new Date(rev.generatedAt).toLocaleString('tr-TR')}</span>
                      {rev.editedByAdminId && <span>Düzenleyen: {rev.editedByAdminId}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* USER FEEDBACK MODAL (Rule 39 & 40) */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Kullanıcı Bildirimleri & Sorun Raporları</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {feedbacks.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-1">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/60 mb-2" />
                  <p className="font-bold text-slate-300">Bu araç veya rapor için bildirilmiş sorun yok.</p>
                </div>
              ) : (
                feedbacks.map((f) => (
                  <div key={f.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          f.status === 'RESOLVED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {f.status === 'RESOLVED' ? 'Çözüldü' : 'Bekliyor'}
                        </span>
                        <span className="text-xs font-semibold text-slate-300">{f.subjectCategory}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {new Date(f.createdAt).toLocaleDateString('tr-TR')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 bg-slate-900/60 p-3 rounded-xl border border-white/5 leading-relaxed">
                      "{f.message}"
                    </p>

                    {f.user && (
                      <div className="text-[11px] text-slate-400">
                        Bildiren: {f.user.email} {f.user.firstName ? `(${f.user.firstName} ${f.user.lastName || ''})` : ''}
                      </div>
                    )}

                    {f.adminNote && (
                      <div className="text-[11px] text-emerald-400 bg-emerald-950/20 p-2 rounded-lg border border-emerald-500/20">
                        ✔ <strong>Admin Notu:</strong> {f.adminNote}
                      </div>
                    )}

                    {f.status !== 'RESOLVED' && (
                      <div className="pt-2 border-t border-slate-800/60 space-y-2">
                        {resolvingFeedbackId === f.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Çözüm notu (örn. Rapor düzeltildi)..."
                              value={feedbackResolutionNote}
                              onChange={(e) => setFeedbackResolutionNote(e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setResolvingFeedbackId(null)}
                                className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs"
                              >
                                İptal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResolveFeedback(f.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                              >
                                Çözüldü Olarak Kaydet
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setResolvingFeedbackId(f.id);
                              setFeedbackResolutionNote('');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Sorunu Çözüldü İşaretle</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
