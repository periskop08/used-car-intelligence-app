import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCanonicalBrandLogoUrl, getBrandMonogram } from '@used-car-intelligence/shared';
import { getBrandLogoUrl as resolveBrandLogo } from '../constants/brandLogos';
import { CLOUDFLARE_VEHICLE_IMAGES } from '../constants/vehicleImages';
import TorkScoutLoader from '../components/TorkScoutLoader';

const BrandLogo = ({ brandName, size = 36 }: { brandName?: string; size?: number }) => {
  const [imgError, setImgError] = useState(false);
  useEffect(() => {
    setImgError(false);
  }, [brandName]);
  const logoSrc = resolveBrandLogo(brandName) || getCanonicalBrandLogoUrl(brandName);

  if (logoSrc && !imgError) {
    const source = typeof logoSrc === 'number' ? logoSrc : { uri: String(logoSrc) };
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          backgroundColor: '#f8fafc',
          borderWidth: 1,
          borderColor: '#e2e8f0',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 2,
          overflow: 'hidden',
        }}
      >
        <Image
          source={source}
          style={{ width: size - 4, height: size - 4 }}
          resizeMode="contain"
          onError={() => setImgError(true)}
        />
      </View>
    );
  }
  return null;
};

const API_URL = 'https://used-car-api-hzmu.onrender.com';
const { width } = Dimensions.get('window');

const formatCloudflareImageUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  if (url.startsWith('/')) {
    return `${API_URL}${url}`;
  }

  if (url.includes('r2.dev') || url.includes('cloudflarestorage.com')) {
    let storageKey = '';
    if (url.includes('.r2.dev/')) {
      const parts = url.split('.r2.dev/');
      if (parts.length > 1) storageKey = parts[1];
    } else {
      const parts = url.split('cloudflarestorage.com/');
      if (parts.length > 1) {
        const path = parts[1].replace(/^\//, '');
        const pathParts = path.split('/');
        if (pathParts[0] === 'torquescout-listings') {
          storageKey = pathParts.slice(1).join('/');
        } else {
          storageKey = path;
        }
      }
    }

    if (storageKey) {
      if (storageKey.startsWith('guide-cards/')) {
        return `${API_URL}/vehicle-guide/media-proxy/${storageKey}`;
      }
      return `${API_URL}/listings/media-proxy/${storageKey}`;
    }
  }

  return url;
};

const resolveGuideCardImageUrl = (card?: {
  heroImageUrl?: string | null;
  brand?: string | null;
  model?: string | null;
  generationName?: string | null;
} | null): string => {
  if (!card) return '';
  if (
    card.heroImageUrl &&
    !card.heroImageUrl.includes('photo-1542282088-72c9c27ed0cd') &&
    !card.heroImageUrl.includes('unsplash.com')
  ) {
    return formatCloudflareImageUrl(card.heroImageUrl);
  }

  const b = (card.brand || '').trim().toLowerCase();
  const m = (card.model || '').trim().toLowerCase();
  const g = (card.generationName || '').trim().toLowerCase();
  const cleanM = m.replace(/ailesi|serisi/gi, '').trim();

  if (g && CLOUDFLARE_VEHICLE_IMAGES[`${b} ${m} ${g}`]) {
    return formatCloudflareImageUrl(CLOUDFLARE_VEHICLE_IMAGES[`${b} ${m} ${g}`]);
  }
  if (CLOUDFLARE_VEHICLE_IMAGES[`${b} ${m}`]) {
    return formatCloudflareImageUrl(CLOUDFLARE_VEHICLE_IMAGES[`${b} ${m}`]);
  }
  if (cleanM && CLOUDFLARE_VEHICLE_IMAGES[`${b} ${cleanM}`]) {
    return formatCloudflareImageUrl(CLOUDFLARE_VEHICLE_IMAGES[`${b} ${cleanM}`]);
  }
  if (CLOUDFLARE_VEHICLE_IMAGES[m]) {
    return formatCloudflareImageUrl(CLOUDFLARE_VEHICLE_IMAGES[m]);
  }
  if (cleanM && CLOUDFLARE_VEHICLE_IMAGES[cleanM]) {
    return formatCloudflareImageUrl(CLOUDFLARE_VEHICLE_IMAGES[cleanM]);
  }
  if (b && CLOUDFLARE_VEHICLE_IMAGES[b]) {
    return formatCloudflareImageUrl(CLOUDFLARE_VEHICLE_IMAGES[b]);
  }

  return formatCloudflareImageUrl(card.heroImageUrl);
};

