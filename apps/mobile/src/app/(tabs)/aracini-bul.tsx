import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://used-car-api-hzmu.onrender.com';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;

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

import { CLOUDFLARE_VEHICLE_IMAGES } from '../../constants/vehicleImages';

const resolveVehicleImageUrl = (
  url?: string | null,
  brand?: string,
  modelFamily?: string,
  generationName?: string
): string => {
  // 1. If backend gave an authentic Cloudflare R2 / S3 URL, use it directly
  if (url && (url.includes('r2.dev') || url.includes('cloudflarestorage.com'))) {
    return formatCloudflareImageUrl(url);
  }

  const b = (brand || '').trim().toLowerCase();
  const m = (modelFamily || '').trim().toLowerCase();
  const g = (generationName || '').trim().toLowerCase();
  const cleanM = m.replace(/ailesi|serisi/gi, '').trim();

  // 2. Direct exact Brand + Model + Gen lookup in Cloudflare R2 map
  if (g && CLOUDFLARE_VEHICLE_IMAGES[`${b} ${m} ${g}`]) return CLOUDFLARE_VEHICLE_IMAGES[`${b} ${m} ${g}`];
  if (CLOUDFLARE_VEHICLE_IMAGES[`${b} ${m}`]) return CLOUDFLARE_VEHICLE_IMAGES[`${b} ${m}`];
  if (cleanM && CLOUDFLARE_VEHICLE_IMAGES[`${b} ${cleanM}`]) return CLOUDFLARE_VEHICLE_IMAGES[`${b} ${cleanM}`];
  if (CLOUDFLARE_VEHICLE_IMAGES[m]) return CLOUDFLARE_VEHICLE_IMAGES[m];
  if (cleanM && CLOUDFLARE_VEHICLE_IMAGES[cleanM]) return CLOUDFLARE_VEHICLE_IMAGES[cleanM];

  // 3. Partial keyword matching against all Cloudflare R2 keys
  if (cleanM && cleanM.length >= 2) {
    for (const [key, r2Url] of Object.entries(CLOUDFLARE_VEHICLE_IMAGES)) {
      if (key.includes(`${b} ${cleanM}`) || key === cleanM) {
        return r2Url;
      }
    }
  }

  // 4. Brand lookup in Cloudflare R2 map
  if (b && CLOUDFLARE_VEHICLE_IMAGES[b]) {
    return CLOUDFLARE_VEHICLE_IMAGES[b];
  }

  // 5. If backend provided any custom URL (and not generic Unsplash placeholder)
  if (url && !url.includes('photo-1542282088-72c9c27ed0cd') && !url.includes('unsplash.com')) {
    return formatCloudflareImageUrl(url);
  }

  return '';
};

const formatPrice = (amount: number | string) => {
  const value = Number(amount);
  if (isNaN(value) || value <= 0) return '-';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value);
};

const translateBodyType = (bodyType?: string) => {
  if (!bodyType) return '-';
  const mapping: Record<string, string> = {
    SEDAN: 'Sedan',
    HATCHBACK: 'Hatchback',
    SUV: 'SUV',
    WAGON: 'Station Wagon',
    PICKUP: 'Pickup',
    VAN: 'Minivan / Panelvan',
    OTHER: 'Diğer',
  };
  return mapping[bodyType.toUpperCase()] || bodyType;
};

const translateFuelType = (fuel?: string) => {
  if (!fuel) return '-';
  const f = fuel.toUpperCase();
  if (f === 'PETROL' || f === 'BENZINLI' || f === 'BENZIN') return 'Benzinli';
  if (f === 'DIESEL' || f === 'DIZEL') return 'Dizel';
  if (f === 'HYBRID' || f === 'HIBRIT') return 'Hibrit';
  if (f === 'ELECTRIC' || f === 'ELEKTRIK') return 'Elektrikli';
  if (f === 'LPG') return 'LPG';
  return fuel;
};

const translateTransmission = (trans?: string) => {
  if (!trans) return '-';
  const t = trans.toUpperCase();
  if (t === 'AUTOMATIC' || t === 'OTOMATIK') return 'Otomatik';
  if (t === 'MANUAL' || t === 'MANUEL') return 'Manuel';
  return trans;
};

interface DiscoveryCard {
  id: string;
  vehicleProfileId?: string;
  displayName?: string;
  brand: string;
  modelFamily: string;
  generationName?: string | null;
  bodyType: string;
  fuelType: string;
  transmissionType: string;
  engineVersion: string;
  power: string;
  torque: string;
  productionYears: string;
  averageConsumption: string;
  drivetrain: string;
  imageUrl: string;
  tags: string[];
  discoverySummary?: string;
  guideSummary?: string;
  highlight?: string;
  discoveryHighlight?: string;
  watchout?: string;
  discoveryWatchout?: string;
}

interface RecommendedVariant {
  id: string;
  brand: { name: string };
  model: { name: string };
  generation?: { name: string };
  engine?: { name: string };
  transmission?: { name: string; type: string; speeds: number };
  trim?: { name: string };
  priceSnapshot?: { estimatedMin: number; estimatedMax: number; medianPrice: number };
  listings: Array<{
    id: string;
    title: string;
    priceAmount: number;
    modelYear: number;
    kilometers: number;
    city: string;
    media: Array<{ url: string }>;
  }>;
}

