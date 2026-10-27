import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  PanResponder,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ComprehensiveVehicleReport,
  calculateVehicleMtv,
  replacePsWithHp,
  formatCanonicalPowerDisplay,
  formatVehicleAssessmentParagraphs,
  formatCleanTransmissionName,
  resolveVehicleRangeKm,
  getCanonicalBrandLogoUrl,
  getBrandMonogram,
} from '@used-car-intelligence/shared';
import { getBrandLogoUrl as resolveBrandLogo } from '../constants/brandLogos';
import IsiCepteRecommendationWidget from '../components/IsiCepteRecommendationWidget';
import QuotaExhaustionModal from '../components/QuotaExhaustionModal';
import { exportVehicleReportPdf } from '../utils/vehicleReportPdfGenerator';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://used-car-api-hzmu.onrender.com';

const cleanRangeText = (text?: string): string => {
  if (!text) return '';
  return replacePsWithHp(text)
    .replace(/(\d+\s*litrelik\s+yakıt\s+deposu)yla\s+tam\s+depoda\s+yaklaşık\s+\d+\s*km\s*menzil\s+sunar/gi, "$1 kapasitesine sahiptir")
    .replace(/(\d+\s*litrelik\s+yakıt\s+deposu)\s+ve\s+yaklaşık\s+\d+\s*km\s*menzil,\s*sık\s+mola\s+ihtiyacını\s+azaltır/gi, "$1 kapasitesi sunar")
    .replace(/tam\s+depoda\s+yaklaşık\s+\d+\s*km\s*menzil\s+sunar/gi, "")
    .replace(/ve\s+tam\s+depoda\s+yaklaşık\s+\d+\s*km\s*menzil/gi, "")
    .replace(/tam\s+depoda\s+yaklaşık\s+\d+\s*km\s*menzil/gi, "")
    .replace(/ve\s+yaklaşık\s+\d+\s*km\s*menzil/gi, "")
    .replace(/yaklaşık\s+\d+\s*km\s*menzil/gi, "")
    .replace(/\s+/g, " ")
    .replace(/\s+\./g, ".")
    .replace(/\.\./g, ".")
    .trim();
};

const DOMAIN_LABELS_TR: Record<string, string> = {
  POWERTRAIN_ENGINE: 'Motor Mekaniği & Zamanlama',
  POWERTRAIN_TRANS: 'Şanzıman & Aktarma Organları',
  EMISSIONS_EXHAUST: 'Emisyon & Egzoz Sistemi',
  HV_BATTERY_SYSTEM: 'Yüksek Voltaj & Batarya Sistemi',
  THERMAL_COOLING: 'Termal Yönetim & Soğutma',
  ELECTRONICS_BODY: 'Gövde Elektroniği & Donanım',
  CHASSIS_BRAKES: 'Yürüyen Aksam, Direksiyon & Fren',
  SAFETY_RECALL: 'Resmi Geri Çağırma & Güvenlik',
};

const REPORT_PIPELINE_STEPS = [
  {
    id: 1,
    title: '1. Teknik Veri ve Katalog Doğrulaması',
    desc: 'Motor, şanzıman, güç (HP), tork ve donanım paketleri resmi üretici kataloglarıyla eşleştiriliyor.',
    icon: 'server-outline' as const,
  },
  {
    id: 2,
    title: '2. Kronik Arıza & Mekanik Risk Analizi',
    desc: 'Motor bloğu, şanzıman mekatroniği, yakıt sistemi, yürüyen aksam ve elektronik arıza kayıtları taranıyor.',
    icon: 'search-outline' as const,
  },
  {
    id: 3,
    title: '3. Global Geri Çağırma (Recall) Bültenleri',
    desc: 'Üretici servis aksiyonları, bültenler ve küresel güvenlik geri çağırmaları inceleniyor.',
    icon: 'shield-checkmark-outline' as const,
  },
  {
    id: 4,
    title: '4. Türkiye Pazarı ve İşletme Maliyeti',
    desc: 'Resmi MTV dilimi, gerçek tüketim ortalamaları ve periyodik parça/bakım projeksiyonu hesaplanıyor.',
    icon: 'document-text-outline' as const,
  },
  {
    id: 5,
    title: '5. AI Uzman Karar Sentezi & Ekspertiz Rehberi',
    desc: 'Satın alma tavsiyeleri, ekspertiz öncelikli kontrol noktaları ve nihai rapor üretiliyor.',
    icon: 'sparkles-outline' as const,
  },
];

const extractReportData = (data: any): ComprehensiveVehicleReport | null => {
  if (!data) return null;
  let payload = data.reportData !== undefined ? data.reportData : data;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch (e) {
      return null;
    }
  }
  if (payload && typeof payload === 'object' && (payload.executiveSummary || payload.vehicleIdentity || payload.finalVerdict)) {
    const detectedType = data.vehicleType || payload.vehicleType || (payload.vehicleIdentity as any)?.vehicleType || (payload.expertDecisionSynthesis?.motorcycleEraAnalysis ? 'MOTORCYCLE' : undefined);
    return {
      ...payload,
      vehicleType: detectedType,
      reportId: data.id || data.reportId || payload.reportId || payload.id,
      id: data.id || data.reportId || payload.reportId || payload.id,
      likeCount: data.likeCount ?? payload.likeCount ?? 0,
      dislikeCount: data.dislikeCount ?? payload.dislikeCount ?? 0,
      createdAt: data.createdAt || payload.createdAt,
      generatedAt: data.createdAt || data.generatedAt || payload.generatedAt || payload.createdAt,
    } as ComprehensiveVehicleReport;
  }
  return null;
};

interface ModalDetailData {
  title: string;
  subtitle?: string;
  type: 'green' | 'orange' | 'red' | 'purple' | 'blue';
  badge?: string;
  content: string;
  extraInfo?: string;
  secondaryInfo?: string;
  icon: keyof typeof Ionicons.glyphMap;
}

function ItemDetailModal({
  data,
  onClose,
}: {
  data: ModalDetailData | null;
  onClose: () => void;
}) {
  if (!data) return null;

  const colorMap = {
    green: { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', iconBg: '#dcfce7', sub: '#166534' },
    orange: { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', iconBg: '#ffedd5', sub: '#9a3412' },
    red: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', iconBg: '#fee2e2', sub: '#991b1b' },
    purple: { bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9', iconBg: '#ede9fe', sub: '#5b21b6' },
    blue: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', iconBg: '#dbeafe', sub: '#1e40af' },
  };

  const scheme = colorMap[data.type] || colorMap.blue;

  return (
    <Modal visible={Boolean(data)} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modalContentCard} onPress={(e) => e.stopPropagation()}>
          {/* Top Handle Bar */}
          <View style={styles.modalHandleBar} />

          {/* Close Header Row */}
          <View style={styles.modalHeaderRow}>
            <View style={[styles.modalIconBox, { backgroundColor: scheme.iconBg }]}>
              <Ionicons name={data.icon} size={24} color={scheme.text} />
            </View>
            <View style={{ flex: 1 }}>
              {Boolean(data.badge) && (
                <View style={[styles.modalBadgePill, { backgroundColor: scheme.bg, borderColor: scheme.border }]}>
                  <Text style={[styles.modalBadgeText, { color: scheme.text }]}>{data.badge}</Text>
                </View>
              )}
              {Boolean(data.subtitle) && <Text style={[styles.modalSubTitle, { color: scheme.sub }]}>{data.subtitle}</Text>}
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#0f172a" />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Text style={styles.modalMainTitle}>{data.title}</Text>

          {/* Body Content */}
          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalBodyText}>{data.content}</Text>

            {Boolean(data.extraInfo) && (
              <View style={[styles.modalExtraBox, { backgroundColor: scheme.bg, borderColor: scheme.border }]}>
                <Ionicons name="information-circle-outline" size={18} color={scheme.text} />
                <Text style={[styles.modalExtraText, { color: scheme.sub }]}>{data.extraInfo}</Text>
              </View>
            )}

            {Boolean(data.secondaryInfo) && (
              <View style={[styles.modalExtraBox, { backgroundColor: '#fef2f2', borderColor: '#fecaca', marginTop: 8 }]}>
                <Ionicons name="alert-circle-outline" size={18} color="#dc2626" />
                <Text style={[styles.modalExtraText, { color: '#991b1b' }]}>{data.secondaryInfo}</Text>
              </View>
            )}
          </ScrollView>

          {/* Action Button */}
          <TouchableOpacity style={[styles.modalOkBtn, { backgroundColor: scheme.text }]} onPress={onClose}>
            <Text style={styles.modalOkBtnText}>Anladım, Kapat</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function getBrandLogoUrl(brandName?: string, isMotorcycle?: boolean): string {
  const type = isMotorcycle ? 'MOTORCYCLE' : 'CAR';
  return resolveBrandLogo(brandName, type) || getCanonicalBrandLogoUrl(brandName, type) || '';
}

function BrandLogoContainer({ brandName, isMotorcycle }: { brandName?: string; isMotorcycle?: boolean }) {
  const [hasError, setHasError] = useState(false);
  const type = isMotorcycle ? 'MOTORCYCLE' : 'CAR';
  const logoUrl = resolveBrandLogo(brandName, type) || getCanonicalBrandLogoUrl(brandName, type) || '';
  const monogram = getBrandMonogram(brandName);

  return (
    <View style={styles.brandLogoBoxLight}>
      {!hasError ? (
        <Image
          source={{ uri: logoUrl }}
          style={styles.brandLogoImage}
          resizeMode="contain"
          onError={() => setHasError(true)}
        />
      ) : (
        <View
          style={[
            styles.monogramBadgeBox,
            { backgroundColor: monogram.bgColor, borderColor: monogram.borderColor },
          ]}
        >
          <Text
            style={[styles.monogramBadgeText, { color: monogram.textColor }]}
            numberOfLines={1}
            ellipsizeMode="clip"
          >
            {monogram.initials}
          </Text>
        </View>
      )}
    </View>
  );
}

function formatFuelTypeTr(fuel?: string): string {
  if (!fuel) return 'Benzin';
  const u = fuel.trim().toUpperCase();
  if (u === 'PETROL' || u === 'BENZIN') return 'Benzin';
  if (u === 'DIESEL' || u === 'DIZEL') return 'Dizel';
  if (u === 'HYBRID' || u === 'PLUG_IN_HYBRID' || u === 'HIBRIT') return 'Hibrit';
  if (u === 'ELECTRIC' || u === 'ELEKTRIK') return 'Elektrik';
  if (u === 'LPG') return 'LPG & Benzin';
  return fuel;
}

interface CollapsibleLightProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBgColor: string;
  borderColor?: string;
  titleColor?: string;
  defaultOpen?: boolean;
  children?: any;
}

function CollapsibleLightSection({
  title,
  subtitle,
  badgeText,
  iconName,
  iconColor,
  iconBgColor,
  borderColor = '#e2e8f0',
  titleColor = '#0f172a',
  defaultOpen = false,
  children,
}: CollapsibleLightProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <View style={[styles.lightCardWrapper, { borderColor }]}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.lightCardHeaderBtn}
        onPress={() => setIsOpen((prev) => !prev)}
      >
        <View style={[styles.lightIconBox, { backgroundColor: iconBgColor }]}>
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.lightCardTitleText, { color: titleColor }]}>{title}</Text>
          {Boolean(subtitle) && <Text style={styles.lightCardSubText}>{subtitle}</Text>}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {Boolean(badgeText) && (
            <View style={[styles.badgePillLight, { backgroundColor: iconColor + '15', borderColor: iconColor + '30' }]}>
              <Text style={[styles.badgePillTextLight, { color: iconColor }]}>{badgeText}</Text>
            </View>
          )}
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#0f172a" />
        </View>
      </TouchableOpacity>

      {isOpen && <View style={styles.lightCardBodyContent}>{children}</View>}
    </View>
  );
}

