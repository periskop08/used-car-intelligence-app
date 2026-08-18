'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, ShieldAlert, AlertTriangle, Clock, UserCheck, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

interface ClubAddRestrictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  preselectedUserId?: string | null;
}

export function ClubAddRestrictionModal({
  isOpen,
  onClose,
  onRefresh,
  preselectedUserId,
}: ClubAddRestrictionModalProps) {
  const [step, setStep] = useState<number>(1);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [restrictionType, setRestrictionType] = useState<'MUTE' | 'BAN'>('MUTE');
  const [durationPreset, setDurationPreset] = useState<string>('7_DAYS');
  const [customEndsAt, setCustomEndsAt] = useState<string>('');
  const [reason, setReason] = useState<string>('Topluluk Kuralı İhlali');
  const [adminNote, setAdminNote] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    setLoadingUsers(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery.trim()) queryParams.set('search', searchQuery.trim());
      queryParams.set('limit', '50');

      const res = await fetch(`${API_BASE_URL}/admin/club/users?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const userList = Array.isArray(data) ? data : data.users || [];
        setUsers(userList);

        if (preselectedUserId) {
          const found = userList.find((u: any) => u.id === preselectedUserId);
          if (found) {
            setSelectedUser(found);
            setStep(2);
          }
        }
      }
    } catch (e) {
      console.error('Fetch users error:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError(null);
      setSuccessMsg(null);
      fetchUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.customerNo || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q)
    );
  });

  const handleCreateRestriction = async () => {
    if (!selectedUser) return;
    if (!reason.trim()) {
      setError('Lütfen kısıtlama nedenini seçin veya açıklayın.');
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    setSubmitting(true);
    setError(null);
    try {
      let durationDays = 7;
      if (durationPreset === '1_HOUR') durationDays = 0.04;
      else if (durationPreset === '1_DAY') durationDays = 1;
      else if (durationPreset === '3_DAYS') durationDays = 3;
      else if (durationPreset === '7_DAYS') durationDays = 7;
      else if (durationPreset === '30_DAYS') durationDays = 30;
      else if (durationPreset === 'PERMANENT') durationDays = 3650;

      const endpoint = restrictionType === 'BAN' ? 'ban' : 'mute';

      const res = await fetch(`${API_BASE_URL}/admin/club/users/${selectedUser.id}/${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: reason.trim(),
          durationDays,
          adminNote: adminNote.trim() || undefined,
        }),
      });

      if (res.ok) {
        setSuccessMsg(
          `${selectedUser.displayName} üzerine ${
            restrictionType === 'BAN' ? 'Tork Scout Club Yasağı' : 'Tork Scout Club Susturması'
          } uygulandı.`
        );
        setTimeout(() => {
          onRefresh?.();
          onClose();
        }, 1200);
      } else {
        const errData = await res.json();
        throw new Error(errData.message || 'Kısıtlama oluşturulamadı.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-white/10 rounded-2xl max-w-xl w-full p-6 space-y-4 font-mono text-xs shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 font-sans">
            <ShieldAlert className="w-4 h-4 text-orange-400" />
            <span>+ Kısıtlama Ekle (Susturma & Ban)</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            {successMsg}
          </div>
        )}

        {/* Step 1: Member Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 font-sans">
                1. Adım: Kısıtlanacak Club Üyesini Seçin
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                {filteredUsers.length} Üye Listeleniyor
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Müşteri No, Ad Soyad veya E-posta ile filtrele..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {loadingUsers ? (
                <div className="p-6 text-center text-slate-400">Üyeler yükleniyor...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-slate-500">Üye bulunamadı.</div>
              ) : (
                filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => {
                      setSelectedUser(u);
                      setStep(2);
                    }}
                    className="p-3 bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-orange-500/40 rounded-xl flex items-center justify-between cursor-pointer transition"
                  >
                    <div>
                      <span className="font-bold text-white font-sans text-xs block">{u.displayName}</span>
                      <span className="text-slate-400 text-[11px] font-mono">
                        {u.customerNo} · {u.email}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {u.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          {u.badge.label}
                        </span>
                      )}
                      {u.isBanned ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          YASAKLI
                        </span>
                      ) : u.isMuted ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          SUSTURULDU
                        </span>
                      ) : (
                        <span className="text-orange-400 font-bold text-xs">Seç ➔</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 2: Restriction Configuration */}
        {step === 2 && selectedUser && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[10px] block">Seçilen Kullanıcı</span>
                <span className="font-bold text-white font-sans text-sm block">{selectedUser.displayName}</span>
                <span className="text-slate-400 text-[11px] font-mono">{selectedUser.customerNo}</span>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-xs text-orange-400 font-bold hover:underline"
              >
                Değiştir
              </button>
            </div>

            {/* Type Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 font-sans block">Kısıtlama Türü</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRestrictionType('MUTE')}
                  className={`p-3 rounded-xl border font-bold text-xs transition cursor-pointer flex flex-col items-center gap-1 ${
                    restrictionType === 'MUTE'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                      : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-sm">🔇 Susturma (MUTE)</span>
                  <span className="text-[10px] font-normal text-slate-400">Yalnız Club yorumlarını engeller</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRestrictionType('BAN')}
                  className={`p-3 rounded-xl border font-bold text-xs transition cursor-pointer flex flex-col items-center gap-1 ${
                    restrictionType === 'BAN'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                      : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-sm">🚫 Yasaklama (BAN)</span>
                  <span className="text-[10px] font-normal text-slate-400">Yalnız Club erişimini engeller</span>
                </button>
              </div>
            </div>

            {/* Duration Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 font-sans block">Süre Seçimi</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: '1_HOUR', label: '1 Saat' },
                  { key: '1_DAY', label: '1 Gün' },
                  { key: '3_DAYS', label: '3 Gün' },
                  { key: '7_DAYS', label: '7 Gün' },
                  { key: '30_DAYS', label: '30 Gün' },
                  { key: 'PERMANENT', label: 'Süresiz' },
                ].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setDurationPreset(p.key)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      durationPreset === p.key
                        ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                        : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 font-sans block">Neden (Zorunlu)</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-orange-500 font-sans"
              >
                <option value="Topluluk Kuralı İhlali">Topluluk Kuralı İhlali</option>
                <option value="Spam / Reklam">Spam / Reklam</option>
                <option value="Hakaret / Taciz">Hakaret / Taciz</option>
                <option value="Uygunsuz İçerik">Uygunsuz İçerik</option>
                <option value="Tekrarlanan İhlal">Tekrarlanan İhlal</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>

            {/* Admin Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 font-sans block">
                Yönetici Notu (İsteğe Bağlı — Gizli)
              </label>
              <input
                type="text"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Örn: 2. ihlali üzerine eklendi..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-sans"
              />
            </div>

            {/* Effect Guarantee Warning */}
            <div className="p-3 bg-slate-900/80 border border-white/10 rounded-xl text-[11px] text-amber-400 space-y-1">
              <span className="font-bold block">🔒 Etki Güvencesi:</span>
              <p className="text-slate-300 font-sans">
                Bu işlem <strong>yalnız Tork Scout Club</strong> modülünde geçerlidir. Kullanıcının site hesabı, ilan verme hakları, AI raporları ve chatbot erişimi <strong>etkilenmez</strong>.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs"
              >
                Geri
              </button>
              <button
                onClick={handleCreateRestriction}
                disabled={submitting}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-slate-950 font-black rounded-xl text-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer font-sans"
              >
                <ShieldAlert className="w-4 h-4" /> Kısıtlamayı Uygula & Audit Log Yaz
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
