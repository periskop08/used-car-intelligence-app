"use client";

import React, { useState, useEffect } from "react";
import { ComprehensiveVehicleReport } from "@used-car-intelligence/shared";
import VehicleReportExpertSynthesis from "./VehicleReportExpertSynthesis";
import { 
  ShieldCheck, 
  AlertTriangle, 
  Car, 
  Activity, 
  CheckCircle2, 
  FileText, 
  RefreshCcw, 
  ChevronDown, 
  ChevronUp, 
  Info,
  HelpCircle,
  Wrench,
  DollarSign,
  AlertCircle
} from "lucide-react";

const categoryLabels: Record<string, string> = {
  all: "Tüm Rapor",
  summary: "Karar Özeti",
  identity: "Araç Kimliği & Fabrika Özellikleri",
  engineTrans: "Motor & Şanzıman Karakteri",
  perf: "Performans & Yakıt Ekonomisi",
  problems: "Kronik Sorunlar",
  maint: "Bakım & Periyodik Bilgiler",
  scenarios: "Kullanım Senaryoları",
  checks: "Ekspertiz Kontrolleri",
  sellerQuestions: "Satıcı Soruları",
  listingAnalysis: "İlan İncelemesi",
  verdict: "Nihai Karar",
};

interface VehicleReportShellProps {
  report: ComprehensiveVehicleReport;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function VehicleReportShell({ report, onRefresh, isRefreshing }: VehicleReportShellProps) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [showAllProblems, setShowAllProblems] = useState<boolean>(false);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    summary: true,
    identity: true,
    listingAnalysis: true,
    verdict: true,
  });

  const isListingMode = report.mode === "LISTING_REPORT";

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

  // Detailed Factory Specifications & Performance Calculations
  const hpValue = report.performanceUsage?.powerHp || report.vehicleIdentity?.enginePowerHp;
  const torqueValue = report.performanceUsage?.torqueNm || (report.vehicleIdentity as any)?.engineTorqueNm;
  const powerRpm = report.performanceUsage?.powerRpm || report.vehicleIdentity?.enginePowerRpm;
  const torqueRpm = report.performanceUsage?.torqueRpm || report.vehicleIdentity?.engineTorqueRpm;
  const engineType = report.vehicleIdentity?.engineType;
  const weightValue = report.performanceUsage?.curbWeightKg;
  const hpPerTonne = hpValue && weightValue ? Math.round((hpValue / weightValue) * 1000) : null;

  const combinedFuel = report.performanceUsage?.combinedFuelL100km;
  const cityFuel = report.performanceUsage?.cityFuelL100km;
  const highwayFuel = report.performanceUsage?.highwayFuelL100km;
  const fuelTank = report.performanceUsage?.fuelTankCapacityLiters;
  const rangeEstimate = report.performanceUsage?.estimatedRangeKm || (combinedFuel && fuelTank ? Math.round((fuelTank * 100) / combinedFuel) : (combinedFuel ? Math.round((55 * 100) / combinedFuel) : null));
  const annualLitersEstimate = combinedFuel ? Math.round((combinedFuel / 100) * 15000) : null;

  const accelTime = report.performanceUsage?.zeroToHundredKmh;
  const topSpeed = report.performanceUsage?.topSpeedKmh;
  const dimensions = report.performanceUsage?.dimensionsMm || report.vehicleIdentity?.dimensionsMm;
  const trunkVol = report.performanceUsage?.trunkCapacityLiters;
  const drivetrain = report.vehicleIdentity?.drivetrain;

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
          supportingFacts={report.dataQuality.supportingFacts} 
        />
      )}

      {/* Navigation Bar for Desktop & Mobile Tabs */}
      <div className="flex flex-col gap-2">
        {/* Mobile Dropdown */}
        <div className="md:hidden">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl p-3 font-semibold focus:outline-none focus:border-orange-500"
          >
            {Object.entries(categoryLabels).map(([key, label]) => {
              if (key === "listingAnalysis" && !isListingMode) return null;
              return (
                <option key={key} value={key}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        {/* Desktop Horizontal Tab Bar */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar">
          {Object.entries(categoryLabels).map(([key, label]) => {
            if (key === "listingAnalysis" && !isListingMode) return null;
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section Content Area */}
      <div className="space-y-4">
        {/* 1. EXECUTIVE SUMMARY */}
        {(activeTab === "all" || activeTab === "summary") && report.executiveSummary && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <FileText className="w-5 h-5 text-orange-400" />
              <h2 className="text-base font-bold text-white">{report.executiveSummary.title || "Karar Özeti"}</h2>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-100 bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/50 leading-relaxed">
              {report.executiveSummary.oneSentenceSummary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {report.executiveSummary.strongestAdvantage && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                  <span className="font-bold text-emerald-400 block">💪 En Güçlü Avantaj</span>
                  <span className="text-slate-200">{report.executiveSummary.strongestAdvantage}</span>
                </div>
              )}
              {report.executiveSummary.biggestRisk && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1">
                  <span className="font-bold text-rose-400 block">⚠️ En Büyük Risk</span>
                  <span className="text-slate-200">{report.executiveSummary.biggestRisk}</span>
                </div>
              )}
            </div>

            {report.executiveSummary.keyWarnings?.length > 0 && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-1">
                <span className="font-bold text-amber-400 block">📢 Önemli Uarılar</span>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  {report.executiveSummary.keyWarnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 2. VEHICLE IDENTITY */}
        {(activeTab === "all" || activeTab === "identity") && report.vehicleIdentity && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Car className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-bold text-white">Araç Kimliği & Spesifikasyonlar</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">Marka / Model</span>
                <span className="font-bold text-white text-sm">{report.vehicleIdentity.brand} {report.vehicleIdentity.model}</span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">Model Yılı & Gövde</span>
                <span className="font-bold text-white text-sm">{report.vehicleIdentity.modelYear} • {report.vehicleIdentity.bodyType}</span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">Motor Kodu & Tipi</span>
                <span className="font-bold text-orange-400 text-sm">{report.vehicleIdentity.engineCode || "Motor"} {engineType ? "(" + engineType + ")" : ""}</span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">Silindir Hacmi</span>
                <span className="font-bold text-white text-sm">{report.vehicleIdentity.engineDisplacementCc ? report.vehicleIdentity.engineDisplacementCc + " cc" : "-"}</span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">Şanzıman Tipi</span>
                <span className="font-bold text-white text-sm">{report.vehicleIdentity.transmissionName}</span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">Çekiş Sistemi</span>
                <span className="font-bold text-purple-400 text-sm">{drivetrain || "-"}</span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">Araç Boyutları (U x G x Y)</span>
                <span className="font-bold text-white text-sm">{dimensions || "-"}</span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">Varyant Eşleşmesi</span>
                <span className="font-bold text-emerald-400 text-sm">{report.vehicleIdentity.variantMatchConfidence}</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. ENGINE & TRANSMISSION */}
        {(activeTab === "all" || activeTab === "engineTrans") && report.engineTransmission && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Wrench className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">Motor & Şanzıman Karakteri</h2>
            </div>
            {report.engineTransmission.combinationAssessment && (
              <p className="text-xs text-slate-300 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 leading-relaxed">
                {report.engineTransmission.combinationAssessment}
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {report.engineTransmission.engineSummary && (
                <div className="p-3.5 bg-slate-800/40 border border-slate-700/40 rounded-xl space-y-1">
                  <span className="font-bold text-orange-400 block">🔧 Motor Ünitesi Özeti</span>
                  <span className="text-slate-200">{report.engineTransmission.engineSummary}</span>
                </div>
              )}
              {report.engineTransmission.transmissionSummary && (
                <div className="p-3.5 bg-slate-800/40 border border-slate-700/40 rounded-xl space-y-1">
                  <span className="font-bold text-purple-400 block">⚙️ Şanzıman Yapısı</span>
                  <span className="text-slate-200">{report.engineTransmission.transmissionSummary}</span>
                </div>
              )}
              {report.engineTransmission.cityBehavior && (
                <div className="p-3.5 bg-slate-800/40 border border-slate-700/40 rounded-xl space-y-1">
                  <span className="font-bold text-blue-400 block">🏙️ Şehir İçi Sürüş Davranışı</span>
                  <span className="text-slate-200">{report.engineTransmission.cityBehavior}</span>
                </div>
              )}
              {report.engineTransmission.highwayBehavior && (
                <div className="p-3.5 bg-slate-800/40 border border-slate-700/40 rounded-xl space-y-1">
                  <span className="font-bold text-emerald-400 block">🛣️ Otoyol Seyir Karakteri</span>
                  <span className="text-slate-200">{report.engineTransmission.highwayBehavior}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. PERFORMANCE & USAGE */}
        {(activeTab === "all" || activeTab === "perf") && report.performanceUsage && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Performans & Sürüş Verileri</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">Maksimum Güç (HP @ d/dk)</span>
                <span className="font-bold text-amber-400 text-sm">{powerRpm || (hpValue ? hpValue + " HP" : "-")}</span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">Maksimum Tork (Nm @ d/dk)</span>
                <span className="font-bold text-orange-400 text-sm">{torqueRpm || (torqueValue ? torqueValue + " Nm" : "-")}</span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">0-100 km/s Hızlanma</span>
                <span className="font-bold text-white text-sm">{accelTime ? accelTime + " sn" : "-"}</span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">Maksimum Hız</span>
                <span className="font-bold text-white text-sm">{topSpeed ? topSpeed + " km/h" : "-"}</span>
              </div>

              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">Şehir İçi / Dışı / Karma Tüketim</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {cityFuel || "-"} / {highwayFuel || "-"} / {combinedFuel || "-"} lt/100km
                </span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">Yakıt Deposu & Menzil</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {fuelTank ? fuelTank + " L Depo" : "Depo Bilgisi Yok"} {rangeEstimate ? "(~" + rangeEstimate + " km menzil)" : ""}
                </span>
              </div>

              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">Boş Ağırlık & HP/Ton</span>
                <span className="font-bold text-white text-sm">
                  {weightValue ? weightValue + " kg" : "-"} {hpPerTonne ? "(" + hpPerTonne + " HP/Ton)" : ""}
                </span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">Bagaj Hacmi & Boyutlar</span>
                <span className="font-bold text-white text-sm">
                  {trunkVol ? trunkVol + " Litre" : "-"} {dimensions ? "• " + dimensions : ""}
                </span>
              </div>
            </div>
            {report.performanceUsage.assessment && (
              <p className="text-xs text-slate-300 bg-slate-800/30 p-3 rounded-xl border border-slate-700/30 leading-relaxed">
                {report.performanceUsage.assessment}
              </p>
            )}
          </div>
        )}

        {/* 5. COMMON PROBLEMS */}
        {(activeTab === "all" || activeTab === "problems") && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                <h2 className="text-base font-bold text-white">Kronik Arıza Kayıtları ({report.commonProblems?.length || 0})</h2>
              </div>
            </div>

            <div className="space-y-3">
              {(!report.commonProblems || report.commonProblems.length === 0) ? (
                <p className="text-xs text-slate-400 italic">Bu varyant için onaylanmış yüksek riskli kronik arıza kaydı bulunmamaktadır.</p>
              ) : (
                (showAllProblems || activeTab === "problems" ? report.commonProblems : report.commonProblems.slice(0, 3)).map((prob) => (
                  <div key={prob.id || prob.title} className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{prob.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {prob.severity} RİSK
                      </span>
                    </div>
                    {prob.description && <p className="text-slate-300 leading-relaxed">{prob.description}</p>}
                    <div className="pt-2 border-t border-slate-700/40 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-400">
                      <div><strong className="text-slate-200">Belirtiler:</strong> {prob.symptoms?.join(", ") || "-"}</div>
                      <div><strong className="text-slate-200">Teşhis Adımı:</strong> {prob.diagnosisSteps?.join(", ") || "-"}</div>
                    </div>
                  </div>
                ))
              )}

              {activeTab === "all" && report.commonProblems?.length > 3 && (
                <button
                  onClick={() => setShowAllProblems(!showAllProblems)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-all text-center cursor-pointer"
                >
                  {showAllProblems ? "En Kritik 3 Sorunu Göster" : `Tüm Kronik Sorunları Göster (${report.commonProblems.length})`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 6. MAINTENANCE & COST */}
        {(activeTab === "all" || activeTab === "maint") && report.maintenanceOwnership && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <DollarSign className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">Bakım & Sahiplik Maliyetleri</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">Periyodik Bakım Aralığı</span>
                <span className="font-bold text-white text-sm">
                  {report.maintenanceOwnership.periodicIntervalKm ? `${report.maintenanceOwnership.periodicIntervalKm} km / ` : ""}
                  {report.maintenanceOwnership.periodicIntervalMonths ? `${report.maintenanceOwnership.periodicIntervalMonths} Ay` : "1 Yıl"}
                </span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">Tahmini Yıllık Maliyet</span>
                <span className="font-bold text-amber-400 text-sm">{report.maintenanceOwnership.estimatedAnnualCostCategory || "ORTA"}</span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">Kritik Bakım Not Sayısı</span>
                <span className="font-bold text-white text-sm">{report.maintenanceOwnership.criticalMaintenanceNotes?.length || 0} Not</span>
              </div>
            </div>
            {report.maintenanceOwnership.criticalMaintenanceNotes?.length > 0 && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-1">
                <span className="font-bold text-amber-400 block">⚠️ Kritik Bakım & Servis Uyarısı</span>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  {report.maintenanceOwnership.criticalMaintenanceNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 7. USAGE SCENARIOS */}
        {(activeTab === "all" || activeTab === "scenarios") && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Info className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-bold text-white">Kullanım Senaryoları Uygunluk Matrisi</h2>
            </div>
            {(!report.usageScenarios || report.usageScenarios.length === 0) ? (
              <p className="text-xs text-slate-400 italic">Bu varyanta özel senaryo verisi derlenmektedir.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {report.usageScenarios.map((scen, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-800/40 border border-slate-700/40 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{scen.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        scen.suitability === 'MÜKEMMEL' || scen.suitability === 'UYGUN'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : scen.suitability === 'KISMEN_UYGUN'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      }`}>
                        {scen.suitability}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{scen.reasoning}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 8. PRE-PURCHASE CHECKS */}
        {(activeTab === "all" || activeTab === "checks") && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-5 h-5 text-orange-400" />
              <h2 className="text-base font-bold text-white">Satın Alma Öncesi Ekspertiz Kontrol Listesi</h2>
            </div>
            {(!report.prePurchaseChecks || report.prePurchaseChecks.length === 0) ? (
              <p className="text-xs text-slate-400 italic">Ekspertiz kontrol adımları hazırlanıyor.</p>
            ) : (
              <div className="space-y-2.5 text-xs">
                {report.prePurchaseChecks.map((chk, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-800/40 border border-slate-700/40 rounded-xl flex items-start gap-3">
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
            )}
          </div>
        )}

        {/* 9. SELLER QUESTIONS */}
        {(activeTab === "all" || activeTab === "sellerQuestions") && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <HelpCircle className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-bold text-white">Satıcıya Sorulacak Kritik Sorular</h2>
            </div>
            {(!report.sellerQuestions || report.sellerQuestions.length === 0) ? (
              <p className="text-xs text-slate-400 italic">Satıcı mülakat soruları hazırlanıyor.</p>
            ) : (
              <div className="space-y-2.5 text-xs">
                {report.sellerQuestions.map((q, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-800/40 border border-slate-700/40 rounded-xl space-y-1.5">
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
            )}
          </div>
        )}

        {/* 10. RECALLS */}
        {(activeTab === "all" || activeTab === "recalls") && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">Geri Çağırma & Servis Bültenleri ({report.recalls?.length || 0})</h2>
            </div>
            {(!report.recalls || report.recalls.length === 0) ? (
              <p className="text-xs text-slate-400 italic">Bu varyanta ilişkin resmi fabrika geri çağırma bülteni kaydı bulunmamaktadır.</p>
            ) : (
              <div className="space-y-3 text-xs">
                {report.recalls.map((rec, idx) => (
                  <div key={idx} className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300 text-sm">{rec.title}</span>
                      {rec.campaignCode && (
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {rec.campaignCode}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 leading-relaxed">{rec.riskDescription}</p>
                    {rec.remedyDescription && (
                      <p className="text-emerald-400 text-[11px]">🛠️ <strong>Fabrika Çözümü:</strong> {rec.remedyDescription}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 11. LISTING ANALYSIS (ONLY IN LISTING_REPORT MODE) */}
        {isListingMode && (activeTab === "all" || activeTab === "listingAnalysis") && report.listingAnalysis && (
          <div className="bg-slate-900/80 border border-purple-900/40 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-purple-800/40 pb-3">
              <Car className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-bold text-white">İlan İnceleme Katmanı</h2>
            </div>
            <p className="text-xs text-slate-200 bg-purple-950/30 p-3 rounded-xl border border-purple-800/30 leading-relaxed">
              {report.listingAnalysis.listingSummary}
            </p>

            {report.listingAnalysis.mileageAgeAnalysis && (
              <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-1 text-xs">
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
              <div className="p-3.5 bg-slate-800/40 border border-slate-700/40 rounded-xl space-y-1 text-xs">
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

        {/* 12. FINAL VERDICT */}
        {(activeTab === "all" || activeTab === "verdict") && report.finalVerdict && (
          <div className="bg-slate-900/80 border border-emerald-900/40 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-emerald-800/40 pb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">{report.finalVerdict.title || "Nihai Karar & Değerlendirme"}</h2>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-100 bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-800/30 leading-relaxed">
              {report.finalVerdict.overallAssessment}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                <span className="font-bold text-emerald-400 block">✅ Hangi Şartlarda Alınır?</span>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  {report.finalVerdict.proceedIf?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1">
                <span className="font-bold text-rose-400 block">🛑 Hangi Şartlarda Vazgeçilmeli?</span>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  {report.finalVerdict.walkAwayIf?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {report.finalVerdict.topThreeActions?.length > 0 && (
              <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-1 text-xs">
                <span className="font-bold text-orange-400 block">📌 Yapılması Gereken İlk 3 Aksiyon</span>
                <ol className="list-decimal list-inside space-y-1 text-slate-200">
                  {report.finalVerdict.topThreeActions.map((act, idx) => (
                    <li key={idx}>{act}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* 13. DATA QUALITY & CONFIDENCE */}
        {(activeTab === "all" || activeTab === "quality") && report.dataQuality && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Activity className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-bold text-white">Veri Güvenilirliği & Kanıt Matrisi</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <span className="font-bold text-emerald-400 text-base">{report.dataQuality.verifiedFactCount} Kanıt Kaydı</span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <span className="text-slate-400 block text-[10px]">Veri Güven Skoru</span>
                <span className="font-bold text-blue-400 text-base">%{report.scoring?.dataConfidenceScore?.value ?? 90}</span>
              </div>
            </div>
            {report.dataQuality.supportingFacts?.length > 0 && (
              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-200 block">📌 Raporda Kullanılan Doğrulanmış Gerçekler</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {report.dataQuality.supportingFacts.map((fact, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-800/30 border border-slate-700/30 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-200 block">{fact.label}</span>
                        <span className="text-[10px] text-slate-400">{String(fact.value)}</span>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded font-mono bg-slate-700 text-slate-300">
                        {fact.source}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}