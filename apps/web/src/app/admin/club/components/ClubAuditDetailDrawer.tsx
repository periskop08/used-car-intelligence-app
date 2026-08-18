'use client';

import React from 'react';
import { X, ShieldCheck, User, Clock, FileText, CheckCircle2 } from 'lucide-react';

interface ClubAuditDetailDrawerProps {
  log: any | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenUserDrawer?: (userId: string) => void;
}

export function ClubAuditDetailDrawer({
  log,
  isOpen,
  onClose,
  onOpenUserDrawer,
}: ClubAuditDetailDrawerProps) {
  if (!isOpen || !log) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-slate-950 border-l border-white/10 w-full max-w-xl h-full flex flex-col shadow-2xl font-mono text-xs">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold">
              📋
            </span>
            <div>
              <h3 className="font-bold text-white text-sm">Audit Log Detayı</h3>
              <p className="text-[11px] text-slate-400">ID: {log.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Action Badge */}
          <div className="p-4 bg-slate-900/80 border border-white/5 rounded-xl flex items-center justify-between">
            <span className="text-slate-400 font-bold">Aksiyon Kodu:</span>
            <span className="font-bold font-mono text-orange-400 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              {log.actionType || log.action}
            </span>
          </div>

          {/* Actor Info */}
          <div className="p-4 bg-slate-900/40 border border-white/5 rounded-xl space-y-2">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">İşlemi Yapan Yetkili</span>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white font-sans text-sm block">
                  {log.actor?.username || log.actor?.firstName || 'Sistem Yöneticisi'}
                </span>
                <span className="text-slate-400 text-[11px]">
                  Rol: {log.actorRole || 'ADMIN'}
                </span>
              </div>
              {onOpenUserDrawer && log.actorId && (
                <button
                  onClick={() => onOpenUserDrawer(log.actorId)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-orange-400 rounded-lg transition font-bold flex items-center gap-1 cursor-pointer"
                >
                  <User className="w-3 h-3" /> Kullanıcıyı Gör
                </button>
              )}
            </div>
          </div>

          {/* Target & Reason */}
          <div className="p-4 bg-slate-900/40 border border-white/5 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Hedef Türü:</span>
              <span className="text-white font-bold">{log.targetType || 'Club Entity'}</span>
            </div>
            {log.targetUserId && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Hedef Kullanıcı ID:</span>
                <span className="text-orange-400 font-mono font-bold">{log.targetUserId}</span>
              </div>
            )}
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Neden / Not</span>
              <p className="text-slate-200 text-xs font-sans whitespace-pre-wrap">
                {log.reason || 'Neden belirtilmedi.'}
              </p>
            </div>
          </div>

          {/* Timestamp */}
          <div className="p-4 bg-slate-900/40 border border-white/5 rounded-xl space-y-1">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">İşlem Zamanı</span>
            <span className="text-slate-200 font-bold text-xs">
              {new Date(log.createdAt).toLocaleString('tr-TR')}
            </span>
          </div>
        </div>

        {/* Read only note */}
        <div className="p-4 border-t border-white/10 bg-slate-900/80 text-center text-slate-500 text-[11px]">
          Audit log kayıtları değiştirilemez ve silinemez (Read-Only Immutable).
        </div>
      </div>
    </div>
  );
}
