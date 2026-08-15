'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '@/utils/apiConfig';
import { ClubCommentDrawer } from '../components/ClubCommentDrawer';
import { ClubPostDrawer } from '../components/ClubPostDrawer';
import { AdminUserDrawer } from '../../components/AdminUserDrawer';
import { MessageSquare, ChevronDown, ChevronRight, Eye, EyeOff, User } from 'lucide-react';

interface PostGroup {
  post: {
    id: string;
    title: string;
    status: string;
    publishedAt?: string;
    createdAt: string;
  };
  counts: {
    total: number;
    visible: number;
    pendingReview: number;
    hidden: number;
    deleted: number;
  };
  commentsList?: any[];
}

function normalizeCommentGroups(data: any): PostGroup[] {
  if (!data || !Array.isArray(data)) return [];

  if (data.length > 0 && data[0]?.post && data[0]?.counts) {
    return data.filter((g) => g && g.post && g.post.id);
  }

  const groupMap: Record<string, PostGroup & { commentsList: any[] }> = {};
  for (const c of data) {
    if (!c) continue;
    const pId = c.post?.id || c.postId || 'general';
    const pTitle = c.post?.title || 'Genel Topluluk Gönderisi';
    const pStatus = c.post?.status || 'PUBLISHED';
    const pDate = c.post?.createdAt || c.createdAt;

    if (!groupMap[pId]) {
      groupMap[pId] = {
        post: { id: pId, title: pTitle, status: pStatus, createdAt: pDate },
        counts: { total: 0, visible: 0, pendingReview: 0, hidden: 0, deleted: 0 },
        commentsList: [],
      };
    }

    groupMap[pId].counts.total++;
    if (c.status === 'VISIBLE') groupMap[pId].counts.visible++;
    else if (c.status === 'PENDING_REVIEW') groupMap[pId].counts.pendingReview++;
    else if (c.status === 'HIDDEN') groupMap[pId].counts.hidden++;
    else if (c.status === 'DELETED') groupMap[pId].counts.deleted++;

    groupMap[pId].commentsList.push(c);
  }

  return Object.values(groupMap);
}

