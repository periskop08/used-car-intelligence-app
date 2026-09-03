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

interface RightData {
  totalLimit?: number;
  used?: number;
  remaining?: number;
  isUnlimited?: boolean;
}

interface SubscriptionSummary {
  tierName?: string;
  isUnlimited?: boolean;
  rights?: {
    aiReports?: RightData;
    aiChat?: RightData;
    activeListings?: RightData;
    comparisons?: RightData;
    vitrinListings?: RightData;
  };
}

export default function PackageRightsScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
    }, [])
  );

  const fetchSummary = async () => {
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));

      if (!token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const res = await fetch(`${API_URL}/subscriptions/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (e) {
      console.error('Fetch package rights error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSummary();
  };

  const rights = summary?.rights || {};
  const isGlobalUnlimited = summary?.isUnlimited;

  const rightsList = [
    {
      key: 'aiReports',
      title: 'AI Araç Raporu Hakkı',
      icon: 'document-text',
      iconColor: '#2563eb',
      iconBg: '#eff6ff',
      description: 'Araçlar için üretilen kapsamlı teknik ve kronik arıza riski analizleri',
      data: rights.aiReports,
      unit: 'Rapor',
    },
    {
      key: 'aiChat',
      title: 'AI Chatbot Mesaj Hakkı',
      icon: 'chatbubble-ellipses',
      iconColor: '#7c3aed',
      iconBg: '#f5f3ff',
      description: 'Araç detaylarında canlı yapay zeka danışman sohbet hakkı',
      data: rights.aiChat,
      unit: 'Mesaj',
    },
    {
      key: 'activeListings',
      title: 'Aktif İlan Hakkı',
      icon: 'car-sport',
      iconColor: '#ea580c',
      iconBg: '#fff7ed',
      description: 'Aynı anda yayında tutabileceğiniz toplam aktif ilan kotanız',
      data: rights.activeListings,
      unit: 'İlan',
    },
    {
      key: 'comparisons',
      title: 'Araç Karşılaştırma Hakkı',
      icon: 'git-compare',
      iconColor: '#0891b2',
      iconBg: '#ecfeff',
      description: 'Detaylı araç karşılaştırma motorunu çalıştırma kotanız',
      data: rights.comparisons,
      unit: 'Karşılaştırma',
    },
    {
      key: 'vitrinListings',
      title: 'Vitrin İlan Hakkı',
      icon: 'star',
      iconColor: '#f59e0b',
      iconBg: '#fffbeb',
      description: 'İlanlarınızı öne çıkarmak için ayrılan vitrin hakkı',
      data: rights.vitrinListings,
      unit: 'Vitrin',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paket Haklarım & Limitler</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingText}>Paket haklarınız yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
        >
          {/* TIER HERO BANNER */}
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroBadge}>
                <Ionicons name="sparkles" size={12} color="#ea580c" />
                <Text style={styles.heroBadgeText}>{summary?.tierName || 'Tanışma Paketi'}</Text>
              </View>
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={() => router.push('/profile/subscription' as any)}
              >
                <Text style={styles.upgradeBtnText}>🚀 Paketi Yükselt</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.heroTitle}>Kullanım Kotanız & Kalan Haklar</Text>
            <Text style={styles.heroSub}>
              Mevcut paketinizin kullanım limitlerini ve kalan tanımlı tüm haklarınızı buradan anlık takip edebilirsiniz.
            </Text>
          </View>

          {/* RIGHTS LIST */}
          <Text style={styles.sectionHeaderTitle}>Tanımlı Paket Hakları</Text>

          {rightsList.map((item) => {
            const itemData = item.data || { totalLimit: 0, used: 0, remaining: 0 };
            const itemUnlimited = isGlobalUnlimited || itemData.isUnlimited;
            const used = itemData.used || 0;
            const total = itemData.totalLimit || 0;
            const remaining = itemData.remaining || 0;
            const isNotIncluded = !itemUnlimited && total === 0;
            const percent = itemUnlimited || isNotIncluded ? 0 : Math.min(100, Math.round((used / total) * 100));

            return (
              <View key={item.key} style={styles.rightCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
                      <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rightTitle}>{item.title}</Text>
                      <Text style={styles.rightDesc}>{item.description}</Text>
                    </View>
                  </View>

                  {itemUnlimited ? (
                    <View style={styles.unlimitedPill}>
                      <Text style={styles.unlimitedText}>✨ Sınırsız</Text>
                    </View>
                  ) : isNotIncluded ? (
                    <View style={styles.notIncludedPill}>
                      <Text style={styles.notIncludedText}>Pakette Yok</Text>
                    </View>
                  ) : (
                    <View style={[styles.remainingPill, remaining > 0 ? styles.remainingGreen : styles.remainingRed]}>
                      <Text style={[styles.remainingText, remaining > 0 ? styles.remainingTextGreen : styles.remainingTextRed]}>
                        {remaining} Kalan
                      </Text>
                    </View>
                  )}
                </View>

                {/* Progress Bar for limited rights */}
                {!itemUnlimited && !isNotIncluded && (
                  <View style={styles.progressSection}>
                    <View style={styles.progressRow}>
                      <Text style={styles.progressLabel}>
                        Kullanılan: <Text style={styles.progressBold}>{used}</Text> / {total} {item.unit}
                      </Text>
                      <Text style={styles.progressPercent}>%{percent}</Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                      <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
                    </View>
                  </View>
                )}
              </View>
            );
          })}
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
    gap: 12,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 18,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  upgradeBtn: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  upgradeBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  heroSub: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  rightCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  rightTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  rightDesc: {
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 16,
    marginTop: 2,
  },
  unlimitedPill: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  unlimitedText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#059669',
  },
  notIncludedPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notIncludedText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94a3b8',
  },
  remainingPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  remainingGreen: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  remainingRed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  remainingText: {
    fontSize: 11,
    fontWeight: '900',
  },
  remainingTextGreen: {
    color: '#059669',
  },
  remainingTextRed: {
    color: '#ef4444',
  },
  progressSection: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 11.5,
    color: '#64748b',
  },
  progressBold: {
    fontWeight: '800',
    color: '#0f172a',
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ea580c',
    borderRadius: 3,
  },
});
