import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

export default function UserDashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    activeListings: 0,
    favoriteListings: 0,
    favoriteReports: 0,
    unreadMessages: 0,
    userTier: 'FREE',
    remainingReports: 1,
  });

  useFocusEffect(
    useCallback(() => {
      fetchDashboardStats();
    }, [])
  );

  const fetchDashboardStats = async () => {
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));

      if (!token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [userRes, listingsRes, favListingsRes, favReportsRes, unreadRes] = await Promise.all([
        fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/me/listings`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        fetch(`${API_URL}/me/favorites`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        fetch(`${API_URL}/favorites`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        fetch(`${API_URL}/conversations/unread-count`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
      ]);

      const user = userRes.ok ? await userRes.json() : null;
      const listings = listingsRes && listingsRes.ok ? await listingsRes.json() : [];
      const favListings = favListingsRes && favListingsRes.ok ? await favListingsRes.json() : [];
      const favReports = favReportsRes && favReportsRes.ok ? await favReportsRes.json() : [];
      const unreadData = unreadRes && unreadRes.ok ? await unreadRes.json() : { unreadCount: 0 };

      const activeCount = Array.isArray(listings)
        ? listings.filter((l: any) => l.status === 'ACTIVE').length
        : 0;

      setStats({
        activeListings: activeCount,
        favoriteListings: Array.isArray(favListings) ? favListings.length : 0,
        favoriteReports: Array.isArray(favReports) ? favReports.length : 0,
        unreadMessages: unreadData?.unreadCount || 0,
        userTier: user?.subscriptionTier || 'FREE',
        remainingReports: user?.reportQuota || 1,
      });
    } catch (e) {
      console.error('Fetch dashboard error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardStats();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kullanıcı Dashboard</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingText}>Dashboard yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
        >
          {/* WELCOME BANNER */}
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeBadge}>
              <Ionicons name="sparkles" size={12} color="#ea580c" />
              <Text style={styles.welcomeBadgeText}>ÖZET KONTROL MERKEZİ</Text>
            </View>
            <Text style={styles.welcomeTitle}>Hesap Genel Durumu</Text>
            <Text style={styles.welcomeSub}>
              İlanlarınızı, favorilerinizi ve AI araç analiz raporlarınızı bu panelden kolayca yönetin.
            </Text>
          </View>

          {/* 4-GRID STATS */}
          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={styles.statBox}
              activeOpacity={0.75}
              onPress={() => router.push('/profile/my-listings' as any)}
            >
              <View style={[styles.statIconWrap, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="car-sport" size={22} color="#2563eb" />
              </View>
              <Text style={styles.statValue}>{stats.activeListings}</Text>
              <Text style={styles.statLabel}>Yayındaki İlan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statBox}
              activeOpacity={0.75}
              onPress={() => router.push({ pathname: '/profile/favorites', params: { tab: 'listings' } } as any)}
            >
              <View style={[styles.statIconWrap, { backgroundColor: '#fef2f2' }]}>
                <Ionicons name="heart" size={22} color="#ef4444" />
              </View>
              <Text style={styles.statValue}>{stats.favoriteListings}</Text>
              <Text style={styles.statLabel}>Favori İlan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statBox}
              activeOpacity={0.75}
              onPress={() => router.push({ pathname: '/profile/favorites', params: { tab: 'reports' } } as any)}
            >
              <View style={[styles.statIconWrap, { backgroundColor: '#fff7ed' }]}>
                <Ionicons name="document-text" size={22} color="#ea580c" />
              </View>
              <Text style={styles.statValue}>{stats.favoriteReports}</Text>
              <Text style={styles.statLabel}>Favori Rapor</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statBox}
              activeOpacity={0.75}
              onPress={() => router.push('/(tabs)/messages' as any)}
            >
              <View style={[styles.statIconWrap, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="chatbubbles" size={22} color="#16a34a" />
              </View>
              <Text style={styles.statValue}>{stats.unreadMessages}</Text>
              <Text style={styles.statLabel}>Okunmamış Mesaj</Text>
            </TouchableOpacity>
          </View>

          {/* QUICK ACTION CARDS */}
          <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>

          <View style={styles.actionsCard}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/add-vehicle' as any)}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: '#fff7ed' }]}>
                <Ionicons name="add-circle" size={20} color="#ea580c" />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionMainText}>Yeni İlan Ver</Text>
                <Text style={styles.actionSubText}>Aracınızı binlerce alıcıya sergileyin</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/(tabs)' as any)}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="search" size={20} color="#2563eb" />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionMainText}>Yeni Araç Sorgula</Text>
                <Text style={styles.actionSubText}>Kronik problem ve piyasa analizi çıkarın</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionRow, { borderBottomWidth: 0 }]}
              onPress={() => router.push('/profile/subscription' as any)}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: '#fdf4ff' }]}>
                <Ionicons name="gift" size={20} color="#c026d3" />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionMainText}>Paket ve Rapor Hakları</Text>
                <Text style={styles.actionSubText}>Aboneliğinizi yönetin ve limitleri artırın</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
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
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  welcomeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 18,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  welcomeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  welcomeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  welcomeSub: {
    fontSize: 12.5,
    color: '#64748b',
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 16,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 6,
  },
  actionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  actionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextWrap: {
    flex: 1,
    gap: 2,
  },
  actionMainText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  actionSubText: {
    fontSize: 11.5,
    color: '#64748b',
  },
});
