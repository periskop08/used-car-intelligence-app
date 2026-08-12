'use client';

import React, { useEffect, useState } from 'react';
import { MessageSquare, Search, Send, Mail, CheckCircle2, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

export default function AdminUserMessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [inAppFilter, setInAppFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMessages, setTotalMessages] = useState(0);

  // Message Detail Modal
  const [selectedMsg, setSelectedMsg] = useState<any | null>(null);

  const fetchMessages = () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (inAppFilter) params.append('sendInApp', inAppFilter);
    if (emailFilter) params.append('sendEmail', emailFilter);
    params.append('page', page.toString());
    params.append('limit', '20');

    fetch(`${API_BASE_URL}/users/admin/messages/all?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Kullanıcı mesajları yüklenemedi.');
        return res.json();
      })
      .then((data) => {
        setMessages(data.messages || []);
        setTotalPages(data.totalPages || 1);
        setTotalMessages(data.total || 0);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMessages();
  }, [page, inAppFilter, emailFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Kullanıcı Mesajları Geçmişi</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Yöneticiler tarafından kullanıcılara gönderilen uygulama içi ve e-posta mesajlarının canlı geçmişi ({totalMessages} kayıt).
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          fetchMessages();
        }}
        className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-wrap gap-4 items-center justify-between"
      >
        <div className="flex flex-1 min-w-[280px] items-center gap-2 px-3.5 py-2 bg-slate-950 rounded-xl border border-white/10 focus-within:border-orange-500/50 transition">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Konu, içerik, e-posta veya müşteri no ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={inAppFilter}
            onChange={(e) => {
              setInAppFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-bold text-slate-300 outline-none cursor-pointer"
          >
            <option value="">Uygulama İçi (Tümü)</option>
            <option value="true">Evet (Uygulama İçi)</option>
            <option value="false">Hayır</option>
          </select>

          <select
            value={emailFilter}
            onChange={(e) => {
              setEmailFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-bold text-slate-300 outline-none cursor-pointer"
          >
            <option value="">E-posta Gönderimi (Tümü)</option>
            <option value="true">Evet (E-posta)</option>
            <option value="false">Hayır</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Filtrele
          </button>
        </div>
      </form>

      {/* Messages Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Kullanıcı mesajları yükleniyor...</div>
        ) : error ? (
          <div className="p-6 text-center text-rose-400 font-bold text-xs">{error}</div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-xs">Aradığınız kriterlerde mesaj kaydı bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5">
                <tr>
                  <th className="p-4">Alıcı Kullanıcı</th>
                  <th className="p-4">Konu / Başlık</th>
                  <th className="p-4">Kanal</th>
                  <th className="p-4">Gönderen Admin</th>
                  <th className="p-4">Tarih</th>
                  <th className="p-4 text-right">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {messages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-white/[0.03] transition">
                    <td className="p-4 font-mono">
                      <div className="font-bold text-orange-400">{msg.user?.customerNo || 'Müşteri'}</div>
                      <div className="text-[11px] text-slate-300 font-sans">{msg.user?.email}</div>
                    </td>
                    <td className="p-4 font-bold text-white max-w-xs truncate">{msg.subject}</td>
                    <td className="p-4 font-mono">
                      <div className="flex items-center gap-1.5">
                        {msg.sendInApp && (
                          <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded text-[10px] font-bold">
                            Uygulama İçi
                          </span>
                        )}
                        {msg.sendEmail && (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[10px] font-bold">
                            E-posta
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-slate-300 font-semibold">{msg.adminEmail || 'Admin'}</td>
                    <td className="p-4 font-mono text-slate-400">{new Date(msg.createdAt).toLocaleString('tr-TR')}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedMsg(msg)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-orange-500 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                      >
                        İncele →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <span>
            Sayfa <strong>{page}</strong> / {totalPages} (Toplam {totalMessages} mesaj)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 bg-slate-900 border border-white/10 rounded-lg text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 bg-slate-900 border border-white/10 rounded-lg text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MESSAGE DETAIL MODAL */}
      {selectedMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-lg w-full bg-[#0b0f19] border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-start pb-4 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono font-bold text-orange-400 uppercase tracking-widest">
                  {selectedMsg.user?.customerNo} • {selectedMsg.user?.email}
                </span>
                <h3 className="text-base font-bold text-white mt-1">{selectedMsg.subject}</h3>
              </div>
              <button onClick={() => setSelectedMsg(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2 leading-relaxed text-slate-200 whitespace-pre-wrap">
                {selectedMsg.message}
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
                  <span className="text-slate-500 block text-[10px]">Gönderen Yönetici</span>
                  <strong className="text-slate-300">{selectedMsg.adminEmail || 'Admin'}</strong>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
                  <span className="text-slate-500 block text-[10px]">Gönderim Tarihi</span>
                  <strong className="text-slate-300">{new Date(selectedMsg.createdAt).toLocaleString('tr-TR')}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
