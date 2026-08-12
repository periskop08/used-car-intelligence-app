'use client';

import React from 'react';
import { Activity, Server, Database, Cpu, CheckCircle2, RefreshCw } from 'lucide-react';

export default function AdminSystemHealthPage() {
  const infraServices = [
    { name: 'NestJS API Core Server', type: 'Application Node', status: 'HEALTHY', latency: '18ms', uptime: '99.99%' },
    { name: 'Neon PostgreSQL Database', type: 'Primary Database', status: 'HEALTHY', latency: '12ms', uptime: '100%' },
    { name: 'Redis Cache & Session Store', type: 'In-Memory Cache', status: 'HEALTHY', latency: '2ms', uptime: '100%' },
    { name: 'BullMQ Background Job Queue', type: 'Async Worker', status: 'HEALTHY', latency: '5ms', uptime: '99.9%' },
    { name: 'Cloudflare R2 Object Storage', type: 'CDN & Media Storage', status: 'HEALTHY', latency: '35ms', uptime: '100%' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Sistem Altyapı Sağlığı</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            API sunucuları, veritabanı, önbellek ve kuyruk işleyicilerinin canlı çalışma metrikleri.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {infraServices.map((s) => (
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
                <span className="text-slate-500 text-[10px] block">Yanıt Süresi</span>
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
