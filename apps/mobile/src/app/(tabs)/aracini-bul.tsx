import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, Alert, Animated, PanResponder, Dimensions, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://used-car-api-hzmu.onrender.com';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;

interface Card {
  id: string;
  brand: string;
  modelFamily: string;
  generationName: string | null;
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
}

interface PreferenceProfile {
  id: string;
  totalSwipes: number;
  likeCount: number;
  dislikeCount: number;
  confidenceLevel: string;
  resultSummary: string;
  topBodyTypes: string[];
  topFuelTypes: string[];
  topTransmissionTypes: string[];
  topBrands: string[];
}

export default function SwipeGameScreen() {
  const router = useRouter();
  const [gameState, setGameState] = useState<'intro' | 'loading' | 'swiping' | 'result' | 'empty' | 'error'>('intro');
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [nextCardCache, setNextCardCache] = useState<Card | null>(null);
  const [swipesCount, setSwipesCount] = useState(0);
  const [profile, setProfile] = useState<PreferenceProfile | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [token, setToken] = useState<string | null>(null);

  // Animated values for card swipe
  const pan = useRef(new Animated.ValueXY()).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    initSession();
  }, []);

  const initSession = async () => {
    setGameState('loading');
    try {
      const savedToken = await AsyncStorage.getItem('accessToken');
      setToken(savedToken);

      let savedSessionId = await AsyncStorage.getItem('discoverySessionId');
      if (!savedSessionId) {
        savedSessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        await AsyncStorage.setItem('discoverySessionId', savedSessionId);
      }
      setSessionId(savedSessionId);

      // Check existing progress
      const headers: any = {};
      if (savedToken) headers['Authorization'] = `Bearer ${savedToken}`;
      
      const profileRes = await fetch(`${API_URL}/vehicle-discovery/profile/${savedSessionId}`, { headers });
      if (profileRes.ok) {
        const data = await profileRes.json();
        setSwipesCount(data.totalSwipes);
        if (data.totalSwipes >= 30) {
          setProfile(data);
          setGameState('result');
          return;
        }
      }
      setGameState('intro');
    } catch (e) {
      console.error(e);
      setGameState('error');
    }
  };

  const startDiscovery = async () => {
    setGameState('loading');
    await fetchNextCard(true);
  };

  const resetDiscovery = async () => {
    setGameState('loading');
    try {
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`${API_URL}/vehicle-discovery/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ sessionId }),
      });

      setSwipesCount(0);
      setProfile(null);
      setCurrentCard(null);
      setNextCardCache(null);
      await fetchNextCard(true);
    } catch (e) {
      console.error(e);
      setGameState('error');
    }
  };

  const fetchNextCard = async (initiateStateChange = false) => {
    try {
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/vehicle-discovery/cards/next?sessionId=${sessionId}`, { headers });
      
      if (!res.ok) {
        setGameState('error');
        return;
      }

      const text = await res.text();
      const card = text ? JSON.parse(text) : null;

      if (!card) {
        if (initiateStateChange) {
          await checkProfileResults();
        } else {
          setNextCardCache(null);
        }
        return;
      }

      if (initiateStateChange) {
        setCurrentCard(card);
        setGameState('swiping');
        // Reset animated values
        pan.setValue({ x: 0, y: 0 });
        cardOpacity.setValue(1);
        // Pre-fetch next card
        fetchNextCard(false);
      } else {
        setNextCardCache(card);
      }
    } catch (e) {
      console.error(e);
      setGameState('error');
    }
  };

  const checkProfileResults = async () => {
    try {
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/vehicle-discovery/profile/${sessionId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setSwipesCount(data.totalSwipes);
        setGameState('result');
      } else {
        setGameState('empty');
      }
    } catch (e) {
      console.error(e);
      setGameState('error');
    }
  };

  const handleSwipeResponse = async (action: 'LIKE' | 'DISLIKE') => {
    if (!currentCard) return;

    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/vehicle-discovery/swipe`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId,
          cardId: currentCard.id,
          action,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSwipesCount(data.totalSwipes);

        if (data.totalSwipes >= 50) {
          await checkProfileResults();
          return;
        }

        // Load cached card
        if (nextCardCache) {
          setCurrentCard(nextCardCache);
          pan.setValue({ x: 0, y: 0 });
          cardOpacity.setValue(1);
          setNextCardCache(null);
          fetchNextCard(false);
        } else {
          await fetchNextCard(true);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Tinder pan responder setup
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swipe Right (Like)
          Animated.timing(pan, {
            toValue: { x: SCREEN_WIDTH + 100, y: gestureState.dy },
            duration: 200,
            useNativeDriver: false,
          }).start(() => handleSwipeResponse('LIKE'));
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swipe Left (Dislike)
          Animated.timing(pan, {
            toValue: { x: -SCREEN_WIDTH - 100, y: gestureState.dy },
            duration: 200,
            useNativeDriver: false,
          }).start(() => handleSwipeResponse('DISLIKE'));
        } else {
          // Snap back
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 4,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Rotation styling interpolation
  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const cardStyle = {
    transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
    opacity: cardOpacity,
  };

  const likeOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const dislikeOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* 1. INTRO STATE */}
      {gameState === 'intro' && (
        <View style={styles.cardBox}>
          <Ionicons name="car-sport" size={60} color="#f97316" />
          <Text style={styles.introTitle}>Aracını Bul</Text>
          <Text style={styles.introDesc}>
            Nasıl bir araç istediğinden emin değil misin? Karşına gelen araç kartlarını sağa ve sola kaydırarak tarzına en uygun araç grubunu yapay zekanın bulmasını sağla.
          </Text>
          
          <View style={styles.btnCol}>
            {swipesCount > 0 && swipesCount < 30 ? (
              <>
                <TouchableOpacity style={styles.primaryBtn} onPress={startDiscovery}>
                  <Text style={styles.primaryBtnText}>Kaldığın Yerden Devam Et ({swipesCount} / 30)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={resetDiscovery}>
                  <Text style={styles.secondaryBtnText}>Sıfırla ve Yeniden Başla</Text>
                </TouchableOpacity>
              </>
            ) : swipesCount >= 30 ? (
              <>
                <TouchableOpacity style={styles.primaryBtn} onPress={checkProfileResults}>
                  <Text style={styles.primaryBtnText}>Tercih Raporumu Gör</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={resetDiscovery}>
                  <Text style={styles.secondaryBtnText}>Sıfırla ve Yeniden Başla</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.primaryBtn} onPress={startDiscovery}>
                <Text style={styles.primaryBtnText}>Keşfe Başla</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* 2. LOADING STATE */}
      {gameState === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      )}

      {/* 3. SWIPING STATE */}
      {gameState === 'swiping' && currentCard && (
        <View style={styles.swipingContainer}>
          <Text style={styles.progressText}>Değerlendirme Aşaması: {swipesCount} / 30</Text>
          
          <Animated.View {...panResponder.panHandlers} style={[styles.card, cardStyle]}>
            {/* Swiping Indicator Badges */}
            <Animated.View style={[styles.swipeBadge, styles.likeBadge, { opacity: likeOpacity }]}>
              <Text style={styles.likeBadgeText}>BEĞENDİM</Text>
            </Animated.View>
            <Animated.View style={[styles.swipeBadge, styles.dislikeBadge, { opacity: dislikeOpacity }]}>
              <Text style={styles.dislikeBadgeText}>RETTET</Text>
            </Animated.View>

            <Image source={{ uri: currentCard.imageUrl }} style={styles.cardImage} resizeMode="cover" />
            
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{currentCard.brand} {currentCard.modelFamily}</Text>
              
              <View style={styles.cardSpecsGrid}>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Kasa</Text>
                  <Text style={styles.specVal}>{currentCard.bodyType}</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Yakıt</Text>
                  <Text style={styles.specVal}>{currentCard.fuelType}</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Şanzıman</Text>
                  <Text style={styles.specVal}>{currentCard.transmissionType}</Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Tüketim</Text>
                  <Text style={styles.specVal}>{currentCard.averageConsumption}</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Swipe Buttons Bar */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.circleBtn, styles.dislikeBtn]} onPress={() => {
              Animated.timing(pan, {
                toValue: { x: -SCREEN_WIDTH - 100, y: 0 },
                duration: 200,
                useNativeDriver: false,
              }).start(() => handleSwipeResponse('DISLIKE'));
            }}>
              <Ionicons name="close" size={28} color="#ef4444" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.circleBtn, styles.likeBtn]} onPress={() => {
              Animated.timing(pan, {
                toValue: { x: SCREEN_WIDTH + 100, y: 0 },
                duration: 200,
                useNativeDriver: false,
              }).start(() => handleSwipeResponse('LIKE'));
            }}>
              <Ionicons name="heart" size={28} color="#10b981" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 4. RESULTS STATE */}
      {gameState === 'result' && profile && (
        <ScrollView contentContainerStyle={styles.resultScroll}>
          <View style={styles.resultHeader}>
            <Text style={styles.badgeText}>🏆 TERCİH PROFİLİNİZ</Text>
            <Text style={styles.resultTitle}>
              {swipesCount >= 50 ? 'Profiliniz Güçlendirildi' : 'Tercih Analiziniz Tamamlandı'}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="sparkles" size={16} color="#f97316" style={styles.sparkle} />
            <Text style={styles.summaryText}>{profile.resultSummary}</Text>
          </View>

          <View style={styles.specsRow}>
            <View style={styles.specBlock}>
              <Text style={styles.blockLabel}>KASA TERCİHİ</Text>
              <Text style={styles.blockVal}>{profile.topBodyTypes[0] || '-'}</Text>
            </View>
            <View style={styles.specBlock}>
              <Text style={styles.blockLabel}>YAKIT TERCİHİ</Text>
              <Text style={styles.blockVal}>{profile.topFuelTypes[0] || '-'}</Text>
            </View>
            <View style={styles.specBlock}>
              <Text style={styles.blockLabel}>ŞANZIMAN</Text>
              <Text style={styles.blockVal}>{profile.topTransmissionTypes[0] || '-'}</Text>
            </View>
          </View>

          {profile.topBrands.length > 0 && (
            <View style={styles.brandsBox}>
              <Text style={styles.brandsBoxLabel}>Sana Yakın Markalar</Text>
              <View style={styles.brandsRow}>
                {profile.topBrands.map((brand) => (
                  <View key={brand} style={styles.brandBadge}>
                    <Text style={styles.brandBadgeText}>{brand}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.btnCol}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push({ pathname: '/listings', params: { preferenceProfileId: profile.id } })}>
              <Text style={styles.primaryBtnText}>Uygun İlanları Gör</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={resetDiscovery}>
              <Ionicons name="refresh" size={18} color="#94a3b8" />
              <Text style={styles.secondaryBtnText}>Sıfırla ve Yeniden Başla</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* 5. EMPTY STATE */}
      {gameState === 'empty' && (
        <View style={styles.cardBox}>
          <Ionicons name="alert-circle-outline" size={60} color="#64748b" />
          <Text style={styles.introTitle}>Gösterilecek Araç Kalmadı</Text>
          <Text style={styles.introDesc}>
            Tüm araç kartları değerlendirildi. İlanları mevcut profilinize göre sıralı görmek için devam edin.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={resetDiscovery}>
            <Text style={styles.primaryBtnText}>Seçimleri Sıfırla ve Yeniden Başla</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 12,
  },
  cardBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f8fafc',
    textAlign: 'center',
  },
  introDesc: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  btnCol: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#f97316',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
  },
  secondaryBtnText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
  },
  swipingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  progressText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.58,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 5,
  },
  cardImage: {
    width: '100%',
    height: '65%',
  },
  cardInfo: {
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
  },
  cardSpecsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specItem: {
    width: (SCREEN_WIDTH - 76) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 8,
  },
  specLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
  },
  specVal: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 24,
  },
  circleBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  dislikeBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  likeBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  swipeBadge: {
    position: 'absolute',
    top: 30,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
    zIndex: 100,
  },
  likeBadge: {
    left: 30,
    borderColor: '#10b981',
    transform: [{ rotate: '-15deg' }],
  },
  likeBadgeText: {
    color: '#10b981',
    fontWeight: '900',
    fontSize: 16,
  },
  dislikeBadge: {
    right: 30,
    borderColor: '#ef4444',
    transform: [{ rotate: '15deg' }],
  },
  dislikeBadgeText: {
    color: '#ef4444',
    fontWeight: '900',
    fontSize: 16,
  },
  resultScroll: {
    padding: 20,
    gap: 20,
  },
  resultHeader: {
    alignItems: 'center',
    gap: 8,
  },
  badgeText: {
    color: '#f97316',
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#f8fafc',
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 16,
    position: 'relative',
  },
  sparkle: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  summaryText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 20,
    paddingRight: 16,
  },
  specsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  specBlock: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  blockLabel: {
    color: '#64748b',
    fontSize: 8,
    fontWeight: '700',
  },
  blockVal: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  brandsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  brandsBoxLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  brandsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  brandBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderColor: 'rgba(249, 115, 22, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  brandBadgeText: {
    color: '#f97316',
    fontSize: 12,
    fontWeight: '700',
  },
});
