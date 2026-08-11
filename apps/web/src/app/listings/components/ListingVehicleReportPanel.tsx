"use client";

import React, { useState, useEffect } from "react";
import VehicleReportShell from "../../vehicle-report/components/VehicleReportShell";
import { ComprehensiveVehicleReport } from "@used-car-intelligence/shared";
import { FileText, Sparkles, AlertCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface ListingVehicleReportPanelProps {
  listingId: string;
}

export default function ListingVehicleReportPanel({ listingId }: ListingVehicleReportPanelProps) {
  const [report, setReport] = useState<ComprehensiveVehicleReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentReport();
  }, [listingId]);

  const fetchCurrentReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
      const res = await fetch(`${API_URL}/vehicle-reports/by-listing/${listingId}/current`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.reportData) {
          setReport(data.reportData as ComprehensiveVehicleReport);
        }
      }
    } catch (err: any) {
      console.error("Rapor çekilemedi:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateReport = async (force: boolean = false) => {
    setIsGenerating(true);
    setError(null);
    try {
      const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
      if (!token) {
        setError("Rapor oluşturmak için lütfen giriş yapın.");
        setIsGenerating(false);
        return;
      }

      const idempotencyKey = `listing_report_${listingId}_${Date.now()}`;
      const res = await fetch(`${API_URL}/vehicle-reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mode: "LISTING_REPORT",
          listingId,
          idempotencyKey,
          forceRefresh: force,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Rapor oluşturma isteği başarısız oldu.");
      }

      const data = await res.json();
      const reportId = data.reportId;

      // Poll until completed
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        if (attempts > 15) {
          clearInterval(pollInterval);
          setIsGenerating(false);
          setError("Rapor hazırlanıyor, lütfen sayfayı birazdan yenileyin.");
          return;
        }

        const pollRes = await fetch(`${API_URL}/vehicle-reports/${reportId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (pollRes.ok) {
          const pollData = await pollRes.json();
          if (pollData.status === "COMPLETED" || pollData.status === "SAFE_FALLBACK") {
            clearInterval(pollInterval);
            setReport(pollData.reportData as ComprehensiveVehicleReport);
            setIsGenerating(false);
          }
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Rapor oluşturulurken bir hata oluştu.");
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 bg-[#090d1a] border border-white/10 rounded-[28px] text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium">Rapor verileri kontrol ediliyor...</span>
      </div>
    );
  }

  if (report) {
    return (
      <VehicleReportShell 
        report={report} 
        onRefresh={() => handleCreateReport(true)} 
        isRefreshing={isGenerating} 
      />
    );
  }

  return (
    <div className="bg-[#090d1a] border border-white/10 rounded-[28px] p-8 text-center space-y-5 shadow-2xl relative overflow-hidden">
      <div className="w-14 h-14 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex items-center justify-center mx-auto text-orange-400">
        <FileText className="w-7 h-7" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-xl font-extrabold text-white">Bu İlan İçin Araç Raporu Alın</h3>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
          Aracın kronik sorunları, recall kayıtları, ekspertiz kontrol listesi, satıcı soruları ve bu ilana özel çelişki analizi 1 rapor hakkı ile hazırlanır.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 max-w-md mx-auto flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={() => handleCreateReport(false)}
        disabled={isGenerating}
        className="px-6 py-3.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2.5 mx-auto disabled:opacity-50 cursor-pointer"
      >
        {isGenerating ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Rapor Hazırlanıyor...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4.5 h-4.5" />
            <span>Aracı incele & Al Raporu Al (1 Hak)</span>
          </>
        )}
      </button>
    </div>
  );
}