interface RecommendationItem {
  recommendedVariantId?: string;
  brandId?: string;
  brandName?: string;
  modelId?: string;
  modelName?: string;
  generationName?: string;
  bodyType?: string;
  fuelType?: string;
  transmissionType?: string;
  imageUrl?: string;
  activeListingCount?: number;
  minActivePrice?: number | null;
  maxActivePrice?: number | null;
  listingsQuery?: any;
}

interface RecommendationResult {
  message: string;
  scoringProfile?: {
    bodyTypeScores?: Record<string, number>;
    fuelTypeScores?: Record<string, number>;
    transmissionScores?: Record<string, number>;
    brandScores?: Record<string, number>;
    modelFamilyScores?: Record<string, number>;
  };
  recommendation?: RecommendationItem;
  recommendations?: RecommendedVariant[];
}

const prefetchDeckImages = async (cards: DiscoveryCard[]) => {
  if (!cards || cards.length === 0) return;
  // Instantly prefetch first 2 cards in parallel
  const priorityCards = cards.slice(0, 2);
  const remainingCards = cards.slice(2);

  await Promise.all(
    priorityCards.map((c) =>
      c.imageUrl ? ExpoImage.prefetch(c.imageUrl, 'memory-disk').catch(() => {}) : Promise.resolve()
    )
  );

  // Background cache remaining deck
  remainingCards.forEach((c) => {
    if (c.imageUrl) {
      ExpoImage.prefetch(c.imageUrl, 'memory-disk').catch(() => {});
    }
  });
};

