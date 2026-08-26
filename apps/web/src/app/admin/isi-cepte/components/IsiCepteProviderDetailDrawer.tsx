'use client';

import React, { useEffect, useRef } from 'react';
import {
  X,
  Award,
  Globe,
  Tag,
  Car,
  Phone,
  Mail,
  Building,
  Info,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { IsiCepteProvider } from '@/types/isiCepteDomain';

interface IsiCepteProviderDetailDrawerProps {
  provider: IsiCepteProvider | null;
  onClose: () => void;
  initialSection?: 'REGIONAL_VISIBILITY' | 'GENERAL';
}

export default function IsiCepteProviderDetailDrawer({
  provider,
  onClose,
  initialSection = 'GENERAL',
}: IsiCepteProviderDetailDrawerProps) {
  const regionalSectionRef = useRef<HTMLDivElement>(null);

  // ESC Key Listener to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Optional auto-scroll to regional section when opened from regional view
  useEffect(() => {
    if (provider && initialSection === 'REGIONAL_VISIBILITY' && regionalSectionRef.current) {
      setTimeout(() => {
        regionalSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, [provider, initialSection]);

  if (!provider) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl h-full bg-[#0b0f19] border-l border-white/10 p-6 space-y-6 overflow-y-auto font-sans shadow-2xl animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="flex justify-between items-start pb-4 border-b border-white/10">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
              İşi Cepte Provider ID: {provider.isicepteProviderId}
            </span>
            <h2 className="text-lg font-black text-white">{provider.businessName}</h2>
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span>Veri Kaynağı: {provider.sourceSystem || 'İşi Cepte Sync'}</span>
              <span>•</span>
              <span className="text-emerald-400">Üyelik: {provider.membershipStatus}</span>
              <span>•</span>
              <span className="text-cyan-400">TS Listeleme: {provider.torqueScoutOptIn ? 'Opt-In (Açık)' : 'Opt-Out (Kapalı)'}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer"
            title="Kapat (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Read-Only Informational Notice */}
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-[11px] text-cyan-300 flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0 text-cyan-400" />
          <span>
            Tekil İşletme Varlığı (Shared 360° Admin Detail). Bu pencere "İşletmeler / Ustalar" ve "Bölgesel Görünürlük" sekmelerinden ortak kullanılır. Profil verileri İşi Cepte kaynaklıdır ve salt okunurdur.
          </span>
        </div>

        {/* Section 1: Temel Kimlik */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2 font-mono text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Section 1 • Temel Kimlik</span>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-500 block text-[10px]">İşletme Adı</span>
              <span className="text-white font-bold">{provider.businessName}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">İşi Cepte Provider ID</span>
              <span className="text-cyan-400 font-bold">{provider.isicepteProviderId}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">TorqueScout Ref ID</span>
              <span className="text-slate-400">{provider.id}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Kaynak Sistem</span>
              <span className="text-slate-300">{provider.sourceSystem || 'İşi Cepte'}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Üyelik & TorqueScout Listeleme */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-3 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block">Section 2 • Üyelik & TorqueScout Listeleme</span>
          <div className="grid grid-cols-3 gap-3 font-mono">
            <div>
              <span className="text-slate-500 block text-[10px]">İşi Cepte Üyeliği</span>
              <span className="text-emerald-400 font-bold">{provider.membershipStatus || 'Bilinmiyor'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">TorqueScout Opt-In</span>
              <span className="text-cyan-400 font-bold">{provider.torqueScoutOptIn ? 'Açık (Opt-In)' : 'Kapalı (Opt-Out)'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Yerel Görünürlük State</span>
              <span className="text-slate-300">{provider.localListingState || 'ELIGIBLE'}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Bölge */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block">Section 3 • Coğrafi Hizmet Bölgesi</span>
          <div className="grid grid-cols-3 gap-3 font-mono">
            <div>
              <span className="text-slate-500 block text-[10px]">Ülke Kodu</span>
              <span className="text-white font-bold">{provider.countryCode || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">İl / Bölge</span>
              <span className="text-white font-bold">{provider.regionCode || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">İlçe / Lokal Alan</span>
              <span className="text-white font-bold">{provider.district || 'Tüm Bölge'}</span>
            </div>
          </div>
        </div>

        {/* Section 4: Oto Hizmetleri */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block">Section 4 • Oto Hizmet Kategorileri</span>
          {provider.autoServiceCategories && provider.autoServiceCategories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {provider.autoServiceCategories.map((c) => (
                <span key={c.id} className="px-2.5 py-1 bg-slate-900 border border-white/10 text-cyan-300 rounded-lg text-xs font-medium flex items-center gap-1">
                  <Tag className="w-3 h-3 text-cyan-400" /> {c.name}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 text-xs font-mono">Hizmet bilgisi bulunmuyor.</div>
          )}
        </div>

        {/* Section 5: Hizmet Verilen Markalar */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Section 5 • Hizmet Verilen Markalar</span>
            <span className="text-[9px] text-slate-500 italic font-mono">Markaya hizmet veriyor (yetkili bayi ifadesi taşımaz)</span>
          </div>
          {provider.supportedVehicleBrands && provider.supportedVehicleBrands.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {provider.supportedVehicleBrands.map((b, idx) => (
                <span key={idx} className="px-2.5 py-1 bg-slate-900 border border-white/10 text-purple-300 rounded-lg text-xs font-medium flex items-center gap-1">
                  <Car className="w-3 h-3 text-purple-400" /> {b.name} markasına hizmet veriyor
                </span>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 text-xs font-mono">Marka bilgisi bulunmuyor.</div>
          )}
        </div>

        {/* Section 6: Bölgesel Görünürlük Durumu & Uygunluk Nedeni */}
        <div
          ref={regionalSectionRef}
          className={`p-4 bg-slate-950 rounded-2xl border space-y-2 text-xs font-mono transition ${
            initialSection === 'REGIONAL_VISIBILITY' ? 'border-emerald-500/40 ring-1 ring-emerald-500/20' : 'border-white/5'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Section 6 • Bölgesel Görünürlük Durumu & Uygunluk Nedeni</span>
            {initialSection === 'REGIONAL_VISIBILITY' && (
              <span className="text-[9px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-mono">Bölgesel Odaklı Görünüm</span>
            )}
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>Yerel Listeleme Uygunluğu:</span>
            <span
              className={`font-bold inline-flex items-center gap-1 ${
                provider.membershipStatus === 'ACTIVE' && provider.torqueScoutOptIn
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {provider.membershipStatus === 'ACTIVE' && provider.torqueScoutOptIn ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> UYGUN (Eligible)
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" /> UYGUN DEĞİL
                </>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Uygunluk Nedeni:</span>
            <span className="text-slate-200">
              {provider.eligibilityReasonText ||
                (provider.membershipStatus !== 'ACTIVE'
                  ? 'İşi Cepte üyeliği aktif değil'
                  : !provider.torqueScoutOptIn
                  ? 'TorqueScout listeleme izni kapalı'
                  : 'Tüm şartlar uygun')}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Eşleşen Kapsam:</span>
            <span>{provider.countryCode} / {provider.regionCode} {provider.district ? `(${provider.district})` : ''}</span>
          </div>
        </div>

        {/* Section 7 & 8: Görünürlük Hakları (Vitrin & Ülke Geneli) */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-3 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block">Section 7 & 8 • Görünürlük Hakları (Vitrin & Ülke Geneli)</span>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Showcase / Vitrin */}
            <div className="p-3 bg-slate-900 border border-amber-500/20 rounded-xl space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-amber-400 text-xs flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> Vitrin Görünürlüğü
                </span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${provider.showcase?.active ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'}`}>
                  {provider.showcase?.active ? 'AKTİF' : 'YOK / PASİF'}
                </span>
              </div>
              {provider.showcase?.active ? (
                <div className="text-[10px] text-slate-400 font-mono space-y-0.5 pt-1 border-t border-white/5">
                  <div>Kaynak: {provider.showcase.source === 'ADMIN_GRANTED' ? 'Admin Tarafından Verildi' : 'İşi Cepte Satın Alımı'}</div>
                  <div>Başlangıç: {provider.showcase.startsAt || '—'}</div>
                  <div>Bitiş: {provider.showcase.endsAt || 'Süresiz'}</div>
                </div>
              ) : (
                <div className="text-[10px] text-slate-500 font-mono italic">Aktif Vitrin hakkı bulunmuyor.</div>
              )}
            </div>

            {/* National Visibility / Ülke Geneli */}
            <div className="p-3 bg-slate-900 border border-purple-500/20 rounded-xl space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-purple-400 text-xs flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> Ülke Geneli Görünürlük
                </span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${provider.nationalVisibility?.active ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-500'}`}>
                  {provider.nationalVisibility?.active ? 'AKTİF' : 'YOK / PASİF'}
                </span>
              </div>
              {provider.nationalVisibility?.active ? (
                <div className="text-[10px] text-slate-400 font-mono space-y-0.5 pt-1 border-t border-white/5">
                  <div>Kaynak: {provider.nationalVisibility.source === 'ADMIN_GRANTED' ? 'Admin Tarafından Verildi' : 'İşi Cepte Satın Alımı'}</div>
                  <div>Başlangıç: {provider.nationalVisibility.startsAt || '—'}</div>
                  <div>Bitiş: {provider.nationalVisibility.endsAt || 'Süresiz'}</div>
                </div>
              ) : (
                <div className="text-[10px] text-slate-500 font-mono italic">Aktif Ülke Geneli hakkı bulunmuyor.</div>
              )}
            </div>
          </div>
        </div>

        {/* Section 9: Senkronizasyon Zaman Çizelgesi */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2 text-[11px] font-mono text-slate-400">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Section 9 • Senkronizasyon Zaman Çizelgesi</span>
          <div className="flex justify-between items-center">
            <span>Son Senkronizasyon (Last Synced):</span>
            <span className="text-slate-200">{provider.lastSyncedAt || 'Henüz yapılmadı'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Kaynak Güncelleme (Source UpdatedAt):</span>
            <span className="text-slate-200">{provider.sourceUpdatedAt || '—'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Oluşturulma Tarihi:</span>
            <span className="text-slate-200">{provider.createdAt || '—'}</span>
          </div>
        </div>

        {/* Section 10: İletişim Bilgileri (Salt Okunur) */}
        {(provider.phone || provider.email || provider.address) && (
          <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2 text-xs font-mono">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Section 10 • İletişim Bilgileri (İşi Cepte Sync)</span>
            {provider.phone && (
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{provider.phone}</span>
              </div>
            )}
            {provider.email && (
              <div className="flex items-center gap-2 text-slate-300">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{provider.email}</span>
              </div>
            )}
            {provider.address && (
              <div className="flex items-center gap-2 text-slate-300">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>{provider.address}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
