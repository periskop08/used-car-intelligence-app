"use client";

import React, { useState } from "react";

interface Props {
  variantIds: string[];
  vehicleNames: string[];
  remainingMessages?: number;
}

const quickChips = [
  "Çoğunlukla şehir içinde kullanacağım",
  "Yıllık 20.000 km yapıyorum",
  "En az masraf çıkaran hangisi?",
  "Uzun yol konforu öncelikli",
  "İkinci elde hangisi daha kolay satılır?",
];

export default function ComparisonChatbot({ variantIds, vehicleNames, remainingMessages = 30 }: Props) {
  const [messages, setMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    {
      sender: "ai",
      text: `Karşılaştırmanız hazır! Seçtiğiniz ${vehicleNames.length} araç (${vehicleNames.join(", ")}) için kullanım tarzınızı, yıllık ortalama kilometrenizi veya bütçe önceliğinizi söylerseniz seçimleri sizin için daha da daraltabilirim.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (questionText?: string) => {
    const query = questionText || input.trim();
    if (!query || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { sender: "user", text: query }]);
    setLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

      const res = await fetch(`${API_URL}/comparisons/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ variantIds, question: query }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { sender: "ai", text: data.response || "Yanıt alınamadı." }]);
      } else {
        const errData = await res.json().catch(() => null);
        setMessages((prev) => [
          ...prev,
          { sender: "ai", text: errData?.message || "Üzgünüm, şu an bağlantı kurulamadı." },
        ]);
      }
    } catch {
      setMessages((prev) => [...prev, { sender: "ai", text: "Bir hata oluştu. Lütfen tekrar deneyin." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-white/10 p-6 rounded-3xl space-y-4 shadow-2xl relative">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Bağlam Bilgili TorqueScout AI Canlı Asistanı
            </h3>
            <span className="text-[10px] text-slate-400">
              Bu karşılaştırma raporunun tüm verilerine ve araç detaylarına hakim canlı danışman
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
          Kalan Hak: {remainingMessages}
        </span>
      </div>

      {/* Messages Window */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                m.sender === "user"
                  ? "bg-orange-600 text-white font-medium rounded-br-none"
                  : "bg-slate-950/80 text-slate-200 border border-white/10 rounded-bl-none whitespace-pre-line"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-950/80 text-slate-400 p-3 rounded-2xl text-xs animate-pulse border border-white/10">
              Analiz ediliyor...
            </div>
          </div>
        )}
      </div>

      {/* Quick Chips */}
      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            className="text-[10px] bg-slate-950 hover:bg-orange-500/20 text-slate-300 hover:text-orange-300 px-2.5 py-1 rounded-full border border-white/10 transition"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Araçlar hakkında özel sorunuzu yazın..."
          className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition"
        >
          Gönder
        </button>
      </div>
    </div>
  );
}