const translateBodyType = (bodyType?: string | null) => {
  if (!bodyType) return '';
  const mapping: Record<string, string> = {
    SEDAN: 'Sedan',
    HATCHBACK: 'Hatchback',
    SUV: 'SUV',
    COUPE: 'Coupe',
    STATION_WAGON: 'Station Wagon',
    WAGON: 'Station Wagon',
    CONVERTIBLE: 'Cabrio',
    MINIVAN: 'Minivan',
    VAN: 'Minivan / Panelvan',
    PICKUP: 'Pickup',
  };
  return mapping[bodyType.toUpperCase()] || bodyType;
};

interface Fact {
  id: string;
  factType: 'INTERESTING_FACT' | 'KNOWN_ISSUE' | 'BUYING_TIP' | 'USER_EXPERIENCE';
  title: string;
  description: string;
  iconKey: string | null;
}

interface GuideCard {
  id: string;
  brand: string;
  model: string;
  generationName: string | null;
  bodyType: string;
  yearStart: number;
  yearEnd: number | null;
  heroImageUrl: string;
  shortSummary: string;
  facts: Fact[];
}

export default function VehicleGuideScreen() {
  const [card, setCard] = useState<GuideCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [imageUri, setImageUri] = useState<string>('');
  const cardQueueRef = React.useRef<GuideCard[]>([]);
  const isFetchingBufferRef = React.useRef(false);
  const scrollViewRef = React.useRef<ScrollView>(null);

  // User Comments (Collapsible Accordion) State
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsData, setCommentsData] = useState<{
    comments: any[];
    approvedCount: number;
    ratingSummary: any;
  }>({
    comments: [],
    approvedCount: 0,
    ratingSummary: null,
  });
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [usageMonths, setUsageMonths] = useState('12');
  const [isOwner, setIsOwner] = useState(true);
  const [recommends, setRecommends] = useState(true);
  const [reliabilityRating, setReliabilityRating] = useState(5);
  const [fuelRating, setFuelRating] = useState(4);
  const [comfortRating, setComfortRating] = useState(5);
  const [partsRating, setPartsRating] = useState(4);
  const [maintenanceRating, setMaintenanceRating] = useState(4);
  const [resaleRating, setResaleRating] = useState(4);
  const [overallRating, setOverallRating] = useState(5);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentFeedback, setCommentFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCardComments = async (guideCardId: string) => {
    if (!guideCardId) return;
    setCommentsLoading(true);
    try {
      const res = await fetch(`${API_URL}/vehicle-guide/cards/${guideCardId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setCommentsData({
          comments: Array.isArray(data?.comments) ? data.comments : [],
          approvedCount: Number(data?.approvedCount || 0),
          ratingSummary: data?.ratingSummary || null,
        });
      }
    } catch (e) {
      console.error('Failed to load guide comments:', e);
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    if (card?.id) {
      setCommentsExpanded(false);
      setShowCommentForm(false);
      setCommentFeedback(null);
      fetchCardComments(card.id);
    }
  }, [card?.id]);

  const handleSubmitComment = async () => {
    if (!card?.id) return;
    setCommentFeedback(null);

    const token = (await AsyncStorage.getItem('accessToken')) || (await AsyncStorage.getItem('token'));
    if (!token) {
      setCommentFeedback({ type: 'error', text: 'Yorum yazabilmek için lütfen hesabınıza giriş yapın.' });
      return;
    }

    const trimmed = commentText.trim();
    if (trimmed.length < 20) {
      setCommentFeedback({ type: 'error', text: 'Yorumunuz en az 20 karakter olmalıdır.' });
      return;
    }
    if (trimmed.length > 1000) {
      setCommentFeedback({ type: 'error', text: 'Yorumunuz en fazla 1000 karakter olabilir.' });
      return;
    }

    const parsedMonths = parseInt(usageMonths, 10);
    if (isNaN(parsedMonths) || parsedMonths < 0) {
      setCommentFeedback({ type: 'error', text: 'Lütfen geçerli bir kullanım süresi (ay) girin.' });
      return;
    }

    setSubmittingComment(true);
    try {
      const res = await fetch(`${API_URL}/vehicle-guide/cards/${card.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          comment: trimmed,
          usageMonths: parsedMonths,
          isOwner,
          recommends,
          reliabilityRating,
          fuelRating,
          comfortRating,
          partsRating,
          maintenanceRating,
          resaleRating,
          overallRating,
        }),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData?.message || 'Yorum gönderilemedi.');
      }

      setCommentFeedback({
        type: 'success',
        text: resData?.message || 'Yorumunuz alındı ve yayınlanmadan önce incelenecektir.',
      });
      setCommentText('');
      setShowCommentForm(false);
      fetchCardComments(card.id);
    } catch (err: any) {
      setCommentFeedback({ type: 'error', text: err?.message || 'Yorum gönderilirken bir hata oluştu.' });
    } finally {
      setSubmittingComment(false);
    }
  };

  const renderStarRatingRow = (label: string, val: number, onSelect: (v: number) => void) => (
    <View style={styles.starRowItem} key={label}>
      <Text style={styles.starRowLabel}>{label}</Text>
      <View style={styles.starIconsWrap}>
        {[1, 2, 3, 4, 5].map((s) => (
          <TouchableOpacity key={s} onPress={() => onSelect(s)} style={styles.starTouchBtn} activeOpacity={0.7}>
            <Ionicons name={s <= val ? 'star' : 'star-outline'} size={18} color={s <= val ? '#f59e0b' : '#cbd5e1'} />
          </TouchableOpacity>
        ))}
        <Text style={styles.starValueBadge}>{val} ⭐</Text>
      </View>
    </View>
  );

  useEffect(() => {
    initGuideCards();
  }, []);

  const prefetchSingleCard = async (): Promise<GuideCard | null> => {
    try {
      const res = await fetch(`${API_URL}/vehicle-guide/cards/random?locale=tr`);
      if (res.ok) {
        const data: GuideCard = await res.json();
        const proxiedUrl = resolveGuideCardImageUrl(data);
        if (proxiedUrl) {
          ExpoImage.prefetch(proxiedUrl).catch(() => {});
        }
        return data;
      }
    } catch (e) {
      console.error('Prefetch error:', e);
    }
    return null;
  };

  const refillBuffer = async () => {
    if (isFetchingBufferRef.current || cardQueueRef.current.length >= 3) return;
    isFetchingBufferRef.current = true;
    try {
      const needed = 3 - cardQueueRef.current.length;
      const promises = Array.from({ length: needed }).map(() => prefetchSingleCard());
      const results = await Promise.all(promises);
      const validCards = results.filter((c): c is GuideCard => c !== null);
      cardQueueRef.current = [...cardQueueRef.current, ...validCards];
    } finally {
      isFetchingBufferRef.current = false;
    }
  };

  const initGuideCards = async () => {
    setLoading(true);
    try {
      const firstCard = await prefetchSingleCard();
      if (firstCard) {
        setCard(firstCard);
        setImageUri(resolveGuideCardImageUrl(firstCard));
      }
      refillBuffer();
    } finally {
      setLoading(false);
    }
  };

  const handleNextCard = async () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });

    if (cardQueueRef.current.length > 0) {
      const nextCard = cardQueueRef.current.shift()!;
      setCard(nextCard);
      setImageUri(resolveGuideCardImageUrl(nextCard));
      refillBuffer();
    } else {
      setSwitching(true);
      try {
        const newCard = await prefetchSingleCard();
        if (newCard) {
          setCard(newCard);
          setImageUri(resolveGuideCardImageUrl(newCard));
        }
        refillBuffer();
      } finally {
        setSwitching(false);
      }
    }
  };

  const fetchRandomCard = handleNextCard;

  const getIconName = (key: string | null): any => {
    if (!key) return 'information-circle-outline';
    switch (key.toLowerCase()) {
      case 'shield':
      case 'safety':
        return 'shield-checkmark-outline';
      case 'gearbox':
      case 'engine':
        return 'cog-outline';
      case 'calendar':
        return 'calendar-outline';
      case 'user':
      case 'comfort':
        return 'people-outline';
      default:
        return 'information-circle-outline';
    }
  };

  const getFactStyle = (type: Fact['factType']) => {
    switch (type) {
      case 'KNOWN_ISSUE':
        return {
          bg: '#fff1f2',
          border: '#fecaca',
          iconBg: '#ffe4e6',
          iconColor: '#dc2626',
          titleColor: '#9f1239',
          descColor: '#881337',
          badgeText: 'Kronik / Kritik Kontrol',
        };
      case 'BUYING_TIP':
        return {
          bg: '#fffbeb',
          border: '#fde68a',
          iconBg: '#fef3c7',
          iconColor: '#d97706',
          titleColor: '#92400e',
          descColor: '#78350f',
          badgeText: 'Satın Alma Tavsiyesi',
        };
      case 'USER_EXPERIENCE':
        return {
          bg: '#eff6ff',
          border: '#bfdbfe',
          iconBg: '#dbeafe',
          iconColor: '#2563eb',
          titleColor: '#1e40af',
          descColor: '#1e3a8a',
          badgeText: 'Kullanıcı Deneyimi',
        };
      default:
        return {
          bg: '#f0fdf4',
          border: '#bbf7d0',
          iconBg: '#dcfce7',
          iconColor: '#16a34a',
          titleColor: '#15803d',
          descColor: '#166534',
          badgeText: 'Genel Bakış & Detay',
        };
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <TorkScoutLoader />
          <Text style={styles.loadingText}>Cloudflare R2 araç görseli ve veriler yükleniyor...</Text>
        </View>
      ) : card ? (
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card Hero Image Container */}
          <View style={styles.imageCard}>
            <View style={styles.heroImageWrapper}>
              {imageUri ? (
                <ExpoImage
                  source={{ uri: imageUri }}
                  style={styles.heroImage}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                  onError={() => {
                    const fallbackUri = resolveGuideCardImageUrl({
                      ...card,
                      heroImageUrl: null,
                    });
                    if (fallbackUri && fallbackUri !== imageUri) {
                      setImageUri(fallbackUri);
                    }
                  }}
                />
              ) : null}
            </View>
            <View style={styles.vehicleIdentityBar}>
              <BrandLogo brandName={card.brand} size={36} />
              <View style={styles.vehicleIdentityTexts}>
                <Text style={styles.brandTitle}>
                  {card.brand} <Text style={styles.modelTitleAccent}>{card.model}</Text>
                </Text>
                <Text style={styles.yearsText}>
                  {card.generationName ? `${card.generationName} • ` : ''}
                  {card.yearStart} - {card.yearEnd || 'Günümüz'} • {translateBodyType(card.bodyType)}
                </Text>
              </View>
            </View>
          </View>

          {/* Short Summary Section */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryIconCircle}>
                <Ionicons name="document-text" size={18} color="#ea580c" />
              </View>
              <Text style={styles.summaryTitle}>Genel Araç Özeti</Text>
            </View>
            <Text style={styles.summaryText}>{card.shortSummary}</Text>
          </View>

          {/* Facts / Lists */}
          <View style={styles.factsSection}>
            <Text style={styles.sectionHeaderTitle}>💡 Önemli Bilgiler & Kronikler</Text>

            {card.facts.map((fact) => {
              const factStyle = getFactStyle(fact.factType);
              return (
                <View
                  key={fact.id}
                  style={[
                    styles.factCard,
                    { backgroundColor: factStyle.bg, borderColor: factStyle.border },
                  ]}
                >
                  <View style={styles.factHeader}>
                    <View style={[styles.iconBox, { backgroundColor: factStyle.iconBg }]}>
                      <Ionicons
                        name={getIconName(fact.iconKey)}
                        size={20}
                        color={factStyle.iconColor}
                      />
                    </View>
                    <View style={styles.factHeaderTextContent}>
                      <Text style={[styles.factTypeBadge, { color: factStyle.iconColor }]}>
                        {factStyle.badgeText}
                      </Text>
                      <Text style={[styles.factTitle, { color: factStyle.titleColor }]}>
                        {fact.title}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.factDesc, { color: factStyle.descColor }]}>
                    {fact.description}
                  </Text>
                </View>
              );
            })}

            {/* Collapsible User Comments Accordion Card */}
            <View style={styles.commentsAccordionCard}>
              <TouchableOpacity
                style={styles.commentsAccordionHeader}
                activeOpacity={0.8}
                onPress={() => setCommentsExpanded(!commentsExpanded)}
              >
                <View style={styles.commentsAccordionHeaderLeft}>
                  <View style={styles.commentsIconCircle}>
                    <Ionicons name="chatbubbles-outline" size={19} color="#ea580c" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentsAccordionTitle}>
                      Kullanıcı Yorumları ({commentsData.approvedCount})
                    </Text>
                    <Text style={styles.commentsAccordionSub}>
                      {card.brand} {card.model} kullanıcı deneyimleri ve puanları
                    </Text>
                  </View>
                </View>
                <View style={styles.commentsChevronBox}>
                  <Ionicons
                    name={commentsExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#0f172a"
                  />
                </View>
              </TouchableOpacity>

              {commentsExpanded && (
                <View style={styles.commentsBodyContainer}>
                  {/* Write Comment Toggle Button */}
                  <View style={styles.commentsActionRow}>
                    <TouchableOpacity
                      style={styles.writeCommentBtn}
                      activeOpacity={0.85}
                      onPress={() => setShowCommentForm(!showCommentForm)}
                    >
                      <Ionicons
                        name={showCommentForm ? 'close-circle-outline' : 'create-outline'}
                        size={16}
                        color="#ffffff"
                      />
                      <Text style={styles.writeCommentBtnText}>
                        {showCommentForm ? 'Formu Kapat' : 'Araç Hakkında Yorum Yaz'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Rating Summary Grid */}
                  {commentsData.ratingSummary && (
                    <View style={styles.ratingSummaryGrid}>
                      <View style={styles.ratingSummaryBox}>
                        <Text style={styles.ratingSummaryLabel}>GENEL PUAN</Text>
                        <Text style={styles.ratingSummaryPrimaryVal}>
                          {commentsData.ratingSummary.overallRating} / 5 ⭐
                        </Text>
                      </View>
                      <View style={styles.ratingSummaryBox}>
                        <Text style={styles.ratingSummaryLabel}>GÜVENİLİRLİK</Text>
                        <Text style={styles.ratingSummaryVal}>
                          {commentsData.ratingSummary.reliabilityRating} ⭐
                        </Text>
                      </View>
                      <View style={styles.ratingSummaryBox}>
                        <Text style={styles.ratingSummaryLabel}>YAKIT TÜKETİMİ</Text>
                        <Text style={styles.ratingSummaryVal}>
                          {commentsData.ratingSummary.fuelRating} ⭐
                        </Text>
                      </View>
                      <View style={styles.ratingSummaryBox}>
                        <Text style={styles.ratingSummaryLabel}>KONFOR</Text>
                        <Text style={styles.ratingSummaryVal}>
                          {commentsData.ratingSummary.comfortRating} ⭐
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Feedback Banner */}
                  {commentFeedback && (
                    <View
                      style={[
                        styles.feedbackBanner,
                        commentFeedback.type === 'success'
                          ? styles.feedbackBannerSuccess
                          : styles.feedbackBannerError,
                      ]}
                    >
                      <Ionicons
                        name={
                          commentFeedback.type === 'success'
                            ? 'checkmark-circle'
                            : 'alert-circle'
                        }
                        size={18}
                        color={commentFeedback.type === 'success' ? '#15803d' : '#b91c1c'}
                      />
                      <Text
                        style={[
                          styles.feedbackBannerText,
                          {
                            color:
                              commentFeedback.type === 'success' ? '#15803d' : '#b91c1c',
                          },
                        ]}
                      >
                        {commentFeedback.text}
                      </Text>
                    </View>
                  )}

                  {/* Toggleable Comment Form */}
                  {showCommentForm && (
                    <View style={styles.commentFormBox}>
                      <Text style={styles.commentFormHeading}>
                        ✍️ {card.brand} {card.model} İçin Yorumunu Yaz
                      </Text>

                      <View style={styles.starRatingsList}>
                        {renderStarRatingRow('Güvenilirlik', reliabilityRating, setReliabilityRating)}
                        {renderStarRatingRow('Yakıt Tüketimi', fuelRating, setFuelRating)}
                        {renderStarRatingRow('Konfor', comfortRating, setComfortRating)}
                        {renderStarRatingRow('Parça Bulunabilirliği', partsRating, setPartsRating)}
                        {renderStarRatingRow('Bakım ve Servis', maintenanceRating, setMaintenanceRating)}
                        {renderStarRatingRow('İkinci El Satış', resaleRating, setResaleRating)}
                        {renderStarRatingRow('Genel Memnuniyet', overallRating, setOverallRating)}
                      </View>

                      <View style={{ gap: 6 }}>
                        <Text style={styles.formFieldLabel}>
                          Yorumunuz (En az 20 karakter)
                        </Text>
                        <TextInput
                          style={styles.commentTextInput}
                          multiline
                          numberOfLines={4}
                          placeholder="Aracın konforu, yakıt tüketimi, kronik sorunları ve kullanıcı deneyimleriniz hakkında ayrıntılı bilgi yazın..."
                          placeholderTextColor="#94a3b8"
                          value={commentText}
                          onChangeText={setCommentText}
                        />
                        <Text style={styles.charCountText}>
                          {commentText.length} / 1000 Karakter
                        </Text>
                      </View>

                      <View style={styles.usageAndChecksWrap}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.formFieldLabel}>Kullanım Süresi (Ay)</Text>
                          <TextInput
                            style={styles.usageMonthsInput}
                            keyboardType="numeric"
                            value={usageMonths}
                            onChangeText={setUsageMonths}
                            placeholder="Örn: 12"
                            placeholderTextColor="#94a3b8"
                          />
                        </View>

                        <View style={styles.checkPillsColumn}>
                          <TouchableOpacity
                            style={[styles.checkPillBtn, isOwner && styles.checkPillBtnActive]}
                            onPress={() => setIsOwner(!isOwner)}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name={isOwner ? 'checkbox' : 'square-outline'}
                              size={18}
                              color={isOwner ? '#ea580c' : '#64748b'}
                            />
                            <Text style={styles.checkPillText}>Araç Sahibiyim</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.checkPillBtn, recommends && styles.checkPillBtnActive]}
                            onPress={() => setRecommends(!recommends)}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name={recommends ? 'checkbox' : 'square-outline'}
                              size={18}
                              color={recommends ? '#ea580c' : '#64748b'}
                            />
                            <Text style={styles.checkPillText}>Tavsiye Ediyorum</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[styles.submitCommentBtn, submittingComment && { opacity: 0.6 }]}
                        onPress={handleSubmitComment}
                        disabled={submittingComment}
                        activeOpacity={0.85}
                      >
                        {submittingComment ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Ionicons name="send" size={15} color="#ffffff" />
                            <Text style={styles.submitCommentBtnText}>Yorumu Gönder</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Approved Comments List */}
                  {commentsLoading ? (
                    <View style={styles.commentsEmptyBox}>
                      <ActivityIndicator size="small" color="#ea580c" />
                      <Text style={styles.commentsEmptyText}>Yorumlar yükleniyor...</Text>
                    </View>
                  ) : commentsData.comments.length === 0 ? (
                    <View style={styles.commentsEmptyBox}>
                      <Ionicons name="chatbubble-ellipses-outline" size={26} color="#94a3b8" />
                      <Text style={styles.commentsEmptyText}>
                        Bu araç rehberi için henüz onaylanmış bir kullanıcı yorumu bulunmuyor. İlk yorumu sen yaz!
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 10 }}>
                      {commentsData.comments.map((c: any) => (
                        <View key={c.id} style={styles.singleCommentCard}>
                          <View style={styles.singleCommentHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.singleCommentAuthor}>{c.displayName}</Text>
                              {c.customerNo && (
                                <View style={styles.customerNoBadge}>
                                  <Text style={styles.customerNoText}>{c.customerNo}</Text>
                                </View>
                              )}
                            </View>

                            <View style={styles.commentBadgesRow}>
                              {c.usageMonths > 0 && (
                                <View style={styles.usageBadge}>
                                  <Text style={styles.usageBadgeText}>{c.usageMonths} Ay Kullanım</Text>
                                </View>
                              )}
                              {c.isOwner && (
                                <View style={styles.ownerBadge}>
                                  <Text style={styles.ownerBadgeText}>✓ Araç Sahibi</Text>
                                </View>
                              )}
                              {c.recommends && (
                                <View style={styles.recommendBadge}>
                                  <Text style={styles.recommendBadgeText}>👍 Tavsiye Ediyor</Text>
                                </View>
                              )}
                            </View>
                          </View>

                          <Text style={styles.singleCommentBody}>{c.comment}</Text>

                          <View style={styles.singleCommentRatingsFooter}>
                            <Text style={styles.singleCommentOverallScore}>
                              Genel: {c.overallRating} ⭐
                            </Text>
                            <Text style={styles.singleCommentSubScore}>
                              • Güvenilirlik: {c.reliabilityRating} • Yakıt: {c.fuelRating} • Konfor: {c.comfortRating} • Parça: {c.partsRating} • Bakım: {c.maintenanceRating} • Satış: {c.resaleRating}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Next Card Button */}
          <TouchableOpacity
            style={[styles.nextBtn, switching && { opacity: 0.7 }]}
            onPress={fetchRandomCard}
            disabled={switching}
            activeOpacity={0.85}
          >
            {switching ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="arrow-forward-circle-outline" size={22} color="#ffffff" />
            )}
            <Text style={styles.nextBtnText}>
              {switching ? 'Sıradaki Araç Yükleniyor...' : 'Sıradaki Araç Bilgilerini Gör'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#94a3b8" />
          <Text style={styles.errorText}>Rehber kartı yüklenemedi.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchRandomCard}>
            <Text style={styles.retryBtnText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  errorText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#ea580c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  imageCard: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heroImageWrapper: {
    width: '100%',
    height: 220,
    backgroundColor: '#f1f5f9',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  vehicleIdentityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  vehicleIdentityTexts: {
    flex: 1,
    gap: 2,
  },
  brandTitle: {
    color: '#0f172a',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  modelTitleAccent: {
    color: '#ea580c',
  },
  yearsText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 18,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  summaryText: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
  },
  factsSection: {
    gap: 12,
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 6,
    marginBottom: 2,
  },
  factCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  factHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  factHeaderTextContent: {
    flex: 1,
    gap: 2,
  },
  factTypeBadge: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  factTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  factDesc: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ea580c',
    borderRadius: 18,
    paddingVertical: 16,
    gap: 10,
    marginTop: 8,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  nextBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  commentsAccordionCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  commentsAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  commentsAccordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  commentsIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsAccordionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  commentsAccordionSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  commentsChevronBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  commentsBodyContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    padding: 16,
    gap: 14,
    backgroundColor: '#f8fafc',
  },
  commentsActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  writeCommentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ea580c',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  writeCommentBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  ratingSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ratingSummaryBox: {
    width: '47%',
    gap: 2,
  },
  ratingSummaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
  },
  ratingSummaryPrimaryVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#d97706',
  },
  ratingSummaryVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  feedbackBannerSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  feedbackBannerError: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  feedbackBannerText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  commentFormBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fed7aa',
    gap: 12,
  },
  commentFormHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  starRatingsList: {
    gap: 6,
  },
  starRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  starRowLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  starIconsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starTouchBtn: {
    padding: 2,
  },
  starValueBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#d97706',
    marginLeft: 4,
    minWidth: 32,
    textAlign: 'right',
  },
  formFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  commentTextInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    minHeight: 88,
    textAlignVertical: 'top',
  },
  charCountText: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'right',
    fontWeight: '600',
  },
  usageAndChecksWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  usageMonthsInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 4,
  },
  checkPillsColumn: {
    gap: 6,
  },
  checkPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checkPillBtnActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
  },
  checkPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  submitCommentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ea580c',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  submitCommentBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  commentsEmptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  commentsEmptyText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  singleCommentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  singleCommentHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  singleCommentAuthor: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  customerNoBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  customerNoText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  commentBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  usageBadge: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  usageBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
  },
  ownerBadge: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ownerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803d',
  },
  recommendBadge: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
  },
  singleCommentBody: {
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
  },
  singleCommentRatingsFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    gap: 2,
  },
  singleCommentOverallScore: {
    fontSize: 11,
    fontWeight: '900',
    color: '#d97706',
  },
  singleCommentSubScore: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    lineHeight: 15,
  },
});
