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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://used-car-api-hzmu.onrender.com';
const { width } = Dimensions.get('window');

const formatCloudflareImageUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('/') || url.startsWith('data:')) return url;

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
      return `${API_URL}/listings/media-proxy/${storageKey}`;
    }
  }

  return url;
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

  useEffect(() => {
    initGuideCards();
  }, []);

  const prefetchSingleCard = async (): Promise<GuideCard | null> => {
    try {
      const res = await fetch(`${API_URL}/vehicle-guide/cards/random?locale=tr`);
      if (res.ok) {
        const data: GuideCard = await res.json();
        const proxiedUrl = formatCloudflareImageUrl(data.heroImageUrl);
        if (proxiedUrl) {
          Image.prefetch(proxiedUrl).catch(() => {});
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
        setImageUri(formatCloudflareImageUrl(firstCard.heroImageUrl));
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
      setImageUri(formatCloudflareImageUrl(nextCard.heroImageUrl));
      refillBuffer();
    } else {
      setSwitching(true);
      try {
        const newCard = await prefetchSingleCard();
        if (newCard) {
          setCard(newCard);
          setImageUri(formatCloudflareImageUrl(newCard.heroImageUrl));
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
          <ActivityIndicator size="large" color="#ea580c" />
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
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ) : null}
            <View style={styles.imageDarkGradient} />
            <View style={styles.titleOverlay}>
              <View style={styles.brandBadge}>
                <Text style={styles.brandBadgeText}>{card.brand.toUpperCase()}</Text>
              </View>
              <Text style={styles.brandTitle}>
                {card.brand} {card.model}
              </Text>
              <Text style={styles.yearsText}>
                {card.generationName ? `${card.generationName} • ` : ''}
                {card.yearStart} - {card.yearEnd || 'Günümüz'} • {card.bodyType}
              </Text>
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
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageDarkGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    gap: 4,
  },
  brandBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ea580c',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 2,
  },
  brandBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  yearsText: {
    color: '#f1f5f9',
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
});
