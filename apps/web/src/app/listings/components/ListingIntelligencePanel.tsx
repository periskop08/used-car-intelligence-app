"use client";

import React, { useState } from "react";
import ListingVehicleReportPanel from "./ListingVehicleReportPanel";
import ListingAiAdvisorCard from "./ListingAiAdvisorCard";
import { FileText, MessageSquare } from "lucide-react";

interface ListingIntelligencePanelProps {
  listingId: string;
}

export default function ListingIntelligencePanel({ listingId }: ListingIntelligencePanelProps) {
  const [activeTab, setActiveTab] = useState<"report" | "chatbot">("report");

  return (
    <div className="w-full space-y-5">
      {/* Top Tab Bar Separating Report vs Chatbot */}
      <div className="flex items-center gap-2 bg-[#0d1326] border border-white/10 p-1.5 rounded-2xl shadow-xl">
        <button
          type="button"
          onClick={() => setActiveTab("report")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "report"
              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Araç Raporu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("chatbot")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "chatbot"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chatbot ile Konuş</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "report" ? (
        <ListingVehicleReportPanel listingId={listingId} />
      ) : (
        <ListingAiAdvisorCard listingId={listingId} />
      )}
    </div>
  );
}
