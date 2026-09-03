"use client";

import React, { useState, useEffect } from "react";
import {
  CircleDollarSign,
  TrendingUp,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  History,
  X,
  RefreshCw,
  Sparkles,
  Users,
  Zap,
  ArrowRight,
  Info,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/apiConfig";

interface SubscriptionPlanItem {
  id: string;
  tier: string;
  name: string;
  priceTrl: number;
  priceUsd: number;
  limits: any;
  totalActiveSubscribers: number;
  renewingSubscribersCount: number;
  lifetimeGrantCount: number;
  updatedAt: string;
}

interface BuyerPackageItem {
  id: string;
  code: string;
  name: string;
  badge: string;
  priceTrl: number;
  currency: string;
  isActive: boolean;
  limits: {
    aiReportLimit: number;
    chatbotMessageLimit: number;
    validityDays: number;
  } | null;
  description: string;
  popularTag: string | null;
  updatedAt: string;
}

interface PriceHistoryItem {
  id: string;
  packageGroup: string;
  packageCode: string;
  packageName: string;
  oldPrice: number;
  newPrice: number;
  currency: string;
  adminUserId: string;
  adminEmail: string;
  reason: string | null;
  affectedSubscribersCount: number;
  createdAt: string;
}

function getAuthToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("accessToken") || localStorage.getItem("adminToken") || "";
}

