'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ReportHeader } from '../../components/ReportHeader';
import { ReportSidebar } from '../../components/ReportSidebar';
import { fetchReportApi } from '@/utils/apiConfig';

export default function UserDetailPage() {
  const params = useParams();
  const customerNo = params?.customerNo as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Message modal state
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageTitle, setMessageTitle] = useState('TorqueScout Bilgilendirme Mesajı');
  const [messageContent, setMessageContent] = useState('');
  const [sendAsEmail, setSendAsEmail] = useState(true);
  const [sending, setSending] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!customerNo) return;
    fetchReportApi(`/admin/reports/users/${encodeURIComponent(customerNo)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Kullanıcı detay verisi alınamadı (HTTP ${res.status})`);
        return res.json();
      })
      .then((d) => {
        if (d?.statusCode >= 400) throw new Error(d.message || 'Yetkisiz erişim');
        setData(d);
      })
      .catch((e: any) => setError(e.message || 'Bir hata oluştu'))
      .finally(() => setLoading(false));
  }, [customerNo]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim()) {
      setModalFeedback({ type: 'error', message: 'Lütfen bir mesaj içeriği yazın.' });
      return;
    }

    setSending(true);
    setModalFeedback(null);

    try {
      const res = await fetchReportApi(`/admin/reports/users/${encodeURIComponent(customerNo)}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: messageTitle,
          content: messageContent,
          sendAsEmail,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || 'Mesaj gönderilemedi.');

      setModalFeedback({
        type: 'success',
        message: `Mesaj başarıyla gönderildi! ${
          sendAsEmail ? '✉️ E-posta olarak da iletildi.' : '📱 Sadece uygulama içi mesaj olarak iletildi.'
        }`,
      });

      // Clear input after 2 seconds
      setTimeout(() => {
        setMessageContent('');
        setMessageModalOpen(false);
        setModalFeedback(null);
      }, 2200);
    } catch (err: any) {
      setModalFeedback({ type: 'error', message: err.message || 'Mesaj gönderilirken hata oluştu.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
      <ReportHeader
        title={`Kullanıcı Detayı: ${customerNo}`}
        subtitle="Müşteri numarası bazlı kullanım kotaları, harcama ve abonelik geçmişi."
      />

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <ReportSidebar />

        <main className="flex-1 space-y-8 w-full">
          {loading && (
            <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-white/5 font-medium">
              Kullanıcı bilgileri yükleniyor...
            </div>
          )}

          {error && (
            <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 font-bold text-xs">
              {error}
            </div>
          )}

          {data && data.profile && (
            <div className="space-y-6">
              {/* Identity Banner */}
              <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold bg-orange-500/20 text-orange-400 px-2.5 py-1 rounded-md border border-orange-500/30">
                      {data.profile.customerNo}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-200 border border-white/10">
                      {data.profile.subscriptionTier || 'Standart'}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-100">{data.profile.displayName || 'Kullanıcı'}</h2>
                  <div className="flex items-center gap-4 text-xs text-slate-400 font-mono flex-wrap pt-1">
                    <span>📧 {data.profile.email}</span>
                    <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-white/10 text-slate-200 font-bold">
                      📱 Telefon: {data.profile.phone || 'Belirtilmedi'}
                    </span>
                    <span>Rol: <strong className="text-slate-200">{data.profile.role}</strong></span>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto">
                  <div className="text-right font-mono text-xs text-slate-400">
                    <span>Kayıt Tarihi: <strong className="text-slate-200">{data.profile.createdAt ? new Date(data.profile.createdAt).toLocaleDateString('tr-TR') : '-'}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMessageModalOpen(true)}
                    className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs transition shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    💬 Mesaj Gönder
                  </button>
                </div>
              </div>

              {/* Usage & Quota Grid */}
              {data.usage && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-2">
                    <span className="text-xs font-bold text-slate-400 block">AI Raporu Kullanımı</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black font-mono text-slate-100">{data.usage.aiReportsUsed || 0}</span>
                      <span className="text-xs text-slate-400 font-mono">Kalan: {data.usage.aiReportsRemaining || 0}</span>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-2">
                    <span className="text-xs font-bold text-slate-400 block">Chatbot Kullanımı</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black font-mono text-slate-100">{data.usage.chatbotUsed || 0}</span>
                      <span className="text-xs text-slate-400 font-mono">Kalan: {data.usage.chatbotRemaining || 0}</span>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-2">
                    <span className="text-xs font-bold text-slate-400 block">Karşılaştırma Kullanımı</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black font-mono text-slate-100">{data.usage.comparisonsUsed || 0}</span>
                      <span className="text-xs text-slate-400 font-mono">Kalan: {data.usage.comparisonsRemaining || 0}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Transaction History */}
              {data.financials && (
                <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-200">Finansal Ödeme Geçmişi</h3>
                  <div className="flex justify-between items-center p-4 bg-slate-950 rounded-xl border border-white/5 font-mono text-xs">
                    <span className="text-slate-400">Toplam Harcama</span>
                    <strong className="text-emerald-400 text-lg">₺{(data.financials.totalSpent || 0).toLocaleString('tr-TR')}</strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Message Composer Modal */}
      {messageModalOpen && data && data.profile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#0b0f19] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">💬</span>
                <h3 className="text-base font-black text-white">Kullanıcıya Mesaj Gönder</h3>
              </div>
              <button
                type="button"
                onClick={() => setMessageModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Recipient Card */}
            <div className="p-3 bg-slate-950/80 border border-white/5 rounded-2xl flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between text-slate-300 font-bold">
                <span>Alıcı: <strong className="text-orange-400">{data.profile.displayName}</strong></span>
                <span className="font-mono text-[10px] text-slate-400">{data.profile.customerNo}</span>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono">
                <span>E-Posta: {data.profile.email}</span>
                <span>Telefon: {data.profile.phone || 'Belirtilmedi'}</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">Mesaj Başlığı</label>
                <input
                  type="text"
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-orange-500 transition"
                  placeholder="Mesaj başlığı..."
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">Mesaj İçeriği</label>
                <textarea
                  rows={4}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-orange-500 transition resize-none"
                  placeholder="Kullanıcıya iletmek istediğiniz mesajınızı buraya yazın..."
                  required
                />
              </div>

              {/* Email Option Checkbox */}
              <div className="p-3 bg-slate-900/60 border border-white/5 rounded-2xl flex items-start gap-3 cursor-pointer select-none" onClick={() => setSendAsEmail(!sendAsEmail)}>
                <input
                  type="checkbox"
                  checked={sendAsEmail}
                  onChange={(e) => setSendAsEmail(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-white/20 text-orange-500 focus:ring-0 bg-slate-950 cursor-pointer"
                />
                <div className="flex flex-col text-xs">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span>✉️</span> E-posta olarak da kullanıcının adresine gönder
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    İşaretlenirse mesaj hem uygulama içi bildirime hem de <strong className="text-slate-300">{data.profile.email}</strong> e-posta adresine iletilir.
                  </span>
                </div>
              </div>

              {/* Modal Feedback */}
              {modalFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold ${
                    modalFeedback.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                  }`}
                >
                  {modalFeedback.message}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setMessageModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/5 transition cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs transition shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {sending ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
