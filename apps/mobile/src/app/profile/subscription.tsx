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

const TIER_RANKS: Record<string, number> = {
  TANISMA: 1,
  FREE: 1,
  YETKIN: 2,
  STANDARD: 2,
  BASIC: 2,
  PROFESYONEL: 3,
  PRO: 3,
  PREMIUM: 3,
};

interface PackagePlan {
  id: string;
  name: string;
  code: string;
  rank: number;
  price: number;
  period: string;
  reportCount: number;
  chatCount: number;
  listingCount: number;
  durationDays: number;
  features: string[];
  isPopular?: boolean;
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [buyerCredits, setBuyerCredits] = useState<any>(null);

  useEffect(() => {
    fetchProfileAndCredits();
  }, []);

  const fetchProfileAndCredits = async () => {
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));

      if (!token) {
        Alert.alert('Giriş Yapın', 'Paket bilgilerinizi görüntülemek için giriş yapmalısınız.');
        router.back();
        return;
      }

      const [userRes, creditsRes] = await Promise.all([
        fetch(`${API_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/buyer-packages/my-credits`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
      ]);

      if (userRes.ok) {
        const userData = await userRes.json();
        setUserProfile(userData);
      }

      if (creditsRes && creditsRes.ok) {
        const cData = await creditsRes.json();
        setBuyerCredits(cData);
      }
    } catch (e) {
      console.error('Fetch subscription error:', e);
    } finally {
      setLoading(false);
    }
  };

  const rawTier = userProfile?.subscriptionTier || 'TANISMA';
  const tier =
    rawTier === 'FREE'
      ? 'TANISMA'
      : rawTier === 'STANDARD'
      ? 'YETKIN'
      : rawTier === 'PREMIUM'
      ? 'PROFESYONEL'
      : rawTier;

  const currentRank = TIER_RANKS[tier] || 1;

  const PLANS: PackagePlan[] = [
    {
      id: 'p-tanisma',
      name: 'Tanışma Paketi',
      code: 'TANISMA',
      rank: 1,
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
      rank: 2,
      price: 499,
      period: 'Ay',
      reportCount: 10,
      chatCount: 30,
      listingCount: 10,
      durationDays: 30,
      isPopular: false,
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
      rank: 3,
      price: 1499,
      period: 'Ay',
      reportCount: 50,
      chatCount: 150,
      listingCount: 50,
      durationDays: 45,
      isPopular: true,
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

  // Only show higher upgrade packages if any exist above the user's current rank
  const higherPlans = PLANS.filter((p) => p.rank > currentRank);

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
        <Text style={styles.headerTitle}>Abonelik & Paketlerim</Text>
        <TouchableOpacity
          style={styles.rightsLinkBtn}
          onPress={() => router.push('/profile/package-rights' as any)}
        >
          <Ionicons name="sparkles" size={16} color="#ea580c" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* CURRENT ACTIVE PLAN HERO CARD */}
        <View style={styles.activePlanCard}>
          {/* Top Label & Badge Row (Guarantees zero horizontal overflow) */}
          <View style={styles.planLabelRow}>
            <Text style={styles.activePlanLabel}>AYLIK ABONELİK PAKETİNİZ</Text>
            <View style={styles.activePlanBadge}>
              <Ionicons name="sparkles" size={10} color="#f59e0b" style={{ marginRight: 3 }} />
              <Text style={styles.activePlanBadgeText}>{tier}</Text>
            </View>
          </View>

          {/* Main Title & Price */}
          <View style={styles.planTitleBlock}>
            <Text style={styles.activePlanTitle}>
              {tier === 'PROFESYONEL'
                ? 'Profesyonel Paket'
                : tier === 'YETKIN'
                ? 'Yetkin Paket'
                : 'Tanışma Paketi'}
            </Text>
            <Text style={styles.activePlanPrice}>
              {tier === 'PROFESYONEL'
                ? '1.499 TL / ay'
                : tier === 'YETKIN'
                ? '499 TL / ay'
                : 'Ücretsiz (0 TL / ay)'}
            </Text>
          </View>

          {/* Quick Perks Row */}
          <View style={styles.quotaRow}>
            <View style={styles.quotaBox}>
              <Ionicons name="document-text" size={18} color="#ea580c" />
              <Text style={styles.quotaVal}>
                {tier === 'PROFESYONEL' ? '50' : tier === 'YETKIN' ? '10' : '3'}
              </Text>
              <Text style={styles.quotaBoxLabel}>AI Rapor / Ay</Text>
            </View>
            <View style={styles.quotaDivider} />
            <View style={styles.quotaBox}>
              <Ionicons name="chatbubbles" size={18} color="#ea580c" />
              <Text style={styles.quotaVal}>
                {tier === 'PROFESYONEL' ? '150' : tier === 'YETKIN' ? '30' : '3'}
              </Text>
              <Text style={styles.quotaBoxLabel}>Chatbot Mesaj</Text>
            </View>
            <View style={styles.quotaDivider} />
            <View style={styles.quotaBox}>
              <Ionicons name="car-sport" size={18} color="#ea580c" />
              <Text style={styles.quotaVal}>
                {tier === 'PROFESYONEL' ? '50' : tier === 'YETKIN' ? '10' : '1'}
              </Text>
              <Text style={styles.quotaBoxLabel}>Aktif İlan</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.viewRightsBtn}
            onPress={() => router.push('/profile/package-rights' as any)}
          >
            <Text style={styles.viewRightsBtnText}>Kullanım Limitlerimi ve Kalan Haklarımı Gör →</Text>
          </TouchableOpacity>
        </View>

        {/* IF USER IS ALREADY AT HIGHEST TIER (PROFESYONEL) */}
        {currentRank >= 3 ? (
          <View style={styles.topTierCard}>
            <View style={styles.topTierIconCircle}>
              <Ionicons name="shield-checkmark" size={26} color="#ea580c" />
            </View>
            <Text style={styles.topTierTitle}>Profesyonel Paket Kullanıyorsunuz</Text>
            <Text style={styles.topTierDesc}>
              TorqueScout platformundaki en kapsamlı üyelik planına sahipsiniz. Tüm ayrıcalıklardan ve en yüksek kotalardan sınırsızca yararlanmaktasınız.
            </Text>

            {/* Clear Advantages List */}
            <View style={styles.advantagesList}>
              <View style={styles.advantageItem}>
                <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                <Text style={styles.advantageText}>Ayda 50 Detaylı AI Araç Raporu</Text>
              </View>
              <View style={styles.advantageItem}>
                <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                <Text style={styles.advantageText}>Ayda 150 Chatbot Danışman Mesajı</Text>
              </View>
              <View style={styles.advantageItem}>
                <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                <Text style={styles.advantageText}>Aynı anda 50 Aktif İlan Yayını</Text>
              </View>
              <View style={styles.advantageItem}>
                <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                <Text style={styles.advantageText}>İlan Başına 45 Gün Yayın Süresi</Text>
              </View>
              <View style={styles.advantageItem}>
                <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                <Text style={styles.advantageText}>Vitrin İlan ve Acil Satış Rozetleri</Text>
              </View>
              <View style={styles.advantageItem}>
                <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                <Text style={styles.advantageText}>Öncelikli Satıcı ve Uzman Danışman Desteği</Text>
              </View>
            </View>
          </View>
        ) : (
          /* HIGHER UPGRADE PLANS (ONLY SHOWN IF USER HAS AN UPGRADE AVAILABLE) */
          <>
            <Text style={styles.sectionHeaderTitle}>Yükseltebileceğiniz Paketler</Text>

            {higherPlans.map((plan) => (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  plan.isPopular && styles.popularPlanCard,
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
                    <Text style={styles.planSub}>
                      {plan.reportCount} AI Rapor • {plan.listingCount} İlan • {plan.durationDays} Gün
                    </Text>
                  </View>
                  <View style={styles.priceWrap}>
                    <Text style={styles.priceNumber}>
                      {new Intl.NumberFormat('tr-TR').format(plan.price)} TL
                    </Text>
                    <Text style={styles.pricePeriod}>/ {plan.period}</Text>
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
                    plan.isPopular ? styles.popularPlanBtn : styles.defaultPlanBtn,
                  ]}
                  onPress={() => {
                    Alert.alert(
                      'Planı Yükselt',
                      `${plan.name} (${new Intl.NumberFormat('tr-TR').format(plan.price)} TL / ay) paketine geçiş yapmak için web sitemizdeki güvenli ödeme merkezine yönlendirileceksiniz.`
                    );
                  }}
                >
                  <Text style={styles.selectPlanBtnText}>Planı Yükselt</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* EK ALICI PAKETLERİ (TEK SEFERLİK KREDİLER) */}
        <View style={styles.buyerPackageBanner}>
          <View style={styles.buyerPackageHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.buyerPackageTitle}>🛒 Ek Alıcı Paketleri</Text>
              <Text style={styles.buyerPackageSub}>
                Aboneliğinizi değiştirmeden tek seferlik ek AI araç raporu ve chatbot mesaj hakkı yükleyin.
              </Text>
            </View>
            <View style={styles.onceBadge}>
              <Text style={styles.onceBadgeText}>TEK SEFERLİK</Text>
            </View>
          </View>

          {buyerCredits?.activePurchases && buyerCredits.activePurchases.length > 0 ? (
            <View style={styles.activeCreditsCard}>
              <Text style={styles.activeCreditsText}>
                Tanımlı Ek Kredileriniz: {buyerCredits.totalRemainingReports || 0} Ek Rapor, {buyerCredits.totalRemainingChat || 0} Ek Mesaj
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.buyExtraCreditsBtn}
              onPress={() =>
                Alert.alert(
                  'Ek Alıcı Paketi',
                  'Ek AI rapor hakları satın almak için web sitemizi ziyaret edebilirsiniz.'
                )
              }
            >
              <Text style={styles.buyExtraCreditsBtnText}>+ Ek Alıcı Paketi Satın Al</Text>
            </TouchableOpacity>
          )}
        </View>
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
  rightsLinkBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  planLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activePlanLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.6,
  },
  activePlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  activePlanBadgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#fbbf24',
    letterSpacing: 0.5,
  },
  planTitleBlock: {
    gap: 2,
    marginTop: 2,
  },
  activePlanTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  activePlanPrice: {
    fontSize: 13,
    color: '#fb923c',
    fontWeight: '700',
  },
  quotaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 2,
  },
  quotaBox: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  quotaVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  quotaBoxLabel: {
    fontSize: 10.5,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  quotaDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  viewRightsBtn: {
    paddingVertical: 4,
    alignItems: 'center',
    marginTop: 2,
  },
  viewRightsBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ea580c',
  },
  topTierCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    padding: 20,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  topTierIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  topTierTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
  },
  topTierDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 6,
  },
  advantagesList: {
    width: '100%',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  advantageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  advantageText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
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
  selectPlanBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  buyerPackageBanner: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 18,
    gap: 12,
    marginTop: 6,
  },
  buyerPackageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  buyerPackageTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  buyerPackageSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  onceBadge: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  onceBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#ea580c',
  },
  activeCreditsCard: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  activeCreditsText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '700',
  },
  buyExtraCreditsBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buyExtraCreditsBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ea580c',
  },
});
