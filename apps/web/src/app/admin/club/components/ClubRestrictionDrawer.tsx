'use client';

import React, { useState } from 'react';
import { X, ShieldAlert, User, Clock, CheckCircle2, RotateCcw } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

interface ClubRestrictionDrawerProps {
  restriction: any | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onOpenUserDrawer?: (userId: string) => void;
}

export function ClubRestrictionDrawer({
  restriction,
  isOpen,
  onClose,
  onRefresh,
  onOpenUserDrawer,
}: ClubRestrictionDrawerProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !restriction) return null;

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const handleRevoke = async () => {
    if (!token) return;
    const isBan = restriction.type === 'BAN';
    const msg = isBan ? 'Bu kullanıcının yasağını kaldırmak istediğinize emin misiniz?' : 'Bu kullanıcının susturmasını kaldırmak istediğinize emin misiniz?';
    if (!confirm(msg)) return;

    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/restrictions/${restriction.id}/revoke`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Kısıtlama kaldırılamadı.');
      onRefresh?.();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const isMute = restriction.type === 'MUTE';
  const isActive = !restriction.revokedAt;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-slate-950 border-l border-white/10 w-full max-w-xl h-full flex flex-col shadow-2xl font-mono text-xs">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold">
              🚫
            </span>
            <div>
              <h3 className="font-bold text-white text-sm">Kısıtlama Detayı</h3>
              <p className="text-[11px] text-slate-400">ID: {restriction.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              {error}
            </div>
          )}

          {/* Status & Type */}
          <div className="flex items-center justify-between p-4 bg-slate-900/80 border border-white/5 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Tür:</span>
              <span
                className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                  isMute
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {isMute ? 'GEÇİCİ SUSTURMA (MUTE)' : 'KULLANICI YASAKLAMA (BAN)'}
              </span>
            </div>

            <span
              className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
              }`}
            >
              {isActive ? 'AKTİF KISITLAMA' : 'KALDIRILDI / SÜRESİ DOLDU'}
            </span>
          </div>

          {/* Target User */}
          <div className="p-4 bg-slate-900/40 border border-white/5 rounded-xl space-y-2">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Kısıtlanan Kullanıcı</span>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white font-sans text-sm block">
                  {restriction.userFormatted || restriction.user?.name || restriction.user?.username || 'Kullanıcı'}
                </span>
                <span className="text-slate-400 text-[11px]">
                  {restriction.user?.email || '—'}
                </span>
              </div>
              {onOpenUserDrawer && restriction.user?.id && (
                <button
                  onClick={() => onOpenUserDrawer(restriction.user.id)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-orange-400 rounded-lg transition font-bold flex items-center gap-1 cursor-pointer"
                >
                  <User className="w-3 h-3" /> Kullanıcıyı Gör
                </button>
              )}
            </div>
          </div>

          {/* Reason & Operator */}
          <div className="p-4 bg-slate-900/40 border border-white/5 rounded-xl space-y-3">
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Neden / Açıklama</span>
              <p className="text-slate-200 text-xs font-sans whitespace-pre-wrap">
                {restriction.reason || 'Neden belirtilmedi.'}
              </p>
            </div>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Uygulayan Yetkili:</span>
              <span className="text-white font-bold">
                {restriction.createdByFormatted || restriction.createdBy?.username || 'Sistem Yöneticisi'}
              </span>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="p-3 bg-slate-900/40 border border-white/5 rounded-xl space-y-1">
              <span className="text-slate-500 block">Başlangıç Tarihi</span>
              <span className="text-slate-300 font-bold">
                {new Date(restriction.createdAt).toLocaleString('tr-TR')}
              </span>
            </div>
            <div className="p-3 bg-slate-900/40 border border-white/5 rounded-xl space-y-1">
              <span className="text-slate-500 block">Bitiş / Kaldırılma Tarihi</span>
              <span className="text-slate-300 font-bold">
                {restriction.expiresAt
                  ? new Date(restriction.expiresAt).toLocaleString('tr-TR')
                  : restriction.revokedAt
                  ? new Date(restriction.revokedAt).toLocaleString('tr-TR')
                  : 'Süresiz / Süresiz Ban'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        {isActive && (
          <div className="p-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-end">
            <button
              onClick={handleRevoke}
              disabled={actionLoading}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isMute ? 'Susturmayı Kaldır' : 'Banı Kaldır'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
