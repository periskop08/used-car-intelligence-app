import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function MobileAppHome() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>
            USED CAR <Text style={styles.highlightText}>INTEL</Text>
          </Text>
          <Text style={styles.subtitle}>İkinci El Araç Değerlendirme</Text>
        </View>

        {/* Search Mock Area */}
        <View style={styles.searchBox}>
          <Text style={styles.searchText}>🔍 Marka, Model veya Yıl Seçin...</Text>
        </View>

        {/* Quick Statistics Banner */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚡ Araç Raporu Sorgula</Text>
          <Text style={styles.cardDesc}>
            Almak istediğiniz aracın kronik sorunlarını, bakım maliyetlerini ve alınabilirlik skorunu ekspertize gitmeden öğrenin.
          </Text>
          <TouchableOpacity style={styles.btn}>
            <Text style={styles.btnText}>Hemen İncele</Text>
          </TouchableOpacity>
        </View>

        {/* Feature Paywall Info */}
        <View style={styles.tierBox}>
          <View style={styles.tierHeader}>
            <Text style={styles.tierName}>Standart Abonelik</Text>
            <Text style={styles.tierPrice}>349 TL / ay</Text>
          </View>
          <Text style={styles.tierFeatures}>
            • Detaylı AI araç yorumu ve alınabilirlik skoru{'\n'}
            • Satıcıya sorulacak detaylı sorular{'\n'}
            • Ekspertiz kontrol listesi ve checklistler{'\n'}
            • 10 adete kadar karşılaştırma imkanı
          </Text>
          <TouchableOpacity style={[styles.btn, styles.tierBtn]}>
            <Text style={styles.btnText}>Paketi Yükselt</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // Slate 900
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  header: {
    marginTop: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#f8fafc', // Slate 50
    letterSpacing: 1.5,
  },
  highlightText: {
    color: '#f97316', // Orange 500
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b', // Slate 500
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  searchBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    padding: 16,
  },
  searchText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 20,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  cardDesc: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  btn: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  tierBox: {
    backgroundColor: 'rgba(249, 115, 22, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.15)',
    borderRadius: 18,
    padding: 20,
    gap: 14,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'between',
    alignItems: 'center',
  },
  tierName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  tierPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f97316',
  },
  tierFeatures: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 22,
  },
  tierBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#f97316',
  },
});
