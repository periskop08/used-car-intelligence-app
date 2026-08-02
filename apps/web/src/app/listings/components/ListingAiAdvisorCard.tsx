"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Sparkles, Zap, Lock, RefreshCw, Send, AlertTriangle } from "lucide-react";

export interface ListingAiAdvisorCardProps {
  listingId: string;
  publicListingNo?: string;
}

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  messageType: string;
  content: string;
  createdAt: string;
}

interface QuotaInfo {
  unlimited: boolean;
  limit?: number;
  used?: number;
  remaining?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function ListingAiAdvisorCard({
  listingId,
  publicListingNo,
}: ListingAiAdvisorCardProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickQuestions = [
    "Bu ilandaki en büyük riskler neler?",
    "Satıcıya hangi soruları sormalıyım?",
    "Ekspertizde özellikle nereyi kontrol ettirmeliyim?",
    "Kilometre ve yaş dengesi nasıl?",
    "İlan açıklamasında çelişki var mı?",
    "Bu araç şehir içi kullanım için uygun mu?",
  ];

  const fetchQuota = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/listings/${listingId}/ai-chat/quota`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setQuota(data);
      }
    } catch (e) {
      console.error("Failed to fetch quota", e);
    }
  };

  const fetchConversation = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      fetchQuota();
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/listings/${listingId}/ai-conversation`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        if (data.quota) setQuota(data.quota);
        if (data.messages && data.messages.length > 0) {
          setIsOpen(true);
        }
      } else {
        fetchQuota();
      }
    } catch (e) {
      console.error("Failed to fetch AI conversation", e);
      fetchQuota();
    }
  };

  useEffect(() => {
    fetchConversation();
    fetchQuota();
  }, [listingId]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleStartInitialAnalysis = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("AI Danışmanını kullanabilmek için lütfen giriş yapın.");
      window.location.href = `/login?redirect=/listings/${listingId}`;
      return;
    }

    setIsOpen(true);
    setInitializing(true);

    try {
      const idempotencyKey = `init-${listingId}-${Date.now()}`;
      const res = await fetch(`${API_URL}/api/listings/${listingId}/ai-chat/initial-analysis`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idempotencyKey }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.quota) setQuota(data.quota);
        await fetchConversation();
      } else {
        const err = await res.json();
        alert(err.message || "Değerlendirme başlatılamadı.");
      }
    } catch (e) {
      alert("Sunucu ile iletişim hatası.");
    } finally {
      setInitializing(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = textToSend || inputMessage;
    if (!messageText.trim()) return;

    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("AI Danışmanını kullanabilmek için lütfen giriş yapın.");
      return;
    }

    if (!textToSend) setInputMessage("");
    setLoading(true);

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "USER",
      messageType: "USER_MESSAGE",
      content: messageText.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const idempotencyKey = `msg-${listingId}-${Date.now()}`;
      const res = await fetch(`${API_URL}/api/listings/${listingId}/ai-chat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageText.trim(),
          idempotencyKey,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.quota) setQuota(data.quota);
        const assistantMsg: ChatMessage = {
          id: data.messageId,
          role: "ASSISTANT",
          messageType: data.mode === "SCOPE_REDIRECT" ? "SCOPE_REDIRECT" : "ASSISTANT_RESPONSE",
          content: data.answer,
          createdAt: data.createdAt,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const err = await res.json();
        alert(err.message || "Mesaj gönderilemedi.");
        await fetchConversation();
      }
    } catch (e) {
      alert("İletişim hatası.");
    } finally {
      setLoading(false);
    }
  };

  const isQuotaExhausted = Boolean(quota && !quota.unlimited && (quota.remaining ?? 0) <= 0);

  return (
    <div className="w-full my-6 glass p-6 sm:p-8 rounded-3xl border border-orange-500/30 bg-gradient-to-r from-[#0b0f19] via-[#0d1222] to-orange-950/20 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <span className="absolute -top-16 -right-16 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <span className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header & Dynamic Quota Badge */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-orange-400 uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400 animate-pulse" />
              TorqueScout İlan Danışmanı
            </span>
            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 uppercase tracking-wider">
              İlan Bağlamlı AI
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            Bu danışman yalnızca açık ilanın teknik verileri, satıcı açıklaması ve ekspertiz/boya-değişen beyanlarını analiz eder.
          </p>
        </div>

        {/* Dynamic AI Chatbot Quota Badge */}
        {quota && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/90 border border-orange-500/30 shadow-lg shrink-0">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                AI Chatbot Mesaj Hakkı
              </span>
              <span className="text-xs font-mono font-black text-orange-300">
                {quota.unlimited
                  ? "Sınırsız (Admin)"
                  : `Kalan: ${quota.remaining} / ${quota.limit} Mesaj`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer Notice */}
      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/5 text-xs text-slate-400 leading-relaxed flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
        <div>
          Bu değerlendirme ilan sahibi tarafından beyan edilen veriler üzerinden hazırlanır. Bağımsız ekspertiz ve fiziksel kontrol yerine geçmez. Aracın genel kronik raporunu incelemek için{" "}
          <Link href="/aracini-bul" className="text-orange-400 underline font-bold hover:text-orange-300">
            Araç Sorgulama
          </Link>{" "}
          bölümüne gidin.
        </div>
      </div>

      {/* Closed State: Call to Action Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={handleStartInitialAnalysis}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm shadow-xl shadow-orange-500/20 transition flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-white" />
          <span>Bu İlanı AI ile Değerlendir & Risk Raporu Al</span>
        </button>
      )}

      {/* Open State: Full Chatbot Section */}
      {isOpen && (
        <div className="space-y-5 pt-1">
          {/* Quick Question Chips */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              💡 Önerilen Hızlı Sorular:
            </span>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={Boolean(loading || isQuotaExhausted)}
                  onClick={() => handleSendMessage(q)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-xs text-slate-300 hover:text-white disabled:opacity-40 transition font-medium cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Feed */}
          <div className="max-h-[500px] overflow-y-auto space-y-4 p-4 sm:p-6 rounded-2xl bg-slate-950/95 border border-white/10 scrollbar-thin scrollbar-thumb-white/10">
            {initializing && (
              <div className="p-6 text-center text-xs text-slate-400 animate-pulse flex items-center justify-center gap-2.5">
                <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                İlan verileri detaylı analiz ediliyor, lütfen bekleyin...
              </div>
            )}

            {messages.map((msg) => {
              if (msg.role === "SYSTEM" || msg.messageType === "CONTEXT_SEPARATOR") {
                return (
                  <div
                    key={msg.id}
                    className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs text-center font-bold"
                  >
                    {msg.content}
                  </div>
                );
              }

              const isUser = msg.role === "USER";

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-2 mb-1 text-[11px] font-bold text-slate-400">
                    <span>{isUser ? "Siz" : "🤖 TorqueScout İlan Danışmanı"}</span>
                    <span>•</span>
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[88%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                      isUser
                        ? "bg-orange-500 text-white rounded-br-none shadow-md shadow-orange-500/10 font-medium"
                        : "bg-slate-900 text-slate-200 border border-white/10 rounded-bl-none"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2.5 p-4 text-xs text-slate-400 font-medium">
                <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                Danışman yanıt hazırlıyor...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar or Quota Exhausted Warning */}
          {isQuotaExhausted ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-rose-300 font-medium">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Chatbot mesaj kullanım hakkınız doldu. Yeni mesaj göndermek için paketinizi yükseltebilirsiniz.</span>
              </div>
              <Link
                href="/pricing"
                className="px-4 py-2 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-400 transition shrink-0"
              >
                Paketleri İncele
              </Link>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-3"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Bu ilan hakkında bir soru sorun (Örn: İlandaki en büyük risk nedir?)..."
                disabled={loading || initializing}
                className="flex-1 px-4 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
              />
              <button
                type="submit"
                disabled={loading || initializing || !inputMessage.trim()}
                className="px-6 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-500/20 transition flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>Gönder</span>
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
