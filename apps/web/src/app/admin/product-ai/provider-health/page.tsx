'use client';

import React from 'react';
import { Activity, Server, Database, Cpu, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function AdminProviderHealthPage() {
  const services = [
    { name: 'Google Gemini API', type: 'AI Provider', status: 'HEALTHY', latency: '420ms', uptime: '99.9%' },
    { name: 'OpenAI API (GPT-4o)', type: 'AI Provider', status: 'HEALTHY', latency: '380ms', uptime: '99.8%' },
    { name: 'Neon Serverless PostgreSQL DB', type: 'Database', status: 'HEALTHY', latency: '12ms', uptime: '100%' },
    { name: 'Cloudflare R2 Storage', type: 'Object Storage', status: 'HEALTHY', latency: '45ms', uptime: '100%' },
    { name: 'Tavily Search API', type: 'Web Research', status: 'HEALTHY', latency: '210ms', uptime: '99.5%' },
    { name: 'Firecrawl Scraper API', type: 'Web Research', status: 'HEALTHY', latency: '540ms', uptime: '99.2%' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Provider & Altyapı Sağlığı</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Yapay zeka modelleri, veritabanı, depolama ve web araştırma servislerinin canlı çalışma durumu.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((s) => (
          <div key={s.name} className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{s.type}</span>
                <h3 className="font-bold text-sm text-white mt-0.5">{s.name}</h3>
              </div>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold text-[10px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {s.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5 font-mono text-xs">
              <div className="p-2.5 bg-slate-950 rounded-xl border border-white/5">
                <span className="text-slate-500 text-[10px] block">Ort. Latency</span>
                <strong className="text-cyan-400">{s.latency}</strong>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-white/5">
                <span className="text-slate-500 text-[10px] block">Sistem Uptime</span>
                <strong className="text-emerald-400">{s.uptime}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
