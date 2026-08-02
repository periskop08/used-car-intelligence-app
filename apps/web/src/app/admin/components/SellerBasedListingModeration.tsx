'use client';
import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  Eye,
  FileText,
} from 'lucide-react';
import { fetchReportApi } from '@/utils/apiConfig';

interface SellerItem {
  seller: {
    userId: string;
    customerNo: string;
    fullName: string;
    username: string;
    email: string;
    packageName: string;
    sellerType: 'INDIVIDUAL' | 'CORPORATE';
    city: string;
    registeredAt: string;
  };
  counts: {
    total: number;
    pending: number;
    revisionRequired: number;
    detailedReview: number;
    active: number;
    rejected: number;
    passive: number;
    expired: number;
    reported: number;
  };
  risk: {
    level: 'NORMAL' | 'ATTENTION' | 'HIGH_REVIEW_PRIORITY';
    flags: string[];
  };
  lastListingCreatedAt: string;
  lastModerationAt: string;
}

interface CompactListing {
  listingId: string;
  publicListingNo: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: string;
  currency: string;
  mileage: number;
  fuelType: string;
  transmission: string;
  city: string;
  imageCount: number;
  status: string;
  waitingSince: string;
  createdAt: string;
  updatedAt: string;
  riskFlags: string[];
  version: number;
}

const MODERATION_TABS = [
  { key: 'PENDING_REVIEW', label: 'Onay Bekleyenler' },
  { key: 'REVISION_REQUIRED', label: 'Düzeltme Bekleyenler' },
  { key: 'DETAILED_REVIEW', label: 'Detaylı İncelemede' },
  { key: 'ACTIVE', label: 'Aktif İlanlar' },
  { key: 'REJECTED', label: 'Reddedilenler' },
  { key: 'PASSIVE', label: 'Pasif İlanlar' },
  { key: 'EXPIRED', label: 'Süresi Dolanlar' },
  { key: 'REPORTED', label: 'Şikâyet Edilenler' },
];

