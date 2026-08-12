'use client';

import React, { useEffect, useState } from 'react';
import { Users, Shield, Search } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

export default function AdminClubMembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    fetch(`${API_BASE_URL}/club/users?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setMembers(Array.isArray(data) ? data : data.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="pb-6 border-b border-white/10">
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Tork Scout Club Üyeleri & Moderatörleri</h1>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Topluluk üyeleri, moderatör rolleri ve katılım statüleri.
        </p>
      </div>

      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Club üyeleri yükleniyor...</div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-xs">Henüz Club üyesi kaydı bulunmuyor.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5">
                <tr>
                  <th className="p-4">Üye Kullanıcı</th>
                  <th className="p-4">Paket</th>
                  <th className="p-4">Club Rolü</th>
                  <th className="p-4">Katılım Tarihi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans font-mono">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-white/[0.03] transition">
                    <td className="p-4 font-bold text-white">{m.email || m.username || m.id}</td>
                    <td className="p-4 text-orange-400">{m.subscriptionTier || 'FREE'}</td>
                    <td className="p-4 font-bold text-cyan-400">{m.role || 'MEMBER'}</td>
                    <td className="p-4 text-slate-400">{new Date(m.createdAt || Date.now()).toLocaleDateString('tr-TR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
