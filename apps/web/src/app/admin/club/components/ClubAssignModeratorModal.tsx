'use client';

import React, { useState } from 'react';
import { X, Search, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

interface ClubAssignModeratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export function ClubAssignModeratorModal({
  isOpen,
  onClose,
  onRefresh,
}: ClubAssignModeratorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || !token) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/users/search?q=${encodeURIComponent(searchQuery.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Kullanıcı araması başarısız.');
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignConfirm = async () => {
    if (!selectedUser || !token) return;
    setAssigning(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/moderators/${selectedUser.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Moderatör atanamadı.');
      }
      setSuccessMsg(`${selectedUser.displayName || selectedUser.username} başarıyla Club Moderatörü olarak atandı.`);
      setTimeout(() => {
        onRefresh?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 font-mono text-xs shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-orange-400" />
            <span>+ Moderatör Ata</span>
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

        {!selectedUser ? (
          <div className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Müşteri No, Ad, Soyad veya E-posta..."
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Search className="w-3.5 h-3.5" /> Ara
              </button>
            </form>

            <div className="max-h-60 overflow-y-auto space-y-1">
              {loading ? (
                <div className="p-6 text-center text-slate-400">Kullanıcılar aranıyor...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className="p-3 bg-slate-900/50 hover:bg-slate-900 rounded-xl border border-white/5 flex items-center justify-between cursor-pointer transition"
                  >
                    <div>
                      <span className="font-bold text-white font-sans block">{u.displayName || u.username}</span>
                      <span className="text-slate-400 text-[11px] font-mono">{u.email || u.customerNo}</span>
                    </div>
                    <span className="text-orange-400 text-[11px] font-bold">Seç ➔</span>
                  </div>
                ))
              ) : searchQuery ? (
                <div className="p-6 text-center text-slate-500">Kullanıcı bulunamadı.</div>
              ) : (
                <div className="p-6 text-center text-slate-500">
                  Moderatör olarak atamak istediğiniz kullanıcıyı arayın.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-4 bg-slate-900/60 border border-white/10 rounded-xl">
            <h4 className="font-bold text-white text-xs uppercase text-slate-400">Atama Onayı</h4>
            <div className="p-3 bg-slate-950 rounded-lg border border-white/5">
              <span className="font-bold text-white font-sans text-sm block">
                {selectedUser.displayName || selectedUser.username}
              </span>
              <span className="text-slate-400 text-xs">{selectedUser.email || selectedUser.customerNo}</span>
            </div>
            <p className="text-amber-400 text-[11px]">
              ⚠️ Bu kullanıcıya Club Moderatörü yetkisi verilecek. Kullanıcı yorum gizleme, incelemeye alma ve kısıtlama yönetimi aksiyonlarını gerçekleştirebilecektir.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold"
              >
                Geri
              </button>
              <button
                onClick={handleAssignConfirm}
                disabled={assigning}
                className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-xs disabled:opacity-50 flex items-center gap-1"
              >
                <UserCheck className="w-3.5 h-3.5" /> Atamayı Onayla & Audit Log Yaz
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
