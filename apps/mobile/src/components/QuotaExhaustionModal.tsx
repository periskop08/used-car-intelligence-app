import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface QuotaExhaustionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectBuyerMini?: () => void;
}

export default function QuotaExhaustionModal({
  visible,
  onClose,
  onSelectBuyerMini,
}: QuotaExhaustionModalProps) {
  const router = useRouter();

  if (!visible) return null;

  const handleSelectMini = () => {
    onClose();
    if (onSelectBuyerMini) {
      onSelectBuyerMini();
    } else {
      router.push({
        pathname: '/(tabs)/packages',
        params: { initialTab: 'buyer', preselect: 'ALICI_MINI' },
      } as any);
    }
  };

  const handleViewAllPackages = () => {
    onClose();
    router.push('/(tabs)/packages' as any);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.cardContainer}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header Icon & Badges */}
            <View style={styles.headerSection}>
              <View style={styles.iconCircle}>
                <Ionicons name="flash" size={24} color="#f97316" />
              </View>

              <View style={styles.tagBadge}>
                <Text style={styles.tagBadgeText}>KOTA HATIRLATMASI</Text>
              </View>

              <Text style={styles.titleText}>Araştırma Haklarınız Doldu</Text>

              <Text style={styles.subtitleText}>
                Ücretsiz sorgulama limitinize ulaştınız. Araç incelemelerinize kesintisiz devam etmek için en popüler başlangıç paketimiz Alıcı Mini'yi tercih edebilirsiniz.
              </Text>
            </View>

            {/* Hero Recommended Banner Box: Alıcı Mini */}
            <View style={styles.heroBox}>
              <View style={styles.heroTopRow}>
                <View style={styles.badgeRecommended}>
                  <Text style={styles.badgeRecommendedText}>ÖNERİLEN BAŞLANGIÇ</Text>
                </View>
                <View style={styles.badgeOneTime}>
                  <View style={styles.greenDot} />
                  <Text style={styles.badgeOneTimeText}>Tek Seferlik</Text>
                </View>
              </View>

              <View style={styles.pricingRow}>
                <View style={styles.pricingLeft}>
                  <Text style={styles.packageName}>Alıcı Mini Paketi</Text>
                  <Text style={styles.packageSub}>Karar aşamasındaki araçlar için ideal</Text>
                </View>
                <View style={styles.pricingRight}>
                  <Text style={styles.priceAmount}>149 TL</Text>
                  <Text style={styles.pricePeriod}>Taahhütsüz</Text>
                </View>
              </View>

              {/* Feature Checklist */}
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" style={styles.featureIcon} />
                  <Text style={styles.featureItemBold}>5 Kapsamlı AI Araç Analiz Raporu</Text>
                </View>

                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" style={styles.featureIcon} />
                  <Text style={styles.featureItemBold}>15 Uzman Danışman Chatbot Mesajı</Text>
                </View>

                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" style={styles.featureIcon} />
                  <Text style={styles.featureItemText}>Satıcıya Özel Kontrol & Pazarlık Soruları</Text>
                </View>

                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" style={styles.featureIcon} />
                  <Text style={styles.featureItemText}>30 Gün Boyunca Geçerli Kullanım</Text>
                </View>
              </View>

              {/* Primary CTA Button */}
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleSelectMini}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Alıcı Mini Paketini Seç (149 TL) →</Text>
              </TouchableOpacity>
            </View>

            {/* Secondary Option */}
            <View style={styles.footerRow}>
              <TouchableOpacity onPress={handleViewAllPackages} activeOpacity={0.7}>
                <Text style={styles.secondaryLinkText}>Tüm Paketleri ve Abonelikleri İncele</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 390,
    maxHeight: '90%',
    backgroundColor: '#0b0f19',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(249, 115, 22, 0.4)',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    alignItems: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.25)',
    marginBottom: 8,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fb923c',
    letterSpacing: 0.6,
  },
  titleText: {
    fontSize: 19,
    fontWeight: '900',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  heroBox: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#f97316',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 6,
  },
  badgeRecommended: {
    backgroundColor: '#f97316',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeRecommendedText: {
    color: '#020617',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgeOneTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  badgeOneTimeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 12,
    marginBottom: 12,
  },
  pricingLeft: {
    flex: 1,
    paddingRight: 8,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  packageSub: {
    fontSize: 10.5,
    color: '#94a3b8',
    marginTop: 2,
  },
  pricingRight: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fb923c',
    letterSpacing: -0.5,
  },
  pricePeriod: {
    fontSize: 9.5,
    color: '#64748b',
    marginTop: 1,
  },
  featuresList: {
    gap: 8,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    marginRight: 8,
    flexShrink: 0,
  },
  featureItemBold: {
    fontSize: 11.5,
    color: '#f1f5f9',
    fontWeight: '700',
    flex: 1,
  },
  featureItemText: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '500',
    flex: 1,
  },
  primaryBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  footerRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  secondaryLinkText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
