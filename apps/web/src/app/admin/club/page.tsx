'use client';

import React, { useEffect, useState } from 'react';
import ClubStatsGrid from './components/ClubStatsGrid';
import PendingCommentsTable from './components/PendingCommentsTable';
import RecentPostsTable from './components/RecentPostsTable';
import ActiveRestrictionsCard from './components/ActiveRestrictionsCard';
import RecentClubActivity from './components/RecentClubActivity';
import ClubEngagementSummary from './components/ClubEngagementSummary';
import ClubUserSearch from './components/ClubUserSearch';

import { ClubKpiDetailDrawer } from './components/ClubKpiDetailDrawer';
import { ClubPostDrawer } from './components/ClubPostDrawer';
import { ClubCommentDrawer } from './components/ClubCommentDrawer';
import { ClubRestrictionDrawer } from './components/ClubRestrictionDrawer';
import { ClubAuditDetailDrawer } from './components/ClubAuditDetailDrawer';
import { AdminUserDrawer } from '../components/AdminUserDrawer';
import { API_BASE_URL } from '@/utils/apiConfig';

export default function AdminClubOverviewPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Drawer States
  const [activeKpiKey, setActiveKpiKey] = useState<string | null>(null);
  const [activeKpiTitle, setActiveKpiTitle] = useState<string>('');

  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [selectedComment, setSelectedComment] = useState<any | null>(null);
  const [selectedRestriction, setSelectedRestriction] = useState<any | null>(null);
  const [selectedAuditLog, setSelectedAuditLog] = useState<any | null>(null);

  const [userDrawerUserId, setUserDrawerUserId] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    setLoading(true);
    try {
      let res = await fetch(`${API_BASE_URL}/admin/club/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (e) {
      console.error('Club dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const defaultStats = [
    { key: 'TOTAL_POSTS', label: 'Toplam Gönderi', value: dashboardData?.stats?.[0]?.value ?? 0, secondaryText: '0 yayında · 0 taslak', severity: 'NORMAL' },
    { key: 'PUBLISHED_POSTS', label: 'Yayındaki Gönderi', value: dashboardData?.stats?.[1]?.value ?? 0, secondaryText: 'Topluluğa açık gönderiler', severity: 'INFO' },
    { key: 'TOTAL_COMMENTS', label: 'Toplam Yorum', value: dashboardData?.stats?.[2]?.value ?? 0, secondaryText: 'Bugün 0 yorum', severity: 'NORMAL' },
    { key: 'PENDING_COMMENTS', label: 'İncelemede Bekleyen', value: dashboardData?.stats?.[3]?.value ?? 0, secondaryText: 'Bekleyen inceleme yok', severity: 'NORMAL' },
    { key: 'ACTIVE_MODERATORS', label: 'Aktif Moderatör', value: dashboardData?.stats?.[4]?.value ?? 0, secondaryText: 'Yetkilendirilmiş moderatörler', severity: 'NORMAL' },
    { key: 'ACTIVE_MUTES', label: 'Geçici Susturulan', value: dashboardData?.stats?.[5]?.value ?? 0, secondaryText: 'Süre kısıtlaması olan üyeler', severity: 'NORMAL' },
    { key: 'ACTIVE_BANS', label: 'Yasaklı Kullanıcı', value: dashboardData?.stats?.[6]?.value ?? 0, secondaryText: 'Aktif ban yok', severity: 'NORMAL' },
  ];

  const statsToRender = dashboardData?.stats?.length ? dashboardData.stats : defaultStats;

  const handleKpiCardClick = (key: string, label: string) => {
    setActiveKpiKey(key);
    setActiveKpiTitle(label);
  };

  return (
    <div className="space-y-6">
      {/* 1. 7 Clickable KPI Cards */}
      <ClubStatsGrid stats={statsToRender as any} onCardClick={handleKpiCardClick} />

      {/* 2. Compact User Search Bar */}
      <div className="p-3.5 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl font-mono text-xs">
        <label className="text-[11px] font-bold text-slate-400 mb-1.5 block">
          🔍 Hızlı Kullanıcı ve Müşteri Numarası Arama:
        </label>
        <ClubUserSearch onSelectUser={(userId) => setUserDrawerUserId(userId)} />
      </div>

      {/* 3. Upper Operation Row (%52 / %48) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <PendingCommentsTable
            comments={dashboardData?.pendingComments || []}
            onRefresh={fetchDashboardData}
            onCommentClick={(comment) => setSelectedComment(comment)}
          />
        </div>
        <div className="lg:col-span-6">
          <RecentPostsTable
            posts={dashboardData?.recentPosts || []}
            onPostClick={(post) => setSelectedPost(post)}
          />
        </div>
      </div>

      {/* 4. Lower Operation Row (%32 / %28 / %40) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <ActiveRestrictionsCard
            restrictions={dashboardData?.activeRestrictions || []}
            onRestrictionClick={(res) => setSelectedRestriction(res)}
          />
        </div>
        <div className="lg:col-span-3">
          <RecentClubActivity
            activities={dashboardData?.recentActivity || []}
            onActivityClick={(item) => setSelectedAuditLog(item)}
          />
        </div>
        <div className="lg:col-span-5">
          <ClubEngagementSummary summary={dashboardData?.engagementSummary} />
        </div>
      </div>

      {/* Reusable Drawers */}
      <ClubKpiDetailDrawer
        kpiKey={activeKpiKey}
        kpiTitle={activeKpiTitle}
        isOpen={!!activeKpiKey}
        onClose={() => setActiveKpiKey(null)}
        onOpenPostDrawer={(post) => setSelectedPost(post)}
        onOpenCommentDrawer={(comment) => setSelectedComment(comment)}
        onOpenRestrictionDrawer={(res) => setSelectedRestriction(res)}
        onOpenUserDrawer={(userId) => setUserDrawerUserId(userId)}
      />

      <ClubPostDrawer
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        onRefresh={fetchDashboardData}
        onOpenUserDrawer={(userId) => setUserDrawerUserId(userId)}
      />

      <ClubCommentDrawer
        comment={selectedComment}
        isOpen={!!selectedComment}
        onClose={() => setSelectedComment(null)}
        onRefresh={fetchDashboardData}
        onOpenUserDrawer={(userId) => setUserDrawerUserId(userId)}
        onOpenPostDrawer={(post) => setSelectedPost(post)}
      />

      <ClubRestrictionDrawer
        restriction={selectedRestriction}
        isOpen={!!selectedRestriction}
        onClose={() => setSelectedRestriction(null)}
        onRefresh={fetchDashboardData}
        onOpenUserDrawer={(userId) => setUserDrawerUserId(userId)}
      />

      <ClubAuditDetailDrawer
        log={selectedAuditLog}
        isOpen={!!selectedAuditLog}
        onClose={() => setSelectedAuditLog(null)}
        onOpenUserDrawer={(userId) => setUserDrawerUserId(userId)}
      />

      {userDrawerUserId && (
        <AdminUserDrawer
          userId={userDrawerUserId}
          isOpen={!!userDrawerUserId}
          onClose={() => setUserDrawerUserId(null)}
          onRefresh={fetchDashboardData}
        />
      )}
    </div>
  );
}
