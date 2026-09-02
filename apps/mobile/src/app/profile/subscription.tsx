import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

interface PackagePlan {
  id: string;
  name: string;
  code: string;
  price: number;
  period: string;
  reportQuota: number;
  listingQuota: number;
  features: string[];
  isPopular?: boolean;
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));

      if (!token) {
        Alert.alert('Giriş Yapın', 'Paket bilgilerinizi görüntülemek için giriş yapmalısınız.');
        router.back();
        return;
      }

      const res = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      }
    } catch (e) {
      console.error('Fetch subscription error:', e);
    } finally {
      setLoading(false);
    }
  };

  const getTierText = () => {
    const tier = userProfile?.subscriptionTier || 'FREE';
    if (tier === 'PROFESYONEL' || tier === 'PRO' || tier === 'PREMIUM') return 'PROFESYONEL';
    if (tier === 'YETKIN' || tier === 'STANDARD' || tier === 'BASIC') return 'YETKİN';
    return 'TANIŞMA';
  };

  const PLANS: PackagePlan[] = [
    {
      id: 'p-free',
      name: 'Tanışma Paketi',
      code: 'TANISMA',
      price: 0,
      period: 'Ücretsiz',
      reportQuota: 1,
      listingQuota: 1,
      features: [
        '1 Adet Ücretsiz Araç Risk Raporu',
        '1 Adet Aktif Araç İlanı',
        'Temel Teknik Özellikler',
        'TorqueScout Club Topluluk Erişimi',
      ],
    },
    {
      id: 'p-yetkin',
      name: 'Yetkin Üyelik',
      code: 'YETKIN',
      price: 199,
      period: 'Aylık',
      reportQuota: 10,
      listingQuota: 5,
      features: [
        '10 Adet Detaylı AI Risk Raporu',
        '5 Adet Eşzamanlı İlan Hakkı',
        'Kronik Problem Analizleri',
        'Fiyat & Değerleme Geçmişi',
        'Öncelikli Satıcı Rozeti',
      ],
    },
    {
      id: 'p-pro',
      name: 'Profesyonel VIP',
      code: 'PROFESYONEL',
      price: 499,
      period: 'Aylık',
      reportQuota: 50,
      listingQuota: 20,
      isPopular: true,
      features: [
        '50 Adet AI Detaylı Risk & Şasi Analizi',
        '20 Adet Vitrin ve Acil İlan Hakkı',
        'Özel TorqueScout Club VIP Rozeti',
        '7/24 Uzman Araç Danışmanı Desteği',
        'Canlı Piyasa ve Fiyat Düşüş Bildirimleri',
      ],
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={styles.loadingText}>Paket bilgileri yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paketim & Abonelik</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* CURRENT ACTIVE PLAN HERO CARD */}
        <View style={styles.activePlanCard}>
          <View style={styles.planHeaderRow}>
            <View>
              <Text style={styles.activePlanLabel}>MEVCUT AKTİF PAKETİNİZ</Text>
              <Text style={styles.activePlanTitle}>{getTierText()} ÜYELİK</Text>
            </View>
            <View style={styles.activePlanBadge}>
              <Ionicons name="sparkles" size={14} color="#ea580c" />
              <Text style={styles.activePlanBadgeText}>AKTİF</Text>
            </View>
          </View>

          <View style={styles.quotaRow}>
            <View style={styles.quotaBox}>
              <Text style={styles.quotaVal}>
                {userProfile?.reportQuota || (getTierText() === 'PROFESYONEL' ? '50' : getTierText() === 'YETKİN' ? '10' : '1')}
              </Text>
              <Text style={styles.quotaBoxLabel}>Kalan Rapor Hakkı</Text>
            </View>
            <View style={styles.quotaDivider} />
            <View style={styles.quotaBox}>
              <Text style={styles.quotaVal}>
                {getTierText() === 'PROFESYONEL' ? '20' : getTierText() === 'YETKİN' ? '5' : '1'}
              </Text>
              <Text style={styles.quotaBoxLabel}>İlan Yayınlama Hakkı</Text>
            </View>
          </View>
        </View>

        {/* ALL AVAILABLE PLANS */}
        <Text style={styles.sectionHeaderTitle}>Abonelik Seçenekleri</Text>

        {PLANS.map((plan) => {
          const isCurrent = getTierText() === plan.code;
          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                plan.isPopular && styles.popularPlanCard,
                isCurrent && styles.currentPlanBorder,
              ]}
            >
              {plan.isPopular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>EN POPÜLER</Text>
                </View>
              )}

              <View style={styles.planCardTop}>
                <View>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planSub}>{plan.reportQuota} Rapor • {plan.listingQuota} İlan</Text>
                </View>
                <View style={styles.priceWrap}>
                  <Text style={styles.priceNumber}>{plan.price === 0 ? 'Ücretsiz' : `${plan.price} TL`}</Text>
                  {plan.price > 0 && <Text style={styles.pricePeriod}>/ {plan.period}</Text>}
                </View>
              </View>

              <View style={styles.featuresList}>
                {plan.features.map((feat, idx) => (
                  <View key={idx} style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                    <Text style={styles.featureText}>{feat}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.selectPlanBtn,
                  isCurrent ? styles.currentPlanBtn : plan.isPopular ? styles.popularPlanBtn : styles.defaultPlanBtn,
                ]}
                onPress={() => {
                  if (isCurrent) {
                    Alert.alert('Bilgi', 'Şu an bu paketi kullanmaktasınız.');
                  } else {
                    Alert.alert('Paket Yükseltme', `${plan.name} paketine geçiş yapmak için web sitesi ödeme merkezine yönlendirileceksiniz.`);
                  }
                }}
              >
                <Text
                  style={[
                    styles.selectPlanBtnText,
                    isCurrent && styles.currentPlanBtnText,
                  ]}
                >
                  {isCurrent ? 'Kullanılan Paket' : 'Bu Paketi Seç'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
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
  activePlanCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 18,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activePlanLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  activePlanTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 2,
  },
  activePlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(234, 88, 12, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.4)',
  },
  activePlanBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ea580c',
  },
  quotaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    paddingVertical: 12,
  },
  quotaBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  quotaVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ea580c',
  },
  quotaBoxLabel: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  quotaDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 6,
  },
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 18,
    gap: 14,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  popularPlanCard: {
    borderColor: '#ea580c',
    borderWidth: 2,
  },
  currentPlanBorder: {
    backgroundColor: '#ffffff',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 18,
    backgroundColor: '#ea580c',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  popularBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  planCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  planName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  planSub: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  priceWrap: {
    alignItems: 'flex-end',
  },
  priceNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  pricePeriod: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '600',
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },
  selectPlanBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularPlanBtn: {
    backgroundColor: '#ea580c',
  },
  defaultPlanBtn: {
    backgroundColor: '#0f172a',
  },
  currentPlanBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectPlanBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  currentPlanBtnText: {
    color: '#64748b',
  },
});
