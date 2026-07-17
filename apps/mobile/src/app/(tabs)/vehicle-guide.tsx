import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

interface Fact {
  id: string;
  factType: 'INTERESTING_FACT' | 'KNOWN_ISSUE' | 'BUYING_TIP' | 'USER_EXPERIENCE';
  title: string;
  description: string;
  iconKey: string;
}

interface GuideCard {
  id: string;
  brand: string;
  model: string;
  generationName: string | null;
  bodyType: string;
  yearStart: number;
  yearEnd: number | null;
  heroImageUrl: string;
  shortSummary: string;
  facts: Fact[];
}

export default function VehicleGuideScreen() {
  const [card, setCard] = useState<GuideCard | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRandomCard();
  }, []);

  const fetchRandomCard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/vehicle-guide/cards/random?locale=tr`);
      if (res.ok) {
        const data = await res.json();
        setCard(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getIconName = (key: string): any => {
    switch (key) {
      case 'shield': return 'shield-checkmark';
      case 'gearbox': return 'cog';
      case 'calendar': return 'calendar';
      case 'user': return 'people';
      default: return 'information-circle';
    }
  };

  const getFactBadgeColor = (type: Fact['factType']) => {
    switch (type) {
      case 'KNOWN_ISSUE': return 'rgba(239, 68, 68, 0.1)';
      case 'BUYING_TIP': return 'rgba(245, 158, 11, 0.1)';
      case 'USER_EXPERIENCE': return 'rgba(59, 130, 246, 0.1)';
      default: return 'rgba(16, 185, 129, 0.1)';
    }
  };

  const getFactTextColor = (type: Fact['factType']) => {
    switch (type) {
      case 'KNOWN_ISSUE': return '#ef4444';
      case 'BUYING_TIP': return '#f59e0b';
      case 'USER_EXPERIENCE': return '#3b82f6';
      default: return '#10b981';
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>Sonraki araç yükleniyor...</Text>
        </View>
      ) : card ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Card Hero Image */}
          <View style={styles.imageContainer}>
            <Image source={{ uri: card.heroImageUrl }} style={styles.heroImage} resizeMode="cover" />
            <View style={styles.imageOverlay} />
            <View style={styles.titleOverlay}>
              <Text style={styles.brandTitle}>{card.brand} {card.model}</Text>
              <Text style={styles.yearsText}>
                {card.generationName ? `${card.generationName} • ` : ''}
                {card.yearStart} - {card.yearEnd || 'Günümüz'}
              </Text>
            </View>
          </View>

          {/* Short Summary */}
          <View style={styles.card}>
            <Text style={styles.summaryTitle}>📝 Genel Bakış</Text>
            <Text style={styles.summaryText}>{card.shortSummary}</Text>
          </View>

          {/* Facts / Lists */}
          <View style={styles.factsContainer}>
            <Text style={styles.sectionHeader}>💡 Önemli Bilgiler & Kronikler</Text>
            {card.facts.map((fact) => (
              <View key={fact.id} style={styles.factCard}>
                <View style={styles.factHeader}>
                  <View style={[styles.iconBox, { backgroundColor: getFactBadgeColor(fact.factType) }]}>
                    <Ionicons name={getIconName(fact.iconKey)} size={20} color={getFactTextColor(fact.factType)} />
                  </View>
                  <Text style={styles.factTitle}>{fact.title}</Text>
                </View>
                <Text style={styles.factDesc}>{fact.description}</Text>
              </View>
            ))}
          </View>

          {/* Next Card Button */}
          <TouchableOpacity style={styles.nextBtn} onPress={fetchRandomCard}>
            <Ionicons name="shuffle" size={20} color="#fff" />
            <Text style={styles.nextBtnText}>Başka Bir Araç Getir</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Text style={styles.errorText}>Rehber kartı yüklenemedi.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 12,
  },
  errorText: {
    color: '#64748b',
    fontSize: 13,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1e293b',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    gap: 4,
  },
  brandTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
  },
  yearsText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  summaryTitle: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '800',
  },
  summaryText: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 20,
  },
  factsContainer: {
    gap: 12,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#cbd5e1',
    marginTop: 8,
  },
  factCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  factHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  factTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  factDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f97316',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    marginTop: 12,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
