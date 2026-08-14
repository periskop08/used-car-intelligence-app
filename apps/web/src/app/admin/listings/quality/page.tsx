'use client';

import React, { useEffect, useState, Suspense } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  User,
  Eye,
  ChevronRight,
  Activity,
  Calendar,
  HelpCircle,
  FileImage,
  UserX,
  Link2Off,
  Clock,
  Layers,
  SearchX,
  CopyX,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';
import { AdminUserDrawer } from '../../components/AdminUserDrawer';

const HEALTH_CHECK_CARDS = [
  {
    key: 'brokenMedia',
    title: 'Bozuk Görselli İlanlar',
    description: 'DB kaydı olan fakat storage object missing veya görseli eksik aktif ilanlar.',
    icon: FileImage,
  },
  {
    key: 'orphanSellerRelations',
    title: 'Kullanıcı İlişkisi Bozuk İlanlar',
    description: 'Satıcı ID ilişkisi boş veya Kullanıcı (User) kaydı kopyalanmış orphan ilanlar.',
    icon: UserX,
  },
  {
    key: 'variantRelationIssues',
    title: 'Araç/Varyant Bağlantısı Bozuk İlanlar',
    description: 'VehicleVariantId tanımlı fakat araç veritabanında karşılığı bulunamayan ilanlar.',
    icon: Link2Off,
  },
  {
    key: 'statusInconsistency',
    title: 'Durum Tutarsızlığı Olan İlanlar',
    description: 'Yaşam döngüsü statüsü ile moderasyon/yayın zamanları arasında teknik çelişkiler.',
    icon: Clock,
  },
  {
    key: 'visibilityIssues',
    title: 'Yayın Görünürlüğü Sorunu Olan İlanlar',
    description: 'Aktif statüde olup arama dizininde fiyat/varyant eksikliği yüzünden gizlenen ilanlar.',
    icon: SearchX,
  },
  {
    key: 'expiredActiveListings',
    title: 'Süresi Dolduğu Halde Aktif İlanlar',
    description: 'Yayın ve paket süresi dolduğu halde otomatik pasife geçemeyen aktif ilanlar.',
    icon: Layers,
  },
  {
    key: 'duplicateCollisionListings',
    title: 'Mükerrer / Çakışan Aktif İlanlar',
    description: 'Aynı satıcı tarafından aynı araç özellikleri ile aynı anda oluşturulmuş çakışan kayıtlar.',
    icon: CopyX,
  },
];

