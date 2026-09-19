"use client";

import { useState, useEffect } from "react";
import {
  ComprehensiveVehicleReport,
  formatCanonicalPowerDisplay,
  calculateVehicleMtv,
} from "@used-car-intelligence/shared";
import VehicleReportExpertSynthesis from "./VehicleReportExpertSynthesis";
import VehicleReportScoreHero from "./VehicleReportScoreHero";
import { vehicleTaxonomyApi } from "../../../services/vehicleTaxonomyApi";
import { 
  Car, 
  RefreshCcw, 
  HelpCircle,
  AlertCircle,
  Wrench
} from "lucide-react";

interface VehicleReportShellProps {
  report: ComprehensiveVehicleReport;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function VehicleReportShell({ report, onRefresh, isRefreshing }: VehicleReportShellProps) {
  const isListingMode = report.mode === "LISTING_REPORT";

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

  // Motor Displacement (Engine CC) Resolution
  const isEvFuel = formatFuelTypeTr(report.vehicleIdentity?.fuelType) === 'Elektrik';
  const rawDisplacement = report.vehicleIdentity?.engineDisplacementCc 
    ?? (report.expertDecisionSynthesis as any)?.technicalSpecifications?.engineDisplacementCc 
    ?? (report as any).technicalSpecifications?.engineDisplacementCc 
    ?? (report.performanceUsage as any)?.engineDisplacementCc 
    ?? (report.performanceUsage as any)?.displacementCc;

  const [asyncDisplacement, setAsyncDisplacement] = useState<number | null>(null);

  useEffect(() => {
    if (rawDisplacement || isEvFuel || !report.variantId) return;
    let isMounted = true;
    vehicleTaxonomyApi.getTechnicalSpecs(report.variantId).then((specs) => {
      if (!isMounted || !specs) return;
      const cc = specs.engineDisplacementCc || specs.engineDisplacement?.valueCc || null;
      if (cc) setAsyncDisplacement(cc);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [report.variantId, rawDisplacement, isEvFuel]);

  const effectiveDisplacement = rawDisplacement ?? asyncDisplacement;
  const displacementLabel = isEvFuel ? 'Elektrik' : (effectiveDisplacement ? `${effectiveDisplacement} cc` : null);

  const topSpeedValue = report.performanceUsage?.topSpeedKmh || (report.expertDecisionSynthesis as any)?.technicalSpecifications?.topSpeedKmh;
  const zeroToHundredValue = (report.performanceUsage as any)?.zeroToHundredSec || report.performanceUsage?.zeroToHundredKmh || (report.expertDecisionSynthesis as any)?.technicalSpecifications?.zeroToHundredSec || (report.expertDecisionSynthesis as any)?.technicalSpecifications?.zeroToHundredKmh;
  const combinedFuel = report.performanceUsage?.combinedFuelL100km || (report.expertDecisionSynthesis as any)?.technicalSpecifications?.combinedFuelL100km;
  const trunkValue = report.performanceUsage?.trunkCapacityLiters || (report.expertDecisionSynthesis as any)?.technicalSpecifications?.trunkCapacityLiters || (report.expertDecisionSynthesis as any)?.technicalSpecifications?.luggageCapacityL || (report.performanceUsage as any)?.luggageCapacityL;
  const weightValue = report.performanceUsage?.curbWeightKg || (report.expertDecisionSynthesis as any)?.technicalSpecifications?.curbWeightKg || (report.performanceUsage as any)?.weightKg;

  // Motorlu Taşıtlar Vergisi (MTV) Hesaplama
  const mtvResult = calculateVehicleMtv({
    modelYear: report.vehicleIdentity?.modelYear,
    engineDisplacement: effectiveDisplacement || report.vehicleIdentity?.engineDisplacementCc,
    fuelType: report.vehicleIdentity?.fuelType,
    horsepower: rawPower,
  });

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
            {displacementLabel && !isEvFuel ? `${displacementLabel} ` : ""}
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

      {/* SCORE SECTION: V6 DECISION SCORE HERO (with V5 Fallback) */}
      <VehicleReportScoreHero report={report} />

      {/* TEKNİK ÖZELLİKLER KARTLARI (HP, Hacim, Hız, 0-100, Tüketim, Bagaj, Ağırlık) */}
      <div className="bg-[#090d1a] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <span className="text-base">📋</span>
          <h2 className="text-sm font-black text-white uppercase tracking-wider">Teknik Özellikler</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
          <div className="bg-slate-950/60 border border-orange-500/30 p-3 rounded-xl flex flex-col justify-center shadow-md">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Motor Gücü</span>
            <span className="font-extrabold text-orange-400 text-sm mt-0.5">{powerLabel || "—"}</span>
          </div>
          <div className="bg-slate-950/60 border border-white/5 p-3 rounded-xl flex flex-col justify-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Motor Hacmi</span>
            <span className="font-bold text-slate-200 text-sm mt-0.5">{displacementLabel || "—"}</span>
          </div>
          <div className="bg-slate-950/60 border border-white/5 p-3 rounded-xl flex flex-col justify-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Yıllık MTV</span>
            <span className="font-bold text-slate-200 text-sm mt-0.5">{mtvResult ? mtvResult.displayInstallment : "—"}</span>
            {mtvResult && (
              <span className="text-[10px] text-slate-400 font-medium">Toplam {mtvResult.displayAnnual}</span>
            )}
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