"use client";

import React, { useState, useEffect } from "react";
import ListingPromotionCards, { PromotionSku } from "./ListingPromotionCards";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface ListingPromotionsManagementProps {
  listingId: string;
  token: string;
  onSuccess?: () => void;
}

export default function ListingPromotionsManagement({ listingId, token, onSuccess }: ListingPromotionsManagementProps) {
  const [selectedSku, setSelectedSku] = useState<PromotionSku>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pricingDetails, setPricingDetails] = useState<any>(null);
  const [statusData, setStatusData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catalogRes, statusRes] = await Promise.all([
        fetch(`${API_URL}/listing-promotions/catalog`),
        fetch(`${API_URL}/listing-promotions/status/${listingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const catalogData = await catalogRes.json();
      const status = await statusRes.json();

      setStatusData(status);
      setPricingDetails({
        ...catalogData,
        canBuyUrgent: status.canBuyUrgent,
        canBuyShowcase: status.canBuyShowcase,
        canBuyBundle: status.canBuyBundle,
      });
    } catch (err) {
      console.error("Error fetching promotion catalog & status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [listingId, token]);

  const handleCheckout = async () => {
    if (!selectedSku) return;
    if (!termsAccepted) {
      setError("Lütfen ücretli ek hizmet koşullarını onaylayınız.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // 1. Create Quote
      const quoteRes = await fetch(`${API_URL}/listing-promotions/quotes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listingId,
          productSku: selectedSku,
        }),
      });

      const quoteData = await quoteRes.json();
      if (!quoteRes.ok) {
        throw new Error(quoteData.message || "Teklif oluşturulamadı.");
      }

      // 2. Checkout
      const idempotencyKey = `chk_mgm_${listingId}_${selectedSku}_${Date.now()}`;
      const checkoutRes = await fetch(`${API_URL}/listing-promotions/checkout/${listingId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quoteId: quoteData.quoteId,
          idempotencyKey,
          termsAccepted: true,
          termsVersion: quoteData.termsVersion || "v1",
          entryPoint: "LISTING_MANAGEMENT",
        }),
      });

      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) {
        throw new Error(checkoutData.message || "Ödeme başlatılamadı.");
      }

      // 3. Mock Payment Verification
      const mockPayRes = await fetch(`${API_URL}/listing-promotions/webhooks/mock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "payment.success",
          purchaseId: checkoutData.purchaseId,
          paymentReferenceId: `PAY_MGM_${Date.now()}`,
        }),
      });

      if (!mockPayRes.ok) {
        throw new Error("Ödeme doğrulanamadı.");
      }

      // Refresh status
      await fetchData();
      setSelectedSku(null);
      setTermsAccepted(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Promosyon verileri yükleniyor...</div>;
  }

  return (
    <div className="space-y-6 bg-slate-950/60 p-6 rounded-3xl border border-white/10">
      {/* Current Active Status Banner */}
      {statusData && (statusData.urgentPromotion || statusData.showcasePromotion) && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
          <h4 className="font-extrabold text-emerald-400 text-sm flex items-center gap-2">
            <span>🟢</span> Yayında Aktif Promosyonlarınız Bulunmaktadır
          </h4>
          <div className="text-xs text-slate-300 space-y-1">
            {statusData.urgentPromotion && (
              <p>🚨 <strong>Acil İlan:</strong> Bitiş Tarihi: {statusData.urgentPromotion.expiresAt ? new Date(statusData.urgentPromotion.expiresAt).toLocaleDateString("tr-TR") : "İlan Süresince"}</p>
            )}
            {statusData.showcasePromotion && (
              <p>⭐ <strong>Vitrin + Akış:</strong> Bitiş Tarihi: {statusData.showcasePromotion.expiresAt ? new Date(statusData.showcasePromotion.expiresAt).toLocaleDateString("tr-TR") : "İlan Süresince"}</p>
            )}
          </div>
        </div>
      )}

      <ListingPromotionCards
        selectedSku={selectedSku}
        onSelectSku={setSelectedSku}
        termsAccepted={termsAccepted}
        onTermsAcceptedChange={setTermsAccepted}
        pricingDetails={pricingDetails}
        remainingDays={statusData?.remainingDays}
        isCreateFlow={false}
      />

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-400">
          ⚠️ {error}
        </div>
      )}

      {selectedSku && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCheckout}
            disabled={submitting || !termsAccepted}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 disabled:opacity-50 font-black text-white text-sm shadow-xl transition cursor-pointer"
          >
            {submitting ? "Ödeme İşleniyor..." : "Öde ve Promosyonu Aktifleştir"}
          </button>
        </div>
      )}
    </div>
  );
}
