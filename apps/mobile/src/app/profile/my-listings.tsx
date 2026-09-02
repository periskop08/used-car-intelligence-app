import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

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

interface ListingItem {
  id: string;
  title: string;
  price: number;
  currency?: string;
  year?: number;
  mileage?: number;
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'SOLD' | 'PASSIVE';
  publishedAt?: string;
  createdAt?: string;
  brand?: { name: string };
  model?: { name: string };
  media?: Array<{ mediaUrl: string }>;
  photos?: Array<{ photoUrl?: string; url?: string }>;
}

export default function MyListingsScreen() {
  const router = useRouter();
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quota, setQuota] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING' | 'PASSIVE'>('ACTIVE');

  useFocusEffect(
    useCallback(() => {
      fetchMyListings();
    }, [])
  );

  const fetchMyListings = async () => {
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));

      if (!token) {
        Alert.alert('Giriş Yapın', 'İlanlarınızı görmek için lütfen giriş yapın.', [
          { text: 'Tamam', onPress: () => router.push('/login' as any) },
        ]);
        setLoading(false);
        return;
      }

      const [listRes, quotaRes] = await Promise.all([
        fetch(`${API_URL}/me/listings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/me/listing-quota`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (listRes.ok) {
        const data = await listRes.json();
        setListings(Array.isArray(data) ? data : data.items || []);
      }

      if (quotaRes.ok) {
        const qData = await quotaRes.json();
        setQuota(qData);
      }
    } catch (e) {
      console.error('Fetch my listings error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyListings();
  };

  const filteredListings = listings.filter((l) => {
    if (activeTab === 'ACTIVE') return l.status === 'ACTIVE';
    if (activeTab === 'PENDING') return l.status === 'PENDING_APPROVAL';
    return l.status === 'PASSIVE' || l.status === 'SOLD' || l.status === 'REJECTED';
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { text: 'YAYINDA', bg: '#dcfce7', color: '#16a34a' };
      case 'PENDING_APPROVAL':
        return { text: 'ONAY BEKLİYOR', bg: '#fef3c7', color: '#d97706' };
      case 'REJECTED':
        return { text: 'REDDEDİLDİ', bg: '#fee2e2', color: '#dc2626' };
      case 'SOLD':
        return { text: 'SATILDI', bg: '#f1f5f9', color: '#64748b' };
      default:
        return { text: 'PASİF', bg: '#f1f5f9', color: '#64748b' };
    }
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('tr-TR').format(val || 0);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İlanlarım</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/add-vehicle' as any)}
        >
          <Ionicons name="add" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Quota Summary Banner */}
      {quota && (
        <View style={styles.quotaBanner}>
          <View style={styles.quotaLeft}>
            <Ionicons name="car-sport" size={20} color="#ea580c" />
            <View>
              <Text style={styles.quotaTitle}>İlan Yayınlama Kotası</Text>
              <Text style={styles.quotaSub}>
                {quota.usedListings || 0} / {quota.maxListings || 1} İlan Kullanımda
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.addListingChip}
            onPress={() => router.push('/add-vehicle' as any)}
          >
            <Text style={styles.addListingChipText}>+ Yeni İlan</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {[
          { key: 'ACTIVE', label: `Yayında (${listings.filter((l) => l.status === 'ACTIVE').length})` },
          { key: 'PENDING', label: `Onayda (${listings.filter((l) => l.status === 'PENDING_APPROVAL').length})` },
          { key: 'PASSIVE', label: `Geçmiş (${listings.filter((l) => l.status !== 'ACTIVE' && l.status !== 'PENDING_APPROVAL').length})` },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingText}>İlanlarınız yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
        >
          {filteredListings.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="car-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyTitle}>Bu sekmede ilan bulunmuyor</Text>
              <Text style={styles.emptyDesc}>
                Aracınızı hemen satışa sunmak için yeni ilan ekleyebilirsiniz.
              </Text>
              <TouchableOpacity
                style={styles.createListingBtn}
                onPress={() => router.push('/add-vehicle' as any)}
              >
                <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
                <Text style={styles.createListingBtnText}>Hemen İlan Ver</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredListings.map((item) => {
              const badge = getStatusBadge(item.status);
              const imgUrl =
                item.media?.[0]?.mediaUrl ||
                item.photos?.[0]?.photoUrl ||
                item.photos?.[0]?.url;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.listingCard}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/listings/${item.id}` as any)}
                >
                  <View style={styles.cardImageWrap}>
                    {imgUrl ? (
                      <ExpoImage
                        source={{ uri: resolveMediaUrl(imgUrl) }}
                        style={styles.cardImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <View style={styles.cardImageFallback}>
                        <Ionicons name="car-sport" size={28} color="#cbd5e1" />
                      </View>
                    )}
                    <View style={[styles.badgePill, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title || `${item.brand?.name || ''} ${item.model?.name || ''}`}
                    </Text>

                    <Text style={styles.cardPrice}>
                      {formatPrice(item.price)} TL
                    </Text>

                    <View style={styles.cardMetaRow}>
                      {item.year && <Text style={styles.cardMetaText}>{item.year} Yıl</Text>}
                      {item.mileage !== undefined && (
                        <Text style={styles.cardMetaText}>• {new Intl.NumberFormat('tr-TR').format(item.mileage)} KM</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ea580c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quotaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  quotaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quotaTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  quotaSub: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  addListingChip: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addListingChipText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ea580c',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 32,
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptyDesc: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  createListingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ea580c',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  createListingBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  listingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImageWrap: {
    width: 120,
    height: 105,
    position: 'relative',
    backgroundColor: '#f1f5f9',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgePill: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  cardContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 18,
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ea580c',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
});
