'use client';

import React, { useEffect, useState } from 'react';
import { Shield, UserCheck, CheckCircle2, Lock, Save } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

const ALL_PERMISSIONS = [
  { key: 'ADMIN_PANEL_ACCESS', label: 'Admin Paneli Giriş Yetkisi' },
  { key: 'USER_MANAGE', label: 'Kullanıcı Hesap Yönetimi' },
  { key: 'USER_MESSAGE', label: 'Kullanıcıya Mesaj Gönderme' },
  { key: 'LISTING_MODERATE', label: 'İlan Moderasyonu' },
  { key: 'VEHICLE_DATA_READ', label: 'Araç Verisi Okuma' },
  { key: 'VEHICLE_DATA_WRITE', label: 'Araç Verisi Düzenleme / Yazma' },
  { key: 'VEHICLE_DATA_DELETE', label: 'Araç Verisi Silme / Arşivleme' },
  { key: 'GUIDE_MANAGE', label: 'Araç Rehberi Kart Yönetimi' },
  { key: 'AI_OPERATIONS_VIEW', label: 'AI Araştırma & İşlemleri' },
  { key: 'FINANCE_VIEW', label: 'Finansal Verileri Görüntüleme' },
  { key: 'CLUB_MODERATE', label: 'Tork Scout Club Moderasyon' },
  { key: 'ROLE_MANAGE', label: 'Admin Roller ve Yetki Yönetimi' },
  { key: 'AUDIT_VIEW', label: 'Sistem Audit Loglarını İnceleme' },
];

export default function AdminRolesPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserPerms, setSelectedUserPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchAdminUsers = () => {
    setLoading(true);
    const token = localStorage.getItem('accessToken');

    fetch(`${API_BASE_URL}/users/admin/list?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data.users) ? data.users : [];
        setUsers(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  const handleUserSelect = (u: any) => {
    setSelectedUserId(u.id);
    setSelectedUserPerms(u.permissions || []);
  };

  const handleTogglePermission = (permKey: string) => {
    setSelectedUserPerms((prev) =>
      prev.includes(permKey) ? prev.filter((k) => k !== permKey) : [...prev, permKey]
    );
  };

  const handleSavePermissions = () => {
    if (!selectedUserId) return;
    setSaving(true);
    const token = localStorage.getItem('accessToken');

    fetch(`${API_BASE_URL}/users/admin/${selectedUserId}/permissions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ permissions: selectedUserPerms }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Yetkiler güncellenemedi. SUPER_ADMIN olmanız gerekmektedir.');
        return res.json();
      })
      .then(() => {
        setToastMsg('Kullanıcı yetkileri başarıyla güncellendi.');
        setTimeout(() => setToastMsg(null), 3000);
        fetchAdminUsers();
      })
      .catch((err) => alert(err.message))
      .finally(() => setSaving(false));
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-emerald-500 text-white rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Admin & Yetki Yönetimi (Granular RBAC)</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Sistem yöneticileri ve moderatörler için 13 hassas modül yetki bayrağının yönetimi.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Selection List */}
        <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kullanıcı Seçimi</h3>

          {loading ? (
            <div className="p-6 text-center text-xs text-slate-500">Yükleniyor...</div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {users.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleUserSelect(u)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                    selectedUserId === u.id
                      ? 'bg-orange-500/20 border-orange-500/50 text-white'
                      : 'bg-slate-950 border-white/5 text-slate-300 hover:border-white/20'
                  }`}
                >
                  <div className="font-bold">{u.fullName}</div>
                  <div className="text-[10px] text-slate-400">{u.email}</div>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-slate-800 text-orange-400 text-[10px] font-mono rounded font-bold">
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Permission Matrix Form */}
        <div className="md:col-span-2 p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-6">
          {selectedUser ? (
            <>
              <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-base font-bold text-white">{selectedUser.fullName}</h3>
                  <p className="text-xs text-slate-400">{selectedUser.email} • Rol: {selectedUser.role}</p>
                </div>
                <button
                  onClick={handleSavePermissions}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-40"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Kaydediliyor...' : 'Yetkileri Kaydet'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALL_PERMISSIONS.map((perm) => {
                  const isChecked = selectedUserPerms.includes(perm.key) || selectedUser.role === 'SUPER_ADMIN';
                  return (
                    <label
                      key={perm.key}
                      className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        isChecked
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                          : 'bg-slate-950 border-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold">{perm.label}</p>
                        <p className="text-[10px] font-mono text-slate-500">{perm.key}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={selectedUser.role === 'SUPER_ADMIN'}
                        onChange={() => handleTogglePermission(perm.key)}
                        className="accent-orange-500 w-4 h-4"
                      />
                    </label>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-500 font-medium text-xs">
              Yetkilerini düzenlemek istediğiniz kullanıcıyı sol listeden seçin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
