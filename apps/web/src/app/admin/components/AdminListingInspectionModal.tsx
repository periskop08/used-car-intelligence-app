'use client';

import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Car, User, Calendar, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

interface AdminListingInspectionModalProps {
  listingId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export function AdminListingInspectionModal({
  listingId,
  isOpen,
  onClose,
  onRefresh,
}: AdminListingInspectionModalProps) {
  const [loading, setLoading] = useState(false);
  const [listingData, setListingData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !listingId) {
      setListingData(null);
      setError(null);
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE_URL}/listings/${listingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('İlan detayları okunamadı.');
        return res.json();
      })
      .then((data) => {
        setListingData(data.listing || data);
      })
      .catch((err: any) => {
        setError(err.message || 'İlan bilgileri yüklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [isOpen, listingId]);

  if (!isOpen || !listingId) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-white/10 rounded-2xl max-w-xl w-full p-6 space-y-4 font-mono text-xs shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Car className="w-4 h-4 text-cyan-400" />
            <span>İlan İnceleme Penceresi (Read-Only)</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">İlan detayları yükleniyor...</div>
        ) : error ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
            {error}
          </div>
        ) : listingData ? (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900 border border-white/5 rounded-xl space-y-2">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">İlan Başlığı & ID</span>
              <div className="font-bold text-white text-base">{listingData.title}</div>
              <div className="text-[11px] text-slate-400">ID: {listingData.id}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-900 border border-white/5 rounded-xl">
                <span className="text-[10px] text-slate-500 block">Fiyat</span>
                <span className="font-bold text-emerald-400 text-sm">
                  ₺{Number(listingData.priceAmount || listingData.price || 0).toLocaleString('tr-TR')}
                </span>
              </div>
              <div className="p-3 bg-slate-900 border border-white/5 rounded-xl">
                <span className="text-[10px] text-slate-500 block">Durum</span>
                <span className="font-bold text-cyan-400 uppercase text-xs">
                  {listingData.status || 'AKTİF'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-900 border border-white/5 rounded-xl space-y-2">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Promosyon & Görünürlük Durumu</span>
              <div className="flex items-center justify-between text-slate-300">
                <span>Acil İlan Rozeti:</span>
                <span className={`font-bold ${listingData.isUrgent ? 'text-rose-400' : 'text-slate-500'}`}>
                  {listingData.isUrgent ? 'AKTİF (ACİL)' : 'PASİF'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Vitrin & Keşfet Ön Plana Çıkarma:</span>
                <span className={`font-bold ${listingData.isFeatured ? 'text-amber-400' : 'text-slate-500'}`}>
                  {listingData.isFeatured ? 'AKTİF (VİTRİN)' : 'PASİF'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <a
                href={`/listings/${listingData.id}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>İlanı Kamu Ekranında Gör</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
