import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const ISICEPTE_LOGO = require('../../../assets/images/isicepte-logo.png');

export default function KesfetHub() {
  const router = useRouter();

  const options = [
    {
      title: 'Araç Rehberi',
      description: 'Hangi araç alınır? Kronik sorunları ve detaylı teknik özellikleri dikey kart rehberimizden inceleyin.',
      icon: 'book',
      route: '/vehicle-guide',
      color: '#0284c7',
    },
    {
      title: 'Aracını Bul',
      description: 'Hızlı kaydırmalı (swipe) kartlar ve kişiselleştirilmiş tercih profiliyle hayalindeki aracı keşfet.',
      icon: 'car-sport',
      route: '/aracini-bul',
      color: '#ea580c',
    },
    {
      title: 'İşi Cepte Öneriyor',
      description: 'Bölgenizdeki onaylı oto servisleri, yetkili ve özel mekanik ustaları, oto ekspertiz noktalarını keşfedin.',
      icon: 'shield-checkmark',
      customLogo: ISICEPTE_LOGO,
      route: '/isicepte',
      color: '#ea580c',
    },
    {
      title: 'Akış',
      description: 'Aktif ilanları Reels / TikTok tarzı dikey bir akışta kaydırarak rastgele ve eğlenceli şekilde keşfedin.',
      icon: 'play-circle',
      route: '/ilan-akisi',
      color: '#16a34a',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
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
              onPress={() => router.push(opt.route as any)}
            >
              <View
                style={[
                  styles.iconContainer,
                  opt.customLogo ? styles.logoContainer : { backgroundColor: opt.color + '12' },
                ]}
              >
                {opt.customLogo ? (
                  <Image source={opt.customLogo} style={styles.customLogoImg} resizeMode="contain" />
                ) : (
                  <Ionicons name={opt.icon as any} size={28} color={opt.color} />
                )}
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: opt.color }]}>{opt.title}</Text>
                <Text style={styles.cardDesc}>{opt.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" style={styles.arrow} />
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
    overflow: 'hidden',
  },
  customLogoImg: {
    width: 52,
    height: 52,
    borderRadius: 14,
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
