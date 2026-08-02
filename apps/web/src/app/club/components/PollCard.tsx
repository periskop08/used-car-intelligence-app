"use client";

import React, { useState } from "react";

export interface PollOptionData {
  optionId: string;
  text: string;
  sortOrder: number;
  selectedByCurrentUser?: boolean;
  voteCount?: number;
  percentage?: number;
}

export interface PollData {
  pollId: string;
  postId: string;
  question: string;
  selectionType: "SINGLE" | "MULTIPLE";
  maxSelections: number;
  resultVisibility: "ALWAYS" | "AFTER_VOTE" | "AFTER_END" | "ADMIN_ONLY";
  status: string;
  startsAt: string;
  endsAt?: string | null;
  closedAt?: string | null;
  isOpen: boolean;
  canVote: boolean;
  canChangeVote: boolean;
  canWithdrawVote: boolean;
  resultsVisible: boolean;
  participantCount?: number;
  totalSelectionCount?: number;
  options: PollOptionData[];
  currentUserVote?: {
    voteId: string;
    optionIds: string[];
    updatedAt: string;
  };
}

interface PollCardProps {
  poll: PollData;
  onPollUpdated?: (updatedPoll: PollData) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function PollCard({ poll: initialPoll, onPollUpdated }: PollCardProps) {
  const [poll, setPoll] = useState<PollData>(initialPoll);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>(
    initialPoll.currentUserVote?.optionIds || []
  );
  const [isEditingVote, setIsEditingVote] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasVoted = !!poll.currentUserVote && poll.currentUserVote.optionIds.length > 0;
  const showResults = poll.resultsVisible && (hasVoted || !poll.isOpen || isEditingVote === false);

  const formatRemainingTime = () => {
    if (!poll.endsAt) return "Süresiz Anket";
    const ends = new Date(poll.endsAt);
    const now = new Date();
    const diffMs = ends.getTime() - now.getTime();

    if (diffMs <= 0) return "Anket Sona Erdi";

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) {
      return `${days} gün ${remainingHours} saat kaldı`;
    }
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours} saat ${mins} dk kaldı`;
    }
    return `${mins} dk kaldı`;
  };

  const handleSelectOption = (optionId: string) => {
    if (!poll.isOpen || loading) return;

    if (poll.selectionType === "SINGLE") {
      setSelectedOptionIds([optionId]);
    } else {
      if (selectedOptionIds.includes(optionId)) {
        setSelectedOptionIds(selectedOptionIds.filter((id) => id !== optionId));
      } else {
        if (poll.maxSelections && selectedOptionIds.length >= poll.maxSelections) {
          setErrorMessage(`En fazla ${poll.maxSelections} seçenek seçebilirsiniz.`);
          return;
        }
        setErrorMessage(null);
        setSelectedOptionIds([...selectedOptionIds, optionId]);
      }
    }
  };

  const handleCastVote = async () => {
    if (selectedOptionIds.length === 0) {
      setErrorMessage("Lütfen en az bir seçenek belirleyin.");
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("Oy kullanabilmek için lütfen giriş yapın.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/club/polls/${poll.pollId}/my-vote`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ optionIds: selectedOptionIds }),
      });

      if (res.ok) {
        const updated = await res.json();
        setPoll(updated);
        setIsEditingVote(false);
        if (onPollUpdated) onPollUpdated(updated);
      } else {
        const err = await res.json();
        setErrorMessage(err.message || "Oy kaydınız alınamadı.");
      }
    } catch (e) {
      setErrorMessage("Sunucuyla iletişim kurulurken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawVote = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    if (!confirm("Oyunuzu geri çekmek istediğinizden emin misiniz?")) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/club/polls/${poll.pollId}/my-vote`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const updated = await res.json();
        setPoll(updated);
        setSelectedOptionIds([]);
        setIsEditingVote(false);
        if (onPollUpdated) onPollUpdated(updated);
      } else {
        const err = await res.json();
        setErrorMessage(err.message || "Oy geri çekilemedi.");
      }
    } catch (e) {
      setErrorMessage("Sunucuyla iletişim hatası.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-3 p-4 rounded-xl border border-white/10 bg-slate-950/90 space-y-3">
      {/* Header Badge & Question */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
              📊 ANKET
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {poll.selectionType === "SINGLE" ? "Tek Seçim" : `Çoklu Seçim (Max ${poll.maxSelections})`}
            </span>
          </div>
          <h4 className="text-sm font-bold text-white leading-snug">{poll.question}</h4>
        </div>

        {/* Time Remaining Badge */}
        <div className="text-right shrink-0">
          <span
            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
              poll.isOpen
                ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                : "text-slate-400 bg-slate-800 border border-slate-700"
            }`}
          >
            {formatRemainingTime()}
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Options List */}
      <div className="space-y-2 pt-1">
        {poll.options.map((option) => {
          const isSelected = selectedOptionIds.includes(option.optionId);
          const pct = option.percentage ?? 0;

          // Render Results Bar Mode
          if (showResults && !isEditingVote) {
            return (
              <div
                key={option.optionId}
                className="relative p-3 rounded-lg border border-white/10 bg-slate-900 overflow-hidden"
              >
                {/* Background Percentage Fill Bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 bg-orange-500/20 border-r border-orange-500/40 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />

                <div className="relative flex items-center justify-between z-10 text-xs">
                  <div className="flex items-center gap-2 font-medium text-slate-200">
                    {option.selectedByCurrentUser && (
                      <span className="text-orange-400 font-bold" title="Sizin Oyunuz">
                        ✓
                      </span>
                    )}
                    <span>{option.text}</span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                    <span className="font-bold text-orange-400">%{pct}</span>
                    {option.voteCount !== undefined && (
                      <span className="text-slate-500">({option.voteCount} oy)</span>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          // Render Voting Radio/Checkbox Mode
          return (
            <button
              key={option.optionId}
              type="button"
              disabled={!poll.isOpen || loading}
              onClick={() => handleSelectOption(option.optionId)}
              className={`w-full p-3 rounded-lg border text-left text-xs transition flex items-center gap-3 ${
                isSelected
                  ? "border-orange-500 bg-orange-500/10 text-white font-bold"
                  : "border-white/10 bg-slate-900 text-slate-300 hover:border-white/20 hover:bg-slate-850"
              } ${!poll.isOpen ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div
                className={`w-4 h-4 border flex items-center justify-center shrink-0 transition ${
                  poll.selectionType === "SINGLE" ? "rounded-full" : "rounded"
                } ${
                  isSelected
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-slate-500 bg-slate-950"
                }`}
              >
                {isSelected && <span className="text-[10px] font-bold">✓</span>}
              </div>
              <span className="flex-1">{option.text}</span>
            </button>
          );
        })}
      </div>

      {/* Footer Controls / Voting Buttons */}
      <div className="pt-2 flex items-center justify-between gap-3 border-t border-white/5">
        <div className="text-[11px] font-mono text-slate-400">
          {poll.participantCount !== undefined ? (
            <span>👥 {poll.participantCount} Katılımcı</span>
          ) : (
            <span>🔒 Oylama Açık</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* If user has not voted yet or is editing vote */}
          {(!hasVoted || isEditingVote) && poll.isOpen && (
            <>
              {isEditingVote && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setIsEditingVote(false);
                    setSelectedOptionIds(poll.currentUserVote?.optionIds || []);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white text-xs font-semibold transition"
                >
                  İptal
                </button>
              )}
              <button
                type="button"
                disabled={loading || selectedOptionIds.length === 0}
                onClick={handleCastVote}
                className="px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-xs font-black shadow-md shadow-orange-500/20 transition"
              >
                {loading ? "Kaydediliyor..." : hasVoted ? "Değişikliği Kaydet" : "Oy Ver 🗳️"}
              </button>
            </>
          )}

          {/* If user has already voted and poll is open */}
          {hasVoted && !isEditingVote && poll.isOpen && (
            <>
              {poll.canChangeVote && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setIsEditingVote(true)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Oyumu Değiştir
                </button>
              )}
              {poll.canWithdrawVote && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleWithdrawVote}
                  className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition"
                >
                  Geri Çek
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
