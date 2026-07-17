import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function KesfetHub() {
  const router = useRouter();

  const options = [
    {
      title: 'Araç Rehberi',
      description: 'Hangi araç alınır? Kronik sorunları ve detaylı teknik özellikleri dikey kart rehberimizden inceleyin.',
      icon: 'book',
      route: '/(tabs)/vehicle-guide',
      color: '#3b82f6', // Blue 500
    },
    {
      title: 'Aracını Bul',
      description: 'Hızlı kaydırmalı (swipe) kartlar ve kişiselleştirilmiş tercih profiliyle hayalindeki aracı keşfet.',
      icon: 'car-sport',
      route: '/(tabs)/aracini-bul',
      color: '#ec4899', // Pink 500
    },
    {
      title: 'İlan Akışı',
      description: 'Aktif ilanları Reels / TikTok tarzı dikey bir akışta kaydırarak rastgele ve eğlenceli şekilde keşfedin.',
      icon: 'play-circle',
      route: '/ilan-akisi',
      color: '#f97316', // Orange 500
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Keşfet</Text>
        <Text style={styles.subtitle}>Sizin için özel olarak geliştirilmiş araç ve ilan keşif modülleri</Text>
      </View>

      <View style={styles.grid}>
        {options.map((opt, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.card, { borderColor: opt.color + '33' }]}
            activeOpacity={0.7}
            onPress={() => router.push(opt.route as any)}
          >
            <View style={[styles.iconContainer, { backgroundColor: opt.color + '15' }]}>
              <Ionicons name={opt.icon as any} size={28} color={opt.color} />
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: opt.color }]}>{opt.title}</Text>
              <Text style={styles.cardDesc}>{opt.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#475569" style={styles.arrow} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 20,
    paddingTop: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#f8fafc',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  grid: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    color: '#94a3b8',
    lineHeight: 16,
  },
  arrow: {
    marginLeft: 4,
  },
});
