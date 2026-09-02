import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

const resolveAvatarUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (url.includes('.r2.dev/') || url.includes('cloudflarestorage.com/')) {
    const parts = url.split('.r2.dev/');
    const storageKey = parts.length > 1 ? parts[1].split('?')[0] : '';
    if (storageKey) {
      return `${API_URL}/listings/media-proxy/${storageKey}`;
    }
  }
  if (url.startsWith('/')) {
    return `${API_URL}${url}`;
  }
  return url;
};

export default function PersonalInfoScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const storedToken =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));
      setToken(storedToken);

      if (!storedToken) {
        Alert.alert('Giriş Yapın', 'Kişisel bilgilerinize erişmek için giriş yapmalısınız.');
        router.back();
        return;
      }

      const res = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });

      if (res.ok) {
        const user = await res.json();
        setFirstName(user.firstName || '');
        setLastName(user.lastName || '');
        setUsername(user.username || '');
        setEmail(user.email || '');
        setPhone(user.phone || '');
        setProfilePhotoUrl(user.profilePhotoUrl || null);
      }
    } catch (e) {
      console.error('Fetch user data error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/users/me/profile`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          username: username.trim() || undefined,
        }),
      });

      if (res.ok) {
        Alert.alert('Başarılı', 'Kişisel bilgileriniz başarıyla güncellendi.', [
          { text: 'Tamam', onPress: () => router.back() },
        ]);
      } else {
        const data = await res.json().catch(() => ({}));
        Alert.alert('Hata', data.message || 'Bilgiler kaydedilemedi.');
      }
    } catch (e) {
      Alert.alert('Hata', 'Bağlantı hatası oluştu.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={styles.loadingText}>Bilgileriniz yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kişisel Bilgilerim</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              {profilePhotoUrl ? (
                <ExpoImage
                  source={{ uri: resolveAvatarUrl(profilePhotoUrl) || '' }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>
                    {(firstName?.[0] || email?.[0] || 'U').toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.avatarEmailText}>{email}</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Profil Bilgileri</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ad</Text>
              <TextInput
                style={styles.textInput}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Adınız"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Soyad</Text>
              <TextInput
                style={styles.textInput}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Soyadınız"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kullanıcı Adı</Text>
              <TextInput
                style={styles.textInput}
                value={username}
                onChangeText={setUsername}
                placeholder="kullanici_adi"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Telefon</Text>
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="05XX XXX XX XX"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>E-Posta (Değiştirilemez)</Text>
              <TextInput
                style={[styles.textInput, styles.disabledInput]}
                value={email}
                editable={false}
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
                <Text style={styles.saveBtnText}>Değişiklikleri Kaydet</Text>
              </>
            )}
          </TouchableOpacity>
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
    backgroundColor: '#f8fafc',
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
    gap: 16,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    borderColor: '#ea580c',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ea580c',
  },
  avatarEmailText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    gap: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  disabledInput: {
    backgroundColor: '#f1f5f9',
    color: '#94a3b8',
  },
  saveBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
});
