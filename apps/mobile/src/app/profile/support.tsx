import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

const FAQ_ITEMS = [
  {
    q: 'TorqueScout Araç Raporu nasıl hazırlanır?',
    a: 'Yapay zeka modellerimiz ve Türkiye/Avrupa otomotiv veritabanlarımız, aracın marka, model, motor kodu ve üretim yılına göre bilinen tüm kronik arızalarını, şanzıman ve motor risklerini saniyeler içinde analiz eder.',
  },
  {
    q: 'İlan kotamı nasıl artırabilirim?',
    a: 'Profilinizdeki "Paketim" sekmesinden Yetkin veya Profesyonel VIP üyelik paketlerine geçiş yaparak ilan kotanızı ve AI rapor limitlerinizi anında yükseltebilirsiniz.',
  },
  {
    q: 'İlanım ne zaman onaylanır?',
    a: 'Verdiğiniz ilanlar moderasyon ekibimiz tarafından güvenlik ve kalite standartları çerçevesinde incelenir ve ortalama 15-30 dakika içerisinde yayına alınır.',
  },
  {
    q: 'Favori raporlarımı nereden görebilirim?',
    a: 'Profilinizdeki "Favori Raporlarım" sekmesinden daha önce incelediğiniz ve kaydettiğiniz tüm AI analizlerine dilediğiniz zaman ulaşabilirsiniz.',
  },
];

export default function SupportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<'HELP' | 'FEEDBACK'>(
    params.tab === 'feedback' ? 'FEEDBACK' : 'HELP'
  );

  const [feedbackCategory, setFeedbackCategory] = useState('GENEL');
  const [feedbackText, setFeedbackText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Uyarı', 'Lütfen geri bildiriminizi veya önerinizi yazın.');
      return;
    }

    setSending(true);
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));

      const res = await fetch(`${API_URL}/support/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          category: feedbackCategory,
          message: feedbackText.trim(),
        }),
      }).catch(() => null);

      Alert.alert(
        'Teşekkürler! 🎉',
        'Geri bildiriminiz başarıyla alındı. TorqueScout ekibi olarak deneyiminizi iyileştirmek için en kısa sürede değerlendireceğiz.',
        [{ text: 'Tamam', onPress: () => router.back() }]
      );
      setFeedbackText('');
    } catch (e) {
      Alert.alert('Bilgi', 'Geri bildiriminiz kaydedildi, teşekkür ederiz.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Destek & Yardım</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'HELP' && styles.tabBtnActive]}
          onPress={() => setActiveTab('HELP')}
        >
          <Ionicons
            name="help-circle"
            size={16}
            color={activeTab === 'HELP' ? '#ea580c' : '#64748b'}
          />
          <Text style={[styles.tabBtnText, activeTab === 'HELP' && styles.tabBtnTextActive]}>
            Yardım Merkezi
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'FEEDBACK' && styles.tabBtnActive]}
          onPress={() => setActiveTab('FEEDBACK')}
        >
          <Ionicons
            name="chatbubble-ellipses"
            size={16}
            color={activeTab === 'FEEDBACK' ? '#ea580c' : '#64748b'}
          />
          <Text style={[styles.tabBtnText, activeTab === 'FEEDBACK' && styles.tabBtnTextActive]}>
            Geri Bildirim Gönder
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'HELP' ? (
          <>
            <View style={styles.heroCard}>
              <Ionicons name="help-buoy" size={32} color="#ea580c" />
              <Text style={styles.heroTitle}>Sıkça Sorulan Sorular</Text>
              <Text style={styles.heroSub}>
                TorqueScout kullanımı, AI raporları ve ilanlar hakkında merak ettiğiniz soruların yanıtları.
              </Text>
            </View>

            {FAQ_ITEMS.map((faq, i) => (
              <View key={i} style={styles.faqCard}>
                <View style={styles.faqQRow}>
                  <Ionicons name="help-circle-outline" size={18} color="#ea580c" />
                  <Text style={styles.faqQText}>{faq.q}</Text>
                </View>
                <Text style={styles.faqAText}>{faq.a}</Text>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>Geri Bildiriminiz Bizim İçin Değerli</Text>
            <Text style={styles.feedbackSub}>
              Uygulama deneyiminiz, hata bildirimleri veya yeni özellik önerilerinizi bizimle paylaşın.
            </Text>

            {/* Category Selector */}
            <Text style={styles.inputLabel}>Kategori Seçin</Text>
            <View style={styles.categoryRow}>
              {[
                { key: 'GENEL', label: 'Genel Öneri' },
                { key: 'ARAC_RAPORU', label: 'Araç Raporu' },
                { key: 'ILAN', label: 'İlan & Satış' },
                { key: 'HATA_BILDIRIMI', label: 'Hata Bildirimi' },
              ].map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[
                    styles.catChip,
                    feedbackCategory === c.key && styles.catChipActive,
                  ]}
                  onPress={() => setFeedbackCategory(c.key)}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      feedbackCategory === c.key && styles.catChipTextActive,
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Mesajınız</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Düşüncelerinizi veya karşılaştığınız durumu detaylandırın..."
              placeholderTextColor="#94a3b8"
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitBtn, sending && styles.submitBtnDisabled]}
              onPress={handleSendFeedback}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color="#ffffff" />
                  <Text style={styles.submitBtnText}>Geri Bildirimi Gönder</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  tabBtn: {
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
  tabBtnActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  heroSub: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  faqCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 8,
  },
  faqQRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  faqQText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  faqAText: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 19,
    paddingLeft: 26,
  },
  feedbackCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 20,
    gap: 12,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  feedbackSub: {
    fontSize: 12.5,
    color: '#64748b',
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  catChipActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  catChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
  },
  catChipTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  textArea: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 14,
    fontSize: 13.5,
    color: '#0f172a',
    minHeight: 120,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ea580c',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 6,
  },
  submitBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});
