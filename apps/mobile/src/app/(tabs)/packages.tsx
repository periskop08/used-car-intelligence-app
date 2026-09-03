import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

interface MonthlyPlan {
  id: string;
  name: string;
  code: string;
  price: number;
  period: string;
  reportCount: number;
  chatCount: number;
  listingCount: number;
  durationDays: number;
  popularTag?: string;
  features: string[];
}

interface BuyerPackage {
  code: 'ALICI_MINI' | 'ALICI_PLUS' | 'ALICI_MAX';
  name: string;
  badge: string;
  price: number;
  priceText: string;
  description: string;
  popularTag?: string;
  features: string[];
}

const MONTHLY_PLANS: MonthlyPlan[] = [
  {
    id: 'p-tanisma',
    name: 'Tanışma Paketi',
    code: 'TANISMA',
    price: 0,
    period: 'Ay',
    reportCount: 3,
    chatCount: 3,
    listingCount: 1,
    durationDays: 30,
    features: [
      'Ayda 3 AI Araç Raporu',
      'Ayda 3 Chatbot Mesajı',
      'Aynı anda 1 Aktif İlan Yayını',
      'İlan Başına 30 Gün Yayın Süresi',
      'TorqueScout Club Topluluk Erişimi',
    ],
  },
  {
    id: 'p-yetkin',
    name: 'Yetkin Paket',
    code: 'YETKIN',
    price: 499,
    period: 'Ay',
    reportCount: 10,
    chatCount: 30,
    listingCount: 10,
    durationDays: 30,
    features: [
      'Ayda 10 AI Araç Raporu',
      'Ayda 30 Chatbot Mesajı',
      'Aynı anda 10 Aktif İlan Yayını',
      'İlan Başına 30 Gün Yayın Süresi',
      'Kronik Problem ve Piyasa Fiyat Analizleri',
      'Öncelikli Satıcı Desteği',
    ],
  },
  {
    id: 'p-pro',
    name: 'Profesyonel Paket',
    code: 'PROFESYONEL',
    price: 1499,
    period: 'Ay',
    reportCount: 50,
    chatCount: 150,
    listingCount: 50,
    durationDays: 45,
    popularTag: 'EN ÇOK TERCİH EDİLEN',
    features: [
      'Ayda 50 AI Araç Raporu',
      'Ayda 150 Chatbot Mesajı',
      'Aynı anda 50 Aktif İlan Yayını',
      'İlan Başına 45 Gün Yayın Süresi',
      'Vitrin İlan ve Acil Satış Rozetleri',
      'TorqueScout Profesyonel Üyelik Rozeti',
      'Öncelikli 7/24 Uzman Araç Danışmanı',
    ],
  },
];

const BUYER_PACKAGES: BuyerPackage[] = [
  {
    code: 'ALICI_MINI',
    name: 'Alıcı Mini',
    badge: 'MİNİ',
    price: 149,
    priceText: '149 TL',
    description: 'Birkaç aracı detaylı incelemek ve karar sürecine devam etmek isteyenler için.',
    features: [
      '5 AI araç raporu',
      '15 chatbot mesajı',
      '30 gün kullanım süresi',
      'Satıcıya sorulacak özel sorular',
      'Ekspertiz kontrol listesi',
    ],
  },
  {
    code: 'ALICI_PLUS',
    name: 'Alıcı Plus',
    badge: 'PLUS',
    popularTag: 'EN POPÜLER',
    price: 249,
    priceText: '249 TL',
    description: 'Daha fazla aracı karşılaştırmak ve satın alma kararını netleştirmek isteyenler için.',
    features: [
      '10 AI araç raporu',
      '30 chatbot mesajı',
      '30 gün kullanım süresi',
      'Satıcıya sorulacak özel sorular',
      'Ekspertiz kontrol listesi',
    ],
  },
  {
    code: 'ALICI_MAX',
    name: 'Alıcı Max',
    badge: 'MAX',
    price: 399,
    priceText: '399 TL',
    description: 'Yoğun araç araştırması yapan ve daha geniş kullanım hakkına ihtiyaç duyanlar için.',
    features: [
      '20 AI araç raporu',
      '60 chatbot mesajı',
      '60 gün kullanım süresi',
      'Satıcıya sorulacak özel sorular',
      'Ekspertiz kontrol listesi',
    ],
  },
];