function DataHealthContent() {
  const [healthData, setHealthData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drilldown Drawer State
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [drilldownData, setDrilldownData] = useState<any | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  // Reusable AdminUserDrawer State
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [drawerCustomerNo, setDrawerCustomerNo] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Read-Only Listing Inspection Modal State
  const [inspectionListingId, setInspectionListingId] = useState<string | null>(null);
  const [inspectionData, setInspectionData] = useState<any | null>(null);
  const [inspectionLoading, setInspectionLoading] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const fetchHealthData = async (isManualScan = false) => {
    if (isManualScan) setScanning(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/reports/listings/quality`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('İlan veri sağlığı raporu yüklenemedi.');
      const data = await res.json();
      setHealthData(data);
    } catch (err: any) {
      setError(err.message || 'Veri yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  const openDrilldown = async (categoryKey: string) => {
    setActiveCategory(categoryKey);
    setDrilldownLoading(true);
    setDrilldownData(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/reports/listings/quality/drilldown?category=${categoryKey}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error('Anomali detayları alınamadı.');
      const data = await res.json();
      setDrilldownData(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const openSellerDrawer = (sellerId: string, customerNo?: string) => {
    setDrawerUserId(sellerId);
    setDrawerCustomerNo(customerNo || null);
    setIsDrawerOpen(true);
  };

  const openListingInspection = async (listingId: string) => {
    setInspectionListingId(listingId);
    setInspectionLoading(true);
    setInspectionData(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/listing-moderation/listings/${listingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-admin-inspection': 'true',
        },
      });
      if (!res.ok) throw new Error('İlan detayları okunamadı.');
      const data = await res.json();
      setInspectionData(data);
    } catch (err: any) {
      alert(err.message || 'İlan bilgisi çekilemedi.');
    } finally {
      setInspectionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* HEADER & TOP CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-orange-500" />
            İlan Veri Sağlığı
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            İlan kayıtları, ilişkiler, yayın durumu ve sistem bütünlüğündeki teknik anomalileri izleyin.
          </p>
        </div>

        {/* SCAN & TIMESTAMP CONTROL */}
        <div className="flex items-center gap-3">
          {healthData?.checkedAt && (
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-white/10">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Son kontrol: {new Date(healthData.checkedAt).toLocaleString('tr-TR')}</span>
            </div>
          )}

          <button
            onClick={() => fetchHealthData(true)}
            disabled={scanning || loading}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Taranıyor...' : 'Şimdi Kontrol Et'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium bg-slate-900/60 rounded-2xl border border-white/5 space-y-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono">Veri sağlığı kontrolleri çalıştırılıyor...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-medium flex items-center justify-between">
          <span>İlan veri sağlığı kontrolleri yüklenemedi: {error}</span>
          <button
            onClick={() => fetchHealthData()}
            className="px-3 py-1 bg-rose-500 text-white rounded-lg text-xs font-bold cursor-pointer"
          >
            Tekrar Deneyin
          </button>
        </div>
      ) : (
        <>
          {/* SUMMARY OVERVIEW BAR */}
          {healthData?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
              <div className="p-4 bg-slate-900/80 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                  Toplam Kontrol
                </span>
                <span className="text-2xl font-black text-white">{healthData.summary.totalChecks || 7}</span>
              </div>
              <div className="p-4 bg-slate-900/80 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                  Sağlıklı Kontrol (OK)
                </span>
                <span className="text-2xl font-black text-emerald-400">{healthData.summary.okCount || 0}</span>
              </div>
              <div className="p-4 bg-slate-900/80 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                  Anomali Bulunan
                </span>
                <span className="text-2xl font-black text-rose-400">{healthData.summary.issuesFoundCount || 0}</span>
              </div>
              <div className="p-4 bg-slate-900/80 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                  Kontrol Edilemeyen
                </span>
                <span className="text-2xl font-black text-amber-400">{healthData.summary.checkFailedCount || 0}</span>
              </div>
            </div>
          )}

          {/* 7 HEALTH CHECK CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {HEALTH_CHECK_CARDS.map((cardDef) => {
              const check = healthData?.checks?.[cardDef.key];
              const IconComp = cardDef.icon;
              const isOK = check?.status === 'OK';
              const isFailed = check?.status === 'CHECK_FAILED';
              const isNotChecked = check?.status === 'NOT_CHECKED';
              const hasIssues = check?.status === 'ISSUES_FOUND';

              return (
                <div
                  key={cardDef.key}
                  onClick={() => hasIssues && openDrilldown(cardDef.key)}
                  className={`p-5 bg-slate-900/90 rounded-2xl border transition-all space-y-3 relative overflow-hidden ${
                    hasIssues
                      ? 'border-rose-500/40 hover:border-rose-500 cursor-pointer shadow-lg shadow-rose-500/5'
                      : isOK
                      ? 'border-white/10 cursor-default'
                      : 'border-amber-500/30 cursor-default'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl ${hasIssues ? 'bg-rose-500/10 text-rose-400' : isOK ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-200">
                        {cardDef.title}
                      </span>
                    </div>

                    {/* STATUS BADGE */}
                    {isOK && (
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Sağlıklı
                      </span>
                    )}
                    {hasIssues && (
                      <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 text-[10px] font-bold rounded-full border border-rose-500/20 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        Anomali Var
                      </span>
                    )}
                    {isFailed && (
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/20">
                        Kontrol Edilemedi
                      </span>
                    )}
                    {isNotChecked && (
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold rounded-full border border-white/10">
                        Henüz Taranmadı
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed min-h-[32px]">
                    {cardDef.description}
                  </p>

                  {/* DISPLAY VALUE */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <div>
                      {isOK && <span className="text-2xl font-black text-emerald-400 font-mono">0 ✓</span>}
                      {hasIssues && <span className="text-2xl font-black text-rose-400 font-mono">{check.count}</span>}
                      {(isFailed || isNotChecked) && <span className="text-2xl font-black text-slate-500 font-mono">—</span>}
                    </div>

                    {hasIssues && (
                      <div className="flex items-center gap-1 text-[11px] font-bold text-orange-400">
                        <span>Sorunlu İlanları Gör</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* DRILLDOWN DRAWER / MODAL */}
      {activeCategory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end transition-opacity animate-in fade-in">
          <div className="w-full max-w-4xl bg-slate-950 border-l border-white/10 h-full flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-900/80">
              <div>
                <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  {drilldownData?.title || 'İlan Anomali Detayı'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  Tespit Edilen Anomali Sayısı: {drilldownData?.count || 0} Kayıt — Read-Only Teşhis
                </p>
              </div>

              <button
                onClick={() => setActiveCategory(null)}
                className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {drilldownLoading ? (
                <div className="p-12 text-center text-slate-400 font-mono text-xs space-y-2">
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Anomali kayıtları çekiliyor...</p>
                </div>
              ) : drilldownData?.issues && drilldownData.issues.length > 0 ? (
                <div className="space-y-3 font-mono">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Teknik Anomali Tespit Edilen İlanlar
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      İlana tıkla ➔ Read-Only İncele | Satıcıya tıkla ➔ AdminUserDrawer
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-white/10 rounded-xl bg-slate-900/60">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-white/10 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                          <th className="p-3">İlan No & Başlık</th>
                          <th className="p-3">Satıcı</th>
                          <th className="p-3">Teknik Anomali Açıklaması</th>
                          <th className="p-3 text-right">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300">
                        {drilldownData.issues.map((item: any) => (
                          <tr key={item.id} className="hover:bg-white/5 transition-colors">
                            {/* Listing Title & No */}
                            <td className="p-3">
                              <button
                                onClick={() => openListingInspection(item.id)}
                                className="text-left font-bold text-white hover:text-orange-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                              >
                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded border border-white/10 text-orange-400 font-mono">
                                  {item.listingNo}
                                </span>
                                <span className="truncate max-w-xs">{item.title}</span>
                              </button>
                            </td>

                            {/* Seller */}
                            <td className="p-3">
                              <button
                                onClick={() => openSellerDrawer(item.sellerId, item.customerNo)}
                                className="text-slate-400 hover:text-orange-400 transition-colors text-[11px] flex items-center gap-1 cursor-pointer"
                              >
                                <User className="w-3 h-3" />
                                <span>{item.sellerName}</span>
                                <span className="text-[10px] text-slate-500 font-mono">({item.customerNo})</span>
                              </button>
                            </td>

                            {/* Anomaly Reason */}
                            <td className="p-3 text-rose-300 text-[11px]">
                              {item.technicalReason}
                            </td>

                            {/* Status */}
                            <td className="p-3 text-right font-bold text-slate-400">
                              {item.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 font-mono text-xs bg-slate-900/60 rounded-xl border border-white/5">
                  Bu kontrolde teknik sorun bulunamadı.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* READ-ONLY LISTING INSPECTION MODAL */}
      {inspectionListingId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto font-mono">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-black text-white">İlan İnceleme (Read-Only)</h3>
              <button
                onClick={() => setInspectionListingId(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inspectionLoading ? (
              <div className="p-8 text-center text-slate-400 text-xs">İlan yükleniyor...</div>
            ) : inspectionData ? (
              <div className="space-y-4 text-xs font-mono">
                <div className="p-4 bg-slate-900 border border-white/5 rounded-xl space-y-2">
                  <div className="text-sm font-bold text-white">{inspectionData.listing?.title}</div>
                  <div className="text-orange-400 font-bold">{inspectionData.listing?.priceAmount} TL</div>
                  <div className="text-slate-400">Durum: {inspectionData.listing?.status}</div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-slate-900 border border-white/5 rounded-xl">
                    <span className="text-slate-500 block text-[10px]">Görüntülenme</span>
                    <span className="font-bold text-white text-sm">{inspectionData.listing?.viewCount || 0}</span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-white/5 rounded-xl">
                    <span className="text-slate-500 block text-[10px]">Favori</span>
                    <span className="font-bold text-rose-400 text-sm">{inspectionData.listing?.favoriteCount || 0}</span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-white/5 rounded-xl">
                    <span className="text-slate-500 block text-[10px]">Yayın Tarihi</span>
                    <span className="font-bold text-slate-300 text-[11px]">
                      {new Date(inspectionData.listing?.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-slate-400">İlan bulunamadı.</div>
            )}
          </div>
        </div>
      )}

      {/* REUSABLE ADMIN USER DRAWER */}
      <AdminUserDrawer
        userId={drawerUserId}
        customerNo={drawerCustomerNo}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onRefresh={() => fetchHealthData()}
      />
    </div>
  );
}

export default function AdminListingsQualityPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400 font-mono text-xs">İlan Veri Sağlığı yükleniyor...</div>}>
      <DataHealthContent />
    </Suspense>
  );
}
