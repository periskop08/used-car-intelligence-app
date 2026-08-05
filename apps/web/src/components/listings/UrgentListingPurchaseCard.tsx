"use client";

import React, { useEffect, useState } from "react";
import { 
  UrgentProductConfig, 
  UrgentQuoteResponse, 
  fetchUrgentProductConfig, 
  requestUrgentQuote 
} from "../../lib/listing-promotion-api";
import { AlertCircle, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";

interface UrgentListingPurchaseCardProps {
  listingId?: string;
  selected: boolean;
  onToggle: (selected: boolean) => void;
  paidConsentAccepted: boolean;
  onPaidConsentChange: (accepted: boolean) => void;
  onQuoteReceived?: (quote: UrgentQuoteResponse) => void;
}

export default function UrgentListingPurchaseCard({
  listingId,
  selected,
  onToggle,
  paidConsentAccepted,
  onPaidConsentChange,
  onQuoteReceived,
}: UrgentListingPurchaseCardProps) {
  const [config, setConfig] = useState<UrgentProductConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<UrgentQuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  useEffect(() => {
    fetchUrgentProductConfig()
      .then((cfg) => {
        setConfig(cfg);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selected && listingId && !quote) {
      requestUrgentQuote(listingId)
        .then((q) => {
          setQuote(q);
          setQuoteError(null);
          if (onQuoteReceived) onQuoteReceived(q);
        })
        .catch((err) => {
          setQuoteError(err.message || "Fiyat teklifi alınamadı.");
        });
    }
  }, [selected, listingId, quote, onQuoteReceived]);

  if (loading) {
    return <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/20 text-xs text-slate-400 text-center">Acil İlan altyapı verileri yükleniyor...</div>;
  }

  if (!config || !config.enabled) {
    return null; // Feature disabled by Admin
  }

  const formattedPrice = (quote?.priceAmount || config.priceAmount).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className={`p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden shadow-xl ${
      selected 
        ? "bg-gradient-to-br from-red-950/40 via-slate-900 to-rose-950/30 border-red-500/50 shadow-red-950/20" 
        : "bg-slate-900/60 border-white/10 hover:border-white/20"
    }`}>
      {/* Top Banner */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-xl shrink-0">
            🚨
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Acil İlan Hizmeti</span>
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-extrabold uppercase tracking-wider">
                Özel Görünürlük
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              İlan kartınızda dikkat çekici <strong>ACİL</strong> etiketi görünür ve ilanınız Acil İlanlar bölümünde ayrıca listelenir.
            </p>
          </div>
        </div>

        {/* Selection Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 bg-slate-950/60 px-3.5 py-2 rounded-xl border border-white/10 hover:border-red-500/40 transition">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onToggle(e.target.checked)}
            className="w-4 h-4 accent-red-600 rounded cursor-pointer"
          />
          <span className="text-xs font-bold text-slate-200">Acil İlan Yap</span>
        </label>
      </div>

      {selected && (
        <div className="mt-5 pt-4 border-t border-white/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Price Box */}
          <div className="flex items-center justify-between p-4 bg-slate-950/80 rounded-xl border border-red-500/20">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Acil İlan Hizmet Ücreti</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-red-400">{formattedPrice} {config.currency}</span>
                <span className="text-[11px] text-slate-400">({config.taxIncluded ? "KDV dahil" : "+ KDV"})</span>
              </div>
            </div>
            <span className="text-xs font-medium text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
              İlan Süresi Boyunca Geçerli
            </span>
          </div>

          {quoteError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl font-bold">
              ⚠️ {quoteError}
            </p>
          )}

          {/* Paid Terms Consent Checkbox */}
          <div className="flex items-start gap-3 bg-slate-950/60 p-4 rounded-xl border border-white/5 cursor-pointer">
            <input
              type="checkbox"
              id="paidTermsConsent"
              checked={paidConsentAccepted}
              onChange={(e) => onPaidConsentChange(e.target.checked)}
              className="w-4 h-4 accent-red-600 rounded border-white/10 mt-0.5 shrink-0"
            />
            <label htmlFor="paidTermsConsent" className="text-xs text-slate-300 cursor-pointer select-none leading-relaxed">
              Bu hizmetin paket ilan hakkımdan bağımsız, <strong>tek seferlik ücretli bir ek hizmet</strong> olduğunu kabul ediyorum.
            </label>
          </div>

          {/* Legal Disclaimer Box */}
          <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5 flex items-start gap-2 text-[11px] text-slate-400">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              <strong>Yasal Bilgilendirme:</strong> Satıcı bu ilanı ücretli Acil İlan olarak işaretlemiştir. TorqueScout satış aciliyetini doğrulamamaktadır.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
