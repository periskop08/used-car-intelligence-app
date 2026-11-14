import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView as NativeSafeAreaView } from 'react-native-safe-area-context';
const SafeAreaView = NativeSafeAreaView as any;
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TorkScoutLoader from '../../components/TorkScoutLoader';

let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (e) {
  console.warn('ImagePicker could not be loaded:', e);
}

const API_URL = 'https://used-car-api-hzmu.onrender.com';

const resolveMediaUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.includes('.r2.dev/') || url.includes('cloudflarestorage.com/')) {
    const parts = url.split('.r2.dev/');
    const storageKey = parts.length > 1 ? parts[1].split('?')[0] : '';
    if (storageKey) {
      return `${API_URL}/listings/media-proxy/${storageKey}`;
    }
  }
  if (url.startsWith('/')) {
    return `${API_URL}${url}`;
  }
  return url;
};

type MainSection = 'LISTINGS' | 'CLUB';
type ListingsSubTab = 'LISTING_MODERATION' | 'LISTING_PERFORMANCE' | 'LISTING_QUALITY';
type ClubSubTab =
  | 'CLUB_OVERVIEW'
  | 'CLUB_POSTS'
  | 'CLUB_COMMENTS'
  | 'CLUB_USERS'
  | 'CLUB_MESSAGES'
  | 'CLUB_REPORTS'
  | 'CLUB_SETTINGS_LOGS';

const LISTING_STATUS_TABS = [
  { key: 'PENDING_REVIEW', label: 'Onay Bekleyenler' },
  { key: 'REVISION_REQUIRED', label: 'Düzeltme Bekleyenler' },
  { key: 'DETAILED_REVIEW', label: 'Detaylı İncelemede' },
  { key: 'ACTIVE', label: 'Aktif İlanlar' },
  { key: 'REJECTED', label: 'Reddedilenler' },
  { key: 'PASSIVE', label: 'Pasif İlanlar' },
  { key: 'EXPIRED', label: 'Süresi Dolanlar' },
  { key: 'REPORTED', label: 'Şikâyet Edilenler' },
];

const MODERATION_REASON_CODES = [
  { code: 'PHOTO_INSUFFICIENT', label: 'Eksik / Yetersiz Fotoğraf' },
  { code: 'INCORRECT_SPECS', label: 'Hatalı Araç / Donanım Bilgisi' },
  { code: 'PRICE_ANOMALY', label: 'Gerçek Dışı / Hatalı Fiyat' },
  { code: 'FAKED_LISTING', label: 'Sahte / Güvenlik İhlali İlan' },
  { code: 'DUPLICATE_LISTING', label: 'Mükerrer (Tekrarlayan) İlan' },
];

const HEALTH_CHECK_CARDS = [
  {
    key: 'brokenMedia',
    title: 'Bozuk Görselli İlanlar',
    description: 'DB kaydı olan fakat görseli eksik olan aktif ilanlar.',
    icon: 'image-outline' as const,
  },
  {
    key: 'orphanSellerRelations',
    title: 'Kullanıcı İlişkisi Bozuk İlanlar',
    description: 'Satıcı ID ilişkisi boş veya kopuk olan ilanlar.',
    icon: 'person-remove-outline' as const,
  },
  {
    key: 'variantRelationIssues',
    title: 'Araç/Varyant Bağlantısı Bozuk İlanlar',
    description: 'Varyant ID tanımlı fakat araç veritabanında karşılığı bulunamayan ilanlar.',
    icon: 'unlink-outline' as const,
  },
  {
    key: 'statusInconsistency',
    title: 'Durum Tutarsızlığı Olan İlanlar',
    description: 'Yaşam döngüsü statüsü ile moderasyon/yayın zamanları arasında teknik çelişkiler.',
    icon: 'time-outline' as const,
  },
  {
    key: 'visibilityIssues',
    title: 'Yayın Görünürlüğü Sorunu Olan İlanlar',
    description: 'Aktif statüde olup arama dizininde fiyat/varyant eksikliği yüzünden gizlenen ilanlar.',
    icon: 'eye-off-outline' as const,
  },
  {
    key: 'expiredActiveListings',
    title: 'Süresi Dolduğu Halde Aktif İlanlar',
    description: 'Yayın süresi dolduğu halde otomatik pasife geçemeyen aktif ilanlar.',
    icon: 'layers-outline' as const,
  },
  {
    key: 'duplicateCollisionListings',
    title: 'Mükerrer / Çakışan Aktif İlanlar',
    description: 'Teknik olarak aynı ilan kimliğine bağlanan birden fazla aktif kayıt.',
    icon: 'copy-outline' as const,
  },
];