export default function PackagesScreen() {
  const router = useRouter();
  const [selectedSection, setSelectedSection] = useState<'MONTHLY' | 'BUYER'>('MONTHLY');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));

      if (token) {
        const res = await fetch(`${API_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUserProfile(data);
        }
      }
    } catch (e) {
      console.error('Fetch profile in packages error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const rawTier = userProfile?.subscriptionTier || 'TANISMA';
  const currentTier =
    rawTier === 'FREE'
      ? 'TANISMA'
      : rawTier === 'STANDARD'
      ? 'YETKIN'
      : rawTier === 'PREMIUM'
      ? 'PROFESYONEL'
      : rawTier;

  const handlePurchasePlan = (plan: MonthlyPlan) => {
    if (currentTier === plan.code) {
      Alert.alert('Bilgi', 'Şu an bu paketi kullanmaktasınız.');
      return;
    }
    Alert.alert(
      'Paket Yükseltme',
      `${plan.name} (${plan.price === 0 ? '0 TL' : `${plan.price} TL / ay`}) paketine geçiş yapmak için web sitemizdeki güvenli ödeme merkezine yönlendirileceksiniz.`
    );
  };

  const handlePurchaseBuyerPkg = (pkg: BuyerPackage) => {
    Alert.alert(
      'Alıcı Paketi Satın Al',
      `${pkg.name} (${pkg.priceText} - Tek Seferlik) paketini hesabınıza tanımlamak için web sitemizdeki güvenli ödeme merkezine yönlendirileceksiniz.`
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Ionicons name="gift" size={22} color="#ea580c" />
          <Text style={styles.headerTitle}>Paketler & Fiyatlandırma</Text>
        </View>
        <TouchableOpacity
          style={styles.rightsLinkChip}
          onPress={() => router.push('/profile/package-rights' as any)}
        >
          <Ionicons name="sparkles" size={14} color="#ea580c" />
          <Text style={styles.rightsLinkChipText}>Haklarım</Text>
        </TouchableOpacity>
      </View>

      {/* SECTION TOGGLE TABS (Aylık Abonelikler / Ek Alıcı Paketleri) */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, selectedSection === 'MONTHLY' && styles.toggleBtnActive]}
          onPress={() => setSelectedSection('MONTHLY')}
        >
          <Ionicons
            name="calendar"
            size={16}
            color={selectedSection === 'MONTHLY' ? '#ea580c' : '#64748b'}
          />
          <Text style={[styles.toggleBtnText, selectedSection === 'MONTHLY' && styles.toggleBtnTextActive]}>
            Aylık Abonelikler
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, selectedSection === 'BUYER' && styles.toggleBtnActive]}
          onPress={() => setSelectedSection('BUYER')}
        >
          <Ionicons
            name="cart"
            size={16}
            color={selectedSection === 'BUYER' ? '#ea580c' : '#64748b'}
          />
          <Text style={[styles.toggleBtnText, selectedSection === 'BUYER' && styles.toggleBtnTextActive]}>
            Ek Alıcı Paketleri
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingText}>Paketler yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
        >
          {selectedSection === 'MONTHLY' ? (
            /* MONTHLY SUBSCRIPTION PLANS */
            <>
              <View style={styles.sectionHeaderWrap}>
                <Text style={styles.sectionHeading}>Aylık Abonelik Planları</Text>
                <Text style={styles.sectionSubHeading}>
                  İhtiyacınıza uygun planı seçin, araç sorgulama ve ilan ayrıcalıklarından hemen yararlanın.
                </Text>
              </View>

              {MONTHLY_PLANS.map((plan) => {
                const isCurrent = currentTier === plan.code;
                const isPro = plan.code === 'PROFESYONEL';

                return (
                  <View
                    key={plan.id}
                    style={[
                      styles.planCard,
                      isPro && styles.proPlanCard,
                      isCurrent && styles.currentPlanCard,
                    ]}
                  >
                    {plan.popularTag && (
                      <View style={styles.popularTagPill}>
                        <Text style={styles.popularTagText}>{plan.popularTag}</Text>
                      </View>
                    )}

                    {/* Card Top */}
                    <View style={styles.cardTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.planName}>{plan.name}</Text>
                        <Text style={styles.planLimitsSub}>
                          {plan.reportCount} AI Rapor • {plan.listingCount} İlan • {plan.durationDays} Gün
                        </Text>
                      </View>

                      <View style={styles.priceContainer}>
                        <Text style={styles.priceText}>
                          {plan.price === 0 ? 'Ücretsiz' : `${new Intl.NumberFormat('tr-TR').format(plan.price)} TL`}
                        </Text>
                        {plan.price > 0 && <Text style={styles.pricePeriodText}>/ {plan.period}</Text>}
                      </View>
                    </View>

                    {/* Features */}
                    <View style={styles.featuresWrap}>
                      {plan.features.map((feat, idx) => (
                        <View key={idx} style={styles.featureItem}>
                          <Ionicons name="checkmark-circle" size={17} color="#16a34a" />
                          <Text style={styles.featureText}>{feat}</Text>
                        </View>
                      ))}
                    </View>

                    {/* CTA Button */}
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        isCurrent
                          ? styles.currentActionBtn
                          : isPro
                          ? styles.proActionBtn
                          : styles.defaultActionBtn,
                      ]}
                      onPress={() => handlePurchasePlan(plan)}
                    >
                      <Text
                        style={[
                          styles.actionBtnText,
                          isCurrent && styles.currentActionBtnText,
                        ]}
                      >
                        {isCurrent ? 'Kullandığınız Paket' : plan.price === 0 ? 'Ücretsiz Başla' : 'Planı Seç'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          ) : (
            /* BUYER PACKAGES (ONE-TIME CREDITS) */
            <>
              <View style={styles.sectionHeaderWrap}>
                <Text style={styles.sectionHeading}>Ek Alıcı Paketleri</Text>
                <Text style={styles.sectionSubHeading}>
                  Aboneliğinizi değiştirmeden tek seferlik ek AI araç raporu ve chatbot mesaj hakkı yükleyin.
                </Text>
              </View>

              {BUYER_PACKAGES.map((pkg) => {
                const isPlus = pkg.code === 'ALICI_PLUS';

                return (
                  <View
                    key={pkg.code}
                    style={[
                      styles.planCard,
                      isPlus && styles.proPlanCard,
                    ]}
                  >
                    {pkg.popularTag && (
                      <View style={styles.popularTagPill}>
                        <Text style={styles.popularTagText}>{pkg.popularTag}</Text>
                      </View>
                    )}

                    {/* Card Top */}
                    <View style={styles.cardTopRow}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.badgeNameRow}>
                          <Text style={styles.planName}>{pkg.name}</Text>
                          <View style={styles.buyerBadgePill}>
                            <Text style={styles.buyerBadgePillText}>{pkg.badge}</Text>
                          </View>
                        </View>
                        <Text style={styles.planLimitsSub}>{pkg.description}</Text>
                      </View>

                      <View style={styles.priceContainer}>
                        <Text style={styles.priceText}>{pkg.priceText}</Text>
                        <Text style={styles.pricePeriodText}>Tek Seferlik</Text>
                      </View>
                    </View>

                    {/* Features */}
                    <View style={styles.featuresWrap}>
                      {pkg.features.map((feat, idx) => (
                        <View key={idx} style={styles.featureItem}>
                          <Ionicons name="checkmark-circle" size={17} color="#16a34a" />
                          <Text style={styles.featureText}>{feat}</Text>
                        </View>
                      ))}
                    </View>

                    {/* CTA Button */}
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        isPlus ? styles.proActionBtn : styles.defaultActionBtn,
                      ]}
                      onPress={() => handlePurchaseBuyerPkg(pkg)}
                    >
                      <Text style={styles.actionBtnText}>{pkg.name} Satın Al</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  rightsLinkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  rightsLinkChipText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ea580c',
  },
  toggleRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toggleBtnActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  toggleBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748b',
  },
  toggleBtnTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  sectionHeaderWrap: {
    gap: 4,
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  sectionSubHeading: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 17,
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
  proPlanCard: {
    borderColor: '#ea580c',
    borderWidth: 2,
  },
  currentPlanCard: {
    backgroundColor: '#ffffff',
  },
  popularTagPill: {
    position: 'absolute',
    top: -10,
    right: 18,
    backgroundColor: '#ea580c',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  popularTagText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  badgeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  buyerBadgePill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  buyerBadgePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  planLimitsSub: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 3,
    lineHeight: 16,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  pricePeriodText: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '600',
  },
  featuresWrap: {
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
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proActionBtn: {
    backgroundColor: '#ea580c',
  },
  defaultActionBtn: {
    backgroundColor: '#0f172a',
  },
  currentActionBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  currentActionBtnText: {
    color: '#64748b',
  },
});
