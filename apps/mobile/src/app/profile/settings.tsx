import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Notification Toggles
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyListingUpdates, setNotifyListingUpdates] = useState(true);
  const [notifyPriceDrops, setNotifyPriceDrops] = useState(true);
  const [notifyMarketing, setNotifyMarketing] = useState(false);

  // Security Toggles
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);

  const handleAccountCancel = () => {
    Alert.alert(
      'Hesap İptali',
      'Hesabınızı silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve tüm ilanlarınız ile rapor geçmişiniz silinir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Hesabımı Sil',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('accessToken');
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            Alert.alert('Bilgi', 'Hesabınız iptal edildi.');
            router.replace('/(tabs)' as any);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hesap ve Güvenlik</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* BİLDİRİM AYARLARI */}
        <Text style={styles.sectionTitle}>Bildirim Ayarları</Text>
        <View style={styles.cardContainer}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextWrap}>
              <Text style={styles.switchTitle}>Yeni Mesaj Bildirimleri</Text>
              <Text style={styles.switchSub}>İlanlarınıza gelen yeni mesajlar için anlık bildirim alın</Text>
            </View>
            <Switch
              value={notifyMessages}
              onValueChange={setNotifyMessages}
              trackColor={{ false: '#cbd5e1', true: '#ea580c' }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextWrap}>
              <Text style={styles.switchTitle}>İlan Onay ve Durum Bildirimleri</Text>
              <Text style={styles.switchSub}>İlanınız onaylandığında veya yayından kalktığında bildirim alın</Text>
            </View>
            <Switch
              value={notifyListingUpdates}
              onValueChange={setNotifyListingUpdates}
              trackColor={{ false: '#cbd5e1', true: '#ea580c' }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextWrap}>
              <Text style={styles.switchTitle}>Favori Araç Fiyat Düşüşleri</Text>
              <Text style={styles.switchSub}>Kaydettiğiniz araçların fiyatı düştüğünde bildirim alın</Text>
            </View>
            <Switch
              value={notifyPriceDrops}
              onValueChange={setNotifyPriceDrops}
              trackColor={{ false: '#cbd5e1', true: '#ea580c' }}
            />
          </View>

          <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
            <View style={styles.switchTextWrap}>
              <Text style={styles.switchTitle}>Kampanya ve Bültenler</Text>
              <Text style={styles.switchSub}>Özel paket indirimleri ve otomotiv bültenleri</Text>
            </View>
            <Switch
              value={notifyMarketing}
              onValueChange={setNotifyMarketing}
              trackColor={{ false: '#cbd5e1', true: '#ea580c' }}
            />
          </View>
        </View>

        {/* HESAP GÜVENLİĞİ */}
        <Text style={styles.sectionTitle}>Hesap Güvenliği</Text>
        <View style={styles.cardContainer}>
          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/profile/personal-info' as any)}
          >
            <View style={styles.navLeft}>
              <Ionicons name="key-outline" size={18} color="#64748b" />
              <Text style={styles.navTitle}>Şifre Değiştir</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
          </TouchableOpacity>

          <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
            <View style={styles.switchTextWrap}>
              <Text style={styles.switchTitle}>İki Adımlı Doğrulama (2FA)</Text>
              <Text style={styles.switchSub}>Girişlerde SMS veya e-posta onay kodu iste</Text>
            </View>
            <Switch
              value={twoFactorAuth}
              onValueChange={setTwoFactorAuth}
              trackColor={{ false: '#cbd5e1', true: '#ea580c' }}
            />
          </View>
        </View>

        {/* HESAP İPTALİ */}
        <Text style={styles.sectionTitle}>Hesap Yönetimi</Text>
        <TouchableOpacity style={styles.dangerCard} onPress={handleAccountCancel}>
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
          <View style={{ flex: 1 }}>
            <Text style={styles.dangerTitle}>Hesabımı İptal Et / Sil</Text>
            <Text style={styles.dangerSub}>Hesabınızı ve tüm verilerinizi kalıcı olarak silin</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#ef4444" />
        </TouchableOpacity>
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
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    gap: 10,
  },
  navTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  dangerCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dangerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ef4444',
  },
  dangerSub: {
    fontSize: 11.5,
    color: '#991b1b',
  },
});
