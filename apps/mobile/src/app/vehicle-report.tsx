import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

interface ConditionItem {
  title: string;
  text?: string;
}

interface SuitabilityItem {
  group: string;
  rationale?: string;
}

interface ComprehensiveReport {
  id: string;
  generatedAt?: string;
  vehicleIdentity: {
    brand: string;
    model: string;
    modelYear: number;
    engineCode?: string;
    enginePowerHp?: number;
    transmissionName?: string;
    fuelType?: string;
  };
  scoring: {
    buyabilityScore: { value: number | null };
    technicalRiskScore: { value: number | null };
  };
  performanceUsage: {
    powerHp?: number;
    torqueNm?: number;
    topSpeedKmh?: number;
    zeroToHundredSec?: number;
    combinedFuelL100km?: number;
    luggageCapacityL?: number;
    weightKg?: number;
  };
  expertDecisionSynthesis?: {
    vehicleCharacter?: {
      headline?: string;
      detailedAssessment?: string;
    };
    dailyUseAssessment?: {
      cityUse?: string;
      highwayUse?: string;
    };
    strongestReasonsToChoose?: Array<{ title: string; explanation: string }>;
    compromisesAndLimitations?: Array<{ title: string; explanation: string }>;
  };
  purchaseConditions: ConditionItem[];
  walkAwayConditions: ConditionItem[];
  suitableFor: SuitabilityItem[];
  notSuitableFor: SuitabilityItem[];
  prePurchaseChecks?: Array<{
    title: string;
    instruction: string;
    priority: string;
    targetComponent?: string;
  }>;
  sellerQuestions?: Array<{
    questionText: string;
    expectedAnswerHint?: string;
    redFlagAnswerHint?: string;
  }>;
  executiveSummary?: {
    oneSentenceSummary?: string;
    biggestRisk?: string;
  };
}

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

function getBrandLogoUrl(brandName?: string): string {
  if (!brandName) return 'https://img.icons8.com/color/96/audi.png';
  const b = brandName.trim().toLowerCase();

  const logoMap: Record<string, string> = {
    audi: 'https://img.icons8.com/color/96/audi.png',
    bmw: 'https://img.icons8.com/color/96/bmw.png',
    volkswagen: 'https://img.icons8.com/color/96/volkswagen.png',
    vw: 'https://img.icons8.com/color/96/volkswagen.png',
    'mercedes-benz': 'https://img.icons8.com/color/96/mercedes-benz.png',
    mercedes: 'https://img.icons8.com/color/96/mercedes-benz.png',
    ford: 'https://img.icons8.com/color/96/ford.png',
    fiat: 'https://img.icons8.com/color/96/fiat.png',
    renault: 'https://img.icons8.com/color/96/renault.png',
    peugeot: 'https://img.icons8.com/color/96/peugeot.png',
    toyota: 'https://img.icons8.com/color/96/toyota.png',
    honda: 'https://img.icons8.com/color/96/honda.png',
    hyundai: 'https://img.icons8.com/color/96/hyundai.png',
    kia: 'https://img.icons8.com/color/96/kia.png',
    nissan: 'https://img.icons8.com/color/96/nissan.png',
    opel: 'https://img.icons8.com/color/96/opel.png',
    seat: 'https://img.icons8.com/color/96/seat.png',
    skoda: 'https://img.icons8.com/color/96/skoda.png',
    volvo: 'https://img.icons8.com/color/96/volvo.png',
    porsche: 'https://img.icons8.com/color/96/porsche.png',
    citroen: 'https://img.icons8.com/color/96/citroen.png',
    'alfa romeo': 'https://img.icons8.com/color/96/alfa-romeo.png',
    mini: 'https://img.icons8.com/color/96/mini.png',
    jeep: 'https://img.icons8.com/color/96/jeep.png',
    cupra: 'https://img.icons8.com/color/96/car.png',
    chery: 'https://img.icons8.com/color/96/car.png',
    tesla: 'https://img.icons8.com/color/96/tesla.png',
    'land rover': 'https://img.icons8.com/color/96/land-rover.png',
  };

  return logoMap[b] || `https://img.icons8.com/color/96/${b}.png`;
}