export default function AdminPricingPage() {
  const [activeTab, setActiveTab] = useState<"SUBSCRIPTIONS" | "BUYER_PACKAGES">("SUBSCRIPTIONS");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<SubscriptionPlanItem[]>([]);
  const [buyerPackages, setBuyerPackages] = useState<BuyerPackageItem[]>([]);
  const [recentHistory, setRecentHistory] = useState<PriceHistoryItem[]>([]);

  // Edit Modal State
  const [editingTarget, setEditingTarget] = useState<{
    group: "SUBSCRIPTION" | "BUYER_PACKAGE";
    code: string;
    name: string;
    currentPrice: number;
    currency: string;
    renewingSubscribersCount?: number;
    lifetimeGrantCount?: number;
  } | null>(null);

  const [newPriceInput, setNewPriceInput] = useState<string>("");
  const [priceChangeReason, setPriceChangeReason] = useState<string>("");
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // History Drawer State
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [fullHistory, setFullHistory] = useState<PriceHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchOverview = async () => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_BASE_URL}/admin/pricing/overview`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions || []);
        setBuyerPackages(data.buyerPackages || []);
        setRecentHistory(data.recentHistory || []);
      }
    } catch (err) {
      console.error("Failed to fetch pricing overview", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFullHistory = async () => {
    setLoadingHistory(true);
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_BASE_URL}/admin/pricing/history?limit=100`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setFullHistory(data.history || []);
      }
    } catch (err) {
      console.error("Failed to fetch price history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleOpenEditModal = (
    group: "SUBSCRIPTION" | "BUYER_PACKAGE",
    item: SubscriptionPlanItem | BuyerPackageItem
  ) => {
    setFeedbackMessage(null);
    setConfirmStep(1);
    setPriceChangeReason("");

    if (group === "SUBSCRIPTION") {
      const sub = item as SubscriptionPlanItem;
      setEditingTarget({
        group: "SUBSCRIPTION",
        code: sub.tier,
        name: sub.name,
        currentPrice: sub.priceTrl,
        currency: "TRY",
        renewingSubscribersCount: sub.renewingSubscribersCount,
        lifetimeGrantCount: sub.lifetimeGrantCount,
      });
      setNewPriceInput(sub.priceTrl.toString());
    } else {
      const bp = item as BuyerPackageItem;
      setEditingTarget({
        group: "BUYER_PACKAGE",
        code: bp.code,
        name: bp.name,
        currentPrice: bp.priceTrl,
        currency: bp.currency || "TRY",
      });
      setNewPriceInput(bp.priceTrl.toString());
    }
  };

  const handleProceedToStep2 = () => {
    const num = Number(newPriceInput);
    if (isNaN(num) || num < 0) {
      setFeedbackMessage({ type: "error", text: "Lütfen geçerli, pozitif bir fiyat giriniz." });
      return;
    }
    if (num === editingTarget?.currentPrice) {
      setFeedbackMessage({ type: "error", text: "Yeni fiyat mevcut fiyatla aynı olamaz." });
      return;
    }
    setFeedbackMessage(null);
    setConfirmStep(2);
  };

  const handleExecutePriceUpdate = async () => {
    if (!editingTarget) return;
    const num = Number(newPriceInput);
    const token = getAuthToken();
    setSubmitting(true);
    setFeedbackMessage(null);

    try {
      const endpoint =
        editingTarget.group === "SUBSCRIPTION"
          ? `${API_BASE_URL}/admin/pricing/subscription/${editingTarget.code}`
          : `${API_BASE_URL}/admin/pricing/buyer-package/${editingTarget.code}`;

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          newPrice: num,
          reason: priceChangeReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedbackMessage({
          type: "success",
          text: data.message || "Fiyat başarıyla güncellendi.",
        });
        setTimeout(() => {
          setEditingTarget(null);
          fetchOverview();
        }, 1200);
      } else {
        setFeedbackMessage({
          type: "error",
          text: data.message || "Fiyat güncellenirken bir hata oluştu.",
        });
      }
    } catch (err) {
      setFeedbackMessage({ type: "error", text: "Bağlantı hatası oluştu." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-white">Paket Fiyatları Yönetim Merkezi</h1>
        <p className="text-xs text-slate-400">Canlı abonelik ve alıcı paketlerinin dinamik fiyatlarını güvenle yönetin.</p>
      </div>
        {/* Top KPI Metrics Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
              <CircleDollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Abonelik Paketleri</div>
              <div className="text-xl font-black text-white">{subscriptions.length} Plan</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aktif Ücretli Aboneler</div>
              <div className="text-xl font-black text-white">
                {subscriptions.reduce((acc, curr) => acc + curr.renewingSubscribersCount, 0)} Abone
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Alıcı Paketleri</div>
              <div className="text-xl font-black text-white">{buyerPackages.length} Ürün</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
              <History className="w-5 h-5" />
            </div>
            <div className="flex-1 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fiyat Denetim Kaydı</div>
                <div className="text-xl font-black text-white">{recentHistory.length} İşlem</div>
              </div>
              <button
                onClick={() => {
                  fetchFullHistory();
                  setHistoryDrawerOpen(true);
                }}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
              >
                Geçmiş ➔
              </button>
            </div>
          </div>
        </div>

        {/* Action Header & Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900 border border-white/10">
            <button
              onClick={() => setActiveTab("SUBSCRIPTIONS")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === "SUBSCRIPTIONS"
                  ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              ABONELİK PAKETLERİ ({subscriptions.length})
            </button>
            <button
              onClick={() => setActiveTab("BUYER_PACKAGES")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === "BUYER_PACKAGES"
                  ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="w-4 h-4" />
              ALICI PAKETLERİ ({buyerPackages.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setRefreshing(true);
                fetchOverview();
              }}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Yenile
            </button>
          </div>
        </div>

        {/* TAB 1: SUBSCRIPTION PLANS */}
        {activeTab === "SUBSCRIPTIONS" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-orange-950/20 border border-orange-500/20 text-xs text-orange-200 flex items-start gap-3">
              <Info className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-orange-300">Kilitli Finans Politikası: </span>
                Fiyat değişikliği yapıldığında mevcut abonelerin içinde bulunduğu aktif dönem <strong>DEĞİŞMEZ</strong>. Yeni fiyat, henüz faturası çıkmamış bir sonraki yenilemede ve anında yeni satın almalarda uygulanır.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-3xl bg-slate-900/90 border border-white/10 p-6 flex flex-col justify-between relative hover:border-white/20 transition-all shadow-xl"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                          {sub.tier}
                        </span>
                        <h3 className="text-xl font-black text-white mt-2">{sub.name}</h3>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-orange-400 font-mono">
                          {sub.priceTrl === 0 ? "Ücretsiz" : `₺${sub.priceTrl}`}
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold">/ aylık</div>
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-400" /> Ücretli Yenilenecek Abone:
                        </span>
                        <span className="font-bold font-mono text-emerald-400">{sub.renewingSubscribersCount}</span>
                      </div>
                      {sub.lifetimeGrantCount > 0 && (
                        <div className="flex items-center justify-between text-slate-400 text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3 h-3 text-amber-400" /> Yönetici / Lifetime Tanımlı:
                          </span>
                          <span className="font-mono text-amber-400">{sub.lifetimeGrantCount}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" /> Son Güncelleme:
                        </span>
                        <span className="font-mono">{new Date(sub.updatedAt).toLocaleDateString("tr-TR")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={() => handleOpenEditModal("SUBSCRIPTION", sub)}
                      className="w-full py-3 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Fiyatı Düzenle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: BUYER PACKAGES */}
        {activeTab === "BUYER_PACKAGES" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/20 text-xs text-blue-200 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-blue-300">Tek Seferlik Alıcı Paketleri: </span>
                Fiyat değiştirildiğinde yeni satın almalar anında yeni fiyattan açılır. Daha önce satın alınmış ek hakların geçmiş ödeme kayıtları immutable olarak korunur.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {buyerPackages.map((bp) => (
                <div
                  key={bp.id}
                  className="rounded-3xl bg-slate-900/90 border border-white/10 p-6 flex flex-col justify-between relative hover:border-white/20 transition-all shadow-xl"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-md border border-orange-500/20">
                          {bp.badge}
                        </span>
                        <h3 className="text-xl font-black text-white mt-2">{bp.name}</h3>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-orange-400 font-mono">
                          ₺{bp.priceTrl}
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold">Tek Seferlik</div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">{bp.description}</p>

                    {bp.limits && (
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1.5 text-xs text-slate-300">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">AI Rapor Hakkı:</span>
                          <span className="font-bold text-white">+{bp.limits.aiReportLimit} Rapor</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Chatbot Soru:</span>
                          <span className="font-bold text-white">+{bp.limits.chatbotMessageLimit} Soru</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Geçerlilik:</span>
                          <span className="font-bold text-white">{bp.limits.validityDays} Gün</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={() => handleOpenEditModal("BUYER_PACKAGE", bp)}
                      className="w-full py-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Fiyatı Düzenle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2-STEP SECURE CONFIRMATION MODAL */}
        {editingTarget && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                    {editingTarget.group === "SUBSCRIPTION" ? "Abonelik Fiyatı Düzenleme" : "Alıcı Paketi Fiyatı Düzenleme"}
                  </div>
                  <h3 className="text-xl font-black text-white mt-1">{editingTarget.name}</h3>
                </div>
                <button
                  onClick={() => setEditingTarget(null)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* STEP 1: Enter New Price */}
              {confirmStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Mevcut Fiyat</div>
                      <div className="text-2xl font-black text-slate-300 mt-1 font-mono">
                        ₺{editingTarget.currentPrice}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30">
                      <div className="text-[10px] text-orange-400 font-bold uppercase">Yeni Fiyat (TL)</div>
                      <input
                        type="number"
                        min="0"
                        value={newPriceInput}
                        onChange={(e) => setNewPriceInput(e.target.value)}
                        className="w-full bg-transparent text-2xl font-black text-white mt-1 font-mono outline-none"
                        placeholder="Örn: 599"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Değişiklik Gerekçesi (Opsiyonel Denetim Notu):
                    </label>
                    <input
                      type="text"
                      value={priceChangeReason}
                      onChange={(e) => setPriceChangeReason(e.target.value)}
                      placeholder="Örn: 2026 Q3 Fiyat Güncellemesi"
                      className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-xs text-white placeholder-slate-500 outline-none focus:border-orange-500"
                    />
                  </div>

                  {editingTarget.group === "SUBSCRIPTION" && (
                    <div className="p-3.5 rounded-xl bg-slate-800/80 border border-white/5 text-xs text-slate-300 space-y-1">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" /> Finansal Güvenlik Hatırlatması:
                      </div>
                      <div className="text-slate-400 leading-relaxed text-[11px]">
                        • Yeni satın almalarda hemen uygulanır.<br />
                        • Mevcut abonelerin aktif fatura dönemi <strong>değişmez</strong>.<br />
                        • Yeni fiyat mevcut abonelerin bir sonraki yenilemesinde uygulanır.
                      </div>
                    </div>
                  )}

                  {feedbackMessage && (
                    <div
                      className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                        feedbackMessage.type === "success"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {feedbackMessage.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      {feedbackMessage.text}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingTarget(null)}
                      className="flex-1 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                    >
                      İptal
                    </button>
                    <button
                      type="button"
                      onClick={handleProceedToStep2}
                      className="flex-1 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-orange-600/30"
                    >
                      İlerle <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Strict Double Confirmation */}
              {confirmStep === 2 && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                    <div className="font-black text-amber-300 flex items-center gap-1.5 text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-400" /> Fiyat Güncellemesini Onaylayın
                    </div>
                    <p className="leading-relaxed">
                      <strong>{editingTarget.name}</strong> paketinin fiyatını <strong>₺{editingTarget.currentPrice}</strong> → <span className="text-white font-black underline">₺{newPriceInput}</span> olarak değiştirmek üzeresiniz.
                    </p>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300 p-4 rounded-2xl bg-slate-800/80 border border-white/5">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <span className="text-slate-400">Yeni Satın Almalar:</span>
                      <span className="font-bold text-emerald-400 font-mono">₺{newPriceInput} (Anında)</span>
                    </div>
                    {editingTarget.group === "SUBSCRIPTION" && (
                      <>
                        <div className="flex items-center justify-between py-1 border-b border-white/5">
                          <span className="text-slate-400">Mevcut Aktif Dönemler:</span>
                          <span className="font-bold text-slate-200">DEĞİŞMEYECEK</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-white/5">
                          <span className="text-slate-400">Sonraki Yenilemeler:</span>
                          <span className="font-bold text-orange-400 font-mono">₺{newPriceInput}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-slate-400">Etkilenecek Ücretli Yenileme:</span>
                          <span className="font-bold font-mono text-white">
                            {editingTarget.renewingSubscribersCount || 0} Abone
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {feedbackMessage && (
                    <div
                      className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                        feedbackMessage.type === "success"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {feedbackMessage.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      {feedbackMessage.text}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setConfirmStep(1)}
                      className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                    >
                      Geri
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleExecutePriceUpdate}
                      className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-orange-600/30 disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> İşleniyor...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Fiyatı Kesin Olarak Güncelle
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FULL AUDIT HISTORY DRAWER */}
        {historyDrawerOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
            <div className="bg-slate-900 border-l border-white/10 w-full max-w-xl h-full p-6 sm:p-8 flex flex-col justify-between overflow-y-auto space-y-6">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2.5">
                    <History className="w-5 h-5 text-orange-400" />
                    <div>
                      <h3 className="text-lg font-black text-white">Fiyat Değişiklik Geçmişi</h3>
                      <p className="text-xs text-slate-400">Tüm finansal paket fiyat güncellemelerinin denetim kaydı.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setHistoryDrawerOpen(false)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-6 space-y-4">
                  {loadingHistory ? (
                    <div className="py-12 text-center text-xs text-slate-400">Yükleniyor...</div>
                  ) : fullHistory.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">Henüz fiyat değişikliği kaydı bulunmuyor.</div>
                  ) : (
                    fullHistory.map((h) => (
                      <div
                        key={h.id}
                        className="p-4 rounded-2xl bg-slate-800/60 border border-white/5 space-y-2 hover:border-white/15 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                            {h.packageCode}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {new Date(h.createdAt).toLocaleString("tr-TR")}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-slate-400 line-through">₺{h.oldPrice}</span>
                          <span className="text-base font-black text-white font-mono">➔ ₺{h.newPrice}</span>
                        </div>

                        {h.reason && (
                          <div className="text-xs text-slate-300 italic">
                            &ldquo;{h.reason}&rdquo;
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-400">
                          <span>Yönetici: <strong className="text-slate-300">{h.adminEmail}</strong></span>
                          {h.packageGroup === "SUBSCRIPTION" && (
                            <span>Etkilenen Yenileme: <strong className="text-orange-400">{h.affectedSubscribersCount}</strong></span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <button
                  onClick={() => setHistoryDrawerOpen(false)}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
