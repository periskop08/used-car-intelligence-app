"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

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

  const fetchConversation = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/listings/${listingId}/ai-conversation`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setQuota(data.quota || null);
        if (data.messages && data.messages.length > 0) {
          setIsOpen(true);
        }
      }
    } catch (e) {
      console.error("Failed to fetch AI conversation", e);
    }
  };

  useEffect(() => {
    fetchConversation();
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

    // Optimistic user message append
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
        setQuota(data.quota);
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
        // Re-fetch to clean up optimistic state
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
    <div className="glass p-5 rounded-2xl border border-orange-500/30 bg-gradient-to-b from-orange-950/20 via-[#0b0f19] to-[#0b0f19] flex flex-col gap-4 shadow-xl relative overflow-hidden">
      <span className="absolute -top-10 -right-10 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex flex-col">
          <span className="text-xs font-black text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
            🤖 TorqueScout İlan Danışmanı
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
            Bu danışman yalnızca bu ilandaki teknik veriler, satıcı açıklaması ve ekspertiz/boya-değişen beyanları üzerinden değerlendirme yapar.
          </span>
        </div>

        {/* Quota Badge */}
        {quota && (
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-900 border border-white/10 text-orange-300 shrink-0">
            {quota.unlimited ? "Sınırsız" : `Kalan ${quota.remaining} / ${quota.limit}`}
          </span>
        )}
      </div>

      {/* Card Disclaimer Notice */}
      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5 text-[10px] text-slate-400 leading-relaxed flex items-start gap-2">
        <span className="text-orange-400 font-bold shrink-0">ℹ️</span>
        <div>
          Bu değerlendirme ilan sahibi tarafından girilen veriler üzerinden hazırlanır. Bağımsız ekspertiz ve fiziksel kontrol yerine geçmez. Modelin genel kronik raporu için{" "}
          <Link href="/aracini-bul" className="text-orange-400 underline font-semibold hover:text-orange-300">
            Araç Sorgulama
          </Link>{" "}
          bölümüne gidin.
        </div>
      </div>

      {/* Closed State: Initial Call Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={handleStartInitialAnalysis}
          className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-black text-xs shadow-lg shadow-orange-500/20 transition flex items-center justify-center gap-2"
        >
          <span>🤖</span>
          <span>Bu İlanı AI ile Değerlendir</span>
        </button>
      )}

      {/* Open State: Interactive Chat Area */}
      {isOpen && (
        <div className="space-y-4 pt-1">
          {/* Quick Question Chips */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Hazır Sorular:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={Boolean(loading || isQuotaExhausted)}
                  onClick={() => handleSendMessage(q)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-[11px] text-slate-300 hover:text-white disabled:opacity-40 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Feed */}
          <div className="max-h-96 overflow-y-auto space-y-3 p-3 rounded-xl bg-slate-950/90 border border-white/10">
            {initializing && (
              <div className="p-4 text-center text-xs text-slate-400 animate-pulse flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                İlan verileri analiz ediliyor...
              </div>
            )}

            {messages.map((msg) => {
              if (msg.role === "SYSTEM" || msg.messageType === "CONTEXT_SEPARATOR") {
                return (
                  <div
                    key={msg.id}
                    className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] text-center font-bold"
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
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-slate-400">
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
                    className={`max-w-[90%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
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
              <div className="flex items-center gap-2 p-3 text-xs text-slate-400 font-medium">
                <span className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                Danışman yanıt yazıyor...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          {isQuotaExhausted ? (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-xs text-rose-300">
              <span>⚠️ Chatbot kullanım hakkınız doldu.</span>
              <Link
                href="/pricing"
                className="px-3 py-1.5 rounded-lg bg-rose-500 text-white font-bold hover:bg-rose-400 transition"
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
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Bu ilan hakkında bir soru sorun (Örn: Bu aracın en büyük riski ne?)..."
                disabled={loading || initializing}
                className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
              />
              <button
                type="submit"
                disabled={loading || initializing || !inputMessage.trim()}
                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition"
              >
                Gönder
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
