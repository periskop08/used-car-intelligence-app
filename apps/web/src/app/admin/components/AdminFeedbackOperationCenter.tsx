"use client";

import React, { useState, useEffect } from "react";
import AdminUserCommunicationDialog from "./AdminUserCommunicationDialog";
import {
  Search,
  Filter,
  User,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Send,
  Save,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  FileText,
  Mail,
  MessageSquare,
  Lock,
  UserCheck,
  Archive,
  Eye,
  EyeOff,
} from "lucide-react";

export const FEEDBACK_SOURCE_LABELS: Record<string, string> = {
  CLUB: "Tork Scout Club",
  LISTING_DETAIL: "İlan Detayı",
  LISTING_MODERATION: "İlan Moderasyonu",
  VEHICLE_SEARCH: "Araç Sorgulama",
  VEHICLE_COMPARISON: "Araç Karşılaştırma",
  LISTING_AI_ADVISOR: "AI İlan Danışmanı",
  CHATBOT: "Chatbot",
  PAYMENT: "Paketler ve Ödeme",
  MESSAGING: "Mesajlar",
  ACCOUNT: "Hesap ve Profil",
  TECHNICAL_SUPPORT: "Teknik Destek",
  OTHER: "Diğer",
};

export const FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
  CLUB_MUTE_APPEAL: "Club Susturma İtirazı",
  CLUB_BAN_APPEAL: "Club Ban İtirazı",
  COMMENT_MODERATION: "Yorum Moderasyonu",
  LISTING_REJECT_APPEAL: "İlan Red İtirazı",
  LISTING_TECHNICAL: "İlan Teknik Sorunu",
  AI_RESPONSE_COMPLAINT: "AI Cevap Şikâyeti",
  PAYMENT_PACKAGE: "Ödeme ve Paket",
  ACCOUNT_ACCESS: "Hesap Erişimi",
  MESSAGING_ISSUE: "Mesajlaşma Sorunu",
  GENERAL_TECHNICAL: "Genel Teknik Sorun",
  SUGGESTION: "Öneri",
  BUG_REPORT: "Hata Bildirimi",
  VEHICLE_QUERY_AI_REPORT: "Araç Sorgulama / AI Rapor",
  INCORRECT_VEHICLE_DATA: "Eksik veya Hatalı Araç Bilgisi",
  LISTINGS: "İlanlar",
  MESSAGES: "Mesajlar",
  FAVORITES: "Favoriler",
  SUBSCRIPTION_PACKAGES: "Abonelik / Paketler",
  ACCOUNT_PROFILE: "Hesap / Profil",
  VEHICLE_GUIDE: "Araç Rehberi",
  VEHICLE_COMPARISON: "Araç Karşılaştırma",
  FIND_MY_CAR: "Aracını Bul",
  DESIGN_USABILITY: "Tasarım / Kullanım Kolaylığı",
  SECURITY_SUSPICIOUS_ACTIVITY: "Güvenlik / Şüpheli İşlem",
  GENERAL_SUGGESTION: "Genel Öneri",
  OTHER: "Diğer",
};

export const FEEDBACK_STATUS_LABELS: Record<string, string> = {
  NEW: "Yeni",
  IN_REVIEW: "İncelemede",
  WAITING_USER_INFO: "Bilgi Bekleniyor",
  ASSIGNED: "Atandı",
  ACTION_TAKEN: "İşlem Yapıldı",
  RESOLVED: "Çözüldü",
  REJECTED: "Reddedildi",
  ARCHIVED: "Arşivlendi",
};

export const FEEDBACK_PRIORITY_LABELS: Record<string, string> = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  URGENT: "Acil",
};

interface AdminFeedbackOperationCenterProps {
  token: string;
}

