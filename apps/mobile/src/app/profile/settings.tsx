import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<any>(null);
  const sectionOffsetsRef = useRef<Record<string, number>>({});

  const [loading, setLoading] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Notification Settings (matching Web /users/me/notifications)
  const [settings, setSettings] = useState({
    emailMessages: true,
    emailListingUpdates: true,
    emailSavedSearchAlerts: true,
    emailSubscriptionUpdates: true,
    pushMessages: true,
    pushListingUpdates: true,
    pushSavedSearchAlerts: true,
  });

  // Account Cancellation States (matching Web /users/me/cancel-account)
  const [confirm1, setConfirm1] = useState(false);
  const [confirm2, setConfirm2] = useState(false);
  const [cancelPassword, setCancelPassword] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!loading && params.section) {
      const targetKey = String(params.section);
      const timer = setTimeout(() => {
        const yOffset = sectionOffsetsRef.current[targetKey];
        if (typeof yOffset === 'number' && scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: Math.max(0, yOffset - 12), animated: true });
        }
      }, 280);
      return () => clearTimeout(timer);
    }
  }, [loading, params.section]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const storedToken =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));
      setToken(storedToken);

      if (!storedToken) {
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.notificationSettings) {
          setSettings((prev) => ({
            ...prev,
            ...data.notificationSettings,
          }));
        }
      }
    } catch (e) {
      console.error('Fetch notification settings error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSetting = (key: keyof typeof settings, val: boolean) => {
    setSettings((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleSaveNotifications = async () => {
    if (!token) return;
    setSavingNotifications(true);
    try {
      const res = await fetch(`${API_URL}/users/me/notifications`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Bildirim ayarları güncellenemedi.');
      }

      setSettings((prev) => ({ ...prev, ...data }));
      Alert.alert('Başarılı', 'Bildirim ayarlarınız başarıyla kaydedildi!');
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Bildirim tercihleri kaydedilemedi.');
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleAccountCancel = () => {
    if (!confirm1 || !confirm2 || !cancelPassword.trim()) {
      Alert.alert(
        'Eksik Onay',
        'Lütfen her iki onay kutucuğunu işaretleyin ve şifrenizi girin.'
      );
      return;
    }

    Alert.alert(
      'Hesap İptali Onayı',
      'Hesabınızı kalıcı olarak kapatmak istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Hesabımı Kapat',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            setCancelling(true);
            try {
              const res = await fetch(`${API_URL}/users/me/cancel-account`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ password: cancelPassword }),
              });

              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                throw new Error(data.message || 'Hesap kapatılamadı.');
              }

              await AsyncStorage.removeItem('accessToken');
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('user');

              Alert.alert(
                'Hesap Kapatıldı',
                'Hesabınız başarıyla iptal edildi ve tüm ilanlarınız yayından kaldırıldı.',
                [{ text: 'Tamam', onPress: () => router.replace('/(tabs)' as any) }]
              );
            } catch (err: any) {
              Alert.alert('Hata', err.message || 'Hesap kapatılırken bir sorun oluştu.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const isCancelFormInvalid = !confirm1 || !confirm2 || !cancelPassword.trim();

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={styles.loadingText}>Ayarlar yükleniyor...</Text>
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
        <Text style={styles.headerTitle}>Bildirim, Güvenlik & Hesap</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. BİLDİRİM AYARLARI (Matching Web /dashboard/account/notifications) */}
          <View
            onLayout={(e) => {
              sectionOffsetsRef.current.notifications = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.sectionTitle}>Bildirim Ayarları</Text>
            <Text style={styles.sectionSub}>
              Platform içi ve e-posta bildirim tercihlerinizi özelleştirin.
            </Text>

            <View style={styles.cardContainer}>
              <Text style={styles.groupBadgeTitle}>E-POSTA BİLDİRİMLERİ</Text>

              <View style={styles.switchRow}>
                <View style={styles.switchTextWrap}>
                  <Text style={styles.switchTitle}>Yeni Mesajlar</Text>
                  <Text style={styles.switchSub}>
                    Alıcı veya satıcılardan yeni mesaj aldığınızda e-posta gönderilir.
                  </Text>
                </View>
                <Switch
                  value={settings.emailMessages}
                  onValueChange={(val) => handleToggleSetting('emailMessages', val)}
                  trackColor={{ false: '#cbd5e1', true: '#ea580c' }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchTextWrap}>
                  <Text style={styles.switchTitle}>İlan Güncellemeleri</Text>
                  <Text style={styles.switchSub}>
                    İlanlarınız onaylandığında veya süresi dolduğunda bilgilendirme alırsınız.
                  </Text>
                </View>
                <Switch
                  value={settings.emailListingUpdates}
                  onValueChange={(val) => handleToggleSetting('emailListingUpdates', val)}
                  trackColor={{ false: '#cbd5e1', true: '#ea580c' }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchTextWrap}>
                  <Text style={styles.switchTitle}>Favori Arama Alarmları</Text>
                  <Text style={styles.switchSub}>
                    Favoriye kaydettiğiniz kriterlere uygun yeni ilan yüklendiğinde bildirim alırsınız.
                  </Text>
                </View>
                <Switch
                  value={settings.emailSavedSearchAlerts}
                  onValueChange={(val) => handleToggleSetting('emailSavedSearchAlerts', val)}
                  trackColor={{ false: '#cbd5e1', true: '#ea580c' }}
                />
              </View>

              <Text style={[styles.groupBadgeTitle, { marginTop: 8 }]}>
                ANLIK (PUSH) BİLDİRİMLER
              </Text>

              <View style={styles.switchRow}>
                <View style={styles.switchTextWrap}>
                  <Text style={styles.switchTitle}>Anlık Mesajlar</Text>
                  <Text style={styles.switchSub}>
                    Yeni bir sohbet mesajı geldiğinde anlık bildirim gösterilir.
                  </Text>
                </View>
                <Switch
                  value={settings.pushMessages}
                  onValueChange={(val) => handleToggleSetting('pushMessages', val)}
                  trackColor={{ false: '#cbd5e1', true: '#ea580c' }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchTextWrap}>
                  <Text style={styles.switchTitle}>İlan Güncellemeleri</Text>
                  <Text style={styles.switchSub}>
                    İlanlarınız onaylandığında cihazınızda anlık uyarı alırsınız.
                  </Text>
                </View>
                <Switch
                  value={settings.pushListingUpdates}
                  onValueChange={(val) => handleToggleSetting('pushListingUpdates', val)}
                  trackColor={{ false: '#cbd5e1', true: '#ea580c' }}
                />
              </View>

              <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
                <View style={styles.switchTextWrap}>
                  <Text style={styles.switchTitle}>Favori Arama Alarmları</Text>
                  <Text style={styles.switchSub}>
                    Favori aramalarınızın eşleştiği yeni ilanlar için anlık bildirim alırsınız.
                  </Text>
                </View>
                <Switch
                  value={settings.pushSavedSearchAlerts}
                  onValueChange={(val) => handleToggleSetting('pushSavedSearchAlerts', val)}
                  trackColor={{ false: '#cbd5e1', true: '#ea580c' }}
                />
              </View>

              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={[styles.saveBtn, savingNotifications && styles.btnDisabled]}
                  onPress={handleSaveNotifications}
                  disabled={savingNotifications}
                >
                  {savingNotifications ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
                      <Text style={styles.saveBtnText}>Tercihleri Kaydet</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 2. HESAP GÜVENLİĞİ (Matching Web /dashboard/account/security) */}
          <View
            onLayout={(e) => {
              sectionOffsetsRef.current.security = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.sectionTitle}>Hesap Güvenliği</Text>
            <Text style={styles.sectionSub}>
              Hesabınızın güvenlik ayarlarını, şifrenizi ve aktif oturumları yönetin.
            </Text>

            <View style={styles.cardContainer}>
              <TouchableOpacity
                style={styles.navRow}
                onPress={() =>
                  router.push({
                    pathname: '/profile/personal-info',
                    params: { section: 'password' },
                  } as any)
                }
              >
                <View style={styles.navLeft}>
                  <Ionicons name="key-outline" size={18} color="#ea580c" />
                  <View>
                    <Text style={styles.navTitle}>Şifre Değiştir</Text>
                    <Text style={styles.switchSub}>Mevcut şifrenizi güncelleyin veya sıfırlayın</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <View style={styles.securityActionRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.switchTitle}>İki Adımlı Doğrulama (2FA)</Text>
                  <Text style={styles.switchSub}>
                    Hesabınıza giriş yaparken ek güvenlik adımı olarak mobil doğrulama uygulaması kullanın.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.securityOutlineBtn}
                  onPress={() =>
                    Alert.alert(
                      'İki Adımlı Doğrulama',
                      'İki adımlı doğrulama kurulum sihirbazı yakında aktif olacaktır.'
                    )
                  }
                >
                  <Text style={styles.securityOutlineBtnText}>Kurulumu Başlat</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.securityActionRow, { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.switchTitle}>Aktif Oturumlar</Text>
                  <Text style={styles.switchSub}>
                    Hesabınızın açık olduğu diğer tarayıcı ve mobil cihaz oturumlarını sonlandırın.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.securityDangerOutlineBtn}
                  onPress={() =>
                    Alert.alert('Başarılı', 'Diğer tüm aktif oturumlar başarıyla kapatıldı!')
                  }
                >
                  <Text style={styles.securityDangerOutlineBtnText}>Diğer Oturumları Kapat</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 3. HESAP İPTALİ (Matching Web /dashboard/account/cancel) */}
          <View
            onLayout={(e) => {
              sectionOffsetsRef.current.cancel = e.nativeEvent.layout.y;
            }}
          >
            <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>Hesap İptali</Text>
            <Text style={styles.sectionSub}>TorqueScout hesabınızı kalıcı olarak kapatın.</Text>

            <View style={styles.cancelCard}>
              <View style={styles.warningBox}>
                <Text style={styles.warningHeader}>⚠️ ÖNEMLİ UYARI</Text>
                <Text style={styles.warningBullet}>
                  • Aktif tüm ilanlarınız anında yayından kaldırılacak ve deaktif edilecektir.
                </Text>
                <Text style={styles.warningBullet}>
                  • Favori listeleriniz, arama filtreleriniz ve kullanıcı verileriniz temizlenecektir.
                </Text>
                <Text style={styles.warningBullet}>
                  • Finansal/fatura geçmişi yasal saklama yükümlülüğü nedeniyle korunacak, ancak kişisel bilgileriniz KVKK kurallarına göre anonimleştirilecektir.
                </Text>
                <Text style={styles.warningBullet}>• Bu işlem kesinlikle geri alınamaz.</Text>
              </View>

              <TouchableOpacity
                style={styles.checkboxRow}
                activeOpacity={0.8}
                onPress={() => setConfirm1(!confirm1)}
              >
                <Ionicons
                  name={confirm1 ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={confirm1 ? '#ef4444' : '#94a3b8'}
                />
                <Text style={styles.checkboxLabel}>
                  Aktif ilanlarımın yayından kaldırılacağını ve hesabımın kapatılacağını biliyorum.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                activeOpacity={0.8}
                onPress={() => setConfirm2(!confirm2)}
              >
                <Ionicons
                  name={confirm2 ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={confirm2 ? '#ef4444' : '#94a3b8'}
                />
                <Text style={styles.checkboxLabel}>
                  Bu işlemin geri alınamaz olduğunu onaylıyorum.
                </Text>
              </TouchableOpacity>

              <View style={styles.passwordVerifyWrap}>
                <Text style={styles.passwordVerifyLabel}>Şifre Doğrulama</Text>
                <TextInput
                  style={styles.passwordInput}
                  value={cancelPassword}
                  onChangeText={setCancelPassword}
                  placeholder="Şifreniz"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.cancelSubmitBtn,
                  (isCancelFormInvalid || cancelling) && styles.btnDisabled,
                ]}
                disabled={isCancelFormInvalid || cancelling}
                onPress={handleAccountCancel}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={18} color="#ffffff" />
                    <Text style={styles.cancelSubmitBtnText}>Hesabımı Kalıcı Olarak Kapat</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollContent: {
    padding: 16,
    gap: 20,
    paddingBottom: 44,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 10,
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  groupBadgeTitle: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  switchTextWrap: {
    flex: 1,
    gap: 2,
  },
  switchTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  switchSub: {
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 16,
  },
  cardFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  saveBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  navTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  securityActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  securityOutlineBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  securityOutlineBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  securityDangerOutlineBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  securityDangerOutlineBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ef4444',
  },
  cancelCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#fecaca',
    padding: 16,
    gap: 14,
  },
  warningBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  warningHeader: {
    fontSize: 11,
    fontWeight: '900',
    color: '#dc2626',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  warningBullet: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#991b1b',
    lineHeight: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    lineHeight: 17,
  },
  passwordVerifyWrap: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  passwordVerifyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  passwordInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0f172a',
    fontWeight: '600',
  },
  cancelSubmitBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelSubmitBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  btnDisabled: {
    opacity: 0.45,
  },
});
