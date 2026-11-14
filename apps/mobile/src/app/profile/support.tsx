import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDeviceSafeArea } from '../../utils/deviceSafeArea';

let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (e) {
  console.warn('ImagePicker could not be loaded:', e);
}

const API_URL = 'https://used-car-api-hzmu.onrender.com';

const SUBJECT_OPTIONS = [
  { value: 'GENERAL_SUGGESTION', label: 'Genel Öneri' },
  { value: 'BUG_REPORT', label: 'Hata Bildirimi' },
  { value: 'VEHICLE_QUERY_AI_REPORT', label: 'Araç Sorgulama / AI Rapor' },
  { value: 'INCORRECT_VEHICLE_DATA', label: 'Eksik veya Hatalı Araç Bilgisi' },
  { value: 'LISTINGS', label: 'İlanlar' },
  { value: 'MESSAGES', label: 'Mesajlar' },
  { value: 'FAVORITES', label: 'Favoriler' },
  { value: 'SUBSCRIPTION_PACKAGES', label: 'Abonelik / Paketler' },
  { value: 'ACCOUNT_PROFILE', label: 'Hesap / Profil' },
  { value: 'VEHICLE_GUIDE', label: 'Araç Rehberi' },
  { value: 'VEHICLE_COMPARISON', label: 'Araç Karşılaştırma' },
  { value: 'FIND_MY_CAR', label: 'Aracını Bul' },
  { value: 'DESIGN_USABILITY', label: 'Tasarım / Kullanım Kolaylığı' },
  { value: 'SECURITY_SUSPICIOUS_ACTIVITY', label: 'Güvenlik / Şüpheli İşlem' },
  { value: 'OTHER', label: 'Diğer' },
];

const FAQ_ITEMS = [
  {
    q: 'Nasıl ilan eklerim?',
    a: "Hesap menünüzden '+ İlan Ekle' butonuna basarak aracınızın marka, model, yıl, kilometre ve hasar durumunu doldurup ilanınızı yayına alabilirsiniz.",
  },
  {
    q: 'TorqueScout Araç Raporu nasıl hazırlanır?',
    a: 'Yapay zeka modellerimiz ve Türkiye/Avrupa otomotiv veritabanlarımız, aracın marka, model, motor kodu ve üretim yılına göre bilinen tüm kronik arızalarını, şanzıman ve motor risklerini saniyeler içinde analiz eder.',
  },
  {
    q: 'Abonelik paketleri arasındaki farklar nelerdir?',
    a: 'Tanışma paketinde 1 adet ilan yayınlanabilir. Yetkin pakette 10, Profesyonel pakette ise 50 ilana kadar aktif yayın hakkınız ve yüksek AI rapor/chatbot kotanız bulunmaktadır.',
  },
  {
    q: 'Kayıtlı arama nedir ve nasıl kullanılır?',
    a: "İlanları ararken filtrelediğiniz kriterleri 'Aramayı Kaydet' diyerek favorilerinize ekleyebilirsiniz. Bu aramalara uygun yeni bir ilan eklendiğinde size e-posta/push bildirimi gönderilir.",
  },
  {
    q: 'Favori raporlarımı nereden görebilirim?',
    a: 'Profilinizdeki "Favori Raporlarım" sekmesinden daha önce incelediğiniz ve kaydettiğiniz tüm AI analizlerine dilediğiniz zaman ulaşabilirsiniz.',
  },
];