export default function AdminFeedbackOperationCenter({ token }: AdminFeedbackOperationCenterProps) {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filters
  const [activeQueue, setActiveQueue] = useState<"LISTING_REPORTS" | "GENERAL">("LISTING_REPORTS");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  // Communication Dialog State
  const [commDialogState, setCommDialogState] = useState<{
    isOpen: boolean;
    feedbackId: string;
    recipient: "REPORTER" | "LISTING_OWNER";
    recipientDisplayName: string;
    recipientCustomerNo?: string;
    recipientEmail?: string;
  } | null>(null);

  // Expandable cards state
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [unmaskedEmails, setUnmaskedEmails] = useState<Record<string, boolean>>({});

  // Input states for expanded card forms
  const [internalNotes, setInternalNotes] = useState<Record<string, string>>({});
  const [userResponses, setUserResponses] = useState<Record<string, string>>({});
  const [responseChannels, setResponseChannels] = useState<Record<string, "IN_APP" | "EMAIL" | "BOTH">>({});

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  const fetchFeedbacks = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (activeQueue === "LISTING_REPORTS") {
        queryParams.append("source", "LISTING_REPORT");
      } else if (sourceFilter) {
        queryParams.append("source", sourceFilter);
      }
      if (categoryFilter) queryParams.append("category", categoryFilter);
      if (statusFilter) queryParams.append("status", statusFilter);
      if (priorityFilter) queryParams.append("priority", priorityFilter);
      if (search) queryParams.append("search", search);

      const res = await fetch(`${API_URL}/admin/feedbacks?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Geri bildirimler yüklenemedi.");
      const data = await res.json();
      setFeedbacks(data);

      const notesMap: Record<string, string> = {};
      const responsesMap: Record<string, string> = {};
      data.forEach((fb: any) => {
        if (fb.internalNote) notesMap[fb.id] = fb.internalNote;
        if (fb.userResponse) responsesMap[fb.id] = fb.userResponse;
      });
      setInternalNotes((prev) => ({ ...notesMap, ...prev }));
      setUserResponses((prev) => ({ ...responsesMap, ...prev }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [token, activeQueue, sourceFilter, categoryFilter, statusFilter, priorityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFeedbacks();
  };

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleEmailMask = (id: string) => {
    setUnmaskedEmails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpdateFeedback = async (id: string, dto: any) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`${API_URL}/admin/feedbacks/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });

      if (!res.ok) {
        const errObj = await res.json().catch(() => ({}));
        throw new Error(errObj.message || "Güncelleme başarısız.");
      }
      await fetchFeedbacks();
    } catch (err: any) {
      alert(err.message || "İşlem yapılırken hata oluştu.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSaveInternalNote = async (id: string) => {
    const note = internalNotes[id] || "";
    await handleUpdateFeedback(id, { internalNote: note });
    alert("İç admin notu kaydedildi.");
  };

  const handleSendUserResponse = async (id: string, channel: "IN_APP" | "EMAIL" | "BOTH", markStatus?: string) => {
    const responseMessage = userResponses[id] || "";
    if (!responseMessage.trim()) {
      alert("Lütfen kullanıcıya verilecek cevabı yazın.");
      return;
    }

    setActionLoadingId(id);
    try {
      const res = await fetch(`${API_URL}/admin/feedbacks/${id}/respond`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          responseMessage,
          channel,
          markStatus: markStatus || "RESOLVED",
          markResolved: true,
        }),
      });

      if (!res.ok) {
        const errObj = await res.json().catch(() => ({}));
        throw new Error(errObj.message || "Yanıt gönderilemedi.");
      }
      alert("Kullanıcıya resmi yanıt başarıyla gönderildi ve bildirim iletildi.");
      await fetchFeedbacks();
    } catch (err: any) {
      alert(err.message || "Yanıt gönderilirken hata oluştu.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevokeRestriction = async (feedbackId: string, restrictionId: string) => {
    if (!confirm("Kullanıcının Club kısıtlamasını (Mute/Ban) kaldırmak istediğinize emin misiniz? Kayıt silinmeyecek, kaldırıldı olarak işaretlenecektir.")) {
      return;
    }

    setActionLoadingId(feedbackId);
    try {
      const res = await fetch(`${API_URL}/admin/feedbacks/${feedbackId}/revoke-restriction`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ restrictionId }),
      });

      if (!res.ok) {
        const errObj = await res.json().catch(() => ({}));
        throw new Error(errObj.message || "Kısıtlama kaldırılamadı.");
      }
      alert("Kısıtlama kaldırıldı ve kullanıcıya bilgilendirme yanıtı iletildi!");
      await fetchFeedbacks();
    } catch (err: any) {
      alert(err.message || "İşlem sırasında hata oluştu.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const maskEmail = (email?: string) => {
    if (!email) return "e***@domain.com";
    const parts = email.split("@");
    if (parts.length < 2) return email;
    const name = parts[0];
    const domain = parts[1];
    return `${name.slice(0, 1)}***@${domain}`;
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/60 border border-white/10 shadow-xl">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-black text-white flex items-center gap-2.5">
            <MessageSquare className="w-5 h-5 text-orange-400" />
            <span>Geri Bildirim Yönetim Merkezi</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Tüm talep, şikâyet, kısıtlama itirazı ve teknik bildirimleri operasyonel olarak yönetin, kullanıcıya doğrudan yanıt verin.
          </p>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono font-bold">
          Toplam Talep: {feedbacks.length}
        </div>
      </div>

      {/* QUEUE TABS */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveQueue("LISTING_REPORTS")}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            activeQueue === "LISTING_REPORTS"
              ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20"
              : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-850 border border-white/5"
          }`}
        >
          <span>🚨</span> Şikâyet Edilen İlanlar (Listing Reports)
        </button>

        <button
          type="button"
          onClick={() => setActiveQueue("GENERAL")}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            activeQueue === "GENERAL"
              ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20"
              : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-850 border border-white/5"
          }`}
        >
          <span>💬</span> Genel Geri Bildirimler
        </button>
      </div>

      {/* RICH FILTERS BAR */}
      <form onSubmit={handleSearchSubmit} className="p-6 rounded-3xl bg-slate-900/30 border border-white/5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {/* Search */}
        <div className="flex flex-col gap-1.5 md:col-span-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Arama Yap</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ad, E-posta, Talep No..."
              className="w-full pl-9 pr-3 py-2 bg-[#05070f] border border-white/10 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none transition"
            />
          </div>
        </div>

        {/* Source Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kaynak</label>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-[#05070f] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition cursor-pointer"
          >
            <option value="">Tüm Kaynaklar</option>
            {Object.entries(FEEDBACK_SOURCE_LABELS).map(([val, lbl]) => (
              <option key={val} value={val} className="bg-[#090d1a]">
                {lbl}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Konu</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#05070f] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition cursor-pointer"
          >
            <option value="">Tüm Konular</option>
            {Object.entries(FEEDBACK_CATEGORY_LABELS).map(([val, lbl]) => (
              <option key={val} value={val} className="bg-[#090d1a]">
                {lbl}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Durum</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#05070f] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition cursor-pointer"
          >
            <option value="">Tüm Durumlar</option>
            {Object.entries(FEEDBACK_STATUS_LABELS).map(([val, lbl]) => (
              <option key={val} value={val} className="bg-[#090d1a]">
                {lbl}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Öncelik</label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-[#05070f] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition cursor-pointer"
          >
            <option value="">Tüm Öncelikler</option>
            {Object.entries(FEEDBACK_PRIORITY_LABELS).map(([val, lbl]) => (
              <option key={val} value={val} className="bg-[#090d1a]">
                {lbl}
              </option>
            ))}
          </select>
        </div>
      </form>

      {/* FEEDBACK CARDS LIST */}
      {loading ? (
        <div className="text-center py-16 text-xs text-slate-400 animate-pulse flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          Geri bildirim operasyon verileri yükleniyor...
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900/20 border border-white/5 text-center text-xs text-slate-400 font-medium italic">
          Kriterlere uygun geri bildirim kaydı bulunamadı.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {feedbacks.map((fb) => {
            const isExpanded = Boolean(expandedCards[fb.id]);
            const isEmailUnmasked = Boolean(unmaskedEmails[fb.id]);

            const priorityColor =
              fb.priority === "URGENT"
                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                : fb.priority === "HIGH"
                ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                : fb.priority === "NORMAL"
                ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                : "bg-slate-800 text-slate-400 border-white/10";

            const statusColor =
              fb.status === "NEW"
                ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                : fb.status === "IN_REVIEW"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                : fb.status === "ACTION_TAKEN"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : fb.status === "RESOLVED"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : fb.status === "REJECTED"
                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                : "bg-slate-800 text-slate-400 border-white/10";

            const restriction = fb.liveRestrictionStatus;

            return (
              <div
                key={fb.id}
                className="p-6 rounded-3xl bg-slate-900/40 border border-white/10 hover:border-orange-500/30 transition-all flex flex-col gap-5 shadow-xl"
              >
                {/* COMPACT TOP HEADER */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  {/* Customer Identity Row */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center font-black text-orange-400 text-xs shrink-0">
                      {fb.user?.profilePhotoUrl ? (
                        <img src={fb.user.profilePhotoUrl} alt="Avatar" className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        (fb.formattedName || "U").slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white flex items-center gap-2">
                        {fb.formattedCustomerIdentity}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span>Talep No: {fb.ticketNo}</span>
                        <span>•</span>
                        <span>{new Date(fb.createdAt).toLocaleString("tr-TR")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Badges & Action Toggle */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Source Badge */}
                    <span className="text-[10px] font-extrabold px-3 py-1 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-300 uppercase tracking-wider">
                      📌 {FEEDBACK_SOURCE_LABELS[fb.source] || fb.source}
                    </span>

                    {/* Category Badge */}
                    <span className="text-[10px] font-extrabold px-3 py-1 rounded-xl bg-slate-800 border border-white/10 text-slate-200">
                      📂 {FEEDBACK_CATEGORY_LABELS[fb.subjectCategory] || fb.subjectCategory}
                    </span>

                    {/* Live Restriction Summary Badge */}
                    {restriction && (
                      <span
                        className={`text-[10px] font-black px-3 py-1 rounded-xl border flex items-center gap-1 ${
                          restriction.isActive
                            ? "bg-rose-500/10 text-rose-300 border-rose-500/30 animate-pulse"
                            : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                        }`}
                      >
                        {restriction.isActive ? <ShieldAlert className="w-3 h-3 text-rose-400" /> : <ShieldCheck className="w-3 h-3 text-emerald-400" />}
                        <span>
                          {restriction.type}: {restriction.displayStatus} {restriction.isActive ? `(${restriction.remainingText})` : ""}
                        </span>
                      </span>
                    )}

                    {/* Priority Badge */}
                    <span className={`text-[10px] font-black px-3 py-1 rounded-xl border ${priorityColor}`}>
                      ⚡ {FEEDBACK_PRIORITY_LABELS[fb.priority] || fb.priority}
                    </span>

                    {/* Status Badge */}
                    <span className={`text-[10px] font-black px-3 py-1 rounded-xl border ${statusColor}`}>
                      📌 {FEEDBACK_STATUS_LABELS[fb.status] || fb.status}
                    </span>

                    {/* Expand/Collapse Button */}
                    <button
                      type="button"
                      onClick={() => toggleCard(fb.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer ml-2"
                    >
                      <span>{isExpanded ? "Detayı Kapat" : "Detayı Gör / Operasyon"}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* COMPACT MESSAGE PREVIEW (Shown when collapsed) */}
                {!isExpanded && (
                  <div className="text-xs text-slate-300 bg-slate-950/70 p-4 rounded-2xl border border-white/5 leading-relaxed truncate">
                    “{fb.message}”
                  </div>
                )}

                {/* EXPANDED FULL OPERATIONAL PANEL */}
                {isExpanded && (
                  <div className="flex flex-col gap-6 pt-2 animate-fade-in">
                    {/* PANEL 1: USER ACCOUNT FULL INFO */}
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Müşteri No & Ad</span>
                        <span className="font-bold text-white">{fb.formattedCustomerIdentity}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Kullanıcı Adı</span>
                        <span className="font-mono text-orange-300">@{fb.user?.username || "yok"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">E-Posta Adresi</span>
                        <div className="flex items-center gap-1.5 font-mono text-slate-300">
                          <span>{isEmailUnmasked ? fb.user?.email : maskEmail(fb.user?.email)}</span>
                          <button
                            type="button"
                            onClick={() => toggleEmailMask(fb.id)}
                            className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
                            title={isEmailUnmasked ? "Gizle" : "Göster"}
                          >
                            {isEmailUnmasked ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Paket Seviyesi</span>
                        <span className="font-bold text-emerald-400">{fb.user?.subscriptionTier || "FREE"}</span>
                      </div>
                    </div>

                    {/* PANEL 2: LIVE REAL-TIME RESTRICTION CONTEXT BOX */}
                    {restriction ? (
                      <div
                        className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          restriction.isActive
                            ? "bg-rose-950/30 border-rose-500/40"
                            : "bg-slate-950/80 border-white/10"
                        }`}
                      >
                        <div className="flex flex-col gap-1 text-xs">
                          <div className="flex items-center gap-2 font-black">
                            <span className="text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                              <ShieldAlert className="w-4 h-4 text-rose-400" />
                              Bağlı Kısıtlama Kaydı ({restriction.type})
                            </span>
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                restriction.isActive
                                  ? "bg-rose-500 text-white"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {restriction.displayStatus}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-slate-300 mt-2">
                            <div>
                              <strong className="text-slate-400">Sebep:</strong> {restriction.reason}
                            </div>
                            <div>
                              <strong className="text-slate-400">Uygulayan:</strong> {restriction.createdBy}
                            </div>
                            <div>
                              <strong className="text-slate-400">Kalan Süre:</strong> {restriction.remainingText}
                            </div>
                            {restriction.startsAt && (
                              <div>
                                <strong className="text-slate-400">Başlangıç:</strong>{" "}
                                {new Date(restriction.startsAt).toLocaleString("tr-TR")}
                              </div>
                            )}
                            {restriction.expiresAt && (
                              <div>
                                <strong className="text-slate-400">Bitiş:</strong>{" "}
                                {new Date(restriction.expiresAt).toLocaleString("tr-TR")}
                              </div>
                            )}
                            {restriction.revokedAt && (
                              <div>
                                <strong className="text-slate-400">Kaldırılma:</strong>{" "}
                                {new Date(restriction.revokedAt).toLocaleString("tr-TR")}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Operational Restriction Revocation Button */}
                        {restriction.isActive && (
                          <button
                            type="button"
                            disabled={actionLoadingId === fb.id}
                            onClick={() => handleRevokeRestriction(fb.id, restriction.id)}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-emerald-500/20 transition shrink-0 flex items-center gap-2 cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span>Susturmayı/Yasağı Kaldır & Kullanıcıya Gönder</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-white/5 text-xs text-slate-400 italic">
                        ✓ Kullanıcının aktif Club kısıtlaması (Mute/Ban) bulunmamaktadır.
                      </div>
                    )}

                    {/* PANEL: LISTING REPORT SNAPSHOT & ACTIONS */}
                    {fb.source === "LISTING_REPORT" && (
                      <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🚨</span>
                            <span className="text-xs font-black text-rose-400 uppercase tracking-wider">
                              Şikâyet Edilen İlan (Snapshot Korumalı Kayıt)
                            </span>
                          </div>
                          <span className="font-mono text-xs font-bold text-slate-200 bg-slate-900 border border-white/10 px-3 py-1 rounded-xl">
                            İlan No: {fb.listingNoSnapshot || fb.listingId?.substring(0, 8).toUpperCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">İlan Başlığı (Snapshot)</span>
                            <span className="font-bold text-slate-100 text-sm">{fb.listingTitleSnapshot || "Başlık Yok"}</span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">İlan Sahibi Kodu (Snapshot)</span>
                            <span className="font-mono font-bold text-orange-400">{fb.listingOwnerReferenceSnapshot || "Belirtilmedi"}</span>
                          </div>
                        </div>

                        {/* Direct Action Buttons for Controlled Messaging */}
                        <div className="flex items-center gap-3 pt-2 border-t border-white/10 flex-wrap">
                          <button
                            type="button"
                            onClick={() =>
                              setCommDialogState({
                                isOpen: true,
                                feedbackId: fb.id,
                                recipient: "REPORTER",
                                recipientDisplayName: fb.formattedName,
                                recipientCustomerNo: fb.formattedCustomerIdentity.split(" — ")[0],
                                recipientEmail: fb.user?.email,
                              })
                            }
                            className="px-4 py-2 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-300 font-bold text-xs transition flex items-center gap-2 cursor-pointer"
                          >
                            <span>💬 Şikâyet Edene Mesaj Gönder</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setCommDialogState({
                                isOpen: true,
                                feedbackId: fb.id,
                                recipient: "LISTING_OWNER",
                                recipientDisplayName: fb.listingOwnerInfo?.displayName || "İlan Sahibi",
                                recipientCustomerNo: fb.listingOwnerReferenceSnapshot || fb.listingOwnerInfo?.customerNo,
                                recipientEmail: fb.listingOwnerInfo?.email,
                              })
                            }
                            className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 font-bold text-xs transition flex items-center gap-2 cursor-pointer"
                          >
                            <span>💬 İlan Sahibine Mesaj Gönder (Gizlilik Korumalı)</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* PANEL 3: FULL USER MESSAGE & ATTACHMENT */}
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        💬 Kullanıcının Mesajı:
                      </span>
                      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-white/10 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {fb.message}
                      </div>

                      {fb.attachmentUrl && (
                        <div className="mt-2 flex flex-col gap-1.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Ekran Görüntüsü</span>
                          <a
                            href={fb.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block max-w-[240px] rounded-xl border border-white/10 overflow-hidden hover:border-orange-500 transition"
                          >
                            <img src={fb.attachmentUrl} alt="Screenshot" className="w-full h-auto object-cover" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* PANEL 4: INTERNAL ADMIN NOTE (Visible Only to Admins) */}
                    <div className="p-4 rounded-2xl bg-slate-950/90 border border-amber-500/20 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5" />
                          İç Admin Notu (Yalnızca Yöneticiler Görür)
                        </span>
                        <span className="text-[10px] text-slate-500 italic">Kullanıcıya gösterilmez</span>
                      </div>
                      <textarea
                        rows={2}
                        value={internalNotes[fb.id] || ""}
                        onChange={(e) => setInternalNotes({ ...internalNotes, [fb.id]: e.target.value })}
                        placeholder="Yöneticiler için iç inceleme notu (Örn: Kullanıcı ilk defa itiraz etti, kurallar hatırlatıldı)..."
                        className="w-full p-3 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveInternalNote(fb.id)}
                        disabled={actionLoadingId === fb.id}
                        className="self-end px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>İç Notu Kaydet</span>
                      </button>
                    </div>

                    {/* PANEL 5: OFFICIAL USER RESPONSE & NOTIFICATION */}
                    <div className="p-4 rounded-2xl bg-slate-950/90 border border-orange-500/20 flex flex-col gap-3">
                      <span className="text-xs font-black text-orange-400 uppercase tracking-wider flex items-center gap-2">
                        <Send className="w-3.5 h-3.5" />
                        Kullanıcıya Resmi Yanıt Gönder
                      </span>
                      <textarea
                        rows={3}
                        value={userResponses[fb.id] || ""}
                        onChange={(e) => setUserResponses({ ...userResponses, [fb.id]: e.target.value })}
                        placeholder="Kullanıcıya iletilecek bildirim ve mesaj açıklamasını yazın..."
                        className="w-full p-3 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        {fb.userResponseSentAt && (
                          <span className="text-[10px] text-emerald-400 font-semibold">
                            ✓ Yanıt gönderildi ({new Date(fb.userResponseSentAt).toLocaleString("tr-TR")} - {fb.userResponseSentBy})
                          </span>
                        )}

                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            type="button"
                            disabled={actionLoadingId === fb.id}
                            onClick={() => handleSendUserResponse(fb.id, "IN_APP", "ACTION_TAKEN")}
                            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Mesaj Olarak Gönder</span>
                          </button>

                          <button
                            type="button"
                            disabled={actionLoadingId === fb.id}
                            onClick={() => handleSendUserResponse(fb.id, "BOTH", "RESOLVED")}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Mesaj + E-Posta & Çözüldü</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* PANEL 6: AUDIT TIMELINE */}
                    {fb.auditTimeline && Array.isArray(fb.auditTimeline) && fb.auditTimeline.length > 0 && (
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col gap-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          İşlem ve İnceleme Geçmişi (Audit Timeline)
                        </span>

                        <div className="space-y-2 pl-2 border-l border-white/10">
                          {fb.auditTimeline.map((item: any, idx: number) => (
                            <div key={idx} className="flex flex-col text-[11px] text-slate-300 leading-tight">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-orange-300">{item.actorName}</span>
                                <span>•</span>
                                <span className="text-slate-400">{item.action}</span>
                                <span>•</span>
                                <span className="text-slate-500 font-mono">
                                  {new Date(item.timestamp).toLocaleString("tr-TR")}
                                </span>
                              </div>
                              {item.note && <span className="text-slate-400 italic text-[10px] mt-0.5">{item.note}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PANEL 7: QUICK OPERATIONAL STATUS UPDATES */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={actionLoadingId === fb.id}
                          onClick={() => handleUpdateFeedback(fb.id, { status: "ASSIGNED" })}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-white/10 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                          <span>Kendime Ata</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {/* Status Select */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Durum:</span>
                          <select
                            value={fb.status}
                            onChange={(e) => handleUpdateFeedback(fb.id, { status: e.target.value })}
                            disabled={actionLoadingId === fb.id}
                            className="bg-[#05070f] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition cursor-pointer"
                          >
                            {Object.entries(FEEDBACK_STATUS_LABELS).map(([val, lbl]) => (
                              <option key={val} value={val} className="bg-[#090d1a]">
                                {lbl}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Priority Select */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Öncelik:</span>
                          <select
                            value={fb.priority}
                            onChange={(e) => handleUpdateFeedback(fb.id, { priority: e.target.value })}
                            disabled={actionLoadingId === fb.id}
                            className="bg-[#05070f] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition cursor-pointer"
                          >
                            {Object.entries(FEEDBACK_PRIORITY_LABELS).map(([val, lbl]) => (
                              <option key={val} value={val} className="bg-[#090d1a]">
                                {lbl}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Archive Button */}
                        {fb.status !== "ARCHIVED" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateFeedback(fb.id, { status: "ARCHIVED" })}
                            disabled={actionLoadingId === fb.id}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-slate-300 hover:text-rose-400 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            <span>Arşivle</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Communication Dialog */}
      {commDialogState && (
        <AdminUserCommunicationDialog
          isOpen={commDialogState.isOpen}
          onClose={() => setCommDialogState(null)}
          feedbackId={commDialogState.feedbackId}
          recipient={commDialogState.recipient}
          recipientDisplayName={commDialogState.recipientDisplayName}
          recipientCustomerNo={commDialogState.recipientCustomerNo}
          recipientEmail={commDialogState.recipientEmail}
          token={token}
          onSuccess={() => fetchFeedbacks()}
        />
      )}
    </div>
  );
}