const isUuid = (val?: string | null): boolean => {
  return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

export default function VehicleReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawVariantId = isUuid(params.variantId as string)
    ? String(params.variantId)
    : isUuid(params.modelId as string)
      ? String(params.modelId)
      : null;

  const [activeVariantId, setActiveVariantId] = useState<string | null>(rawVariantId);
  const [report, setReport] = useState<ComprehensiveVehicleReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [activeModalData, setActiveModalData] = useState<ModalDetailData | null>(null);
  const [pipelineStep, setPipelineStep] = useState(1);
  const skeletonOpacity = useRef(new Animated.Value(0.4)).current;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchReport(activeVariantId, true);
    } finally {
      setRefreshing(false);
    }
  };
  // User Like / Dislike Feedback State (Web ile %100 Uyumlu)
  const [resolvedReportId, setResolvedReportId] = useState<string | null>(null);
  const currentReportId = resolvedReportId || (report as any)?.reportId || (report as any)?.id || (params?.reportId as string) || null;
  const [likes, setLikes] = useState<number>(0);
  const [dislikes, setDislikes] = useState<number>(0);
  const [userVote, setUserVote] = useState<'LIKE' | 'DISLIKE' | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  useEffect(() => {
    if (report) {
      setLikes((report as any).likeCount ?? 0);
      setDislikes((report as any).dislikeCount ?? 0);
      const repId = (report as any)?.reportId || (report as any)?.id;
      if (repId) setResolvedReportId(repId);
    }
  }, [(report as any)?.likeCount, (report as any)?.dislikeCount, (report as any)?.reportId, (report as any)?.id]);

  useEffect(() => {
    if (currentReportId) {
      AsyncStorage.getItem(`report_vote_${currentReportId}`).then((stored) => {
        if (stored === 'LIKE' || stored === 'DISLIKE') {
          setUserVote(stored as 'LIKE' | 'DISLIKE');
        } else {
          setUserVote(null);
        }
      }).catch(() => {});
    }
  }, [currentReportId]);

  const handleVote = async (type: 'LIKE' | 'DISLIKE') => {
    if (!currentReportId || isVoting) return;
    if (userVote === type) return;

    setIsVoting(true);
    const prevVote = userVote;
    const prevLikes = likes;
    const prevDislikes = dislikes;

    if (type === 'LIKE') {
      setLikes((l) => l + 1);
      if (prevVote === 'DISLIKE') setDislikes((d) => Math.max(0, d - 1));
    } else {
      setDislikes((d) => d + 1);
      if (prevVote === 'LIKE') setLikes((l) => Math.max(0, l - 1));
    }
    setUserVote(type);

    try {
      let voterToken = await AsyncStorage.getItem('ts_voter_token');
      if (!voterToken) {
        voterToken = 'vt_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        await AsyncStorage.setItem('ts_voter_token', voterToken);
      }

      const res = await fetch(`${API_URL}/vehicle-reports/${currentReportId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote: type, voterToken }),
      });

      if (res.ok) {
        const data = await res.json();
        setLikes(data.likeCount ?? 0);
        setDislikes(data.dislikeCount ?? 0);
        await AsyncStorage.setItem(`report_vote_${currentReportId}`, type);
      } else {
        setLikes(prevLikes);
        setDislikes(prevDislikes);
        setUserVote(prevVote);
      }
    } catch {
      setLikes(prevLikes);
      setDislikes(prevDislikes);
      setUserVote(prevVote);
    } finally {
      setIsVoting(false);
    }
  };

  // AI Chatbot States & Live Rights Integration
  const [isChatModalVisible, setIsChatModalVisible] = useState(false);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([]);
  const [sendingChat, setSendingChat] = useState(false);
  const [chatError, setChatError] = useState('');
  const [userRights, setUserRights] = useState<{
    tierName?: string;
    isUnlimited?: boolean;
    remaining?: number;
    totalLimit?: number;
    used?: number;
  } | null>(null);
  const [isQuotaModalVisible, setIsQuotaModalVisible] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);

  // Swipe-Down-To-Dismiss PanResponder
  const chatPanY = useRef(new Animated.Value(0)).current;
  const chatPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          chatPanY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80 || gestureState.vy > 0.6) {
          Animated.timing(chatPanY, {
            toValue: 600,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            setIsChatModalVisible(false);
            chatPanY.setValue(0);
          });
        } else {
          Animated.spring(chatPanY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  const statusMessages = [
    'Araç verileri toplanıyor...',
    'Kullanıcı yorumları taranıyor...',
    'Kronik arıza kayıtları inceleniyor...',
    'Geri çağırma listeleri kontrol ediliyor...',
    'Yapay zeka analizi derleniyor...',
  ];
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    initReportLoad();
    fetchUserRights();
  }, [rawVariantId]);

  // Pulse animation for skeleton
  useEffect(() => {
    if (!loading && report) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, {
          toValue: 0.95,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonOpacity, {
          toValue: 0.35,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [loading, report, skeletonOpacity]);

  // Advance pipeline step while report is loading
  useEffect(() => {
    if (report) return;
    const stepTimer = setInterval(() => {
      setPipelineStep((prev) => (prev < 5 ? prev + 1 : 5));
    }, 2800);
    return () => clearInterval(stepTimer);
  }, [report]);

  const fetchUserRights = async () => {
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));
      if (!token) {
        setUserRights(null);
        return;
      }
      const res = await fetch(`${API_URL}/subscriptions/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const chatRight = data?.rights?.aiChat;
        setUserRights({
          tierName: data?.tierName || 'Tanışma Paketi',
          isUnlimited: Boolean(data?.isUnlimited || chatRight?.isUnlimited),
          remaining: chatRight?.remaining ?? 3,
          totalLimit: chatRight?.totalLimit ?? 3,
          used: chatRight?.used ?? 0,
        });
      }
    } catch (e) {
      console.error('Fetch user rights error:', e);
    }
  };

  const openChatModal = () => {
    chatPanY.setValue(0);
    if (chatMessages.length === 0) {
      const carName = report
        ? `${report.vehicleIdentity.modelYear} ${report.vehicleIdentity.brand} ${report.vehicleIdentity.model}`
        : 'bu araç';
      setChatMessages([
        {
          sender: 'ai',
          text: `Merhabalar! Ben TorqueScout AI Araç Danışmanıyım. **${carName}** için aklınıza takılan tüm soruları bana yazabilirsiniz.`,
        },
      ]);
    }
    setIsChatModalVisible(true);
  };

  const handleSendChat = async (presetText?: string) => {
    const textToSend = (presetText || chatQuestion).trim();
    if (!textToSend) return;
    if (!activeVariantId) {
      Alert.alert('Bilgi', 'Araç verileri henüz yüklenmedi, lütfen bekleyin.');
      return;
    }

    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));
      if (!token) {
        Alert.alert(
          'Giriş Gerekli',
          'TorqueScout Yapay Zeka Danışmanına soru sormak ve soru haklarınızı kullanmak için lütfen giriş yapın.',
          [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'Giriş Yap', onPress: () => router.push('/login') },
          ]
        );
        return;
      }

      // Pre-check quota locally if loaded and not unlimited
      if (userRights && !userRights.isUnlimited && (userRights.remaining ?? 0) <= 0) {
        setIsQuotaModalVisible(true);
        return;
      }

      setChatQuestion('');
      setSendingChat(true);
      setChatError('');

      // Add user question to list
      setChatMessages((prev) => [...prev, { sender: 'user', text: textToSend }]);

      const res = await fetch(`${API_URL}/reports/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          variantId: activeVariantId,
          question: textToSend,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.message || 'Yapay zeka yanıt veremedi. Lütfen tekrar deneyin.';
        setChatError(errMsg);
        if (res.status === 403) {
          setIsQuotaModalVisible(true);
        }
      } else {
        const data = await res.json();
        setChatMessages((prev) => [...prev, { sender: 'ai', text: data.response }]);
        // Refresh live user rights quota
        fetchUserRights();
      }
    } catch (err: any) {
      setChatError(err.message || 'Bağlantı hatası oluştu.');
    } finally {
      setSendingChat(false);
    }
  };

  const renderChatAiText = (content: string) => {
    if (!content) return null;
    const lines = content.split('\n');
    return (
      <View style={{ gap: 4 }}>
        {lines.map((line, lIdx) => {
          const trimmed = line.trim();
          if (!trimmed) return null;
          const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ');
          const rawText = isBullet ? trimmed.substring(2) : trimmed;
          const parts = rawText.split(/(\*\*.*?\*\*)/g);

          return (
            <View key={lIdx} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              {isBullet && <Text style={styles.chatBullet}>• </Text>}
              <Text style={styles.chatAiText}>
                {parts.map((part, pIdx) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                      <Text key={pIdx} style={styles.chatBoldText}>
                        {part.slice(2, -2)}
                      </Text>
                    );
                  }
                  return part;
                })}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const resolveVariantIdFromParams = async (): Promise<string | null> => {
    try {
      const isMotoBrand = /hyosung|yamaha|kawasaki|ducati|harley|ktm|sym|kymco|vespa|piaggio|bajaj|cfmoto|mondial|rks|arora|yuki|motoguzzi|triumph|aprilia/i.test(String(params.brand || ''));
      const categoryParam = isMotoBrand ? 'MOTORCYCLE' : (params.category ? String(params.category) : 'AUTOMOBILE');
      const cleanVal = (v: any) => {
        if (!v) return undefined;
        const s = String(v).trim();
        if (s.startsWith('Tüm') || s === 'Tümü' || s === 'Seçilmedi' || s === 'undefined' || s === 'null') return undefined;
        return s;
      };

      const brandClean = cleanVal(params.brand);
      const modelClean = cleanVal(params.model);
      const yearClean = cleanVal(params.year);
      const bodyClean = cleanVal(params.bodyType);
      const engineClean = cleanVal(params.engine);
      const fuelClean = cleanVal(params.fuel);
      const transClean = cleanVal(params.transmission);
      const trimClean = cleanVal(params.trim);

      const queryCandidates = [
        {
          brand: brandClean,
          modelFamily: modelClean,
          year: yearClean,
          bodyType: bodyClean,
          engine: engineClean,
          fuelType: fuelClean,
          transmission: transClean,
          trim: trimClean,
          category: categoryParam,
        },
        {
          brand: brandClean,
          modelFamily: modelClean,
          year: yearClean,
          bodyType: bodyClean,
          engine: engineClean,
          fuelType: fuelClean,
          transmission: transClean,
          category: categoryParam,
        },
        {
          brand: brandClean,
          modelFamily: modelClean,
          year: yearClean,
          engine: engineClean,
          category: categoryParam,
        },
        {
          brand: brandClean,
          modelFamily: modelClean,
          year: yearClean,
          category: categoryParam,
        },
        {
          brand: brandClean,
          modelFamily: modelClean,
          category: categoryParam,
        },
      ];

      for (const candidate of queryCandidates) {
        if (!candidate.brand || !candidate.modelFamily) continue;

        const query = new URLSearchParams();
        Object.entries(candidate).forEach(([key, val]) => {
          if (val) query.set(key, String(val));
        });

        const res = await fetch(`${API_URL}/vehicle-filters/match-variant?${query.toString()}&_t=${Date.now()}`, {
          headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && (json.variantId || json.modelId)) {
            return json.variantId || json.modelId;
          }
        }
      }
    } catch (e) {
      console.error('Variant ID resolution error:', e);
    }
    return null;
  };

  const initReportLoad = async () => {
    let targetId = rawVariantId;
    if (!targetId && params.brand && params.model) {
      setLoading(true);
      targetId = await resolveVariantIdFromParams();
    }

    if (targetId) {
      setActiveVariantId(targetId);
      fetchReport(targetId);
      checkIfFavorited(targetId);
    } else {
      fetchReport(null);
    }
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      if (activeVariantId) fetchReport(activeVariantId, true);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
      if (countdown % 6 === 0) {
        setStatusIndex((prev) => (prev + 1) % statusMessages.length);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, activeVariantId]);

  const checkIfFavorited = async (targetId: string | null) => {
    if (!targetId) return;
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return;
      const res = await fetch(`${API_URL}/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          const found = list.some(
            (fav: any) => fav.variantId === targetId || fav.variant?.id === targetId
          );
          setIsFavorited(found);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFavorite = async () => {
    if (!activeVariantId) return;
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('Giriş Gerekli', 'Raporları favorilere eklemek için lütfen giriş yapın.');
        router.push('/login');
        return;
      }

      const res = await fetch(`${API_URL}/favorites/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ variantId: activeVariantId }),
      });

      if (res.ok) {
        const data = await res.json();
        const isFav = data.favorited ?? data.isFavorited ?? false;
        setIsFavorited(isFav);
        Alert.alert('Bilgi', data.message || (isFav ? 'Rapor favorilerinize eklendi.' : 'Rapor favorilerinizden kaldırıldı.'));
      } else {
        const errData = await res.json().catch(() => ({}));
        Alert.alert('Uyarı', errData.message || 'Favori işlemi gerçekleştirilemedi.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReport = async (targetVariantId: string | null, force = false) => {
    setLoading(true);
    try {
      let finalVariantId = isUuid(targetVariantId) ? targetVariantId : null;
      if (!finalVariantId && params.brand && params.model) {
        finalVariantId = await resolveVariantIdFromParams();
      }

      if (!finalVariantId) {
        Alert.alert(
          'TorqueScout Araç Danışmanı',
          'TorqueScout Araç Danışmanı şu an raporu üretemedi lütfen tekrar deneyin veya geri bildirim gönderin.'
        );
        setLoading(false);
        return;
      }

      const token = await AsyncStorage.getItem('accessToken');
      const headers: any = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        ...(token ? { Authorization: `Bearer ${token}` } : { 'x-guest-token': 'guest_mobile' }),
      };

      const isMotoBrand = /hyosung|yamaha|kawasaki|ducati|harley|ktm|sym|kymco|vespa|piaggio|bajaj|cfmoto|mondial|rks|arora|yuki|motoguzzi|triumph|aprilia/i.test(String(params.brand || ''));
      const reqVehicleType = (isMotoBrand || (params.category && String(params.category).toUpperCase() === 'MOTORCYCLE'))
        ? 'MOTORCYCLE'
        : (params.category ? String(params.category) : 'AUTOMOBILE').toUpperCase();
      const isMoto = reqVehicleType === 'MOTORCYCLE';
      const effectiveSearchScope: any = {
        vehicleType: reqVehicleType,
        year: isMoto ? undefined : params.year,
        bodyType: isMoto ? undefined : params.bodyType,
        engine: isMoto ? undefined : params.engine,
        fuel: params.fuel,
        transmission: params.transmission,
        trim: params.trim,
      };

      const idempotencyKey = `vr_${finalVariantId}_${Date.now()}`;
      const reportPayload: any = {
        mode: 'TORQUE_SCOUT_VEHICLE_REPORT',
        entryPoint: 'VEHICLE_SEARCH',
        idempotencyKey,
        forceRefresh: force,
        vehicleType: reqVehicleType,
        searchScope: effectiveSearchScope,
      };

      if (isMoto) {
        reportPayload.modelId = finalVariantId;
      } else {
        reportPayload.variantId = finalVariantId;
      }

      const res = await fetch(`${API_URL}/vehicle-reports?_t=${Date.now()}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(reportPayload),
      });

      if (res.ok) {
        const data = await res.json();
        const reportId = data.reportId || data.id;

        if (reportId) {
          const detailRes = await fetch(`${API_URL}/vehicle-reports/${reportId}?_t=${Date.now()}`, { headers });
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            const parsedDetail = extractReportData(detailData);
            if (parsedDetail) {
              const hasSynthesis = Boolean(parsedDetail.expertDecisionSynthesis);
              if (!hasSynthesis && !force) {
                return fetchReport(targetVariantId, true);
              }
              setReport(parsedDetail);
              setLoading(false);
              return;
            }
          }
        }

        const parsedDirect = extractReportData(data);
        if (parsedDirect) {
          const hasSynthesis = Boolean(parsedDirect.expertDecisionSynthesis);
          if (!hasSynthesis && !force) {
            return fetchReport(targetVariantId, true);
          }
          setReport(parsedDirect);
          setLoading(false);
          return;
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.error('Report creation failed:', res.status, errJson);
        Alert.alert(
          'TorqueScout Araç Danışmanı',
          errJson.message || 'TorqueScout Araç Danışmanı şu an raporu üretemedi lütfen tekrar deneyin veya geri bildirim gönderin.'
        );
        setLoading(false);
        return;
      }

      Alert.alert(
        'TorqueScout Araç Danışmanı',
        'TorqueScout Araç Danışmanı şu an raporu üretemedi lütfen tekrar deneyin veya geri bildirim gönderin.'
      );
    } catch (e) {
      console.error(e);
      Alert.alert(
        'TorqueScout Araç Danışmanı',
        'TorqueScout Araç Danışmanı şu an raporu üretemedi lütfen tekrar deneyin veya geri bildirim gönderin.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `TorqueScout Araç Raporu: ${report?.vehicleIdentity?.modelYear} ${report?.vehicleIdentity?.brand} ${report?.vehicleIdentity?.model}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleExportPdf = async () => {
    if (!report || isExportingPdf) return;
    try {
      setIsExportingPdf(true);
      await exportVehicleReportPdf(report);
    } catch (error) {
      console.error('PDF export error:', error);
      Alert.alert(
        'PDF Oluşturulamadı',
        'Rapor PDF formatına dönüştürülürken bir hata oluştu. Lütfen tekrar deneyin.'
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (countdown !== null || (loading && !report)) {
    const pipelineStages = [
      { step: 1, title: 'Katalog & Varyant Doğrulama', desc: 'Resmi fabrika teknik verileri ve donanım paketi tespit ediliyor.' },
      { step: 2, title: 'Mekanik & Kronik Risk Taraması', desc: 'FMEA arıza kayıtları, şanzıman ve motor dayanıklılığı inceleniyor.' },
      { step: 3, title: 'Piyasa Değeri & Satış Likiditesi', desc: 'Türkiye ikinci el piyasa verileri ve değer kaybı simüle ediliyor.' },
      { step: 4, title: 'Adversarial Güvenlik & Doğruluk Denetimi', desc: 'Tutarsız iddialar filtreleniyor ve satın alma skoru kalibre ediliyor.' },
      { step: 5, title: 'Uzman Raporu Sentezleniyor', desc: 'Tüm analizler konsolide edilerek nihai karar raporu oluşturuluyor.' },
    ];

    return (
      <View style={styles.loadingContainerLight}>
        <ScrollView contentContainerStyle={styles.loadingContentScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.loadingHeaderBox}>
            {countdown !== null ? (
              <View style={styles.countdownCircle}>
                <Text style={styles.countdownNumLight}>{countdown}</Text>
              </View>
            ) : (
              <ActivityIndicator size="large" color="#ea580c" style={{ marginBottom: 12 }} />
            )}
            <Text style={styles.loadingTitleLight}>
              {countdown !== null ? 'Analiz Hazırlanıyor...' : 'Rapor Hazırlanıyor...'}
            </Text>
            <Text style={styles.loadingStatusLight}>{statusMessages[statusIndex]}</Text>
          </View>

          {/* 5-Step Pipeline Card */}
          <View style={styles.pipelineCardLight}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a', marginBottom: 12 }}>
              🧠 TorqueScout 3-Ajanlı Analiz Süreci
            </Text>
            {pipelineStages.map((st) => {
              const isDone = pipelineStep > st.step;
              const isActive = pipelineStep === st.step;
              return (
                <View key={st.step} style={styles.pipelineStepRow}>
                  <View
                    style={[
                      styles.pipelineStepDot,
                      isDone && styles.pipelineStepDotDone,
                      isActive && styles.pipelineStepDotActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pipelineStepDotText,
                        (isDone || isActive) && styles.pipelineStepDotTextActive,
                      ]}
                    >
                      {isDone ? '✓' : st.step}
                    </Text>
                  </View>
                  <View style={styles.pipelineStepContent}>
                    <Text
                      style={[
                        styles.pipelineStepTitle,
                        isActive && styles.pipelineStepTitleActive,
                      ]}
                    >
                      {st.title}
                    </Text>
                    <Text style={styles.pipelineStepDesc}>{st.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Pulsing Skeleton Preview */}
          <Animated.View style={[styles.skeletonCardLight, { opacity: skeletonOpacity }]}>
            <View style={[styles.skeletonBar, { width: '60%', height: 18 }]} />
            <View style={[styles.skeletonBar, { width: '40%', height: 12 }]} />
            <View style={styles.skeletonGridRow}>
              <View style={styles.skeletonGridBox} />
              <View style={styles.skeletonGridBox} />
              <View style={styles.skeletonGridBox} />
              <View style={styles.skeletonGridBox} />
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  const synthesis = report?.expertDecisionSynthesis;
  let rawPower = report?.performanceUsage?.sourcePowerValue 
    ?? report?.vehicleIdentity?.sourcePowerValue 
    ?? report?.performanceUsage?.powerHp 
    ?? (report?.expertDecisionSynthesis as any)?.technicalSpecifications?.enginePowerHp 
    ?? (report?.expertDecisionSynthesis as any)?.technicalSpecifications?.powerHp 
    ?? (report as any)?.technicalSpecifications?.enginePowerHp
    ?? (report as any)?.technicalSpecifications?.powerHp
    ?? report?.vehicleIdentity?.enginePowerHp
    ?? (report?.vehicleIdentity as any)?.powerHp
    ?? (report?.performanceUsage as any)?.hp
    ?? report?.performanceUsage?.canonicalDisplayPowerHp
    ?? report?.vehicleIdentity?.canonicalDisplayPowerHp;

  if (!rawPower) {
    const fullNarrative = `${report?.expertDecisionSynthesis?.vehicleCharacter?.headline || ''} ${report?.expertDecisionSynthesis?.vehicleCharacter?.detailedAssessment || ''} ${report?.performanceUsage?.rangeFactorsNote || ''}`;
    const match = fullNarrative.match(/\b(\d{2,4})\s*(?:hp|bg|beygir|ps)\b/i);
    if (match) {
      rawPower = parseInt(match[1], 10);
    }
  }
  const powerUnit = report?.performanceUsage?.sourcePowerUnit 
    ?? report?.vehicleIdentity?.sourcePowerUnit 
    ?? (report?.performanceUsage as any)?.powerUnit 
    ?? (report?.vehicleIdentity as any)?.powerUnit 
    ?? 'HP';
  const powerSemantic = report?.performanceUsage?.powerSemantic 
    ?? (report?.vehicleIdentity as any)?.powerSemantic;
  const hpDisplay = formatCanonicalPowerDisplay(rawPower, powerUnit, powerSemantic);
  const isElectricVehicle = (report?.vehicleIdentity?.fuelType || '').toLowerCase().includes('elektrik');
  const rawDisplacement = report?.vehicleIdentity?.engineDisplacementCc
    ?? (report?.expertDecisionSynthesis as any)?.technicalSpecifications?.engineDisplacementCc
    ?? (report as any)?.technicalSpecifications?.engineDisplacementCc
    ?? (report?.performanceUsage as any)?.engineDisplacementCc
    ?? (report?.performanceUsage as any)?.displacementCc;
  const isMotoBrand = /hyosung|yamaha|kawasaki|ducati|harley|ktm|sym|kymco|vespa|piaggio|bajaj|cfmoto|mondial|rks|arora|yuki|motoguzzi|triumph|aprilia/i.test(params.brand as string || report?.vehicleIdentity?.brand || '');
  const resolvedVehicleType = (
    (report?.vehicleIdentity as any)?.vehicleType ||
    (report as any)?.vehicleType ||
    (report?.expertDecisionSynthesis?.motorcycleEraAnalysis ? 'MOTORCYCLE' : '') ||
    (isMotoBrand ? 'MOTORCYCLE' : '') ||
    (params.vehicleType as string) ||
    (params.category as string) ||
    'AUTOMOBILE'
  ).toUpperCase();
  const isMotorcycle =
    resolvedVehicleType === 'MOTORCYCLE' ||
    Boolean((report as any)?.isMotorcycle) ||
    Boolean(report?.expertDecisionSynthesis?.motorcycleEraAnalysis) ||
    isMotoBrand;
  const characterHeading = isMotorcycle
    ? 'Bu Araç Nasıl Bir Motosiklet?'
    : (resolvedVehicleType === 'SUV_PICKUP' || resolvedVehicleType === 'SUV'
      ? 'Bu Araç Nasıl Bir Arazi Aracı / SUV?'
      : (resolvedVehicleType === 'MINIVAN_PANELVAN' || resolvedVehicleType === 'COMMERCIAL'
        ? 'Bu Araç Nasıl Bir Ticari Araç?'
        : 'Bu Araç Nasıl Bir Otomobil?'));

  const displacementDisplay = isElectricVehicle ? 'Elektrik' : (rawDisplacement ? `${rawDisplacement} cc` : (isMotorcycle ? '249 cc' : '1598 cc'));
  const mtvResult = calculateVehicleMtv({
    modelYear: report?.vehicleIdentity?.modelYear,
    engineDisplacement: rawDisplacement || report?.vehicleIdentity?.engineDisplacementCc,
    fuelType: report?.vehicleIdentity?.fuelType,
    horsepower: rawPower,
    vehicleType: resolvedVehicleType,
    isMotorcycle,
  });
  const hpValue = report?.performanceUsage?.powerHp || report?.vehicleIdentity?.enginePowerHp;
  const torqueValue = report?.performanceUsage?.torqueNm;
  const topSpeedValue = report?.performanceUsage?.topSpeedKmh
    || (report?.expertDecisionSynthesis as any)?.technicalSpecifications?.topSpeedKmh
    || (report as any)?.technicalSpecifications?.topSpeedKmh;
  const zeroToHundredValue = (report?.performanceUsage as any)?.zeroToHundredSec
    || report?.performanceUsage?.zeroToHundredKmh
    || (report?.expertDecisionSynthesis as any)?.technicalSpecifications?.zeroToHundredSec
    || (report?.expertDecisionSynthesis as any)?.technicalSpecifications?.zeroToHundredKmh
    || (report as any)?.technicalSpecifications?.zeroToHundredSec
    || (report as any)?.technicalSpecifications?.zeroToHundredKmh;
  const combinedFuel = report?.performanceUsage?.combinedFuelL100km
    || (report?.expertDecisionSynthesis as any)?.technicalSpecifications?.combinedFuelL100km
    || (report as any)?.technicalSpecifications?.combinedFuelL100km;
  const electricRangeKm = isElectricVehicle ? resolveVehicleRangeKm(report) : null;
  const trunkValue = (report?.performanceUsage as any)?.trunkCapacityLiters
    || (report?.performanceUsage as any)?.luggageCapacityL
    || (report?.expertDecisionSynthesis as any)?.technicalSpecifications?.trunkCapacityLiters
    || (report?.expertDecisionSynthesis as any)?.technicalSpecifications?.luggageCapacityL
    || (report as any)?.technicalSpecifications?.trunkCapacityLiters
    || (report as any)?.technicalSpecifications?.luggageCapacityL;
  const weightValue = (report?.performanceUsage as any)?.curbWeightKg
    || (report?.performanceUsage as any)?.weightKg
    || (report?.expertDecisionSynthesis as any)?.technicalSpecifications?.curbWeightKg
    || (report?.expertDecisionSynthesis as any)?.technicalSpecifications?.weightKg
    || (report as any)?.technicalSpecifications?.curbWeightKg
    || (report as any)?.technicalSpecifications?.weightKg;

  const isScooter = isMotorcycle && /scooter|maxi|moped/i.test(`${params.bodyType || ''} ${params.type || ''} ${(report?.vehicleIdentity as any)?.modelName || params.model || ''}`);
  const effectiveTopSpeed = (topSpeedValue && !(isMotorcycle && rawDisplacement && rawDisplacement > 150 && topSpeedValue < 100))
    ? topSpeedValue
    : (isMotorcycle ? (rawDisplacement && rawDisplacement <= 50 ? 55 : (rawDisplacement && rawDisplacement <= 125 ? 100 : (rawDisplacement && rawDisplacement <= 250 ? 135 : 165))) : (hpValue && hpValue >= 200 ? 240 : 195));
  const topSpeedDisplay = `${effectiveTopSpeed} km/h`;
  const isLowSpeedBike = isMotorcycle && !!rawDisplacement && rawDisplacement <= 50;
  const zeroToHundredDisplay = zeroToHundredValue 
    ? `${zeroToHundredValue} sn` 
    : (isLowSpeedBike ? 'Şehir İçi (<80 km/h)' : (isMotorcycle ? (rawDisplacement && rawDisplacement <= 125 ? '14.5 sn' : (rawDisplacement && rawDisplacement <= 250 ? '9.8 sn' : '6.5 sn')) : (hpValue && hpValue >= 200 ? '7.2 sn' : '9.5 sn')));
  const fuelOrRangeDisplay = isElectricVehicle ? (electricRangeKm ? `${electricRangeKm} km` : '420 km') : (combinedFuel ? `${combinedFuel} lt/100km` : (isMotorcycle ? '2.8 lt/100km' : '6.8 lt/100km'));
  const trunkDisplay = trunkValue ? `${trunkValue} lt` : (isMotorcycle ? (isScooter ? 'Sele Altı Kask Gözü' : 'Sele Altı / Çanta Uyumlu') : '450 lt');
  const weightDisplay = weightValue ? `${weightValue} kg` : (isMotorcycle ? (rawDisplacement && rawDisplacement <= 50 ? '88 kg' : '165 kg') : (isElectricVehicle ? '1850 kg' : '1380 kg'));
  const mtvDisplay = mtvResult ? mtvResult.displayInstallment : 'Hesaplanıyor';

  const rawBuyability = report?.scoring?.buyabilityScore?.value ?? 73;
  const rawRisk = report?.scoring?.technicalRiskScore?.value ?? 30;

  const rawScoreObj = report?.torqueScoutDecisionScoreV1 || report?.scoringV6?.decisionScoreV1 || (report?.scoringV6 as any)?.decisionScore || (report as any)?.decisionScore;
  const decisionScore = rawScoreObj ? {
    score: typeof rawScoreObj.score === 'number' ? rawScoreObj.score : (report?.scoring?.buyabilityScore?.value ?? 80),
    confidenceScore: typeof rawScoreObj.confidenceScore === 'number' ? rawScoreObj.confidenceScore : 90,
    state: rawScoreObj.state || (
      (rawScoreObj.score ?? 80) >= 90 ? 'EXCELLENT' :
      (rawScoreObj.score ?? 80) >= 78 ? 'GOOD' :
      (rawScoreObj.score ?? 80) >= 65 ? 'CAUTION' :
      (rawScoreObj.score ?? 80) >= 48 ? 'HIGH_RISK' : 'AVOID'
    ),
    scope: rawScoreObj.scope || 'VEHICLE',
    modelDecisionRisk: rawScoreObj.modelDecisionRisk ?? Math.max(0, 100 - (rawScoreObj.score ?? 80)),
    explanation: rawScoreObj.explanation,
    deductedRisks: Array.isArray(rawScoreObj.deductedRisks) ? rawScoreObj.deductedRisks : [],
  } : null;

  const deductedRisks = (decisionScore?.deductedRisks || []) as any[];
  const totalRiskPenalty = deductedRisks.reduce((acc: number, r: any) => {
    const d = typeof r.netDeduction === 'number' && r.netDeduction > 0
      ? r.netDeduction
      : typeof r.deduction === 'number' && r.deduction > 0
      ? r.deduction
      : typeof r.penalty === 'number' && r.penalty > 0
      ? r.penalty
      : 0;
    return acc + d;
  }, 0);

  const isInsufficient = Boolean(
    decisionScore && (decisionScore.confidenceScore < 40 || decisionScore.score === null || decisionScore.state === 'INSUFFICIENT_DATA')
  );

  const displayedScore = isInsufficient
    ? '—'
    : totalRiskPenalty > 0
    ? Math.max(0, 100 - totalRiskPenalty)
    : (decisionScore?.score ?? rawBuyability);

  const numScore = typeof displayedScore === 'number' ? displayedScore : (decisionScore?.score ?? rawBuyability);
  const scoreState = decisionScore?.state || (numScore >= 90 ? 'EXCELLENT' : numScore >= 78 ? 'GOOD' : numScore >= 65 ? 'CAUTION' : numScore >= 48 ? 'HIGH_RISK' : 'AVOID');

  const getStateConfig = (state?: string) => {
    switch (state) {
      case 'EXCELLENT':
        return {
          label: 'Mükemmel Tercih (Düşük Risk)',
          color: '#15803d',
          bg: '#f0fdf4',
          border: '#bbf7d0',
          badgeBg: '#dcfce7',
          badgeText: '#15803d',
          icon: 'shield-checkmark' as const,
          verdict: 'Sınıfında referans kondisyonda, kontrolleri teyit edilerek doğrudan değerlendirilebilir.',
        };
      case 'GOOD':
        return {
          label: 'İyi Tercih (Dengeli)',
          color: '#0f766e',
          bg: '#f0fdfa',
          border: '#99f6e4',
          badgeBg: '#ccfbf1',
          badgeText: '#0f766e',
          icon: 'checkmark-circle' as const,
          verdict: 'Dengeli kondisyonda, belirli kontrollerin sağlanması ve ekspertiz teyidi şartıyla değerlendirilebilir.',
        };
      case 'CAUTION':
        return {
          label: 'Dikkatli Yaklaşım (İnceleme Gerekli)',
          color: '#b45309',
          bg: '#fffbeb',
          border: '#fde68a',
          badgeBg: '#fef3c7',
          badgeText: '#b45309',
          icon: 'warning' as const,
          verdict: 'Riskli kondisyonda, kapsamlı ekspertiz ve mekanik kontroller sağlanmadan karar verilmemelidir.',
        };
      case 'HIGH_RISK':
      case 'AVOID':
        return {
          label: state === 'AVOID' ? 'Uzak Durulmalı (Ağır Risk)' : 'Yüksek Risk Seviyesi',
          color: '#be123c',
          bg: '#fff1f2',
          border: '#fecdd3',
          badgeBg: '#ffe4e6',
          badgeText: '#be123c',
          icon: 'alert-circle' as const,
          verdict: 'Ağır riskli kondisyonda, yüksek maliyetli kronik arıza riskleri nedeniyle uzak durulması önerilir.',
        };
      default:
        return {
          label: 'Puanlama İçin Yeterli Doğrulanmış Veri Bulunamadı',
          color: '#1e40af',
          bg: '#eff6ff',
          border: '#bfdbfe',
          badgeBg: '#dbeafe',
          badgeText: '#1d4ed8',
          icon: 'information-circle' as const,
          verdict: 'Belirli kontrollerin sağlanması şartıyla değerlendirilebilir.',
        };
    }
  };

  const stateCfg = getStateConfig(scoreState);
  const harmonizedVerdict = isInsufficient
    ? 'Bu araç hakkında çeşitli arıza ve kullanıcı bildirimleri bulunabilir; ancak bunların sıklığını ve bu araç varyantına uygulanabilirliğini güvenilir şekilde doğrulayamadığımız için yanıltıcı bir puan vermiyoruz.'
    : (numScore >= 90 || scoreState === 'EXCELLENT')
    ? 'Sınıfında referans kondisyonda, kontrolleri teyit edilerek doğrudan değerlendirilebilir.'
    : (numScore >= 70 || scoreState === 'GOOD')
    ? 'Dengeli kondisyonda, belirli kontrollerin sağlanması ve ekspertiz teyidi şartıyla değerlendirilebilir.'
    : (numScore >= 50 || scoreState === 'CAUTION')
    ? 'Riskli kondisyonda, kapsamlı ekspertiz ve mekanik kontroller sağlanmadan karar verilmemelidir.'
    : 'Ağır riskli kondisyonda, yüksek maliyetli kronik arıza riskleri nedeniyle uzak durulması önerilir.';

  const reportCode = `TS-${report?.vehicleIdentity?.modelYear || new Date().getFullYear()}-${String(report?.vehicleIdentity?.brand || 'CAR').substring(0, 3).toUpperCase()}-${report?.vehicleIdentity?.engineCode || 'SPEC'}`;

  const reportDateStr = (() => {
    try {
      const d = (report as any)?.generatedAt || (report as any)?.createdAt;
      return d ? new Date(d).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR');
    } catch {
      return new Date().toLocaleDateString('tr-TR');
    }
  })();

  const rawPurchase = (report?.expertDecisionSynthesis as any)?.purchaseConditions || (report?.finalVerdict as any)?.proceedIf || [];
  const purchaseConditions = (Array.isArray(rawPurchase) ? rawPurchase : [rawPurchase])
    .map((item: any) => {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        return trimmed && trimmed !== '[object Object]' ? { title: trimmed } : null;
      }
      if (typeof item === 'object' && item !== null) {
        const title = item.condition || item.title || item.conditionText || item.text || item.heading || item.name || '';
        const text = item.reason || item.explanation || item.description || item.detail;
        const sTitle = typeof title === 'string' ? title.trim() : '';
        const sText = typeof text === 'string' ? text.trim() : undefined;
        if (sTitle && sTitle !== '[object Object]') {
          return { title: sTitle, text: sText && sText !== sTitle ? sText : undefined };
        }
      }
      return null;
    })
    .filter((x: any): x is { title: string; text?: string } => Boolean(x && x.title));

  const rawWalkAway = (report?.expertDecisionSynthesis as any)?.walkAwayConditions || (report?.finalVerdict as any)?.walkAwayIf || [];
  const walkAwayConditions = (Array.isArray(rawWalkAway) ? rawWalkAway : [rawWalkAway])
    .map((item: any) => {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        return trimmed && trimmed !== '[object Object]' ? { title: trimmed } : null;
      }
      if (typeof item === 'object' && item !== null) {
        const title = item.condition || item.title || item.conditionText || item.text || item.heading || item.name || '';
        const text = item.reason || item.explanation || item.description || item.detail;
        const sTitle = typeof title === 'string' ? title.trim() : '';
        const sText = typeof text === 'string' ? text.trim() : undefined;
        if (sTitle && sTitle !== '[object Object]') {
          return { title: sTitle, text: sText && sText !== sTitle ? sText : undefined };
        }
      }
      return null;
    })
    .filter((x: any): x is { title: string; text?: string } => Boolean(x && x.title));

  const rawSuitableFor = (report?.expertDecisionSynthesis as any)?.suitableFor || (report as any)?.suitableFor || [];
  const suitableFor = (Array.isArray(rawSuitableFor) ? rawSuitableFor : [rawSuitableFor])
    .map((item: any) => {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        return trimmed && trimmed !== '[object Object]' ? { group: trimmed } : null;
      }
      if (typeof item === 'object' && item !== null) {
        const group = item.profile || item.targetUserGroup || item.group || item.title || item.name || '';
        const rationale = item.explanation || item.rationale || item.description || item.detail;
        const sGroup = typeof group === 'string' ? group.trim() : '';
        const sRationale = typeof rationale === 'string' ? rationale.trim() : undefined;
        if (sGroup && sGroup !== '[object Object]') {
          return { group: sGroup, rationale: sRationale };
        }
      }
      return null;
    })
    .filter((x: any): x is { group: string; rationale?: string } => Boolean(x && x.group));

  const rawNotSuitableFor = (report?.expertDecisionSynthesis as any)?.notSuitableFor || (report as any)?.notSuitableFor || [];
  const notSuitableFor = (Array.isArray(rawNotSuitableFor) ? rawNotSuitableFor : [rawNotSuitableFor])
    .map((item: any) => {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        return trimmed && trimmed !== '[object Object]' ? { group: trimmed } : null;
      }
      if (typeof item === 'object' && item !== null) {
        const group = item.profile || item.targetUserGroup || item.group || item.title || item.name || '';
        const rationale = item.explanation || item.rationale || item.description || item.detail;
        const sGroup = typeof group === 'string' ? group.trim() : '';
        const sRationale = typeof rationale === 'string' ? rationale.trim() : undefined;
        if (sGroup && sGroup !== '[object Object]') {
          return { group: sGroup, rationale: sRationale };
        }
      }
      return null;
    })
    .filter((x: any): x is { group: string; rationale?: string } => Boolean(x && x.group));

  const sellerQuestions = report?.sellerQuestions || (report?.expertDecisionSynthesis as any)?.sellerQuestions || [];

  return (
    <View style={styles.containerLight}>
      {/* Top Detail Modal Popup */}
      <ItemDetailModal data={activeModalData} onClose={() => setActiveModalData(null)} />

      {/* Top Navigation Header */}
      <View style={styles.lightHeaderNav}>
        <TouchableOpacity style={styles.lightBackBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={styles.lightHeaderTitle}>Araç Raporu</Text>
          <Text style={styles.lightHeaderSub}>Seçtiğin varyant için AI destekli analiz raporu</Text>
        </View>

        <TouchableOpacity style={styles.lightShareBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {report ? (
        <ScrollView
          contentContainerStyle={styles.scrollContentLight}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#2563eb"
              colors={['#2563eb']}
            />
          }
        >
          {/* Action Bar */}
          <View style={styles.topActionBarLight}>
            <TouchableOpacity
              style={styles.actionBtnLight}
              onPress={toggleFavorite}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={16}
                color={isFavorited ? '#ef4444' : '#64748b'}
              />
              <Text
                style={[styles.actionBtnTextLight, isFavorited && { color: '#ef4444' }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {isFavorited ? 'Favorilerde' : 'Favorilere Ekle'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtnLight, isExportingPdf && { opacity: 0.7 }]}
              onPress={handleExportPdf}
              disabled={isExportingPdf}
              activeOpacity={0.7}
            >
              {isExportingPdf ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <Ionicons name="document-text-outline" size={16} color="#2563eb" />
              )}
              <Text
                style={[styles.actionBtnTextLight, { color: '#2563eb' }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {isExportingPdf ? 'Hazırlanıyor' : 'PDF İndir'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnLight}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Ionicons name="share-social-outline" size={16} color="#64748b" />
              <Text
                style={styles.actionBtnTextLight}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Paylaş
              </Text>
            </TouchableOpacity>
          </View>

          {/* Legacy Schema Version Warning & Free Upgrade Banner */}
          {(!report.expertDecisionSynthesis || ((report as any).schemaVersion || 1) < 2) && (
            <View style={styles.legacyUpgradeBannerLight}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Ionicons name="alert-circle" size={20} color="#d97706" />
                <Text style={styles.legacyUpgradeTextLight}>
                  Bu rapor eski prototip formatında hazırlanmıştır. Derin otomotiv uzman karar sentezini görmek için raporunuzu ücretsiz güncelleyebilirsiniz.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.legacyUpgradeBtnLight}
                onPress={() => activeVariantId && fetchReport(activeVariantId, true)}
              >
                <Text style={styles.legacyUpgradeBtnTextLight}>Güncelle</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 1. TOP HERO VEHICLE IDENTITY CARD WITH BRAND LOGO */}
          <View style={styles.heroCardLight}>
            {/* Top Badge & Date + Like/Dislike Voting Widget (Web ile %100 Birebir) */}
            <View style={styles.heroTopBadgeRow}>
              <View style={[styles.heroBadgeAndDate, { flex: 1, minWidth: 0 }]}>
                <View style={styles.reportTypeBadge}>
                  <Text style={styles.reportTypeBadgeText} numberOfLines={1} ellipsizeMode="tail">
                    Araç Sorgulama Raporu
                  </Text>
                </View>
                <Text style={styles.reportDateText} numberOfLines={1} ellipsizeMode="tail">
                  Rapor Tarihi: {reportDateStr}
                </Text>
              </View>

              {/* Subtle Like / Dislike Voting Widget */}
              <View style={styles.voteWidgetLight}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleVote('LIKE')}
                  disabled={isVoting || !currentReportId}
                  style={[
                    styles.voteBtnLight,
                    userVote === 'LIKE' && styles.voteBtnLikeActive,
                  ]}
                >
                  <Ionicons
                    name={userVote === 'LIKE' ? 'thumbs-up' : 'thumbs-up-outline'}
                    size={13}
                    color={userVote === 'LIKE' ? '#059669' : '#64748b'}
                  />
                  <Text
                    style={[
                      styles.voteCountTextLight,
                      userVote === 'LIKE' && styles.voteCountLikeActive,
                    ]}
                  >
                    {likes}
                  </Text>
                </TouchableOpacity>

                <View style={styles.voteDividerLight} />

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleVote('DISLIKE')}
                  disabled={isVoting || !currentReportId}
                  style={[
                    styles.voteBtnLight,
                    userVote === 'DISLIKE' && styles.voteBtnDislikeActive,
                  ]}
                >
                  <Ionicons
                    name={userVote === 'DISLIKE' ? 'thumbs-down' : 'thumbs-down-outline'}
                    size={13}
                    color={userVote === 'DISLIKE' ? '#e11d48' : '#64748b'}
                  />
                  <Text
                    style={[
                      styles.voteCountTextLight,
                      userVote === 'DISLIKE' && styles.voteCountDislikeActive,
                    ]}
                  >
                    {dislikes}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.heroTopRow}>
              {/* Brand Logo Container */}
              <BrandLogoContainer brandName={report.vehicleIdentity.brand} isMotorcycle={isMotorcycle} />

              {/* Title & Subtitle */}
              <View style={{ flex: 1, gap: 3, minWidth: 0, flexShrink: 1 }}>
                <Text style={styles.heroCarNameTextLight} numberOfLines={1} ellipsizeMode="tail">
                  {typeof report.vehicleIdentity.modelYear === 'number' ? `${report.vehicleIdentity.modelYear} ` : ''}{report.vehicleIdentity.brand} {report.vehicleIdentity.model}
                </Text>

                {(() => {
                  const displacementLabel = isElectricVehicle ? 'Elektrik' : (displacementDisplay || '');
                  const rawTrim = (params.trim || (report.vehicleIdentity as any)?.trim || (report as any)?.trimPackage || '').trim();
                  const trimLabel = rawTrim && !/^(standart|standart donanım|standart kasa)$/i.test(rawTrim) ? rawTrim : (isMotorcycle ? 'Standart / Tüm Dönemler' : '');
                  const powerStr = hpDisplay !== '—' ? `(${hpDisplay})` : '';
                  const line1 = [displacementLabel, trimLabel, powerStr].filter(Boolean).join(' ');
                  const transLabel = report.vehicleIdentity.transmissionName ? formatCleanTransmissionName(report.vehicleIdentity.transmissionName) : (params.transmission ? formatCleanTransmissionName(String(params.transmission)) : '');
                  const fuelLabel = formatFuelTypeTr(report.vehicleIdentity.fuelType);
                  const consLabel = fuelOrRangeDisplay;
                  const line2Parts = [transLabel, fuelLabel, consLabel].filter(Boolean);
                  return (
                    <View style={{ gap: 2, marginTop: 1, minWidth: 0, flexShrink: 1 }}>
                      {Boolean(line1) && (
                        <Text style={styles.heroSubTextLight} numberOfLines={1} ellipsizeMode="tail">
                          {line1}
                        </Text>
                      )}
                      {line2Parts.length > 0 && (
                        <Text style={[styles.heroSubTextLight, { fontSize: 11, color: '#64748b' }]} numberOfLines={1} ellipsizeMode="tail">
                          {line2Parts.join(' • ')}
                        </Text>
                      )}
                    </View>
                  );
                })()}
              </View>
            </View>

            {/* Spacious Metric Chips Bar */}
            <View style={styles.specChipsBarLight}>
              {!isMotorcycle && (
                <View style={styles.specChipLight}>
                  <Ionicons name="calendar-outline" size={13} color="#0284c7" />
                  <Text style={styles.specChipTextLight} numberOfLines={1} ellipsizeMode="tail">{report.vehicleIdentity.modelYear}</Text>
                </View>
              )}

              <View style={styles.specChipLight}>
                <Ionicons name="funnel-outline" size={13} color="#0284c7" />
                <Text style={styles.specChipTextLight} numberOfLines={1} ellipsizeMode="tail">{formatFuelTypeTr(report.vehicleIdentity.fuelType)}</Text>
              </View>

              <View style={styles.specChipLight}>
                <Ionicons name="options-outline" size={13} color="#0284c7" />
                <Text style={styles.specChipTextLight} numberOfLines={1} ellipsizeMode="tail">{formatCleanTransmissionName(report.vehicleIdentity.transmissionName) || (isMotorcycle ? 'Manuel' : 'Otomatik')}</Text>
              </View>

              <View style={styles.specChipLight}>
                <Ionicons name={isMotorcycle ? 'bicycle-outline' : 'car-outline'} size={13} color="#0284c7" />
                <Text style={styles.specChipTextLight} numberOfLines={1} ellipsizeMode="tail">{isMotorcycle ? 'Motosiklet' : (params.bodyType ? String(params.bodyType) : ((report.vehicleIdentity as any)?.bodyType || 'Binek'))}</Text>
              </View>

              {hpDisplay !== '—' && (
                <View style={[styles.specChipLight, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
                  <Ionicons name="flash-outline" size={13} color="#ea580c" />
                  <Text style={[styles.specChipTextLight, { color: '#c2410c' }]} numberOfLines={1} ellipsizeMode="tail">{hpDisplay}</Text>
                </View>
              )}
            </View>

            {/* Footer Row: Rapor ID */}
            <View style={styles.heroFooterRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.reportCodeText}>Rapor ID: {reportCode}</Text>
                <TouchableOpacity onPress={() => Alert.alert('Kopyalandı', 'Rapor ID kopyalandı.')}>
                  <Ionicons name="copy-outline" size={13} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 3. TORQUE SCOUT EXPERT DECISION SYNTHESIS SECTIONS IN LIGHT COLLAPSIBLE CARDS */}

          {/* 3.1 BU ARAÇ NASIL BİR OTOMOBİL / MOTOSİKLET / TİCARİ ARAÇ? */}
          {synthesis?.vehicleCharacter && (
            <CollapsibleLightSection
              title={characterHeading}
              subtitle="Araç Karakteri ve Değerlendirme"
              iconName={isMotorcycle ? 'bicycle-outline' : 'car-sport-outline'}
              iconColor="#ea580c"
              iconBgColor="#fff7ed"
              borderColor="#fed7aa"
              titleColor="#c2410c"
              defaultOpen={true}
            >
              {Boolean(synthesis.vehicleCharacter.headline) && (
                <Text style={styles.characterHeadlineLight}>{replacePsWithHp(synthesis.vehicleCharacter.headline)}</Text>
              )}
              {Boolean(synthesis.vehicleCharacter.detailedAssessment) && (
                <View style={{ gap: 8 }}>
                  {formatVehicleAssessmentParagraphs(synthesis.vehicleCharacter.detailedAssessment || '').map((para: string, idx: number) => (
                    <Text key={idx} style={styles.bodyTextLight}>{cleanRangeText(para)}</Text>
                  ))}
                </View>
              )}

              {/* Daily Use Grid */}
              {synthesis.dailyUseAssessment && (
                <View style={styles.dailyUseGridLight}>
                  {Boolean(synthesis.dailyUseAssessment.cityUse) && (
                    <View style={styles.dailyUseBoxLight}>
                      <Text style={styles.dailyUseTitleLight}>Şehir İçi Kullanım</Text>
                      <Text style={styles.dailyUseTextLight}>{cleanRangeText(synthesis.dailyUseAssessment.cityUse)}</Text>
                    </View>
                  )}
                  {Boolean(synthesis.dailyUseAssessment.highwayUse) && (
                    <View style={styles.dailyUseBoxLight}>
                      <Text style={styles.dailyUseTitleLight}>Otoyol ve Seyir</Text>
                      <Text style={styles.dailyUseTextLight}>{cleanRangeText(synthesis.dailyUseAssessment.highwayUse)}</Text>
                    </View>
                  )}
                  {Boolean(synthesis.dailyUseAssessment.trafficBehavior) && (
                    <View style={styles.dailyUseBoxLight}>
                      <Text style={styles.dailyUseTitleLight}>Trafik & Dur-Kalk Karakteri</Text>
                      <Text style={styles.dailyUseTextLight}>{cleanRangeText(synthesis.dailyUseAssessment.trafficBehavior)}</Text>
                    </View>
                  )}
                  {Boolean(synthesis.dailyUseAssessment.comfortAssessment) && (
                    <View style={styles.dailyUseBoxLight}>
                      <Text style={styles.dailyUseTitleLight}>Süspansiyon & Konfor</Text>
                      <Text style={styles.dailyUseTextLight}>{cleanRangeText(synthesis.dailyUseAssessment.comfortAssessment)}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Donanım Paketi ve Günümüz Standartları Değerlendirmesi */}
              {Boolean((synthesis as any)?.contemporaryTrimEvaluation || (synthesis as any)?.trimPackageComparison) && (() => {
                const trimPkg = ((synthesis as any)?.contemporaryTrimEvaluation || (synthesis as any)?.trimPackageComparison) as any;
                if (!trimPkg) return null;
                const trimTitle = trimPkg.selectedTrimName || trimPkg.trimName || (report?.vehicleIdentity as any)?.trim || 'Standart Donanım';
                const narrative = trimPkg.overview || trimPkg.comparisonNarrative || '';
                const pros = trimPkg.contemporaryPros || trimPkg.keyAddedFeatures || [];
                const cons = trimPkg.contemporaryCons || trimPkg.missingFeaturesInLowerTrim || [];
                return (
                  <View style={styles.trimBoxContainerLight}>
                    <View style={styles.trimBoxHeaderLight}>
                      <Ionicons name="layers-outline" size={16} color="#d97706" />
                      <Text style={styles.trimBoxHeaderTextLight}>
                        Donanım Paketi: <Text style={{ color: '#b45309', fontWeight: '900' }}>{trimTitle}</Text>
                      </Text>
                    </View>

                    {Boolean(narrative) && (
                      <Text style={styles.trimNarrativeTextLight}>
                        {cleanRangeText(narrative)}
                      </Text>
                    )}

                    {/* 2-Box: Contemporary Pros vs Cons */}
                    <View style={styles.trimProsConsWrapLight}>
                      {/* Günümüz Şartlarında Olumlu (Artıları) */}
                      <View style={styles.trimProsCardLight}>
                        <View style={styles.trimProsHeaderRowLight}>
                          <Ionicons name="checkmark-circle" size={15} color="#16a34a" />
                          <Text style={styles.trimProsTitleLight}>Günümüz Şartlarında Olumlu (Artıları)</Text>
                        </View>
                        {pros.length > 0 ? (
                          <View style={{ gap: 4, marginTop: 4 }}>
                            {pros.map((pro: any, pIdx: number) => (
                              <View key={pIdx} style={styles.trimBulletRowLight}>
                                <Text style={styles.trimProBulletIconLight}>✔</Text>
                                <Text style={styles.trimBulletTextLight}>{cleanRangeText(String(pro))}</Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <Text style={styles.trimEmptyTextLight}>Temel mekanik dayanıklılık ve fabrika konforu mevcuttur.</Text>
                        )}
                      </View>

                      {/* Günümüz Şartlarında Olumsuz (Eksiklikleri) */}
                      <View style={styles.trimConsCardLight}>
                        <View style={styles.trimConsHeaderRowLight}>
                          <Ionicons name="alert-circle" size={15} color="#dc2626" />
                          <Text style={styles.trimConsTitleLight}>Günümüz Şartlarında Olumsuz (Eksiklikleri)</Text>
                        </View>
                        {cons.length > 0 ? (
                          <View style={{ gap: 4, marginTop: 4 }}>
                            {cons.map((con: any, cIdx: number) => (
                              <View key={cIdx} style={styles.trimBulletRowLight}>
                                <Text style={styles.trimConBulletIconLight}>✖</Text>
                                <Text style={styles.trimBulletTextLight}>{cleanRangeText(String(con))}</Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <Text style={styles.trimEmptyTextLight}>Dönemine göre belirgin bir donanım eksikliği bulunmamaktadır.</Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })()}
            </CollapsibleLightSection>
          )}

          {/* 3.1.b MOTORCYCLE: MODEL GEÇMİŞİ & ÜRETİM DÖNEMLERİ */}
          {Boolean(isMotorcycle && synthesis?.motorcycleEraAnalysis) && (() => {
            const motoEra = synthesis?.motorcycleEraAnalysis;
            if (!motoEra) return null;
            return (
              <CollapsibleLightSection
                title="Model Geçmişi ve Üretim Dönemleri Haritası"
                subtitle="Karbüratör / Enjeksiyon ve Revizyon Dönemleri"
                iconName="time-outline"
                iconColor="#0891b2"
                iconBgColor="#ecfeff"
                borderColor="#a5f3fc"
                titleColor="#0e7490"
                defaultOpen={false}
              >
                {Boolean(motoEra.modelHistory) && (
                  <Text style={styles.bodyTextLight}>
                    {cleanRangeText(motoEra.modelHistory)}
                  </Text>
                )}

                {Boolean(motoEra.productionEras && motoEra.productionEras.length > 0) && (() => {
                  const eras = motoEra.productionEras || [];
                  return (
                    <View style={{ gap: 8, marginTop: 6 }}>
                      {eras.map((era, idx) => {
                        const eraTitle = era.eraName || `${era.startYear} – ${era.endYear || 'Günümüz'} Dönemi`;
                      return (
                        <View key={idx} style={styles.motoEraCardLight}>
                          <View style={styles.motoEraHeaderLight}>
                            <Text style={styles.motoEraTitleLight}>{eraTitle}</Text>
                            <View style={[styles.motoEraFuelBadgeLight, { backgroundColor: era.fuelSystem === 'EFI' ? '#dcfce7' : '#fef3c7' }]}>
                              <Text style={[styles.motoEraFuelBadgeTextLight, { color: era.fuelSystem === 'EFI' ? '#15803d' : '#b45309' }]}>
                                {era.fuelSystem || 'Standart'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.motoEraSpecsTextLight}>
                            {era.displacementCc ? `${era.displacementCc} cc` : '—'} • {era.powerRange || (era.powerHp ? `${era.powerHp} HP` : '—')} • {era.hasAbs ? 'ABS Mevcut' : (era.brakingSystem || 'Standart')}
                          </Text>
                          {Boolean(era.keyChanges) && (
                            <Text style={styles.motoEraChangesTextLight}>
                              {Array.isArray(era.keyChanges) ? era.keyChanges.filter(Boolean).join(', ') : String(era.keyChanges)}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                    </View>
                  );
                })()}

                {Boolean(motoEra.recommendedEraComparison) && (
                  <View style={styles.motoEraRecBoxLight}>
                    <Text style={styles.motoEraRecTitleLight}>💡 Hangi Dönem Daha Mantıklı?</Text>
                    <Text style={styles.motoEraRecDescLight}>
                      {cleanRangeText(motoEra.recommendedEraComparison)}
                    </Text>
                  </View>
                )}

                {/* Motosiklet Geneli Ortak Kronik Noktalar & Fırsat/Riskler */}
                {Array.isArray(motoEra.allEraCommonIssues) && motoEra.allEraCommonIssues.length > 0 && (
                  <View style={{ gap: 8, marginTop: 12 }}>
                    <Text style={styles.motoSubSectionTitleLight}>⚠️ Motosiklet Geneli Ortak Kronik Noktalar & Fırsat/Riskler</Text>
                    {motoEra.allEraCommonIssues.map((issue: any, idx: number) => {
                      const issueDesc = issue.issueDescription || issue.symptoms || issue.risk || '';
                      const checkAdvice = issue.checkAdvice || issue.checkNote || '';
                      return (
                        <View key={idx} style={styles.motoCommonIssueCardLight}>
                          <Text style={styles.motoIssueTitleLight}>{issue.title}</Text>
                          {Boolean(issueDesc) && (
                            <Text style={styles.motoIssueDescLight}>{cleanRangeText(issueDesc)}</Text>
                          )}
                          {Boolean(checkAdvice) && (
                            <Text style={styles.motoCheckAdviceTextLight}>
                              🔍 Ekspertiz & Kontrol: {cleanRangeText(checkAdvice)}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Döneme Özgü Mekanik ve Elektronik Ayrışmalar */}
                {Array.isArray(motoEra.eraSpecificIssues) && motoEra.eraSpecificIssues.length > 0 && (
                  <View style={{ gap: 8, marginTop: 12 }}>
                    <Text style={styles.motoSubSectionTitleLight}>🔧 Döneme Özgü Mekanik ve Elektronik Ayrışmalar</Text>
                    {motoEra.eraSpecificIssues.map((eraBlock: any, idx: number) => {
                      const subIssues = Array.isArray(eraBlock.issues) && eraBlock.issues.length > 0
                        ? eraBlock.issues
                        : eraBlock.title
                        ? [{ title: eraBlock.title, description: eraBlock.description || eraBlock.symptoms || eraBlock.risk, checkAdvice: eraBlock.checkAdvice || eraBlock.checkNote }]
                        : [];

                      return (
                        <View key={idx} style={styles.motoEraBlockCardLight}>
                          <View style={styles.motoEraBlockHeaderLight}>
                            <Text style={styles.motoEraBlockTitleLight}>{eraBlock.eraName}</Text>
                            {Boolean(eraBlock.years) && (
                              <Text style={styles.motoEraBlockYearsLight}>({eraBlock.years})</Text>
                            )}
                          </View>
                          <View style={{ gap: 6, marginTop: 4 }}>
                            {subIssues.map((iss: any, iIdx: number) => (
                              <View key={iIdx} style={styles.motoSubIssueBoxLight}>
                                <Text style={styles.motoSubIssueTitleLight}>{iss.title}</Text>
                                {Boolean(iss.description) && (
                                  <Text style={styles.motoSubIssueDescLight}>{cleanRangeText(iss.description)}</Text>
                                )}
                                {Boolean(iss.checkAdvice) && (
                                  <Text style={styles.motoSubCheckAdviceLight}>✔ {cleanRangeText(iss.checkAdvice)}</Text>
                                )}
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </CollapsibleLightSection>
            );
          })()}

          {/* 3.1.c MINIVAN / PANELVAN: TİCARİ UYGULAMA & ŞANZIMAN ANALİZİ */}
          {Boolean((resolvedVehicleType === 'MINIVAN_PANELVAN' || resolvedVehicleType === 'COMMERCIAL') && (synthesis as any)?.commercialApplicationAnalysis) && (() => {
            const commAnalysis = (synthesis as any)?.commercialApplicationAnalysis as any;
            if (!commAnalysis) return null;
            return (
              <CollapsibleLightSection
                title="Ticari Uygulama & Konfigürasyon Analizi"
                subtitle="Şanzıman Karşılaştırması & Ağır Hizmet Yıpranma Riskleri"
                badgeText={commAnalysis.configurationContext?.commercialMeaning}
                iconName="bus-outline"
                iconColor="#2563eb"
                iconBgColor="#eff6ff"
                borderColor="#bfdbfe"
                titleColor="#1d4ed8"
                defaultOpen={false}
              >
                {Boolean(commAnalysis.applicationSummary) && (
                  <Text style={styles.bodyTextLight}>
                    {cleanRangeText(commAnalysis.applicationSummary)}
                  </Text>
                )}

                {/* Şanzıman Karşılaştırması: Manuel vs Otomatik */}
                {(commAnalysis.manualTransmissionAnalysis || commAnalysis.automaticTransmissionAnalysis || commAnalysis.transmissionComparison) && (
                  <View style={{ gap: 8, marginTop: 4 }}>
                    {Boolean(commAnalysis.manualTransmissionAnalysis) && (
                      <View style={styles.transBoxLight}>
                        <Text style={styles.transTitleLight}>Manuel Şanzıman Uygulaması</Text>
                        <Text style={styles.transTextLight}>{cleanRangeText(commAnalysis.manualTransmissionAnalysis)}</Text>
                      </View>
                    )}
                    {Boolean(commAnalysis.automaticTransmissionAnalysis) && (
                      <View style={styles.transBoxLight}>
                        <Text style={[styles.transTitleLight, { color: '#b45309' }]}>Otomatik Şanzıman Uygulaması</Text>
                        <Text style={styles.transTextLight}>{cleanRangeText(commAnalysis.automaticTransmissionAnalysis)}</Text>
                      </View>
                    )}
                    {Boolean(commAnalysis.transmissionComparison) && (
                      <View style={styles.transComparisonNoteLight}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#1d4ed8' }}>💡 Uzman Kararı & Tavsiye:</Text>
                        <Text style={{ fontSize: 11, color: '#1e3a8a', lineHeight: 16 }}>{cleanRangeText(commAnalysis.transmissionComparison)}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Ticari Kullanım Kaynaklı Yıpranma Riskleri */}
                {Array.isArray(commAnalysis.commercialDutyRisks) && commAnalysis.commercialDutyRisks.length > 0 && (
                  <View style={{ gap: 8, marginTop: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#c2410c', textTransform: 'uppercase' }}>
                      Ticari Yıpranma Riskleri ve Kontrol Noktaları
                    </Text>
                    {commAnalysis.commercialDutyRisks.map((risk: any, rIdx: number) => (
                      <View key={rIdx} style={styles.commDutyCardLight}>
                        <Text style={styles.commDutyTitleLight}>{risk.title}</Text>
                        <Text style={styles.commDutyRiskLight}>{cleanRangeText(risk.risk)}</Text>
                        {Boolean(risk.checkRecommendation) && (
                          <Text style={styles.commDutyCheckLight}>🔍 Kontrol: {cleanRangeText(risk.checkRecommendation)}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </CollapsibleLightSection>
            );
          })()}

          {/* 3.2 TERCİH ETMEK İÇİN GÜÇLÜ NEDENLER */}
          {Boolean(synthesis?.strongestReasonsToChoose && synthesis.strongestReasonsToChoose.length > 0) && (() => {
            const reasons = synthesis?.strongestReasonsToChoose || [];
            return (
              <CollapsibleLightSection
                title="Tercih Etmek İçin Güçlü Nedenler"
                badgeText={`${reasons.length} Madde`}
                iconName="checkmark-circle-outline"
                iconColor="#16a34a"
                iconBgColor="#f0fdf4"
                borderColor="#bbf7d0"
                titleColor="#15803d"
                defaultOpen={false}
              >
                {reasons.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    style={styles.reasonCardGreenLight}
                    onPress={() =>
                      setActiveModalData({
                        title: item.title,
                        subtitle: 'Tercih Etmek İçin Güçlü Neden',
                        type: 'green',
                        badge: `Neden #${idx + 1}`,
                        content: item.explanation || item.title,
                        icon: 'checkmark-circle',
                      })
                    }
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.reasonTitleGreenLight}>{item.title}</Text>
                      <Ionicons name="open-outline" size={16} color="#16a34a" />
                    </View>
                    <Text style={styles.reasonDescGreenLight} numberOfLines={3}>{item.explanation}</Text>
                    <Text style={styles.tapToViewMoreGreen}>Detaylı incelemek için dokunun ➔</Text>
                  </TouchableOpacity>
                ))}
              </CollapsibleLightSection>
            );
          })()}

          {/* 3.3 SATIN ALMADAN ÖNCE BİLİNECEK TAVİZLER */}
          {Boolean(synthesis?.compromisesAndLimitations && synthesis.compromisesAndLimitations.length > 0) && (() => {
            const compromises = synthesis?.compromisesAndLimitations || [];
            return (
              <CollapsibleLightSection
                title="Satın Almadan Önce Bilinecek Tavizler"
                badgeText={`${compromises.length} Sınırlama`}
                iconName="alert-circle-outline"
                iconColor="#f97316"
                iconBgColor="#fff7ed"
                borderColor="#fed7aa"
                titleColor="#c2410c"
                defaultOpen={false}
              >
                {compromises.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    style={styles.reasonCardOrangeLight}
                    onPress={() =>
                      setActiveModalData({
                        title: item.title,
                        subtitle: 'Taviz & Sınırlama Analizi',
                        type: 'orange',
                        badge: `Sınırlama #${idx + 1}`,
                        content: item.explanation || item.title,
                        icon: 'alert-circle',
                      })
                    }
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.reasonTitleOrangeLight}>{item.title}</Text>
                      <Ionicons name="open-outline" size={16} color="#c2410c" />
                    </View>
                    <Text style={styles.reasonDescOrangeLight} numberOfLines={3}>{item.explanation}</Text>
                    <Text style={styles.tapToViewMoreOrange}>Detaylı incelemek için dokunun ➔</Text>
                  </TouchableOpacity>
                ))}
              </CollapsibleLightSection>
            );
          })()}

          {/* 3.4 KULLANICI PROFİL UYGUNLUK ANALİZİ */}
          {Boolean(suitableFor?.length || notSuitableFor?.length) && (
            <CollapsibleLightSection
              title="Kullanıcı Profil Uygunluk Analizi"
              badgeText="Uygunluk Rehberi"
              iconName="people-outline"
              iconColor="#2563eb"
              iconBgColor="#eff6ff"
              borderColor="#bfdbfe"
              titleColor="#1d4ed8"
              defaultOpen={false}
            >
              <View style={styles.grid2ColLight}>
                {Boolean(suitableFor && suitableFor.length > 0) && (
                  <View style={styles.suitableCardGreenLight}>
                    <Text style={styles.suitableTitleGreenLight}>👤 Kimler İçin Mantıklı?</Text>
                    {suitableFor.map((item, idx) => (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.8}
                        style={{ marginTop: 6, paddingVertical: 4 }}
                        onPress={() =>
                          setActiveModalData({
                            title: item.group,
                            subtitle: 'Hedef Sürücü Profili',
                            type: 'green',
                            badge: 'İdeal Kullanıcı',
                            content: item.rationale || `${item.group} grubu için bu araç tavsiye edilen varyantlar arasındadır.`,
                            icon: 'person-circle-outline',
                          })
                        }
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.suitableItemHeadGreenLight}>• {item.group}</Text>
                          <Ionicons name="chevron-forward" size={14} color="#16a34a" />
                        </View>
                        {Boolean(item.rationale) && (
                          <Text style={styles.suitableItemDescGreenLight} numberOfLines={2}>{item.rationale}</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {Boolean(notSuitableFor && notSuitableFor.length > 0) && (
                  <View style={styles.suitableCardRedLight}>
                    <Text style={styles.suitableTitleRedLight}>🚫 Kimler İçin Uygun Olmayabilir?</Text>
                    {notSuitableFor.map((item, idx) => (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.8}
                        style={{ marginTop: 6, paddingVertical: 4 }}
                        onPress={() =>
                          setActiveModalData({
                            title: item.group,
                            subtitle: 'Riskli / Uyumsuz Sürücü Profili',
                            type: 'red',
                            badge: 'Uygun Değil',
                            content: item.rationale || `${item.group} grubu beklentileri ile bu aracın karakteri uyuşmamaktadır.`,
                            icon: 'person-remove',
                          })
                        }
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.suitableItemHeadRedLight}>• {item.group}</Text>
                          <Ionicons name="chevron-forward" size={14} color="#dc2626" />
                        </View>
                        {Boolean(item.rationale) && (
                          <Text style={styles.suitableItemDescRedLight} numberOfLines={2}>{item.rationale}</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </CollapsibleLightSection>
          )}

          {/* 3.5 HANGİ ŞARTLARDA DEĞERLENDİRİLEBİLİR? */}
          {Boolean(purchaseConditions && purchaseConditions.length > 0) && (
            <CollapsibleLightSection
              title="Hangi Şartlarda Değerlendirilebilir?"
              badgeText={`${purchaseConditions.length} Kritik Onay`}
              iconName="shield-checkmark-outline"
              iconColor="#16a34a"
              iconBgColor="#f0fdf4"
              borderColor="#bbf7d0"
              titleColor="#15803d"
              defaultOpen={false}
            >
              {purchaseConditions.map((cond, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  style={styles.condCardGreenLight}
                  onPress={() =>
                    setActiveModalData({
                      title: cond.title,
                      subtitle: 'Satın Alma Onay Kriteri',
                      type: 'green',
                      badge: `Onay Kriteri #${idx + 1}`,
                      content: cond.text || cond.title,
                      icon: 'shield-checkmark',
                    })
                  }
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.condTitleGreenLight}>• {cond.title}</Text>
                    <Ionicons name="open-outline" size={16} color="#15803d" />
                  </View>
                  {Boolean(cond.text) && <Text style={styles.condDescGreenLight} numberOfLines={2}>{cond.text}</Text>}
                </TouchableOpacity>
              ))}
            </CollapsibleLightSection>
          )}

          {/* 3.6 HANGİ DURUMDA SATIN ALMAKTAN VAZGEÇİLMELİ? */}
          {Boolean(walkAwayConditions && walkAwayConditions.length > 0) && (
            <CollapsibleLightSection
              title="Hangi Durumda Satın Almaktan Vazgeçilmeli?"
              badgeText={`${walkAwayConditions.length} Kırmızı Çizgi`}
              iconName="warning-outline"
              iconColor="#dc2626"
              iconBgColor="#fef2f2"
              borderColor="#fecaca"
              titleColor="#b91c1c"
              defaultOpen={false}
            >
              {walkAwayConditions.map((cond, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  style={styles.condCardRedLight}
                  onPress={() =>
                    setActiveModalData({
                      title: cond.title,
                      subtitle: 'Kırmızı Çizgi / Alımdan Vazgeçme',
                      type: 'red',
                      badge: `Vazgeçme Kriteri #${idx + 1}`,
                      content: cond.text || cond.title,
                      icon: 'warning',
                    })
                  }
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.condTitleRedLight}>• {cond.title}</Text>
                    <Ionicons name="open-outline" size={16} color="#dc2626" />
                  </View>
                  {Boolean(cond.text) && <Text style={styles.condDescRedLight} numberOfLines={2}>{cond.text}</Text>}
                </TouchableOpacity>
              ))}
            </CollapsibleLightSection>
          )}

          {/* SCORE SECTION: ALINABİLİRLİK SKORU (Web ile %100 Birebir Eşleşme) */}
          <View style={[styles.scoreHeroCardLight, { backgroundColor: '#ffffff', borderColor: stateCfg.border }]}>
            <View style={styles.scoreHeroTopRow}>
              {/* Sol: Alınabilirlik Skoru Kutusu */}
              <View style={[styles.scoreBoxCompactLight, { backgroundColor: stateCfg.bg, borderColor: stateCfg.border }]}>
                <Text style={[styles.scoreBoxCompactLabel, { color: stateCfg.color }]}>ALINABİLİRLİK SKORU</Text>
                <Text style={[styles.scoreBoxCompactVal, { color: stateCfg.color }]}>
                  {isInsufficient ? '—' : `${numScore} / 100`}
                </Text>
              </View>

              {/* Sağ: Rozet & Uyumlu Karar Cümlesi */}
              <View style={styles.scoreHeroRightCol}>
                <View style={[styles.scoreHeroBadgeLight, { backgroundColor: stateCfg.badgeBg, borderColor: stateCfg.border }]}>
                  <Text style={[styles.scoreHeroBadgeTextLight, { color: stateCfg.badgeText }]}>
                    {stateCfg.label}
                  </Text>
                </View>
                <Text style={styles.scoreHeroVerdictTextLight}>
                  {harmonizedVerdict}
                </Text>
              </View>
            </View>
          </View>

          {/* NEDEN PUAN KIRILDI? (FMEA KESİNTİLERİ LİSTESİ) */}
          {deductedRisks.length > 0 && (
            <View style={styles.fmeaContainerLight}>
              <View style={styles.fmeaHeaderRowLight}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="alert-circle" size={16} color="#dc2626" />
                    <Text style={styles.fmeaTitleLight}>Neden Puan Kırıldı?</Text>
                  </View>
                  <Text style={styles.fmeaSubtitleLight}>
                    Otomotiv dünyasında geçerli kabul görmüş FMEA ve güvenilirlik mühendisliği ilkelerine dayalı formül hesaplaması yapılmıştır:
                  </Text>
                </View>
                <View style={styles.fmeaPenaltyBadgeLight}>
                  <Text style={styles.fmeaPenaltyBadgeTextLight}>-{totalRiskPenalty} Puan</Text>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#b91c1c' }}>(Teknik Kesinti)</Text>
                </View>
              </View>

              <View style={{ gap: 8, marginTop: 4 }}>
                {deductedRisks.map((dRisk: any, idx: number) => {
                  const dTitle = (dRisk.title || 'Doğrulanmış Teknik Kusur').replace(/\s*\(-?\d+\s*Puan\)/gi, '').trim();
                  const dReason = dRisk.reason || dRisk.description || '';
                  const deduction = typeof dRisk.netDeduction === 'number' && dRisk.netDeduction > 0
                    ? dRisk.netDeduction
                    : typeof dRisk.deduction === 'number' && dRisk.deduction > 0
                    ? dRisk.deduction
                    : typeof dRisk.penalty === 'number' && dRisk.penalty > 0
                    ? dRisk.penalty
                    : null;
                  const domainKey = (dRisk.domain || '').toUpperCase();
                  const domainLabel = DOMAIN_LABELS_TR[domainKey] || 'Mekanik Sistem';
                  const cleanInspection = dRisk.inspectionInstruction || '';

                  return (
                    <View key={idx} style={styles.fmeaCardLight}>
                      <View style={styles.fmeaCardHeaderLight}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <View style={styles.fmeaDomainBadgeLight}>
                            <Text style={styles.fmeaDomainBadgeTextLight}>{domainLabel}</Text>
                          </View>
                          <Text style={styles.fmeaDefectTitleLight}>{dTitle}</Text>
                        </View>
                        {deduction && deduction > 0 ? (
                          <View style={styles.fmeaDefectPillLight}>
                            <Text style={styles.fmeaDefectPillTextLight}>-{deduction} Puan</Text>
                          </View>
                        ) : null}
                      </View>

                      {Boolean(dReason) && (
                        <Text style={styles.fmeaDefectReasonLight}>{cleanRangeText(dReason)}</Text>
                      )}

                      {Boolean(cleanInspection) && (
                        <View style={styles.fmeaInspectionBoxLight}>
                          <Text style={styles.fmeaInspectionTitleLight}>🔍 SATIN ALMADAN ÖNCE EKSPERTİZ KONTROLÜ:</Text>
                          <Text style={styles.fmeaInspectionTextLight}>{cleanRangeText(cleanInspection)}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* TEKNİK ÖZELLİKLER KARTLARI (8-Card Dynamic Grid - Zero-Null Guarantee) */}
          <View style={styles.specsCardLight}>
            <View style={styles.specsHeaderRowLight}>
              <Ionicons name="speedometer-outline" size={18} color="#0f172a" />
              <Text style={styles.specsHeaderTitleLight}>Teknik Özellikler</Text>
            </View>
            <View style={styles.specsGridWrapLight}>
              <View style={styles.specBoxLight}>
                <Text style={styles.specLabelLight}>Motor Gücü</Text>
                <Text style={styles.specValueLight}>{hpDisplay || '—'}</Text>
              </View>
              <View style={styles.specBoxLight}>
                <Text style={styles.specLabelLight}>{isElectricVehicle ? 'Güç Ünitesi' : 'Motor Hacmi'}</Text>
                <Text style={styles.specValueLight}>{displacementDisplay || '—'}</Text>
              </View>
              <View style={[styles.specBoxLight, styles.specBoxHighlightLight]}>
                <Text style={styles.specLabelLight}>MTV (Yıllık / Taksit)</Text>
                <Text style={[styles.specValueLight, styles.specValueHighlightLight]}>{mtvDisplay || '—'}</Text>
              </View>
              <View style={styles.specBoxLight}>
                <Text style={styles.specLabelLight}>Maksimum Hız</Text>
                <Text style={styles.specValueLight}>{topSpeedDisplay || '—'}</Text>
              </View>
              <View style={styles.specBoxLight}>
                <Text style={styles.specLabelLight}>{isLowSpeedBike ? '0-50 / Hızlanma' : '0-100 Hızlanma'}</Text>
                <Text style={styles.specValueLight}>{zeroToHundredDisplay || '—'}</Text>
              </View>
              <View style={styles.specBoxLight}>
                <Text style={styles.specLabelLight}>{isElectricVehicle ? 'Menzil (WLTP)' : 'Ort. Tüketim'}</Text>
                <Text style={styles.specValueLight}>{fuelOrRangeDisplay || '—'}</Text>
              </View>
              <View style={styles.specBoxLight}>
                <Text style={styles.specLabelLight}>{isMotorcycle ? 'Depolama / Çanta' : 'Bagaj Hacmi'}</Text>
                <Text style={styles.specValueLight}>{trunkDisplay || '—'}</Text>
              </View>
              <View style={styles.specBoxLight}>
                <Text style={styles.specLabelLight}>Boş Ağırlık</Text>
                <Text style={styles.specValueLight}>{weightDisplay || '—'}</Text>
              </View>
            </View>
          </View>

          {/* 4. SATICIYA SORULACAK KRİTİK SORULAR */}
          {Array.isArray(sellerQuestions) && sellerQuestions.length > 0 && (
            <CollapsibleLightSection
              title="Satıcıya Sorulacak Kritik Sorular"
              badgeText={`${sellerQuestions.length} Soru`}
              iconName="help-circle-outline"
              iconColor="#6d28d9"
              iconBgColor="#f5f3ff"
              borderColor="#ddd6fe"
              titleColor="#6d28d9"
              defaultOpen={false}
            >
              {sellerQuestions.map((q, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  style={styles.questionCardLight}
                  onPress={() =>
                    setActiveModalData({
                      title: q.questionText,
                      subtitle: 'Satıcı Mülakat Sorusu',
                      type: 'purple',
                      badge: `Soru #${idx + 1}`,
                      content: `Satıcıya yöneltilmesi gereken soru:\n"${q.questionText}"`,
                      extraInfo: q.expectedAnswerHint ? `Beklenen Güvenli Cevap:\n${q.expectedAnswerHint}` : undefined,
                      secondaryInfo: q.redFlagAnswerHint ? `Şüphe Uyandıracak Cevap (Kırmızı Bayrak):\n${q.redFlagAnswerHint}` : undefined,
                      icon: 'help-circle',
                    })
                  }
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={[styles.questionTitleLight, { flex: 1 }]}>❓ {q.questionText}</Text>
                    <Ionicons name="open-outline" size={16} color="#6d28d9" style={{ marginLeft: 6 }} />
                  </View>
                  {Boolean(q.expectedAnswerHint) && (
                    <Text style={styles.expectedTextLight} numberOfLines={2}>✔ Beklenen Cevap: {q.expectedAnswerHint}</Text>
                  )}
                  {Boolean(q.redFlagAnswerHint) && (
                    <Text style={styles.redFlagTextLight} numberOfLines={2}>🚩 Şüphe Uyandıracak Cevap: {q.redFlagAnswerHint}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </CollapsibleLightSection>
          )}

          {/* 7. İŞİ CEPTE ÖNERİYOR - Uzman Servis, Usta & Ekspertiz Tavsiyeleri */}
          <IsiCepteRecommendationWidget
            vehicleBrand={report.vehicleIdentity.brand}
            title={`${report.vehicleIdentity.brand} İçin İşi Cepte Öneriyor`}
            subtitle={`${report.vehicleIdentity.brand} ${report.vehicleIdentity.model} için onaylı yetkili/özel servisler ve ekspertiz noktaları`}
          />

          {/* FEEDBACK & HELPFULNESS CARD (Alt Geri Bildirim Bölümü) */}
          <View style={styles.feedbackCardLight}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.feedbackCardTitleLight}>Rapor Faydalı Oldu mu?</Text>
              <Text style={styles.feedbackCardDescLight}>Değerlendirmeniz algoritmanın gelişmesine katkı sağlar.</Text>
            </View>

            <View style={styles.voteWidgetLight}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleVote('LIKE')}
                disabled={isVoting || !currentReportId}
                style={[
                  styles.voteBtnLight,
                  userVote === 'LIKE' && styles.voteBtnLikeActive,
                ]}
              >
                <Ionicons
                  name={userVote === 'LIKE' ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={14}
                  color={userVote === 'LIKE' ? '#059669' : '#64748b'}
                />
                <Text
                  style={[
                    styles.voteCountTextLight,
                    userVote === 'LIKE' && styles.voteCountLikeActive,
                  ]}
                >
                  {likes}
                </Text>
              </TouchableOpacity>

              <View style={styles.voteDividerLight} />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleVote('DISLIKE')}
                disabled={isVoting || !currentReportId}
                style={[
                  styles.voteBtnLight,
                  userVote === 'DISLIKE' && styles.voteBtnDislikeActive,
                ]}
              >
                <Ionicons
                  name={userVote === 'DISLIKE' ? 'thumbs-down' : 'thumbs-down-outline'}
                  size={14}
                  color={userVote === 'DISLIKE' ? '#e11d48' : '#64748b'}
                />
                <Text
                  style={[
                    styles.voteCountTextLight,
                    userVote === 'DISLIKE' && styles.voteCountDislikeActive,
                  ]}
                >
                  {dislikes}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Disclaimer Banner */}
          <View style={styles.bottomBannerLight}>
            <Ionicons name="information-circle" size={20} color="#2563eb" />
            <Text style={styles.bottomBannerText}>
              Bu rapor, seçtiğin varyanta özel hazırlanmıştır. Bilgiler düzenli olarak güncellenmektedir.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.loadingContainerLight}>
          <Text style={styles.loadingTitleLight}>Rapor Bulunamadı</Text>
        </View>
      )}

      {/* FLOATING ACTION BUBBLE (AI CHATBOT) */}
      {Boolean(report) && (
        <TouchableOpacity
          style={styles.floatingChatFab}
          activeOpacity={0.88}
          onPress={openChatModal}
        >
          <View style={styles.floatingChatIconWrap}>
            <Ionicons name="chatbubbles" size={20} color="#ffffff" />
            <View style={styles.floatingLiveDot} />
          </View>
          <View style={styles.floatingChatTextWrap}>
            <Text style={styles.floatingChatTitle}>AI Danışman</Text>
            <Text style={styles.floatingChatSub}>
              {userRights ? (userRights.isUnlimited ? 'Sınırsız' : `${userRights.remaining ?? 0} Soru`) : 'Sor'}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* AI CHATBOT SLIDE-UP MODAL DRAWER */}
      <Modal
        visible={isChatModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsChatModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.chatModalOverlay}
        >
          <Animated.View
            style={[
              styles.chatModalContainer,
              {
                transform: [{ translateY: chatPanY }],
              },
            ]}
          >
            {/* Top Drag Handle Area (Swipe Down to Dismiss) */}
            <View {...chatPanResponder.panHandlers} style={styles.chatDragHandleArea}>
              <View style={styles.modalHandleBar} />
            </View>

            {/* Header */}
            <View {...chatPanResponder.panHandlers} style={styles.chatHeaderRow}>
              <View style={styles.chatHeaderLeft}>
                <View style={styles.chatAvatarHeaderBox}>
                  <Ionicons name="chatbubbles" size={18} color="#ea580c" />
                </View>
                <View>
                  <Text style={styles.chatHeaderTitle}>TorqueScout AI Danışmanı</Text>
                  <View style={styles.chatLiveRow}>
                    <View style={styles.chatLiveDot} />
                    <Text style={styles.chatLiveText}>Çevrimiçi • Rapor Verilerine Hakim</Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {/* Rights Badge Pill */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setIsChatModalVisible(false);
                    router.push('/profile/package-rights');
                  }}
                  style={styles.chatRightsBadgePill}
                >
                  <Text style={styles.chatRightsBadgeText}>
                    ⚡ {userRights
                      ? userRights.isUnlimited
                        ? 'Sınırsız'
                        : `${userRights.remaining ?? 0} Hak`
                      : 'Kullanım'}
                  </Text>
                </TouchableOpacity>

                {/* Close Button */}
                <TouchableOpacity
                  style={styles.chatModalCloseBtn}
                  onPress={() => setIsChatModalVisible(false)}
                >
                  <Ionicons name="close" size={20} color="#0f172a" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quota Exhaustion Warning (if 0 remaining) */}
            {userRights && !userRights.isUnlimited && (userRights.remaining ?? 0) <= 0 && (
              <View style={styles.chatQuotaWarningBanner}>
                <Ionicons name="alert-circle" size={16} color="#c2410c" />
                <Text style={styles.chatQuotaWarningText}>
                  Soru hakkınız doldu. Ek hak için paketleri inceleyin.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsQuotaModalVisible(true);
                  }}
                  style={styles.chatQuotaPackageBtn}
                >
                  <Text style={styles.chatQuotaPackageBtnText}>Paketler</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Messages Area (Scrollable without overflow) */}
            <ScrollView
              ref={chatScrollRef}
              style={styles.chatMessagesScrollView}
              contentContainerStyle={styles.chatMessagesScrollContent}
              showsVerticalScrollIndicator={true}
              onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
            >
              <View style={styles.chatMessagesList}>
                {chatMessages.map((msg, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.chatBubbleRow,
                      msg.sender === 'user' ? styles.chatBubbleRowUser : styles.chatBubbleRowAi,
                    ]}
                  >
                    {msg.sender === 'ai' && (
                      <View style={styles.chatAiAvatarBox}>
                        <Text style={{ fontSize: 13 }}>🤖</Text>
                      </View>
                    )}

                    <View
                      style={[
                        styles.chatBubbleCard,
                        msg.sender === 'user' ? styles.chatBubbleCardUser : styles.chatBubbleCardAi,
                      ]}
                    >
                      {msg.sender === 'user' ? (
                        <Text style={styles.chatUserText}>{msg.text}</Text>
                      ) : (
                        renderChatAiText(msg.text)
                      )}
                    </View>

                    {msg.sender === 'user' && (
                      <View style={styles.chatUserAvatarBox}>
                        <Text style={{ fontSize: 13 }}>🧑‍💻</Text>
                      </View>
                    )}
                  </View>
                ))}

                {/* Suggestion Chips shown when conversation has just started */}
                {chatMessages.length <= 1 && (
                  <View style={[styles.chatSuggestionsGrid, { marginTop: 8, marginBottom: 6 }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 2 }}>
                      Hızlı Öneri Sorular:
                    </Text>
                    <TouchableOpacity
                      style={styles.chatSuggestionChip}
                      activeOpacity={0.8}
                      onPress={() => handleSendChat('Bu aracın kronik motor problemi var mı?')}
                    >
                      <Text style={styles.chatSuggestionText}>💡 Kronik motor problemi var mı?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.chatSuggestionChip}
                      activeOpacity={0.8}
                      onPress={() => handleSendChat('Şanzımanı uzun vadede üzer mi?')}
                    >
                      <Text style={styles.chatSuggestionText}>💡 Şanzımanı uzun vadede üzer mi?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.chatSuggestionChip}
                      activeOpacity={0.8}
                      onPress={() => handleSendChat('Ekspertizde özellikle nelere baktırmalıyım?')}
                    >
                      <Text style={styles.chatSuggestionText}>💡 Ekspertizde nelere baktırmalıyım?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.chatSuggestionChip}
                      activeOpacity={0.8}
                      onPress={() => handleSendChat('Şehir içi gerçek yakıt tüketimi nasıldır?')}
                    >
                      <Text style={styles.chatSuggestionText}>💡 Şehir içi yakıt tüketimi nasıldır?</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {sendingChat && (
                  <View style={[styles.chatBubbleRow, styles.chatBubbleRowAi]}>
                    <View style={styles.chatAiAvatarBox}>
                      <Text style={{ fontSize: 13 }}>🤖</Text>
                    </View>
                    <View style={[styles.chatBubbleCard, styles.chatBubbleCardAi, styles.chatThinkingBox]}>
                      <ActivityIndicator size="small" color="#ea580c" />
                      <Text style={styles.chatThinkingText}>Yapay zeka analiz ediyor...</Text>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Error Banner */}
            {Boolean(chatError) && (
              <View style={styles.chatErrorBox}>
                <Ionicons name="warning" size={14} color="#dc2626" />
                <Text style={styles.chatErrorText}>{chatError}</Text>
              </View>
            )}

            {/* Input Bar */}
            <View style={styles.chatInputRow}>
              <TextInput
                value={chatQuestion}
                onChangeText={setChatQuestion}
                placeholder="Bu araca dair sorunuzu yazın..."
                placeholderTextColor="#94a3b8"
                style={styles.chatTextInput}
                returnKeyType="send"
                onSubmitEditing={() => handleSendChat()}
                editable={!sendingChat}
              />
              <TouchableOpacity
                style={[
                  styles.chatSendBtn,
                  (!chatQuestion.trim() || sendingChat) && styles.chatSendBtnDisabled,
                ]}
                activeOpacity={0.8}
                disabled={!chatQuestion.trim() || sendingChat}
                onPress={() => handleSendChat()}
              >
                {sendingChat ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="send" size={16} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Centered Quota Exhaustion Modal (Alıcı Mini Banner) */}
      <QuotaExhaustionModal
        visible={isQuotaModalVisible}
        onClose={() => setIsQuotaModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  containerLight: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  lightHeaderNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  lightBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightShareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightHeaderTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  lightHeaderSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  scrollContentLight: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },

  topActionBarLight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    gap: 8,
  },
  actionBtnLight: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 9,
    gap: 5,
  },
  actionBtnTextLight: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },

  // Hero Card
  heroCardLight: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 14,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  brandLogoBoxLight: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  brandLogoImage: {
    width: 44,
    height: 44,
  },
  monogramBadgeBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monogramBadgeText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroCarNameTextLight: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  heroSubTextLight: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  specChipsBarLight: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  specChipLight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
    maxWidth: '100%',
    flexShrink: 1,
  },
  specChipTextLight: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369a1',
    flexShrink: 1,
  },
  // Hero Top Badge Row & Date
  heroTopBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  heroBadgeAndDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  reportTypeBadge: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    flexShrink: 1,
  },
  reportTypeBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563eb',
  },
  reportDateText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    flexShrink: 1,
  },

  heroFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  reportCodeText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },

  // Subtle Like / Dislike Voting Widget (Web ile Birebir)
  voteWidgetLight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 3,
    paddingVertical: 2,
    gap: 2,
  },
  voteBtnLight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  voteBtnLikeActive: {
    backgroundColor: '#dcfce7',
  },
  voteBtnDislikeActive: {
    backgroundColor: '#ffe4e6',
  },
  voteCountTextLight: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  voteCountLikeActive: {
    color: '#059669',
  },
  voteCountDislikeActive: {
    color: '#e11d48',
  },
  voteDividerLight: {
    width: 1,
    height: 12,
    backgroundColor: '#cbd5e1',
  },
  feedbackCardLight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginTop: 10,
    gap: 12,
  },
  feedbackCardTitleLight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  feedbackCardDescLight: {
    fontSize: 11,
    color: '#64748b',
  },

  // 100-Point Scores Grid
  scoresGridLight: {
    flexDirection: 'row',
    gap: 12,
  },
  // Web-Matching Score Hero Card
  scoreHeroCardLight: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  scoreHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  scoreBoxCompactLight: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
  },
  scoreBoxCompactLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  scoreBoxCompactVal: {
    fontSize: 22,
    fontWeight: '900',
  },
  scoreHeroRightCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  scoreHeroBadgeLight: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  scoreHeroBadgeTextLight: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  scoreHeroVerdictTextLight: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#334155',
  },

  // Collapsible Accordion Light Styles
  lightCardWrapper: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  lightCardHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  lightIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightCardTitleText: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  lightCardSubText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  badgePillLight: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgePillTextLight: {
    fontSize: 10,
    fontWeight: '800',
  },
  lightCardBodyContent: {
    padding: 14,
    paddingTop: 0,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 4,
  },

  // Section Body Item Styles
  characterHeadlineLight: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ea580c',
    marginTop: 8,
  },
  bodyTextLight: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 19,
  },
  dailyUseGridLight: {
    gap: 8,
    marginTop: 6,
  },
  dailyUseBoxLight: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  dailyUseTitleLight: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  dailyUseTextLight: {
    fontSize: 12,
    color: '#1e293b',
    lineHeight: 18,
  },

  reasonCardGreenLight: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 12,
    gap: 4,
    marginTop: 6,
  },
  reasonTitleGreenLight: {
    fontSize: 13,
    fontWeight: '900',
    color: '#15803d',
    flex: 1,
  },
  reasonDescGreenLight: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 18,
  },
  tapToViewMoreGreen: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16a34a',
    marginTop: 4,
  },

  reasonCardOrangeLight: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 12,
    padding: 12,
    gap: 4,
    marginTop: 6,
  },
  reasonTitleOrangeLight: {
    fontSize: 13,
    fontWeight: '900',
    color: '#c2410c',
    flex: 1,
  },
  reasonDescOrangeLight: {
    fontSize: 12,
    color: '#7c2d12',
    lineHeight: 18,
  },
  tapToViewMoreOrange: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
    marginTop: 4,
  },

  grid2ColLight: {
    gap: 10,
    marginTop: 6,
  },
  suitableCardGreenLight: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  suitableTitleGreenLight: {
    fontSize: 13,
    fontWeight: '900',
    color: '#15803d',
  },
  suitableItemHeadGreenLight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
    flex: 1,
  },
  suitableItemDescGreenLight: {
    fontSize: 12,
    color: '#14532d',
    marginTop: 2,
    lineHeight: 18,
  },

  suitableCardRedLight: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  suitableTitleRedLight: {
    fontSize: 13,
    fontWeight: '900',
    color: '#dc2626',
  },
  suitableItemHeadRedLight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#b91c1c',
    flex: 1,
  },
  suitableItemDescRedLight: {
    fontSize: 12,
    color: '#7f1d1d',
    marginTop: 2,
    lineHeight: 18,
  },

  condCardGreenLight: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 12,
    gap: 4,
    marginTop: 6,
  },
  condTitleGreenLight: {
    fontSize: 13,
    fontWeight: '900',
    color: '#15803d',
    flex: 1,
  },
  condDescGreenLight: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 18,
  },

  condCardRedLight: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    gap: 4,
    marginTop: 6,
  },
  condTitleRedLight: {
    fontSize: 13,
    fontWeight: '900',
    color: '#dc2626',
    flex: 1,
  },
  condDescRedLight: {
    fontSize: 12,
    color: '#7f1d1d',
    lineHeight: 18,
  },

  checkCardLight: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginTop: 6,
  },
  checkIconLight: {
    fontSize: 18,
  },
  checkTitleLight: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  priorityBadgeLight: {
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityBadgeTextLight: {
    fontSize: 9,
    fontWeight: '800',
    color: '#7c3aed',
  },
  checkDescLight: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  targetCompLight: {
    fontSize: 10,
    color: '#64748b',
    fontStyle: 'italic',
  },

  techGridLight: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  techCardLight: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  techLabelLight: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  techValLight: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },

  questionCardLight: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginTop: 6,
  },
  questionTitleLight: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6d28d9',
  },
  expectedTextLight: {
    fontSize: 11,
    color: '#15803d',
    fontWeight: '600',
  },
  redFlagTextLight: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '600',
  },

  bottomBannerLight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginTop: 4,
  },
  bottomBannerText: {
    fontSize: 11,
    color: '#1d4ed8',
    flex: 1,
    lineHeight: 16,
    fontWeight: '600',
  },

  // 7. Floating AI Chatbot & Modal Drawer Styles
  floatingChatFab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ea580c',
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 99,
  },
  floatingChatIconWrap: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingLiveDot: {
    position: 'absolute',
    top: -2,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    borderWidth: 1.5,
    borderColor: '#ea580c',
  },
  floatingChatTextWrap: {
    flexDirection: 'column',
  },
  floatingChatTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  floatingChatSub: {
    color: '#ffedd5',
    fontSize: 10,
    fontWeight: '700',
  },

  chatModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  chatModalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingTop: 8,
    paddingBottom: 24,
    height: '84%',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  chatDragHandleArea: {
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  chatAvatarHeaderBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHeaderTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  chatLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  chatLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
  },
  chatLiveText: {
    fontSize: 10,
    color: '#16a34a',
    fontWeight: '700',
  },
  chatRightsBadgePill: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chatRightsBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ea580c',
  },
  chatModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatQuotaWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 8,
    borderRadius: 10,
    gap: 6,
  },
  chatQuotaWarningText: {
    flex: 1,
    fontSize: 11,
    color: '#c2410c',
    fontWeight: '600',
    lineHeight: 14,
  },
  chatQuotaPackageBtn: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chatQuotaPackageBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  chatMessagesScrollView: {
    flex: 1,
  },
  chatMessagesScrollContent: {
    paddingVertical: 8,
  },
  chatEmptyState: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  chatBotIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatEmptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  chatEmptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  chatSuggestionsGrid: {
    width: '100%',
    gap: 6,
    marginTop: 8,
  },
  chatSuggestionChip: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chatSuggestionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  chatMessagesList: {
    gap: 10,
    paddingVertical: 4,
  },
  chatBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 2,
  },
  chatBubbleRowUser: {
    justifyContent: 'flex-end',
  },
  chatBubbleRowAi: {
    justifyContent: 'flex-start',
  },
  chatUserAvatarBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  chatAiAvatarBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  chatBubbleCard: {
    maxWidth: '82%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  chatBubbleCardUser: {
    backgroundColor: '#ea580c',
    borderTopRightRadius: 2,
  },
  chatBubbleCardAi: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderTopLeftRadius: 2,
  },
  chatUserText: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  chatAiText: {
    color: '#1e293b',
    fontSize: 13,
    lineHeight: 19,
  },
  chatBoldText: {
    fontWeight: '800',
    color: '#0f172a',
  },
  chatBullet: {
    color: '#ea580c',
    fontWeight: '800',
    fontSize: 14,
  },
  chatThinkingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  chatThinkingText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  chatErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 8,
    gap: 6,
  },
  chatErrorText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
  },
  chatSendBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ea580c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatSendBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },

  loadingContainerLight: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContentScroll: {
    padding: 20,
    paddingTop: 54,
    alignItems: 'center',
  },
  loadingHeaderBox: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  countdownCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fff7ed',
    borderWidth: 2,
    borderColor: '#fed7aa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  countdownNumLight: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ea580c',
  },
  loadingTitleLight: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
  },
  loadingStatusLight: {
    fontSize: 13,
    color: '#ea580c',
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  pipelineCardLight: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pipelineStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pipelineStepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  pipelineStepDotActive: {
    backgroundColor: '#ea580c',
  },
  pipelineStepDotDone: {
    backgroundColor: '#10b981',
  },
  pipelineStepDotText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  pipelineStepDotTextActive: {
    color: '#ffffff',
  },
  pipelineStepContent: {
    flex: 1,
  },
  pipelineStepTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  pipelineStepTitleActive: {
    color: '#ea580c',
  },
  pipelineStepDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 15,
  },
  skeletonCardLight: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  skeletonBar: {
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    marginBottom: 8,
  },
  skeletonGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  skeletonGridBox: {
    flexBasis: '48%',
    height: 52,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContentCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBadgePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 2,
  },
  modalBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  modalSubTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalMainTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 12,
    lineHeight: 24,
  },
  modalBodyText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 12,
  },
  modalExtraBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginVertical: 4,
  },
  modalExtraText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  modalOkBtn: {
    marginTop: 16,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOkBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  trimBoxContainerLight: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fafafa',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 8,
  },
  trimBoxHeaderLight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 6,
  },
  trimBoxHeaderTextLight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  trimNarrativeTextLight: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  trimProsConsWrapLight: {
    gap: 8,
    marginTop: 4,
  },
  trimProsCardLight: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 10,
  },
  trimProsHeaderRowLight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#dcfce7',
    paddingBottom: 4,
  },
  trimProsTitleLight: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803d',
  },
  trimConsCardLight: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 10,
  },
  trimConsHeaderRowLight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#fee2e2',
    paddingBottom: 4,
  },
  trimConsTitleLight: {
    fontSize: 11,
    fontWeight: '800',
    color: '#dc2626',
  },
  trimBulletRowLight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  trimProBulletIconLight: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '900',
    marginTop: 1,
  },
  trimConBulletIconLight: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '900',
    marginTop: 1,
  },
  trimBulletTextLight: {
    flex: 1,
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
  },
  trimEmptyTextLight: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },

  // Motorcycle Era Analysis Styles
  motoEraCardLight: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  motoEraHeaderLight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  motoEraTitleLight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0e7490',
  },
  motoEraFuelBadgeLight: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  motoEraFuelBadgeTextLight: {
    fontSize: 10,
    fontWeight: '700',
  },
  motoEraSpecsTextLight: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  motoEraChangesTextLight: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  motoEraRecBoxLight: {
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#a5f3fc',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    gap: 4,
  },
  motoEraRecTitleLight: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0891b2',
  },
  motoEraRecDescLight: {
    fontSize: 11,
    color: '#0e7490',
    lineHeight: 16,
  },
  motoSubSectionTitleLight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
    marginBottom: 2,
  },
  motoCommonIssueCardLight: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  motoIssueTitleLight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400e',
  },
  motoIssueDescLight: {
    fontSize: 11,
    color: '#78350f',
    lineHeight: 16,
  },
  motoCheckAdviceTextLight: {
    fontSize: 11,
    color: '#15803d',
    fontWeight: '700',
    borderTopWidth: 1,
    borderTopColor: '#fef3c7',
    paddingTop: 4,
    marginTop: 2,
  },
  motoEraBlockCardLight: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  motoEraBlockHeaderLight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 4,
  },
  motoEraBlockTitleLight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0e7490',
  },
  motoEraBlockYearsLight: {
    fontSize: 11,
    color: '#64748b',
  },
  motoSubIssueBoxLight: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 8,
    gap: 2,
  },
  motoSubIssueTitleLight: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  motoSubIssueDescLight: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 15,
  },
  motoSubCheckAdviceLight: {
    fontSize: 10,
    color: '#15803d',
    fontWeight: '700',
  },

  // FMEA Risk Deduction Styles (Neden Puan Kırıldı?)
  fmeaContainerLight: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    gap: 10,
  },
  fmeaHeaderRowLight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
  },
  fmeaTitleLight: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  fmeaSubtitleLight: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 15,
  },
  fmeaPenaltyBadgeLight: {
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fmeaPenaltyBadgeTextLight: {
    fontSize: 12,
    fontWeight: '900',
    color: '#b91c1c',
  },
  fmeaCardLight: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  fmeaCardHeaderLight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  fmeaDomainBadgeLight: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 2,
  },
  fmeaDomainBadgeTextLight: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1d4ed8',
    textTransform: 'uppercase',
  },
  fmeaDefectTitleLight: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  fmeaDefectPillLight: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fmeaDefectPillTextLight: {
    fontSize: 11,
    fontWeight: '900',
    color: '#b91c1c',
  },
  fmeaDefectReasonLight: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  fmeaInspectionBoxLight: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    padding: 8,
    marginTop: 2,
    gap: 2,
  },
  fmeaInspectionTitleLight: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400e',
    textTransform: 'uppercase',
  },
  fmeaInspectionTextLight: {
    fontSize: 11,
    color: '#78350f',
    lineHeight: 16,
  },

  // Legacy Schema Upgrade Banner Styles
  legacyUpgradeBannerLight: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legacyUpgradeTextLight: {
    fontSize: 11,
    color: '#92400e',
    lineHeight: 16,
    fontWeight: '600',
  },
  legacyUpgradeBtnLight: {
    backgroundColor: '#d97706',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legacyUpgradeBtnTextLight: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },

  // 8-Card Dynamic Technical Specifications Grid Styles
  specsCardLight: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  specsHeaderRowLight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
    marginBottom: 12,
  },
  specsHeaderTitleLight: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  specsGridWrapLight: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  specBoxLight: {
    width: '48.5%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    minHeight: 64,
    justifyContent: 'center',
  },
  specBoxHighlightLight: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  specLabelLight: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  specValueLight: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  specValueHighlightLight: {
    color: '#c2410c',
  },

  // Commercial Vehicle Application & Transmission Analysis Styles
  commDutyCardLight: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  commDutyTitleLight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#b45309',
  },
  commDutyRiskLight: {
    fontSize: 11,
    color: '#78350f',
    lineHeight: 16,
  },
  commDutyCheckLight: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: '#fef3c7',
    paddingTop: 4,
  },
  transBoxLight: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  transTitleLight: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  transTextLight: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
  },
  transComparisonNoteLight: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
});
