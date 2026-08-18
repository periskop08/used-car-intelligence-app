'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '@/utils/apiConfig';
import { ClubKpiDetailDrawer } from '../components/ClubKpiDetailDrawer';
import { ClubPostDrawer } from '../components/ClubPostDrawer';
import { ClubCommentDrawer } from '../components/ClubCommentDrawer';
import { AdminUserDrawer } from '../../components/AdminUserDrawer';

export default function AdminClubReportsPage() {
  const searchParams = useSearchParams();
  const sectionFilter = searchParams.get('section') || 'ENGAGEMENT';
  const rangeFilter = searchParams.get('range') || '30D';

  const [reportsData, setReportsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Clickable KPI Drawer State
  const [activeKpiKey, setActiveKpiKey] = useState<string | null>(null);
  const [activeKpiTitle, setActiveKpiTitle] = useState<string>('');

  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [selectedComment, setSelectedComment] = useState<any | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchReports = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/club/reports?section=${sectionFilter}&range=${rangeFilter}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setReportsData(data);
      }
    } catch (e) {
      console.error('Fetch reports error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [sectionFilter, rangeFilter]);

  const metrics = reportsData?.metrics || {};

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-mono text-xs">
      <div>
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight font-sans">
          Tork Scout Club — Etkileşim ve Performans Raporları
        </h1>
        <p className="text-xs text-slate-400 font-sans mt-1">
          Topluluk yorumları, yayın durumu, içerik performansı ve paket kullanım dağılımları.
        </p>
      </div>

      {/* Section & Range Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { key: 'ENGAGEMENT', label: 'Etkileşim' },
            { key: 'MODERATION', label: 'Moderasyon' },
            { key: 'CONTENT', label: 'İçerik Performansı' },
            { key: 'PACKAGE_USAGE', label: 'Paket Kullanımı' },
          ].map((sec) => (
            <Link
              key={sec.key}
              href={`/admin/club/reports?section=${sec.key}&range=${rangeFilter}`}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                sectionFilter === sec.key
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white'
              }`}
            >
              {sec.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {[
            { key: '7D', label: 'Son 7 Gün' },
            { key: '30D', label: 'Son 30 Gün' },
            { key: 'YTD', label: 'Bu Yıl' },
          ].map((r) => (
            <Link
              key={r.key}
              href={`/admin/club/reports?section=${sectionFilter}&range=${r.key}`}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                rangeFilter === r.key
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white'
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium">Rapor verileri yükleniyor...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* KPI Card 1: Visitors Tracking */}
          <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/60 font-mono">
            <span className="text-xs font-bold text-slate-400 block mb-1">Club Ziyaretçileri</span>
            <span className="text-3xl font-black text-white block">
              {metrics.totalVisitors !== undefined && metrics.totalVisitors !== null
                ? metrics.totalVisitors.toLocaleString('tr-TR')
                : '—'}
            </span>
            <span className="text-[11px] text-slate-500 block mt-2 font-sans">
              {metrics.totalVisitors ? 'Gerçek takip verisi' : 'Veri mevcut değil'}
            </span>
          </div>

          {/* KPI Card 2: Unique Commenters */}
          <div
            onClick={() => {
              setActiveKpiKey('TOTAL_COMMENTS');
              setActiveKpiTitle('Tekil Yorumcu Listesi');
            }}
            className="p-6 rounded-2xl border border-white/10 hover:border-orange-500/40 bg-slate-900/60 transition cursor-pointer font-mono"
          >
            <span className="text-xs font-bold text-slate-400 block mb-1">Tekil Yorumcu Üyeler</span>
            <span className="text-3xl font-black text-orange-400 block">
              {metrics.uniqueCommenters !== undefined ? metrics.uniqueCommenters.toLocaleString('tr-TR') : 0}
            </span>
            <span className="text-[11px] text-slate-400 block mt-2 font-sans">İncele ➔</span>
          </div>

          {/* KPI Card 3: Total Comments */}
          <div
            onClick={() => {
              setActiveKpiKey('TOTAL_COMMENTS');
              setActiveKpiTitle('Toplam Yorum Listesi');
            }}
            className="p-6 rounded-2xl border border-white/10 hover:border-orange-500/40 bg-slate-900/60 transition cursor-pointer font-mono"
          >
            <span className="text-xs font-bold text-slate-400 block mb-1">Toplam Yorum Hacmi</span>
            <span className="text-3xl font-black text-white block">
              {metrics.totalComments !== undefined ? metrics.totalComments.toLocaleString('tr-TR') : 0}
            </span>
            <span className="text-[11px] text-slate-400 block mt-2 font-sans">İncele ➔</span>
          </div>

          {/* KPI Card 4: Hidden Comments */}
          <div
            onClick={() => {
              setActiveKpiKey('PENDING_COMMENTS');
              setActiveKpiTitle('Gizlenen Yorum Listesi');
            }}
            className="p-6 rounded-2xl border border-white/10 hover:border-orange-500/40 bg-slate-900/60 transition cursor-pointer font-mono"
          >
            <span className="text-xs font-bold text-slate-400 block mb-1">Gizlenen Yorumlar</span>
            <span className="text-3xl font-black text-rose-400 block">
              {metrics.hiddenComments !== undefined ? metrics.hiddenComments.toLocaleString('tr-TR') : 0}
            </span>
            <span className="text-[11px] text-slate-400 block mt-2 font-sans">İncele ➔</span>
          </div>
        </div>
      )}

      {/* Drawers */}
      <ClubKpiDetailDrawer
        kpiKey={activeKpiKey}
        kpiTitle={activeKpiTitle}
        isOpen={!!activeKpiKey}
        onClose={() => setActiveKpiKey(null)}
        onOpenPostDrawer={(post) => setSelectedPost(post)}
        onOpenCommentDrawer={(comment) => setSelectedComment(comment)}
        onOpenUserDrawer={(userId) => setSelectedUserId(userId)}
      />

      <ClubPostDrawer
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        onRefresh={fetchReports}
        onOpenUserDrawer={(userId) => setSelectedUserId(userId)}
      />

      <ClubCommentDrawer
        comment={selectedComment}
        isOpen={!!selectedComment}
        onClose={() => setSelectedComment(null)}
        onRefresh={fetchReports}
        onOpenUserDrawer={(userId) => setSelectedUserId(userId)}
      />

      {selectedUserId && (
        <AdminUserDrawer
          userId={selectedUserId}
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onRefresh={fetchReports}
        />
      )}
    </div>
  );
}
