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
  Image,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
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

interface RecommendationResult {
  message: string;
  scoringProfile?: {
    bodyTypeScores?: Record<string, number>;
    fuelTypeScores?: Record<string, number>;
    transmissionScores?: Record<string, number>;
    brandScores?: Record<string, number>;
    modelFamilyScores?: Record<string, number>;
  };
  recommendations: RecommendedVariant[];
}

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

  const [currentCard, setCurrentCard] = useState<DiscoveryCard | null>(null);
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);

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
    const savedGuestToken = guestToken || (await AsyncStorage.getItem('discoveryGuestToken'));
    if (savedGuestToken) {
      headers['x-guest-token'] = savedGuestToken;
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
          setCurrentIndex(sess.currentIndex || 0);
          setSessionVersion(sess.version || 0);
          setTargetCount(sess.targetCount || 20);
          setWarningMessage(data.warning || null);

          if (sess.status === 'COMPLETED') {
            await loadResults(sess.id);
            return sess.id;
          }

          // Pre-cache all session images in parallel for instant 0ms transitions
          if (sess.items && Array.isArray(sess.items)) {
            sess.items.forEach((it: any) => {
              const cardData = it.card || it;
              const img = resolveVehicleImageUrl(
                cardData?.imageUrl,
                cardData?.brand,
                cardData?.modelFamily || cardData?.model,
                cardData?.generationName
              );
              if (img) {
                Image.prefetch(img).catch(() => {});
              }
            });
          }

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
    setGameState('loading');
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      activeSessionId = await init();
    }
    if (activeSessionId) {
      await fetchNextCard(activeSessionId);
    } else {
      setGameState('error');
    }
  };

  const resetDiscovery = async () => {
    setGameState('loading');
    try {
      const activeSessionId = sessionId;

      // 1. If active session exists, fast-retire remaining cards so server marks it COMPLETED
      if (activeSessionId) {
        try {
          let curr = currentIndex;
          let ver = sessionVersion;
          while (curr < targetCount && curr < 25) {
            const nextRes = await customFetch(`${API_URL}/vehicle-discovery/sessions/${activeSessionId}/next`);
            if (!nextRes.ok) break;
            const nextData = await nextRes.json();
            if (nextData.status === 'COMPLETED' || !nextData.card) break;

            const swipeRes = await customFetch(`${API_URL}/vehicle-discovery/sessions/${activeSessionId}/swipes`, {
              method: 'POST',
              body: JSON.stringify({
                cardId: nextData.card.id,
                action: 'DISLIKE',
                version: nextData.version ?? ver,
              }),
            });
            if (!swipeRes.ok) break;
            const swipeData = await swipeRes.json();
            if (swipeData.status === 'COMPLETED') break;
            curr++;
            ver = (nextData.version ?? ver) + 1;
          }
        } catch (e) {
          console.log('Session retirement error:', e);
        }
      }

      // 2. Clear local guest tokens and filters
      await AsyncStorage.removeItem('discoveryGuestToken');
      setGuestToken('');
      setMinPrice('');
      setMaxPrice('');
      setSelectedBodies([]);
      setSelectedFuels([]);
      setSelectedTransmissions([]);
      setWarningMessage(null);
      setResultsData(null);
      setCurrentCard(null);

      // 3. Request fresh brand new session (Server will now create new 0/20 session)
      const res = await customFetch(`${API_URL}/vehicle-discovery/sessions`, {
        method: 'POST',
        body: JSON.stringify({ filters: {}, forceNew: true }),
      });

      if (res.ok) {
        const data = await res.json();
        const sess = data.session;
        if (sess) {
          setSessionId(sess.id);
          setCurrentIndex(sess.currentIndex || 0);
          setSessionVersion(sess.version || 0);
          setTargetCount(sess.targetCount || 20);

          // Pre-cache all fresh images
          if (sess.items && Array.isArray(sess.items)) {
            sess.items.forEach((it: any) => {
              const cardData = it.card || it;
              const img = resolveVehicleImageUrl(
                cardData?.imageUrl,
                cardData?.brand,
                cardData?.modelFamily || cardData?.model,
                cardData?.generationName
              );
              if (img) {
                Image.prefetch(img).catch(() => {});
              }
            });
          }

          await fetchNextCard(sess.id);
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
        setCurrentIndex(data.session.currentIndex);
        setSessionVersion(data.session.version);
        setWarningMessage(data.warning);
        await fetchNextCard(sessionId);
      } else {
        setGameState('error');
      }
    } catch (e) {
      console.error('Error applyFilters:', e);
      setGameState('error');
    }
  };

  const fetchNextCard = async (targetSessionId?: string) => {
    const sId = targetSessionId || sessionId;
    if (!sId) {
      setGameState('error');
      return;
    }

    try {
      const res = await customFetch(`${API_URL}/vehicle-discovery/sessions/${sId}/next`);

      if (!res.ok) {
        setGameState('error');
        return;
      }

      const data = await res.json();
      if (data.status === 'COMPLETED' || !data.card) {
        await loadResults(sId);
        return;
      }

      const raw = data.card;
      const formattedCard: DiscoveryCard = {
        id: raw.id,
        vehicleProfileId: raw.vehicleProfileId,
        displayName: raw.displayName || `${raw.brand} ${raw.modelFamily}`,
        brand: raw.brand || '',
        modelFamily: raw.modelFamily || '',
        generationName: raw.generationName || null,
        bodyType: raw.bodyType || 'Sedan',
        fuelType: raw.fuelType || 'Benzin',
        transmissionType: raw.transmissionType || 'Otomatik',
        engineVersion: raw.engineVersion || '',
        power: raw.power || '',
        torque: raw.torque || '',
        productionYears: raw.productionYears || '',
        averageConsumption: raw.averageConsumption || '',
        drivetrain: raw.drivetrain || '',
        imageUrl: resolveVehicleImageUrl(raw.imageUrl, raw.brand, raw.modelFamily, raw.generationName),
        tags: Array.isArray(raw.tags) ? raw.tags : [],
        discoverySummary: raw.discoverySummary,
        guideSummary: raw.guideSummary,
        highlight: raw.highlight,
        discoveryHighlight: raw.discoveryHighlight,
        watchout: raw.watchout,
        discoveryWatchout: raw.discoveryWatchout,
      };

      if (formattedCard.imageUrl) {
        Image.prefetch(formattedCard.imageUrl).catch(() => {});
      }

      setCurrentCard(formattedCard);
      setCurrentIndex(data.currentIndex || 0);
      setSessionVersion(data.version || 0);
      setGameState('swiping');

      pan.setValue({ x: 0, y: 0 });
      cardOpacity.setValue(1);
    } catch (e) {
      console.error('Error fetchNextCard:', e);
      setGameState('error');
    }
  };

  // Refs to avoid stale closures in PanResponder
  const currentCardRef = useRef<DiscoveryCard | null>(null);
  currentCardRef.current = currentCard;
  const sessionIdRef = useRef<string>('');
  sessionIdRef.current = sessionId;
  const sessionVersionRef = useRef<number>(0);
  sessionVersionRef.current = sessionVersion;

  // Animated values for card swipe
  const pan = useRef(new Animated.ValueXY()).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;

  // Tinder pan responder with smooth gesture capture and zero offset bugs
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
        pan.setValue({ x: gestureState.dx, y: gestureState.dy * 0.2 });
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD || gestureState.vx > 0.4) {
          handleSwipe('right');
        } else if (gestureState.dx < -SWIPE_THRESHOLD || gestureState.vx < -0.4) {
          handleSwipe('left');
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: false,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          friction: 5,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const handleSwipe = (direction: 'left' | 'right') => {
    const card = currentCardRef.current;
    const sId = sessionIdRef.current;
    const ver = sessionVersionRef.current;

    if (!card || !sId) return;
    const action = direction === 'right' ? 'LIKE' : 'DISLIKE';

    // Animate card offscreen
    Animated.timing(pan, {
      toValue: { x: direction === 'right' ? SCREEN_WIDTH + 150 : -SCREEN_WIDTH - 150, y: 0 },
      duration: 180,
      useNativeDriver: false,
    }).start(async () => {
      // Instantly reset pan position for the new incoming card
      pan.stopAnimation();
      pan.setOffset({ x: 0, y: 0 });
      pan.setValue({ x: 0, y: 0 });
      cardOpacity.setValue(1);

      try {
        const res = await customFetch(`${API_URL}/vehicle-discovery/sessions/${sId}/swipes`, {
          method: 'POST',
          body: JSON.stringify({
            cardId: card.id,
            action,
            version: ver,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.status === 'COMPLETED') {
            await loadResults(sId);
          } else {
            await fetchNextCard(sId);
          }
        } else {
          await fetchNextCard(sId);
        }
      } catch (e) {
        console.error('Error handleSwipe:', e);
        await fetchNextCard(sId);
      }
    });
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
    outputRange: ['-10deg', '0deg', '10deg'],
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

  const toggleBody = (key: string) => {
    setSelectedBodies((prev) => (prev.includes(key) ? prev.filter((b) => b !== key) : [...prev, key]));
  };

  const toggleFuel = (key: string) => {
    setSelectedFuels((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));
  };

  const toggleTrans = (key: string) => {
    setSelectedTransmissions((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]));
  };

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

      {/* 3. SWIPING STATE */}
      {gameState === 'swiping' && currentCard && (
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

          {/* Swipe Card */}
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.card,
              {
                transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
                opacity: cardOpacity,
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

            {/* Photo Header */}
            <View style={styles.imageContainer}>
              {currentCard.imageUrl ? (
                <Image
                  source={{ uri: currentCard.imageUrl }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.cardImage, styles.placeholderImage]}>
                  <Ionicons name="car-outline" size={54} color="#64748b" />
                </View>
              )}
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>{currentCard.brand.toUpperCase()}</Text>
              </View>
            </View>

            {/* Content Scroll */}
            <ScrollView style={styles.cardScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.cardTitle}>{currentCard.displayName || `${currentCard.brand} ${currentCard.modelFamily}`}</Text>
              <Text style={styles.cardSubtitle}>
                {currentCard.generationName ? `${currentCard.generationName} • ` : ''}
                {currentCard.productionYears || ''}
              </Text>

              {/* Specification Grid (2x3) */}
              <View style={styles.specGrid}>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Kasa Tipi</Text>
                  <Text style={styles.specVal}>{translateBodyType(currentCard.bodyType)}</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Yakıt</Text>
                  <Text style={styles.specVal}>{translateFuelType(currentCard.fuelType)}</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Şanzıman</Text>
                  <Text style={styles.specVal}>{translateTransmission(currentCard.transmissionType)}</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Motor</Text>
                  <Text style={styles.specVal}>{currentCard.engineVersion || '-'}</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Güç / Tork</Text>
                  <Text style={styles.specVal}>
                    {currentCard.power || '-'} / {currentCard.torque || '-'}
                  </Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Ort. Tüketim</Text>
                  <Text style={styles.specVal}>{currentCard.averageConsumption || '-'}</Text>
                </View>
              </View>

              {/* BU ARAÇ NASIL? Section */}
              {(currentCard.discoverySummary || currentCard.guideSummary) && (
                <View style={styles.aiInsightBox}>
                  <View style={styles.aiInsightHeader}>
                    <Ionicons name="sparkles" size={14} color="#ea580c" />
                    <Text style={styles.aiInsightTitle}>BU ARAÇ NASIL?</Text>
                  </View>
                  <Text style={styles.aiInsightText}>
                    {currentCard.discoverySummary || currentCard.guideSummary}
                  </Text>

                  {(currentCard.highlight || currentCard.discoveryHighlight) && (
                    <View style={styles.highlightPill}>
                      <Text style={styles.highlightPillText}>
                        ✓ ÖNE ÇIKAN: {currentCard.highlight || currentCard.discoveryHighlight}
                      </Text>
                    </View>
                  )}

                  {(currentCard.watchout || currentCard.discoveryWatchout) && (
                    <View style={styles.watchoutPill}>
                      <Text style={styles.watchoutPillText}>
                        ⚠ DİKKAT: {currentCard.watchout || currentCard.discoveryWatchout}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Tags */}
              {currentCard.tags && currentCard.tags.length > 0 && (
                <View style={styles.tagsRow}>
                  {currentCard.tags.map((t) => (
                    <View key={t} style={styles.tagBadge}>
                      <Text style={styles.tagBadgeText}>#{t.replace(/^#/, '')}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </Animated.View>

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

      {/* 4. RESULTS STATE (3 SECTIONS 1:1 WITH WEB) */}
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
            <Text style={styles.summaryText}>{resultsData.message}</Text>

            {resultsData.scoringProfile && (
              <View style={styles.profileSpecsRow}>
                <View style={styles.profileSpecBlock}>
                  <Text style={styles.pLabel}>KASA TİPİ</Text>
                  <Text style={styles.pVal}>
                    {resultsData.scoringProfile.bodyTypeScores && Object.keys(resultsData.scoringProfile.bodyTypeScores)[0]
                      ? translateBodyType(Object.keys(resultsData.scoringProfile.bodyTypeScores)[0])
                      : '-'}
                  </Text>
                </View>
                <View style={styles.profileSpecBlock}>
                  <Text style={styles.pLabel}>YAKIT</Text>
                  <Text style={styles.pVal}>
                    {resultsData.scoringProfile.fuelTypeScores && Object.keys(resultsData.scoringProfile.fuelTypeScores)[0]
                      ? translateFuelType(Object.keys(resultsData.scoringProfile.fuelTypeScores)[0])
                      : '-'}
                  </Text>
                </View>
                <View style={styles.profileSpecBlock}>
                  <Text style={styles.pLabel}>ŞANZIMAN</Text>
                  <Text style={styles.pVal}>
                    {resultsData.scoringProfile.transmissionScores &&
                    Object.keys(resultsData.scoringProfile.transmissionScores)[0]
                      ? translateTransmission(Object.keys(resultsData.scoringProfile.transmissionScores)[0])
                      : '-'}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Section 2: Önerilen Araç Modelleri */}
          <View style={styles.sectionBox}>
            <View style={styles.sectionHeader}>
              <Ionicons name="car-sport-outline" size={18} color="#ea580c" />
              <Text style={styles.sectionHeaderText}>Önerilen Araç Modelleri</Text>
            </View>

            {resultsData.recommendations.map((v) => (
              <View key={v.id} style={styles.recommendedCard}>
                <Text style={styles.recBrand}>{v.brand.name.toUpperCase()}</Text>
                <Text style={styles.recModel}>
                  {v.model.name} {v.trim?.name || ''}
                </Text>

                {v.priceSnapshot && (
                  <View style={styles.priceTagBox}>
                    <Text style={styles.priceTagLabel}>Piyasa Fiyat Tahmini</Text>
                    <Text style={styles.priceTagVal}>
                      {formatPrice(v.priceSnapshot.estimatedMin)} - {formatPrice(v.priceSnapshot.estimatedMax)}
                    </Text>
                  </View>
                )}

                <View style={styles.recSpecsRow}>
                  <View style={styles.miniPill}>
                    <Text style={styles.miniPillText}>{v.engine?.name || 'Standart'}</Text>
                  </View>
                  <View style={styles.miniPill}>
                    <Text style={styles.miniPillText}>
                      {v.transmission ? `${v.transmission.speeds} İleri ${translateTransmission(v.transmission.type)}` : '-'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Section 3: Uygun Canlı İlanlar */}
          <View style={styles.sectionBox}>
            <View style={styles.sectionHeader}>
              <Ionicons name="newspaper-outline" size={18} color="#ea580c" />
              <Text style={styles.sectionHeaderText}>Önerilen Araçlara Uyan Canlı İlanlar</Text>
            </View>

            {resultsData.recommendations.flatMap((v) => v.listings).length > 0 ? (
              resultsData.recommendations
                .flatMap((v) => v.listings)
                .map((listing) => (
                  <TouchableOpacity
                    key={listing.id}
                    style={styles.listingCard}
                    onPress={() => router.push({ pathname: '/listings', params: { listingId: listing.id } })}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: formatCloudflareImageUrl(listing.media?.[0]?.url) }}
                      style={styles.listingImg}
                      resizeMode="cover"
                    />
                    <View style={styles.listingInfo}>
                      <Text style={styles.listingTitle} numberOfLines={1}>
                        {listing.title}
                      </Text>
                      <Text style={styles.listingSub}>
                        {listing.modelYear} • {listing.kilometers?.toLocaleString('tr-TR')} KM • {listing.city}
                      </Text>
                      <Text style={styles.listingPrice}>{formatPrice(listing.priceAmount)}</Text>
                    </View>
                  </TouchableOpacity>
                ))
            ) : (
              <View style={styles.emptyListingsBox}>
                <Ionicons name="information-circle-outline" size={24} color="#64748b" />
                <Text style={styles.emptyListingsText}>Bu kriterlere uyan aktif satış ilanı bulunamadı.</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionCol}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/listings')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Tüm İlanları Gör</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={resetDiscovery} activeOpacity={0.85}>
              <Ionicons name="refresh" size={18} color="#94a3b8" />
              <Text style={styles.secondaryBtnText}>Sıfırla ve Yeniden Başla</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* 5. SWIPING LOADING FALLBACK */}
      {gameState === 'swiping' && !currentCard && (
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
    backgroundColor: '#030712',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
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
  },
  introIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(234, 88, 12, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  introTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#f8fafc',
    textAlign: 'center',
  },
  introDesc: {
    color: '#94a3b8',
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
    borderRadius: 14,
    gap: 8,
    width: '100%',
    maxWidth: 320,
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 6,
    width: '100%',
    maxWidth: 320,
  },
  secondaryBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
  },
  filterOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(234, 88, 12, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.25)',
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
    backgroundColor: '#0c1224',
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
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
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ea580c',
  },
  resetBtn: {
    padding: 6,
  },
  card: {
    width: SCREEN_WIDTH - 28,
    height: '76%',
    backgroundColor: '#0c1224',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
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
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
  },
  likeBadgeText: {
    color: '#10b981',
    fontWeight: '900',
    fontSize: 14,
  },
  dislikeBadge: {
    left: 20,
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  dislikeBadgeText: {
    color: '#ef4444',
    fontWeight: '900',
    fontSize: 14,
  },
  imageContainer: {
    height: 180,
    backgroundColor: '#020617',
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
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#f8fafc',
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
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
    color: '#e2e8f0',
    marginTop: 2,
    textAlign: 'center',
  },
  aiInsightBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
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
    color: '#cbd5e1',
    lineHeight: 16,
  },
  highlightPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    padding: 8,
    borderRadius: 8,
  },
  highlightPillText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '700',
  },
  watchoutPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    padding: 8,
    borderRadius: 8,
  },
  watchoutPillText: {
    color: '#fbbf24',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagBadgeText: {
    color: '#94a3b8',
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
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  dislikeBtn: {
    backgroundColor: '#0c1224',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  likeBtn: {
    backgroundColor: '#0c1224',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  resultScroll: {
    padding: 16,
    gap: 16,
  },
  resultHeader: {
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  sparkleBadge: {
    backgroundColor: 'rgba(234, 88, 12, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.3)',
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
    color: '#f8fafc',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#0c1224',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
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
    color: '#cbd5e1',
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
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  pLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
  },
  pVal: {
    color: '#f8fafc',
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
    color: '#f8fafc',
  },
  recommendedCard: {
    backgroundColor: '#0c1224',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  recBrand: {
    color: '#ea580c',
    fontSize: 9,
    fontWeight: '900',
  },
  recModel: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
  },
  priceTagBox: {
    backgroundColor: 'rgba(234, 88, 12, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.2)',
    padding: 8,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 4,
  },
  priceTagLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
  },
  priceTagVal: {
    color: '#ea580c',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },
  recSpecsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  miniPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  miniPillText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
  listingCard: {
    flexDirection: 'row',
    backgroundColor: '#0c1224',
    borderRadius: 14,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  listingImg: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#020617',
  },
  listingInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  listingTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
  },
  listingSub: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
  },
  listingPrice: {
    color: '#ea580c',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  emptyListingsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  emptyListingsText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  actionCol: {
    gap: 10,
    marginVertical: 14,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0c1224',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#f8fafc',
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
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#f8fafc',
    fontSize: 13,
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  filterPillSelected: {
    backgroundColor: 'rgba(234, 88, 12, 0.15)',
    borderColor: '#ea580c',
  },
  filterPillText: {
    color: '#94a3b8',
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
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
