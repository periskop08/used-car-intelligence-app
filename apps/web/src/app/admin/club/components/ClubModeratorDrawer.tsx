'use client';

import React, { useState } from 'react';
import { X, ShieldCheck, User, Clock, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

interface ClubModeratorDrawerProps {
  moderator: any | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onOpenUserDrawer?: (userId: string) => void;
}

export function ClubModeratorDrawer({
  moderator,
  isOpen,
  onClose,
  onRefresh,
  onOpenUserDrawer,
}: ClubModeratorDrawerProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !moderator) return null;

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const handleRevoke = async () => {
    if (!token) return;
    if (!confirm('Bu kullanıcının Club Moderatörlüğü yetkisini kaldırmak istediğinize emin misiniz?')) return;

    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/moderators/${moderator.userId || moderator.user?.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Moderatörlük yetkisi kaldırılamadı.');
      onRefresh?.();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const isActive = !moderator.revokedAt;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-slate-950 border-l border-white/10 w-full max-w-xl h-full flex flex-col shadow-2xl font-mono text-xs">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold">
              🛡️
            </span>
            <div>
              <h3 className="font-bold text-white text-sm">Moderatör Detayı</h3>
              <p className="text-[11px] text-slate-400">ID: {moderator.id}</p>
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

          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-slate-900/80 border border-white/5 rounded-xl">
            <span className="text-slate-400">Yetki Durumu:</span>
            <span
              className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
              }`}
            >
              {isActive ? 'AKTİF MODERATÖR' : 'YETKİ KALDIRILDI'}
            </span>
          </div>

          {/* User Details */}
          <div className="p-4 bg-slate-900/40 border border-white/5 rounded-xl space-y-2">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Moderatör Hesabı</span>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white font-sans text-sm block">
                  {moderator.userFormatted || moderator.user?.name || moderator.user?.username || 'Kullanıcı'}
                </span>
                <span className="text-slate-400 text-[11px]">
                  {moderator.user?.email || '—'}
                </span>
              </div>
              {onOpenUserDrawer && (moderator.userId || moderator.user?.id) && (
                <button
                  onClick={() => onOpenUserDrawer(moderator.userId || moderator.user.id)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-orange-400 rounded-lg transition font-bold flex items-center gap-1 cursor-pointer"
                >
                  <User className="w-3 h-3" /> Kullanıcıyı Gör
                </button>
              )}
            </div>
          </div>

          {/* Assignment Meta */}
          <div className="p-4 bg-slate-900/40 border border-white/5 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Atayan Yönetici:</span>
              <span className="text-white font-bold">
                {moderator.assignedByFormatted || moderator.assignedByAdmin?.username || 'Sistem Yöneticisi'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Atanma Tarihi:</span>
              <span className="text-slate-300 font-bold">
                {new Date(moderator.assignedAt || moderator.createdAt).toLocaleString('tr-TR')}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        {isActive && (
          <div className="p-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-end">
            <button
              onClick={handleRevoke}
              disabled={actionLoading}
              className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> Moderatörlüğü Kaldır
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
