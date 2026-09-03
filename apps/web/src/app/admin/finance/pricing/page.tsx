"use client";

import React, { useState, useEffect } from "react";
import {
  CircleDollarSign,
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
  Check,
  Lock,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/apiConfig";

interface SubscriptionLimits {
  aiReports: number;
  aiChat: number;
  activeListings: number;
  listingDurationDays: number;
  comparisons: number;
  maxVehiclesPerComparison: number;
  vitrinListings?: number;
}

interface SubscriptionPlanItem {
  id: string;
  tier: "TANISMA" | "YETKIN" | "PROFESYONEL" | string;
  name: string;
  priceTrl: number;
  priceUsd: number;
  limits: SubscriptionLimits;
  totalActiveSubscribers: number;
  renewingSubscribersCount: number;
  lifetimeGrantCount: number;
  updatedAt: string;
}

interface BuyerPackageLimits {
  aiReportLimit: number;
  chatbotMessageLimit: number;
  validityDays: number;
}

interface BuyerPackageItem {
  id: string;
  code: string;
  name: string;
  badge: string;
  priceTrl: number;
  currency: string;
  isActive: boolean;
  limits: BuyerPackageLimits;
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
  oldLimits?: any;
  newLimits?: any;
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

  // Subscription Edit Modal State
  const [editingSubTarget, setEditingSubTarget] = useState<{
    tier: string;
    name: string;
    currentPrice: number;
    limits: SubscriptionLimits;
    renewingSubscribersCount: number;
    lifetimeGrantCount: number;
  } | null>(null);

  // Buyer Package Edit Modal State
  const [editingBuyerTarget, setEditingBuyerTarget] = useState<{
    code: string;
    name: string;
    currentPrice: number;
    limits: BuyerPackageLimits;
  } | null>(null);

  // Form States
  const [newPriceInput, setNewPriceInput] = useState<string>("");
  const [editLimits, setEditLimits] = useState<SubscriptionLimits>({
    aiReports: 1,
    aiChat: 3,
    activeListings: 1,
    listingDurationDays: 30,
    comparisons: 3,
    maxVehiclesPerComparison: 2,
    vitrinListings: 0,
  });
  const [editBuyerLimits, setEditBuyerLimits] = useState<BuyerPackageLimits>({
    aiReportLimit: 5,
    chatbotMessageLimit: 15,
    validityDays: 30,
  });

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

  const handleOpenSubModal = (sub: SubscriptionPlanItem) => {
    setFeedbackMessage(null);
    setConfirmStep(1);
    setPriceChangeReason("");
    setEditingSubTarget({
      tier: sub.tier,
      name: sub.name,
      currentPrice: sub.priceTrl,
      limits: sub.limits,
      renewingSubscribersCount: sub.renewingSubscribersCount,
      lifetimeGrantCount: sub.lifetimeGrantCount,
    });
    setNewPriceInput(sub.priceTrl.toString());
    setEditLimits({
      aiReports: sub.limits?.aiReports ?? (sub.tier === "PROFESYONEL" ? 20 : sub.tier === "YETKIN" ? 5 : 1),
      aiChat: sub.limits?.aiChat ?? (sub.tier === "PROFESYONEL" ? 150 : sub.tier === "YETKIN" ? 50 : 3),
      activeListings: sub.limits?.activeListings ?? (sub.tier === "PROFESYONEL" ? 15 : sub.tier === "YETKIN" ? 5 : 1),
      listingDurationDays: sub.limits?.listingDurationDays ?? (sub.tier === "PROFESYONEL" ? 45 : 30),
      comparisons: sub.limits?.comparisons ?? (sub.tier === "PROFESYONEL" ? 50 : sub.tier === "YETKIN" ? 20 : 3),
      maxVehiclesPerComparison: sub.limits?.maxVehiclesPerComparison ?? (sub.tier === "PROFESYONEL" ? 10 : sub.tier === "YETKIN" ? 5 : 2),
      vitrinListings: sub.limits?.vitrinListings ?? (sub.tier === "PROFESYONEL" ? 3 : sub.tier === "YETKIN" ? 1 : 0),
    });
  };

  const handleOpenBuyerModal = (bp: BuyerPackageItem) => {
    setFeedbackMessage(null);
    setConfirmStep(1);
    setPriceChangeReason("");
    setEditingBuyerTarget({
      code: bp.code,
      name: bp.name,
      currentPrice: bp.priceTrl,
      limits: bp.limits,
    });
    setNewPriceInput(bp.priceTrl.toString());
    setEditBuyerLimits({
      aiReportLimit: bp.limits?.aiReportLimit ?? (bp.code === "ALICI_MAX" ? 20 : bp.code === "ALICI_PLUS" ? 10 : 5),
      chatbotMessageLimit: bp.limits?.chatbotMessageLimit ?? (bp.code === "ALICI_MAX" ? 60 : bp.code === "ALICI_PLUS" ? 30 : 15),
      validityDays: bp.limits?.validityDays ?? (bp.code === "ALICI_MAX" ? 60 : 30),
    });
  };

  const handleProceedToStep2 = () => {
    const num = Number(newPriceInput);
    if (isNaN(num) || num < 0) {
      setFeedbackMessage({ type: "error", text: "Lütfen geçerli, pozitif bir fiyat giriniz." });
      return;
    }
    setFeedbackMessage(null);
    setConfirmStep(2);
  };

  const handleExecuteSubUpdate = async () => {
    if (!editingSubTarget) return;
    const num = Number(newPriceInput);
    const token = getAuthToken();
    setSubmitting(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/pricing/subscription/${editingSubTarget.tier}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          newPrice: num,
          limits: editLimits,
          reason: priceChangeReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedbackMessage({
          type: "success",
          text: data.message || "Abonelik paketi başarıyla güncellendi.",
        });
        setTimeout(() => {
          setEditingSubTarget(null);
          fetchOverview();
        }, 1200);
      } else {
        setFeedbackMessage({
          type: "error",
          text: data.message || "Güncelleme sırasında bir hata oluştu.",
        });
      }
    } catch (err) {
      setFeedbackMessage({ type: "error", text: "Bağlantı hatası oluştu." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteBuyerUpdate = async () => {
    if (!editingBuyerTarget) return;
    const num = Number(newPriceInput);
    const token = getAuthToken();
    setSubmitting(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/pricing/buyer-package/${editingBuyerTarget.code}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          newPrice: num,
          limits: editBuyerLimits,
          reason: priceChangeReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedbackMessage({
          type: "success",
          text: data.message || "Alıcı paketi başarıyla güncellendi.",
        });
        setTimeout(() => {
          setEditingBuyerTarget(null);
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
        <h1 className="text-2xl font-black text-white">Paket Fiyatları ve Hakları Yönetim Merkezi</h1>
        <p className="text-xs text-slate-400">Canlı abonelik ve alıcı paketlerinin fiyat ve sayısal haklarını tek merkezden yönetin.</p>
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
              {subscriptions.reduce((acc, curr) => acc + (curr.renewingSubscribersCount || 0), 0)} Abone
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
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Denetim Kaydı</div>
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

      {/* TAB 1: EXACT 3 SUBSCRIPTION PLANS */}
      {activeTab === "SUBSCRIPTIONS" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-orange-950/20 border border-orange-500/20 text-xs text-orange-200 flex items-start gap-3">
            <Info className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-orange-300">Kilitli Kurallar: </span>
              Admin yalnızca fiyat ve sayısal hakları yönetebilir; sabit metinler değiştirilemez. Değişiklikler yeni satın almalarda anında, mevcut abonelerde ise bir sonraki yenilemede geçerli olur.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {subscriptions.map((sub) => {
              const l = sub.limits || ({} as any);
              const isTanisma = sub.tier === "TANISMA";
              const isYetkin = sub.tier === "YETKIN";
              const isPro = sub.tier === "PROFESYONEL";

              return (
                <div
                  key={sub.id}
                  className={`rounded-3xl p-6 flex flex-col justify-between relative transition-all shadow-xl ${
                    isYetkin
                      ? "bg-slate-900 border-2 border-orange-500/50 shadow-orange-500/10"
                      : "bg-slate-900/90 border border-white/10 hover:border-white/20"
                  }`}
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

                    {/* Numeric & Dynamic Features Grid */}
                    <div className="border-t border-white/5 pt-4 space-y-2 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 font-bold shrink-0" />
                        <span>Ayda <strong className="text-white font-mono">{l.aiReports ?? (isPro ? 20 : isYetkin ? 5 : 1)}</strong> AI araç raporu</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 font-bold shrink-0" />
                        <span>Ayda <strong className="text-white font-mono">{l.aiChat ?? (isPro ? 150 : isYetkin ? 50 : 3)}</strong> chatbot mesajı</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 font-bold shrink-0" />
                        <span><strong className="text-white font-mono">{l.activeListings ?? (isPro ? 15 : isYetkin ? 5 : 1)}</strong> aktif ilan</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 font-bold shrink-0" />
                        <span><strong className="text-white font-mono">{l.listingDurationDays ?? (isPro ? 45 : 30)}</strong> gün ilan yayın süresi</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 font-bold shrink-0" />
                        <span>Ayda <strong className="text-white font-mono">{l.comparisons ?? (isPro ? 50 : isYetkin ? 20 : 3)}</strong> karşılaştırma</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 font-bold shrink-0" />
                        <span>Karşılaştırma başına <strong className="text-white font-mono">{l.maxVehiclesPerComparison ?? (isPro ? 10 : isYetkin ? 5 : 2)}</strong> araç</span>
                      </div>

                      {(isYetkin || isPro) && (
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-orange-400 font-bold shrink-0" />
                          <span>Ayda <strong className="text-white font-mono">{l.vitrinListings ?? (isPro ? 3 : 1)}</strong> vitrin ilanı</span>
                        </div>
                      )}

                      {/* Fixed Unchangeable Features */}
                      {(isYetkin || isPro) && (
                        <div className="pt-2 border-t border-white/5 space-y-1.5 text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>Her raporda satıcıya sorulacak sorular</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>Her raporda ekspertiz kontrol listesi</span>
                          </div>
                        </div>
                      )}

                      {isPro && (
                        <div className="space-y-1.5 text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>Kurumsal satıcı profili</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>Öncelikli destek</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>Çoklu kullanıcı ve ekip erişimi</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-white/5 pt-3 space-y-1.5 text-[11px] text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>Ücretli Yenilenecek Abone:</span>
                        <strong className="text-emerald-400 font-mono">{sub.renewingSubscribersCount || 0}</strong>
                      </div>
                      {sub.lifetimeGrantCount > 0 && (
                        <div className="flex items-center justify-between">
                          <span>Yönetici / Lifetime:</span>
                          <strong className="text-amber-400 font-mono">{sub.lifetimeGrantCount}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={() => handleOpenSubModal(sub)}
                      className="w-full py-3 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Fiyatı ve Hakları Düzenle
                    </button>
                  </div>
                </div>
              );
            })}
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
              Fiyat veya hak değişikliği yapıldığında yeni satın almalarda anında geçerli olur. Daha önce satın almış kullanıcıların hakları (snapshot) korunur.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {buyerPackages.map((bp) => {
              const l = bp.limits || ({} as any);
              return (
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

                    <div className="border-t border-white/5 pt-4 space-y-2 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-blue-400 font-bold shrink-0" />
                        <span><strong className="text-white font-mono">{l.aiReportLimit ?? (bp.code === "ALICI_MAX" ? 20 : bp.code === "ALICI_PLUS" ? 10 : 5)}</strong> AI araç raporu</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-blue-400 font-bold shrink-0" />
                        <span><strong className="text-white font-mono">{l.chatbotMessageLimit ?? (bp.code === "ALICI_MAX" ? 60 : bp.code === "ALICI_PLUS" ? 30 : 15)}</strong> chatbot mesajı</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-blue-400 font-bold shrink-0" />
                        <span><strong className="text-white font-mono">{l.validityDays ?? (bp.code === "ALICI_MAX" ? 60 : 30)}</strong> gün kullanım süresi</span>
                      </div>
                      <div className="pt-2 border-t border-white/5 space-y-1.5 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>Her raporda satıcıya sorulacak sorular</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>Her raporda ekspertiz kontrol listesi</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={() => handleOpenBuyerModal(bp)}
                      className="w-full py-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Fiyatı ve Hakları Düzenle
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EDIT SUBSCRIPTION MODAL */}
      {editingSubTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                  Abonelik Fiyatı ve Hakları Düzenleme
                </div>
                <h3 className="text-xl font-black text-white mt-1">{editingSubTarget.name}</h3>
              </div>
              <button
                onClick={() => setEditingSubTarget(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {confirmStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Mevcut Fiyat</div>
                    <div className="text-2xl font-black text-slate-300 mt-1 font-mono">
                      ₺{editingSubTarget.currentPrice}
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
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Sayısal Haklar (Sadece Rakam Düzenlenebilir)
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-800 border border-white/5 space-y-1">
                      <label className="text-[11px] text-slate-400">AI Araç Raporu / Ay</label>
                      <input
                        type="number"
                        min="0"
                        value={editLimits.aiReports}
                        onChange={(e) => setEditLimits({ ...editLimits, aiReports: Number(e.target.value) })}
                        className="w-full bg-transparent text-base font-black text-white font-mono outline-none"
                      />
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800 border border-white/5 space-y-1">
                      <label className="text-[11px] text-slate-400">Chatbot Mesajı / Ay</label>
                      <input
                        type="number"
                        min="0"
                        value={editLimits.aiChat}
                        onChange={(e) => setEditLimits({ ...editLimits, aiChat: Number(e.target.value) })}
                        className="w-full bg-transparent text-base font-black text-white font-mono outline-none"
                      />
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800 border border-white/5 space-y-1">
                      <label className="text-[11px] text-slate-400">Aktif İlan Hakkı</label>
                      <input
                        type="number"
                        min="0"
                        value={editLimits.activeListings}
                        onChange={(e) => setEditLimits({ ...editLimits, activeListings: Number(e.target.value) })}
                        className="w-full bg-transparent text-base font-black text-white font-mono outline-none"
                      />
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800 border border-white/5 space-y-1">
                      <label className="text-[11px] text-slate-400">İlan Yayın Süresi (Gün)</label>
                      <input
                        type="number"
                        min="1"
                        value={editLimits.listingDurationDays}
                        onChange={(e) => setEditLimits({ ...editLimits, listingDurationDays: Number(e.target.value) })}
                        className="w-full bg-transparent text-base font-black text-white font-mono outline-none"
                      />
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800 border border-white/5 space-y-1">
                      <label className="text-[11px] text-slate-400">Karşılaştırma / Ay</label>
                      <input
                        type="number"
                        min="0"
                        value={editLimits.comparisons}
                        onChange={(e) => setEditLimits({ ...editLimits, comparisons: Number(e.target.value) })}
                        className="w-full bg-transparent text-base font-black text-white font-mono outline-none"
                      />
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800 border border-white/5 space-y-1">
                      <label className="text-[11px] text-slate-400">Karşılaştırma Başına Araç</label>
                      <input
                        type="number"
                        min="2"
                        value={editLimits.maxVehiclesPerComparison}
                        onChange={(e) => setEditLimits({ ...editLimits, maxVehiclesPerComparison: Number(e.target.value) })}
                        className="w-full bg-transparent text-base font-black text-white font-mono outline-none"
                      />
                    </div>
                    {(editingSubTarget.tier === "YETKIN" || editingSubTarget.tier === "PROFESYONEL") && (
                      <div className="p-3 rounded-xl bg-slate-800 border border-white/5 space-y-1 col-span-2">
                        <label className="text-[11px] text-orange-400 font-bold">Vitrin İlanı / Ay</label>
                        <input
                          type="number"
                          min="0"
                          value={editLimits.vitrinListings ?? 0}
                          onChange={(e) => setEditLimits({ ...editLimits, vitrinListings: Number(e.target.value) })}
                          className="w-full bg-transparent text-base font-black text-white font-mono outline-none"
                        />
                      </div>
                    )}
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
                    placeholder="Örn: Hak artırımı ve fiyat güncellemesi"
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-xs text-white placeholder-slate-500 outline-none focus:border-orange-500"
                  />
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
                    onClick={() => setEditingSubTarget(null)}
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

            {confirmStep === 2 && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                  <div className="font-black text-amber-300 flex items-center gap-1.5 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-400" /> Güncellemeyi Onaylayın
                  </div>
                  <p className="leading-relaxed">
                    <strong>{editingSubTarget.name}</strong> paketinin fiyatını <strong>₺{editingSubTarget.currentPrice}</strong> → <span className="text-white font-black underline">₺{newPriceInput}</span> olarak ve sayısal haklarını güncellemek üzeresiniz.
                  </p>
                </div>

                <div className="space-y-2 text-xs text-slate-300 p-4 rounded-2xl bg-slate-800/80 border border-white/5">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="text-slate-400">Yeni Satın Almalar:</span>
                    <span className="font-bold text-emerald-400 font-mono">₺{newPriceInput} (Anında Uygulanır)</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Mevcut Aktif Dönemler:</span>
                    <span className="font-bold text-slate-200">DEĞİŞMEZ (Hak ve Fiyat Korunur)</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Sonraki Yenilemeler:</span>
                    <span className="font-bold text-orange-400 font-mono">₺{newPriceInput} + Yeni Haklar</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400">Etkilenecek Ücretli Yenileme:</span>
                    <span className="font-bold font-mono text-white">
                      {editingSubTarget.renewingSubscribersCount || 0} Abone
                    </span>
                  </div>
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
                    onClick={handleExecuteSubUpdate}
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-orange-600/30 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> İşleniyor...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Kesin Olarak Güncelle
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT BUYER MODAL (Numeric Limits + Price) */}
      {editingBuyerTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  Alıcı Paketi Fiyatı ve Hakları Düzenleme
                </div>
                <h3 className="text-xl font-black text-white mt-1">{editingBuyerTarget.name}</h3>
              </div>
              <button
                onClick={() => setEditingBuyerTarget(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {confirmStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Mevcut Fiyat</div>
                    <div className="text-2xl font-black text-slate-300 mt-1 font-mono">
                      ₺{editingBuyerTarget.currentPrice}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30">
                    <div className="text-[10px] text-blue-400 font-bold uppercase">Yeni Fiyat (TL)</div>
                    <input
                      type="number"
                      min="1"
                      value={newPriceInput}
                      onChange={(e) => setNewPriceInput(e.target.value)}
                      className="w-full bg-transparent text-2xl font-black text-white mt-1 font-mono outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Sayısal Haklar (Sadece Rakam Düzenlenebilir)
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-800 border border-white/5 space-y-1">
                      <label className="text-[11px] text-slate-400">AI Araç Raporu Hakkı</label>
                      <input
                        type="number"
                        min="0"
                        value={editBuyerLimits.aiReportLimit}
                        onChange={(e) => setEditBuyerLimits({ ...editBuyerLimits, aiReportLimit: Number(e.target.value) })}
                        className="w-full bg-transparent text-base font-black text-white font-mono outline-none"
                      />
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800 border border-white/5 space-y-1">
                      <label className="text-[11px] text-slate-400">Chatbot Mesaj Hakkı</label>
                      <input
                        type="number"
                        min="0"
                        value={editBuyerLimits.chatbotMessageLimit}
                        onChange={(e) => setEditBuyerLimits({ ...editBuyerLimits, chatbotMessageLimit: Number(e.target.value) })}
                        className="w-full bg-transparent text-base font-black text-white font-mono outline-none"
                      />
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800 border border-white/5 space-y-1 col-span-2">
                      <label className="text-[11px] text-slate-400">Kullanım Süresi (Gün)</label>
                      <input
                        type="number"
                        min="1"
                        value={editBuyerLimits.validityDays}
                        onChange={(e) => setEditBuyerLimits({ ...editBuyerLimits, validityDays: Number(e.target.value) })}
                        className="w-full bg-transparent text-base font-black text-white font-mono outline-none"
                      />
                    </div>
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
                    placeholder="Örn: Alıcı paketi hak güncellemesi"
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                  />
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
                    onClick={() => setEditingBuyerTarget(null)}
                    className="flex-1 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedToStep2}
                    className="flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/30"
                  >
                    İlerle <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {confirmStep === 2 && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                  <div className="font-black text-amber-300 flex items-center gap-1.5 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-400" /> Güncellemeyi Onaylayın
                  </div>
                  <p className="leading-relaxed">
                    <strong>{editingBuyerTarget.name}</strong> paketinin fiyatını <strong>₺{editingBuyerTarget.currentPrice}</strong> → <span className="text-white font-black underline">₺{newPriceInput}</span> olarak ve sayısal haklarını güncellemek üzeresiniz.
                  </p>
                </div>

                <div className="space-y-2 text-xs text-slate-300 p-4 rounded-2xl bg-slate-800/80 border border-white/5">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="text-slate-400">Yeni Satın Almalar:</span>
                    <span className="font-bold text-emerald-400 font-mono">₺{newPriceInput} (Anında Uygulanır)</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Geçmiş Satın Almalar:</span>
                    <span className="font-bold text-slate-200">DEĞİŞMEZ (Hak Snapshot'ı Korunur)</span>
                  </div>
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
                    onClick={handleExecuteBuyerUpdate}
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-blue-600/30 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> İşleniyor...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Kesin Olarak Güncelle
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
                    <h3 className="text-lg font-black text-white">Paket ve Hak Değişiklik Geçmişi</h3>
                    <p className="text-xs text-slate-400">Tüm paket fiyat ve sayısal hak güncellemelerinin denetim kaydı.</p>
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
                  <div className="py-12 text-center text-xs text-slate-400">Henüz değişiklik kaydı bulunmuyor.</div>
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
