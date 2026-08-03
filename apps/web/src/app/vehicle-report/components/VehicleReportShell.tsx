"use client";

import React, { useState, useEffect } from "react";
import { ComprehensiveVehicleReport } from "@used-car-intelligence/shared";
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
  summary: "Karar Özeti",
  identity: "Araç Kimliği",
  engineTrans: "Motor & Şanzıman",
  perf: "Performans & Sürüş",
  problems: "Kronik Sorunlar",
  recalls: "Geri Çağırmalar",
  maint: "Bakım & Maliyet",
  scenarios: "Kullanım Senaryoları",
  checks: "Ekspertiz Kontrolleri",
  sellerQuestions: "Satıcı Soruları",
  listingAnalysis: "İlan İncelemesi",
  verdict: "Nihai Karar",
  quality: "Veri Güvenilirliği",
};

interface VehicleReportShellProps {
  report: ComprehensiveVehicleReport;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function VehicleReportShell({ report, onRefresh, isRefreshing }: VehicleReportShellProps) {
  const [activeTab, setActiveTab] = useState<string>("summary");
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
            {report.vehicleIdentity.engineCode ? `${report.vehicleIdentity.engineCode} • ` : ""}
            {report.vehicleIdentity.transmissionName} ({report.vehicleIdentity.fuelType})
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

      {/* 4+2 Score Indicator Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Buyability Score */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${getScoreColor(report.scoring.buyabilityScore.value)}`}>
          <div className="flex items-center justify-between text-xs font-semibold opacity-90 mb-1">
            <span>Satın Alınabilirlik</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold my-1">
            {report.scoring.buyabilityScore.value !== null ? `${report.scoring.buyabilityScore.value} / 100` : "Veri Yetersiz"}
          </div>
          <span className="text-[11px] opacity-75 font-medium">Genel Değerlendirme</span>
        </div>

        {/* Technical Risk Score */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${getScoreColor(report.scoring.technicalRiskScore.value, true)}`}>
          <div className="flex items-center justify-between text-xs font-semibold opacity-90 mb-1">
            <span>Teknik Risk</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold my-1">
            {report.scoring.technicalRiskScore.value !== null ? `${report.scoring.technicalRiskScore.value} / 100` : "Veri Yetersiz"}
          </div>
          <span className="text-[11px] font-semibold opacity-90">
            {report.scoring.technicalRiskScore.value !== null && report.scoring.technicalRiskScore.value > 60 
              ? "⚠️ Yüksek Risk Seviyesi" 
              : "Dengeli Risk Seviyesi"}
          </span>
        </div>

        {/* Variant Match Confidence */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${getScoreColor(report.scoring.variantConfidenceScore.value)}`}>
          <div className="flex items-center justify-between text-xs font-semibold opacity-90 mb-1">
            <span>Varyant Eşleşmesi</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold my-1">
            %{report.scoring.variantConfidenceScore.value ?? 85}
          </div>
          <span className="text-[11px] opacity-75 font-medium">{report.vehicleIdentity.variantMatchConfidence} Eşleşme</span>
        </div>

        {/* Evidence Confidence */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${getScoreColor(report.scoring.dataConfidenceScore.value)}`}>
          <div className="flex items-center justify-between text-xs font-semibold opacity-90 mb-1">
            <span>Veri Güven Skoru</span>
            <Activity className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold my-1">
            %{report.scoring.dataConfidenceScore.value ?? 90}
          </div>
          <span className="text-[11px] opacity-75 font-medium">{report.dataQuality.verifiedFactCount} Doğrulanmış Kayıt</span>
        </div>
      </div>

      {/* Navigation Bar for Desktop Tabs */}
      <div className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar">
        {Object.entries(categoryLabels).map(([key, label]) => {
          if (key === "listingAnalysis" && !isListingMode) return null;
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Section Content Area (Natural Page Scroll) */}
      <div className="space-y-4">
        {/* EXECUTIVE SUMMARY */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div 
            onClick={() => toggleAccordion("summary")}
            className="flex items-center justify-between cursor-pointer border-b border-slate-800 pb-3 mb-4"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-400" />
              <h2 className="text-base font-bold text-white">{report.executiveSummary.title}</h2>
            </div>
            {openAccordions.summary ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>

          {openAccordions.summary && (
            <div className="space-y-4 text-xs leading-relaxed text-slate-300">
              <p className="text-sm font-semibold text-slate-100 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                {report.executiveSummary.oneSentenceSummary}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.executiveSummary.strongestAdvantage && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <span className="font-bold text-emerald-400 block mb-1">💪 En Güçlü Avantaj</span>
                    <span>{report.executiveSummary.strongestAdvantage}</span>
                  </div>
                )}
                {report.executiveSummary.biggestRisk && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                    <span className="font-bold text-rose-400 block mb-1">⚠️ En Büyük Risk</span>
                    <span>{report.executiveSummary.biggestRisk}</span>
                  </div>
                )}
              </div>

              {report.executiveSummary.keyWarnings?.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <span className="font-bold text-amber-400 block mb-1">📢 Önemli Uyarılar</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {report.executiveSummary.keyWarnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* LISTING ANALYSIS (ONLY IN LISTING_REPORT MODE) */}
        {isListingMode && report.listingAnalysis && (
          <div className="bg-slate-900/80 border border-purple-900/40 rounded-2xl p-5">
            <div 
              onClick={() => toggleAccordion("listingAnalysis")}
              className="flex items-center justify-between cursor-pointer border-b border-purple-800/40 pb-3 mb-4"
            >
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-bold text-white">İlan İnceleme Katmanı</h2>
              </div>
              {openAccordions.listingAnalysis ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>

            {openAccordions.listingAnalysis && (
              <div className="space-y-4 text-xs leading-relaxed text-slate-300">
                <p className="text-slate-200 bg-purple-950/30 p-3 rounded-xl border border-purple-800/30">
                  {report.listingAnalysis.listingSummary}
                </p>

                {/* Mileage & Age Analysis */}
                {report.listingAnalysis.mileageAgeAnalysis && (
                  <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-1">
                    <span className="font-bold text-orange-400 block">🚗 Kilometre & Yaş Oran Analizi</span>
                    <p>{report.listingAnalysis.mileageAgeAnalysis.assessment}</p>
                    <span className="text-[11px] text-slate-400 block italic mt-1">
                      {report.listingAnalysis.mileageAgeAnalysis.isApproximateNotice}
                    </span>
                  </div>
                )}

                {/* Contradiction Warnings */}
                {report.listingAnalysis.contradictions?.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-bold text-rose-400 block">⚡ İlan Çelişki Uyarısı</span>
                    {report.listingAnalysis.contradictions.map((c, idx) => (
                      <div key={idx} className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                        <span className="font-bold text-rose-300 block">{c.title}</span>
                        <span>{c.explanation}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Damage & Paint Assessment */}
                <div className="p-3 bg-slate-800/40 border border-slate-700/40 rounded-xl space-y-1">
                  <span className="font-bold text-slate-200 block">🎨 Kaporta & Tramer Dökümü</span>
                  <ul className="list-disc list-inside space-y-1">
                    {report.listingAnalysis.damageAssessment.map((d, idx) => (
                      <li key={idx}>{d}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* COMMON PROBLEMS SECTION */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div 
            onClick={() => toggleAccordion("problems")}
            className="flex items-center justify-between cursor-pointer border-b border-slate-800 pb-3 mb-4"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400" />
              <h2 className="text-base font-bold text-white">Kronik Arıza Kayıtları ({report.commonProblems?.length || 0})</h2>
            </div>
            {openAccordions.problems ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>

          {openAccordions.problems && (
            <div className="space-y-3">
              {report.commonProblems?.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Bu varyant için onaylanmış yüksek riskli kronik arıza bulunmamaktadır.</p>
              ) : (
                (showAllProblems ? report.commonProblems : report.commonProblems.slice(0, 3)).map((prob) => (
                  <div key={prob.id} className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{prob.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {prob.severity} RİSK
                      </span>
                    </div>
                    <p className="text-slate-300">{prob.description}</p>
                    <div className="pt-2 border-t border-slate-700/40 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-400">
                      <div><strong className="text-slate-200">Belirtiler:</strong> {prob.symptoms?.join(", ") || "-"}</div>
                      <div><strong className="text-slate-200">Teşhis Adımı:</strong> {prob.diagnosisSteps?.join(", ") || "-"}</div>
                    </div>
                  </div>
                ))
              )}

              {report.commonProblems?.length > 3 && (
                <button
                  onClick={() => setShowAllProblems(!showAllProblems)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-all text-center"
                >
                  {showAllProblems ? "En Kritik 3 Sorunu Göster" : `Tüm Kronik Sorunları Göster (${report.commonProblems.length})`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* FINAL VERDICT SECTION */}
        <div className="bg-slate-900/80 border border-emerald-900/40 rounded-2xl p-5">
          <div 
            onClick={() => toggleAccordion("verdict")}
            className="flex items-center justify-between cursor-pointer border-b border-emerald-800/40 pb-3 mb-4"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">{report.finalVerdict.title}</h2>
            </div>
            {openAccordions.verdict ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>

          {openAccordions.verdict && (
            <div className="space-y-4 text-xs leading-relaxed text-slate-300">
              <p className="text-sm font-semibold text-slate-100 bg-emerald-950/20 p-3 rounded-xl border border-emerald-800/30">
                {report.finalVerdict.overallAssessment}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                  <span className="font-bold text-emerald-400 block">✅ Hangi Şartlarda Alınır?</span>
                  <ul className="list-disc list-inside space-y-1">
                    {report.finalVerdict.proceedIf?.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1">
                  <span className="font-bold text-rose-400 block">🛑 Hangi Şartlarda Vazgeçilmeli?</span>
                  <ul className="list-disc list-inside space-y-1">
                    {report.finalVerdict.walkAwayIf?.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {report.finalVerdict.topThreeActions?.length > 0 && (
                <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-1">
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
        </div>
      </div>
    </div>
  );
}
