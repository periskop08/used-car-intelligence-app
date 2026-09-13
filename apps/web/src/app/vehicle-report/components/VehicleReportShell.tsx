"use client";

import React from "react";
import { ComprehensiveVehicleReport, formatCanonicalPowerDisplay } from "@used-car-intelligence/shared";
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

  const formatFuelTypeTr = (fuel?: string): string => {
    if (!fuel) return "Benzin";
    const u = fuel.trim().toUpperCase();
    if (u === "PETROL" || u === "BENZIN") return "Benzin";
    if (u === "DIESEL" || u === "DIZEL") return "Dizel";
    if (u === "HYBRID" || u === "PLUG_IN_HYBRID" || u === "HIBRIT") return "Hibrit";
    if (u === "ELECTRIC" || u === "ELEKTRIK") return "Elektrik";
    if (u === "LPG") return "LPG & Benzin";
    return fuel;
  };

  // Detailed Specifications & Calculations (Canonical Power Display)
  const isHybrid = formatFuelTypeTr(report.vehicleIdentity?.fuelType) === 'Hibrit' ||
                   (report.vehicleIdentity?.transmissionName || '').toLowerCase().includes('e-cvt') ||
                   report.performanceUsage?.powerSemantic === 'TOTAL_HYBRID_SYSTEM_POWER' ||
                   (report.vehicleIdentity as any)?.powerSemantic === 'TOTAL_HYBRID_SYSTEM_POWER';
  const rawPower = report.performanceUsage?.sourcePowerValue 
    ?? report.vehicleIdentity?.sourcePowerValue 
    ?? report.performanceUsage?.powerHp 
    ?? (report.expertDecisionSynthesis as any)?.technicalSpecifications?.enginePowerHp 
    ?? (report.expertDecisionSynthesis as any)?.technicalSpecifications?.powerHp 
    ?? report.vehicleIdentity?.enginePowerHp;
  const powerUnit = report.performanceUsage?.sourcePowerUnit 
    ?? report.vehicleIdentity?.sourcePowerUnit 
    ?? (report.performanceUsage as any)?.powerUnit 
    ?? (report.vehicleIdentity as any)?.powerUnit 
    ?? ((report.expertDecisionSynthesis as any)?.technicalSpecifications?.powerUnit) 
    ?? 'HP';
  const powerSemantic = report.performanceUsage?.powerSemantic 
    ?? (report.vehicleIdentity as any)?.powerSemantic 
    ?? (isHybrid ? 'TOTAL_HYBRID_SYSTEM_POWER' : undefined);

  const powerLabel = rawPower !== null && rawPower !== undefined
    ? formatCanonicalPowerDisplay(rawPower, powerUnit, powerSemantic)
    : null;

  const rawTorque = report.performanceUsage?.torqueNm || (report.expertDecisionSynthesis as any)?.technicalSpecifications?.engineTorqueNm || (report.expertDecisionSynthesis as any)?.technicalSpecifications?.torqueNm || (report.vehicleIdentity as any)?.engineTorqueNm;
  const torqueUnit = (report.performanceUsage as any)?.torqueUnit || (report.vehicleIdentity as any)?.torqueUnit || 'Nm';
  const numericTorque = typeof rawTorque === 'number' ? rawTorque : (typeof rawTorque === 'string' ? parseInt(rawTorque.replace(/\D/g, ''), 10) : null);

  const topSpeedValue = report.performanceUsage?.topSpeedKmh || (report.expertDecisionSynthesis as any)?.technicalSpecifications?.topSpeedKmh;
  const zeroToHundredValue = (report.performanceUsage as any)?.zeroToHundredSec || report.performanceUsage?.zeroToHundredKmh || (report.expertDecisionSynthesis as any)?.technicalSpecifications?.zeroToHundredSec || (report.expertDecisionSynthesis as any)?.technicalSpecifications?.zeroToHundredKmh;
  const combinedFuel = report.performanceUsage?.combinedFuelL100km || (report.expertDecisionSynthesis as any)?.technicalSpecifications?.combinedFuelL100km;
  const trunkValue = report.performanceUsage?.trunkCapacityLiters || (report.expertDecisionSynthesis as any)?.technicalSpecifications?.trunkCapacityLiters || (report.expertDecisionSynthesis as any)?.technicalSpecifications?.luggageCapacityL || (report.performanceUsage as any)?.luggageCapacityL;
  const weightValue = report.performanceUsage?.curbWeightKg || (report.expertDecisionSynthesis as any)?.technicalSpecifications?.curbWeightKg || (report.performanceUsage as any)?.weightKg;

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
            {powerLabel ? `(${powerLabel}${numericTorque ? ` / ${numericTorque} ${torqueUnit}` : ""}) ` : ""}• 
            {report.vehicleIdentity.transmissionName} • {formatFuelTypeTr(report.vehicleIdentity.fuelType)}
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

      {/* SCORE SECTION: V6 DECISION SCORE HERO (with V5 Fallback) */}
      {(() => {
        const decisionScore = report.torqueScoutDecisionScoreV1 || report.scoringV6?.decisionScoreV1;
        const v6Scores = report.scoringV6;

        if (decisionScore) {
          const isInsufficient = decisionScore.confidenceScore < 40 || decisionScore.score === null || decisionScore.state === 'INSUFFICIENT_DATA';
          
          const getStateConfig = (state?: string) => {
            switch (state) {
              case 'EXCELLENT':
                return { label: 'Mükemmel Tercih (Düşük Risk)', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
              case 'GOOD':
                return { label: 'İyi Tercih (Dengeli)', color: 'text-teal-400 border-teal-500/40 bg-teal-500/10', badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30' };
              case 'CAUTION':
                return { label: 'Dikkatli Yaklaşım (İnceleme Gerekli)', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
              case 'HIGH_RISK':
                return { label: 'Yüksek Risk Seviyesi', color: 'text-orange-400 border-orange-500/40 bg-orange-500/10', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
              case 'AVOID':
                return { label: 'Uzak Durulmalı (Ağır Risk)', color: 'text-rose-400 border-rose-500/40 bg-rose-500/10', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
              default:
                return { label: 'Puanlama İçin Yeterli Doğrulanmış Veri Bulunamadı', color: 'text-slate-400 border-slate-700 bg-slate-800/40', badge: 'bg-slate-700/50 text-slate-300 border-slate-600' };
            }
          };

          const stateCfg = getStateConfig(decisionScore.state);
          const topAdvantages = (report.expertDecisionSynthesis?.strongestReasonsToChoose || []).slice(0, 3);
          const topRisks = (report.expertDecisionSynthesis?.compromisesAndLimitations || []).slice(0, 3);

          const hasUnverifiedComplaints = Boolean(
            (report.commonProblems && report.commonProblems.length > 0) ||
            (report.reliabilityResearchShadow?.qualitativeDefects && report.reliabilityResearchShadow.qualitativeDefects.length > 0) ||
            ((report.scoringV6 as any)?.unverifiedComplaintCount && (report.scoringV6 as any).unverifiedComplaintCount > 0)
          );

          return (
            <div className="bg-[#090d1a] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
              {/* Header Row: Score + State + Confidence */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div className={`px-4 py-3 rounded-2xl border flex flex-col items-center justify-center ${stateCfg.color}`}>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Alınabilirlik Skoru</span>
                    <span className="text-3xl font-black mt-0.5">
                      {isInsufficient ? "—" : `${decisionScore.score} / 100`}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${stateCfg.badge}`}>
                        {stateCfg.label}
                      </span>
                      <span className="text-xs text-slate-400">
                        {decisionScore.scope === 'VEHICLE' ? '🚗 İlan Özel Değerlendirme' : '📋 Model Varyant Değerlendirmesi'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1.5 max-w-xl leading-relaxed">
                      {isInsufficient
                        ? "Bu araç hakkında çeşitli arıza ve kullanıcı bildirimleri bulunabilir; ancak bunların sıklığını ve bu araç varyantına uygulanabilirliğini güvenilir şekilde doğrulayamadığımız için yanıltıcı bir puan vermiyoruz."
                        : (decisionScore.explanation?.modelRisk || "Doğrulanmış teknik kronik riskler, araç kondisyonu ve piyasa fiyat dengesi baz alınarak hesaplandı.")}
                    </p>
                    {isInsufficient && hasUnverifiedComplaints && (
                      <div className="mt-2 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Tekrarlayan kullanıcı bildirimleri tespit edildi. Satın alma öncesi bu noktaların özellikle kontrol edilmesini öneriyoruz.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Independent Confidence Box */}
                <div className="w-full md:w-auto bg-slate-950/60 border border-white/10 rounded-xl p-3 flex items-center justify-between md:flex-col md:items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Analiz Veri Güveni</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          decisionScore.confidenceScore >= 75 ? 'bg-emerald-400' : decisionScore.confidenceScore >= 40 ? 'bg-amber-400' : 'bg-rose-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, decisionScore.confidenceScore))}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-200">%{decisionScore.confidenceScore}</span>
                  </div>
                </div>
              </div>

              {/* 3-Pillar Risk & Price Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-950/60 border border-white/5 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Model Teknik Riski</span>
                  <span className="text-sm font-bold text-slate-200 mt-0.5 block">
                    {decisionScore.modelDecisionRisk !== null ? `-${decisionScore.modelDecisionRisk} Puan Risk` : 'Belirlenemedi'}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5 truncate">
                    {decisionScore.explanation?.modelRisk || 'Kronik mekanik yükü'}
                  </span>
                </div>

                <div className="bg-slate-950/60 border border-white/5 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Araç Kondisyon Etkisi</span>
                  <span className="text-sm font-bold text-slate-200 mt-0.5 block">
                    {decisionScore.conditionRiskUsed !== null 
                      ? `-${decisionScore.conditionRiskUsed} Puan Risk` 
                      : 'Genel Varyant (İlan Yok)'}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5 truncate">
                    {decisionScore.explanation?.condition || 'Kilometre ve hasar kaydı'}
                  </span>
                </div>

                <div className="bg-slate-950/60 border border-white/5 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Piyasa Fiyat Dengesi</span>
                  <span className={`text-sm font-bold mt-0.5 block ${
                    (decisionScore.priceModifierUsed ?? 0) > 0 ? 'text-emerald-400' : (decisionScore.priceModifierUsed ?? 0) < 0 ? 'text-rose-400' : 'text-slate-200'
                  }`}>
                    {(decisionScore.priceModifierUsed ?? 0) > 0 ? `+${decisionScore.priceModifierUsed} Avantaj` : (decisionScore.priceModifierUsed ?? 0) < 0 ? `${decisionScore.priceModifierUsed} Ceza` : 'Piyasa Fiyatında (0)'}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5 truncate">
                    {decisionScore.explanation?.price || 'Fiyat-performans çarpanı'}
                  </span>
                </div>
              </div>

              {/* Top 3 Advantages & Risks Grid */}
              {(topAdvantages.length > 0 || topRisks.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {topAdvantages.length > 0 && (
                    <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                        ✨ En Önemli Avantajlar
                      </span>
                      <ul className="space-y-1.5 text-xs text-slate-200">
                        {topAdvantages.map((adv, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold shrink-0">✓</span>
                            <span><strong>{adv.title}:</strong> {adv.explanation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {topRisks.length > 0 && (
                    <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-4 space-y-2">
                      <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block">
                        ⚠️ En Önemli Riskler & Feragatler
                      </span>
                      <ul className="space-y-1.5 text-xs text-slate-200">
                        {topRisks.map((rsk, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-rose-400 font-bold shrink-0">✕</span>
                            <span><strong>{rsk.title}:</strong> {rsk.explanation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }

        // V5 FALLBACK: 2 Score Indicator Grid (Buyability & Technical Risk)
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-5 rounded-2xl border flex flex-col justify-between shadow-lg ${getScoreColor(report.scoring?.buyabilityScore?.value ?? null)}`}>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider opacity-90 mb-1">
                <span>Satın Alınabilirlik Skoru</span>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black my-2">
                {report.scoring?.buyabilityScore?.value !== null && report.scoring?.buyabilityScore?.value !== undefined 
                  ? `${report.scoring.buyabilityScore.value} / 100` 
                  : "Veri Yetersiz"}
              </div>
              <span className="text-xs opacity-80 font-medium">Genel Değerlendirme & Satın Alma Uygunluğu</span>
            </div>

            <div className={`p-5 rounded-2xl border flex flex-col justify-between shadow-lg ${getScoreColor(report.scoring?.technicalRiskScore?.value ?? null, true)}`}>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider opacity-90 mb-1">
                <span>Teknik Risk Skoru</span>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black my-2">
                {report.scoring?.technicalRiskScore?.value !== null && report.scoring?.technicalRiskScore?.value !== undefined 
                  ? `${report.scoring.technicalRiskScore.value} / 100` 
                  : "Veri Yetersiz"}
              </div>
              <span className="text-xs font-semibold opacity-90">
                {report.scoring?.technicalRiskScore?.value !== null && (report.scoring?.technicalRiskScore?.value ?? 0) > 60 
                  ? "⚠️ Yüksek Risk Seviyesi" 
                  : "Dengeli Risk Seviyesi"}
              </span>
            </div>
          </div>
        );
      })()}

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
      {Array.isArray(report.prePurchaseChecks) && report.prePurchaseChecks.length > 0 && (
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

      {/* TEKNİK ÖZELLİKLER KARTLARI (HP, Hız, 0-100, Tüketim, Bagaj, Ağırlık) */}
      <div className="bg-[#090d1a] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <span className="text-base">📋</span>
          <h2 className="text-sm font-black text-white uppercase tracking-wider">Teknik Özellikler</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
          <div className="bg-slate-950/60 border border-orange-500/30 p-3 rounded-xl flex flex-col justify-center shadow-md">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Motor Gücü</span>
            <span className="font-extrabold text-orange-400 text-sm mt-0.5">{powerLabel || "—"}</span>
          </div>
          <div className="bg-slate-950/60 border border-white/5 p-3 rounded-xl flex flex-col justify-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Maksimum Hız</span>
            <span className="font-bold text-slate-200 text-sm mt-0.5">{topSpeedValue ? `${topSpeedValue} km/h` : "—"}</span>
          </div>
          <div className="bg-slate-950/60 border border-white/5 p-3 rounded-xl flex flex-col justify-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">0-100 Hızlanma</span>
            <span className="font-bold text-slate-200 text-sm mt-0.5">{zeroToHundredValue ? `${zeroToHundredValue} sn` : "—"}</span>
          </div>
          <div className="bg-slate-950/60 border border-white/5 p-3 rounded-xl flex flex-col justify-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Ort. Tüketim</span>
            <span className="font-bold text-slate-200 text-sm mt-0.5">{combinedFuel ? `${combinedFuel} lt/100km` : "—"}</span>
          </div>
          <div className="bg-slate-950/60 border border-white/5 p-3 rounded-xl flex flex-col justify-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Bagaj Hacmi</span>
            <span className="font-bold text-slate-200 text-sm mt-0.5">{trunkValue ? `${trunkValue} lt` : "—"}</span>
          </div>
          <div className="bg-slate-950/60 border border-white/5 p-3 rounded-xl flex flex-col justify-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Ağırlık</span>
            <span className="font-bold text-slate-200 text-sm mt-0.5">{weightValue ? `${weightValue} kg` : "—"}</span>
          </div>
        </div>
      </div>

      {/* SATICIYA SORULACAK KRİTİK SORULAR */}
      {Array.isArray(report.sellerQuestions) && report.sellerQuestions.length > 0 && (
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

          {Array.isArray(report.listingAnalysis.damageAssessment) && report.listingAnalysis.damageAssessment.length > 0 && (
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