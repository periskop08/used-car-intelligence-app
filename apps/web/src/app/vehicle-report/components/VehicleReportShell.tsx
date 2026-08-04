"use client";

import React from "react";
import { ComprehensiveVehicleReport } from "@used-car-intelligence/shared";
import VehicleReportExpertSynthesis from "./VehicleReportExpertSynthesis";
import { 
  ShieldCheck, 
  AlertTriangle, 
  Car, 
  RefreshCcw, 
  HelpCircle,
  AlertCircle
} from "lucide-react";

interface VehicleReportShellProps {
  report: ComprehensiveVehicleReport;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function VehicleReportShell({ report, onRefresh, isRefreshing }: VehicleReportShellProps) {
  const isListingMode = report.mode === "LISTING_REPORT";

  const getScoreColor = (value: number | null, isRisk: boolean = false) => {
    if (value === null) return "text-slate-400 border-slate-700 bg-slate-800/40";
    if (isRisk) {
      if (value > 60) return "text-rose-400 border-rose-500/40 bg-rose-500/10";
      if (value > 30) return "text-amber-400 border-amber-500/40 bg-amber-500/10";
      return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
    }
    if (value >= 75) return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
    if (value >= 50) return "text-amber-400 border-amber-500/40 bg-amber-500/10";
    return "text-rose-400 border-rose-500/40 bg-rose-500/10";
  };

  // Detailed Specifications & Calculations
  const hpValue = report.performanceUsage?.powerHp || report.vehicleIdentity?.enginePowerHp;
  const torqueValue = report.performanceUsage?.torqueNm || (report.vehicleIdentity as any)?.engineTorqueNm;
  const combinedFuel = report.performanceUsage?.combinedFuelL100km;

  return (
    <div className="w-full text-slate-100 font-sans space-y-6 pb-8">
      {/* Top Header Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${
              isListingMode 
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" 
                : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
            }`}>
              {report.modeLabel || (isListingMode ? "İlan Özel Araç Raporu" : "Araç Sorgulama Raporu")}
            </span>
            <span className="text-xs text-slate-400">
              Rapor Tarihi: {new Date(report.generatedAt).toLocaleDateString("tr-TR")}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            {report.vehicleIdentity.modelYear} {report.vehicleIdentity.brand} {report.vehicleIdentity.model}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {report.vehicleIdentity.engineCode ? `${report.vehicleIdentity.engineCode} ` : ""}
            {hpValue ? `(${hpValue} HP${torqueValue ? ` / ${torqueValue} Nm` : ""}) ` : ""}• 
            {report.vehicleIdentity.transmissionName} • {report.vehicleIdentity.fuelType}
            {combinedFuel ? ` (Ort. ${combinedFuel} lt/100km)` : ""}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all shadow-md disabled:opacity-50"
            >
              <RefreshCcw className={`w-3.5 h-3.5 text-orange-400 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Raporu Yenile</span>
            </button>
          )}
        </div>
      </div>

      {/* 2 Score Indicator Grid (Buyability & Technical Risk) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Buyability Score */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between shadow-lg ${getScoreColor(report.scoring.buyabilityScore.value)}`}>
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider opacity-90 mb-1">
            <span>Satın Alınabilirlik Skoru</span>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-3xl font-black my-2">
            {report.scoring.buyabilityScore.value !== null ? `${report.scoring.buyabilityScore.value} / 100` : "Veri Yetersiz"}
          </div>
          <span className="text-xs opacity-80 font-medium">Genel Değerlendirme & Satın Alma Uygunluğu</span>
        </div>

        {/* Technical Risk Score */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between shadow-lg ${getScoreColor(report.scoring.technicalRiskScore.value, true)}`}>
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider opacity-90 mb-1">
            <span>Teknik Risk Skoru</span>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="text-3xl font-black my-2">
            {report.scoring.technicalRiskScore.value !== null ? `${report.scoring.technicalRiskScore.value} / 100` : "Veri Yetersiz"}
          </div>
          <span className="text-xs font-semibold opacity-90">
            {report.scoring.technicalRiskScore.value !== null && report.scoring.technicalRiskScore.value > 60 
              ? "⚠️ Yüksek Risk Seviyesi" 
              : "Dengeli Risk Seviyesi"}
          </span>
        </div>
      </div>

      {/* Legacy Schema Version Warning & Free Upgrade Banner */}
      {(!report.expertDecisionSynthesis || (report.schemaVersion || 1) < 2) && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>
              <strong>Bu rapor eski formatta hazırlanmıştır.</strong> Derin otomotiv uzman karar sentezini görmek için raporunuzu ücretsiz güncelleyebilirsiniz.
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
              if (!token) return;
              try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/vehicle-reports/${report.reportId}/upgrade-version`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok && onRefresh) {
                  onRefresh();
                }
              } catch (e) {
                console.error("Upgrade error", e);
              }
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md transition shrink-0 cursor-pointer"
          >
            Sürüm Yükselt (Ücretsiz)
          </button>
        </div>
      )}

      {/* DERİN UZMAN KARAR SENTEZİ BÖLÜMÜ (Expert Decision Synthesis) */}
      {report.expertDecisionSynthesis && (
        <VehicleReportExpertSynthesis 
          synthesis={report.expertDecisionSynthesis} 
          supportingFacts={report.dataQuality?.supportingFacts} 
        />
      )}

      {/* SATIN ALMA ÖNCESİ EKSPERTİZ KONTROL LİSTESİ */}
      {report.prePurchaseChecks && report.prePurchaseChecks.length > 0 && (
        <div className="bg-[#090d1a] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <ShieldCheck className="w-5 h-5 text-orange-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">Satın Alma Öncesi Ekspertiz Kontrol Listesi</h2>
          </div>
          <div className="space-y-2.5 text-xs">
            {report.prePurchaseChecks.map((chk, idx) => (
              <div key={idx} className="p-3.5 bg-slate-950/60 border border-white/5 rounded-xl flex items-start gap-3">
                <span className="text-lg shrink-0">🔍</span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{chk.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      chk.priority === 'KRİTİK' 
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                        : chk.priority === 'ÖNEMLİ' 
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }`}>
                      {chk.priority} ÖNCELİK
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{chk.instruction}</p>
                  {chk.targetComponent && (
                    <span className="text-[10px] text-slate-400 block">Hedef Parça: {chk.targetComponent}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SATICIYA SORULACAK KRİTİK SORULAR */}
      {report.sellerQuestions && report.sellerQuestions.length > 0 && (
        <div className="bg-[#090d1a] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <HelpCircle className="w-5 h-5 text-purple-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">Satıcıya Sorulacak Kritik Sorular</h2>
          </div>
          <div className="space-y-2.5 text-xs">
            {report.sellerQuestions.map((q, idx) => (
              <div key={idx} className="p-3.5 bg-slate-950/60 border border-white/5 rounded-xl space-y-1.5">
                <span className="font-bold text-purple-300 block">❓ {q.questionText}</span>
                {q.expectedAnswerHint && (
                  <p className="text-emerald-400 text-[11px]">✔ <strong>Beklenen Cevap:</strong> {q.expectedAnswerHint}</p>
                )}
                {q.redFlagAnswerHint && (
                  <p className="text-rose-400 text-[11px]">🚩 <strong>Şüphe Uyandıracak Cevap:</strong> {q.redFlagAnswerHint}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* İLAN İNCELEME KATMANI (İlan Modunda) */}
      {isListingMode && report.listingAnalysis && (
        <div className="bg-[#090d1a] border border-purple-900/40 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-purple-800/40 pb-3">
            <Car className="w-5 h-5 text-purple-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">İlan İnceleme Katmanı</h2>
          </div>
          <p className="text-xs text-slate-200 bg-purple-950/30 p-3.5 rounded-xl border border-purple-800/30 leading-relaxed">
            {report.listingAnalysis.listingSummary}
          </p>

          {report.listingAnalysis.mileageAgeAnalysis && (
            <div className="p-3.5 bg-slate-950/60 border border-white/5 rounded-xl space-y-1 text-xs">
              <span className="font-bold text-orange-400 block">🚗 Kilometre & Yaş Oran Analizi</span>
              <p>{report.listingAnalysis.mileageAgeAnalysis.assessment}</p>
              {report.listingAnalysis.mileageAgeAnalysis.isApproximateNotice && (
                <span className="text-[11px] text-slate-400 block italic mt-1">
                  {report.listingAnalysis.mileageAgeAnalysis.isApproximateNotice}
                </span>
              )}
            </div>
          )}

          {((report.listingAnalysis.contradictionFlags?.length || 0) > 0 || (report.listingAnalysis.contradictions?.length || 0) > 0) && (
            <div className="space-y-2 text-xs">
              <span className="font-bold text-rose-400 block">⚡ İlan Çelişki Uyarısı</span>
              {(report.listingAnalysis.contradictionFlags || report.listingAnalysis.contradictions || []).map((c, idx) => (
                <div key={idx} className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1">
                  <span className="font-bold text-rose-300 block">{c.title}</span>
                  <span className="text-slate-300">{c.explanation}</span>
                </div>
              ))}
            </div>
          )}

          {report.listingAnalysis.damageAssessment && report.listingAnalysis.damageAssessment.length > 0 && (
            <div className="p-3.5 bg-slate-950/60 border border-white/5 rounded-xl space-y-1 text-xs">
              <span className="font-bold text-slate-200 block">🎨 Kaporta & Tramer Dökümü</span>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {report.listingAnalysis.damageAssessment.map((d, idx) => (
                  <li key={idx}>{d}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}