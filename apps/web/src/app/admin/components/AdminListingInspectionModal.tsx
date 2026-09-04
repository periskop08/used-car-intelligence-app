'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  ExternalLink,
  Car,
  User,
  Calendar,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Camera,
  Eye,
  MapPin,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  FileText,
  DollarSign,
  Gauge,
  HelpCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';
import { resolveEffectiveListingStatus } from '@/utils/listingStatusResolver';

interface AdminListingInspectionModalProps {
  listingId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onOpenSellerDrawer?: (seller: any) => void;
}

export function AdminListingInspectionModal({
  listingId,
  isOpen,
  onClose,
  onRefresh,
  onOpenSellerDrawer,
}: AdminListingInspectionModalProps) {
  const [loading, setLoading] = useState(false);
  const [listingData, setListingData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);
  const [showLightbox, setShowLightbox] = useState<boolean>(false);

  // Moderation Action Reason Dialog State (for REJECT or REQUEST_REVISION)
  const [activeActionType, setActiveActionType] = useState<string | null>(null);
  const [actionReasonCode, setActionReasonCode] = useState<string>('PRICE_ANOMALY');
  const [actionSellerMessage, setActionSellerMessage] = useState<string>('');
  const [actionInternalNote, setActionInternalNote] = useState<string>('');
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchListingDetails = async () => {
    if (!listingId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/listing-moderation/listings/${listingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('İlan detayları alınamadı.');
      const data = await res.json();
      setListingData(data);
      setActiveImageIdx(0);
    } catch (err: any) {
      setError(err.message || 'İlan bilgileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !listingId) {
      setListingData(null);
      setError(null);
      setActiveActionType(null);
      return;
    }
    fetchListingDetails();
  }, [isOpen, listingId]);

  if (!isOpen || !listingId) return null;

  const executeAction = async (endpointSuffix: string, payload?: any) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    setSubmittingAction(true);
    setActionError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/listing-moderation/listings/${listingId}/${endpointSuffix}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Moderasyon işlemi gerçekleştirilemedi.');
      }

      setActiveActionType(null);
      await fetchListingDetails();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'İşlem sırasında bir hata oluştu.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleApprove = () => executeAction('approve');
  const handleSendToDetailedReview = () => executeAction('send-to-detailed-review', { internalNote: 'Admin detaylı incelemeye sevk etti.' });
  const handleSetPassive = () => executeAction('set-passive');
  const handleReopen = () => executeAction('reopen');

  const handleOpenPromptDialog = (actionType: 'REQUEST_REVISION' | 'REJECT') => {
    setActiveActionType(actionType);
    setActionError(null);
    if (actionType === 'REQUEST_REVISION') {
      setActionReasonCode('PHOTO_INSUFFICIENT');
      setActionSellerMessage('Lütfen aracın fotoğraflarını ve eksik teknik bilgilerini güncelleyiniz.');
    } else {
      setActionReasonCode('FAKED_LISTING');
      setActionSellerMessage('İlanınız TorqueScout yayın ve güvenlik ilkelerine uymadığı için reddedilmiştir.');
    }
    setActionInternalNote('');
  };

  const handleSubmitPromptDialog = () => {
    if (!actionSellerMessage.trim()) {
      setActionError('Satıcıya iletilecek açıklama zorunludur.');
      return;
    }
    if (activeActionType === 'REQUEST_REVISION') {
      executeAction('request-revision', {
        reasonCode: actionReasonCode,
        sellerMessage: actionSellerMessage,
        internalNote: actionInternalNote,
      });
    } else if (activeActionType === 'REJECT') {
      executeAction('reject', {
        reasonCode: actionReasonCode,
        sellerMessage: actionSellerMessage,
        internalNote: actionInternalNote,
        allowResubmission: false,
      });
    }
  };

  const l = listingData?.listing;
  const seller = listingData?.seller;
  const media = listingData?.media || [];
  const damage = listingData?.damageDeclaration;
  const autoChecks = listingData?.autoChecks || [];
  const pastActions = listingData?.pastActions || [];
  const promoSummary = listingData?.promotionSummary;

  const statusResolution = resolveEffectiveListingStatus({
    status: l?.status,
    expiresAt: l?.expiresAt,
    publishedAt: l?.publishedAt,
  });

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150 font-sans">
      <div className="bg-[#0b0f19] border border-white/15 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center shrink-0">
              <Car className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-orange-400">
                  {l?.publicListingNo || listingId?.slice(0, 10)}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono ${statusResolution.badgeClass}`}>
                  {statusResolution.label}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-white truncate max-w-md sm:max-w-xl">
                {l?.title || 'İlan Moderasyon İncelemesi'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {listingId && (
              <a
                href={`/listings/${listingId}`}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Kamu ekranında görüntüle"
              >
                <span>Kamu Ekranı</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-white/10 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
              <div className="text-slate-400 font-medium">İlan detayları yükleniyor...</div>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-center space-y-2">
              <AlertTriangle className="w-8 h-8 mx-auto" />
              <div className="font-bold">{error}</div>
              <button
                onClick={fetchListingDetails}
                className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl font-bold transition"
              >
                Yeniden Dene
              </button>
            </div>
          ) : l ? (
            <>
              {/* 1. PHOTO GALLERY WITH THUMBNAILS & LIGHTBOX TRIGGER */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-orange-400" />
                    <span>İlan Fotoğrafları ({media.length})</span>
                  </span>
                  {media.length > 0 && (
                    <button
                      onClick={() => setShowLightbox(true)}
                      className="text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer transition"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Tam Ekran İncele</span>
                    </button>
                  )}
                </div>

                {media.length > 0 ? (
                  <div className="space-y-2">
                    {/* Main Active Image Viewport */}
                    <div
                      onClick={() => setShowLightbox(true)}
                      className="h-64 sm:h-80 w-full rounded-2xl bg-slate-950 overflow-hidden relative group cursor-pointer border border-white/5 flex items-center justify-center"
                    >
                      <img
                        src={media[activeImageIdx]?.url}
                        alt="İlan Görseli"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="px-4 py-2 rounded-xl bg-black/75 text-white text-xs font-bold border border-white/20 flex items-center gap-2">
                          <Eye className="w-4 h-4 text-orange-400" /> Büyüt ({activeImageIdx + 1}/{media.length})
                        </span>
                      </div>
                    </div>

                    {/* Thumbnail Strip */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                      {media.map((m: any, idx: number) => (
                        <button
                          key={m.id || idx}
                          onClick={() => setActiveImageIdx(idx)}
                          className={`w-16 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                            activeImageIdx === idx ? 'border-orange-500 scale-105 shadow-md' : 'border-white/10 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={m.url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-2xl bg-slate-950 border border-white/5 text-slate-500 font-medium">
                    Bu ilana ait fotoğraf yüklenmemiş.
                  </div>
                )}
              </div>

              {/* 2. PRICE & KEY METRICS GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="p-3.5 bg-slate-950/70 border border-white/5 rounded-2xl">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Fiyat</span>
                  <span className="text-base sm:text-lg font-black text-emerald-400 block mt-0.5">
                    ₺{Number(l.price || l.priceAmount || 0).toLocaleString('tr-TR')}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-white/5 rounded-2xl">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Kilometre</span>
                  <span className="text-sm sm:text-base font-bold text-white block mt-0.5">
                    {Number(l.mileage || l.kilometers || 0).toLocaleString('tr-TR')} km
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-white/5 rounded-2xl">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Konum</span>
                  <span className="text-sm font-bold text-slate-200 block truncate mt-0.5 font-sans">
                    {l.city || 'Belirtilmedi'} {l.district ? `/ ${l.district}` : ''}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-white/5 rounded-2xl">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Gönderim Tarihi</span>
                  <span className="text-xs font-bold text-slate-300 block mt-0.5">
                    {new Date(l.createdAt).toLocaleDateString('tr-TR')}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {new Date(l.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* YAYIN & GÖRÜNÜRLÜK (COMMERCIAL PROMOTION SUMMARY) */}
              <div className="p-4 bg-gradient-to-br from-slate-950 via-slate-900/60 to-slate-950 border border-orange-500/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                    <span>Yayın & Görünürlük</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    {promoSummary?.publicationType === 'SHOWCASE_URGENT'
                      ? 'Vitrin + Acil'
                      : promoSummary?.publicationType === 'SHOWCASE'
                      ? 'Vitrin'
                      : promoSummary?.publicationType === 'URGENT'
                      ? 'Acil'
                      : 'Standart'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[10px]">Yayın Türü</span>
                    <strong className="text-white font-bold block mt-0.5">
                      {promoSummary?.publicationType === 'SHOWCASE_URGENT'
                        ? 'Vitrin + Acil'
                        : promoSummary?.publicationType === 'SHOWCASE'
                        ? 'Vitrin'
                        : promoSummary?.publicationType === 'URGENT'
                        ? 'Acil'
                        : 'Standart'}
                    </strong>
                  </div>

                  <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[10px]">Acil Durumu</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${
                        promoSummary?.urgent.status === 'ACTIVE'
                          ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                          : promoSummary?.urgent.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-400'
                          : 'bg-slate-600'
                      }`} />
                      <strong className={`font-bold ${
                        promoSummary?.urgent.status === 'ACTIVE'
                          ? 'text-rose-400'
                          : promoSummary?.urgent.status === 'PENDING_APPROVAL'
                          ? 'text-amber-300'
                          : 'text-slate-400'
                      }`}>
                        {promoSummary?.urgent.status === 'ACTIVE'
                          ? 'Evet — Aktif'
                          : promoSummary?.urgent.status === 'PENDING_APPROVAL'
                          ? 'Evet — Onay Bekliyor'
                          : promoSummary?.urgent.status === 'EXPIRED'
                          ? 'Süresi Doldu'
                          : 'Hayır'}
                      </strong>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[10px]">Vitrin Durumu</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${
                        promoSummary?.showcase.status === 'ACTIVE'
                          ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                          : promoSummary?.showcase.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-400'
                          : 'bg-slate-600'
                      }`} />
                      <strong className={`font-bold ${
                        promoSummary?.showcase.status === 'ACTIVE'
                          ? 'text-amber-400'
                          : promoSummary?.showcase.status === 'PENDING_APPROVAL'
                          ? 'text-amber-300'
                          : 'text-slate-400'
                      }`}>
                        {promoSummary?.showcase.status === 'ACTIVE'
                          ? 'Evet — Aktif'
                          : promoSummary?.showcase.status === 'PENDING_APPROVAL'
                          ? 'Evet — Onay Bekliyor'
                          : promoSummary?.showcase.status === 'EXPIRED'
                          ? 'Süresi Doldu'
                          : 'Hayır'}
                      </strong>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[10px]">Satın Alma / Ticari Hak</span>
                    <strong className={`font-bold block mt-0.5 ${
                      promoSummary?.paymentStatus === 'PAID'
                        ? 'text-emerald-400'
                        : promoSummary?.paymentStatus === 'PENDING'
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}>
                      {promoSummary?.paymentStatus === 'PAID'
                        ? 'Doğrulandı'
                        : promoSummary?.paymentStatus === 'PENDING'
                        ? 'Ödeme Bekleniyor'
                        : 'Yok'}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/5 text-[11px]">
                  <div>
                    <span className="text-slate-500">Başlangıç: </span>
                    <strong className="text-slate-200">
                      {promoSummary?.startsAt
                        ? new Date(promoSummary.startsAt).toLocaleDateString('tr-TR') + ' ' + new Date(promoSummary.startsAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                        : 'Yayın onayı sonrası'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Bitiş: </span>
                    <strong className="text-slate-200">
                      {promoSummary?.endsAt
                        ? new Date(promoSummary.endsAt).toLocaleDateString('tr-TR') + ' ' + new Date(promoSummary.endsAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                        : (l?.expiresAt ? new Date(l.expiresAt).toLocaleDateString('tr-TR') : 'Yayın süresi sonu')}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 3. TECHNICAL SPECIFICATIONS & DETAILS */}
              <div className="p-4 bg-slate-950/50 border border-white/5 rounded-2xl space-y-3">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Araç Kimliği ve Teknik Özellikler</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Marka / Model:</span>
                    <strong className="text-white font-bold block truncate">{l.brand} {l.model}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Model Yılı:</span>
                    <strong className="text-white font-bold block">{l.year || l.modelYear}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Yakıt Tipi:</span>
                    <strong className="text-white font-bold block">{l.fuelType}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Vites / Şanzıman:</span>
                    <strong className="text-white font-bold block">{l.transmission}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Kasa Tipi:</span>
                    <strong className="text-white font-bold block">{l.bodyType}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Renk:</span>
                    <strong className="text-white font-bold block">{l.color}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Motor Gücü (HP):</span>
                    <strong className="text-white font-bold block">{l.enginePower || '-'} HP</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Motor Hacmi:</span>
                    <strong className="text-white font-bold block">{l.engineDisplacement ? `${l.engineDisplacement} cc` : '-'}</strong>
                  </div>
                </div>
              </div>

              {/* 4. DAMAGE DECLARATION & TRAMER */}
              {damage && (
                <div className="p-4 bg-slate-950/50 border border-white/5 rounded-2xl space-y-3">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>Hasar & Tramer Beyanı</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                    <div className="p-2.5 bg-slate-900 rounded-xl">
                      <span className="text-slate-500 block">Ağır Hasar Kaydı:</span>
                      <strong className={`font-bold block mt-0.5 ${damage.isHeavyDamaged ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {damage.isHeavyDamaged ? 'EVET (AĞIR HASARLI)' : 'HAYIR'}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-slate-900 rounded-xl">
                      <span className="text-slate-500 block">Tramer Hasar Tutarı:</span>
                      <strong className="font-bold text-white block mt-0.5">
                        ₺{Number(damage.tramerFee || 0).toLocaleString('tr-TR')}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-slate-900 rounded-xl">
                      <span className="text-slate-500 block">Boyalı Parçalar:</span>
                      <strong className="font-bold text-slate-200 block mt-0.5 truncate">
                        {Array.isArray(damage.paintedParts) && damage.paintedParts.length > 0
                          ? damage.paintedParts.join(', ')
                          : 'Boya Belirtilmedi'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. DESCRIPTION */}
              <div className="p-4 bg-slate-950/50 border border-white/5 rounded-2xl space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">İlan Açıklaması</span>
                <p className="text-slate-300 leading-relaxed whitespace-pre-line text-xs font-sans">
                  {l.description || 'Satıcı tarafından açıklama metni girilmemiş.'}
                </p>
              </div>

              {/* 6. SELLER INFORMATION CARD */}
              {seller && (
                <div className="p-4 bg-slate-950/50 border border-white/5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center text-sm border border-orange-500/30 shrink-0 font-mono">
                      {seller.fullName?.[0] || 'S'}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">{seller.fullName}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 flex-wrap">
                        <span>{seller.customerNo}</span>
                        <span>•</span>
                        <span>{seller.email}</span>
                        {seller.phone && (
                          <>
                            <span>•</span>
                            <span>{seller.phone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {onOpenSellerDrawer && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenSellerDrawer({
                          id: seller.userId || seller.id,
                          customerNo: seller.customerNo,
                          firstName: seller.fullName?.split(' ')[0],
                          lastName: seller.fullName?.split(' ').slice(1).join(' '),
                          email: seller.email,
                        });
                      }}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl border border-white/10 font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <User className="w-3.5 h-3.5 text-orange-400" />
                      <span>Satıcı Profilini Aç</span>
                    </button>
                  )}
                </div>
              )}

              {/* 7. AUTOMATED QUALITY & SAFETY CHECKS */}
              {autoChecks.length > 0 && (
                <div className="p-4 bg-slate-950/50 border border-white/5 rounded-2xl space-y-2.5">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Otomatik Güvenlik ve Kalite Kontrolleri</span>
                  <div className="space-y-2">
                    {autoChecks.map((chk: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                          chk.level === 'HIGH_RISK'
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                            : chk.level === 'WARNING'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        <span className="font-bold">{chk.check}: {chk.message}</span>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-black/40 font-bold shrink-0">
                          {chk.level}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 8. PAST MODERATION ACTION LOGS */}
              {pastActions.length > 0 && (
                <div className="p-4 bg-slate-950/50 border border-white/5 rounded-2xl space-y-2.5">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Geçmiş Moderasyon Aksiyonları</span>
                  <div className="space-y-2 font-mono text-[11px]">
                    {pastActions.map((act: any) => (
                      <div key={act.id} className="p-2.5 bg-slate-900 rounded-xl border border-white/5 space-y-1">
                        <div className="flex items-center justify-between text-slate-400 text-[10px]">
                          <span className="font-bold text-orange-400">{act.actionType} ({act.previousStatus} ➔ {act.newStatus})</span>
                          <span>{new Date(act.createdAt).toLocaleString('tr-TR')}</span>
                        </div>
                        {act.sellerMessage && <div className="text-slate-300 font-sans">{act.sellerMessage}</div>}
                        {act.internalNote && <div className="text-slate-500 text-[10px] italic">Not: {act.internalNote}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* REASON PROMPT MODAL OVERLAY (FOR REVISION OR REJECT) */}
        {activeActionType && (
          <div className="p-4 bg-slate-950 border-t border-orange-500/30 space-y-3 shrink-0 animate-in slide-in-from-bottom duration-150">
            <div className="flex items-center justify-between">
              <strong className="text-xs text-orange-400 font-bold uppercase flex items-center gap-1.5">
                {activeActionType === 'REQUEST_REVISION' ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400" /> Düzeltme Talebi Gönder
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-400" /> İlanı Reddet
                  </>
                )}
              </strong>
              <button
                onClick={() => setActiveActionType(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                İptal
              </button>
            </div>

            {actionError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold">
                {actionError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Neden Kodu</label>
                <select
                  value={actionReasonCode}
                  onChange={(e) => setActionReasonCode(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-white outline-none"
                >
                  <option value="PHOTO_INSUFFICIENT">Fotoğraflar Yetersiz / Kalitesiz</option>
                  <option value="PHOTO_MISMATCH">Görsel Araçla Uyuşmuyor</option>
                  <option value="PRICE_ANOMALY">Fiyat Anomalisi</option>
                  <option value="PHONE_IN_DESCRIPTION">Açıklamada İletişim Bilgisi Var</option>
                  <option value="MISSING_SPECS">Hasar / Tramer Eksik</option>
                  <option value="FAKED_LISTING">Sahte veya Yanıltıcı İlan</option>
                  <option value="DUPLICATE_LISTING">Tekrarlanan / Çift İlan</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Dahili Yönetici Notu (Opsiyonel)</label>
                <input
                  type="text"
                  placeholder="Yalnızca adminlerin göreceği not..."
                  value={actionInternalNote}
                  onChange={(e) => setActionInternalNote(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Satıcıya İletilecek Açıklama</label>
              <textarea
                rows={2}
                value={actionSellerMessage}
                onChange={(e) => setActionSellerMessage(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-white outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveActionType(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={submittingAction}
                onClick={handleSubmitPromptDialog}
                className={`px-5 py-2 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 ${
                  activeActionType === 'REQUEST_REVISION'
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20'
                }`}
              >
                {submittingAction ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>İşlemi Onayla ve Kaydet</span>
              </button>
            </div>
          </div>
        )}

        {/* MODAL ACTIONS FOOTER */}
        {!activeActionType && l && (
          <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Mevcut Durum:</span>
              <span className={`px-2 py-0.5 rounded font-bold font-mono text-[10px] uppercase ${statusResolution.badgeClass}`}>
                {statusResolution.label}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* If pending review, detailed review, or revision required: */}
              {(l.status === 'PENDING_REVIEW' || l.status === 'PENDING' || l.status === 'REVISION_REQUIRED' || l.status === 'DETAILED_REVIEW') && (
                <>
                  <button
                    onClick={() => handleOpenPromptDialog('REJECT')}
                    disabled={submittingAction}
                    className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reddet
                  </button>

                  <button
                    onClick={() => handleOpenPromptDialog('REQUEST_REVISION')}
                    disabled={submittingAction}
                    className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Düzeltme İste
                  </button>

                  {l.status !== 'DETAILED_REVIEW' && (
                    <button
                      onClick={handleSendToDetailedReview}
                      disabled={submittingAction}
                      className="px-3.5 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer text-xs"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" /> Detaylı İnceleme
                    </button>
                  )}

                  <button
                    onClick={handleApprove}
                    disabled={submittingAction}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition shadow-lg shadow-emerald-600/25 flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    {submittingAction ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>İlanı Onayla (Yayına Al)</span>
                  </button>
                </>
              )}

              {/* If Active: */}
              {l.status === 'ACTIVE' && (
                <button
                  onClick={handleSetPassive}
                  disabled={submittingAction}
                  className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Clock className="w-3.5 h-3.5" /> Pasife Al
                </button>
              )}

              {/* If Passive: */}
              {l.status === 'PASSIVE' && (
                <button
                  onClick={() => executeAction('activate', { reasonCode: 'ADMIN_REACTIVATION', sellerMessage: 'İlanınız yönetici tarafından yeniden yayına alınmıştır.' })}
                  disabled={submittingAction}
                  className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Aktifleştir
                </button>
              )}

              {/* If Rejected: */}
              {l.status === 'REJECTED' && (
                <button
                  onClick={handleReopen}
                  disabled={submittingAction}
                  className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Tekrar İncele
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FULLSCREEN LIGHTBOX FOR IMAGES */}
      {showLightbox && media.length > 0 && (
        <div className="fixed inset-0 bg-black/95 z-[60] flex flex-col items-center justify-between p-4 animate-in fade-in duration-200">
          <div className="w-full flex items-center justify-between text-white py-2">
            <span className="font-mono text-sm font-bold">
              Fotoğraf {activeImageIdx + 1} / {media.length}
            </span>
            <button
              onClick={() => setShowLightbox(false)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative max-w-5xl max-h-[80vh] w-full h-full flex items-center justify-center">
            <img
              src={media[activeImageIdx]?.url}
              alt="Lightbox View"
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            />

            {activeImageIdx > 0 && (
              <button
                onClick={() => setActiveImageIdx(activeImageIdx - 1)}
                className="absolute left-2 p-3 bg-black/60 hover:bg-black/80 rounded-full text-white cursor-pointer transition border border-white/10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {activeImageIdx < media.length - 1 && (
              <button
                onClick={() => setActiveImageIdx(activeImageIdx + 1)}
                className="absolute right-2 p-3 bg-black/60 hover:bg-black/80 rounded-full text-white cursor-pointer transition border border-white/10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-2 max-w-xl">
            {media.map((m: any, idx: number) => (
              <button
                key={m.id || idx}
                onClick={() => setActiveImageIdx(idx)}
                className={`w-14 h-10 rounded-lg overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                  activeImageIdx === idx ? 'border-orange-500 scale-105' : 'border-white/20 opacity-60'
                }`}
              >
                <img src={m.url} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
