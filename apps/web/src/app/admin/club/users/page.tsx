"use client";

import React, { useState } from "react";
import Link from "next/link";
import ClubUserSearch from "../components/ClubUserSearch";

export default function AdminClubUsersPage() {
  const [selectedUser, setSelectedUser] = useState<any>(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-white">Club Kullanıcı Yönetimi ve Profil Arama</h2>
        <p className="text-xs text-slate-400">
          Müşteri numarası (`TS-2608-000123`), isim veya kullanıcı adı ile arama yapın.
        </p>
      </div>

      <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/60 space-y-4">
        <label className="text-xs font-bold text-slate-300 block">Kullanıcı Arama Masası:</label>
        <ClubUserSearch onSelectUser={(u) => setSelectedUser(u)} />

        {selectedUser && (
          <div className="mt-6 p-4 rounded-xl border border-orange-500/30 bg-orange-500/10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">{selectedUser.displayName}</span>
                {selectedUser.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                    {selectedUser.badge.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Rol: {selectedUser.role}</p>
            </div>

            <Link
              href={`/admin/club/users/${selectedUser.customerNo}`}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs shadow-md transition"
            >
              Detaylı Profili Aç ➡️
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
