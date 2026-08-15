'use client';

import React, { useEffect, useState } from 'react';
import { X, Search, RefreshCw, Eye, User, FileText, MessageSquare, ShieldAlert } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

interface ClubKpiDetailDrawerProps {
  kpiKey: string | null;
  kpiTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenPostDrawer?: (post: any) => void;
  onOpenCommentDrawer?: (comment: any) => void;
  onOpenUserDrawer?: (userId: string) => void;
  onOpenModeratorDrawer?: (mod: any) => void;
  onOpenRestrictionDrawer?: (res: any) => void;
}

export function ClubKpiDetailDrawer({
  kpiKey,
  kpiTitle,
  isOpen,
  onClose,
  onOpenPostDrawer,
  onOpenCommentDrawer,
  onOpenUserDrawer,
  onOpenModeratorDrawer,
  onOpenRestrictionDrawer,
}: ClubKpiDetailDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen || !kpiKey) {
      setItems([]);
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    setLoading(true);

    let endpoint = '';
    if (kpiKey === 'TOTAL_POSTS') endpoint = `${API_BASE_URL}/admin/club/posts?status=ALL`;
    else if (kpiKey === 'PUBLISHED_POSTS') endpoint = `${API_BASE_URL}/admin/club/posts?status=PUBLISHED`;
    else if (kpiKey === 'TOTAL_COMMENTS') endpoint = `${API_BASE_URL}/admin/club/comments?status=ALL`;
    else if (kpiKey === 'PENDING_COMMENTS') endpoint = `${API_BASE_URL}/admin/club/comments?status=PENDING_REVIEW`;
    else if (kpiKey === 'ACTIVE_MODERATORS') endpoint = `${API_BASE_URL}/admin/club/moderators`;
    else if (kpiKey === 'ACTIVE_MUTES') endpoint = `${API_BASE_URL}/admin/club/restrictions?type=MUTE&status=ACTIVE`;
    else if (kpiKey === 'ACTIVE_BANS') endpoint = `${API_BASE_URL}/admin/club/restrictions?type=BAN&status=ACTIVE`;

    if (!endpoint) {
      setLoading(false);
      return;
    }

    fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [isOpen, kpiKey]);

  if (!isOpen || !kpiKey) return null;

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const str = JSON.stringify(item).toLowerCase();
    return str.includes(q);
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-slate-950 border-l border-white/10 w-full max-w-2xl h-full flex flex-col shadow-2xl font-mono text-xs">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold">
              📊
            </span>
            <div>
              <h3 className="font-bold text-white text-sm">{kpiTitle} — Detay Listesi</h3>
              <p className="text-[11px] text-slate-400">Toplam {filteredItems.length} Gerçek Kayıt Listeleniyor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-white/5 bg-slate-900/40">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Liste içerisinde filtrele..."
              className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono"
            />
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Kayıtlar yükleniyor...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-slate-500">Bu kısıt altında kayıt bulunmuyor.</div>
          ) : (
            filteredItems.map((item, idx) => {
              const isPost = kpiKey === 'TOTAL_POSTS' || kpiKey === 'PUBLISHED_POSTS';
              const isComment = kpiKey === 'TOTAL_COMMENTS' || kpiKey === 'PENDING_COMMENTS';
              const isModerator = kpiKey === 'ACTIVE_MODERATORS';
              const isRestriction = kpiKey === 'ACTIVE_MUTES' || kpiKey === 'ACTIVE_BANS';

              return (
                <div
                  key={item.id || idx}
                  onClick={() => {
                    if (isPost && onOpenPostDrawer) onOpenPostDrawer(item);
                    else if (isComment && onOpenCommentDrawer) onOpenCommentDrawer(item);
                    else if (isModerator && onOpenModeratorDrawer) onOpenModeratorDrawer(item);
                    else if (isRestriction && onOpenRestrictionDrawer) onOpenRestrictionDrawer(item);
                  }}
                  className="p-3 bg-slate-900/50 hover:bg-slate-900 border border-white/5 hover:border-orange-500/40 rounded-xl flex items-center justify-between cursor-pointer transition"
                >
                  <div className="space-y-1 max-w-[80%]">
                    {isPost && (
                      <>
                        <span className="font-bold text-white font-sans text-xs block truncate">{item.title || 'Başlıksız Gönderi'}</span>
                        <span className="text-[11px] text-slate-400 block font-sans truncate">{item.content}</span>
                        <span className="text-[10px] text-slate-500 font-mono block">Yazar: {item.authorFormatted}</span>
                      </>
                    )}
                    {isComment && (
                      <>
                        <span className="font-bold text-slate-200 font-sans text-xs block truncate">{item.content}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">Yazar: {item.authorFormatted} {item.badge ? `(${item.badge.label})` : ''}</span>
                      </>
                    )}
                    {isModerator && (
                      <>
                        <span className="font-bold text-white font-sans text-xs block">{item.userFormatted}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">Atayan: {item.assignedByFormatted}</span>
                      </>
                    )}
                    {isRestriction && (
                      <>
                        <span className="font-bold text-white font-sans text-xs block">{item.userFormatted}</span>
                        <span className="text-[10px] text-rose-400 font-mono block">Neden: {item.reason || 'Belirtilmedi'}</span>
                      </>
                    )}
                  </div>

                  <span className="text-orange-400 text-xs font-bold font-mono">Detay ➔</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
