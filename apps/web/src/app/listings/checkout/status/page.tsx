"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Clock, ArrowRight, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function CheckoutStatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseId = searchParams.get("purchaseId");
  const listingId = searchParams.get("listingId");

  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchStatus = async () => {
    if (!purchaseId) {
      setError("Geçersiz ödeme referansı.");
      setLoading(false);
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      setError("Oturum süresi dolmuş. Lütfen giriş yapın.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/listing-promotions/purchase-status/${purchaseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Ödeme durumu sorgulanamadı.");
      }
      setPurchase(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Ödeme durumu kontrol edilirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [purchaseId]);

  const handleAbandonPromotion = async () => {
    if (!listingId) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) return;

    try {
      setSubmittingAction(true);
      const res = await fetch(`${API_URL}/listing-promotions/abandon/${listingId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "İşlem gerçekleştirilemedi.");
      router.push("/dashboard/listings?tab=active");
    } catch (err: any) {
      alert(err.message || "Bir hata oluştu.");
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <Clock className="w-10 h-10 text-orange-500 animate-spin" />
        <h2 className="text-xl font-bold text-slate-200">Ödeme durumu kontrol ediliyor...</h2>
        <p className="text-xs text-slate-400">Lütfen bekleyin, ödeme kaydınız doğrulanıyor.</p>
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4 max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <h2 className="text-xl font-bold text-slate-100">Ödeme Durumu Alınamadı</h2>
        <p className="text-xs text-slate-400">{error || "Bilinmeyen bir hata oluştu."}</p>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => fetchStatus()}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold transition flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Tekrar Kontrol Et
          </button>
          <button
            onClick={() => router.push("/dashboard/listings")}
            className="px-4 py-2 rounded-xl bg-orange-600 text-white hover:bg-orange-500 text-xs font-bold transition"
          >
            İlanlarıma Git
          </button>
        </div>
      </div>
    );
  }

  const isPaid = purchase.paymentStatus === "PAID";
  const isPending = purchase.paymentStatus === "PENDING";
  const isFailed = purchase.paymentStatus === "FAILED" || purchase.paymentStatus === "CANCELLED";

  const getProductName = (sku: string) => {
    switch (sku) {
      case "URGENT_LISTING":
        return "Acil İlan";
      case "SHOWCASE_FEED":
        return "Vitrin + Akış";
      case "URGENT_SHOWCASE_BUNDLE":
        return "Hızlı Satış (Vitrin + Acil)";
      default:
        return "Promosyon Paketi";
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-slate-900/60 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center space-y-6">
        {isPaid ? (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-100">Ödemeniz Başarıyla Alındı</h1>
              <p className="text-sm font-semibold text-orange-400">
                {getProductName(purchase.productSku)} hakkınız kaydedildi.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm pt-2">
                İlanınız incelemeye gönderildi. Moderasyon onayından sonra seçtiğiniz promosyon otomatik olarak tüm yüzeylerde aktifleşecektir.
              </p>
            </div>

            <div className="w-full bg-slate-950/60 border border-white/5 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Ödenen Tutar:</span>
                <span className="font-bold text-slate-200">{formatCurrency(purchase.priceAmount, purchase.currency)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>İlan Durumu:</span>
                <span className="font-bold text-amber-400">İncelemede</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
              <button
                onClick={() => router.push("/dashboard/listings?tab=active")}
                className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <span>İlanlarıma Git</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => router.push("/")}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Ana Sayfaya Dön
              </button>
            </div>
          </>
        ) : isPending ? (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-100">Ödemeniz Doğrulanıyor...</h1>
              <p className="text-xs text-slate-400 max-w-sm">
                Ödeme sağlayıcınızdan onay bekleniyor. Birkaç saniye içinde tekrar kontrol edebilirsiniz.
              </p>
            </div>
            <button
              onClick={() => fetchStatus()}
              className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Durumu Yenile
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-100">Ödeme Tamamlanamadı</h1>
              <p className="text-xs text-slate-400 max-w-sm">
                Ödeme işlemi tamamlanamadı veya iptal edildi. İlanınız taslak olarak güvenle saklandı.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 w-full pt-4">
              <button
                onClick={() => router.push(`/listings/create?id=${listingId}`)}
                className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition"
              >
                Ödemeyi Tekrar Dene
              </button>
              <button
                onClick={handleAbandonPromotion}
                disabled={submittingAction}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition disabled:opacity-50"
              >
                {submittingAction ? "İşleniyor..." : "Promosyonsuz İncelemeye Gönder"}
              </button>
              <button
                onClick={() => router.push("/dashboard/listings")}
                className="w-full py-2.5 rounded-xl bg-transparent text-slate-500 hover:text-slate-400 text-xs font-semibold transition"
              >
                İlanlarıma Git
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CheckoutStatusPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-xs text-slate-400">Yükleniyor...</div>}>
      <CheckoutStatusContent />
    </Suspense>
  );
}
