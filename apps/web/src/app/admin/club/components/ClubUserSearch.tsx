'use client';

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/utils/apiConfig';

interface UserSearchResult {
  id: string;
  customerNo: string;
  displayName: string;
  role: string;
  subscriptionTier: string;
  email?: string;
  badge?: { label: string; code: string };
}

interface ClubUserSearchProps {
  onSelectUser?: (userId: string) => void;
}

export default function ClubUserSearch({ onSelectUser }: ClubUserSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch(query.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = async (q: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    setSearching(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/users/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('User search error:', e);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="relative w-full font-mono text-xs">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Müşteri No (TS-2608-000123), Ad Soyad veya Kullanıcı Adı yazın..."
          className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition font-mono"
        />
        {searching && (
          <div className="absolute right-3 top-3.5">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-orange-500"></div>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden max-h-64 overflow-y-auto divide-y divide-white/5 font-mono text-xs">
          {results.map((user) => (
            <div
              key={user.id}
              onClick={() => {
                if (onSelectUser) onSelectUser(user.id);
                setQuery('');
                setResults([]);
              }}
              className="p-3 hover:bg-white/5 cursor-pointer transition flex items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-100 font-sans">{user.displayName}</span>
                  {user.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold">
                      {user.badge.label}
                    </span>
                  )}
                </div>
                {user.email && <p className="text-[11px] text-slate-400 mt-0.5">{user.email}</p>}
              </div>

              <span className="text-orange-400 font-bold text-xs">Kullanıcıyı Gör ➔</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