export const SellerBasedListingModeration: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeStatus = searchParams.get('status') || 'PENDING_REVIEW';

  // Data states
  const [sellers, setSellers] = useState<SellerItem[]>([]);
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});
  const [loadingSellers, setLoadingSellers] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & search
  const [search, setSearch] = useState('');
  const [sellerType, setSellerType] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [sort, setSort] = useState('PENDING_FIRST');

  // Accordion state (expanded seller customerNos)
  const [expandedSellers, setExpandedSellers] = useState<Record<string, boolean>>({});
  const [sellerListings, setSellerListings] = useState<Record<string, CompactListing[]>>({});
  const [loadingListings, setLoadingListings] = useState<Record<string, boolean>>({});

  // 2nd Level Accordion (expanded listing IDs for detailed inspection)
  const [expandedListings, setExpandedListings] = useState<Record<string, boolean>>({});
  const [listingDetails, setListingDetails] = useState<Record<string, any>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});

  // Action Modals State
  const [activeModal, setActiveModal] = useState<{
    type: 'REVISION' | 'REJECT' | 'PREVIEW';
    listingId: string;
    sellerCustomerNo: string;
    listingTitle: string;
  } | null>(null);

  const [presetReasons, setPresetReasons] = useState<any[]>([]);
  const [selectedReasonCode, setSelectedReasonCode] = useState('');
  const [sellerMessage, setSellerMessage] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [allowResubmission, setAllowResubmission] = useState(true);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Fetch Sellers List
  const fetchSellersList = () => {
    setLoadingSellers(true);
    setErrorMsg(null);
    const query = new URLSearchParams({
      status: activeStatus,
      search,
      sellerType,
      riskLevel,
      sort,
    }).toString();

    fetchReportApi(`/admin/listing-moderation/sellers?${query}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Satıcı listesi alınamadı (HTTP ${res.status})`);
        return res.json();
      })
      .then((data) => {
        setSellers(data.sellers || []);
        setTabCounts(data.tabCounts || {});
      })
      .catch((e: any) => setErrorMsg(e.message || 'Bir hata oluştu'))
      .finally(() => setLoadingSellers(false));
  };

  useEffect(() => {
    setSellerListings({});
    setExpandedSellers({});
    fetchSellersList();
  }, [activeStatus, sellerType, riskLevel, sort]);

  // Fetch preset reasons
  useEffect(() => {
    fetchReportApi('/admin/listing-moderation/reasons')
      .then((res) => res.json())
      .then((d) => setPresetReasons(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Handle Tab Switch
  const handleTabSwitch = (statusKey: string) => {
    setSellerListings({});
    setExpandedSellers({});
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'listings');
    params.set('status', statusKey);
    router.push(`/admin?${params.toString()}`);
  };

  // Toggle Seller Accordion
  const toggleSeller = (customerNo: string) => {
    const nextState = !expandedSellers[customerNo];
    setExpandedSellers((prev) => ({ ...prev, [customerNo]: nextState }));

    if (nextState && !sellerListings[customerNo]) {
      setLoadingListings((prev) => ({ ...prev, [customerNo]: true }));
      fetchReportApi(`/admin/listing-moderation/sellers/${encodeURIComponent(customerNo)}/listings?status=${activeStatus}`)
        .then((res) => res.json())
        .then((data) => {
          setSellerListings((prev) => ({ ...prev, [customerNo]: Array.isArray(data) ? data : [] }));
        })
        .catch(() => {})
        .finally(() => setLoadingListings((prev) => ({ ...prev, [customerNo]: false })));
    }
  };

  // Toggle Listing Details Accordion
  const toggleListingDetails = (listingId: string) => {
    const nextState = !expandedListings[listingId];
    setExpandedListings((prev) => ({ ...prev, [listingId]: nextState }));

    if (nextState && !listingDetails[listingId]) {
      setLoadingDetails((prev) => ({ ...prev, [listingId]: true }));
      fetchReportApi(`/admin/listing-moderation/listings/${listingId}`)
        .then((res) => res.json())
        .then((data) => {
          setListingDetails((prev) => ({ ...prev, [listingId]: data }));
        })
        .catch(() => {})
        .finally(() => setLoadingDetails((prev) => ({ ...prev, [listingId]: false })));
    }
  };

  // Quick Action Handlers
  const handleApprove = async (listingId: string, customerNo: string) => {
    try {
      const res = await fetchReportApi(`/admin/listing-moderation/listings/${listingId}/approve`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Onaylama işlemi başarısız');
      fetchSellersList();
      if (sellerListings[customerNo]) {
        setSellerListings((prev) => ({
          ...prev,
          [customerNo]: prev[customerNo].filter((l) => l.listingId !== listingId),
        }));
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSendToDetailedReview = async (listingId: string, customerNo: string) => {
    try {
      const res = await fetchReportApi(`/admin/listing-moderation/listings/${listingId}/send-to-detailed-review`, {
        method: 'POST',
        body: JSON.stringify({ internalNote: 'Admin tarafından detaylı incelemeye sevk edildi.' }),
      });
      if (!res.ok) throw new Error('İncelemeye sevk başarısız');
      handleTabSwitch('DETAILED_REVIEW');
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Open Action Modal
  const openModal = (type: 'REVISION' | 'REJECT' | 'PREVIEW', listing: CompactListing, customerNo: string) => {
    setActiveModal({
      type,
      listingId: listing.listingId,
      sellerCustomerNo: customerNo,
      listingTitle: listing.title,
    });
    setSelectedReasonCode('');
    setSellerMessage('');
    setInternalNote('');
    setAllowResubmission(true);
  };

  // Handle Preset Reason Selection
  const handleReasonSelect = (code: string) => {
    setSelectedReasonCode(code);
    const reason = presetReasons.find((r) => r.code === code);
    if (reason && reason.defaultSellerMessage) {
      setSellerMessage(reason.defaultSellerMessage);
    }
  };

  // Submit Modal Decision
  const handleModalSubmit = async () => {
    if (!activeModal) return;
    setSubmittingAction(true);
    try {
      const endpoint = activeModal.type === 'REVISION'
        ? `/admin/listing-moderation/listings/${activeModal.listingId}/request-revision`
        : `/admin/listing-moderation/listings/${activeModal.listingId}/reject`;

      const res = await fetchReportApi(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          reasonCode: selectedReasonCode,
          sellerMessage,
          internalNote,
          allowResubmission,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'İşlem başarısız');
      }

      setActiveModal(null);
      fetchSellersList();
      if (sellerListings[activeModal.sellerCustomerNo]) {
        setSellerListings((prev) => ({
          ...prev,
          [activeModal.sellerCustomerNo]: prev[activeModal.sellerCustomerNo].filter((l) => l.listingId !== activeModal.listingId),
        }));
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Status Sub-Tabs with Badges */}
      <div className="flex overflow-x-auto gap-2 border-b border-white/10 pb-2 custom-scrollbar">
        {MODERATION_TABS.map((tab) => {
          const count = tabCounts[tab.key] || 0;
          const isActive = activeStatus === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabSwitch(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-white/5'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  isActive ? 'bg-white/20 text-white font-black' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar: Search, Filters & Sorting */}
      <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search Field */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchSellersList()}
            placeholder="Müşteri no, satıcı adı, ilan no, marka/model veya şehir ara..."
            className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50"
          />
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <select
            value={sellerType}
            onChange={(e) => setSellerType(e.target.value)}
            className="bg-slate-950 border border-white/10 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="">Tüm Satıcı Tipleri</option>
            <option value="INDIVIDUAL">Bireysel Satıcı</option>
            <option value="CORPORATE">Kurumsal Galeri / Bayi</option>
          </select>

          <select
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value)}
            className="bg-slate-950 border border-white/10 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="">Tüm Risk Seviyeleri</option>
            <option value="NORMAL">Normal Risk</option>
            <option value="ATTENTION">Dikkat</option>
            <option value="HIGH_REVIEW_PRIORITY">Yüksek İnceleme Önceliği</option>
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-slate-950 border border-white/10 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none font-medium"
          >
            <option value="PENDING_FIRST">En Eski Bekleyen İlan Önce</option>
            <option value="NEWEST">En Yeni İlan Önce</option>
            <option value="HIGHEST_RISK">En Yüksek Riskli Satıcı</option>
            <option value="MOST_LISTINGS">En Fazla İlanı Olan Satıcı</option>
          </select>
        </div>
      </div>

      {/* Main Seller Accordion List */}
      {loadingSellers ? (
        <div className="p-16 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-white/5">
          Satıcı moderasyon listesi yükleniyor...
        </div>
      ) : errorMsg ? (
        <div className="p-6 text-center text-rose-400 bg-rose-950/40 rounded-2xl border border-rose-800/40">
          {errorMsg}
        </div>
      ) : sellers.length === 0 ? (
        <div className="p-16 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-white/5 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
          <p className="font-bold text-slate-300 text-sm">Bu sekmede gösterilecek ilan kaydı bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sellers.map((item) => {
            const isSellerExpanded = !!expandedSellers[item.seller.customerNo];
            const listings = sellerListings[item.seller.customerNo] || [];
            const isListingsLoading = !!loadingListings[item.seller.customerNo];

            return (
              <div
                key={item.seller.customerNo}
                className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden transition-all"
              >
                {/* 1st Level Accordion Header: Seller Row */}
                <div
                  onClick={() => toggleSeller(item.seller.customerNo)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/40 transition-all select-none"
                >
                  <div className="flex items-start md:items-center gap-4">
                    <button className="mt-1 md:mt-0 p-1 text-slate-400">
                      {isSellerExpanded ? (
                        <ChevronDown className="w-5 h-5 text-orange-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                      )}
                    </button>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/admin/reports/users/${encodeURIComponent(item.seller.customerNo)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono font-bold text-xs text-orange-400 hover:underline"
                        >
                          {item.seller.customerNo}
                        </Link>
                        <span className="text-slate-300 font-extrabold text-sm">{item.seller.fullName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                          {item.seller.sellerType === 'CORPORATE' ? 'Kurumsal Galeri' : 'Bireysel Satıcı'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400">
                          {item.seller.packageName}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {item.seller.city} • Kayıt: {new Date(item.seller.registeredAt).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  </div>

                  {/* Counters & Risk Badge */}
                  <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
                    {/* Status Counters */}
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      {item.counts.pending > 0 && (
                        <span className="px-2 py-1 rounded-lg bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30">
                          {item.counts.pending} Bekleyen
                        </span>
                      )}
                      {item.counts.revisionRequired > 0 && (
                        <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                          {item.counts.revisionRequired} Düzeltme
                        </span>
                      )}
                      {item.counts.detailedReview > 0 && (
                        <span className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400 font-bold border border-purple-500/30">
                          {item.counts.detailedReview} İncelemede
                        </span>
                      )}
                      {item.counts.active > 0 && (
                        <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold">
                          {item.counts.active} Aktif
                        </span>
                      )}
                      {item.counts.rejected > 0 && (
                        <span className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-400 font-bold">
                          {item.counts.rejected} Reddedilen
                        </span>
                      )}
                    </div>

                    {/* Risk Badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                          item.risk.level === 'HIGH_REVIEW_PRIORITY'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : item.risk.level === 'ATTENTION'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>
                          {item.risk.level === 'HIGH_REVIEW_PRIORITY'
                            ? 'YÜKSEK İNCELEME'
                            : item.risk.level === 'ATTENTION'
                            ? 'DİKKAT'
                            : 'NORMAL'}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1st Level Content: Seller's Compact Listing Rows */}
                {isSellerExpanded && (
                  <div className="border-t border-white/5 bg-slate-950/60 p-4 space-y-3">
                    {isListingsLoading ? (
                      <div className="p-8 text-center text-xs text-slate-400">Satıcıya ait ilanlar yükleniyor...</div>
                    ) : listings.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">Bu filtrelere uygun ilan bulunamadı.</div>
                    ) : (
                      listings.map((listing) => {
                        const isDetailsExpanded = !!expandedListings[listing.listingId];
                        const details = listingDetails[listing.listingId];
                        const isDetailsLoading = !!loadingDetails[listing.listingId];

                        return (
                          <div
                            key={listing.listingId}
                            className="bg-slate-900/80 border border-white/5 rounded-xl overflow-hidden transition-all space-y-3"
                          >
                            {/* Compact Listing Item Row */}
                            <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-xs text-orange-400 font-bold">
                                  {listing.publicListingNo}
                                </span>
                                <div>
                                  <h4 className="font-bold text-slate-200 text-sm">{listing.title}</h4>
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    {listing.brand} {listing.model} {listing.year} • <strong className="text-emerald-400">₺{Number(listing.price).toLocaleString('tr-TR')}</strong> • {listing.mileage.toLocaleString('tr-TR')} km • {listing.city} • {listing.imageCount} foto
                                  </p>
                                </div>
                              </div>

                              {/* Listing Action Buttons */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={() => openModal('PREVIEW', listing, item.seller.customerNo)}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Önizle</span>
                                </button>

                                <button
                                  onClick={() => toggleListingDetails(listing.listingId)}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-orange-400 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>{isDetailsExpanded ? 'Kapat' : 'Detayı Aç'}</span>
                                </button>

                                <button
                                  onClick={() => handleApprove(listing.listingId, item.seller.customerNo)}
                                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition"
                                >
                                  Onayla
                                </button>

                                <button
                                  onClick={() => handleSendToDetailedReview(listing.listingId, item.seller.customerNo)}
                                  className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-bold transition"
                                >
                                  Detaylı İncele
                                </button>

                                <button
                                  onClick={() => openModal('REVISION', listing, item.seller.customerNo)}
                                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold transition"
                                >
                                  Düzeltme İste
                                </button>

                                <button
                                  onClick={() => openModal('REJECT', listing, item.seller.customerNo)}
                                  className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold transition"
                                >
                                  Reddet
                                </button>
                              </div>
                            </div>

                            {/* 2nd Level Accordion: Detailed Inspection View */}
                            {isDetailsExpanded && (
                              <div className="border-t border-white/5 bg-slate-950 p-6 space-y-6">
                                {isDetailsLoading ? (
                                  <div className="p-8 text-center text-xs text-slate-400">İlan detayları yükleniyor...</div>
                                ) : !details ? (
                                  <div className="p-6 text-center text-xs text-rose-400">Detaylar alınamadı.</div>
                                ) : (
                                  <div className="space-y-6 text-xs">
                                    {/* Grid Layout: Vehicle Specs & Damage */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {/* Technical Specifications */}
                                      <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-3">
                                        <h5 className="font-bold text-slate-200 text-xs uppercase tracking-wider">İlan & Araç Teknik Bilgileri</h5>
                                        <div className="grid grid-cols-2 gap-2 font-mono text-slate-300">
                                          <div><span className="text-slate-500">İlan No:</span> {details.listing.publicListingNo}</div>
                                          <div><span className="text-slate-500">Model Yılı:</span> {details.listing.year}</div>
                                          <div><span className="text-slate-500">Yakıt:</span> {details.listing.fuelType}</div>
                                          <div><span className="text-slate-500">Şanzıman:</span> {details.listing.transmission}</div>
                                          <div><span className="text-slate-500">Kasa:</span> {details.listing.bodyType}</div>
                                          <div><span className="text-slate-500">Motor:</span> {details.listing.engineDisplacement} cc</div>
                                          <div><span className="text-slate-500">Güç:</span> {details.listing.enginePower} HP</div>
                                          <div><span className="text-slate-500">Renk:</span> {details.listing.color}</div>
                                        </div>
                                      </div>

                                      {/* Damage Declaration */}
                                      <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-3">
                                        <h5 className="font-bold text-slate-200 text-xs uppercase tracking-wider">Hasar & Satıcı Beyanı</h5>
                                        <div className="space-y-2 font-mono text-slate-300">
                                          <div><span className="text-slate-500">Tramer Kaydı:</span> <strong className="text-amber-400">₺{Number(details.damageDeclaration.tramerFee).toLocaleString('tr-TR')}</strong></div>
                                          <div><span className="text-slate-500">Ağır Hasar Kaydı:</span> {details.damageDeclaration.isHeavyDamaged ? <span className="text-rose-400 font-bold">EVET (AĞIR HASARLI)</span> : <span className="text-emerald-400 font-bold">HAYIR</span>}</div>
                                          <div><span className="text-slate-500">Boya / Lokal Boya:</span> {details.damageDeclaration.paintedParts?.length || 0} Parça</div>
                                          <div><span className="text-slate-500">Değişen Parça:</span> {details.damageDeclaration.changedParts?.length || 0} Parça</div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Description */}
                                    <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-2">
                                      <h5 className="font-bold text-slate-200 text-xs uppercase tracking-wider">İlan Açıklaması</h5>
                                      <p className="text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">{details.listing.description || 'Açıklama girilmemiş.'}</p>
                                    </div>

                                    {/* Photo Moderation Grid */}
                                    <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-3">
                                      <h5 className="font-bold text-slate-200 text-xs uppercase tracking-wider">Fotoğraf Moderasyonu ({details.media.length} Görsel)</h5>
                                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                        {details.media.map((m: any, i: number) => (
                                          <div key={m.id} className="relative group rounded-lg overflow-hidden border border-white/10 bg-slate-950">
                                            <img src={m.url} alt={`Fotoğraf ${i+1}`} className="w-full h-24 object-cover" />
                                            <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1">
                                              <a href={m.url} target="_blank" rel="noreferrer" className="p-1 bg-slate-800 rounded text-white"><Eye className="w-3.5 h-3.5" /></a>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Automated Moderation Checks */}
                                    <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-3">
                                      <h5 className="font-bold text-slate-200 text-xs uppercase tracking-wider">Otomatik Risk & Uyum Kontrolleri</h5>
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                                        {details.autoChecks.map((chk: any, idx: number) => (
                                          <div key={idx} className="p-3 bg-slate-950 rounded-lg border border-white/5 space-y-1">
                                            <span className="text-slate-200 font-bold block">{chk.check}</span>
                                            <p className="text-slate-400 text-[11px] font-sans">{chk.message}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
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

      {/* Moderation Decision Modal (Revision / Reject) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="font-bold text-slate-200 text-sm">
                {activeModal.type === 'REVISION' ? 'Düzeltme İste' : 'İlanı Reddet'} — {activeModal.listingTitle}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <div className="space-y-4 text-xs font-sans">
              {/* Preset Reason Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Hazır Moderasyon Sebebi</label>
                <select
                  value={selectedReasonCode}
                  onChange={(e) => handleReasonSelect(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 text-slate-200 p-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500/50"
                >
                  <option value="">Sebep Seçin...</option>
                  {presetReasons
                    .filter((r) => activeModal.type === 'REVISION' ? r.actionType === 'REVISION_REQUIRED' : r.actionType === 'REJECT')
                    .map((r) => (
                      <option key={r.code} value={r.code}>{r.title}</option>
                    ))}
                </select>
              </div>

              {/* Public Seller Message */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                  Satıcıya Gönderilecek Açıklama <span className="text-rose-400">* (Kamuya / Bildirime Gider)</span>
                </label>
                <textarea
                  value={sellerMessage}
                  onChange={(e) => setSellerMessage(e.target.value)}
                  placeholder="Satıcının e-posta ve uygulama bildiriminde göreceği açıklama..."
                  className="w-full h-24 bg-slate-950 border border-white/10 text-slate-200 p-3 rounded-xl text-xs focus:outline-none focus:border-orange-500/50"
                />
              </div>

              {/* Internal Management Note */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                  Yönetim İç Notu <span className="text-amber-400">(Gizli — Yalnızca Adminler Görür)</span>
                </label>
                <textarea
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="İç denetim ve moderatör notu..."
                  className="w-full h-16 bg-slate-950 border border-white/10 text-slate-200 p-3 rounded-xl text-xs focus:outline-none focus:border-orange-500/50"
                />
              </div>

              {activeModal.type === 'REJECT' && (
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={allowResubmission}
                    onChange={(e) => setAllowResubmission(e.target.checked)}
                    className="rounded bg-slate-950 border-white/10 text-orange-500 focus:ring-0"
                  />
                  <span className="text-slate-300 text-xs">Satıcının ilanı düzenleyip tekrar göndermesine izin ver</span>
                </label>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
              >
                İptal
              </button>

              <button
                onClick={handleModalSubmit}
                disabled={submittingAction || !sellerMessage.trim()}
                className={`px-4 py-2 text-white font-bold text-xs rounded-xl disabled:opacity-50 ${
                  activeModal.type === 'REVISION' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-rose-500 hover:bg-rose-600'
                }`}
              >
                {submittingAction ? 'Kaydediliyor...' : activeModal.type === 'REVISION' ? 'Düzeltme Talebi Gönder' : 'İlanı Reddet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
