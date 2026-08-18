'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '@/utils/apiConfig';
import { ClubCommentDrawer } from '../components/ClubCommentDrawer';
import { ClubPostDrawer } from '../components/ClubPostDrawer';
import { AdminUserDrawer } from '../../components/AdminUserDrawer';
import {
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  User,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Loader2,
  X,
  Trash2,
} from 'lucide-react';

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

  // Action Loading & Toast State
  const [actingCommentId, setActingCommentId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Permanent Delete Confirmation Modal State
  const [deleteConfirmComment, setDeleteConfirmComment] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Drawer States
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

        // Fetch comments for expanded posts under current status filter
        if (norm.length > 0) {
          const firstPostId = norm[0].post.id;
          setExpandedPostIds(new Set([firstPostId]));
          fetchPostComments(firstPostId);
        }
      }
    } catch (e) {
      console.error('Fetch comment groups error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPostComments = async (postId: string) => {
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
        const comments = Array.isArray(data) ? data : data.comments || [];
        setPostCommentsMap((prev) => ({ ...prev, [postId]: comments }));
      }
    } catch (e) {
      console.error('Fetch post comments error:', e);
    } finally {
      setLoadingCommentsMap((prev) => ({ ...prev, [postId]: false }));
    }
  };

  useEffect(() => {
    // Reset cache on status filter change
    setPostCommentsMap({});
    fetchGroups();
  }, [statusFilter]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleRowAction = async (
    e: React.MouseEvent,
    comment: any,
    targetStatus: 'VISIBLE' | 'PENDING_REVIEW' | 'HIDDEN'
  ) => {
    e.stopPropagation();
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token || actingCommentId) return;

    setActingCommentId(comment.id);
    try {
      let endpoint = 'restore';
      let body: any = undefined;
      let feedback = 'Yorum yeniden yayına alındı.';

      if (targetStatus === 'PENDING_REVIEW') {
        endpoint = 'review';
        feedback = 'Yorum incelemeye alındı.';
      } else if (targetStatus === 'HIDDEN') {
        endpoint = 'hide';
        body = JSON.stringify({ reason: 'Moderatör tarafından gizlendi' });
        feedback = 'Yorum gizlendi.';
      } else if (targetStatus === 'VISIBLE') {
        endpoint = 'restore';
        feedback = comment.status === 'PENDING_REVIEW' ? 'İnceleme iptal edildi, yorum yeniden yayında.' : 'Yorum yeniden yayına alındı.';
      }

      const res = await fetch(`${API_BASE_URL}/admin/club/comments/${comment.id}/${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
      });

      if (res.ok) {
        showToast(feedback);
        // Clear cached comments map and refetch fresh groups
        setPostCommentsMap({});
        fetchGroups();
      } else {
        alert('İşlem gerçekleştirilemedi.');
      }
    } catch (err) {
      alert('Hata oluştu.');
    } finally {
      setActingCommentId(null);
    }
  };

  const openDeleteConfirmModal = (e: React.MouseEvent, comment: any) => {
    e.stopPropagation();
    setDeleteConfirmComment(comment);
  };

  const handleExecutePermanentDelete = async () => {
    if (!deleteConfirmComment) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/comments/${deleteConfirmComment.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const altRes = await fetch(`${API_BASE_URL}/admin/club/comments/${deleteConfirmComment.id}/delete`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!altRes.ok) throw new Error('Yorum silinemedi.');
      }

      showToast('Yorum kalıcı olarak silindi.');
      setDeleteConfirmComment(null);
      if (selectedComment?.id === deleteConfirmComment.id) {
        setSelectedComment(null);
      }
      setPostCommentsMap({});
      fetchGroups();
    } catch (err) {
      alert('Yorum silinirken hata oluştu.');
    } finally {
      setDeleting(false);
    }
  };

  const toggleExpandPost = async (postId: string) => {
    const next = new Set(expandedPostIds);
    const willOpen = !next.has(postId);

    if (willOpen) next.add(postId);
    else next.delete(postId);
    setExpandedPostIds(next);

    if (willOpen && !postCommentsMap[postId]) {
      fetchPostComments(postId);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-mono text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight font-sans">
            Tork Scout Club — Yorumlar & Moderasyon Operasyonu
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Gönderi bazında gruplanmış topluluk yorumları, onay inceleme kuyruğu ve doğrudan satır içi moderasyon aksiyonları.
          </p>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-between font-sans">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
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
        <div className="p-12 text-center text-slate-500 font-medium text-xs bg-slate-900/60 rounded-2xl border border-white/10 font-sans">
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
                  <div className="p-4 bg-slate-900/40 space-y-3">
                    {isLoadingComments ? (
                      <div className="p-6 text-center text-slate-400 font-mono">Yorumlar yükleniyor...</div>
                    ) : comments.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-xs font-sans">
                        Bu gönderiye ait seçili filtre altında yorum bulunmuyor.
                      </div>
                    ) : (
                      comments.map((comment: any) => {
                        const isVisible = comment.status === 'VISIBLE';
                        const isPending = comment.status === 'PENDING_REVIEW';
                        const isHidden = comment.status === 'HIDDEN';
                        const isActing = actingCommentId === comment.id;

                        return (
                          <div
                            key={comment.id}
                            onClick={() => setSelectedComment(comment)}
                            className="p-3.5 bg-slate-950/90 hover:bg-slate-950 rounded-xl border border-white/5 hover:border-orange-500/40 transition cursor-pointer space-y-2 font-sans"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-white text-xs">
                                    {comment.authorFormatted || comment.author?.username || 'Kullanıcı'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    ({comment.author?.customerNo || 'TS-MEMBER'})
                                  </span>
                                  {comment.badge && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                      {comment.badge.label}
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">
                                  {comment.content}
                                </p>
                              </div>

                              {/* Row Right: Status Badge & Actions */}
                              <div className="flex flex-col items-end gap-2 whitespace-nowrap">
                                <div className="flex items-center gap-2 font-mono">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isVisible
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : isPending
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    }`}
                                  >
                                    {isVisible ? 'YAYINDA' : isPending ? 'İNCELEMEDE' : 'GİZLİ'}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {new Date(comment.createdAt).toLocaleDateString('tr-TR')}
                                  </span>
                                </div>

                                {/* Row Level Moderation Buttons */}
                                <div className="flex items-center gap-1.5 font-mono">
                                  {isActing ? (
                                    <span className="px-3 py-1 text-slate-400 text-[11px] font-bold flex items-center gap-1">
                                      <Loader2 className="w-3 h-3 animate-spin" /> İşleniyor...
                                    </span>
                                  ) : (
                                    <>
                                      {/* STATE: VISIBLE (Yayında) */}
                                      {isVisible && (
                                        <>
                                          <button
                                            onClick={(e) => handleRowAction(e, comment, 'PENDING_REVIEW')}
                                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                                          >
                                            <AlertCircle className="w-3 h-3" /> İncelemeye Al
                                          </button>
                                          <button
                                            onClick={(e) => handleRowAction(e, comment, 'HIDDEN')}
                                            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                                          >
                                            <EyeOff className="w-3 h-3" /> Yorumu Gizle
                                          </button>
                                        </>
                                      )}

                                      {/* STATE: PENDING_REVIEW (İncelemede) */}
                                      {isPending && (
                                        <>
                                          <button
                                            onClick={(e) => handleRowAction(e, comment, 'VISIBLE')}
                                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                                          >
                                            <RotateCcw className="w-3 h-3" /> İncelemeyi İptal Et / Yayına Al
                                          </button>
                                          <button
                                            onClick={(e) => handleRowAction(e, comment, 'HIDDEN')}
                                            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                                          >
                                            <EyeOff className="w-3 h-3" /> Yorumu Gizle
                                          </button>
                                        </>
                                      )}

                                      {/* STATE: HIDDEN (Gizli) */}
                                      {isHidden && (
                                        <>
                                          <button
                                            onClick={(e) => handleRowAction(e, comment, 'VISIBLE')}
                                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                                          >
                                            <RotateCcw className="w-3 h-3" /> Yayına Geri Al
                                          </button>
                                          <button
                                            onClick={(e) => handleRowAction(e, comment, 'PENDING_REVIEW')}
                                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                                          >
                                            <AlertCircle className="w-3 h-3" /> İncelemeye Al
                                          </button>
                                          <button
                                            onClick={(e) => openDeleteConfirmModal(e, comment)}
                                            className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-600/30 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                                          >
                                            <Trash2 className="w-3 h-3" /> Kalıcı Sil
                                          </button>
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Permanent Delete */}
      {deleteConfirmComment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </span>
              <h4 className="font-bold text-white text-base font-sans">Yorumu Kalıcı Sil</h4>
            </div>

            <p className="text-slate-300 font-sans text-xs leading-relaxed">
              Bu işlem yalnızca seçili yorumu kaldıracaktır. Kullanıcının hesabı, Club üyeliği veya diğer içerikleri etkilenmeyecektir. Silinen yorum tekrar yayına alınamaz.
            </p>

            <div className="p-3 bg-slate-900/80 border border-white/5 rounded-xl text-[11px] font-sans text-slate-400">
              <span className="font-bold text-white block mb-0.5">Silinecek Yorum:</span>
              "{deleteConfirmComment.content}"
            </div>

            <div className="flex justify-end gap-2 font-sans pt-2">
              <button
                onClick={() => setDeleteConfirmComment(null)}
                disabled={deleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                onClick={handleExecutePermanentDelete}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Yorumu Kalıcı Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawers */}
      <ClubCommentDrawer
        comment={selectedComment}
        isOpen={!!selectedComment}
        onClose={() => setSelectedComment(null)}
        onDeleteComment={(comment) => {
          setDeleteConfirmComment(comment);
        }}
        onRefresh={() => {
          setPostCommentsMap({});
          fetchGroups();
        }}
        onOpenUserDrawer={(userId) => setSelectedUserId(userId)}
        onOpenPostDrawer={(post) => setSelectedPost(post)}
      />

      <ClubPostDrawer
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        onRefresh={() => {
          setPostCommentsMap({});
          fetchGroups();
        }}
        onOpenUserDrawer={(userId) => setSelectedUserId(userId)}
      />

      {selectedUserId && (
        <AdminUserDrawer
          userId={selectedUserId}
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onRefresh={() => {
            setPostCommentsMap({});
            fetchGroups();
          }}
        />
      )}
    </div>
  );
}
