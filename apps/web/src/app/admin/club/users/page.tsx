"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function AdminClubUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"CREATED_AT_ASC" | "CREATED_AT_DESC">("CREATED_AT_ASC");
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  const fetchUsers = async (cursor?: string, append: boolean = false) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    if (!append) setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery.trim()) queryParams.set("search", searchQuery.trim());
      queryParams.set("sort", sortOrder);
      queryParams.set("limit", "25");
      if (cursor) queryParams.set("cursor", cursor);

      let res = await fetch(`${API_URL}/api/admin/club/users?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status === 404) {
        res = await fetch(`${API_URL}/admin/club/users?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (res.ok) {
        const data = await res.json();
        if (append) {
          setUsers((prev) => [...prev, ...(data.users || [])]);
        } else {
          setUsers(data.users || []);
        }
        setNextCursor(data.nextCursor);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const toggleSelectUser = (userId: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setSelectedUserIds(next);
  };

  const toggleSelectPage = () => {
    const allCurrentIds = users.map((u) => u.id);
    const allSelected = allCurrentIds.every((id) => selectedUserIds.has(id));
    const next = new Set(selectedUserIds);

    if (allSelected) {
      allCurrentIds.forEach((id) => next.delete(id));
    } else {
      allCurrentIds.forEach((id) => next.add(id));
    }
    setSelectedUserIds(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white">Kullanıcı Listesi & Yönetimi</h2>
          <p className="text-xs text-slate-400">
            Tüm kayıtlı kullanıcıları otomatik listeleyin, filtreleyin ve kısıtlamaları inceleyin.
          </p>
        </div>

        {selectedUserIds.size > 0 && (
          <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/20 px-3.5 py-2 rounded-xl">
            <span className="text-xs font-bold text-orange-400">{selectedUserIds.size} Kullanıcı Seçildi</span>
            <Link
              href={`/admin/club/messages?selected=${Array.from(selectedUserIds).join(",")}`}
              className="px-3 py-1 rounded-lg bg-orange-500 text-white font-black text-xs hover:bg-orange-400 transition"
            >
              Toplu Mesaj Gönder ✉️
            </Link>
            <button
              onClick={() => setSelectedUserIds(new Set())}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Temizle
            </button>
          </div>
        )}
      </div>

      {/* Search & Sort Toolbar */}
      <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Müşteri No (TS-2608-000123), Ad Soyad veya E-posta ara..."
            className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition whitespace-nowrap"
          >
            Ara
          </button>
        </form>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 w-full sm:w-auto justify-end">
          <span>Sıralama:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
          >
            <option value="CREATED_AT_ASC">Kayıt Tarihi: Eskiden Yeniye (Varsayılan)</option>
            <option value="CREATED_AT_DESC">Kayıt Tarihi: Yeniden Eskiye</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500 mx-auto mb-3"></div>
          <p className="text-xs font-bold">Kullanıcılar Yükleniyor...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="p-12 rounded-2xl border border-white/10 bg-slate-900/60 text-center space-y-1">
          <span className="text-2xl block">🔍</span>
          <p className="text-xs font-bold text-slate-300">Kullanıcı Bulunamadı</p>
          <p className="text-[11px] text-slate-500">Arama kriterinize uygun kayıt yok.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-slate-400 font-bold">
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={users.length > 0 && users.every((u) => selectedUserIds.has(u.id))}
                      onChange={toggleSelectPage}
                      className="rounded border-white/20 text-orange-500 focus:ring-orange-500"
                    />
                  </th>
                  <th className="p-3.5">Müşteri No & Kullanıcı</th>
                  <th className="p-3.5">Paket & Rol</th>
                  <th className="p-3.5">Kayıt Tarihi</th>
                  <th className="p-3.5 text-center">Yorum Sayısı</th>
                  <th className="p-3.5 text-center">Durum</th>
                  <th className="p-3.5 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition">
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.has(u.id)}
                        onChange={() => toggleSelectUser(u.id)}
                        className="rounded border-white/20 text-orange-500 focus:ring-orange-500"
                      />
                    </td>
                    <td className="p-3.5">
                      <div className="space-y-0.5">
                        <Link
                          href={`/admin/club/users/${u.customerNo}`}
                          className="font-bold text-white hover:text-orange-400 transition block"
                        >
                          {u.customerNo} — {u.displayName}
                        </Link>
                        {u.email && <span className="text-[11px] text-slate-500 block">{u.email}</span>}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {u.badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                            {typeof u.badge === "object" ? u.badge.label || u.badge.code : u.badge}
                          </span>
                        )}
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                          {u.role}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="p-3.5 text-center font-bold text-white">{u.commentCount}</td>
                    <td className="p-3.5 text-center">
                      {u.isBanned ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          BANLI
                        </span>
                      ) : u.isMuted ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          MUTELÜ
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          AKTİF
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <Link
                        href={`/admin/club/users/${u.customerNo}`}
                        className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
                      >
                        Detay ➡️
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {nextCursor && (
            <div className="text-center pt-2">
              <button
                onClick={() => fetchUsers(nextCursor, true)}
                className="px-6 py-2.5 rounded-xl border border-white/10 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-200 transition"
              >
                Daha Fazla Yükle (25 Kayıt) ⬇️
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