const VehicleCardContent = React.memo(({ card }: { card: DiscoveryCard }) => {
  return (
    <>
      {/* Photo Header */}
      <View style={styles.imageContainer}>
        {card.imageUrl ? (
          <ExpoImage
            key={card.imageUrl}
            source={{ uri: card.imageUrl }}
            style={styles.cardImage}
            contentFit="cover"
            transition={0}
            cachePolicy="memory-disk"
            priority="high"
          />
        ) : (
          <View style={[styles.cardImage, styles.placeholderImage]}>
            <Ionicons name="car-outline" size={54} color="#64748b" />
          </View>
        )}
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>{card.brand.toUpperCase()}</Text>
        </View>
      </View>

      {/* Content Scroll */}
      <ScrollView style={styles.cardScroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.cardTitle}>
          {card.displayName || `${card.brand} ${card.modelFamily}`}
        </Text>
        <Text style={styles.cardSubtitle}>
          {card.generationName ? `${card.generationName} • ` : ''}
          {card.productionYears || ''}
        </Text>

        {/* Specification Grid (2x3) */}
        <View style={styles.specGrid}>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>Kasa Tipi</Text>
            <Text style={styles.specVal}>{translateBodyType(card.bodyType)}</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>Yakıt</Text>
            <Text style={styles.specVal}>{translateFuelType(card.fuelType)}</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>Şanzıman</Text>
            <Text style={styles.specVal}>{translateTransmission(card.transmissionType)}</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>Motor</Text>
            <Text style={styles.specVal}>{card.engineVersion || '-'}</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>Güç / Tork</Text>
            <Text style={styles.specVal}>
              {card.power || '-'} / {card.torque || '-'}
            </Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>Ort. Tüketim</Text>
            <Text style={styles.specVal}>{card.averageConsumption || '-'}</Text>
          </View>
        </View>

        {/* BU ARAÇ NASIL? Section */}
        {(card.discoverySummary || card.guideSummary) && (
          <View style={styles.aiInsightBox}>
            <View style={styles.aiInsightHeader}>
              <Ionicons name="sparkles" size={14} color="#ea580c" />
              <Text style={styles.aiInsightTitle}>BU ARAÇ NASIL?</Text>
            </View>
            <Text style={styles.aiInsightText}>
              {card.discoverySummary || card.guideSummary}
            </Text>

            {(card.highlight || card.discoveryHighlight) && (
              <View style={styles.highlightPill}>
                <Text style={styles.highlightPillText}>
                  ✓ ÖNE ÇIKAN: {card.highlight || card.discoveryHighlight}
                </Text>
              </View>
            )}

            {(card.watchout || card.discoveryWatchout) && (
              <View style={styles.watchoutPill}>
                <Text style={styles.watchoutPillText}>
                  ⚠ DİKKAT: {card.watchout || card.discoveryWatchout}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Tags */}
        {card.tags && card.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {card.tags.map((t) => (
              <View key={t} style={styles.tagBadge}>
                <Text style={styles.tagBadgeText}>#{t.replace(/^#/, '')}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
});

export default function AraciniBulScreen() {
  const router = useRouter();

  type GameState = 'intro' | 'loading' | 'swiping' | 'result' | 'empty' | 'error';
  type ResultsData = RecommendationResult;

  const [gameState, setGameState] = useState<GameState>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [sessionVersion, setSessionVersion] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [targetCount, setTargetCount] = useState<number>(20);

  const [deck, setDeck] = useState<DiscoveryCard[]>([]);
  const deckRef = useRef<DiscoveryCard[]>([]);
  deckRef.current = deck;

  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const isSwipingRef = useRef<boolean>(false);

  // Filter Modal & State
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [selectedBodies, setSelectedBodies] = useState<string[]>([]);
  const [selectedFuels, setSelectedFuels] = useState<string[]>([]);
  const [selectedTransmissions, setSelectedTransmissions] = useState<string[]>([]);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const bodyStyles = [
    { key: 'SEDAN', label: 'Sedan' },
    { key: 'HATCHBACK', label: 'Hatchback' },
    { key: 'SUV', label: 'SUV' },
    { key: 'COUPE', label: 'Coupe' },
    { key: 'STATION_WAGON', label: 'Station Wagon' },
  ];

  const fuelOptions = [
    { key: 'GASOLINE', label: 'Benzin' },
    { key: 'DIESEL', label: 'Dizel' },
    { key: 'HYBRID', label: 'Hibrit' },
    { key: 'ELECTRIC', label: 'Elektrik' },
  ];

  const transmissionOptions = [
    { key: 'MANUAL', label: 'Manuel' },
    { key: 'AUTOMATIC', label: 'Otomatik' },
  ];

  useEffect(() => {
    init();
  }, []);

  const formatDiscoveryCard = (raw: any): DiscoveryCard => {
    const cardData = raw.card || raw;
    return {
      id: cardData.id,
      vehicleProfileId: cardData.vehicleProfileId,
      displayName: cardData.displayName || `${cardData.brand} ${cardData.modelFamily}`,
      brand: cardData.brand || '',
      modelFamily: cardData.modelFamily || '',
      generationName: cardData.generationName || null,
      bodyType: cardData.bodyType || 'Sedan',
      fuelType: cardData.fuelType || 'Benzin',
      transmissionType: cardData.transmissionType || 'Otomatik',
      engineVersion: cardData.engineVersion || '',
      power: cardData.power || '',
      torque: cardData.torque || '',
      productionYears: cardData.productionYears || '',
      averageConsumption: cardData.averageConsumption || '',
      drivetrain: cardData.drivetrain || '',
      imageUrl: resolveVehicleImageUrl(cardData.imageUrl, cardData.brand, cardData.modelFamily, cardData.generationName),
      tags: Array.isArray(cardData.tags) ? cardData.tags : [],
      discoverySummary: cardData.discoverySummary,
      guideSummary: cardData.guideSummary,
      highlight: cardData.highlight,
      discoveryHighlight: cardData.discoveryHighlight,
      watchout: cardData.watchout,
      discoveryWatchout: cardData.discoveryWatchout,
    };
  };

  const customFetch = async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    // 1. Bearer Token if authenticated user
    const activeToken = token || (await AsyncStorage.getItem('accessToken'));
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    // 2. x-guest-token
    if (headers['x-guest-token'] === '') {
      delete headers['x-guest-token'];
    } else if (!headers['x-guest-token']) {
      const savedGuestToken = guestToken || (await AsyncStorage.getItem('discoveryGuestToken'));
      if (savedGuestToken) {
        headers['x-guest-token'] = savedGuestToken;
      }
    }

    let lastError: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, {
          ...options,
          headers,
        });

        // Extract and persist x-guest-token returned by server
        const newGuestToken = res.headers.get('x-guest-token');
        if (newGuestToken) {
          setGuestToken(newGuestToken);
          await AsyncStorage.setItem('discoveryGuestToken', newGuestToken);
        }

        if (res.ok || attempt === 2) {
          return res;
        }
      } catch (err) {
        lastError = err;
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
      }
    }

    throw lastError || new Error('Network request failed');
  };

  const init = async (): Promise<string> => {
    setGameState('loading');
    try {
      const savedToken = await AsyncStorage.getItem('accessToken');
      setToken(savedToken);

      const res = await customFetch(`${API_URL}/vehicle-discovery/sessions`, {
        method: 'POST',
        body: JSON.stringify({
          filters: {
            minimumPrice: minPrice ? Number(minPrice) : undefined,
            maximumPrice: maxPrice ? Number(maxPrice) : undefined,
            bodyTypes: selectedBodies.length > 0 ? selectedBodies : undefined,
            fuelTypes: selectedFuels.length > 0 ? selectedFuels : undefined,
            transmissions: selectedTransmissions.length > 0 ? selectedTransmissions : undefined,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const sess = data.session;
        if (sess) {
          setSessionId(sess.id);
          sessionIdRef.current = sess.id;
          setCurrentIndex(sess.currentIndex || 0);
          setSessionVersion(sess.version || 0);
          sessionVersionRef.current = sess.version || 0;
          setTargetCount(sess.targetCount || 20);
          setWarningMessage(data.warning || null);

          if (sess.status === 'COMPLETED') {
            await loadResults(sess.id);
            return sess.id;
          }

          // Build deck from unswiped items
          const unswiped = (sess.items || []).filter((it: any) => it.action === null);
          const formattedDeck = unswiped.map(formatDiscoveryCard);
          setDeck(formattedDeck);
          deckRef.current = formattedDeck;

          // Pre-cache all session images with high priority
          await prefetchDeckImages(formattedDeck);

          setGameState('intro');
          return sess.id;
        }
      }
      setGameState('error');
      return '';
    } catch (e) {
      console.error('Error in init:', e);
      setGameState('error');
      return '';
    }
  };

  const startDiscovery = async () => {
    if (deckRef.current.length > 0) {
      setGameState('swiping');
    } else {
      setGameState('loading');
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        activeSessionId = await init();
      }
      if (activeSessionId) {
        setGameState('swiping');
      } else {
        setGameState('error');
      }
    }
  };

  const resetDiscovery = async () => {
    setGameState('loading');
    try {
      // 1. Clear local guest tokens and filters
      await AsyncStorage.removeItem('discoveryGuestToken');
      setGuestToken('');
      setMinPrice('');
      setMaxPrice('');
      setSelectedBodies([]);
      setSelectedFuels([]);
      setSelectedTransmissions([]);
      setWarningMessage(null);
      setResultsData(null);
      setDeck([]);
      deckRef.current = [];

      // 2. Request brand new session from server (forceNew: true creates a new 0/20 session)
      const res = await customFetch(`${API_URL}/vehicle-discovery/sessions`, {
        method: 'POST',
        headers: {
          'x-guest-token': '', // Ensure no old token header is sent
        },
        body: JSON.stringify({ filters: {}, forceNew: true }),
      });

      if (res.ok) {
        const data = await res.json();
        const sess = data.session;
        if (sess && sess.id) {
          setSessionId(sess.id);
          sessionIdRef.current = sess.id;
          setCurrentIndex(0);
          setSessionVersion(0);
          sessionVersionRef.current = 0;
          setTargetCount(sess.targetCount || 20);

          const formattedDeck = (sess.items || []).map(formatDiscoveryCard);
          setDeck(formattedDeck);
          deckRef.current = formattedDeck;

          // Pre-cache all fresh images with priority on first card
          await prefetchDeckImages(formattedDeck);

          pan.setValue({ x: 0, y: 0 });
          setGameState('swiping');
          return;
        }
      }
      setGameState('intro');
    } catch (e) {
      console.error('Error resetDiscovery:', e);
      setGameState('error');
    }
  };

  const applyFilters = async () => {
    setShowFilterModal(false);
    setGameState('loading');
    try {
      const res = await customFetch(`${API_URL}/vehicle-discovery/sessions/${sessionId}/filters`, {
        method: 'PATCH',
        body: JSON.stringify({
          filters: {
            minimumPrice: minPrice ? Number(minPrice) : 0,
            maximumPrice: maxPrice ? Number(maxPrice) : null,
            bodyTypes: selectedBodies,
            fuelTypes: selectedFuels,
            transmissions: selectedTransmissions,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const sess = data.session;
        if (sess) {
          setCurrentIndex(sess.currentIndex || 0);
          setSessionVersion(sess.version || 0);
          sessionVersionRef.current = sess.version || 0;
          setWarningMessage(data.warning || null);

          const unswiped = (sess.items || []).filter((it: any) => it.action === null);
          const formattedDeck = unswiped.map(formatDiscoveryCard);
          setDeck(formattedDeck);
          deckRef.current = formattedDeck;

          await prefetchDeckImages(formattedDeck);

          pan.setValue({ x: 0, y: 0 });
          setGameState('swiping');
        }
      } else {
        setGameState('error');
      }
    } catch (e) {
      console.error('Error applyFilters:', e);
      setGameState('error');
    }
  };

  const sessionIdRef = useRef<string>('');
  sessionIdRef.current = sessionId;
  const sessionVersionRef = useRef<number>(0);
  sessionVersionRef.current = sessionVersion;

  // Animated values for card swipe
  const pan = useRef(new Animated.ValueXY()).current;

  // Tinder pan responder with smooth gesture capture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 4;
      },
      onPanResponderGrant: () => {
        pan.stopAnimation();
        pan.setOffset({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy * 0.25 });
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD || gestureState.vx > 0.4) {
          handleSwipe('right');
        } else if (gestureState.dx < -SWIPE_THRESHOLD || gestureState.vx < -0.4) {
          handleSwipe('left');
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 6,
            tension: 40,
            useNativeDriver: false,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          friction: 6,
          tension: 40,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const handleSwipe = (direction: 'left' | 'right') => {
    if (isSwipingRef.current) return;
    const currentDeck = deckRef.current;
    if (!currentDeck || currentDeck.length === 0) return;

    const activeCard = currentDeck[0];
    const sId = sessionIdRef.current;
    const ver = sessionVersionRef.current;
    isSwipingRef.current = true;

    // Smooth physics-based fly-off animation
    Animated.timing(pan, {
      toValue: {
        x: direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5,
        y: 0,
      },
      duration: 220,
      useNativeDriver: false,
    }).start(() => {
      // 1. Reset pan coordinates first
      pan.setValue({ x: 0, y: 0 });
      isSwipingRef.current = false;

      // 2. Instantly shift deck so underneath card seamlessly becomes top card
      const remainingDeck = currentDeck.slice(1);
      setDeck(remainingDeck);
      deckRef.current = remainingDeck;
      setCurrentIndex((prev) => prev + 1);

      // 3. If deck is now empty, load AI recommendation results immediately
      if (remainingDeck.length === 0) {
        loadResults(sId);
      }

      // 4. Send swipe to server in background (optimistic 0ms UI)
      if (sId && activeCard) {
        customFetch(`${API_URL}/vehicle-discovery/sessions/${sId}/swipes`, {
          method: 'POST',
          body: JSON.stringify({
            cardId: activeCard.id,
            action: direction === 'right' ? 'LIKE' : 'DISLIKE',
            version: ver,
          }),
        })
          .then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              if (data.status === 'COMPLETED') {
                loadResults(sId);
              }
            }
          })
          .catch((err) => {
            console.log('Background swipe error:', err);
          });
      }
    });
  };

  const extendDiscovery = async () => {
    setGameState('loading');
    try {
      const nextTargetCount = (targetCount || 20) + 20;
      const res = await customFetch(`${API_URL}/vehicle-discovery/sessions/${sessionId}/filters`, {
        method: 'PATCH',
        body: JSON.stringify({
          filters: {
            minimumPrice: minPrice ? Number(minPrice) : 0,
            maximumPrice: maxPrice ? Number(maxPrice) : null,
            bodyTypes: selectedBodies,
            fuelTypes: selectedFuels,
            transmissions: selectedTransmissions,
          },
          targetCount: nextTargetCount,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const sess = data.session;
        if (sess) {
          setCurrentIndex(sess.currentIndex || 0);
          setSessionVersion(sess.version || 0);
          sessionVersionRef.current = sess.version || 0;
          setTargetCount(sess.targetCount || nextTargetCount);
          setWarningMessage(data.warning || null);

          const unswiped = (sess.items || []).filter((it: any) => it.action === null);
          const formattedDeck = unswiped.map(formatDiscoveryCard);
          setDeck(formattedDeck);
          deckRef.current = formattedDeck;

          await prefetchDeckImages(formattedDeck);

          pan.setValue({ x: 0, y: 0 });
          setGameState('swiping');
          return;
        }
      }
      setGameState('error');
    } catch (e) {
      console.error('Error extending discovery:', e);
      setGameState('error');
    }
  };

  const loadResults = async (sId = sessionId) => {
    setGameState('loading');
    try {
      const res = await customFetch(`${API_URL}/vehicle-discovery/sessions/${sId}/results`);
      if (res.ok) {
        const data = await res.json();
        setResultsData(data);
        setGameState('result');
      } else {
        setGameState('empty');
      }
    } catch (e) {
      console.error('Error loadResults:', e);
      setGameState('error');
    }
  };

  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = pan.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const dislikeOpacity = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Smooth scale up for underneath card as top card moves away
  const nextCardScale = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [1, 0.95, 1],
    extrapolate: 'clamp',
  });

  const nextCardOpacity = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [1, 0.88, 1],
    extrapolate: 'clamp',
  });

  const toggleBody = (key: string) => {
    setSelectedBodies((prev) => (prev.includes(key) ? prev.filter((b) => b !== key) : [...prev, key]));
  };

  const toggleFuel = (key: string) => {
    setSelectedFuels((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));
  };

  const toggleTrans = (key: string) => {
    setSelectedTransmissions((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]));
  };

  const currentTopCard = deck[0] || null;
  const underneathCard = deck[1] || null;

  return (
    <View style={styles.container}>
      {/* 1. INTRO STATE */}
      {gameState === 'intro' && (
        <View style={styles.cardBox}>
          <View style={styles.introIconCircle}>
            <Ionicons name="car-sport" size={44} color="#ea580c" />
          </View>
          <Text style={styles.introTitle}>Aracını Bul</Text>
          <Text style={styles.introDesc}>
            Hangi aracı alacağından emin değil misin? Karşına gelen araç kartlarını beğenip geçerek tercihlerini keşfet,
            yapay zeka destekli TorqueScout modeliyle en uygun araçları bulalım.
          </Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={startDiscovery} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>
              {currentIndex > 0 ? `Kaldığın Yerden Devam Et (${currentIndex})` : 'Keşfe Başla'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" />
          </TouchableOpacity>

          {currentIndex > 0 && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={resetDiscovery} activeOpacity={0.85}>
              <Ionicons name="refresh" size={16} color="#94a3b8" />
              <Text style={styles.secondaryBtnText}>Oturumu Sıfırla</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.filterOutlineBtn}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="options-outline" size={18} color="#ea580c" />
            <Text style={styles.filterOutlineText}>Kriterleri Yapılandır</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 2. LOADING STATE */}
      {gameState === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingText}>Yapay zeka araçları hazırlanıyor...</Text>
        </View>
      )}

      {/* 3. SWIPING STATE (TWO-CARD PRE-RENDERED DECK) */}
      {gameState === 'swiping' && currentTopCard && (
        <View style={styles.swipeContainer}>
          {/* Header & Progress */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.miniFilterBtn}
              onPress={() => setShowFilterModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="options-outline" size={16} color="#ea580c" />
              <Text style={styles.miniFilterText}>Kriterler</Text>
            </TouchableOpacity>

            <View style={styles.progressCenter}>
              <Text style={styles.progressCounterText}>
                {currentIndex} / {targetCount}
              </Text>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(100, (currentIndex / targetCount) * 100)}%` },
                  ]}
                />
              </View>
            </View>

            <TouchableOpacity onPress={resetDiscovery} style={styles.resetBtn}>
              <Ionicons name="refresh" size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* TWO-CARD DECK CONTAINER */}
          <View style={styles.deckContainer}>
            {/* UNDERNEATH NEXT CARD (PRE-LOADED IN PLACE) */}
            {underneathCard && (
              <Animated.View
                key={`underneath-${underneathCard.id}`}
                style={[
                  styles.card,
                  styles.underneathCard,
                  {
                    transform: [{ scale: nextCardScale }],
                    opacity: nextCardOpacity,
                  },
                ]}
                pointerEvents="none"
              >
                <VehicleCardContent card={underneathCard} />
              </Animated.View>
            )}

            {/* TOP ACTIVE SWIPE CARD */}
            <Animated.View
              key={`top-${currentTopCard.id}`}
              {...panResponder.panHandlers}
              style={[
                styles.card,
                styles.topCard,
                {
                  transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
                },
              ]}
            >
              {/* LIKE BADGE */}
              <Animated.View style={[styles.choiceBadge, styles.likeBadge, { opacity: likeOpacity }]}>
                <Text style={styles.likeBadgeText}>BEĞENDİM</Text>
              </Animated.View>

              {/* DISLIKE BADGE */}
              <Animated.View style={[styles.choiceBadge, styles.dislikeBadge, { opacity: dislikeOpacity }]}>
                <Text style={styles.dislikeBadgeText}>PAS</Text>
              </Animated.View>

              <VehicleCardContent card={currentTopCard} />
            </Animated.View>
          </View>

          {/* Swipe Buttons Bar */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.circleBtn, styles.dislikeBtn]}
              onPress={() => handleSwipe('left')}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={28} color="#ef4444" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.circleBtn, styles.likeBtn]}
              onPress={() => handleSwipe('right')}
              activeOpacity={0.8}
            >
              <Ionicons name="heart" size={28} color="#10b981" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 4. RESULTS STATE (1:1 WITH WEB SCREENSHOT) */}
      {gameState === 'result' && resultsData && (
        <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.resultHeader}>
            <View style={styles.sparkleBadge}>
              <Text style={styles.sparkleBadgeText}>🌟 YAPAY ZEKA SONUÇ RAPORU</Text>
            </View>
            <Text style={styles.resultTitle}>Tercihlerinize En Uygun Modeller Belirlendi</Text>
          </View>

          {/* Section 1: Karakteristik Özet */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryTitleRow}>
              <Ionicons name="sparkles" size={16} color="#ea580c" />
              <Text style={styles.summaryTitleText}>Karakteristik Özet</Text>
            </View>
            <Text style={styles.summaryText}>
              {resultsData.message || 'Keşif tercihlerinize göre en uygun araç önerisi oluşturuldu.'}
            </Text>

            <View style={styles.profileSpecsRow}>
              <View style={styles.profileSpecBlock}>
                <Text style={styles.pLabel}>KASA TİPİ</Text>
                <Text style={styles.pVal}>
                  {resultsData.scoringProfile?.bodyTypeScores && Object.keys(resultsData.scoringProfile.bodyTypeScores)[0]
                    ? translateBodyType(Object.keys(resultsData.scoringProfile.bodyTypeScores)[0])
                    : resultsData.recommendation?.bodyType
                    ? translateBodyType(resultsData.recommendation.bodyType)
                    : 'SUV'}
                </Text>
              </View>
              <View style={styles.profileSpecBlock}>
                <Text style={styles.pLabel}>MOTOR/YAKIT</Text>
                <Text style={styles.pVal}>
                  {resultsData.scoringProfile?.fuelTypeScores && Object.keys(resultsData.scoringProfile.fuelTypeScores)[0]
                    ? translateFuelType(Object.keys(resultsData.scoringProfile.fuelTypeScores)[0])
                    : resultsData.recommendation?.fuelType
                    ? translateFuelType(resultsData.recommendation.fuelType)
                    : 'Elektrikli'}
                </Text>
              </View>
              <View style={styles.profileSpecBlock}>
                <Text style={styles.pLabel}>ŞANZIMAN</Text>
                <Text style={styles.pVal}>
                  {resultsData.scoringProfile?.transmissionScores &&
                  Object.keys(resultsData.scoringProfile.transmissionScores)[0]
                    ? translateTransmission(Object.keys(resultsData.scoringProfile.transmissionScores)[0])
                    : resultsData.recommendation?.transmissionType
                    ? translateTransmission(resultsData.recommendation.transmissionType)
                    : 'Otomatik'}
                </Text>
              </View>
            </View>
          </View>

          {/* Section 2: YAPAY ZEKA DESTEKLİ ARAÇ ÖNERİSİ */}
          {resultsData.recommendation && (
            <View style={styles.aiRecommendationCard}>
              <View style={styles.aiRecHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiRecSub}>YAPAY ZEKA DESTEKLİ ARAÇ ÖNERİSİ</Text>
                  <Text style={styles.aiRecTitle}>
                    {resultsData.recommendation.brandName} {resultsData.recommendation.modelName}{' '}
                    {resultsData.recommendation.generationName || ''}
                  </Text>
                </View>
                <View style={styles.aiRecPillsRow}>
                  {resultsData.recommendation.bodyType && (
                    <View style={styles.aiPillBadge}>
                      <Text style={styles.aiPillText}>{translateBodyType(resultsData.recommendation.bodyType)}</Text>
                    </View>
                  )}
                  {resultsData.recommendation.fuelType && (
                    <View style={styles.aiPillBadge}>
                      <Text style={styles.aiPillText}>{translateFuelType(resultsData.recommendation.fuelType)}</Text>
                    </View>
                  )}
                  {resultsData.recommendation.transmissionType && (
                    <View style={styles.aiPillBadge}>
                      <Text style={styles.aiPillText}>
                        {translateTransmission(resultsData.recommendation.transmissionType)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Status and Price Grid */}
              <View style={styles.aiRecInfoGrid}>
                <View style={styles.aiInfoBox}>
                  <Text style={styles.aiInfoLabel}>AKTİF İLAN DURUMU</Text>
                  <Text style={styles.aiInfoVal}>
                    {resultsData.recommendation.activeListingCount && resultsData.recommendation.activeListingCount > 0
                      ? `${resultsData.recommendation.activeListingCount} Adet Aktif Satış İlanı Mevcut`
                      : 'Şu Anda Aktif İlan Bulunmuyor'}
                  </Text>
                </View>

                <View style={styles.aiInfoBox}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.aiInfoLabel}>PİYASA FİYAT ARALIĞI</Text>
                    <Ionicons name="sparkles" size={14} color="#ea580c" />
                  </View>
                  <Text style={[styles.aiInfoVal, { color: '#ea580c', fontWeight: '900' }]}>
                    {resultsData.recommendation.minActivePrice && resultsData.recommendation.maxActivePrice
                      ? `${formatPrice(resultsData.recommendation.minActivePrice)} - ${formatPrice(
                          resultsData.recommendation.maxActivePrice
                        )}`
                      : 'Fiyat İlanlardan Hesaplanıyor'}
                  </Text>
                </View>
              </View>

              {/* Action Buttons in Card */}
              <View style={styles.aiRecActionsRow}>
                <TouchableOpacity
                  style={styles.aiPrimaryBtn}
                  onPress={() => {
                    const rec = resultsData.recommendation;
                    if (rec?.listingsQuery) {
                      router.push({
                        pathname: '/listings',
                        params: {
                          brandId: rec.listingsQuery.brandId,
                          modelId: rec.listingsQuery.modelId,
                        },
                      });
                    } else {
                      router.push('/listings');
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.aiPrimaryBtnText}>İlanlara Git</Text>
                  <Ionicons name="arrow-forward" size={16} color="#ffffff" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.aiSecondaryBtn}
                  onPress={() => {
                    if (resultsData.recommendation?.recommendedVariantId) {
                      router.push(`/reports/vehicle/${resultsData.recommendation.recommendedVariantId}` as any);
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="sparkles" size={15} color="#ea580c" />
                  <Text style={styles.aiSecondaryBtnText}>Yapay Zeka Araç Raporunu Gör</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Bottom Action Buttons (Matching Web 1:1) */}
          <View style={styles.bottomActionsRow}>
            {targetCount < 100 && (
              <TouchableOpacity style={styles.extendBtn} onPress={extendDiscovery} activeOpacity={0.85}>
                <Ionicons name="refresh" size={16} color="#0b192c" />
                <Text style={styles.extendBtnText}>20 Araç Daha Değerlendir</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.resetOutlinedBtn} onPress={resetDiscovery} activeOpacity={0.85}>
              <Ionicons name="refresh" size={16} color="#64748b" />
              <Text style={styles.resetOutlinedBtnText}>Seçimleri Sıfırla ve Yeniden Keşfet</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* 5. SWIPING LOADING FALLBACK */}
      {gameState === 'swiping' && !currentTopCard && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingText}>Sıradaki araç yükleniyor...</Text>
        </View>
      )}

      {/* 6. ERROR STATE */}
      {gameState === 'error' && (
        <View style={styles.cardBox}>
          <View style={[styles.introIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
            <Ionicons name="cloud-offline-outline" size={44} color="#ef4444" />
          </View>
          <Text style={styles.introTitle}>Bağlantı Kurulamadı</Text>
          <Text style={styles.introDesc}>
            Yapay zeka sunucusuna bağlanırken bir gecikme yaşandı. Lütfen tekrar deneyin.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={startDiscovery} activeOpacity={0.85}>
            <Ionicons name="refresh" size={18} color="#ffffff" />
            <Text style={styles.primaryBtnText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 7. EMPTY STATE */}
      {gameState === 'empty' && (
        <View style={styles.cardBox}>
          <View style={styles.introIconCircle}>
            <Ionicons name="checkmark-done-circle-outline" size={44} color="#ea580c" />
          </View>
          <Text style={styles.introTitle}>Tüm Araçlar Değerlendirildi</Text>
          <Text style={styles.introDesc}>
            Seçtiğiniz kriterlerdeki tüm araçlar incelendi. Yeni bir keşif oturumu başlatabilirsiniz.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={resetDiscovery} activeOpacity={0.85}>
            <Ionicons name="refresh" size={18} color="#ffffff" />
            <Text style={styles.primaryBtnText}>Yeni Keşif Başlat</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 8. FILTER MODAL */}
      <Modal visible={showFilterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Keşif Kriterleri</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Price Range */}
              <Text style={styles.filterSectionTitle}>FİYAT ARALIĞI (TL)</Text>
              <View style={styles.priceInputRow}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Min Fiyat"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={minPrice}
                  onChangeText={setMinPrice}
                />
                <TextInput
                  style={styles.priceInput}
                  placeholder="Max Fiyat"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                />
              </View>

              {/* Body Type */}
              <Text style={styles.filterSectionTitle}>KASA TİPİ</Text>
              <View style={styles.pillsWrap}>
                {bodyStyles.map((b) => {
                  const sel = selectedBodies.includes(b.key);
                  return (
                    <TouchableOpacity
                      key={b.key}
                      style={[styles.filterPill, sel && styles.filterPillSelected]}
                      onPress={() => toggleBody(b.key)}
                    >
                      <Text style={[styles.filterPillText, sel && styles.filterPillTextSelected]}>{b.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Fuel Type */}
              <Text style={styles.filterSectionTitle}>YAKIT TÜRÜ</Text>
              <View style={styles.pillsWrap}>
                {fuelOptions.map((f) => {
                  const sel = selectedFuels.includes(f.key);
                  return (
                    <TouchableOpacity
                      key={f.key}
                      style={[styles.filterPill, sel && styles.filterPillSelected]}
                      onPress={() => toggleFuel(f.key)}
                    >
                      <Text style={[styles.filterPillText, sel && styles.filterPillTextSelected]}>{f.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Transmission Type */}
              <Text style={styles.filterSectionTitle}>ŞANZIMAN</Text>
              <View style={styles.pillsWrap}>
                {transmissionOptions.map((t) => {
                  const sel = selectedTransmissions.includes(t.key);
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[styles.filterPill, sel && styles.filterPillSelected]}
                      onPress={() => toggleTrans(t.key)}
                    >
                      <Text style={[styles.filterPillText, sel && styles.filterPillTextSelected]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.applyBtn} onPress={applyFilters} activeOpacity={0.85}>
              <Text style={styles.applyBtnText}>Filtreleri Uygula</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '600',
  },
  cardBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 14,
    backgroundColor: '#f8fafc',
  },
  introIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  introTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0b192c',
    textAlign: 'center',
  },
  introDesc: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
    marginBottom: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ea580c',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 6,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  secondaryBtnText: {
    color: '#0b192c',
    fontSize: 13,
    fontWeight: '700',
  },
  filterOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 6,
    width: '100%',
    maxWidth: 320,
  },
  filterOutlineText: {
    color: '#ea580c',
    fontSize: 13,
    fontWeight: '700',
  },
  swipeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
    gap: 8,
  },
  miniFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  miniFilterText: {
    color: '#ea580c',
    fontSize: 11,
    fontWeight: '700',
  },
  progressCenter: {
    flex: 1,
    alignItems: 'center',
  },
  progressCounterText: {
    color: '#0b192c',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
  },
  progressBarTrack: {
    width: '100%',
    height: 5,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ea580c',
  },
  resetBtn: {
    padding: 6,
  },
  deckContainer: {
    width: SCREEN_WIDTH - 28,
    height: '76%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  underneathCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  topCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  choiceBadge: {
    position: 'absolute',
    top: 20,
    zIndex: 100,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 2,
  },
  likeBadge: {
    right: 20,
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  likeBadgeText: {
    color: '#10b981',
    fontWeight: '900',
    fontSize: 14,
  },
  dislikeBadge: {
    left: 20,
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  dislikeBadgeText: {
    color: '#ef4444',
    fontWeight: '900',
    fontSize: 14,
  },
  imageContainer: {
    height: 180,
    backgroundColor: '#f1f5f9',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#ea580c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  cardScroll: {
    flex: 1,
    padding: 14,
    backgroundColor: '#ffffff',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0b192c',
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 10,
    marginTop: 10,
    gap: 8,
  },
  specItem: {
    width: '30%',
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  specVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0b192c',
    marginTop: 2,
    textAlign: 'center',
  },
  aiInsightBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 6,
  },
  aiInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiInsightTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  aiInsightText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  highlightPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    padding: 8,
    borderRadius: 8,
  },
  highlightPillText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '700',
  },
  watchoutPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderWidth: 1,
    padding: 8,
    borderRadius: 8,
  },
  watchoutPillText: {
    color: '#d97706',
    fontSize: 10,
    fontWeight: '700',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    marginBottom: 20,
  },
  tagBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tagBadgeText: {
    color: '#475569',
    fontSize: 9,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 36,
    paddingVertical: 6,
  },
  circleBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  dislikeBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  likeBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  resultScroll: {
    padding: 16,
    gap: 16,
    backgroundColor: '#f8fafc',
  },
  resultHeader: {
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  sparkleBadge: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  sparkleBadgeText: {
    color: '#ea580c',
    fontSize: 10,
    fontWeight: '900',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0b192c',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryTitleText: {
    color: '#ea580c',
    fontSize: 13,
    fontWeight: '800',
  },
  summaryText: {
    color: '#334155',
    fontSize: 12,
    lineHeight: 18,
  },
  profileSpecsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  profileSpecBlock: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
  },
  pVal: {
    color: '#0b192c',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  sectionBox: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0b192c',
  },
  aiRecommendationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    gap: 14,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  aiRecHeader: {
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  aiRecSub: {
    color: '#ea580c',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  aiRecTitle: {
    color: '#0b192c',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  aiRecPillsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  aiPillBadge: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  aiPillText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
  },
  aiRecInfoGrid: {
    gap: 10,
  },
  aiInfoBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  aiInfoLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  aiInfoVal: {
    color: '#0b192c',
    fontSize: 13,
    fontWeight: '800',
  },
  aiRecActionsRow: {
    flexDirection: 'column',
    gap: 10,
    paddingTop: 4,
  },
  aiPrimaryBtn: {
    backgroundColor: '#ea580c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  aiPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  aiSecondaryBtn: {
    backgroundColor: '#0b192c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  aiSecondaryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  bottomActionsRow: {
    gap: 10,
    marginTop: 8,
    marginBottom: 24,
  },
  extendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  extendBtnText: {
    color: '#0b192c',
    fontSize: 14,
    fontWeight: '800',
  },
  resetOutlinedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  resetOutlinedBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#0b192c',
    fontSize: 17,
    fontWeight: '900',
  },
  filterSectionTitle: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  priceInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priceInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#0b192c',
    fontSize: 13,
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterPill: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  filterPillSelected: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  filterPillText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  filterPillTextSelected: {
    color: '#ea580c',
    fontWeight: '800',
  },
  applyBtn: {
    backgroundColor: '#ea580c',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
