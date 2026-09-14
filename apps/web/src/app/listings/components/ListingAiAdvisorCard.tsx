"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Sparkles, Zap, Lock, Send, AlertTriangle, Trash2, ThumbsUp, ThumbsDown, HelpCircle, ChevronDown, ChevronUp, FileText, MessageSquare } from "lucide-react";
import VehicleReportShell from "../../vehicle-report/components/VehicleReportShell";
import { ComprehensiveVehicleReport } from "@used-car-intelligence/shared";

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
  const [structuredReport, setStructuredReport] = useState<ComprehensiveVehicleReport | null>(null);
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

  const fetchStructuredReport = async () => {
    const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/vehicle-reports/by-listing/${listingId}/current`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.reportData) {
          setStructuredReport(data.reportData as ComprehensiveVehicleReport);
        }
      }
    } catch (e) {
      console.error("Failed to fetch structured report", e);
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
          setShowQuickQuestions(false);
        }
      }
    } catch (e) {
      console.error("Failed to fetch conversation", e);
    } finally {
      fetchQuota();
    }
  };

  useEffect(() => {
    fetchConversation();
  }, [listingId]);

  const initialReportMsg = messages.find(
    (m) => m.messageType === "INITIAL_ANALYSIS" || m.messageType === "VEHICLE_REPORT"
  );
  const chatMessages = messages.filter(
    (m) =>
      (m.role === "USER" || m.role === "ASSISTANT") &&
      m.messageType !== "INITIAL_ANALYSIS" &&
      m.messageType !== "VEHICLE_REPORT"
  );

  const reportRemaining = quota?.reportQuota?.remaining ?? (quota?.unlimited ? "∞" : 0);
  const chatbotRemaining = quota?.chatbotQuota?.remaining ?? (quota?.unlimited ? "∞" : 0);
  const isChatbotQuotaExhausted = !quota?.unlimited && typeof chatbotRemaining === "number" && chatbotRemaining <= 0;

  const handleStartChat = () => {
    setIsOpen(true);
    setActiveMode("CHAT");
  };

  const handleGetReport = async (forceRefresh: boolean = false) => {
    setIsOpen(true);
    setActiveMode("REPORT");

    const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
    if (!token) {
      alert("Araç raporu alabilmek için lütfen giriş yapın.");
      return;
    }

    if (!forceRefresh && structuredReport) {
      return;
    }

    setInitializing(true);

    try {
      if (!forceRefresh) {
        try {
          const currentRes = await fetch(`${API_URL}/vehicle-reports/by-listing/${listingId}/current`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (currentRes.ok) {
            const currentData = await currentRes.json();
            if (currentData && currentData.reportData) {
              setStructuredReport(currentData.reportData as ComprehensiveVehicleReport);
              setInitializing(false);
              fetchQuota();
              return;
            }
          }
        } catch (checkErr) {
          console.warn("Could not check cached listing report:", checkErr);
        }
      }

      const idempotencyKey = `listing_report_${listingId}_${Date.now()}`;
      const res = await fetch(`${API_URL}/vehicle-reports`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "LISTING_REPORT",
          listingId,
          idempotencyKey,
          forceRefresh,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Rapor oluşturulamadı.");
      }

      const data = await res.json();
      const reportId = data.reportId;

      // Poll report status
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        if (attempts > 15) {
          clearInterval(pollInterval);
          setInitializing(false);
          return;
        }

        const pollRes = await fetch(`${API_URL}/vehicle-reports/${reportId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (pollRes.ok) {
          const pollData = await pollRes.json();
          if (pollData.status === "COMPLETED" || pollData.status === "SAFE_FALLBACK") {
            clearInterval(pollInterval);
            setStructuredReport(pollData.reportData as ComprehensiveVehicleReport);
            setInitializing(false);
            fetchQuota();
          }
        }
      }, 2000);
    } catch (e: any) {
      alert(e.message || "Rapor alınırken bir hata oluştu.");
      setInitializing(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = textToSend || inputMessage;
    if (!messageText.trim()) return;

    const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
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
        const assistantMsg: ChatMessage = {
          id: data.assistantMessageId || `assistant-${Date.now()}`,
          role: "ASSISTANT",
          messageType: data.messageType || "ASSISTANT_RESPONSE",
          content: data.answer,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        if (data.quota) setQuota(data.quota);
      } else {
        const errData = await res.json();
        alert(errData.message || "Mesaj gönderilemedi.");
      }
    } catch (e) {
      console.error("Chat error", e);
    } finally {
      setLoading(false);
      fetchQuota();
    }
  };

  const handleFeedback = async (messageId: string, feedbackType: "UP" | "DOWN") => {
    setFeedbacks((prev) => ({ ...prev, [messageId]: feedbackType }));
  };

  const handleClearConversation = async () => {
    const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
    if (!token) {
      setMessages([]);
      setShowQuickQuestions(true);
      return;
    }

    if (!confirm("Chatbot sohbet geçmişiniz temizlenecektir. Onaylıyor musunuz?")) return;

    try {
      const res = await fetch(`${API_URL}/api/listings/${listingId}/ai-conversation`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessages([]);
        setShowQuickQuestions(true);
        fetchQuota();
      }
    } catch (e) {
      console.error("Failed to clear conversation", e);
      setMessages([]);
      setShowQuickQuestions(true);
    }
  };

  const renderFormattedMarkdown = (content: string) => {
    if (!content) return null;
    const paragraphs = content.split("\n\n");
    return paragraphs.map((p, idx) => {
      const lines = p.split("\n");
      return (
        <div key={idx} className="mb-3 last:mb-0 space-y-1">
          {lines.map((line, lIdx) => {
            const trimmed = line.trim();
            if (trimmed.startsWith("### ")) {
              return (
                <h4 key={lIdx} className="text-sm font-bold text-orange-400 mt-2 mb-1">
                  {trimmed.replace("### ", "")}
                </h4>
              );
            }
            if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
              return (
                <li key={lIdx} className="ml-4 list-disc text-xs leading-relaxed text-slate-300">
                  {trimmed.substring(2)}
                </li>
              );
            }
            return (
              <p key={lIdx} className="text-xs leading-relaxed text-slate-200">
                {trimmed}
              </p>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className="w-full bg-[#090d1a] border border-white/10 p-5 sm:p-7 rounded-[28px] shadow-2xl flex flex-col gap-5 relative overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 rounded-2xl text-orange-400 shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-100 tracking-tight">TorqueScout İlan Zekası</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono">
                v2.5 AI
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              İlan teknik analizi, ekspertiz çelişkileri ve yapay zeka danışmanı.
            </p>
          </div>
        </div>

        {/* Quota Indicators */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {quota && (
            <>
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

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-orange-500/30 shadow-md">
                <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
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

          {isOpen && (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
            >
              <ChevronUp className="w-4 h-4 text-orange-400" />
              <span>Daralt</span>
            </button>
          )}

          {isOpen && chatMessages.length > 0 && (
            <button
              type="button"
              onClick={handleClearConversation}
              title="Sohbet geçmişini temizle"
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Closed State: Two Side-by-Side Action Buttons */}
      {!isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 w-full">
          <button
            type="button"
            onClick={() => handleGetReport(false)}
            className="py-4 px-5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs sm:text-sm shadow-xl shadow-orange-500/20 transition flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer w-full"
          >
            <FileText className="w-4.5 h-4.5 text-white shrink-0" />
            <span>Aracı İncele & AI Raporu Al</span>
          </button>

          <button
            type="button"
            onClick={handleStartChat}
            className="py-4 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-orange-500/40 text-orange-300 hover:text-white font-black text-xs sm:text-sm shadow-lg transition flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer w-full"
          >
            <MessageSquare className="w-4.5 h-4.5 text-orange-400 shrink-0" />
            <span>Chatbot ile Konuş</span>
          </button>
        </div>
      )}

      {/* Open State: Report & Chatbot Container */}
      {isOpen && (
        <div className="w-full flex flex-col gap-4">
          {/* Top Mode Switcher Bar */}
          <div className="w-full flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/80 border border-white/10">
            <button
              type="button"
              onClick={() => setActiveMode("REPORT")}
              className={`flex-1 py-3 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                activeMode === "REPORT"
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Araç Raporu</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode("CHAT")}
              className={`flex-1 py-3 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                activeMode === "CHAT"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chatbot Sohbeti{chatMessages.length > 0 ? ` (${chatMessages.length})` : ""}</span>
            </button>
          </div>

          {/* REPORT MODE VIEW */}
          {activeMode === "REPORT" && (
            <div className="w-full space-y-4">
              {initializing ? (
                <div className="p-12 text-center text-xs text-slate-400 animate-pulse flex flex-col items-center justify-center gap-3 bg-slate-950/80 rounded-2xl border border-white/10">
                  <span className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <span>İlan özel araç raporu hazırlanıyor, lütfen bekleyin...</span>
                </div>
              ) : structuredReport ? (
                <VehicleReportShell 
                  report={structuredReport} 
                  onRefresh={() => handleGetReport(true)} 
                  isRefreshing={initializing} 
                />
              ) : initialReportMsg ? (
                <div className="p-5 rounded-2xl bg-slate-950/95 border border-white/10">
                  <div className="w-full p-4 sm:p-6 rounded-2xl bg-slate-900 text-slate-200 border border-amber-500/30 shadow-xl">
                    {renderFormattedMarkdown(initialReportMsg.content)}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-300 flex flex-col items-center justify-center gap-3 bg-slate-950/80 rounded-2xl border border-white/10">
                  <FileText className="w-8 h-8 text-orange-400 animate-pulse" />
                  <span className="font-bold text-sm text-white">Henüz Bu Araç İçin Rapor Alınmadı</span>
                  <span className="text-slate-400 max-w-md">
                    "Bu Araç İçin Rapor Al" butonuna tıklayarak ilanın kronik risk ve çelişki değerlendirme raporunu oluşturabilirsiniz.
                  </span>
                </div>
              )}

              {/* Bottom Report Action Bar */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-orange-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
                <div className="flex items-center gap-2.5 font-medium">
                  <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                  <span><strong>Araç Raporu Modundasınız.</strong> Chatbot mesaj girişi kapalıdır.</span>
                </div>
                <button
                  type="button"
                  disabled={initializing}
                  onClick={() => handleGetReport(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-xl shadow-orange-500/20 transition flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-40 active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>{structuredReport || initialReportMsg ? "Araç Raporunu Yenile" : "Bu Araç İçin Rapor Al"}</span>
                </button>
              </div>
            </div>
          )}

          {/* CHAT MODE VIEW */}
          {activeMode === "CHAT" && (
            <div className="w-full space-y-4">
              {chatMessages.length > 0 && (
                <div className="flex justify-end pb-1">
                  <button
                    type="button"
                    onClick={handleClearConversation}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 text-xs font-bold transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sohbeti Temizle</span>
                  </button>
                </div>
              )}

              {/* Quick Questions */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowQuickQuestions((prev) => !prev)}
                  className="text-xs font-bold text-slate-400 hover:text-orange-400 uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-orange-400" />
                  <span>💡 Önerilen Hızlı Sorular ({quickQuestions.length})</span>
                  {showQuickQuestions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showQuickQuestions && (
                  <div className="flex flex-wrap gap-2 pt-1">
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

              {/* Chat Stream */}
              <div className="min-h-[300px] max-h-[500px] overflow-y-auto space-y-4 p-4 sm:p-6 rounded-2xl bg-slate-950/95 border border-white/10 scrollbar-thin scrollbar-thumb-white/20">
                {chatMessages.length === 0 && !loading && (
                  <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                    <MessageSquare className="w-6 h-6 text-orange-400" />
                    <span className="font-bold text-slate-300">AI Chatbot Danışmanına Hoş Geldiniz</span>
                    <span>İlan hakkındaki merak ettiğiniz tüm soruları aşağıya yazabilir veya önerilen hızlı sorulardan seçebilirsiniz.</span>
                  </div>
                )}

                {chatMessages.map((msg) => {
                  const isUser = msg.role === "USER";
                  return (
                    <div key={msg.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                      <div className="flex items-center gap-2 mb-1.5 text-[10px] font-bold text-slate-400">
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
                        className={`max-w-[90%] sm:max-w-[85%] p-4 rounded-2xl ${
                          isUser
                            ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-br-none shadow-md font-medium text-xs sm:text-sm"
                            : "bg-slate-900 text-slate-200 border border-white/10 rounded-bl-none shadow-lg"
                        }`}
                      >
                        {isUser ? msg.content : renderFormattedMarkdown(msg.content)}

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

                {loading && (
                  <div className="flex items-center gap-2.5 p-4 text-xs text-slate-400 font-medium">
                    <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    Danışman yanıt hazırlıyor...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Form */}
              {isChatbotQuotaExhausted ? (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-rose-300 font-medium">
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
                  className="flex items-center gap-3"
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
                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-40 text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-500/20 transition flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>Gönder</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