export default function AdminScreen() {
  const router = useRouter();

  // Navigation State
  const [mainSection, setMainSection] = useState<MainSection>('LISTINGS');
  const [listingsSubTab, setListingsSubTab] = useState<ListingsSubTab>('LISTING_MODERATION');
  const [clubSubTab, setClubSubTab] = useState<ClubSubTab>('CLUB_POSTS');

  // ==========================================
  // 1. LISTINGS -> MODERATION STATE
  // ==========================================
  const [listingStatus, setListingStatus] = useState<string>('PENDING_REVIEW');
  const [listingCounts, setListingCounts] = useState<Record<string, number>>({});
  const [listings, setListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState<boolean>(false);
  const [listingsPage, setListingsPage] = useState<number>(1);
  const [listingsTotalPages, setListingsTotalPages] = useState<number>(1);
  const [listingsTotal, setListingsTotal] = useState<number>(0);
  const [listingSearch, setListingSearch] = useState<string>('');
  const [sellerTypeFilter, setSellerTypeFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [listingSort, setListingSort] = useState<'NEWEST' | 'OLDEST'>('NEWEST');

  // Listing Inspection Modal State
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [inspectionData, setInspectionData] = useState<any | null>(null);
  const [inspectionLoading, setInspectionLoading] = useState<boolean>(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Listing Reason Prompt Modal (Reject / Request Revision)
  const [reasonModalOpen, setReasonModalOpen] = useState<boolean>(false);
  const [reasonActionType, setReasonActionType] = useState<'REJECT' | 'REQUEST_REVISION'>('REJECT');
  const [reasonTargetListingId, setReasonTargetListingId] = useState<string | null>(null);
  const [reasonCode, setReasonCode] = useState<string>('FAKED_LISTING');
  const [sellerMessage, setSellerMessage] = useState<string>('');
  const [internalNote, setInternalNote] = useState<string>('');
  const [submittingModeration, setSubmittingModeration] = useState<boolean>(false);

  // ==========================================
  // 2. LISTINGS -> PERFORMANCE STATE
  // ==========================================
  const [perfRange, setPerfRange] = useState<string>('30d');
  const [perfStats, setPerfStats] = useState<any | null>(null);
  const [perfLoading, setPerfLoading] = useState<boolean>(false);
  const [perfDrilldownMetric, setPerfDrilldownMetric] = useState<string | null>(null);
  const [perfDrilldownData, setPerfDrilldownData] = useState<any | null>(null);
  const [perfDrilldownLoading, setPerfDrilldownLoading] = useState<boolean>(false);

  // ==========================================
  // 3. LISTINGS -> QUALITY (DATA HEALTH) STATE
  // ==========================================
  const [qualityData, setQualityData] = useState<any | null>(null);
  const [qualityLoading, setQualityLoading] = useState<boolean>(false);
  const [qualityDrilldownCategory, setQualityDrilldownCategory] = useState<string | null>(null);
  const [qualityDrilldownData, setQualityDrilldownData] = useState<any | null>(null);
  const [qualityDrilldownLoading, setQualityDrilldownLoading] = useState<boolean>(false);

  // ==========================================
  // 4. CLUB -> OVERVIEW STATE
  // ==========================================
  const [clubDashboard, setClubDashboard] = useState<any | null>(null);
  const [clubDashboardLoading, setClubDashboardLoading] = useState<boolean>(false);

  // ==========================================
  // 5. CLUB -> POSTS & MODERATION STATE
  // ==========================================
  const [clubPostTab, setClubPostTab] = useState<
    'ALL' | 'PUBLISHED' | 'DRAFT' | 'ARCHIVED' | 'USER_SUBMISSIONS'
  >('ALL');
  const [clubUserSubFilter, setClubUserSubFilter] = useState<
    'PENDING_REVIEW' | 'ALL' | 'PUBLISHED' | 'REJECTED'
  >('PENDING_REVIEW');
  const [clubPosts, setClubPosts] = useState<any[]>([]);
  const [pendingUserPostsCount, setPendingUserPostsCount] = useState<number>(0);
  const [clubPostsLoading, setClubPostsLoading] = useState<boolean>(false);

  // Club Comments Tab State
  const [clubCommentFilter, setClubCommentFilter] = useState<
    'ALL' | 'PENDING_REVIEW' | 'HIDDEN' | 'VISIBLE'
  >('ALL');
  const [clubCommentGroups, setClubCommentGroups] = useState<any[]>([]);
  const [clubCommentsLoading, setClubCommentsLoading] = useState<boolean>(false);

  // Club Post Detail & Comments Drawer Modal
  const [selectedClubPost, setSelectedClubPost] = useState<any | null>(null);
  const [postComments, setPostComments] = useState<any[]>([]);
  const [postCommentsLoading, setPostCommentsLoading] = useState<boolean>(false);

  // Club Reject User Post Modal
  const [rejectPostModalOpen, setRejectPostModalOpen] = useState<boolean>(false);
  const [rejectTargetPost, setRejectTargetPost] = useState<any | null>(null);
  const [rejectPostReason, setRejectPostReason] = useState<string>('');

  // ==========================================
  // FULL WEB-PARITY CLUB CREATE / EDIT POST MODAL STATE
  // ==========================================
  const [createPostModalOpen, setCreatePostModalOpen] = useState<boolean>(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [newPostTitle, setNewPostTitle] = useState<string>('');
  const [newPostContent, setNewPostContent] = useState<string>('');
  const [newPostMediaUrls, setNewPostMediaUrls] = useState<string[]>([]);
  const [manualMediaUrlInput, setManualMediaUrlInput] = useState<string>('');
  const [uploadingPostMedia, setUploadingPostMedia] = useState<boolean>(false);
  const [newPostPinned, setNewPostPinned] = useState<boolean>(false);
  const [newPostCommentsEnabled, setNewPostCommentsEnabled] = useState<boolean>(true);
  const [creatingPost, setCreatingPost] = useState<boolean>(false);

  // Full Poll Builder State (Matching Web PollCreationFields)
  const [pollEnabled, setPollEnabled] = useState<boolean>(false);
  const [pollQuestion, setPollQuestion] = useState<string>('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollSelectionType, setPollSelectionType] = useState<'SINGLE' | 'MULTIPLE'>('SINGLE');
  const [pollMaxSelections, setPollMaxSelections] = useState<number>(2);
  const [pollResultVisibility, setPollResultVisibility] = useState<
    'AFTER_VOTE' | 'ALWAYS' | 'AFTER_END' | 'ADMIN_ONLY'
  >('AFTER_VOTE');
  const [pollDurationType, setPollDurationType] = useState<
    'UNLIMITED' | '1H' | '6H' | '12H' | '1D' | '3D' | '7D'
  >('UNLIMITED');
  const [pollNotifyOnClose, setPollNotifyOnClose] = useState<boolean>(false);

  // ==========================================
  // 6. CLUB -> MEMBERS, MODERATORS & RESTRICTIONS STATE
  // ==========================================
  const [clubUsersMode, setClubUsersMode] = useState<'MEMBERS' | 'MODERATORS' | 'RESTRICTIONS'>(
    'MEMBERS'
  );
  const [clubMembers, setClubMembers] = useState<any[]>([]);
  const [clubModerators, setClubModerators] = useState<any[]>([]);
  const [clubMembersSearch, setClubMembersSearch] = useState<string>('');
  const [clubMembersLoading, setClubMembersLoading] = useState<boolean>(false);
  const [clubRestrictions, setClubRestrictions] = useState<any[]>([]);
  const [clubRestrictionsType, setClubRestrictionsType] = useState<'ALL' | 'MUTE' | 'BAN'>('ALL');
  const [clubRestrictionsLoading, setClubRestrictionsLoading] = useState<boolean>(false);

  // Ban / Mute Modal State
  const [restrictModalUser, setRestrictModalUser] = useState<any | null>(null);
  const [restrictType, setRestrictType] = useState<'MUTE' | 'BAN'>('MUTE');
  const [restrictReason, setRestrictReason] = useState<string>('Topluluk kuralları ihlali');
  const [restrictDurationHours, setRestrictDurationHours] = useState<string>('24');
  const [submittingRestrict, setSubmittingRestrict] = useState<boolean>(false);

  // ==========================================
  // 7. CLUB -> DIRECT & BULK MESSAGES STATE
  // ==========================================
  const [msgTargetUser, setMsgTargetUser] = useState<any | null>(null);
  const [directMsgText, setDirectMsgText] = useState<string>('');
  const [sendingDirectMsg, setSendingDirectMsg] = useState<boolean>(false);
  const [selectedBulkUserIds, setSelectedBulkUserIds] = useState<string[]>([]);
  const [bulkMsgModalOpen, setBulkMsgModalOpen] = useState<boolean>(false);
  const [bulkMsgText, setBulkMsgText] = useState<string>('');
  const [sendingBulkMsg, setSendingBulkMsg] = useState<boolean>(false);

  // ==========================================
  // 8. CLUB -> REPORTS & COMPLAINTS STATE
  // ==========================================
  const [clubReportSection, setClubReportSection] = useState<string>('MODERATION');
  const [clubReportRange, setClubReportRange] = useState<string>('30D');
  const [clubReportsData, setClubReportsData] = useState<any | null>(null);
  const [clubReportsLoading, setClubReportsLoading] = useState<boolean>(false);
  const [flaggedComments, setFlaggedComments] = useState<any[]>([]);

  // ==========================================
  // 9. CLUB -> SETTINGS & AUDIT LOGS STATE
  // ==========================================
  const [settingsOrLogsMode, setSettingsOrLogsMode] = useState<'SETTINGS' | 'AUDIT_LOG'>('SETTINGS');
  const [clubSettings, setClubSettings] = useState({
    rulesText: '',
    supportUrl: '',
    commentCharLimit: 1000,
    commentRateLimitSeconds: 10,
    dailyCommentLimit: 50,
    maxImagesPerPost: 10,
  });
  const [clubSettingsLoading, setClubSettingsLoading] = useState<boolean>(false);
  const [savingClubSettings, setSavingClubSettings] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState<boolean>(false);

  const getToken = async () =>
    (await AsyncStorage.getItem('accessToken')) || (await AsyncStorage.getItem('token'));

  // ------------------------------------------
  // FETCHERS: LISTINGS MODERATION
  // ------------------------------------------
  const fetchListingStatusCounts = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/admin/listing-moderation/status-counts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setListingCounts(data || {});
      }
    } catch {}
  }, []);

  const fetchListings = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setListingsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('status', listingStatus);
      params.append('page', String(listingsPage));
      params.append('limit', '15');
      if (listingSearch.trim()) params.append('search', listingSearch.trim());
      if (sellerTypeFilter !== 'ALL') params.append('sellerType', sellerTypeFilter);
      if (riskFilter !== 'ALL') params.append('riskLevel', riskFilter);
      params.append('sort', listingSort);

      const res = await fetch(`${API_URL}/admin/listing-moderation/items?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setListings(data.items || []);
        setListingsTotal(data.total || 0);
        setListingsTotalPages(data.totalPages || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setListingsLoading(false);
    }
  }, [listingStatus, listingsPage, listingSearch, sellerTypeFilter, riskFilter, listingSort]);

  const openListingInspection = async (listingId: string) => {
    setSelectedListingId(listingId);
    setInspectionLoading(true);
    setInspectionData(null);
    const token = await getToken();
    try {
      const res = await fetch(`${API_URL}/admin/listing-moderation/listings/${listingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInspectionData(data);
      } else {
        Alert.alert('Hata', 'İlan detayları alınamadı.');
        setSelectedListingId(null);
      }
    } catch {
      Alert.alert('Hata', 'İlan detayları yüklenirken bir sorun oluştu.');
      setSelectedListingId(null);
    } finally {
      setInspectionLoading(false);
    }
  };

  const handleListingQuickAction = async (
    listingId: string,
    action: 'approve' | 'set-passive' | 'reopen' | 'send-to-detailed-review'
  ) => {
    const token = await getToken();
    if (!token) return;
    try {
      const body =
        action === 'send-to-detailed-review'
          ? JSON.stringify({ internalNote: 'Mobil admin panelinden detaylı incelemeye sevk edildi.' })
          : undefined;
      const res = await fetch(`${API_URL}/admin/listing-moderation/listings/${listingId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body,
      });
      if (res.ok) {
        Alert.alert('Başarılı', 'İlan durumu güncellendi.');
        fetchListingStatusCounts();
        fetchListings();
        if (selectedListingId === listingId) {
          openListingInspection(listingId);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Hata', err.message || 'İşlem gerçekleştirilemedi.');
      }
    } catch {
      Alert.alert('Hata', 'Sunucu bağlantısı sağlanamadı.');
    }
  };

  const openReasonPrompt = (listingId: string, type: 'REJECT' | 'REQUEST_REVISION') => {
    setReasonTargetListingId(listingId);
    setReasonActionType(type);
    if (type === 'REQUEST_REVISION') {
      setReasonCode('PHOTO_INSUFFICIENT');
      setSellerMessage('Lütfen aracın fotoğraflarını ve eksik teknik bilgilerini güncelleyiniz.');
    } else {
      setReasonCode('FAKED_LISTING');
      setSellerMessage('İlanınız TorqueScout yayın ve güvenlik ilkelerine uymadığı için reddedilmiştir.');
    }
    setInternalNote('');
    setReasonModalOpen(true);
  };

  const submitReasonPrompt = async () => {
    if (!reasonTargetListingId) return;
    if (!sellerMessage.trim()) {
      Alert.alert('Uyarı', 'Satıcıya iletilecek açıklama zorunludur.');
      return;
    }
    const token = await getToken();
    if (!token) return;
    setSubmittingModeration(true);
    try {
      const endpoint = reasonActionType === 'REQUEST_REVISION' ? 'request-revision' : 'reject';
      const payload =
        reasonActionType === 'REQUEST_REVISION'
          ? { reasonCode, sellerMessage: sellerMessage.trim(), internalNote: internalNote.trim() }
          : {
              reasonCode,
              sellerMessage: sellerMessage.trim(),
              internalNote: internalNote.trim(),
              allowResubmission: false,
            };

      const res = await fetch(`${API_URL}/admin/listing-moderation/listings/${reasonTargetListingId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setReasonModalOpen(false);
        Alert.alert(
          'Başarılı',
          reasonActionType === 'REQUEST_REVISION' ? 'Satıcıdan düzeltme talep edildi.' : 'İlan reddedildi.'
        );
        fetchListingStatusCounts();
        fetchListings();
        if (selectedListingId === reasonTargetListingId) {
          openListingInspection(reasonTargetListingId);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Hata', err.message || 'İşlem başarısız oldu.');
      }
    } catch {
      Alert.alert('Hata', 'Sunucu hatası oluştu.');
    } finally {
      setSubmittingModeration(false);
    }
  };

  // ------------------------------------------
  // FETCHERS: LISTINGS PERFORMANCE & QUALITY
  // ------------------------------------------
  const fetchPerformance = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setPerfLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/reports/listings/performance?range=${perfRange}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPerfStats(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPerfLoading(false);
    }
  }, [perfRange]);

  const openPerfDrilldown = async (metric: string) => {
    setPerfDrilldownMetric(metric);
    setPerfDrilldownLoading(true);
    setPerfDrilldownData(null);
    const token = await getToken();
    try {
      const res = await fetch(
        `${API_URL}/admin/reports/listings/performance/drilldown?metric=${metric}&range=${perfRange}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setPerfDrilldownData(data);
      }
    } catch {} finally {
      setPerfDrilldownLoading(false);
    }
  };

  const fetchQuality = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setQualityLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/reports/listings/quality`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setQualityData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setQualityLoading(false);
    }
  }, []);

  const openQualityDrilldown = async (categoryKey: string) => {
    const check = qualityData?.checks?.[categoryKey];
    if (check?.status === 'OK') return;
    setQualityDrilldownCategory(categoryKey);
    setQualityDrilldownLoading(true);
    setQualityDrilldownData(null);
    const token = await getToken();
    try {
      const res = await fetch(
        `${API_URL}/admin/reports/listings/quality/drilldown?category=${categoryKey}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setQualityDrilldownData(data);
      }
    } catch {} finally {
      setQualityDrilldownLoading(false);
    }
  };

  // ------------------------------------------
  // FETCHERS: CLUB OVERVIEW
  // ------------------------------------------
  const fetchClubOverview = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setClubDashboardLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/club/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClubDashboard(data);
      }
    } catch {} finally {
      setClubDashboardLoading(false);
    }
  }, []);

  // ------------------------------------------
  // FETCHERS: CLUB POSTS & COMMENTS
  // ------------------------------------------
  const fetchClubPosts = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setClubPostsLoading(true);
    try {
      fetch(`${API_URL}/admin/club/posts?source=USER_SUBMISSIONS&status=PENDING_REVIEW`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : []))
        .then((arr) => setPendingUserPostsCount(Array.isArray(arr) ? arr.length : 0))
        .catch(() => {});

      let queryUrl = `${API_URL}/admin/club/posts?status=${clubPostTab}&source=ADMIN`;
      if (clubPostTab === 'USER_SUBMISSIONS') {
        queryUrl = `${API_URL}/admin/club/posts?source=USER_SUBMISSIONS&status=${clubUserSubFilter}`;
      }
      const res = await fetch(queryUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClubPosts(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClubPostsLoading(false);
    }
  }, [clubPostTab, clubUserSubFilter]);

  const fetchClubCommentsQueue = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setClubCommentsLoading(true);
    try {
      let res = await fetch(
        `${API_URL}/admin/club/comments/groups?status=${encodeURIComponent(clubCommentFilter)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        res = await fetch(`${API_URL}/admin/club/comments?status=${encodeURIComponent(clubCommentFilter)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (res.ok) {
        const data = await res.json();
        setClubCommentGroups(Array.isArray(data) ? data : []);
      }
    } catch {} finally {
      setClubCommentsLoading(false);
    }
  }, [clubCommentFilter]);

  const openClubPostDrawer = async (post: any) => {
    setSelectedClubPost(post);
    setPostCommentsLoading(true);
    setPostComments([]);
    const token = await getToken();
    try {
      const res = await fetch(`${API_URL}/admin/club/posts/${post.id}/comments?status=ALL`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPostComments(Array.isArray(data) ? data : data.comments || []);
      }
    } catch {} finally {
      setPostCommentsLoading(false);
    }
  };

  // ==========================================
  // CLUB CREATE / EDIT POST & PHOTO UPLOAD & POLLS
  // ==========================================
  const resetCreatePostForm = () => {
    setEditingPostId(null);
    setNewPostTitle('');
    setNewPostContent('');
    setNewPostMediaUrls([]);
    setManualMediaUrlInput('');
    setNewPostPinned(false);
    setNewPostCommentsEnabled(true);
    setPollEnabled(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setPollSelectionType('SINGLE');
    setPollMaxSelections(2);
    setPollResultVisibility('AFTER_VOTE');
    setPollDurationType('UNLIMITED');
    setPollNotifyOnClose(false);
  };

  const openNewClubPostModal = () => {
    resetCreatePostForm();
    setCreatePostModalOpen(true);
  };

  const openEditClubPostModal = (post: any) => {
    resetCreatePostForm();
    setEditingPostId(post.id);
    setNewPostTitle(post.title || '');
    setNewPostContent(post.content || '');
    const existingUrls = Array.isArray(post.media)
      ? post.media.map((m: any) => m.mediaUrl || m.url).filter(Boolean)
      : [];
    setNewPostMediaUrls(existingUrls);
    setNewPostPinned(!!post.isPinned);
    setNewPostCommentsEnabled(post.commentsEnabled !== false);
    setCreatePostModalOpen(true);
  };

  const handlePickClubPostImages = async () => {
    try {
      if (!ImagePicker) {
        Alert.alert('Hata', 'Fotoğraf seçici modülü yüklenemedi.');
        return;
      }
      if (newPostMediaUrls.length >= 10) {
        Alert.alert('Limit Doldu', 'Gönderi başına en fazla 10 fotoğraf yüklenebilir.');
        return;
      }
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Fotoğraf yüklemek için galeri erişim izni vermelisiniz.');
        return;
      }
      const remaining = 10 - newPostMediaUrls.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'Images',
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const token = await getToken();
        if (!token) return;
        setUploadingPostMedia(true);
        const uploadedUrls: string[] = [];

        for (const asset of result.assets) {
          const uri = asset.uri;
          if (!uri) continue;
          const formData = new FormData();
          const filename = uri.split('/').pop() || `club-post-${Date.now()}.jpg`;
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';

          formData.append('file', {
            uri,
            name: filename,
            type,
          } as any);

          let uploadRes = await fetch(`${API_URL}/admin/club/media/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });

          if (!uploadRes.ok) {
            uploadRes = await fetch(`${API_URL}/club/media/upload`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            });
          }

          if (uploadRes.ok) {
            const data = await uploadRes.json();
            if (data?.url) uploadedUrls.push(data.url);
          }
        }

        if (uploadedUrls.length > 0) {
          setNewPostMediaUrls((prev) => [...prev, ...uploadedUrls].slice(0, 10));
        } else {
          Alert.alert('Hata', 'Seçilen görseller sunucuya yüklenemedi.');
        }
      }
    } catch (e) {
      console.error('Pick club post image error:', e);
      Alert.alert('Hata', 'Fotoğraf yükleme sırasında bir hata oluştu.');
    } finally {
      setUploadingPostMedia(false);
    }
  };

  const handleAddManualMediaUrl = () => {
    const trimmed = manualMediaUrlInput.trim();
    if (!trimmed) return;
    if (newPostMediaUrls.length >= 10) {
      Alert.alert('Limit Doldu', 'En fazla 10 görsel ekleyebilirsiniz.');
      return;
    }
    setNewPostMediaUrls((prev) => [...prev, trimmed]);
    setManualMediaUrlInput('');
  };

  const handleRemovePostMedia = (idx: number) => {
    setNewPostMediaUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddPollOption = () => {
    if (pollOptions.length >= 10) return;
    setPollOptions((prev) => [...prev, '']);
  };

  const handleRemovePollOption = (idx: number) => {
    if (pollOptions.length <= 2) return;
    const next = pollOptions.filter((_, i) => i !== idx);
    setPollOptions(next);
    setPollMaxSelections((prev) => Math.min(prev, next.length));
  };

  const handleUpdatePollOption = (idx: number, val: string) => {
    const next = [...pollOptions];
    next[idx] = val;
    setPollOptions(next);
  };

  const handleMovePollOption = (idx: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= pollOptions.length) return;
    const next = [...pollOptions];
    const tmp = next[idx];
    next[idx] = next[target];
    next[target] = tmp;
    setPollOptions(next);
  };

  const computePollEndsAtIso = (): string | undefined => {
    if (pollDurationType === 'UNLIMITED') return undefined;
    const now = new Date();
    switch (pollDurationType) {
      case '1H':
        now.setHours(now.getHours() + 1);
        break;
      case '6H':
        now.setHours(now.getHours() + 6);
        break;
      case '12H':
        now.setHours(now.getHours() + 12);
        break;
      case '1D':
        now.setDate(now.getDate() + 1);
        break;
      case '3D':
        now.setDate(now.getDate() + 3);
        break;
      case '7D':
        now.setDate(now.getDate() + 7);
        break;
    }
    return now.toISOString();
  };

  const handleCreateOrUpdateClubPost = async (publishImmediately: boolean) => {
    const hasTitle = !!newPostTitle.trim();
    const hasContent = !!newPostContent.trim();
    const hasMedia = newPostMediaUrls.length > 0;
    const hasPoll = pollEnabled && !!pollQuestion.trim();

    if (!hasTitle && !hasContent && !hasMedia && !hasPoll) {
      Alert.alert(
        'Eksik Bilgi',
        'Lütfen gönderi başlığı, metni, fotoğraf veya anket alanlarından en az birini doldurun.'
      );
      return;
    }

    if (pollEnabled && !editingPostId) {
      if (!pollQuestion.trim()) {
        Alert.alert('Eksik Anket Sorusu', 'Lütfen anket sorusunu girin.');
        return;
      }
      const validOpts = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (validOpts.length < 2) {
        Alert.alert('Eksik Seçenek', 'Anket için en az 2 geçerli seçenek girmelisiniz.');
        return;
      }
    }

    const token = await getToken();
    if (!token) return;
    setCreatingPost(true);
    try {
      if (editingPostId) {
        // Update existing post
        const res = await fetch(`${API_URL}/admin/club/posts/${editingPostId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: newPostTitle.trim() || undefined,
            content: newPostContent.trim() || undefined,
            isPinned: newPostPinned,
            commentsEnabled: newPostCommentsEnabled,
          }),
        });
        if (res.ok) {
          setCreatePostModalOpen(false);
          resetCreatePostForm();
          Alert.alert('Başarılı', 'Gönderi güncellendi.');
          fetchClubPosts();
        } else {
          const err = await res.json().catch(() => ({}));
          Alert.alert('Hata', err.message || 'Gönderi güncellenemedi.');
        }
        return;
      }

      const payload: any = {
        title: newPostTitle.trim() || undefined,
        content: newPostContent.trim() || undefined,
        mediaUrls: newPostMediaUrls,
        isPinned: newPostPinned,
        commentsEnabled: newPostCommentsEnabled,
        publishImmediately,
      };

      if (pollEnabled) {
        payload.poll = {
          question: pollQuestion.trim(),
          options: pollOptions.map((o) => o.trim()).filter(Boolean),
          selectionType: pollSelectionType,
          maxSelections: pollSelectionType === 'MULTIPLE' ? pollMaxSelections : 1,
          resultVisibility: pollResultVisibility,
          endsAt: computePollEndsAtIso(),
          notifyParticipantsOnClose: pollNotifyOnClose,
        };
      }

      const res = await fetch(`${API_URL}/admin/club/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setCreatePostModalOpen(false);
        resetCreatePostForm();
        Alert.alert(
          'Başarılı',
          publishImmediately ? 'Gönderi başarıyla yayınlandı!' : 'Gönderi taslak olarak kaydedildi.'
        );
        fetchClubPosts();
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Hata', err.message || 'Gönderi oluşturulamadı.');
      }
    } catch {
      Alert.alert('Hata', 'Sunucu hatası oluştu.');
    } finally {
      setCreatingPost(false);
    }
  };

  const handleClubPostAction = async (
    postId: string,
    action: 'publish' | 'archive' | 'approve' | 'comments-toggle'
  ) => {
    const token = await getToken();
    if (!token) return;
    try {
      const method = action === 'comments-toggle' ? 'PATCH' : 'POST';
      const res = await fetch(`${API_URL}/admin/club/posts/${postId}/${action}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        Alert.alert('Başarılı', 'Gönderi durumu güncellendi.');
        fetchClubPosts();
        if (selectedClubPost?.id === postId) {
          setSelectedClubPost(null);
        }
      } else {
        Alert.alert('Hata', 'İşlem tamamlanamadı.');
      }
    } catch {
      Alert.alert('Hata', 'Sunucu bağlantısı sağlanamadı.');
    }
  };

  const handleTogglePinPost = async (post: any) => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/admin/club/posts/${post.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPinned: !post.isPinned }),
      });
      if (res.ok) {
        Alert.alert('Başarılı', post.isPinned ? 'Sabitleme kaldırıldı.' : 'Gönderi sabitlendi.');
        fetchClubPosts();
      }
    } catch {}
  };

  const handleClosePoll = async (pollId: string) => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/admin/club/polls/${pollId}/close`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        Alert.alert('Başarılı', 'Anket oylamaya kapatıldı.');
        fetchClubPosts();
        setSelectedClubPost(null);
      }
    } catch {}
  };

  const submitRejectUserPost = async () => {
    if (!rejectTargetPost) return;
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/admin/club/posts/${rejectTargetPost.id}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason:
            rejectPostReason.trim() ||
            'İlan niteliğinde veya satış amaçlı paylaşım tespit edildiği için yayınlanmadı.',
        }),
      });
      if (res.ok) {
        setRejectPostModalOpen(false);
        setRejectTargetPost(null);
        Alert.alert('Başarılı', 'Kullanıcı gönderisi reddedildi.');
        fetchClubPosts();
        if (selectedClubPost?.id === rejectTargetPost.id) {
          setSelectedClubPost(null);
        }
      } else {
        Alert.alert('Hata', 'Gönderi reddedilemedi.');
      }
    } catch {
      Alert.alert('Hata', 'Sunucu hatası oluştu.');
    }
  };

  const handleCommentAction = async (
    commentId: string,
    action: 'publish' | 'review' | 'hide' | 'delete'
  ) => {
    const token = await getToken();
    if (!token) return;
    try {
      const body = action === 'hide' ? JSON.stringify({ reason: 'Moderatör tarafından gizlendi' }) : undefined;
      const res = await fetch(`${API_URL}/admin/club/comments/${commentId}/${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
      });
      if (res.ok) {
        if (selectedClubPost) {
          openClubPostDrawer(selectedClubPost);
        }
        if (clubSubTab === 'CLUB_COMMENTS') {
          fetchClubCommentsQueue();
        }
        if (clubSubTab === 'CLUB_REPORTS') {
          fetchClubReports();
        }
      } else {
        Alert.alert('Hata', 'Yorum durumu güncellenemedi.');
      }
    } catch {
      Alert.alert('Hata', 'İşlem başarısız.');
    }
  };

  // ------------------------------------------
  // FETCHERS: CLUB MEMBERS, MODERATORS & RESTRICTIONS
  // ------------------------------------------
  const fetchClubMembersAndRestrictions = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    if (clubUsersMode === 'MEMBERS') {
      setClubMembersLoading(true);
      try {
        const q = clubMembersSearch.trim() ? `?search=${encodeURIComponent(clubMembersSearch.trim())}` : '';
        let res = await fetch(`${API_URL}/admin/club/users${q}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          res = await fetch(`${API_URL}/club/users?limit=50`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
        if (res.ok) {
          const data = await res.json();
          setClubMembers(Array.isArray(data) ? data : data.users || data.items || []);
        }
      } catch {} finally {
        setClubMembersLoading(false);
      }
    } else if (clubUsersMode === 'MODERATORS') {
      setClubMembersLoading(true);
      try {
        const res = await fetch(`${API_URL}/admin/club/moderators`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setClubModerators(Array.isArray(data) ? data : []);
        }
      } catch {} finally {
        setClubMembersLoading(false);
      }
    } else {
      setClubRestrictionsLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/admin/club/restrictions?type=${clubRestrictionsType}&status=ALL`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setClubRestrictions(Array.isArray(data) ? data : []);
        }
      } catch {} finally {
        setClubRestrictionsLoading(false);
      }
    }
  }, [clubUsersMode, clubMembersSearch, clubRestrictionsType]);

  const handleSubmitRestriction = async () => {
    if (!restrictModalUser) return;
    const token = await getToken();
    if (!token) return;
    setSubmittingRestrict(true);
    try {
      const targetUserId = restrictModalUser.id || restrictModalUser.userId;
      const endpoint = restrictType === 'BAN' ? 'ban' : 'mute';
      const payload =
        restrictType === 'BAN'
          ? { reason: restrictReason.trim() || 'Kulüp kuralları ihlali' }
          : {
              reason: restrictReason.trim() || 'Kulüp kuralları ihlali',
              durationHours: parseInt(restrictDurationHours, 10) || 24,
            };

      const res = await fetch(`${API_URL}/admin/club/users/${targetUserId}/${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setRestrictModalUser(null);
        Alert.alert(
          'Başarılı',
          restrictType === 'BAN' ? 'Kullanıcı kulüpten yasaklandı.' : 'Kullanıcı susturuldu.'
        );
        fetchClubMembersAndRestrictions();
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Hata', err.message || 'Kısıtlama uygulanamadı.');
      }
    } catch {
      Alert.alert('Hata', 'Sunucu hatası oluştu.');
    } finally {
      setSubmittingRestrict(false);
    }
  };

  const handleRevokeRestriction = async (restrictionId: string) => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/admin/club/restrictions/${restrictionId}/revoke`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        Alert.alert('Başarılı', 'Kısıtlama kaldırıldı.');
        fetchClubMembersAndRestrictions();
      } else {
        Alert.alert('Hata', 'Kısıtlama kaldırılamadı.');
      }
    } catch {
      Alert.alert('Hata', 'Sunucu hatası.');
    }
  };

  const handleToggleModerator = async (userId: string, isCurrentlyMod: boolean) => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/admin/club/moderators/${userId}`, {
        method: isCurrentlyMod ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        Alert.alert('Başarılı', isCurrentlyMod ? 'Moderatör yetkisi alındı.' : 'Moderatör olarak atandı.');
        fetchClubMembersAndRestrictions();
      } else {
        Alert.alert('Hata', 'Yetki güncellenemedi.');
      }
    } catch {
      Alert.alert('Hata', 'Sunucu hatası.');
    }
  };

  // ------------------------------------------
  // FETCHERS: CLUB DIRECT & BULK MESSAGES
  // ------------------------------------------
  const handleSendDirectMessage = async () => {
    if (!msgTargetUser || !directMsgText.trim()) return;
    const token = await getToken();
    if (!token) return;
    setSendingDirectMsg(true);
    try {
      const res = await fetch(`${API_URL}/admin/club/users/${msgTargetUser.id}/message`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: directMsgText.trim(),
          sendNotification: true,
        }),
      });
      if (res.ok) {
        setDirectMsgText('');
        setMsgTargetUser(null);
        Alert.alert('Başarılı', 'Mesaj ve bildirim kullanıcıya iletildi.');
      } else {
        Alert.alert('Hata', 'Mesaj gönderilemedi.');
      }
    } catch {
      Alert.alert('Hata', 'Sunucu hatası.');
    } finally {
      setSendingDirectMsg(false);
    }
  };

  const handleSendBulkMessage = async () => {
    if (selectedBulkUserIds.length === 0 || !bulkMsgText.trim()) return;
    const token = await getToken();
    if (!token) return;
    setSendingBulkMsg(true);
    try {
      const res = await fetch(`${API_URL}/admin/club/messages/bulk`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: selectedBulkUserIds,
          content: bulkMsgText.trim(),
          sendNotification: true,
        }),
      });
      if (res.ok) {
        setBulkMsgModalOpen(false);
        setBulkMsgText('');
        setSelectedBulkUserIds([]);
        Alert.alert('Başarılı', 'Toplu mesaj kuyruğa alındı ve gönderildi.');
      } else {
        Alert.alert('Hata', 'Toplu mesaj gönderilemedi.');
      }
    } catch {
      Alert.alert('Hata', 'Sunucu hatası.');
    } finally {
      setSendingBulkMsg(false);
    }
  };

  // ------------------------------------------
  // FETCHERS: CLUB REPORTS & COMPLAINTS
  // ------------------------------------------
  const fetchClubReports = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setClubReportsLoading(true);
    try {
      const [repRes, commRes] = await Promise.all([
        fetch(`${API_URL}/admin/club/reports?section=${clubReportSection}&range=${clubReportRange}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/admin/club/comments?status=HIDDEN`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (repRes.ok) {
        const data = await repRes.json();
        setClubReportsData(data);
      }
      if (commRes.ok) {
        const cData = await commRes.json();
        setFlaggedComments(Array.isArray(cData) ? cData : cData.comments || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClubReportsLoading(false);
    }
  }, [clubReportSection, clubReportRange]);

  // ------------------------------------------
  // FETCHERS: CLUB SETTINGS & AUDIT LOGS
  // ------------------------------------------
  const fetchClubSettingsAndLogs = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    if (settingsOrLogsMode === 'SETTINGS') {
      setClubSettingsLoading(true);
      try {
        const res = await fetch(`${API_URL}/admin/club/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setClubSettings((prev) => ({ ...prev, ...data }));
        }
      } catch {} finally {
        setClubSettingsLoading(false);
      }
    } else {
      setAuditLogsLoading(true);
      try {
        const res = await fetch(`${API_URL}/admin/club/moderation-log?limit=80`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAuditLogs(Array.isArray(data) ? data : []);
        }
      } catch {} finally {
        setAuditLogsLoading(false);
      }
    }
  }, [settingsOrLogsMode]);

  const handleSaveClubSettings = async () => {
    const token = await getToken();
    if (!token) return;
    setSavingClubSettings(true);
    try {
      const res = await fetch(`${API_URL}/admin/club/settings`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clubSettings),
      });
      if (res.ok) {
        Alert.alert('Başarılı', 'Club topluluk ayarları kaydedildi ve Audit Log yazıldı.');
      } else {
        Alert.alert('Hata', 'Ayarlar güncellenemedi.');
      }
    } catch {
      Alert.alert('Hata', 'Sunucu hatası.');
    } finally {
      setSavingClubSettings(false);
    }
  };

  // Trigger fetches based on active tab
  useEffect(() => {
    if (mainSection === 'LISTINGS') {
      if (listingsSubTab === 'LISTING_MODERATION') {
        fetchListingStatusCounts();
        fetchListings();
      } else if (listingsSubTab === 'LISTING_PERFORMANCE') {
        fetchPerformance();
      } else if (listingsSubTab === 'LISTING_QUALITY') {
        fetchQuality();
      }
    } else if (mainSection === 'CLUB') {
      if (clubSubTab === 'CLUB_OVERVIEW') {
        fetchClubOverview();
      } else if (clubSubTab === 'CLUB_POSTS') {
        fetchClubPosts();
      } else if (clubSubTab === 'CLUB_COMMENTS') {
        fetchClubCommentsQueue();
      } else if (clubSubTab === 'CLUB_USERS' || clubSubTab === 'CLUB_MESSAGES') {
        fetchClubMembersAndRestrictions();
      } else if (clubSubTab === 'CLUB_REPORTS') {
        fetchClubReports();
      } else if (clubSubTab === 'CLUB_SETTINGS_LOGS') {
        fetchClubSettingsAndLogs();
      }
    }
  }, [
    mainSection,
    listingsSubTab,
    clubSubTab,
    fetchListingStatusCounts,
    fetchListings,
    fetchPerformance,
    fetchQuality,
    fetchClubOverview,
    fetchClubPosts,
    fetchClubCommentsQueue,
    fetchClubMembersAndRestrictions,
    fetchClubReports,
    fetchClubSettingsAndLogs,
  ]);

  const handleRefreshCurrent = () => {
    if (mainSection === 'LISTINGS') {
      if (listingsSubTab === 'LISTING_MODERATION') {
        fetchListingStatusCounts();
        fetchListings();
      } else if (listingsSubTab === 'LISTING_PERFORMANCE') {
        fetchPerformance();
      } else {
        fetchQuality();
      }
    } else {
      if (clubSubTab === 'CLUB_OVERVIEW') fetchClubOverview();
      else if (clubSubTab === 'CLUB_POSTS') fetchClubPosts();
      else if (clubSubTab === 'CLUB_COMMENTS') fetchClubCommentsQueue();
      else if (clubSubTab === 'CLUB_USERS' || clubSubTab === 'CLUB_MESSAGES')
        fetchClubMembersAndRestrictions();
      else if (clubSubTab === 'CLUB_REPORTS') fetchClubReports();
      else fetchClubSettingsAndLogs();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* TOP BAR */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.headerTitle}>TorkScout Admin</Text>
            <View style={styles.adminPill}>
              <Text style={styles.adminPillText}>BACKOFFICE</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>Mobil Operasyon & Moderasyon Merkezi</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefreshCurrent}>
          <Ionicons name="refresh" size={18} color="#f97316" />
        </TouchableOpacity>
      </View>

      {/* MAIN SECTION TABS (İLANLAR vs TORK SCOUT CLUB) */}
      <View style={styles.mainTabsContainer}>
        <TouchableOpacity
          style={[styles.mainTabBtn, mainSection === 'LISTINGS' && styles.mainTabBtnActive]}
          onPress={() => setMainSection('LISTINGS')}
          activeOpacity={0.85}
        >
          <Ionicons
            name="car-sport"
            size={16}
            color={mainSection === 'LISTINGS' ? '#ffffff' : '#94a3b8'}
          />
          <Text style={[styles.mainTabText, mainSection === 'LISTINGS' && styles.mainTabTextActive]}>
            İlanlar
          </Text>
          {(listingCounts['PENDING_REVIEW'] ?? 0) > 0 && (
            <View style={styles.mainTabBadge}>
              <Text style={styles.mainTabBadgeText}>{listingCounts['PENDING_REVIEW']}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainTabBtn, mainSection === 'CLUB' && styles.mainTabBtnActive]}
          onPress={() => setMainSection('CLUB')}
          activeOpacity={0.85}
        >
          <Ionicons
            name="shield-checkmark"
            size={16}
            color={mainSection === 'CLUB' ? '#ffffff' : '#94a3b8'}
          />
          <Text style={[styles.mainTabText, mainSection === 'CLUB' && styles.mainTabTextActive]}>
            Tork Scout Club
          </Text>
          {pendingUserPostsCount > 0 && (
            <View style={[styles.mainTabBadge, { backgroundColor: '#06b6d4' }]}>
              <Text style={[styles.mainTabBadgeText, { color: '#020617' }]}>{pendingUserPostsCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* SUB-TABS BAR */}
      {mainSection === 'LISTINGS' ? (
        <View style={styles.subTabsBar}>
          {[
            { key: 'LISTING_MODERATION', label: 'İlan Moderasyonu', icon: 'shield-outline' },
            { key: 'LISTING_PERFORMANCE', label: 'İlan Performansı', icon: 'stats-chart-outline' },
            { key: 'LISTING_QUALITY', label: 'İlan Veri Sağlığı', icon: 'pulse-outline' },
          ].map((sub) => {
            const active = listingsSubTab === sub.key;
            return (
              <TouchableOpacity
                key={sub.key}
                style={[styles.subTabChip, active && styles.subTabChipActive]}
                onPress={() => setListingsSubTab(sub.key as ListingsSubTab)}
              >
                <Ionicons name={sub.icon as any} size={13} color={active ? '#f97316' : '#94a3b8'} />
                <Text style={[styles.subTabChipText, active && styles.subTabChipTextActive]}>
                  {sub.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.subTabsScrollWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 10, gap: 6 }}
          >
            {[
              { key: 'CLUB_OVERVIEW', label: 'Genel Bakış', icon: 'grid-outline' },
              { key: 'CLUB_POSTS', label: 'Gönderiler & Moderasyon', icon: 'newspaper-outline' },
              { key: 'CLUB_COMMENTS', label: 'Yorumlar', icon: 'chatbubbles-outline' },
              { key: 'CLUB_USERS', label: 'Üyeler, Mod & Ban', icon: 'people-outline' },
              { key: 'CLUB_MESSAGES', label: 'Mesajlar', icon: 'mail-outline' },
              { key: 'CLUB_REPORTS', label: 'Şikayet & Raporlar', icon: 'flag-outline' },
              { key: 'CLUB_SETTINGS_LOGS', label: 'Ayarlar & Audit Log', icon: 'settings-outline' },
            ].map((sub) => {
              const active = clubSubTab === sub.key;
              return (
                <TouchableOpacity
                  key={sub.key}
                  style={[styles.subTabChipScrollable, active && styles.subTabChipActive]}
                  onPress={() => setClubSubTab(sub.key as ClubSubTab)}
                >
                  <Ionicons name={sub.icon as any} size={13} color={active ? '#f97316' : '#94a3b8'} />
                  <Text style={[styles.subTabChipText, active && styles.subTabChipTextActive]}>
                    {sub.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* BODY CONTENT */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, paddingBottom: 48, gap: 14 }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={handleRefreshCurrent} tintColor="#f97316" />
        }
      >
        {/* ============================================================ */}
        {/* SECTION 1A: LISTINGS -> İLAN MODERASYONU                     */}
        {/* ============================================================ */}
        {mainSection === 'LISTINGS' && listingsSubTab === 'LISTING_MODERATION' && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
            >
              {LISTING_STATUS_TABS.map((st) => {
                const isActive = listingStatus === st.key;
                const count = listingCounts[st.key] ?? 0;
                return (
                  <TouchableOpacity
                    key={st.key}
                    style={[styles.statusPill, isActive && styles.statusPillActive]}
                    onPress={() => {
                      setListingStatus(st.key);
                      setListingsPage(1);
                    }}
                  >
                    <Text style={[styles.statusPillText, isActive && styles.statusPillTextActive]}>
                      {st.label}
                    </Text>
                    <View style={[styles.statusCountBox, isActive && styles.statusCountBoxActive]}>
                      <Text style={[styles.statusCountText, isActive && { color: '#fff' }]}>{count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Search & Quick Filters */}
            <View style={styles.filterBox}>
              <View style={styles.searchRow}>
                <Ionicons name="search" size={16} color="#64748b" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="İlan no, müşteri no, satıcı, araç, şehir ara..."
                  placeholderTextColor="#64748b"
                  value={listingSearch}
                  onChangeText={setListingSearch}
                  onSubmitEditing={() => {
                    setListingsPage(1);
                    fetchListings();
                  }}
                  returnKeyType="search"
                />
                {listingSearch.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setListingSearch('');
                      setListingsPage(1);
                    }}
                  >
                    <Ionicons name="close-circle" size={16} color="#64748b" />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, marginTop: 8 }}
              >
                {[
                  { key: 'ALL', label: 'Tüm Satıcılar' },
                  { key: 'OWNER', label: 'Sahibinden' },
                  { key: 'DEALER', label: 'Galeriden' },
                  { key: 'AUTHORIZED_DEALER', label: 'Yetkili Bayi' },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.key}
                    style={[
                      styles.miniFilterChip,
                      sellerTypeFilter === s.key && styles.miniFilterChipActive,
                    ]}
                    onPress={() => {
                      setSellerTypeFilter(s.key);
                      setListingsPage(1);
                    }}
                  >
                    <Text
                      style={[
                        styles.miniFilterText,
                        sellerTypeFilter === s.key && styles.miniFilterTextActive,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                {[
                  { key: 'HIGH', label: 'Yüksek Risk' },
                  { key: 'MEDIUM', label: 'Orta Risk' },
                ].map((r) => (
                  <TouchableOpacity
                    key={r.key}
                    style={[
                      styles.miniFilterChip,
                      riskFilter === r.key && styles.miniFilterChipActive,
                    ]}
                    onPress={() => {
                      setRiskFilter(riskFilter === r.key ? 'ALL' : r.key);
                      setListingsPage(1);
                    }}
                  >
                    <Text
                      style={[
                        styles.miniFilterText,
                        riskFilter === r.key && styles.miniFilterTextActive,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.miniFilterChip}
                  onPress={() => setListingSort((prev) => (prev === 'NEWEST' ? 'OLDEST' : 'NEWEST'))}
                >
                  <Text style={styles.miniFilterText}>
                    ⇅ {listingSort === 'NEWEST' ? 'En Yeni Önce' : 'En Eski Önce'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Listings List */}
            {listingsLoading ? (
              <View style={styles.loaderBox}>
                <TorkScoutLoader />
                <Text style={styles.loaderText}>İlanlar yükleniyor...</Text>
              </View>
            ) : listings.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="car-outline" size={38} color="#475569" />
                <Text style={styles.emptyTitle}>Bu sekmede ilan bulunmuyor</Text>
                <Text style={styles.emptySubtitle}>
                  Seçili moderasyon durumunda gösterilecek ilan kaydı yok.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {listings.map((item) => {
                  const listingId = item.id;
                  const seller = item.seller;
                  const brandName = item.vehicleVariant?.model?.brand?.name || item.customBrand || '';
                  const modelName = item.vehicleVariant?.model?.name || item.customModel || '';
                  const trimName = item.vehicleVariant?.trim?.name || item.customEngine || '';
                  const vehicleTitle =
                    item.title || `${item.modelYear || ''} ${brandName} ${modelName}`.trim() || 'Araç İlanı';
                  const firstImg = item.media?.[0]?.url ? resolveMediaUrl(item.media[0].url) : null;
                  const risk = item.heavyDamage
                    ? 'YÜKSEK'
                    : item.tramerAmount > 20000
                    ? 'ORTA'
                    : 'DÜŞÜK';

                  return (
                    <TouchableOpacity
                      key={listingId}
                      style={styles.listingCard}
                      activeOpacity={0.88}
                      onPress={() => openListingInspection(listingId)}
                    >
                      <View style={styles.listingCardTop}>
                        {firstImg ? (
                          <Image source={{ uri: firstImg }} style={styles.listingThumb} />
                        ) : (
                          <View style={[styles.listingThumb, styles.listingThumbPlaceholder]}>
                            <Ionicons name="car-outline" size={24} color="#64748b" />
                          </View>
                        )}

                        <View style={{ flex: 1, gap: 3 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={styles.listingNoText}>#{item.listingNo || listingId.slice(0, 8)}</Text>
                            <View
                              style={[
                                styles.riskBadge,
                                risk === 'YÜKSEK'
                                  ? styles.riskHigh
                                  : risk === 'ORTA'
                                  ? styles.riskMed
                                  : styles.riskLow,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.riskBadgeText,
                                  risk === 'YÜKSEK'
                                    ? { color: '#f87171' }
                                    : risk === 'ORTA'
                                    ? { color: '#fbbf24' }
                                    : { color: '#34d399' },
                                ]}
                              >
                                {risk} RİSK
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.listingTitleText} numberOfLines={1}>
                            {vehicleTitle}
                          </Text>
                          {!!trimName && (
                            <Text style={styles.listingVariantText} numberOfLines={1}>
                              {trimName}
                            </Text>
                          )}

                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                            <Text style={styles.listingPriceText}>
                              ₺{Number(item.priceAmount || 0).toLocaleString('tr-TR')}
                            </Text>
                            <Text style={styles.listingMetaText}>
                              {item.city || 'Belirtilmedi'} • 📷 {item.media?.length || 0}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.listingSellerRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          <Ionicons name="person-circle-outline" size={16} color="#f97316" />
                          <Text style={styles.listingSellerName} numberOfLines={1}>
                            {seller
                              ? seller.firstName && seller.lastName
                                ? `${seller.firstName} ${seller.lastName}`
                                : seller.email
                              : 'Bilinmeyen Satıcı'}
                          </Text>
                          {seller?.customerNo && (
                            <Text style={styles.listingCustomerNo}>({seller.customerNo})</Text>
                          )}
                        </View>
                        <Text style={styles.listingDateText}>
                          {new Date(item.createdAt || Date.now()).toLocaleDateString('tr-TR')}
                        </Text>
                      </View>

                      <View style={styles.listingActionRow}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnNeutral]}
                          onPress={() => openListingInspection(listingId)}
                        >
                          <Ionicons name="eye-outline" size={14} color="#f97316" />
                          <Text style={[styles.actionBtnText, { color: '#f97316' }]}>İncele</Text>
                        </TouchableOpacity>

                        {(listingStatus === 'PENDING_REVIEW' ||
                          listingStatus === 'REVISION_REQUIRED' ||
                          listingStatus === 'DETAILED_REVIEW') && (
                          <>
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.actionBtnApprove]}
                              onPress={() => handleListingQuickAction(listingId, 'approve')}
                            >
                              <Ionicons name="checkmark-circle-outline" size={14} color="#10b981" />
                              <Text style={[styles.actionBtnText, { color: '#10b981' }]}>Onayla</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.actionBtn, styles.actionBtnWarn]}
                              onPress={() => openReasonPrompt(listingId, 'REQUEST_REVISION')}
                            >
                              <Ionicons name="create-outline" size={14} color="#f59e0b" />
                              <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>Düzeltme</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.actionBtn, styles.actionBtnReject]}
                              onPress={() => openReasonPrompt(listingId, 'REJECT')}
                            >
                              <Ionicons name="close-circle-outline" size={14} color="#ef4444" />
                              <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Reddet</Text>
                            </TouchableOpacity>
                          </>
                        )}

                        {listingStatus === 'ACTIVE' && (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnWarn]}
                            onPress={() => handleListingQuickAction(listingId, 'set-passive')}
                          >
                            <Ionicons name="pause-circle-outline" size={14} color="#f59e0b" />
                            <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>Pasife Al</Text>
                          </TouchableOpacity>
                        )}

                        {(listingStatus === 'REJECTED' || listingStatus === 'PASSIVE') && (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnInfo]}
                            onPress={() => handleListingQuickAction(listingId, 'reopen')}
                          >
                            <Ionicons name="refresh-outline" size={14} color="#38bdf8" />
                            <Text style={[styles.actionBtnText, { color: '#38bdf8' }]}>Tekrar İncele</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {listingsTotalPages > 1 && (
                  <View style={styles.paginationBar}>
                    <TouchableOpacity
                      disabled={listingsPage <= 1}
                      style={[styles.pageBtn, listingsPage <= 1 && { opacity: 0.4 }]}
                      onPress={() => setListingsPage((p) => Math.max(1, p - 1))}
                    >
                      <Ionicons name="chevron-back" size={16} color="#f8fafc" />
                      <Text style={styles.pageBtnText}>Önceki</Text>
                    </TouchableOpacity>
                    <Text style={styles.pageInfoText}>
                      Sayfa {listingsPage} / {listingsTotalPages} ({listingsTotal} İlan)
                    </Text>
                    <TouchableOpacity
                      disabled={listingsPage >= listingsTotalPages}
                      style={[styles.pageBtn, listingsPage >= listingsTotalPages && { opacity: 0.4 }]}
                      onPress={() => setListingsPage((p) => Math.min(listingsTotalPages, p + 1))}
                    >
                      <Text style={styles.pageBtnText}>Sonraki</Text>
                      <Ionicons name="chevron-forward" size={16} color="#f8fafc" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* SECTION 1B: LISTINGS -> İLAN PERFORMANSI                     */}
        {/* ============================================================ */}
        {mainSection === 'LISTINGS' && listingsSubTab === 'LISTING_PERFORMANCE' && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {[
                { key: '7d', label: 'Son 7 Gün' },
                { key: '30d', label: 'Son 30 Gün' },
                { key: '90d', label: 'Son 90 Gün' },
                { key: 'all', label: 'Tüm Zamanlar' },
              ].map((r) => (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.statusPill, perfRange === r.key && styles.statusPillActive]}
                  onPress={() => setPerfRange(r.key)}
                >
                  <Text style={[styles.statusPillText, perfRange === r.key && styles.statusPillTextActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {perfLoading ? (
              <View style={styles.loaderBox}>
                <TorkScoutLoader />
                <Text style={styles.loaderText}>Performans analitiği hesaplanıyor...</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {[
                  {
                    key: 'views',
                    title: 'Toplam Görüntülenme',
                    value: perfStats?.totalViews ?? 0,
                    sub: `Tekil Ziyaretçi: ${perfStats?.uniqueViews ?? 0}`,
                    color: '#38bdf8',
                    icon: 'eye-outline',
                  },
                  {
                    key: 'favorites',
                    title: 'Toplam Favoriye Ekleme',
                    value: perfStats?.totalFavorites ?? 0,
                    sub: `Favoriye Alma Oranı: %${perfStats?.favoriteRate ?? 0}`,
                    color: '#fb7185',
                    icon: 'heart-outline',
                  },
                  {
                    key: 'leads',
                    title: 'Toplam İletişim / Lead',
                    value: perfStats?.totalLeads ?? 0,
                    sub: 'Satıcı İletişim Aksiyonları',
                    color: '#34d399',
                    icon: 'chatbubble-ellipses-outline',
                  },
                  {
                    key: 'avgViews',
                    title: 'Ort. Görüntülenme / İlan',
                    value: perfStats?.averageViewsPerListing ?? 0,
                    sub: `Dönüşüm Oranı: %${perfStats?.conversionRate ?? 0}`,
                    color: '#fbbf24',
                    icon: 'trending-up-outline',
                  },
                  {
                    key: 'activeListings',
                    title: 'Aktif İlanlar',
                    value: perfStats?.activeListings ?? 0,
                    sub: `Dönemde Yeni: +${perfStats?.newlyPublishedInPeriod ?? 0}`,
                    color: '#f97316',
                    icon: 'car-sport-outline',
                  },
                  {
                    key: 'avgLeads',
                    title: 'Ort. İletişim / İlan',
                    value: perfStats?.averageLeadsPerListing ?? 0,
                    sub: 'Aktif İlan Başına Etkileşim',
                    color: '#c084fc',
                    icon: 'pricetag-outline',
                  },
                ].map((kpi) => (
                  <TouchableOpacity
                    key={kpi.key}
                    style={styles.kpiCard}
                    activeOpacity={0.85}
                    onPress={() => openPerfDrilldown(kpi.key)}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.kpiTitle}>{kpi.title}</Text>
                      <View style={[styles.kpiIconBox, { backgroundColor: `${kpi.color}18` }]}>
                        <Ionicons name={kpi.icon as any} size={18} color={kpi.color} />
                      </View>
                    </View>
                    <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.kpiSub}>{kpi.sub}</Text>
                      <Text style={styles.kpiActionLink}>Detayları Gör ➔</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* SECTION 1C: LISTINGS -> İLAN VERİ SAĞLIĞI                    */}
        {/* ============================================================ */}
        {mainSection === 'LISTINGS' && listingsSubTab === 'LISTING_QUALITY' && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionHelperText}>
                {qualityData?.checkedAt
                  ? `Son tarama: ${new Date(qualityData.checkedAt).toLocaleString('tr-TR')}`
                  : 'Veritabanı bütünlük ve anomali taraması'}
              </Text>
              <TouchableOpacity style={styles.primaryOrangeBtn} onPress={fetchQuality}>
                <Ionicons name="refresh" size={14} color="#fff" />
                <Text style={styles.primaryOrangeBtnText}>Şimdi Tara</Text>
              </TouchableOpacity>
            </View>

            {qualityLoading ? (
              <View style={styles.loaderBox}>
                <TorkScoutLoader />
                <Text style={styles.loaderText}>Veri sağlığı kontrolleri çalıştırılıyor...</Text>
              </View>
            ) : (
              <>
                {qualityData?.summary && (
                  <View style={styles.summaryGrid}>
                    <View style={styles.summaryBox}>
                      <Text style={styles.summaryBoxLabel}>TOPLAM KONTROL</Text>
                      <Text style={styles.summaryBoxVal}>{qualityData.summary.totalChecks ?? 7}</Text>
                    </View>
                    <View style={styles.summaryBox}>
                      <Text style={styles.summaryBoxLabel}>SAĞLIKLI (OK)</Text>
                      <Text style={[styles.summaryBoxVal, { color: '#34d399' }]}>
                        {qualityData.summary.okCount ?? 0}
                      </Text>
                    </View>
                    <View style={styles.summaryBox}>
                      <Text style={styles.summaryBoxLabel}>ANOMALİ</Text>
                      <Text style={[styles.summaryBoxVal, { color: '#f87171' }]}>
                        {qualityData.summary.issuesFoundCount ?? 0}
                      </Text>
                    </View>
                    <View style={styles.summaryBox}>
                      <Text style={styles.summaryBoxLabel}>HATA</Text>
                      <Text style={[styles.summaryBoxVal, { color: '#fbbf24' }]}>
                        {qualityData.summary.checkFailedCount ?? 0}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={{ gap: 10 }}>
                  {HEALTH_CHECK_CARDS.map((card) => {
                    const check = qualityData?.checks?.[card.key];
                    const isOk = check?.status === 'OK';
                    const isIssues = check?.status === 'ISSUES_FOUND';
                    const count = check?.affectedCount ?? 0;

                    return (
                      <TouchableOpacity
                        key={card.key}
                        style={[
                          styles.kpiCard,
                          isIssues && { borderColor: 'rgba(239,68,68,0.4)' },
                        ]}
                        activeOpacity={isOk ? 1 : 0.85}
                        onPress={() => !isOk && openQualityDrilldown(card.key)}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <Ionicons
                              name={card.icon}
                              size={18}
                              color={isOk ? '#34d399' : isIssues ? '#f87171' : '#fbbf24'}
                            />
                            <Text style={styles.healthCardTitle}>{card.title}</Text>
                          </View>
                          <View
                            style={[
                              styles.riskBadge,
                              isOk ? styles.riskLow : isIssues ? styles.riskHigh : styles.riskMed,
                            ]}
                          >
                            <Text
                              style={[
                                styles.riskBadgeText,
                                isOk
                                  ? { color: '#34d399' }
                                  : isIssues
                                  ? { color: '#f87171' }
                                  : { color: '#fbbf24' },
                              ]}
                            >
                              {isOk ? 'SAĞLIKLI' : isIssues ? `${count} KAYIT` : 'KONTROL EDİLEMEDİ'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.kpiSub}>{card.description}</Text>
                        {!isOk && (
                          <Text style={[styles.kpiActionLink, { marginTop: 4 }]}>
                            Anomali Detaylarını İncele ➔
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* SECTION 2A: CLUB -> GENEL BAKIŞ (DASHBOARD OVERVIEW)         */}
        {/* ============================================================ */}
        {mainSection === 'CLUB' && clubSubTab === 'CLUB_OVERVIEW' && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionHelperText}>
                Tork Scout Club Canlı Operasyon Özeti
              </Text>
              <TouchableOpacity style={styles.primaryOrangeBtn} onPress={openNewClubPostModal}>
                <Ionicons name="add-circle-outline" size={15} color="#fff" />
                <Text style={styles.primaryOrangeBtnText}>Yeni Gönderi Oluştur</Text>
              </TouchableOpacity>
            </View>

            {clubDashboardLoading ? (
              <View style={styles.loaderBox}>
                <TorkScoutLoader />
                <Text style={styles.loaderText}>Club özeti yükleniyor...</Text>
              </View>
            ) : (
              <>
                <View style={styles.summaryGrid}>
                  {(
                    clubDashboard?.stats || [
                      { label: 'Toplam Gönderi', value: 0 },
                      { label: 'Yayındaki Gönderi', value: 0 },
                      { label: 'Toplam Yorum', value: 0 },
                      { label: 'İnceleme Bekleyen', value: 0 },
                      { label: 'Aktif Moderatör', value: 0 },
                      { label: 'Susturulan Üye', value: 0 },
                      { label: 'Yasaklı (Ban) Üye', value: 0 },
                    ]
                  ).map((st: any, idx: number) => (
                    <View key={st.key || idx} style={styles.summaryBox}>
                      <Text style={styles.summaryBoxLabel}>{st.label}</Text>
                      <Text style={styles.summaryBoxVal}>{st.value ?? 0}</Text>
                      {!!st.secondaryText && (
                        <Text style={[styles.listingDateText, { marginTop: 2 }]}>
                          {st.secondaryText}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>

                {Array.isArray(clubDashboard?.recentPosts) && clubDashboard.recentPosts.length > 0 && (
                  <View style={{ gap: 8 }}>
                    <Text style={[styles.headerTitle, { fontSize: 14 }]}>Son Club Gönderileri</Text>
                    {clubDashboard.recentPosts.slice(0, 5).map((p: any) => (
                      <TouchableOpacity
                        key={p.id}
                        style={styles.listingCard}
                        onPress={() => openClubPostDrawer(p)}
                      >
                        <Text style={styles.listingTitleText}>{p.title || 'Gönderi'}</Text>
                        <Text style={styles.listingMetaText} numberOfLines={2}>
                          {p.content}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* SECTION 2B: CLUB -> GÖNDERİLER & MODERASYON                  */}
        {/* ============================================================ */}
        {mainSection === 'CLUB' && clubSubTab === 'CLUB_POSTS' && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionHelperText}>
                Topluluk gönderileri ve Club üyelerinin Garajım paylaşımları
              </Text>
              <TouchableOpacity style={styles.primaryOrangeBtn} onPress={openNewClubPostModal}>
                <Ionicons name="add-circle-outline" size={15} color="#fff" />
                <Text style={styles.primaryOrangeBtnText}>+ Yeni Gönderi Oluştur</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {[
                { key: 'ALL', label: 'Tüm Gönderiler' },
                {
                  key: 'USER_SUBMISSIONS',
                  label: '🚗 Club Kullanıcıları Gönderileri',
                  badge: pendingUserPostsCount,
                },
                { key: 'PUBLISHED', label: 'Yayındakiler' },
                { key: 'DRAFT', label: 'Taslaklar' },
                { key: 'ARCHIVED', label: 'Yayından Kaldırılanlar' },
              ].map((t) => {
                const active = clubPostTab === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.statusPill, active && styles.statusPillActive]}
                    onPress={() => setClubPostTab(t.key as any)}
                  >
                    <Text style={[styles.statusPillText, active && styles.statusPillTextActive]}>
                      {t.label}
                    </Text>
                    {!!t.badge && t.badge > 0 && (
                      <View style={[styles.statusCountBox, { backgroundColor: '#f59e0b' }]}>
                        <Text style={[styles.statusCountText, { color: '#020617' }]}>
                          {t.badge} Bekliyor
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {clubPostTab === 'USER_SUBMISSIONS' && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6 }}
              >
                {[
                  { key: 'PENDING_REVIEW', label: 'Onay Bekleyenler' },
                  { key: 'ALL', label: 'Tümü' },
                  { key: 'PUBLISHED', label: 'Onaylananlar (Yayında)' },
                  { key: 'REJECTED', label: 'Reddedilenler' },
                ].map((sub) => (
                  <TouchableOpacity
                    key={sub.key}
                    style={[
                      styles.miniFilterChip,
                      clubUserSubFilter === sub.key && styles.miniFilterChipActive,
                    ]}
                    onPress={() => setClubUserSubFilter(sub.key as any)}
                  >
                    <Text
                      style={[
                        styles.miniFilterText,
                        clubUserSubFilter === sub.key && styles.miniFilterTextActive,
                      ]}
                    >
                      {sub.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {clubPostsLoading ? (
              <View style={styles.loaderBox}>
                <TorkScoutLoader />
                <Text style={styles.loaderText}>Gönderiler yükleniyor...</Text>
              </View>
            ) : clubPosts.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="newspaper-outline" size={38} color="#475569" />
                <Text style={styles.emptyTitle}>Bu filtrede gönderi bulunmuyor</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {clubPosts.map((p) => {
                  const isPublished = p.status === 'PUBLISHED';
                  const isPendingReview = p.status === 'PENDING_REVIEW';
                  const isRejected = p.status === 'REJECTED';
                  const isUserSub = clubPostTab === 'USER_SUBMISSIONS' || !!p.isUserSubmission;
                  const mediaList = Array.isArray(p.media) ? p.media : [];

                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.listingCard}
                      activeOpacity={0.88}
                      onPress={() => openClubPostDrawer(p)}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          {p.isPinned && <Ionicons name="pin" size={14} color="#f59e0b" />}
                          <Text style={styles.listingTitleText} numberOfLines={1}>
                            {p.title || (isUserSub ? 'Üye Garaj Paylaşımı' : 'Başlıksız Gönderi')}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.riskBadge,
                            isPublished
                              ? styles.riskLow
                              : isPendingReview
                              ? styles.riskMed
                              : styles.riskHigh,
                          ]}
                        >
                          <Text
                            style={[
                              styles.riskBadgeText,
                              isPublished
                                ? { color: '#34d399' }
                                : isPendingReview
                                ? { color: '#fbbf24' }
                                : { color: '#f87171' },
                            ]}
                          >
                            {isPublished
                              ? 'YAYINDA'
                              : isPendingReview
                              ? 'ONAY BEKLİYOR'
                              : isRejected
                              ? 'REDDEDİLDİ'
                              : 'TASLAK / ARŞİV'}
                          </Text>
                        </View>
                      </View>

                      {!!p.content && (
                        <Text style={styles.postBodySnippet} numberOfLines={3}>
                          {p.content}
                        </Text>
                      )}

                      {!!p.poll && (
                        <View style={styles.pollBadgeRow}>
                          <Ionicons name="stats-chart" size={13} color="#fb923c" />
                          <Text style={styles.pollBadgeText} numberOfLines={1}>
                            Anket: {p.poll.question}
                          </Text>
                        </View>
                      )}

                      {mediaList.length > 0 && (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ gap: 6, marginTop: 6 }}
                        >
                          {mediaList.slice(0, 6).map((m: any, idx: number) => (
                            <Image
                              key={m.id || idx}
                              source={{ uri: resolveMediaUrl(m.mediaUrl || m.url) }}
                              style={styles.clubPostThumb}
                            />
                          ))}
                        </ScrollView>
                      )}

                      {!!p.rejectionReason && (
                        <Text style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>
                          Red Nedeni: {p.rejectionReason}
                        </Text>
                      )}

                      <View style={styles.listingSellerRow}>
                        <Text style={styles.listingSellerName}>
                          👤 {p.authorFormatted || p.author?.username || p.author?.email || 'Üye'}
                        </Text>
                        <Text style={styles.listingDateText}>
                          💬 {p._count?.comments || 0} • ❤️ {p._count?.likes || 0} •{' '}
                          {new Date(p.createdAt).toLocaleDateString('tr-TR')}
                        </Text>
                      </View>

                      <View style={styles.listingActionRow}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnNeutral]}
                          onPress={() => openClubPostDrawer(p)}
                        >
                          <Ionicons name="chatbubbles-outline" size={14} color="#f97316" />
                          <Text style={[styles.actionBtnText, { color: '#f97316' }]}>
                            Detay & Yorumlar
                          </Text>
                        </TouchableOpacity>

                        {!isUserSub && (
                          <>
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.actionBtnInfo]}
                              onPress={() => openEditClubPostModal(p)}
                            >
                              <Ionicons name="create-outline" size={14} color="#38bdf8" />
                              <Text style={[styles.actionBtnText, { color: '#38bdf8' }]}>
                                Düzenle
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.actionBtn, styles.actionBtnWarn]}
                              onPress={() => handleTogglePinPost(p)}
                            >
                              <Ionicons name="pin-outline" size={14} color="#f59e0b" />
                              <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>
                                {p.isPinned ? 'Sabitlemeyi Kaldır' : 'Sabitle'}
                              </Text>
                            </TouchableOpacity>
                          </>
                        )}

                        {isUserSub ? (
                          <>
                            {!isPublished && (
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.actionBtnApprove]}
                                onPress={() => handleClubPostAction(p.id, 'approve')}
                              >
                                <Ionicons name="checkmark-circle-outline" size={14} color="#10b981" />
                                <Text style={[styles.actionBtnText, { color: '#10b981' }]}>
                                  Onayla & Yayınla
                                </Text>
                              </TouchableOpacity>
                            )}
                            {!isRejected && (
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.actionBtnReject]}
                                onPress={() => {
                                  setRejectTargetPost(p);
                                  setRejectPostReason(
                                    p.rejectionReason ||
                                      'İlan niteliğinde veya satış amaçlı paylaşım tespit edildiği için yayınlanmadı.'
                                  );
                                  setRejectPostModalOpen(true);
                                }}
                              >
                                <Ionicons name="close-circle-outline" size={14} color="#ef4444" />
                                <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Reddet</Text>
                              </TouchableOpacity>
                            )}
                          </>
                        ) : isPublished ? (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnReject]}
                            onPress={() => handleClubPostAction(p.id, 'archive')}
                          >
                            <Ionicons name="archive-outline" size={14} color="#ef4444" />
                            <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>
                              Yayından Kaldır
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnApprove]}
                            onPress={() => handleClubPostAction(p.id, 'publish')}
                          >
                            <Ionicons name="rocket-outline" size={14} color="#10b981" />
                            <Text style={[styles.actionBtnText, { color: '#10b981' }]}>
                              Tekrar Yayınla
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* SECTION 2C: CLUB -> YORUM MODERASYONU                        */}
        {/* ============================================================ */}
        {mainSection === 'CLUB' && clubSubTab === 'CLUB_COMMENTS' && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {[
                { key: 'ALL', label: 'Tüm Yorumlar' },
                { key: 'PENDING_REVIEW', label: 'İnceleme Bekleyenler' },
                { key: 'HIDDEN', label: 'Gizlenenler' },
                { key: 'VISIBLE', label: 'Görünür Olanlar' },
              ].map((sub) => (
                <TouchableOpacity
                  key={sub.key}
                  style={[
                    styles.statusPill,
                    clubCommentFilter === sub.key && styles.statusPillActive,
                  ]}
                  onPress={() => setClubCommentFilter(sub.key as any)}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      clubCommentFilter === sub.key && styles.statusPillTextActive,
                    ]}
                  >
                    {sub.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {clubCommentsLoading ? (
              <View style={styles.loaderBox}>
                <TorkScoutLoader />
                <Text style={styles.loaderText}>Yorumlar yükleniyor...</Text>
              </View>
            ) : clubCommentGroups.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="chatbubbles-outline" size={38} color="#475569" />
                <Text style={styles.emptyTitle}>Yorum kaydı bulunamadı</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {clubCommentGroups.map((item: any, idx: number) => {
                  if (item.post && item.counts) {
                    return (
                      <TouchableOpacity
                        key={item.post.id || idx}
                        style={styles.listingCard}
                        onPress={() => openClubPostDrawer(item.post)}
                      >
                        <Text style={styles.listingTitleText}>
                          {item.post.title || 'Topluluk Gönderisi'}
                        </Text>
                        <Text style={styles.listingMetaText}>
                          Toplam: {item.counts.total} • Yayında: {item.counts.visible} • Bekleyen:{' '}
                          {item.counts.pendingReview} • Gizli: {item.counts.hidden}
                        </Text>
                        <Text style={[styles.kpiActionLink, { marginTop: 4 }]}>
                          Gönderi Yorumlarını Denetle ➔
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <View key={item.id || idx} style={styles.listingCard}>
                      <Text style={styles.listingSellerName}>
                        👤 {item.author?.username || item.author?.email || 'Üye'}
                      </Text>
                      <Text style={[styles.postBodySnippet, { marginTop: 4 }]}>{item.content}</Text>
                      <View style={styles.listingActionRow}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnApprove]}
                          onPress={() => handleCommentAction(item.id, 'publish')}
                        >
                          <Text style={[styles.actionBtnText, { color: '#10b981' }]}>Yayınla</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnWarn]}
                          onPress={() => handleCommentAction(item.id, 'hide')}
                        >
                          <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>Gizle</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnReject]}
                          onPress={() => handleCommentAction(item.id, 'delete')}
                        >
                          <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Sil</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* SECTION 2D: CLUB -> ÜYELER, MODERATÖRLER & KISITLAMALAR      */}
        {/* ============================================================ */}
        {mainSection === 'CLUB' && clubSubTab === 'CLUB_USERS' && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {[
                { key: 'MEMBERS', label: '👥 Tüm Club Üyeleri' },
                { key: 'MODERATORS', label: '🛡️ Yetkili Moderatörler' },
                { key: 'RESTRICTIONS', label: '🚫 Susturma & Ban Listesi' },
              ].map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.statusPill, clubUsersMode === m.key && styles.statusPillActive]}
                  onPress={() => setClubUsersMode(m.key as any)}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      clubUsersMode === m.key && styles.statusPillTextActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {clubUsersMode === 'MEMBERS' && (
              <>
                <View style={styles.filterBox}>
                  <View style={styles.searchRow}>
                    <Ionicons name="search" size={16} color="#64748b" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Üye e-posta, kullanıcı adı veya müşteri no ara..."
                      placeholderTextColor="#64748b"
                      value={clubMembersSearch}
                      onChangeText={setClubMembersSearch}
                      onSubmitEditing={fetchClubMembersAndRestrictions}
                      returnKeyType="search"
                    />
                  </View>
                </View>

                {clubMembersLoading ? (
                  <View style={styles.loaderBox}>
                    <TorkScoutLoader />
                    <Text style={styles.loaderText}>Club üyeleri yükleniyor...</Text>
                  </View>
                ) : clubMembers.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="people-outline" size={38} color="#475569" />
                    <Text style={styles.emptyTitle}>Üye kaydı bulunamadı</Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {clubMembers.map((m) => {
                      const role = m.clubRole || m.role || 'MEMBER';
                      const isMod = role === 'MODERATOR';
                      return (
                        <View key={m.id} style={styles.listingCard}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.listingTitleText}>
                                {m.displayName || m.username || m.email || 'Club Üyesi'}
                              </Text>
                              <Text style={styles.listingMetaText}>
                                {m.email} {m.customerNo ? `• ${m.customerNo}` : ''}
                              </Text>
                            </View>
                            <View style={[styles.riskBadge, styles.riskLow]}>
                              <Text style={[styles.riskBadgeText, { color: '#38bdf8' }]}>{role}</Text>
                            </View>
                          </View>

                          <View style={styles.listingActionRow}>
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.actionBtnNeutral]}
                              onPress={() => {
                                setMsgTargetUser(m);
                                setDirectMsgText('');
                              }}
                            >
                              <Ionicons name="mail-outline" size={14} color="#f97316" />
                              <Text style={[styles.actionBtnText, { color: '#f97316' }]}>
                                Mesaj Gönder
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.actionBtn, styles.actionBtnInfo]}
                              onPress={() => handleToggleModerator(m.id, isMod)}
                            >
                              <Ionicons name="shield-half-outline" size={14} color="#38bdf8" />
                              <Text style={[styles.actionBtnText, { color: '#38bdf8' }]}>
                                {isMod ? 'Moderatörlüğü Al' : 'Moderatör Yap'}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.actionBtn, styles.actionBtnWarn]}
                              onPress={() => {
                                setRestrictModalUser(m);
                                setRestrictType('MUTE');
                                setRestrictReason('Topluluk kuralları ihlali');
                              }}
                            >
                              <Ionicons name="volume-mute-outline" size={14} color="#f59e0b" />
                              <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>Sustur</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.actionBtn, styles.actionBtnReject]}
                              onPress={() => {
                                setRestrictModalUser(m);
                                setRestrictType('BAN');
                                setRestrictReason('İlan/satış paylaşımı veya ağır kural ihlali');
                              }}
                            >
                              <Ionicons name="ban-outline" size={14} color="#ef4444" />
                              <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Banla</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            {clubUsersMode === 'MODERATORS' && (
              <>
                {clubMembersLoading ? (
                  <View style={styles.loaderBox}>
                    <TorkScoutLoader />
                    <Text style={styles.loaderText}>Moderatörler yükleniyor...</Text>
                  </View>
                ) : clubModerators.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="shield-outline" size={38} color="#475569" />
                    <Text style={styles.emptyTitle}>Henüz atanmış moderatör yok</Text>
                    <Text style={styles.emptySubtitle}>
                      Tüm Club Üyeleri sekmesinden istediğiniz üyeyi moderatör olarak atayabilirsiniz.
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {clubModerators.map((mod) => (
                      <View key={mod.id} style={styles.listingCard}>
                        <Text style={styles.listingTitleText}>
                          {mod.userFormatted || mod.user?.username || mod.user?.email || 'Moderatör'}
                        </Text>
                        <Text style={styles.listingMetaText}>{mod.user?.email}</Text>
                        <View style={styles.listingActionRow}>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnReject]}
                            onPress={() =>
                              handleToggleModerator(mod.userId || mod.user?.id, true)
                            }
                          >
                            <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>
                              Moderatör Yetkisini Kaldır
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {clubUsersMode === 'RESTRICTIONS' && (
              <>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[
                    { key: 'ALL', label: 'Tümü' },
                    { key: 'MUTE', label: 'Susturulanlar (Mute)' },
                    { key: 'BAN', label: 'Yasaklananlar (Ban)' },
                  ].map((rt) => (
                    <TouchableOpacity
                      key={rt.key}
                      style={[
                        styles.miniFilterChip,
                        clubRestrictionsType === rt.key && styles.miniFilterChipActive,
                      ]}
                      onPress={() => setClubRestrictionsType(rt.key as any)}
                    >
                      <Text
                        style={[
                          styles.miniFilterText,
                          clubRestrictionsType === rt.key && styles.miniFilterTextActive,
                        ]}
                      >
                        {rt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {clubRestrictionsLoading ? (
                  <View style={styles.loaderBox}>
                    <TorkScoutLoader />
                    <Text style={styles.loaderText}>Kısıtlamalar yükleniyor...</Text>
                  </View>
                ) : clubRestrictions.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="shield-checkmark-outline" size={38} color="#475569" />
                    <Text style={styles.emptyTitle}>Aktif kısıtlama bulunmuyor</Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {clubRestrictions.map((r) => (
                      <View key={r.id} style={styles.listingCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.listingTitleText}>
                            {r.user?.username || r.user?.email || r.customerNo || 'Üye'}
                          </Text>
                          <View
                            style={[
                              styles.riskBadge,
                              r.type === 'BAN' ? styles.riskHigh : styles.riskMed,
                            ]}
                          >
                            <Text
                              style={[
                                styles.riskBadgeText,
                                r.type === 'BAN' ? { color: '#f87171' } : { color: '#fbbf24' },
                              ]}
                            >
                              {r.type === 'BAN' ? 'YASAKLI (BAN)' : 'SUSTURULDU (MUTE)'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.listingMetaText}>Gerekçe: {r.reason || 'Belirtilmedi'}</Text>
                        {r.isActive !== false && (
                          <View style={styles.listingActionRow}>
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.actionBtnApprove]}
                              onPress={() => handleRevokeRestriction(r.id)}
                            >
                              <Ionicons name="refresh-outline" size={14} color="#10b981" />
                              <Text style={[styles.actionBtnText, { color: '#10b981' }]}>
                                Kısıtlamayı Kaldır
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* SECTION 2E: CLUB -> MESAJLAR (DIRECT & BULK MESSAGING)       */}
        {/* ============================================================ */}
        {mainSection === 'CLUB' && clubSubTab === 'CLUB_MESSAGES' && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionHelperText}>
                Club üyelerine 1-e-1 veya toplu bildirim/mesaj gönderin
              </Text>
              {selectedBulkUserIds.length > 0 && (
                <TouchableOpacity
                  style={styles.primaryOrangeBtn}
                  onPress={() => setBulkMsgModalOpen(true)}
                >
                  <Ionicons name="send" size={13} color="#fff" />
                  <Text style={styles.primaryOrangeBtnText}>
                    Toplu Gönder ({selectedBulkUserIds.length})
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {clubMembersLoading ? (
              <View style={styles.loaderBox}>
                <TorkScoutLoader />
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {clubMembers.map((u) => {
                  const selected = selectedBulkUserIds.includes(u.id);
                  return (
                    <View key={u.id} style={styles.listingCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
                          onPress={() =>
                            setSelectedBulkUserIds((prev) =>
                              prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                            )
                          }
                        >
                          <Ionicons
                            name={selected ? 'checkbox' : 'square-outline'}
                            size={20}
                            color={selected ? '#f97316' : '#64748b'}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.listingTitleText}>
                              {u.displayName || u.username || u.email}
                            </Text>
                            <Text style={styles.listingMetaText}>{u.email || u.customerNo}</Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnNeutral]}
                          onPress={() => {
                            setMsgTargetUser(u);
                            setDirectMsgText('');
                          }}
                        >
                          <Ionicons name="paper-plane-outline" size={14} color="#f97316" />
                          <Text style={[styles.actionBtnText, { color: '#f97316' }]}>Mesaj Yaz</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* SECTION 2F: CLUB -> ŞİKAYETLER & RAPORLAR                    */}
        {/* ============================================================ */}
        {mainSection === 'CLUB' && clubSubTab === 'CLUB_REPORTS' && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {[
                { key: 'MODERATION', label: 'Moderasyon & Şikayetler' },
                { key: 'ENGAGEMENT', label: 'Etkileşim' },
                { key: 'CONTENT', label: 'İçerik Performansı' },
                { key: 'PACKAGE_USAGE', label: 'Paket Kullanımı' },
              ].map((sec) => (
                <TouchableOpacity
                  key={sec.key}
                  style={[styles.statusPill, clubReportSection === sec.key && styles.statusPillActive]}
                  onPress={() => setClubReportSection(sec.key)}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      clubReportSection === sec.key && styles.statusPillTextActive,
                    ]}
                  >
                    {sec.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[
                { key: '7D', label: 'Son 7 Gün' },
                { key: '30D', label: 'Son 30 Gün' },
                { key: 'YTD', label: 'Bu Yıl' },
              ].map((rng) => (
                <TouchableOpacity
                  key={rng.key}
                  style={[
                    styles.miniFilterChip,
                    clubReportRange === rng.key && styles.miniFilterChipActive,
                  ]}
                  onPress={() => setClubReportRange(rng.key)}
                >
                  <Text
                    style={[
                      styles.miniFilterText,
                      clubReportRange === rng.key && styles.miniFilterTextActive,
                    ]}
                  >
                    {rng.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {clubReportsLoading ? (
              <View style={styles.loaderBox}>
                <TorkScoutLoader />
                <Text style={styles.loaderText}>Club raporları yükleniyor...</Text>
              </View>
            ) : (
              <>
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryBoxLabel}>CLUB ZİYARETÇİ</Text>
                    <Text style={styles.summaryBoxVal}>
                      {clubReportsData?.metrics?.totalVisitors ?? '—'}
                    </Text>
                  </View>
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryBoxLabel}>TEKİL YORUMCU</Text>
                    <Text style={[styles.summaryBoxVal, { color: '#f97316' }]}>
                      {clubReportsData?.metrics?.uniqueCommenters ?? 0}
                    </Text>
                  </View>
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryBoxLabel}>TOPLAM YORUM</Text>
                    <Text style={[styles.summaryBoxVal, { color: '#38bdf8' }]}>
                      {clubReportsData?.metrics?.totalComments ?? 0}
                    </Text>
                  </View>
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryBoxLabel}>GİZLENEN YORUM</Text>
                    <Text style={[styles.summaryBoxVal, { color: '#f87171' }]}>
                      {clubReportsData?.metrics?.hiddenComments ?? 0}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.headerTitle, { fontSize: 14, marginTop: 6 }]}>
                  Gizlenen / Şikayet Edilen Yorumlar ({flaggedComments.length})
                </Text>

                {flaggedComments.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="checkmark-done-circle-outline" size={36} color="#34d399" />
                    <Text style={styles.emptyTitle}>Gizlenen veya şikayet bekleyen yorum yok</Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {flaggedComments.map((c: any) => (
                      <View key={c.id} style={styles.listingCard}>
                        <Text style={styles.listingSellerName}>
                          {c.author?.username || c.author?.email || 'Üye'}
                        </Text>
                        <Text style={[styles.postBodySnippet, { marginTop: 4 }]}>{c.content}</Text>
                        <View style={styles.listingActionRow}>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnApprove]}
                            onPress={() => handleCommentAction(c.id, 'publish')}
                          >
                            <Text style={[styles.actionBtnText, { color: '#10b981' }]}>
                              Geri Yükle (Yayınla)
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnReject]}
                            onPress={() => handleCommentAction(c.id, 'delete')}
                          >
                            <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>
                              Kalıcı Sil
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* SECTION 2G: CLUB -> AYARLAR & AUDIT LOG                      */}
        {/* ============================================================ */}
        {mainSection === 'CLUB' && clubSubTab === 'CLUB_SETTINGS_LOGS' && (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[
                  styles.statusPill,
                  settingsOrLogsMode === 'SETTINGS' && styles.statusPillActive,
                ]}
                onPress={() => setSettingsOrLogsMode('SETTINGS')}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    settingsOrLogsMode === 'SETTINGS' && styles.statusPillTextActive,
                  ]}
                >
                  ⚙️ Topluluk & Güvenlik Ayarları
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statusPill,
                  settingsOrLogsMode === 'AUDIT_LOG' && styles.statusPillActive,
                ]}
                onPress={() => setSettingsOrLogsMode('AUDIT_LOG')}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    settingsOrLogsMode === 'AUDIT_LOG' && styles.statusPillTextActive,
                  ]}
                >
                  📋 Yönetim Audit Logları
                </Text>
              </TouchableOpacity>
            </View>

            {settingsOrLogsMode === 'SETTINGS' ? (
              clubSettingsLoading ? (
                <View style={styles.loaderBox}>
                  <TorkScoutLoader />
                </View>
              ) : (
                <View style={[styles.listingCard, { gap: 12 }]}>
                  <Text style={styles.kpiTitle}>TOPLULUK KURALLARI METNİ</Text>
                  <TextInput
                    style={styles.dialogTextArea}
                    multiline
                    value={clubSettings.rulesText}
                    onChangeText={(v) => setClubSettings((s) => ({ ...s, rulesText: v }))}
                    placeholder="Topluluk kuralları..."
                    placeholderTextColor="#64748b"
                  />

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.kpiTitle}>YORUM KARAKTER LİMİTİ</Text>
                      <TextInput
                        style={[styles.dialogInput, { marginTop: 6 }]}
                        keyboardType="numeric"
                        value={String(clubSettings.commentCharLimit ?? 1000)}
                        onChangeText={(v) =>
                          setClubSettings((s) => ({ ...s, commentCharLimit: Number(v) || 1000 }))
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.kpiTitle}>MAX FOTOĞRAF / GÖNDERİ</Text>
                      <TextInput
                        style={[styles.dialogInput, { marginTop: 6 }]}
                        keyboardType="numeric"
                        value={String(clubSettings.maxImagesPerPost ?? 10)}
                        onChangeText={(v) =>
                          setClubSettings((s) => ({ ...s, maxImagesPerPost: Number(v) || 10 }))
                        }
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    disabled={savingClubSettings}
                    style={[styles.primaryOrangeBtn, { justifyContent: 'center', paddingVertical: 12 }]}
                    onPress={handleSaveClubSettings}
                  >
                    <Ionicons name="save-outline" size={16} color="#fff" />
                    <Text style={[styles.primaryOrangeBtnText, { fontSize: 13 }]}>
                      {savingClubSettings ? 'Kaydediliyor...' : 'Ayarları Kaydet & Audit Log Yaz'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            ) : auditLogsLoading ? (
              <View style={styles.loaderBox}>
                <TorkScoutLoader />
              </View>
            ) : auditLogs.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Henüz kaydedilmiş audit log bulunmuyor</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {auditLogs.map((log) => (
                  <View key={log.id} style={styles.listingCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.listingNoText}>
                        {log.actor?.username || log.actor?.firstName || 'Yönetici'}
                      </Text>
                      <Text style={styles.listingDateText}>
                        {new Date(log.createdAt).toLocaleString('tr-TR')}
                      </Text>
                    </View>
                    <Text style={styles.listingTitleText}>{log.actionType || log.action}</Text>
                    {!!log.reason && <Text style={styles.listingMetaText}>{log.reason}</Text>}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ============================================================== */}
      {/* MODAL 1: LISTING INSPECTION MODAL (FULL WEB PARITY)            */}
      {/* ============================================================== */}
      <Modal
        visible={!!selectedListingId}
        animationType="slide"
        onRequestClose={() => setSelectedListingId(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedListingId(null)} style={styles.backBtn}>
              <Ionicons name="close" size={20} color="#f8fafc" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {inspectionData?.listing?.title || 'İlan Moderasyon İncelemesi'}
              </Text>
              <Text style={styles.headerSubtitle}>
                #{inspectionData?.listing?.listingNo || selectedListingId}
              </Text>
            </View>
          </View>

          {inspectionLoading || !inspectionData?.listing ? (
            <View style={styles.loaderBox}>
              <TorkScoutLoader />
              <Text style={styles.loaderText}>İlan detayları yükleniyor...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
              {/* Photos with Fullscreen Lightbox on tap */}
              {Array.isArray(inspectionData.media) && inspectionData.media.length > 0 && (
                <View style={{ gap: 6 }}>
                  <Text style={styles.kpiTitle}>
                    📷 İLAN FOTOĞRAFLARI ({inspectionData.media.length}) — Büyütmek için dokunun
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10 }}
                  >
                    {inspectionData.media.map((m: any, idx: number) => {
                      const imgUrl = resolveMediaUrl(m.url);
                      return (
                        <TouchableOpacity
                          key={m.id || idx}
                          activeOpacity={0.9}
                          onPress={() => setLightboxImageUrl(imgUrl)}
                        >
                          <Image source={{ uri: imgUrl }} style={styles.inspectionPhoto} />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Key Price & Vehicle Info */}
              <View style={styles.listingCard}>
                <Text style={styles.listingPriceText}>
                  ₺{Number(inspectionData.listing.priceAmount || 0).toLocaleString('tr-TR')}
                </Text>
                <Text style={[styles.listingTitleText, { fontSize: 16, marginTop: 4 }]}>
                  {inspectionData.listing.title}
                </Text>
                <Text style={styles.listingMetaText}>
                  {inspectionData.listing.modelYear} • {inspectionData.listing.mileageKm || 0} km •{' '}
                  {inspectionData.listing.city || ''} / {inspectionData.listing.district || ''}
                </Text>
                {!!inspectionData.listing.description && (
                  <Text style={[styles.postBodySnippet, { marginTop: 8 }]}>
                    {inspectionData.listing.description}
                  </Text>
                )}
              </View>

              {/* Damage & Tramer Declaration */}
              {inspectionData.damageDeclaration && (
                <View style={styles.listingCard}>
                  <Text style={styles.kpiTitle}>EKSPERTİZ & HASAR BEYANI</Text>
                  <Text style={styles.listingMetaText}>
                    Ağır Hasar: {inspectionData.listing.heavyDamage ? 'EVET (Ağır Hasarlı)' : 'Hayır'}{' '}
                    • Tramer: ₺
                    {Number(inspectionData.listing.tramerAmount || 0).toLocaleString('tr-TR')}
                  </Text>
                </View>
              )}

              {/* Auto Quality Checks */}
              {Array.isArray(inspectionData.autoChecks) && inspectionData.autoChecks.length > 0 && (
                <View style={styles.listingCard}>
                  <Text style={styles.kpiTitle}>OTOMATİK KALİTE & GÜVENLİK KONTROLLERİ</Text>
                  {inspectionData.autoChecks.map((chk: any, idx: number) => (
                    <Text key={idx} style={styles.listingMetaText}>
                      • {chk.label || chk.title || chk.code}: {chk.status || chk.result}
                    </Text>
                  ))}
                </View>
              )}

              {/* Seller Info */}
              {inspectionData.seller && (
                <View style={styles.listingCard}>
                  <Text style={styles.kpiTitle}>SATICI BİLGİLERİ</Text>
                  <Text style={styles.listingTitleText}>
                    {inspectionData.seller.firstName} {inspectionData.seller.lastName}
                  </Text>
                  <Text style={styles.listingMetaText}>
                    {inspectionData.seller.email} • {inspectionData.seller.phone || 'Telefon yok'}
                  </Text>
                  <Text style={styles.listingCustomerNo}>
                    Müşteri No: {inspectionData.seller.customerNo || '—'}
                  </Text>
                </View>
              )}

              {/* Moderation Action Bar */}
              <View style={[styles.listingCard, { gap: 10 }]}>
                <Text style={styles.kpiTitle}>MODERASYON KARARI VER</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnApprove, { paddingVertical: 10 }]}
                    onPress={() => handleListingQuickAction(selectedListingId!, 'approve')}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={[styles.actionBtnText, { color: '#10b981', fontSize: 13 }]}>
                      İlanı Onayla
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnWarn, { paddingVertical: 10 }]}
                    onPress={() => openReasonPrompt(selectedListingId!, 'REQUEST_REVISION')}
                  >
                    <Ionicons name="create" size={16} color="#f59e0b" />
                    <Text style={[styles.actionBtnText, { color: '#f59e0b', fontSize: 13 }]}>
                      Düzeltme İste
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnInfo, { paddingVertical: 10 }]}
                    onPress={() =>
                      handleListingQuickAction(selectedListingId!, 'send-to-detailed-review')
                    }
                  >
                    <Ionicons name="search" size={16} color="#38bdf8" />
                    <Text style={[styles.actionBtnText, { color: '#38bdf8', fontSize: 13 }]}>
                      Detaylı İncelemeye Al
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnReject, { paddingVertical: 10 }]}
                    onPress={() => openReasonPrompt(selectedListingId!, 'REJECT')}
                  >
                    <Ionicons name="close-circle" size={16} color="#ef4444" />
                    <Text style={[styles.actionBtnText, { color: '#ef4444', fontSize: 13 }]}>
                      İlanı Reddet
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* FULLSCREEN IMAGE LIGHTBOX MODAL */}
      <Modal
        visible={!!lightboxImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxImageUrl(null)}
      >
        <View style={styles.dialogBackdrop}>
          <TouchableOpacity
            style={[styles.backBtn, { alignSelf: 'flex-end', marginBottom: 12 }]}
            onPress={() => setLightboxImageUrl(null)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {lightboxImageUrl && (
            <Image
              source={{ uri: lightboxImageUrl }}
              style={{ width: '100%', height: '75%' }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: LISTING REJECT / REVISION REASON DIALOG               */}
      {/* ============================================================== */}
      <Modal
        visible={reasonModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setReasonModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.dialogBackdrop}
        >
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>
              {reasonActionType === 'REQUEST_REVISION'
                ? 'Satıcıdan Düzeltme İste'
                : 'İlanı Reddet'}
            </Text>
            <Text style={styles.dialogSub}>Gerekçe Kategorisi Seçin:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {MODERATION_REASON_CODES.map((rc) => (
                <TouchableOpacity
                  key={rc.code}
                  style={[
                    styles.miniFilterChip,
                    reasonCode === rc.code && styles.miniFilterChipActive,
                  ]}
                  onPress={() => setReasonCode(rc.code)}
                >
                  <Text
                    style={[
                      styles.miniFilterText,
                      reasonCode === rc.code && styles.miniFilterTextActive,
                    ]}
                  >
                    {rc.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.dialogSub}>Satıcıya İletilecek Açıklama (*Zorunlu):</Text>
            <TextInput
              style={styles.dialogTextArea}
              multiline
              value={sellerMessage}
              onChangeText={setSellerMessage}
              placeholder="Satıcıya iletilecek mesaj..."
              placeholderTextColor="#64748b"
            />

            <Text style={[styles.dialogSub, { marginTop: 8 }]}>
              Yönetici İç Notu (Opsiyonel - Sadece Admin Görür):
            </Text>
            <TextInput
              style={styles.dialogInput}
              value={internalNote}
              onChangeText={setInternalNote}
              placeholder="Dahili moderasyon notu..."
              placeholderTextColor="#64748b"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnNeutral]}
                onPress={() => setReasonModalOpen(false)}
              >
                <Text style={styles.actionBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={submittingModeration}
                style={[
                  styles.actionBtn,
                  reasonActionType === 'REQUEST_REVISION'
                    ? styles.actionBtnWarn
                    : styles.actionBtnReject,
                ]}
                onPress={submitReasonPrompt}
              >
                {submittingModeration ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.actionBtnText,
                      {
                        color:
                          reasonActionType === 'REQUEST_REVISION' ? '#f59e0b' : '#ef4444',
                      },
                    ]}
                  >
                    Onayla ve Gönder
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: PERFORMANCE / QUALITY DRILLDOWN MODAL                 */}
      {/* ============================================================== */}
      <Modal
        visible={!!perfDrilldownMetric || !!qualityDrilldownCategory}
        animationType="slide"
        onRequestClose={() => {
          setPerfDrilldownMetric(null);
          setQualityDrilldownCategory(null);
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setPerfDrilldownMetric(null);
                setQualityDrilldownCategory(null);
              }}
              style={styles.backBtn}
            >
              <Ionicons name="close" size={20} color="#f8fafc" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {perfDrilldownMetric ? 'Performans Detay Analizi' : 'Veri Sağlığı Anomali Kayıtları'}
            </Text>
          </View>

          {perfDrilldownLoading || qualityDrilldownLoading ? (
            <View style={styles.loaderBox}>
              <TorkScoutLoader />
              <Text style={styles.loaderText}>Detay kayıtları yükleniyor...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
              {(
                perfDrilldownData?.topListings ||
                qualityDrilldownData?.issues ||
                []
              ).map((item: any, idx: number) => (
                <TouchableOpacity
                  key={item.listingId || item.id || idx}
                  style={styles.listingCard}
                  onPress={() => {
                    const id = item.listingId || item.id;
                    if (id) {
                      setPerfDrilldownMetric(null);
                      setQualityDrilldownCategory(null);
                      openListingInspection(id);
                    }
                  }}
                >
                  <Text style={styles.listingNoText}>#{item.listingNo || item.listingId}</Text>
                  <Text style={styles.listingTitleText}>
                    {item.title || item.vehicle || 'Araç İlanı'}
                  </Text>
                  {!!item.issueReason && (
                    <Text style={{ color: '#f87171', fontSize: 12 }}>{item.issueReason}</Text>
                  )}
                  <Text style={styles.listingMetaText}>
                    Görüntülenme: {item.views ?? 0} • Favori: {item.favorites ?? 0} • İletişim:{' '}
                    {item.leads ?? 0}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 4: CLUB POST DETAIL & COMMENTS DRAWER                    */}
      {/* ============================================================== */}
      <Modal
        visible={!!selectedClubPost}
        animationType="slide"
        onRequestClose={() => setSelectedClubPost(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedClubPost(null)} style={styles.backBtn}>
              <Ionicons name="close" size={20} color="#f8fafc" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Club Gönderi & Yorum Denetimi
              </Text>
              <Text style={styles.headerSubtitle}>
                {selectedClubPost?.authorFormatted || selectedClubPost?.author?.username || ''}
              </Text>
            </View>
          </View>

          {selectedClubPost && (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
              <View style={styles.listingCard}>
                <Text style={[styles.listingTitleText, { fontSize: 15 }]}>
                  {selectedClubPost.title || 'Gönderi'}
                </Text>
                {!!selectedClubPost.content && (
                  <Text style={[styles.postBodySnippet, { marginTop: 6 }]}>
                    {selectedClubPost.content}
                  </Text>
                )}

                {Array.isArray(selectedClubPost.media) && selectedClubPost.media.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, marginTop: 8 }}
                  >
                    {selectedClubPost.media.map((m: any, idx: number) => (
                      <Image
                        key={m.id || idx}
                        source={{ uri: resolveMediaUrl(m.mediaUrl || m.url) }}
                        style={styles.inspectionPhoto}
                      />
                    ))}
                  </ScrollView>
                )}

                {selectedClubPost.poll && (
                  <View style={[styles.filterBox, { marginTop: 8, gap: 6 }]}>
                    <Text style={styles.kpiTitle}>📊 ANKET: {selectedClubPost.poll.question}</Text>
                    {(selectedClubPost.poll.options || []).map((opt: any, i: number) => (
                      <Text key={opt.id || i} style={styles.listingMetaText}>
                        • {opt.text || opt.optionText} ({opt.voteCount ?? opt._count?.votes ?? 0} Oy)
                      </Text>
                    ))}
                    {!selectedClubPost.poll.isClosed && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnWarn, { alignSelf: 'flex-start' }]}
                        onPress={() => handleClosePoll(selectedClubPost.poll.id)}
                      >
                        <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>
                          Anketi Şimdi Sonlandır
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <View style={[styles.listingActionRow, { marginTop: 10 }]}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnInfo]}
                    onPress={() => handleClubPostAction(selectedClubPost.id, 'comments-toggle')}
                  >
                    <Ionicons name="chatbubble-outline" size={14} color="#38bdf8" />
                    <Text style={[styles.actionBtnText, { color: '#38bdf8' }]}>
                      {selectedClubPost.commentsEnabled ? 'Yorumlara Kapat' : 'Yorumlara Aç'}
                    </Text>
                  </TouchableOpacity>

                  {selectedClubPost.author?.id && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnReject]}
                      onPress={() => {
                        setRestrictModalUser(selectedClubPost.author);
                        setRestrictType('BAN');
                        setRestrictReason('Kulüp kuralları ihlali');
                      }}
                    >
                      <Ionicons name="ban-outline" size={14} color="#ef4444" />
                      <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>
                        Yazarı Banla
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <Text style={[styles.headerTitle, { fontSize: 14 }]}>
                Gönderi Yorumları ({postComments.length})
              </Text>

              {postCommentsLoading ? (
                <ActivityIndicator color="#f97316" />
              ) : postComments.length === 0 ? (
                <Text style={styles.listingMetaText}>Bu gönderide henüz yorum bulunmuyor.</Text>
              ) : (
                postComments.map((c: any) => (
                  <View key={c.id} style={styles.listingCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.listingSellerName}>
                        {c.author?.username || c.author?.email || 'Üye'}
                      </Text>
                      <Text style={styles.listingDateText}>{c.status}</Text>
                    </View>
                    <Text style={[styles.postBodySnippet, { marginTop: 4 }]}>{c.content}</Text>
                    <View style={styles.listingActionRow}>
                      {c.status !== 'VISIBLE' && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnApprove]}
                          onPress={() => handleCommentAction(c.id, 'publish')}
                        >
                          <Text style={[styles.actionBtnText, { color: '#10b981' }]}>Yayınla</Text>
                        </TouchableOpacity>
                      )}
                      {c.status !== 'HIDDEN' && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnWarn]}
                          onPress={() => handleCommentAction(c.id, 'hide')}
                        >
                          <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>Gizle</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnReject]}
                        onPress={() => handleCommentAction(c.id, 'delete')}
                      >
                        <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Sil</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 5: REJECT CLUB USER POST DIALOG                          */}
      {/* ============================================================== */}
      <Modal
        visible={rejectPostModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectPostModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.dialogBackdrop}
        >
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Üye Gönderisini Reddet</Text>
            <Text style={styles.dialogSub}>
              Kullanıcının Garajım ekranında göreceği reddetme gerekçesi:
            </Text>
            <TextInput
              style={styles.dialogTextArea}
              multiline
              value={rejectPostReason}
              onChangeText={setRejectPostReason}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnNeutral]}
                onPress={() => setRejectPostModalOpen(false)}
              >
                <Text style={styles.actionBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnReject]}
                onPress={submitRejectUserPost}
              >
                <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Reddet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 6: FULL WEB-PARITY CREATE / EDIT CLUB POST MODAL         */}
      {/* (Images Gallery Upload + URL + Full Poll Builder + Pin/Draft)  */}
      {/* ============================================================== */}
      <Modal
        visible={createPostModalOpen}
        animationType="slide"
        onRequestClose={() => setCreatePostModalOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setCreatePostModalOpen(false)}
              style={styles.backBtn}
            >
              <Ionicons name="close" size={20} color="#f8fafc" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>
                {editingPostId ? 'Club Gönderisini Düzenle' : 'Yeni Club Gönderisi Oluştur'}
              </Text>
              <Text style={styles.headerSubtitle}>
                Duyuru, görsel galerisi (max 10) ve interaktif anket paylaşımı
              </Text>
            </View>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
              {/* 1. POST TITLE */}
              <View style={styles.listingCard}>
                <Text style={styles.kpiTitle}>GÖNDERİ BAŞLIĞI (OPSİYONEL)</Text>
                <TextInput
                  style={styles.dialogInput}
                  placeholder="Örn: Haftanın Otomotiv Gündemi & Anketi"
                  placeholderTextColor="#64748b"
                  value={newPostTitle}
                  onChangeText={setNewPostTitle}
                />

                {/* 2. POST CONTENT */}
                <Text style={[styles.kpiTitle, { marginTop: 8 }]}>GÖNDERİ METNİ / İÇERİK</Text>
                <TextInput
                  style={[styles.dialogTextArea, { minHeight: 110 }]}
                  multiline
                  placeholder="Toplulukla paylaşmak istediğiniz duyuru, inceleme veya tartışma metnini buraya yazın..."
                  placeholderTextColor="#64748b"
                  value={newPostContent}
                  onChangeText={setNewPostContent}
                />
              </View>

              {/* 3. PHOTO GALLERY UPLOAD & URL (UP TO 10 PHOTOS) */}
              {!editingPostId && (
                <View style={styles.listingCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.kpiTitle}>
                      📸 FOTOĞRAF & GÖRSEL EKLE ({newPostMediaUrls.length}/10)
                    </Text>
                    <TouchableOpacity
                      disabled={uploadingPostMedia}
                      style={styles.primaryOrangeBtn}
                      onPress={handlePickClubPostImages}
                    >
                      {uploadingPostMedia ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="images-outline" size={14} color="#fff" />
                          <Text style={styles.primaryOrangeBtnText}>Galeriden Seç</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Optional Manual URL Input */}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <TextInput
                      style={[styles.dialogInput, { flex: 1 }]}
                      placeholder="veya görsel URL yapıştırın (https://...)"
                      placeholderTextColor="#64748b"
                      value={manualMediaUrlInput}
                      onChangeText={setManualMediaUrlInput}
                    />
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnNeutral, { paddingHorizontal: 14 }]}
                      onPress={handleAddManualMediaUrl}
                    >
                      <Text style={[styles.actionBtnText, { color: '#f97316' }]}>+ Ekle</Text>
                    </TouchableOpacity>
                  </View>

                  {newPostMediaUrls.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 10, marginTop: 8 }}
                    >
                      {newPostMediaUrls.map((url, idx) => (
                        <View key={idx} style={{ position: 'relative' }}>
                          <Image
                            source={{ uri: resolveMediaUrl(url) }}
                            style={styles.uploadedMediaThumb}
                          />
                          <TouchableOpacity
                            style={styles.removeMediaBadge}
                            onPress={() => handleRemovePostMedia(idx)}
                          >
                            <Ionicons name="close" size={13} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* 4. PIN & COMMENTS TOGGLES */}
              <View style={styles.listingCard}>
                <View style={styles.switchItemRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.listingTitleText}>📌 Gönderiyi En Üste Sabitle</Text>
                    <Text style={styles.listingMetaText}>
                      Topluluk akışının en üstünde sabitlenmiş duyuru rozetiyle görünür.
                    </Text>
                  </View>
                  <Switch
                    value={newPostPinned}
                    onValueChange={setNewPostPinned}
                    trackColor={{ false: '#334155', true: '#ea580c' }}
                    thumbColor="#ffffff"
                  />
                </View>

                <View style={[styles.switchItemRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 10 }]}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.listingTitleText}>💬 Yorumlara İzin Ver</Text>
                    <Text style={styles.listingMetaText}>
                      Üyeler bu gönderinin altına yorum yazabilir.
                    </Text>
                  </View>
                  <Switch
                    value={newPostCommentsEnabled}
                    onValueChange={setNewPostCommentsEnabled}
                    trackColor={{ false: '#334155', true: '#ea580c' }}
                    thumbColor="#ffffff"
                  />
                </View>

                {!editingPostId && (
                  <View style={[styles.switchItemRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 10 }]}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.listingTitleText}>📊 Gönderiye Anket Ekle</Text>
                      <Text style={styles.listingMetaText}>
                        Gönderiye interaktif çok seçenekli oylama anketi bağlayın.
                      </Text>
                    </View>
                    <Switch
                      value={pollEnabled}
                      onValueChange={setPollEnabled}
                      trackColor={{ false: '#334155', true: '#ea580c' }}
                      thumbColor="#ffffff"
                    />
                  </View>
                )}
              </View>

              {/* 5. FULL POLL BUILDER (MATCHING WEB PollCreationFields) */}
              {!editingPostId && pollEnabled && (
                <View style={[styles.listingCard, { borderColor: 'rgba(249,115,22,0.4)', gap: 12 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.kpiTitle, { color: '#fb923c' }]}>
                      📊 ANKET OLUŞTURUCU ({pollOptions.length}/10 Seçenek)
                    </Text>
                    <Text style={styles.listingDateText}>{pollQuestion.length}/300</Text>
                  </View>

                  <TextInput
                    style={styles.dialogInput}
                    placeholder="Anket Sorusu (*Zorunlu - Örn: Hangi segmenti tercih edersiniz?)"
                    placeholderTextColor="#64748b"
                    maxLength={300}
                    value={pollQuestion}
                    onChangeText={setPollQuestion}
                  />

                  <Text style={styles.kpiTitle}>ANKET SEÇENEKLERİ (EN AZ 2, EN FAZLA 10)</Text>
                  <View style={{ gap: 8 }}>
                    {pollOptions.map((opt, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: '#94a3b8', fontSize: 12, width: 18 }}>{idx + 1}.</Text>
                        <TextInput
                          style={[styles.dialogInput, { flex: 1 }]}
                          placeholder={`Seçenek ${idx + 1}`}
                          placeholderTextColor="#64748b"
                          maxLength={150}
                          value={opt}
                          onChangeText={(v) => handleUpdatePollOption(idx, v)}
                        />
                        <TouchableOpacity
                          disabled={idx === 0}
                          style={[styles.iconMiniBtn, idx === 0 && { opacity: 0.3 }]}
                          onPress={() => handleMovePollOption(idx, 'up')}
                        >
                          <Ionicons name="chevron-up" size={14} color="#cbd5e1" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          disabled={idx === pollOptions.length - 1}
                          style={[
                            styles.iconMiniBtn,
                            idx === pollOptions.length - 1 && { opacity: 0.3 },
                          ]}
                          onPress={() => handleMovePollOption(idx, 'down')}
                        >
                          <Ionicons name="chevron-down" size={14} color="#cbd5e1" />
                        </TouchableOpacity>
                        {pollOptions.length > 2 && (
                          <TouchableOpacity
                            style={[styles.iconMiniBtn, { borderColor: 'rgba(239,68,68,0.35)' }]}
                            onPress={() => handleRemovePollOption(idx)}
                          >
                            <Ionicons name="trash-outline" size={14} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>

                  {pollOptions.length < 10 && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnNeutral, { alignSelf: 'flex-start' }]}
                      onPress={handleAddPollOption}
                    >
                      <Ionicons name="add" size={15} color="#f97316" />
                      <Text style={[styles.actionBtnText, { color: '#f97316' }]}>
                        + Seçenek Ekle
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Poll Selection Type (SINGLE vs MULTIPLE) */}
                  <View style={{ gap: 6, marginTop: 4 }}>
                    <Text style={styles.kpiTitle}>SEÇİM TÜRÜ</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={[
                          styles.miniFilterChip,
                          pollSelectionType === 'SINGLE' && styles.miniFilterChipActive,
                        ]}
                        onPress={() => {
                          setPollSelectionType('SINGLE');
                          setPollMaxSelections(1);
                        }}
                      >
                        <Text
                          style={[
                            styles.miniFilterText,
                            pollSelectionType === 'SINGLE' && styles.miniFilterTextActive,
                          ]}
                        >
                          ○ Tek Seçim (Radio)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.miniFilterChip,
                          pollSelectionType === 'MULTIPLE' && styles.miniFilterChipActive,
                        ]}
                        onPress={() => {
                          setPollSelectionType('MULTIPLE');
                          setPollMaxSelections(2);
                        }}
                      >
                        <Text
                          style={[
                            styles.miniFilterText,
                            pollSelectionType === 'MULTIPLE' && styles.miniFilterTextActive,
                          ]}
                        >
                          □ Çoklu Seçim (Checkbox)
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {pollSelectionType === 'MULTIPLE' && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 6, marginTop: 4 }}
                      >
                        {Array.from(
                          { length: Math.max(1, pollOptions.length - 1) },
                          (_, i) => i + 2
                        ).map((num) => (
                          <TouchableOpacity
                            key={num}
                            style={[
                              styles.miniFilterChip,
                              pollMaxSelections === num && styles.miniFilterChipActive,
                            ]}
                            onPress={() => setPollMaxSelections(num)}
                          >
                            <Text
                              style={[
                                styles.miniFilterText,
                                pollMaxSelections === num && styles.miniFilterTextActive,
                              ]}
                            >
                              En fazla {num} seçim
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </View>

                  {/* Poll Result Visibility */}
                  <View style={{ gap: 6 }}>
                    <Text style={styles.kpiTitle}>SONUÇ GÖRÜNÜRLÜĞÜ</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 6 }}
                    >
                      {[
                        { key: 'AFTER_VOTE', label: 'Oy Verdikten Sonra' },
                        { key: 'ALWAYS', label: 'Her Zaman Açık' },
                        { key: 'AFTER_END', label: 'Anket Bitince' },
                        { key: 'ADMIN_ONLY', label: 'Sadece Admin' },
                      ].map((rv) => (
                        <TouchableOpacity
                          key={rv.key}
                          style={[
                            styles.miniFilterChip,
                            pollResultVisibility === rv.key && styles.miniFilterChipActive,
                          ]}
                          onPress={() => setPollResultVisibility(rv.key as any)}
                        >
                          <Text
                            style={[
                              styles.miniFilterText,
                              pollResultVisibility === rv.key && styles.miniFilterTextActive,
                            ]}
                          >
                            {rv.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Poll Duration */}
                  <View style={{ gap: 6 }}>
                    <Text style={styles.kpiTitle}>ANKET SÜRESİ</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 6 }}
                    >
                      {[
                        { key: 'UNLIMITED', label: 'Süresiz' },
                        { key: '1H', label: '1 Saat' },
                        { key: '6H', label: '6 Saat' },
                        { key: '12H', label: '12 Saat' },
                        { key: '1D', label: '1 Gün' },
                        { key: '3D', label: '3 Gün' },
                        { key: '7D', label: '7 Gün' },
                      ].map((dur) => (
                        <TouchableOpacity
                          key={dur.key}
                          style={[
                            styles.miniFilterChip,
                            pollDurationType === dur.key && styles.miniFilterChipActive,
                          ]}
                          onPress={() => setPollDurationType(dur.key as any)}
                        >
                          <Text
                            style={[
                              styles.miniFilterText,
                              pollDurationType === dur.key && styles.miniFilterTextActive,
                            ]}
                          >
                            {dur.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              )}

              {/* SUBMIT BAR (Draft vs Publish) */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                {!editingPostId && (
                  <TouchableOpacity
                    disabled={creatingPost}
                    style={[
                      styles.actionBtn,
                      styles.actionBtnWarn,
                      { flex: 1, justifyContent: 'center', paddingVertical: 13 },
                    ]}
                    onPress={() => handleCreateOrUpdateClubPost(false)}
                  >
                    <Ionicons name="document-text-outline" size={16} color="#f59e0b" />
                    <Text style={[styles.actionBtnText, { color: '#f59e0b', fontSize: 13 }]}>
                      Taslak Kaydet
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  disabled={creatingPost}
                  style={[
                    styles.primaryOrangeBtn,
                    { flex: 1.4, justifyContent: 'center', paddingVertical: 13 },
                  ]}
                  onPress={() => handleCreateOrUpdateClubPost(true)}
                >
                  {creatingPost ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="rocket-outline" size={16} color="#fff" />
                      <Text style={[styles.primaryOrangeBtnText, { fontSize: 13 }]}>
                        {editingPostId ? 'Değişiklikleri Kaydet' : 'Hemen Yayınla'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 7: MUTE / BAN CLUB USER DIALOG                           */}
      {/* ============================================================== */}
      <Modal
        visible={!!restrictModalUser}
        transparent
        animationType="fade"
        onRequestClose={() => setRestrictModalUser(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.dialogBackdrop}
        >
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>
              {restrictType === 'BAN'
                ? 'Kullanıcıyı Kulüpten Yasakla (Ban)'
                : 'Kullanıcıyı Sustur (Mute)'}
            </Text>
            <Text style={styles.dialogSub}>
              Hedef Üye: {restrictModalUser?.username || restrictModalUser?.email}
            </Text>
            {restrictType === 'MUTE' && (
              <TextInput
                style={[styles.dialogInput, { marginTop: 8 }]}
                placeholder="Susturma Süresi (Saat, örn: 24)"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={restrictDurationHours}
                onChangeText={setRestrictDurationHours}
              />
            )}
            <TextInput
              style={[styles.dialogTextArea, { marginTop: 8 }]}
              multiline
              placeholder="Kısıtlama gerekçesi..."
              placeholderTextColor="#64748b"
              value={restrictReason}
              onChangeText={setRestrictReason}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnNeutral]}
                onPress={() => setRestrictModalUser(null)}
              >
                <Text style={styles.actionBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={submittingRestrict}
                style={[styles.actionBtn, styles.actionBtnReject]}
                onPress={handleSubmitRestriction}
              >
                <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>
                  {restrictType === 'BAN' ? 'Yasakla' : 'Sustur'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 8: DIRECT OR BULK MESSAGE DIALOG                         */}
      {/* ============================================================== */}
      <Modal
        visible={!!msgTargetUser || bulkMsgModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setMsgTargetUser(null);
          setBulkMsgModalOpen(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.dialogBackdrop}
        >
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>
              {bulkMsgModalOpen
                ? `Toplu Bildirim & Mesaj Gönder (${selectedBulkUserIds.length} Üye)`
                : `${msgTargetUser?.displayName || msgTargetUser?.username || msgTargetUser?.email} Üyesine Mesaj`}
            </Text>
            <Text style={styles.dialogSub}>
              Gönderilen mesaj kullanıcının bildirim ve mesaj merkezine doğrudan iletilir:
            </Text>
            <TextInput
              style={styles.dialogTextArea}
              multiline
              placeholder="Mesajınızı buraya yazın..."
              placeholderTextColor="#64748b"
              value={bulkMsgModalOpen ? bulkMsgText : directMsgText}
              onChangeText={bulkMsgModalOpen ? setBulkMsgText : setDirectMsgText}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnNeutral]}
                onPress={() => {
                  setMsgTargetUser(null);
                  setBulkMsgModalOpen(false);
                }}
              >
                <Text style={styles.actionBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={sendingDirectMsg || sendingBulkMsg}
                style={styles.primaryOrangeBtn}
                onPress={bulkMsgModalOpen ? handleSendBulkMessage : handleSendDirectMessage}
              >
                <Ionicons name="send" size={14} color="#fff" />
                <Text style={styles.primaryOrangeBtnText}>Gönder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#090d16',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(249,115,22,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  adminPill: {
    backgroundColor: 'rgba(249,115,22,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.35)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminPillText: {
    color: '#fb923c',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  mainTabsContainer: {
    flexDirection: 'row',
    padding: 10,
    gap: 8,
    backgroundColor: '#090d16',
  },
  mainTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  mainTabBtnActive: {
    backgroundColor: '#ea580c',
    borderColor: '#f97316',
  },
  mainTabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '800',
  },
  mainTabTextActive: {
    color: '#ffffff',
  },
  mainTabBadge: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 99,
  },
  mainTabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  subTabsBar: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 6,
    backgroundColor: '#090d16',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  subTabsScrollWrapper: {
    paddingBottom: 10,
    backgroundColor: '#090d16',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  subTabChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  subTabChipScrollable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  subTabChipActive: {
    backgroundColor: 'rgba(249,115,22,0.14)',
    borderColor: 'rgba(249,115,22,0.45)',
  },
  subTabChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  subTabChipTextActive: {
    color: '#fb923c',
    fontWeight: '800',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  statusPillActive: {
    backgroundColor: '#f97316',
    borderColor: '#fb923c',
  },
  statusPillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  statusPillTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  statusCountBox: {
    backgroundColor: '#020617',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  statusCountBoxActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  statusCountText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
  },
  filterBox: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#020617',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 12,
    padding: 0,
  },
  miniFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  miniFilterChipActive: {
    backgroundColor: 'rgba(249,115,22,0.18)',
    borderColor: '#f97316',
  },
  miniFilterText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  miniFilterTextActive: {
    color: '#fb923c',
  },
  loaderBox: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loaderText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 6,
  },
  emptyTitle: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
  },
  listingCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  listingCardTop: {
    flexDirection: 'row',
    gap: 12,
  },
  listingThumb: {
    width: 78,
    height: 68,
    borderRadius: 10,
    backgroundColor: '#020617',
  },
  listingThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  listingNoText: {
    color: '#fb923c',
    fontSize: 11,
    fontWeight: '800',
  },
  listingTitleText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
  },
  listingVariantText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  listingPriceText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  listingMetaText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  riskBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  riskHigh: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: 'rgba(239,68,68,0.35)',
  },
  riskMed: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderColor: 'rgba(245,158,11,0.35)',
  },
  riskLow: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderColor: 'rgba(16,185,129,0.35)',
  },
  riskBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  listingSellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  listingSellerName: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  listingCustomerNo: {
    color: '#64748b',
    fontSize: 10,
  },
  listingDateText: {
    color: '#64748b',
    fontSize: 10,
  },
  listingActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnNeutral: {
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderColor: 'rgba(249,115,22,0.3)',
  },
  actionBtnApprove: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.35)',
  },
  actionBtnWarn: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.35)',
  },
  actionBtnReject: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.35)',
  },
  actionBtnInfo: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderColor: 'rgba(56,189,248,0.35)',
  },
  actionBtnText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '800',
  },
  paginationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pageBtnText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  pageInfoText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  kpiCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  kpiTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: '900',
  },
  kpiSub: {
    color: '#94a3b8',
    fontSize: 11,
  },
  kpiActionLink: {
    color: '#fb923c',
    fontSize: 11,
    fontWeight: '800',
  },
  sectionHelperText: {
    color: '#94a3b8',
    fontSize: 11,
    flex: 1,
  },
  primaryOrangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f97316',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  primaryOrangeBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryBox: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryBoxLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
  },
  summaryBoxVal: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  healthCardTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  postBodySnippet: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 17,
  },
  pollBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 4,
  },
  pollBadgeText: {
    color: '#fb923c',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  clubPostThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#020617',
  },
  uploadedMediaThumb: {
    width: 82,
    height: 82,
    borderRadius: 10,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  removeMediaBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconMiniBtn: {
    width: 30,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#020617',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#090d16',
  },
  inspectionPhoto: {
    width: 240,
    height: 170,
    borderRadius: 12,
    backgroundColor: '#090d16',
  },
  dialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  dialogBox: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  dialogTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '900',
  },
  dialogSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  dialogInput: {
    backgroundColor: '#020617',
    color: '#f8fafc',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dialogTextArea: {
    backgroundColor: '#020617',
    color: '#f8fafc',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    minHeight: 84,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});
