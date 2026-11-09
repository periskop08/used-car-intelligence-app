import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { openIsiCepteAppOrStore } from '../../components/IsiCepteRecommendationWidget';

const ARAC_REHBERI_ICON = require('../../../assets/images/arac-rehberi-icon.png');
const ARACINI_BUL_ICON = require('../../../assets/images/aracini-bul-icon.png');
const ISICEPTE_LOGO = require('../../../assets/images/isicepte-logo.png');
const AKIS_ICON = require('../../../assets/images/akis-icon.png');

export default function KesfetHub() {
  const router = useRouter();

  const options = [
    {
      title: 'Araç Rehberi',
      description: 'Araçların teknik özelliklerini, kronik sorunlarını ve önemli detaylarını keşfedin.',
      icon: 'book',
      customLogo: ARAC_REHBERI_ICON,
      route: '/vehicle-guide',
      color: '#0284c7',
    },
    {
      title: 'Aracını Bul',
      description: 'Araçları kaydırarak değerlendir, tercihlerine göre sana en uygun modelleri keşfet.',
      icon: 'car-sport',
      customLogo: ARACINI_BUL_ICON,
      route: '/aracini-bul',
      color: '#ea580c',
    },
    {
      title: 'Akış',
      description: 'İlanları kart kart kaydırarak yeni araçları hızlı ve keyifli şekilde keşfedin.',
      icon: 'play-circle',
      customLogo: AKIS_ICON,
      route: '/ilan-akisi',
      color: '#16a34a',
    },
    {
      title: 'İşi Cepte Öneriyor',
      description: 'Bölgenizdeki onaylı oto servisleri, yetkili ve özel mekanik ustaları, oto ekspertiz noktalarını keşfedin.',
      icon: 'shield-checkmark',
      customLogo: ISICEPTE_LOGO,
      route: '/isicepte',
      color: '#131b2e',
    },
    {
      title: 'İşi Cepte • İşletmeni Ekle',
      description: 'Oto servisinizi veya ustalığınızı İşi Cepte uygulamasına kaydederek TorqueScout vitrininde yerinizi alın.',
      icon: 'add-circle',
      customLogo: ISICEPTE_LOGO,
      showPlusBadge: true,
      isExternalAction: true,
      color: '#ea580c',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Keşfet</Text>
          <Text style={styles.subtitle}>Sizin için özel olarak geliştirilmiş araç ve ilan keşif modülleri</Text>
        </View>

        <View style={styles.grid}>
          {options.map((opt, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.card, { borderColor: opt.color + '22' }]}
              activeOpacity={0.8}
              onPress={() => {
                if (opt.isExternalAction) {
                  openIsiCepteAppOrStore();
                } else if (opt.route) {
                  router.push(opt.route as any);
                }
              }}
            >
              <View
                style={[
                  styles.iconContainer,
                  opt.customLogo ? styles.logoContainer : { backgroundColor: opt.color + '12' },
                ]}
              >
                {opt.customLogo ? (
                  <View style={styles.logoBadgeWrapper}>
                    <Image source={opt.customLogo} style={styles.customLogoImg} resizeMode="contain" />
                    {opt.showPlusBadge && (
                      <View style={styles.plusBadge}>
                        <Ionicons name="add" size={14} color="#ffffff" />
                      </View>
                    )}
                  </View>
                ) : (
                  <Ionicons name={opt.icon as any} size={28} color={opt.color} />
                )}
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: opt.color }]}>{opt.title}</Text>
                <Text style={styles.cardDesc}>{opt.description}</Text>
              </View>
              <Ionicons
                name={opt.isExternalAction ? 'open-outline' : 'chevron-forward'}
                size={20}
                color={opt.isExternalAction ? '#ea580c' : '#94a3b8'}
                style={styles.arrow}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  grid: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  logoContainer: {
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  logoBadgeWrapper: {
    width: 52,
    height: 52,
    position: 'relative',
  },
  customLogoImg: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  plusBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ea580c',
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  arrow: {
    marginLeft: 4,
  },
});
