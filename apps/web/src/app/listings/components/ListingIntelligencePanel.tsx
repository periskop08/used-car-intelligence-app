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
    <div className="w-full space-y-4">
      {/* Top Tab Bar Separating Report vs Chatbot */}
      <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl shadow-lg">
        <button
          onClick={() => setActiveTab("report")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "report"
              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>📄 Araç Raporu</span>
        </button>

        <button
          onClick={() => setActiveTab("chatbot")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "chatbot"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>💬 Chatbot ile Konuş</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "report" ? (
        <ListingVehicleReportPanel listingId={listingId} />
      ) : (
        <ListingAiAdvisorCard listingId={listingId} />
      )}
    </div>
  );
}
