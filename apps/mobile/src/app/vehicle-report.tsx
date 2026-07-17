import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

interface AiReport {
  id: string;
  finalDecision: string;
  summary: {
    overallAssessment: string;
    trimWarning?: string;
  };
  rating: {
    overall: number;
    engine: number;
    transmission: number;
    electronics: number;
    chassis: number;
  };
  chronicFaults: Array<{
    id: string;
    title: string;
    description: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  checklists: Array<{
    id: string;
    title: string;
    description: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  sellerQuestions: Array<{
    id: string;
    question: string;
    reason: string;
  }>;
}

export default function VehicleReportScreen() {
  const router = useRouter();
  const { variantId } = useLocalSearchParams();

  const [report, setReport] = useState<AiReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'faults' | 'checklist' | 'questions'>('summary');
  const [isFavorited, setIsFavorited] = useState(false);

  // Status messages for countdown
  const statusMessages = [
    'Araç verileri toplanıyor...',
    'Kullanıcı yorumları taranıyor...',
    'Kronik arıza kayıtları inceleniyor...',
    'Geri çağırma listeleri kontrol ediliyor...',
    'Yapay zeka analizi derleniyor...',
  ];
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    fetchReport();
    checkIfFavorited();
  }, [variantId]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      fetchReport(true);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
      // Change status message every 6 seconds
      if (countdown % 6 === 0) {
        setStatusIndex((prev) => (prev + 1) % statusMessages.length);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const checkIfFavorited = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return;
      const res = await fetch(`${API_URL}/favorites/status?variantId=${variantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsFavorited(data.isFavorited);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFavorite = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('Giriş Gerekli', 'Raporları favorilere eklemek için lütfen giriş yapın.');
        router.push('/login');
        return;
      }

      const res = await fetch(`${API_URL}/favorites/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ variantId }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsFavorited(data.isFavorited);
        Alert.alert('Bilgi', data.isFavorited ? 'Rapor favorilerinize eklendi.' : 'Rapor favorilerinizden kaldırıldı.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReport = async (force = false) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ variantId, languageCode: 'tr', force }),
      });

      if (res.status === 401) {
        Alert.alert('Giriş Gerekli', 'Lütfen giriş yapın.');
        router.push('/login');
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setReport(data);
        if (data.finalDecision === 'INSUFFICIENT_DATA' && countdown === null) {
          setCountdown(30);
        }
      } else {
        Alert.alert('Hata', data.message || 'Rapor getirilemedi.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Bağlantı Hatası', 'Rapor oluşturulurken bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `TorqueScout Araç Raporu: ${report?.summary.overallAssessment}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  // 1. COUNTDOWN LOADING SCREEN
  if (countdown !== null) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.countdownBox}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.countdownNum}>{countdown}</Text>
        </View>
        <Text style={styles.loadingTitle}>Analiz Hazırlanıyor...</Text>
        <Text style={styles.loadingStatus}>{statusMessages[statusIndex]}</Text>
        <Text style={styles.loadingDesc}>
          Bu araç varyantı platformda ilk defa analiz ediliyor. Web taraması, kronik hata arşivleri ve geri çağırma listeleri taranıyor.
        </Text>
      </View>
    );
  }

  // 2. NORMAL LOADING SCREEN
  if (loading && !report) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={[styles.loadingTitle, { marginTop: 12 }]}>Rapor Yükleniyor...</Text>
      </View>
    );
  }

  // 3. REPORT RENDER
  return (
    <View style={styles.container}>
      {report ? (
        <>
          {/* Header Actions */}
          <View style={styles.actionHeader}>
            <TouchableOpacity style={styles.actionBtn} onPress={toggleFavorite}>
              <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={22} color={isFavorited ? '#ef4444' : '#64748b'} />
              <Text style={styles.actionBtnText}>{isFavorited ? 'Favorilerde' : 'Favorilere Ekle'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={22} color="#64748b" />
              <Text style={styles.actionBtnText}>Paylaş</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Trim Incompatibility Warning Banner */}
            {report.summary.trimWarning && (
              <View style={styles.warningBanner}>
                <Ionicons name="warning" size={24} color="#f59e0b" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.warningTitle}>Donanım Uyumsuzluk Uyarısı</Text>
                  <Text style={styles.warningText}>{report.summary.trimWarning}</Text>
                </View>
              </View>
            )}

            {/* Sekme Butonları */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContainer} contentContainerStyle={styles.tabScrollContent}>
              <TouchableOpacity style={[styles.tabButton, activeTab === 'summary' && styles.activeTabButton]} onPress={() => setActiveTab('summary')}>
                <Text style={[styles.tabText, activeTab === 'summary' && styles.activeTabText]}>Genel Yorum</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabButton, activeTab === 'faults' && styles.activeTabButton]} onPress={() => setActiveTab('faults')}>
                <Text style={[styles.tabText, activeTab === 'faults' && styles.activeTabText]}>Kronik Sorunlar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabButton, activeTab === 'checklist' && styles.activeTabButton]} onPress={() => setActiveTab('checklist')}>
                <Text style={[styles.tabText, activeTab === 'checklist' && styles.activeTabText]}>Ekspertiz Rehberi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabButton, activeTab === 'questions' && styles.activeTabButton]} onPress={() => setActiveTab('questions')}>
                <Text style={[styles.tabText, activeTab === 'questions' && styles.activeTabText]}>Satıcıya Sorular</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* TAB CONTENTS */}
            {activeTab === 'summary' && (
              <View style={styles.tabContent}>
                <View style={styles.card}>
                  <Text style={styles.cardHeader}>📊 Alınabilirlik Skorları</Text>
                  <View style={styles.scoreRow}>
                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreNum}>{report.rating.overall}/5</Text>
                      <Text style={styles.scoreLabel}>Genel Puan</Text>
                    </View>
                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreNum}>{report.rating.engine}/5</Text>
                      <Text style={styles.scoreLabel}>Motor</Text>
                    </View>
                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreNum}>{report.rating.transmission}/5</Text>
                      <Text style={styles.scoreLabel}>Şanzıman</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardHeader}>💬 Genel Yorum ve Karar</Text>
                  <Text style={styles.summaryText}>{report.summary.overallAssessment}</Text>
                </View>
              </View>
            )}

            {activeTab === 'faults' && (
              <View style={styles.tabContent}>
                <Text style={styles.sectionHeader}>⚠️ Bilinen Kronik Arızalar</Text>
                {report.chronicFaults.length > 0 ? (
                  report.chronicFaults.map((item) => (
                    <View key={item.id} style={styles.itemCard}>
                      <View style={styles.itemHeaderRow}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <View style={[styles.badge, item.riskLevel === 'HIGH' ? styles.badgeHigh : item.riskLevel === 'MEDIUM' ? styles.badgeMedium : styles.badgeLow]}>
                          <Text style={styles.badgeText}>{item.riskLevel}</Text>
                        </View>
                      </View>
                      <Text style={styles.itemDesc}>{item.description}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>Bu araca dair tespit edilmiş kronik arıza bulunmamaktadır.</Text>
                )}
              </View>
            )}

            {activeTab === 'checklist' && (
              <View style={styles.tabContent}>
                <Text style={styles.sectionHeader}>📋 Alırken Dikkat Edilecekler</Text>
                {report.checklists.length > 0 ? (
                  report.checklists.map((item) => (
                    <View key={item.id} style={styles.itemCard}>
                      <View style={styles.itemHeaderRow}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <View style={[styles.badge, item.riskLevel === 'HIGH' ? styles.badgeHigh : item.riskLevel === 'MEDIUM' ? styles.badgeMedium : styles.badgeLow]}>
                          <Text style={styles.badgeText}>{item.riskLevel}</Text>
                        </View>
                      </View>
                      <Text style={styles.itemDesc}>{item.description}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>Bu araç için özel bir ekspertiz checklist kaydı yok.</Text>
                )}
              </View>
            )}

            {activeTab === 'questions' && (
              <View style={styles.tabContent}>
                <Text style={styles.sectionHeader}>💬 Satıcıya Sorulacak Sorular</Text>
                {report.sellerQuestions.length > 0 ? (
                  report.sellerQuestions.map((item) => (
                    <View key={item.id} style={styles.itemCard}>
                      <Text style={styles.questionText}>❓ {item.question}</Text>
                      <Text style={styles.reasonText}>Gerekçe: {item.reason}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>Önerilen bir satıcı sorusu bulunmamaktadır.</Text>
                )}
              </View>
            )}
          </ScrollView>
        </>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingTitle}>Rapor Bulunamadı</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0f172a',
  },
  countdownBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  countdownNum: {
    position: 'absolute',
    color: '#f97316',
    fontSize: 24,
    fontWeight: '900',
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
  },
  loadingStatus: {
    color: '#f97316',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  loadingDesc: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 16,
    maxWidth: 280,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  warningBanner: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 18,
    padding: 16,
  },
  warningTitle: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  warningText: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
  },
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabScrollContent: {
    gap: 12,
    paddingBottom: 8,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  activeTabButton: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderColor: 'rgba(249, 115, 22, 0.25)',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  activeTabText: {
    color: '#f97316',
  },
  tabContent: {
    gap: 16,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '800',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreNum: {
    color: '#f97316',
    fontSize: 20,
    fontWeight: '900',
  },
  scoreLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  summaryText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 20,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#cbd5e1',
    marginBottom: 4,
  },
  itemCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  itemTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  itemDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeHigh: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  badgeMedium: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  badgeLow: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  badgeText: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '800',
  },
  questionText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
  },
  reasonText: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 20,
  },
});