export default function AdminClubCommentsPage() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status') || 'ALL';

  const [groups, setGroups] = useState<PostGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPostIds, setExpandedPostIds] = useState<Set<string>>(new Set());
  const [postCommentsMap, setPostCommentsMap] = useState<Record<string, any[]>>({});
  const [loadingCommentsMap, setLoadingCommentsMap] = useState<Record<string, boolean>>({});

  const [selectedComment, setSelectedComment] = useState<any | null>(null);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchGroups = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    setLoading(true);
    try {
      let res = await fetch(
        `${API_BASE_URL}/admin/club/comments/groups?status=${encodeURIComponent(statusFilter)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        res = await fetch(`${API_BASE_URL}/admin/club/comments?status=${encodeURIComponent(statusFilter)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (res.ok) {
        const data = await res.json();
        const norm = normalizeCommentGroups(data);
        setGroups(norm);

        const initialMap: Record<string, any[]> = {};
        norm.forEach((g) => {
          if (g.commentsList && g.commentsList.length > 0) {
            initialMap[g.post.id] = g.commentsList;
          }
        });
        setPostCommentsMap((prev) => ({ ...initialMap, ...prev }));

        if (norm.length > 0) {
          setExpandedPostIds(new Set([norm[0].post.id]));
        }
      }
    } catch (e) {
      console.error('Fetch comment groups error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [statusFilter]);

  const toggleExpandPost = async (postId: string) => {
    const next = new Set(expandedPostIds);
    const willOpen = !next.has(postId);

    if (willOpen) next.add(postId);
    else next.delete(postId);
    setExpandedPostIds(next);

    if (willOpen && !postCommentsMap[postId]) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) return;

      setLoadingCommentsMap((prev) => ({ ...prev, [postId]: true }));
      try {
        const res = await fetch(
          `${API_BASE_URL}/admin/club/posts/${postId}/comments?status=${encodeURIComponent(statusFilter)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setPostCommentsMap((prev) => ({ ...prev, [postId]: data.comments || data }));
        }
      } catch (e) {
        console.error('Fetch post comments error:', e);
      } finally {
        setLoadingCommentsMap((prev) => ({ ...prev, [postId]: false }));
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-mono text-xs">
      <div className="pb-4 border-b border-white/10">
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight font-sans">
          Tork Scout Club — Yorumlar & Moderasyon
        </h1>
        <p className="text-xs text-slate-400 font-sans mt-1">
          Gönderi bazında gruplanmış topluluk yorumları, onay onaylama kuyruğu ve içerik gizleme eylemleri.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { key: 'ALL', label: 'Tüm Yorumlar' },
          { key: 'PENDING_REVIEW', label: 'İncelemede Bekleyenler' },
          { key: 'VISIBLE', label: 'Yayındakiler' },
          { key: 'HIDDEN', label: 'Gizlenenler' },
        ].map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/club/comments?status=${tab.key}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              statusFilter === tab.key
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Accordion Group List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium">Yorum grupları yükleniyor...</div>
      ) : groups.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-medium text-xs bg-slate-900/60 rounded-2xl border border-white/10">
          Seçili kısıt altında yorum bulunmuyor.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const isExpanded = expandedPostIds.has(group.post.id);
            const comments = postCommentsMap[group.post.id] || group.commentsList || [];
            const isLoadingComments = loadingCommentsMap[group.post.id];

            return (
              <div
                key={group.post.id}
                className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden"
              >
                {/* Accordion Header */}
                <div
                  onClick={() => toggleExpandPost(group.post.id)}
                  className="p-4 bg-slate-950/60 hover:bg-slate-950 transition flex items-center justify-between cursor-pointer border-b border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                    <div>
                      <h3 className="font-bold text-white text-sm font-sans">{group.post.title}</h3>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono">
                        <span>Toplam: {group.counts.total}</span>
                        {group.counts.pendingReview > 0 && (
                          <span className="text-amber-400 font-bold font-sans">
                            · {group.counts.pendingReview} Bekliyor
                          </span>
                        )}
                        {group.counts.hidden > 0 && (
                          <span className="text-rose-400">· {group.counts.hidden} Gizlendi</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="text-orange-400 text-xs font-bold font-mono">
                    {isExpanded ? 'Yorumları Kapat ▲' : 'Yorumları Göster ▼'}
                  </span>
                </div>

                {/* Accordion Body */}
                {isExpanded && (
                  <div className="p-4 bg-slate-900/40">
                    {isLoadingComments ? (
                      <div className="p-6 text-center text-slate-400">Yorumlar yükleniyor...</div>
                    ) : comments.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-xs">
                        Bu gönderiye ait yorum bulunmuyor.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {comments.map((comment: any) => {
                          const isHidden = comment.status === 'HIDDEN';
                          const isPending = comment.status === 'PENDING_REVIEW';

                          return (
                            <div
                              key={comment.id}
                              onClick={() => setSelectedComment(comment)}
                              className="p-3 bg-slate-950/80 hover:bg-slate-950 rounded-xl border border-white/5 hover:border-orange-500/40 transition cursor-pointer space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white font-sans text-xs">
                                    {comment.authorFormatted || comment.author?.name || 'Kullanıcı'}
                                  </span>
                                  {comment.badge && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                      {comment.badge.label}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isHidden
                                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                        : isPending
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    }`}
                                  >
                                    {isHidden ? 'GİZLENDİ' : isPending ? 'İNCELEMEDE' : 'YAYINDA'}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {new Date(comment.createdAt).toLocaleString('tr-TR')}
                                  </span>
                                </div>
                              </div>

                              <p className="text-slate-300 font-sans text-xs whitespace-pre-wrap leading-relaxed">
                                {comment.content}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Drawers */}
      <ClubCommentDrawer
        comment={selectedComment}
        isOpen={!!selectedComment}
        onClose={() => setSelectedComment(null)}
        onRefresh={fetchGroups}
        onOpenUserDrawer={(userId) => setSelectedUserId(userId)}
        onOpenPostDrawer={(post) => setSelectedPost(post)}
      />

      <ClubPostDrawer
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        onRefresh={fetchGroups}
        onOpenUserDrawer={(userId) => setSelectedUserId(userId)}
      />

      {selectedUserId && (
        <AdminUserDrawer
          userId={selectedUserId}
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onRefresh={fetchGroups}
        />
      )}
    </div>
  );
}