export default function SupportScreen() {
  const router = useRouter();
  const { safeTopInset, safeBottomInset, maxSheetHeight } = useDeviceSafeArea();
  const params = useLocalSearchParams();
  const listingId = params.listingId ? String(params.listingId) : '';
  const isListingReport = Boolean(listingId);

  const [activeTab, setActiveTab] = useState<'HELP' | 'FEEDBACK'>(
    params.tab === 'feedback' || isListingReport ? 'FEEDBACK' : 'HELP'
  );

  const [feedbackCategory, setFeedbackCategory] = useState<string>(() => {
    if (isListingReport) return 'LISTINGS';
    if (params.category) return String(params.category);
    return 'GENERAL_SUGGESTION';
  });
  const [subjectPickerVisible, setSubjectPickerVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);
  const [attachmentMime, setAttachmentMime] = useState<string>('image/jpeg');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (params.tab === 'feedback' || isListingReport) {
      setActiveTab('FEEDBACK');
    } else if (params.tab === 'help') {
      setActiveTab('HELP');
    }
    if (params.category) {
      setFeedbackCategory(String(params.category));
    }
  }, [params.tab, params.category, isListingReport]);

  const handlePickScreenshot = async () => {
    try {
      if (!ImagePicker) {
        Alert.alert('Hata', 'Görsel seçici modülü yüklenemedi.');
        return;
      }
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Ekran görüntüsü eklemek için galeri erişim izni vermelisiniz.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'Images',
        allowsEditing: false,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAttachmentUri(asset.uri);
        setAttachmentMime(asset.mimeType || 'image/jpeg');
      }
    } catch (e) {
      Alert.alert('Hata', 'Görsel seçilirken bir hata oluştu.');
    }
  };

  const handleSendFeedback = async () => {
    const trimmed = feedbackText.trim();
    if (trimmed.length < 10) {
      Alert.alert('Uyarı', 'Açıklamanız en az 10 karakter olmalıdır.');
      return;
    }
    if (trimmed.length > 2000) {
      Alert.alert('Uyarı', 'Açıklamanız en fazla 2000 karakter olabilir.');
      return;
    }

    setSending(true);
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));

      if (!token) {
        Alert.alert('Oturum Gerekli', 'Bildirim göndermek için lütfen giriş yapın.');
        setSending(false);
        return;
      }

      const formData = new FormData();
      formData.append('message', trimmed);
      if (!isListingReport) {
        formData.append('subjectCategory', feedbackCategory);
      }
      if (attachmentUri) {
        const filename = attachmentUri.split('/').pop() || 'screenshot.jpg';
        formData.append('attachment', {
          uri: attachmentUri,
          name: filename,
          type: attachmentMime,
        } as any);
      }

      const endpoint = isListingReport
        ? `${API_URL}/listings/${listingId}/report`
        : `${API_URL}/feedback`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const responseData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(responseData.message || 'Bildirim gönderilemedi.');
      }

      setFeedbackText('');
      setAttachmentUri(null);
      Alert.alert(
        'Teşekkürler! 🎉',
        isListingReport
          ? `Bildiriminiz alındı (Bildirim No: ${responseData.ticketNo || 'RPT-KAYIT'}).`
          : 'Geri bildiriminiz alındı. TorqueScout’u geliştirmemize yardımcı olduğunuz için teşekkür ederiz.',
        [{ text: 'Tamam', onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Bildirim gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setSending(false);
    }
  };

  const selectedSubjectLabel =
    SUBJECT_OPTIONS.find((o) => o.value === feedbackCategory)?.label || 'Genel Öneri';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isListingReport ? 'İlanı Bildir / Şikâyet Et' : 'Destek & Yardım'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      {!isListingReport && (
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
      )}

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
            <Text style={styles.feedbackTitle}>
              {isListingReport
                ? '⚑ İlanı Bildir / Şikâyet Et'
                : 'Geri Bildiriminiz Bizim İçin Değerli'}
            </Text>
            <Text style={styles.feedbackSub}>
              {isListingReport
                ? 'Şüpheli, hatalı veya kurallara aykırı olduğunu düşündüğünüz ilanı yönetici ekibimize bildirin.'
                : 'TorqueScout hakkındaki önerilerinizi, hata bildirimlerinizi veya görüşlerinizi bizimle paylaşın.'}
            </Text>

            {/* Subject Selector (15 Web Subjects) */}
            <Text style={styles.inputLabel}>Konu</Text>
            {isListingReport ? (
              <View style={[styles.dropdownBtn, { borderColor: '#fed7aa', backgroundColor: '#fff7ed' }]}>
                <Text style={[styles.dropdownBtnText, { color: '#ea580c' }]}>İlanlar (Kilitli)</Text>
                <Ionicons name="lock-closed" size={16} color="#ea580c" />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.dropdownBtn}
                activeOpacity={0.8}
                onPress={() => setSubjectPickerVisible(true)}
              >
                <Text style={styles.dropdownBtnText}>{selectedSubjectLabel}</Text>
                <Ionicons name="chevron-down" size={18} color="#64748b" />
              </TouchableOpacity>
            )}

            {/* Message Input */}
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>
                {isListingReport ? 'Şikâyetiniz / Açıklamanız' : 'Mesajınız'}
              </Text>
              <Text style={styles.charCounter}>{feedbackText.length} / 2000</Text>
            </View>
            <TextInput
              style={styles.textArea}
              placeholder={
                isListingReport
                  ? 'Bu ilanla ilgili bildirmek istediğiniz durumu açıklayın (en az 10 karakter)...'
                  : 'Geri bildiriminizi detaylandırın (en az 10 karakter)...'
              }
              placeholderTextColor="#94a3b8"
              value={feedbackText}
              onChangeText={setFeedbackText}
              maxLength={2000}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            {/* Optional Screenshot Upload (Matching Web) */}
            <Text style={styles.inputLabel}>Ekran Görüntüsü Ekle (Opsiyonel)</Text>
            {attachmentUri ? (
              <View style={styles.attachmentPreviewBox}>
                <ExpoImage
                  source={{ uri: attachmentUri }}
                  style={styles.attachmentImg}
                  contentFit="cover"
                />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.attachmentName}>Ekran görüntüsü eklendi</Text>
                  <TouchableOpacity
                    style={styles.removeAttachmentBtn}
                    onPress={() => setAttachmentUri(null)}
                  >
                    <Ionicons name="trash-outline" size={14} color="#ef4444" />
                    <Text style={styles.removeAttachmentText}>Görseli Kaldır</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.pickScreenshotBtn}
                activeOpacity={0.8}
                onPress={handlePickScreenshot}
              >
                <Ionicons name="image-outline" size={18} color="#475569" />
                <Text style={styles.pickScreenshotText}>Galeriden Ekran Görüntüsü Seç</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.hintText}>
              İzin verilen formatlar: JPG, JPEG, PNG, WEBP. Maksimum dosya boyutu: 5MB
            </Text>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (sending || feedbackText.trim().length < 10) && styles.submitBtnDisabled,
              ]}
              onPress={handleSendFeedback}
              disabled={sending || feedbackText.trim().length < 10}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color="#ffffff" />
                  <Text style={styles.submitBtnText}>
                    {isListingReport ? 'Şikâyeti Gönder' : 'Geri Bildirim Gönder'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Subject Picker Modal */}
      <Modal
        visible={subjectPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSubjectPickerVisible(false)}
      >
        <View style={[styles.modalBackdrop, { paddingTop: safeTopInset + 8 }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSubjectPickerVisible(false)}
          />
          <View
            style={[
              styles.modalSheet,
              {
                maxHeight: maxSheetHeight,
                paddingBottom: Math.max(safeBottomInset + 12, 24),
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Konu Seçin</Text>
              <TouchableOpacity onPress={() => setSubjectPickerVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              {SUBJECT_OPTIONS.map((opt) => {
                const isSelected = feedbackCategory === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.modalOptionRow, isSelected && styles.modalOptionRowActive]}
                    onPress={() => {
                      setFeedbackCategory(opt.value);
                      setSubjectPickerVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        isSelected && styles.modalOptionTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color="#ea580c" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  charCounter: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
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
  pickScreenshotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
  },
  pickScreenshotText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  attachmentPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
  },
  attachmentImg: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  attachmentName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  removeAttachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  removeAttachmentText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ef4444',
  },
  hintText: {
    fontSize: 10.5,
    color: '#94a3b8',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  modalOptionRowActive: {
    backgroundColor: '#fff7ed',
  },
  modalOptionText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#334155',
  },
  modalOptionTextActive: {
    fontWeight: '800',
    color: '#ea580c',
  },
});