function BrandLogoContainer({ brandName }: { brandName?: string }) {
  const [hasError, setHasError] = useState(false);
  const logoUrl = getBrandLogoUrl(brandName);

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
        <Ionicons name="car-sport" size={28} color="#0f172a" />
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

function parseConditionItems(rawList: any): ConditionItem[] {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .map((item: any) => {
      if (typeof item === 'string') {
        return { title: item };
      }
      if (typeof item === 'object' && item !== null) {
        const title = item.title || item.conditionText || item.condition || item.text || item.heading || item.name || '';
        const text = item.conditionText && item.title && item.conditionText !== item.title ? item.conditionText : item.description || item.detail;
        return { title: title || String(item), text: text !== title ? text : undefined };
      }
      return { title: String(item) };
    })
    .filter((x) => Boolean(x.title));
}

function parseSuitabilityItems(rawList: any): SuitabilityItem[] {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .map((item: any) => {
      if (typeof item === 'string') {
        return { group: item };
      }
      if (typeof item === 'object' && item !== null) {
        const group =
          item.profile ||
          item.targetUserGroup ||
          item.group ||
          item.title ||
          item.name ||
          item.userGroup ||
          '';
        const rationale =
          item.explanation ||
          item.rationale ||
          item.description ||
          item.detail ||
          '';
        return { group, rationale };
      }
      return { group: String(item) };
    })
    .filter((x) => Boolean(x.group) && x.group !== '[object Object]');
}

function normalizeReport(data: any): ComprehensiveReport {
  const rep = data?.reportData || data?.report || data || {};
  const identity = rep.vehicleIdentity || {};
  const scoring = rep.scoring || {
    buyabilityScore: { value: 73 },
    technicalRiskScore: { value: 30 },
  };
  const perf = rep.performanceUsage || {};
  const synthesis = rep.expertDecisionSynthesis || {};
  const verdict = rep.finalVerdict || {};

  const purchaseConditions = parseConditionItems(
    synthesis.purchaseConditions?.length ? synthesis.purchaseConditions : verdict.proceedIf
  );

  const walkAwayConditions = parseConditionItems(
    synthesis.walkAwayConditions?.length ? synthesis.walkAwayConditions : verdict.walkAwayIf
  );

  const suitableFor = parseSuitabilityItems(synthesis.suitableFor);
  const notSuitableFor = parseSuitabilityItems(synthesis.notSuitableFor);

  return {
    id: rep.id || data?.id || `rep_${Date.now()}`,
    generatedAt: rep.generatedAt || data?.generatedAt || new Date().toISOString(),
    vehicleIdentity: {
      brand: identity.brand || 'Araç',
      model: identity.model || '',
      modelYear: identity.modelYear || 2020,
      engineCode: identity.engineCode,
      enginePowerHp: identity.enginePowerHp || perf.powerHp,
      transmissionName: identity.transmissionName || 'Otomatik',
      fuelType: identity.fuelType || 'Benzin',
    },
    scoring: {
      buyabilityScore: {
        value: scoring.buyabilityScore?.value ?? 73,
      },
      technicalRiskScore: {
        value: scoring.technicalRiskScore?.value ?? 30,
      },
    },
    performanceUsage: {
      powerHp: perf.powerHp || identity.enginePowerHp,
      torqueNm: perf.torqueNm,
      topSpeedKmh: perf.topSpeedKmh,
      zeroToHundredSec: perf.zeroToHundredSec || perf.zeroToHundredKmh,
      combinedFuelL100km: perf.combinedFuelL100km,
      luggageCapacityL: perf.luggageCapacityL || perf.trunkCapacityLiters,
      weightKg: perf.weightKg || perf.curbWeightKg,
    },
    expertDecisionSynthesis: rep.expertDecisionSynthesis || {
      vehicleCharacter: {
        headline: rep.executiveSummary?.oneSentenceSummary || `${identity.modelYear || ''} ${identity.brand || ''} ${identity.model || ''} Derin Otomotiv Analizi`.trim(),
        detailedAssessment: rep.executiveSummary?.biggestRisk || 'Bu araç için yapay zeka tarafından taranmış tüm teknik veriler ve piyasa deneyimleri derlenmiştir.',
      },
    },
    purchaseConditions,
    walkAwayConditions,
    suitableFor,
    notSuitableFor,
    prePurchaseChecks: Array.isArray(rep.prePurchaseChecks) ? rep.prePurchaseChecks : [],
    sellerQuestions: Array.isArray(rep.sellerQuestions) ? rep.sellerQuestions : [],
    executiveSummary: rep.executiveSummary,
  };
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
  defaultOpen = true,
  children,
}: CollapsibleLightProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

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

export default function VehicleReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawVariantId = params.variantId ? String(params.variantId) : null;

  const [activeVariantId, setActiveVariantId] = useState<string | null>(rawVariantId);
  const [report, setReport] = useState<ComprehensiveReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [activeModalData, setActiveModalData] = useState<ModalDetailData | null>(null);

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
  }, [rawVariantId]);

  const resolveVariantIdFromParams = async (): Promise<string | null> => {
    try {
      const queryCandidates = [
        {
          brand: params.brand,
          modelFamily: params.model,
          year: params.year,
          bodyType: params.bodyType,
          engine: params.engine,
          fuelType: params.fuel,
          transmission: params.transmission,
          trim: params.trim,
        },
        {
          brand: params.brand,
          modelFamily: params.model,
          year: params.year,
          bodyType: params.bodyType,
          engine: params.engine,
          fuelType: params.fuel,
          transmission: params.transmission,
        },
        {
          brand: params.brand,
          modelFamily: params.model,
          year: params.year,
          engine: params.engine,
        },
        {
          brand: params.brand,
          modelFamily: params.model,
          year: params.year,
        },
        {
          brand: params.brand,
          modelFamily: params.model,
        },
      ];

      for (const candidate of queryCandidates) {
        if (!candidate.brand || !candidate.modelFamily) continue;

        const query = new URLSearchParams();
        Object.entries(candidate).forEach(([key, val]) => {
          if (val) query.append(key, String(val));
        });

        const res = await fetch(`${API_URL}/vehicle-filters/match-variant?${query.toString()}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.variantId) {
            return json.variantId;
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
      let finalVariantId = targetVariantId;
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
        ...(token ? { Authorization: `Bearer ${token}` } : { 'x-guest-token': 'guest_mobile' }),
      };

      if (!force) {
        const cacheRes = await fetch(`${API_URL}/vehicle-reports/by-variant/${finalVariantId}/current`, { headers });
        if (cacheRes.ok) {
          const cacheData = await cacheRes.json();
          const isCompleted = cacheData && cacheData.status === 'COMPLETED';
          const isNotFallback =
            cacheData?.provider !== 'DETERMINISTIC_FALLBACK' &&
            cacheData?.reportData?.status !== 'SAFE_FALLBACK' &&
            cacheData?.status !== 'SAFE_FALLBACK';

          if (isCompleted && isNotFallback && cacheData.reportData) {
            setReport(normalizeReport(cacheData));
            setLoading(false);
            return;
          }
        }
      }

      const idempotencyKey = `vr_${finalVariantId}_${Date.now()}`;
      const res = await fetch(`${API_URL}/vehicle-reports`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode: 'TORQUE_SCOUT_VEHICLE_REPORT',
          variantId: finalVariantId,
          entryPoint: 'VEHICLE_SEARCH',
          idempotencyKey,
          forceRefresh: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reportId = data.reportId || data.id;

        if (reportId) {
          const detailRes = await fetch(`${API_URL}/vehicle-reports/${reportId}`, { headers });
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            setReport(normalizeReport(detailData));
            setLoading(false);
            return;
          }
        }

        if (data && (data.reportData || data.expertDecisionSynthesis || data.vehicleIdentity)) {
          setReport(normalizeReport(data));
          setLoading(false);
          return;
        }
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

  if (countdown !== null) {
    return (
      <View style={styles.loadingContainerLight}>
        <View style={styles.countdownBoxLight}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.countdownNumLight}>{countdown}</Text>
        </View>
        <Text style={styles.loadingTitleLight}>Analiz Hazırlanıyor...</Text>
        <Text style={styles.loadingStatusLight}>{statusMessages[statusIndex]}</Text>
        <Text style={styles.loadingDescLight}>
          Bu araç varyantı platformda ilk defa analiz ediliyor. Web taraması, kronik hata arşivleri ve geri çağırma listeleri taranıyor.
        </Text>
      </View>
    );
  }

  if (loading && !report) {
    return (
      <View style={styles.loadingContainerLight}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={[styles.loadingTitleLight, { marginTop: 12 }]}>Rapor Yükleniyor...</Text>
      </View>
    );
  }

  const synthesis = report?.expertDecisionSynthesis;
  const hpValue = report?.performanceUsage?.powerHp || report?.vehicleIdentity?.enginePowerHp;
  const torqueValue = report?.performanceUsage?.torqueNm;
  const topSpeedValue = report?.performanceUsage?.topSpeedKmh;
  const zeroToHundredValue = report?.performanceUsage?.zeroToHundredSec;
  const combinedFuel = report?.performanceUsage?.combinedFuelL100km;
  const trunkValue = report?.performanceUsage?.luggageCapacityL;
  const weightValue = report?.performanceUsage?.weightKg;

  const rawBuyability = report?.scoring?.buyabilityScore?.value ?? 73;
  const rawRisk = report?.scoring?.technicalRiskScore?.value ?? 30;

  const reportCode = `TS-${report?.vehicleIdentity?.modelYear || '2020'}-${String(report?.vehicleIdentity?.brand || 'CAR').substring(0, 2).toUpperCase()}-${report?.vehicleIdentity?.engineCode || '320i'}`;

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
        <ScrollView contentContainerStyle={styles.scrollContentLight} showsVerticalScrollIndicator={false}>
          {/* Action Bar */}
          <View style={styles.topActionBarLight}>
            <TouchableOpacity style={styles.actionBtnLight} onPress={toggleFavorite}>
              <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={18} color={isFavorited ? '#ef4444' : '#64748b'} />
              <Text style={styles.actionBtnTextLight}>{isFavorited ? 'Favorilerde' : 'Favorilere Ekle'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtnLight} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={18} color="#64748b" />
              <Text style={styles.actionBtnTextLight}>Paylaş</Text>
            </TouchableOpacity>
          </View>

          {/* 1. TOP HERO VEHICLE IDENTITY CARD WITH BRAND LOGO */}
          <View style={styles.heroCardLight}>
            <View style={styles.heroTopRow}>
              {/* Brand Logo Container */}
              <BrandLogoContainer brandName={report.vehicleIdentity.brand} />

              {/* Title & Subtitle */}
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.heroCarNameTextLight} numberOfLines={1}>
                  {report.vehicleIdentity.modelYear} {report.vehicleIdentity.brand} {report.vehicleIdentity.model}
                </Text>

                <Text style={styles.heroSubTextLight} numberOfLines={1}>
                  {report.vehicleIdentity.engineCode || ''} {params.trim ? `• ${params.trim}` : ''} {report.vehicleIdentity.transmissionName ? `• ${report.vehicleIdentity.transmissionName}` : ''}
                </Text>
              </View>
            </View>

            {/* Spacious Metric Chips Bar */}
            <View style={styles.specChipsBarLight}>
              <View style={styles.specChipLight}>
                <Ionicons name="calendar-outline" size={13} color="#0284c7" />
                <Text style={styles.specChipTextLight}>{report.vehicleIdentity.modelYear}</Text>
              </View>

              <View style={styles.specChipLight}>
                <Ionicons name="funnel-outline" size={13} color="#0284c7" />
                <Text style={styles.specChipTextLight}>{formatFuelTypeTr(report.vehicleIdentity.fuelType)}</Text>
              </View>

              <View style={styles.specChipLight}>
                <Ionicons name="options-outline" size={13} color="#0284c7" />
                <Text style={styles.specChipTextLight}>{report.vehicleIdentity.transmissionName || 'Otomatik'}</Text>
              </View>

              <View style={styles.specChipLight}>
                <Ionicons name="car-outline" size={13} color="#0284c7" />
                <Text style={styles.specChipTextLight}>{params.bodyType ? String(params.bodyType) : 'Sedan'}</Text>
              </View>

              {Boolean(hpValue) && (
                <View style={[styles.specChipLight, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
                  <Ionicons name="flash-outline" size={13} color="#ea580c" />
                  <Text style={[styles.specChipTextLight, { color: '#c2410c' }]}>{hpValue} HP</Text>
                </View>
              )}
            </View>

            {/* Footer Row */}
            <View style={styles.heroFooterRow}>
              <Text style={styles.reportCodeText}>Rapor ID: {reportCode}</Text>
              <TouchableOpacity onPress={() => Alert.alert('Kopyalandı', 'Rapor ID kopyalandı.')}>
                <Ionicons name="copy-outline" size={14} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. PROMINENT 100-POINT SCORE INDICATORS (LIGHT THEME) */}
          <View style={styles.scoresGridLight}>
            {/* Satın Alınabilirlik Skoru */}
            <View style={[styles.scoreCardLight, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
              <View style={styles.scoreHeaderLightRow}>
                <Text style={[styles.scoreTitleLight, { color: '#15803d' }]}>Satın Alınabilirlik Skoru</Text>
                <Ionicons name="shield-checkmark" size={20} color="#22c55e" />
              </View>
              <Text style={[styles.scoreBigValLight, { color: '#16a34a' }]}>{rawBuyability} / 100</Text>
              <Text style={[styles.scoreSubLight, { color: '#166534' }]}>Genel Değerlendirme & Satın Alma Uygunluğu</Text>
            </View>

            {/* Teknik Risk Skoru */}
            <View style={[styles.scoreCardLight, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
              <View style={styles.scoreHeaderLightRow}>
                <Text style={[styles.scoreTitleLight, { color: '#c2410c' }]}>Teknik Risk Skoru</Text>
                <Ionicons name="warning" size={20} color="#f97316" />
              </View>
              <Text style={[styles.scoreBigValLight, { color: '#ea580c' }]}>{rawRisk} / 100</Text>
              <Text style={[styles.scoreSubLight, { color: '#9a3412' }]}>
                {rawRisk > 60 ? '⚠️ Yüksek Risk Seviyesi' : 'Dengeli Risk Seviyesi'}
              </Text>
            </View>
          </View>

          {/* 3. TORQUE SCOUT EXPERT DECISION SYNTHESIS SECTIONS IN LIGHT COLLAPSIBLE CARDS */}

          {/* 3.1 BU ARAÇ NASIL BİR OTOMOBİL? */}
          {synthesis?.vehicleCharacter && (
            <CollapsibleLightSection
              title="Bu Araç Nasıl Bir Otomobil?"
              subtitle="Araç Karakteri ve Değerlendirme"
              iconName="car-sport-outline"
              iconColor="#ea580c"
              iconBgColor="#fff7ed"
              borderColor="#fed7aa"
              titleColor="#c2410c"
              defaultOpen={true}
            >
              {Boolean(synthesis.vehicleCharacter.headline) && (
                <Text style={styles.characterHeadlineLight}>{synthesis.vehicleCharacter.headline}</Text>
              )}
              {Boolean(synthesis.vehicleCharacter.detailedAssessment) && (
                <Text style={styles.bodyTextLight}>{synthesis.vehicleCharacter.detailedAssessment}</Text>
              )}

              {/* Daily Use Grid */}
              {synthesis.dailyUseAssessment && (
                <View style={styles.dailyUseGridLight}>
                  {Boolean(synthesis.dailyUseAssessment.cityUse) && (
                    <View style={styles.dailyUseBoxLight}>
                      <Text style={styles.dailyUseTitleLight}>Şehir İçi Kullanım</Text>
                      <Text style={styles.dailyUseTextLight}>{synthesis.dailyUseAssessment.cityUse}</Text>
                    </View>
                  )}
                  {Boolean(synthesis.dailyUseAssessment.highwayUse) && (
                    <View style={styles.dailyUseBoxLight}>
                      <Text style={styles.dailyUseTitleLight}>Otoyol ve Seyir</Text>
                      <Text style={styles.dailyUseTextLight}>{synthesis.dailyUseAssessment.highwayUse}</Text>
                    </View>
                  )}
                </View>
              )}
            </CollapsibleLightSection>
          )}

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
                defaultOpen={true}
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
                        content: item.explanation,
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

          {/* 3.3 GÖZ ÖNÜNDE BULUNDURULACAK TAVİZLER VE SINIRLAMALAR */}
          {Boolean(synthesis?.compromisesAndLimitations && synthesis.compromisesAndLimitations.length > 0) && (() => {
            const compromises = synthesis?.compromisesAndLimitations || [];
            return (
              <CollapsibleLightSection
                title="Göz Önünde Bulundurulacak Tavizler ve Sınırlamalar"
                badgeText={`${compromises.length} Sınırlama`}
                iconName="alert-circle-outline"
                iconColor="#f97316"
                iconBgColor="#fff7ed"
                borderColor="#fed7aa"
                titleColor="#c2410c"
                defaultOpen={true}
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
                        content: item.explanation,
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
          {Boolean(report.suitableFor?.length || report.notSuitableFor?.length) && (
            <CollapsibleLightSection
              title="Kullanıcı Profil Uygunluk Analizi"
              badgeText="Uygunluk Rehberi"
              iconName="people-outline"
              iconColor="#2563eb"
              iconBgColor="#eff6ff"
              borderColor="#bfdbfe"
              titleColor="#1d4ed8"
              defaultOpen={true}
            >
              <View style={styles.grid2ColLight}>
                {Boolean(report.suitableFor && report.suitableFor.length > 0) && (
                  <View style={styles.suitableCardGreenLight}>
                    <Text style={styles.suitableTitleGreenLight}>👤 Kimler İçin İdeal?</Text>
                    {report.suitableFor.map((item, idx) => (
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

                {Boolean(report.notSuitableFor && report.notSuitableFor.length > 0) && (
                  <View style={styles.suitableCardRedLight}>
                    <Text style={styles.suitableTitleRedLight}>🚫 Kimler İçin Uygun Değil?</Text>
                    {report.notSuitableFor.map((item, idx) => (
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

          {/* 3.5 SATIN ALMA ONAY ŞARTLARI */}
          {Boolean(report.purchaseConditions && report.purchaseConditions.length > 0) && (
            <CollapsibleLightSection
              title="Satın Alma Onay Şartları (Devam Et)"
              badgeText={`${report.purchaseConditions.length} Kritik Onay`}
              iconName="shield-checkmark-outline"
              iconColor="#16a34a"
              iconBgColor="#f0fdf4"
              borderColor="#bbf7d0"
              titleColor="#15803d"
              defaultOpen={true}
            >
              {report.purchaseConditions.map((cond, idx) => (
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

          {/* 3.6 ALIMDAN VAZGEÇME ŞARTLARI */}
          {Boolean(report.walkAwayConditions && report.walkAwayConditions.length > 0) && (
            <CollapsibleLightSection
              title="Alımdan Vazgeçme Şartları (Uzak Dur)"
              badgeText={`${report.walkAwayConditions.length} Kırmızı Çizgi`}
              iconName="warning-outline"
              iconColor="#dc2626"
              iconBgColor="#fef2f2"
              borderColor="#fecaca"
              titleColor="#b91c1c"
              defaultOpen={true}
            >
              {report.walkAwayConditions.map((cond, idx) => (
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

          {/* 4. SATIN ALMA ÖNCESİ EKSPERTİZ KONTROL LİSTESİ */}
          {Boolean(report.prePurchaseChecks && report.prePurchaseChecks.length > 0) && (
            <CollapsibleLightSection
              title="Satın Alma Öncesi Ekspertiz Kontrol Listesi"
              badgeText={`${report.prePurchaseChecks!.length} Adım`}
              iconName="clipboard-outline"
              iconColor="#7c3aed"
              iconBgColor="#f5f3ff"
              borderColor="#ddd6fe"
              titleColor="#6d28d9"
              defaultOpen={true}
            >
              {report.prePurchaseChecks!.map((chk, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  style={styles.checkCardLight}
                  onPress={() =>
                    setActiveModalData({
                      title: chk.title,
                      subtitle: 'Ekspertiz Kontrol Adımı',
                      type: 'purple',
                      badge: `${chk.priority} ÖNCELİK`,
                      content: chk.instruction,
                      extraInfo: chk.targetComponent ? `Hedef Parça/Bölge: ${chk.targetComponent}` : undefined,
                      icon: 'clipboard',
                    })
                  }
                >
                  <Text style={styles.checkIconLight}>🔍</Text>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.checkTitleLight}>{chk.title}</Text>
                      <View style={styles.priorityBadgeLight}>
                        <Text style={styles.priorityBadgeTextLight}>{chk.priority} ÖNCELİK</Text>
                      </View>
                    </View>
                    <Text style={styles.checkDescLight} numberOfLines={2}>{chk.instruction}</Text>
                    {Boolean(chk.targetComponent) && (
                      <Text style={styles.targetCompLight}>Hedef Parça: {chk.targetComponent}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </CollapsibleLightSection>
          )}

          {/* 5. TEKNİK ÖZELLİKLER */}
          <CollapsibleLightSection
            title="Teknik Özellikler"
            badgeText="Fabrika Verileri"
            iconName="list-outline"
            iconColor="#0284c7"
            iconBgColor="#f0f9ff"
            borderColor="#bae6fd"
            titleColor="#0369a1"
            defaultOpen={true}
          >
            <View style={styles.techGridLight}>
              <View style={[styles.techCardLight, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
                <Text style={styles.techLabelLight}>Motor Gücü</Text>
                <Text style={[styles.techValLight, { color: '#ea580c' }]}>{hpValue ? `${hpValue} HP` : '—'}</Text>
              </View>

              <View style={styles.techCardLight}>
                <Text style={styles.techLabelLight}>Maksimum Hız</Text>
                <Text style={styles.techValLight}>{topSpeedValue ? `${topSpeedValue} km/h` : '—'}</Text>
              </View>

              <View style={styles.techCardLight}>
                <Text style={styles.techLabelLight}>0-100 Hızlanma</Text>
                <Text style={styles.techValLight}>{zeroToHundredValue ? `${zeroToHundredValue} sn` : '—'}</Text>
              </View>

              <View style={styles.techCardLight}>
                <Text style={styles.techLabelLight}>Ort. Tüketim</Text>
                <Text style={styles.techValLight}>{combinedFuel ? `${combinedFuel} lt/100km` : '—'}</Text>
              </View>

              <View style={styles.techCardLight}>
                <Text style={styles.techLabelLight}>Bagaj Hacmi</Text>
                <Text style={styles.techValLight}>{trunkValue ? `${trunkValue} lt` : '—'}</Text>
              </View>

              <View style={styles.techCardLight}>
                <Text style={styles.techLabelLight}>Ağırlık</Text>
                <Text style={styles.techValLight}>{weightValue ? `${weightValue} kg` : '—'}</Text>
              </View>
            </View>
          </CollapsibleLightSection>

          {/* 6. SATICIYA SORULACAK KRİTİK SORULAR */}
          {Boolean(report.sellerQuestions && report.sellerQuestions.length > 0) && (
            <CollapsibleLightSection
              title="Satıcıya Sorulacak Kritik Sorular"
              badgeText={`${report.sellerQuestions!.length} Soru`}
              iconName="help-circle-outline"
              iconColor="#6d28d9"
              iconBgColor="#f5f3ff"
              borderColor="#ddd6fe"
              titleColor="#6d28d9"
              defaultOpen={true}
            >
              {report.sellerQuestions!.map((q, idx) => (
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
                    <Text style={styles.expectedTextLight} numberOfLines={1}>✔ Beklenen: {q.expectedAnswerHint}</Text>
                  )}
                  {Boolean(q.redFlagAnswerHint) && (
                    <Text style={styles.redFlagTextLight} numberOfLines={1}>🚩 Şüphe: {q.redFlagAnswerHint}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </CollapsibleLightSection>
          )}

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
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  actionBtnLight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  actionBtnTextLight: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
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
  },
  specChipTextLight: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369a1',
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

  // 100-Point Scores Grid
  scoresGridLight: {
    flexDirection: 'row',
    gap: 12,
  },
  scoreCardLight: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 4,
    justifyContent: 'space-between',
  },
  scoreHeaderLightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreTitleLight: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  scoreBigValLight: {
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 4,
  },
  scoreSubLight: {
    fontSize: 10,
    fontWeight: '700',
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

  loadingContainerLight: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  countdownBoxLight: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  countdownNumLight: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ea580c',
    position: 'absolute',
  },
  loadingTitleLight: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  loadingStatusLight: {
    fontSize: 13,
    color: '#ea580c',
    fontWeight: '700',
    marginTop: 6,
  },
  loadingDescLight: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
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
});
