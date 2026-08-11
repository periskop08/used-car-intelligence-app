'use client';

import React, { useEffect, useState } from 'react';
import { MessageSquare, Search, Trash2, Eye, ShieldAlert } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

export default function AdminClubPostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    fetch(`${API_BASE_URL}/club/posts?limit=30`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setPosts(Array.isArray(data) ? data : data.posts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="pb-6 border-b border-white/10">
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Tork Scout Club — Gönderi Moderasyonu</h1>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Topluluk gönderilerinin incelenmesi, moderasyonu ve yayın yönetimi.
        </p>
      </div>

      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Gönderiler yükleniyor...</div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-xs">Henüz yayınlanmış Club gönderisi bulunmuyor.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5">
                <tr>
                  <th className="p-4">Başlık / İçerik</th>
                  <th className="p-4">Yazar</th>
                  <th className="p-4">Tarih</th>
                  <th className="p-4 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {posts.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.03] transition">
                    <td className="p-4 font-bold text-white max-w-md">
                      <div className="line-clamp-1">{p.title}</div>
                      <div className="text-[11px] text-slate-400 font-normal line-clamp-1">{p.content}</div>
                    </td>
                    <td className="p-4 text-slate-300 font-mono">
                      {p.author?.email || `User-${(p.authorId || '').slice(0, 6)}`}
                    </td>
                    <td className="p-4 font-mono text-slate-400">{new Date(p.createdAt).toLocaleDateString('tr-TR')}</td>
                    <td className="p-4 text-right">
                      <button className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-bold transition cursor-pointer">
                        Kaldır
                      </button>
                    </td>
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
