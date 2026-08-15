'use client';

import React, { useState, useEffect } from 'react';
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
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/users?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : data.users || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedUser(null);
      setError(null);
      setSuccessMsg(null);
      fetchUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

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
          <h3 className="text-sm font-bold text-white flex items-center gap-2 font-sans">
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
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl font-sans">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl font-sans">
            {successMsg}
          </div>
        )}

        {!selectedUser ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 font-sans">
                Tüm Uygun Club Üyeleri Listeleniyor
              </label>
              <span className="text-[11px] text-slate-500 font-mono">{filteredUsers.length} Üye</span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Müşteri No, Ad, Soyad veya E-posta..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {loading ? (
                <div className="p-6 text-center text-slate-400">Üyeler yükleniyor...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-slate-500 font-sans">Club üyesi bulunamadı.</div>
              ) : (
                filteredUsers.map((u) => {
                  const isMod = u.isModerator;

                  return (
                    <div
                      key={u.id}
                      onClick={() => !isMod && setSelectedUser(u)}
                      className={`p-3 bg-slate-900/60 border border-white/5 rounded-xl flex items-center justify-between transition ${
                        isMod ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-900 hover:border-orange-500/40 cursor-pointer'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white font-sans text-xs block">{u.displayName}</span>
                          {u.badge && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                              {u.badge.label}
                            </span>
                          )}
                        </div>
                        <span className="text-slate-400 text-[11px] font-mono">
                          {u.customerNo} · {u.email}
                        </span>
                      </div>

                      {isMod ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                          Zaten Moderatör
                        </span>
                      ) : (
                        <span className="text-orange-400 text-xs font-bold font-mono">Seç ➔</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-4 bg-slate-900/60 border border-white/10 rounded-xl">
            <h4 className="font-bold text-white text-xs uppercase text-slate-400 font-sans">Atama Onayı</h4>
            <div className="p-3 bg-slate-950 rounded-lg border border-white/5 font-sans">
              <span className="font-bold text-white text-sm block">
                {selectedUser.displayName || selectedUser.username}
              </span>
              <span className="text-slate-400 text-xs font-mono">{selectedUser.customerNo} · {selectedUser.email}</span>
            </div>
            <p className="text-amber-400 text-[11px] font-sans">
              ⚠️ <strong>{selectedUser.displayName}</strong> kullanıcısına Tork Scout Club Moderatörü yetkisi verilecek. Kullanıcı Club içerik yorumlarını inceleme, gizleme ve topluluk kısıtlamalarını yönetme yetkisi alacaktır. (Global site ADMIN yetkisi verilmez).
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold"
              >
                Geri
              </button>
              <button
                onClick={handleAssignConfirm}
                disabled={assigning}
                className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-slate-950 font-black rounded-lg text-xs disabled:opacity-50 flex items-center gap-1 cursor-pointer font-sans"
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
