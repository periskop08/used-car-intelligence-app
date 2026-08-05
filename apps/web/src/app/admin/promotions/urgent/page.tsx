"use client";

import React, { useEffect, useState } from "react";
import { 
  ShieldCheck, 
  DollarSign, 
  Settings, 
  Gift, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCcw
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function AdminUrgentPromotionsPage() {
  const [config, setConfig] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states for Config
  const [enabled, setEnabled] = useState(false);
  const [priceAmount, setPriceAmount] = useState("149.90");
  const [taxRate, setTaxRate] = useState("20.0");
  const [pricingVersion, setPricingVersion] = useState("urgent-v1");
  const [termsVersion, setTermsVersion] = useState("urgent-terms-v1");

  // Form states for Admin Grant
  const [grantListingId, setGrantListingId] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [granting, setGranting] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [cfgRes, statsRes, listRes] = await Promise.all([
        fetch(`${API_URL}/listing-promotions/urgent/product`),
        fetch(`${API_URL}/listing-promotions/urgent/admin/stats`, { headers }),
        fetch(`${API_URL}/listing-promotions/urgent/admin/list?page=1&limit=20`, { headers }),
      ]);

      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        setConfig(cfg);
        setEnabled(cfg.enabled);
        setPriceAmount(String(cfg.priceAmount));
        setTaxRate(String(cfg.taxRate || 20));
        setPricingVersion(cfg.pricingVersion || "urgent-v1");
        setTermsVersion(cfg.termsVersion || "urgent-terms-v1");
      }

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      if (listRes.ok) {
        const listData = await listRes.json();
        setPromotions(listData.items || []);
      }
    } catch (e: any) {
      setMsg({ type: "error", text: "Veriler yüklenirken hata oluştu." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveConfig = async () => {
    setMsg(null);
    try {
      const res = await fetch(`${API_URL}/listing-promotions/urgent/admin/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled,
          priceAmount: parseFloat(priceAmount),
          taxRate: parseFloat(taxRate),
          currency: "TRY",
          taxIncluded: true,
          pricingVersion,
          termsVersion,
        }),
      });

      if (!res.ok) throw new Error("Ayarlar kaydedilemedi.");
      setMsg({ type: "success", text: "Acil ilan ayarları başarıyla güncellendi!" });
      loadData();
    } catch (e: any) {
      setMsg({ type: "error", text: e.message });
    }
  };

  const handleAdminGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantListingId || !grantReason) {
      setMsg({ type: "error", text: "Lütfen İlan ID ve Gerekçe alanlarını doldurunuz." });
      return;
    }

    setGranting(true);
    setMsg(null);

    try {
      const res = await fetch(`${API_URL}/listing-promotions/urgent/admin/grant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listingId: grantListingId,
          reason: grantReason,
        }),
      });

      if (!res.ok) throw new Error("Ücretsiz acil ilan tanımlanamadı.");
      setMsg({ type: "success", text: "Ücretsiz Acil İlan başarıyla tanımlandı!" });
      setGrantListingId("");
      setGrantReason("");
      loadData();
    } catch (e: any) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setGranting(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8 w-full">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <span>🚨 Admin Acil İlanlar Yönetim Paneli</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Fiyatlandırma, KDV, promosyon açma/kapatma, satış istatistikleri ve ücretsiz tanımlamalar.
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-white/10 flex items-center gap-2 transition"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          <span>Yenile</span>
        </button>
      </div>

      {msg && (
        <div className={`p-4 rounded-2xl border text-xs font-bold ${
          msg.type === "success" 
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
            : "bg-red-500/10 text-red-400 border-red-500/20"
        }`}>
          {msg.text}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Toplam Ödemeli Satış</span>
          <span className="text-2xl font-black text-emerald-400">{stats?.totalPaidCount || 0} Adet</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Toplam Acil İlan Ciro</span>
          <span className="text-2xl font-black text-white">{(stats?.totalRevenueAmount || 0).toLocaleString("tr-TR")} TRY</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Admin Ücretsiz Tanımlamalar</span>
          <span className="text-2xl font-black text-purple-400">{stats?.adminGrantsCount || 0} Adet</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Settings Form */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <Settings className="w-5 h-5 text-orange-400" />
            <span>Ürün & Fiyat Ayarları</span>
          </h2>

          <div className="space-y-4 text-xs">
            <label className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-xl border border-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 accent-orange-500 rounded"
              />
              <span className="font-bold text-slate-200">Acil İlan Özelliğini Yayında Tut (Enabled)</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Birim Fiyat (TL)</label>
                <input
                  type="number"
                  step="0.01"
                  value={priceAmount}
                  onChange={(e) => setPriceAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 p-2.5 rounded-xl text-slate-100 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">KDV Oranı (%)</label>
                <input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 p-2.5 rounded-xl text-slate-100 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Fiyat Sürümü (pricingVersion)</label>
                <input
                  type="text"
                  value={pricingVersion}
                  onChange={(e) => setPricingVersion(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 p-2.5 rounded-xl text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Şartlar Sürümü (termsVersion)</label>
                <input
                  type="text"
                  value={termsVersion}
                  onChange={(e) => setTermsVersion(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 p-2.5 rounded-xl text-slate-100"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveConfig}
              className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition shadow-lg"
            >
              Ayarları Kaydet
            </button>
          </div>
        </div>

        {/* Admin Grant Form */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <Gift className="w-5 h-5 text-purple-400" />
            <span>Ücretsiz Acil İlan Tanımla</span>
          </h2>

          <form onSubmit={handleAdminGrant} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">İlan ID (UUID)</label>
              <input
                type="text"
                placeholder="İlan ID giriniz..."
                value={grantListingId}
                onChange={(e) => setGrantListingId(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 p-2.5 rounded-xl text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Tanımlama Gerekçesi (Mandatory Audit)</label>
              <textarea
                placeholder="Müşteri memnuniyeti, kampanya vb. gerekçe giriniz..."
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-white/10 p-2.5 rounded-xl text-slate-100 leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={granting}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition shadow-lg disabled:opacity-50"
            >
              {granting ? "Tanımlanıyor..." : "Ücretsiz Acil İlan Tanımla"}
            </button>
          </form>
        </div>
      </div>

      {/* Promotion Log Table */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4">
        <h2 className="text-base font-bold text-white">Promosyon İşlem Geçmişi (Son 20 İşlem)</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px]">
                <th className="py-3 px-2">Kaynak</th>
                <th className="py-3 px-2">İlan</th>
                <th className="py-3 px-2">Müşteri</th>
                <th className="py-3 px-2">Yaşam Statüsü</th>
                <th className="py-3 px-2">Ödeme Statüsü</th>
                <th className="py-3 px-2">Tutar</th>
                <th className="py-3 px-2">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {promotions.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 px-2 font-bold">{p.source}</td>
                  <td className="py-3 px-2">{p.listing?.title || p.listingId}</td>
                  <td className="py-3 px-2">{p.user?.email || p.userId}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.lifecycleStatus === "ACTIVE" 
                        ? "bg-emerald-500/20 text-emerald-400" 
                        : "bg-slate-800 text-slate-300"
                    }`}>
                      {p.lifecycleStatus}
                    </span>
                  </td>
                  <td className="py-3 px-2">{p.paymentStatus}</td>
                  <td className="py-3 px-2">{p.priceAmount ? `${p.priceAmount} TRY` : "-"}</td>
                  <td className="py-3 px-2 text-slate-400">{new Date(p.createdAt).toLocaleDateString("tr-TR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
