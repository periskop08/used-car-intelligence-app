"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Sparkles, Zap, Lock, Send, AlertTriangle, Trash2, ThumbsUp, ThumbsDown, HelpCircle, ChevronDown, ChevronUp, FileText, MessageSquare } from "lucide-react";

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
  feedback?: "UP" | "DOWN" | null;
}

interface QuotaDetail {
  limit?: number;
  used?: number;
  remaining?: number;
}

interface QuotaInfo {
  unlimited: boolean;
  limit?: number;
  used?: number;
  remaining?: number;
  reportQuota?: QuotaDetail;
  chatbotQuota?: QuotaDetail;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function ListingAiAdvisorCard({
  listingId,
  publicListingNo,
}: ListingAiAdvisorCardProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<"REPORT" | "CHAT">("REPORT");
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Record<string, "UP" | "DOWN">>({});
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
        const msgList: ChatMessage[] = data.messages || [];
        setMessages(msgList);
        if (data.quota) setQuota(data.quota);

        if (msgList.length > 0) {
          setIsOpen(true);
          setShowQuickQuestions(false);
        } else {
          setIsOpen(false);
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
  }, [messages, isOpen, activeMode]);

  // Action 1: Get Full Vehicle Report
  const handleGetReport = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("Araç Raporu alabilmek için lütfen giriş yapın.");
      window.location.href = `/login?redirect=/listings/${listingId}`;
      return;
    }

    setIsOpen(true);
    setActiveMode("REPORT");
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

        const reportMsg: ChatMessage = {
          id: data.messageId || `report-${Date.now()}`,
          role: "ASSISTANT",
          messageType: "INITIAL_ANALYSIS",
          content: data.answer,
          createdAt: data.createdAt || new Date().toISOString(),
        };

        setMessages((prev) => {
          const filtered = prev.filter((m) => m.messageType !== "INITIAL_ANALYSIS");
          return [reportMsg, ...filtered];
        });
      } else {
        const err = await res.json();
        alert(err.message || "Değerlendirme raporu alınamadı.");
      }
    } catch (e) {
      alert("Sunucu ile iletişim hatası.");
    } finally {
      setInitializing(false);
    }
  };

  // Action 2: Open Chatbot Session
  const handleStartChat = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("AI Chatbot ile konuşabilmek için lütfen giriş yapın.");
      window.location.href = `/login?redirect=/listings/${listingId}`;
      return;
    }

    setIsOpen(true);
    setActiveMode("CHAT");
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
    setActiveMode("CHAT");
    setShowQuickQuestions(false);

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

  const handleClearConversation = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    if (!confirm("Konuşma ve rapor geçmişini temizlemek istediğinize emin misiniz?")) return;

    try {
      const res = await fetch(`${API_URL}/api/listings/${listingId}/ai-conversation`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessages([]);
        setIsOpen(false);
        setActiveMode("REPORT");
        fetchQuota();
      }
    } catch (e) {
      alert("Geçmiş temizlenemedi.");
    }
  };

  const handleFeedback = (msgId: string, type: "UP" | "DOWN") => {
    setFeedbacks((prev) => ({ ...prev, [msgId]: type }));
  };

  const isChatbotQuotaExhausted = Boolean(
    quota &&
      !quota.unlimited &&
      (quota.chatbotQuota ? quota.chatbotQuota.remaining! <= 0 : quota.remaining! <= 0)
  );

  // Clean Markdown Renderer
  const renderFormattedMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split("\n");
    return (
      <div className="space-y-2">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1" />;

          if (trimmed.startsWith("###")) {
            const title = trimmed.replace(/^###\s*/, "");
            return (
              <h4 key={idx} className="text-xs sm:text-sm font-black text-orange-400 uppercase tracking-wider mt-2 mb-1">
                {title}
              </h4>
            );
          }

          if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
            const itemText = trimmed.replace(/^[•\-\*]\s*/, "");
            return (
              <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm leading-relaxed pl-1">
                <span className="text-orange-400 font-bold">•</span>
                <div>{renderInlineBold(itemText)}</div>
              </div>
            );
          }

          if (/^\d+\.\s/.test(trimmed)) {
            const numMatch = trimmed.match(/^(\d+\.)\s*(.*)/);
            if (numMatch) {
              return (
                <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm leading-relaxed pl-1">
                  <span className="text-orange-400 font-bold">{numMatch[1]}</span>
                  <div>{renderInlineBold(numMatch[2])}</div>
                </div>
              );
            }
          }

          return (
            <p key={idx} className="text-xs sm:text-sm leading-relaxed">
              {renderInlineBold(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  const renderInlineBold = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-bold text-slate-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const reportRemaining = quota?.reportQuota ? quota.reportQuota.remaining : quota?.remaining;
  const chatbotRemaining = quota?.chatbotQuota ? quota.chatbotQuota.remaining : quota?.remaining;

  const initialReportMsg = messages.find((m) => m.messageType === "INITIAL_ANALYSIS");
  const chatMessages = messages.filter((m) => m.messageType !== "INITIAL_ANALYSIS");

  return (
    <div id="listing-ai-advisor-card" className="w-full my-8 scroll-mt-24 glass p-6 sm:p-8 rounded-3xl border border-orange-500/30 bg-gradient-to-r from-[#0b0f19] via-[#0d1222] to-orange-950/20 shadow-2xl flex flex-col gap-5 relative">
      {/* Background Decorative Glow */}
      <span className="absolute -top-16 -right-16 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <span className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* ZONE 1: FIXED HEADER & QUOTA BADGES */}
      <div className="flex-shrink-0 relative z-20 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
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

        {/* Dynamic Dual Quota Badges */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {quota && (
            <>
              {/* Report Quota Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-amber-500/30 shadow-md">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                    Araç Raporu Hakkı
                  </span>
                  <span className="text-[11px] font-mono font-black text-amber-300">
                    {quota.unlimited ? "Sınırsız" : `Kalan: ${reportRemaining}`}
                  </span>
                </div>
              </div>

              {/* Chatbot Quota Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-orange-500/30 shadow-md">
                <MessageSquare className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                    AI Chatbot Hakkı
                  </span>
                  <span className="text-[11px] font-mono font-black text-orange-300">
                    {quota.unlimited ? "Sınırsız" : `Kalan: ${chatbotRemaining}`}
                  </span>
                </div>
              </div>
            </>
          )}

          {isOpen && messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearConversation}
              title="Konuşma ve rapor geçmişini temizle"
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Disclaimer Notice */}
      <div className="flex-shrink-0 p-3 rounded-2xl bg-slate-950/80 border border-white/5 text-xs text-slate-400 leading-relaxed flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
        <div>
          Bu değerlendirme ilan sahibi tarafından beyan edilen veriler üzerinden hazırlanır. Bağımsız ekspertiz yerine geçmez. Aracın genel kronik raporunu incelemek için{" "}
          <Link href="/aracini-bul" className="text-orange-400 underline font-bold hover:text-orange-300">
            Araç Sorgulama
          </Link>{" "}
          bölümüne gidin.
        </div>
      </div>

      {/* Closed State: Two Side-by-Side Action Buttons */}
      {!isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-shrink-0 pt-1">
          {/* Left Button: Rapor Al */}
          <button
            type="button"
            onClick={handleGetReport}
            className="py-4 px-5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs sm:text-sm shadow-xl shadow-orange-500/20 transition flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer"
          >
            <FileText className="w-4.5 h-4.5 text-white shrink-0" />
            <span>📄 Bu Araç İçin Rapor Al</span>
          </button>

          {/* Right Button: Chatbot ile Konuş */}
          <button
            type="button"
            onClick={handleStartChat}
            className="py-4 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-orange-500/40 text-orange-300 hover:text-white font-black text-xs sm:text-sm shadow-lg transition flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer"
          >
            <MessageSquare className="w-4.5 h-4.5 text-orange-400 shrink-0" />
            <span>💬 Chatbot ile Konuş</span>
          </button>
        </div>
      )}

      {/* Open State: Report & Chatbot Container */}
      {isOpen && (
        <div className="flex flex-col gap-4">
          {/* Top Mode Switcher Bar */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/80 border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => setActiveMode("REPORT")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                activeMode === "REPORT"
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>📄 Araç Raporu</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode("CHAT")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                activeMode === "CHAT"
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>💬 Chatbot Sohbeti ({chatMessages.length})</span>
            </button>
          </div>

          {/* Quick Questions (Visible in Chat Mode) */}
          {activeMode === "CHAT" && (
            <div className="flex-shrink-0 space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowQuickQuestions((prev) => !prev)}
                  className="text-xs font-bold text-slate-400 hover:text-orange-400 uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-orange-400" />
                  <span>💡 Önerilen Hızlı Sorular ({quickQuestions.length})</span>
                  {showQuickQuestions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {showQuickQuestions && (
                <div className="flex flex-wrap gap-2 pt-1 animate-fade-in">
                  {quickQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={Boolean(loading || isChatbotQuotaExhausted)}
                      onClick={() => handleSendMessage(q)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-xs text-slate-300 hover:text-white disabled:opacity-40 transition font-medium cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ZONE 2: SCROLLABLE STREAM (REPORT MODE VS CHAT MODE) */}
          <div className="flex-1 min-h-[320px] max-h-[460px] overflow-y-auto space-y-4 p-4 sm:p-6 rounded-2xl bg-slate-950/95 border border-white/10 scrollbar-thin scrollbar-thumb-white/20">
            {initializing && (
              <div className="p-8 text-center text-xs text-slate-400 animate-pulse flex flex-col items-center justify-center gap-3">
                <span className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span>Araç raporu veritabanından çekiliyor ve hazırlanıyor, lütfen bekleyin...</span>
              </div>
            )}

            {/* REPORT MODE VIEW */}
            {activeMode === "REPORT" && (
              <>
                {initialReportMsg ? (
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2 mb-1.5 text-[11px] font-bold text-slate-400">
                      <span>🤖 TorqueScout Doğrulanmış Araç Raporu</span>
                      <span>•</span>
                      <span>
                        {new Date(initialReportMsg.createdAt).toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="w-full p-4 sm:p-6 rounded-2xl bg-slate-900 text-slate-200 border border-amber-500/30 shadow-xl">
                      {renderFormattedMarkdown(initialReportMsg.content)}
                    </div>
                  </div>
                ) : !initializing && (
                  <div className="p-8 text-center text-xs text-slate-300 flex flex-col items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-orange-400 animate-pulse" />
                    <span className="font-bold text-sm text-white">Henüz Bu Araç İçin Rapor Alınmadı</span>
                    <span className="text-slate-400 max-w-md">
                      Aşağıdaki "📄 Bu Araç İçin Rapor Al" butonuna tıklayarak aracın veritabanı destekli kronik risk ve durum değerlendirme raporunu oluşturabilirsiniz.
                    </span>
                  </div>
                )}
              </>
            )}

            {/* CHAT MODE VIEW */}
            {activeMode === "CHAT" && (
              <>
                {chatMessages.length === 0 && !loading && (
                  <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                    <MessageSquare className="w-6 h-6 text-orange-400" />
                    <span className="font-bold text-slate-300">AI Chatbot Danışmanına Hoş Geldiniz</span>
                    <span>İlan hakkındaki merak ettiğiniz tüm soruları aşağıya yazabilir veya önerilen hızlı sorulardan seçebilirsiniz.</span>
                  </div>
                )}

                {chatMessages.map((msg) => {
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
                      <div className="flex items-center gap-2 mb-1.5 text-[11px] font-bold text-slate-400">
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
                        className={`max-w-[90%] sm:max-w-[85%] p-4 sm:p-5 rounded-2xl ${
                          isUser
                            ? "bg-orange-500 text-white rounded-br-none shadow-md shadow-orange-500/10 font-medium text-xs sm:text-sm"
                            : "bg-slate-900 text-slate-200 border border-white/10 rounded-bl-none shadow-lg"
                        }`}
                      >
                        {isUser ? msg.content : renderFormattedMarkdown(msg.content)}

                        {/* Feedback Action Buttons for AI responses */}
                        {!isUser && (
                          <div className="flex items-center justify-between border-t border-white/10 pt-2.5 mt-3 text-[10px] text-slate-400">
                            <span className="italic">Bu değerlendirme faydalı oldu mu?</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleFeedback(msg.id, "UP")}
                                className={`p-1 rounded hover:text-emerald-400 transition ${
                                  feedbacks[msg.id] === "UP" ? "text-emerald-400 font-bold" : ""
                                }`}
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFeedback(msg.id, "DOWN")}
                                className={`p-1 rounded hover:text-rose-400 transition ${
                                  feedbacks[msg.id] === "DOWN" ? "text-rose-400 font-bold" : ""
                                }`}
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {loading && (
              <div className="flex items-center gap-2.5 p-4 text-xs text-slate-400 font-medium">
                <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                Danışman yanıt hazırlıyor...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ZONE 3: COMPOSER BAR OR REPORT ACTION BUTTON */}
          {activeMode === "REPORT" ? (
            <div className="flex-shrink-0 p-4 rounded-2xl bg-slate-900/90 border border-orange-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-2.5 font-medium">
                <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                <span>📄 <strong>Araç Raporu Modundasınız.</strong> Chatbot mesaj girişi kapalıdır.</span>
              </div>
              <button
                type="button"
                disabled={initializing}
                onClick={handleGetReport}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-xl shadow-orange-500/20 transition flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-40"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>{initialReportMsg ? "📄 Araç Raporunu Yenile" : "📄 Bu Araç İçin Rapor Al"}</span>
              </button>
            </div>
          ) : isChatbotQuotaExhausted ? (
            <div className="flex-shrink-0 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-rose-300 font-medium">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                <span>AI Chatbot mesaj hakkınız dolmuştur. Sohbet etmeye devam etmek için paketinizi yükseltebilirsiniz.</span>
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
              className="flex-shrink-0 flex items-center gap-3"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Bu ilan hakkında bir soru sorun (Örn: Şehir içi kullanıma uygun mu?)..."
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
