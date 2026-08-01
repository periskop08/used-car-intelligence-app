"use client";

import React, { useEffect, useState } from "react";
import ClubStatsGrid, { ClubDashboardStat } from "./components/ClubStatsGrid";
import PendingCommentsTable from "./components/PendingCommentsTable";
import RecentPostsTable from "./components/RecentPostsTable";
import ActiveRestrictionsCard from "./components/ActiveRestrictionsCard";
import RecentClubActivity from "./components/RecentClubActivity";
import ClubEngagementSummary from "./components/ClubEngagementSummary";
import ClubUserSearch from "./components/ClubUserSearch";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function AdminClubOverviewPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/club/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500 mx-auto mb-3"></div>
        <p className="text-xs font-bold">Genel Bakış Verileri Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Search Bar */}
      <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl">
        <label className="text-xs font-bold text-slate-400 mb-2 block">
          🔍 Hızlı Kullanıcı ve Müşteri Numarası Arama:
        </label>
        <ClubUserSearch />
      </div>

      {/* KPI Stats Grid */}
      {dashboardData?.stats && <ClubStatsGrid stats={dashboardData.stats} />}

      {/* Pending Comments Table */}
      <PendingCommentsTable
        comments={dashboardData?.pendingComments || []}
        onRefresh={fetchDashboardData}
      />

      {/* Main Operational Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RecentPostsTable posts={dashboardData?.recentPosts || []} />
        <ActiveRestrictionsCard restrictions={dashboardData?.activeRestrictions || []} />
      </div>

      {/* Analytics and Audit Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ClubEngagementSummary summary={dashboardData?.engagementSummary} />
        <RecentClubActivity activities={dashboardData?.recentActivity || []} />
      </div>
    </div>
  );
}
