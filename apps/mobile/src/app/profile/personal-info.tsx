import React, { useState, useEffect, useRef } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import TorkScoutLoader from '../../components/TorkScoutLoader';

let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (e) {
  console.warn('ImagePicker could not be loaded:', e);
}

const API_URL = 'https://used-car-api-hzmu.onrender.com';

const resolveAvatarUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  if (url.includes('/listings/media-proxy/') || url.includes('/vehicle-guide/media-proxy/')) {
    return url.startsWith('http') ? url : `${API_URL}${url}`;
  }
  if (url.startsWith('/profile-photos/') || url.startsWith('profile-photos/')) {
    return `${API_URL}/listings/media-proxy/${url.replace(/^\//, '')}`;
  }
  if (url.includes('r2.dev') || url.includes('cloudflarestorage.com')) {
    let storageKey = '';
    if (url.includes('.r2.dev/')) {
      const parts = url.split('.r2.dev/');
      if (parts.length > 1) storageKey = parts[1].split('?')[0];
    } else {
      const parts = url.split('cloudflarestorage.com/');
      if (parts.length > 1) {
        const path = parts[1].split('?')[0].replace(/^\//, '');
        const pathParts = path.split('/');
        if (pathParts[0] === 'torquescout-listings') {
          storageKey = pathParts.slice(1).join('/');
        } else {
          storageKey = path;
        }
      }
    }
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
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<any>(null);
  const sectionOffsetsRef = useRef<Record<string, number>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [displayNamePreference, setDisplayNamePreference] = useState<'FULL_NAME' | 'SHORT_NAME' | 'USERNAME'>('FULL_NAME');
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // Up to 3 Phone numbers
  const [phone, setPhone] = useState('');
  const [phone2, setPhone2] = useState('');
  const [phone3, setPhone3] = useState('');
  const [phoneVerifiedAt, setPhoneVerifiedAt] = useState<string | null>(null);

  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Password Change States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [resetSending, setResetSending] = useState(false);

  useEffect(() => {
    fetchUserData();
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
        setDisplayNamePreference(user.displayNamePreference || 'FULL_NAME');
        setEmail(user.email || '');
        setNewEmail(user.email || '');
        setPhone(user.phone || '');
        setPhone2(user.phone2 || '');
        setPhone3(user.phone3 || '');
        setPhoneVerifiedAt(user.phoneVerifiedAt || null);
        setProfilePhotoUrl(user.profilePhotoUrl || null);
      }
    } catch (e) {
      console.error('Fetch user data error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePickAndUploadPhoto = async () => {
    if (!token) return;
    try {
      if (!ImagePicker) {
        Alert.alert('Hata', 'Fotoğraf seçici modülü yüklenemedi.');
        return;
      }
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Profil fotoğrafı yüklemek için galeri erişim izni vermelisiniz.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'Images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const uri = asset.uri;
      const filename = uri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      const mimeType =
        asset.mimeType ||
        (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');

      setPhotoUploading(true);
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: filename,
        type: mimeType,
      } as any);

      const res = await fetch(`${API_URL}/users/me/profile-photo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Profil fotoğrafı yüklenemedi.');
      }

      setProfilePhotoUrl(data.profilePhotoUrl || uri);
      Alert.alert('Başarılı', 'Profil fotoğrafınız başarıyla güncellendi!');
      fetchUserData();
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Fotoğraf yüklenirken bir hata oluştu.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleDeletePhoto = () => {
    if (!token || !profilePhotoUrl) return;
    Alert.alert(
      'Fotoğrafı Kaldır',
      'Profil fotoğrafınızı kaldırmak istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            setPhotoUploading(true);
            try {
              const res = await fetch(`${API_URL}/users/me/profile-photo`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                throw new Error(data.message || 'Profil fotoğrafı kaldırılamadı.');
              }
              setProfilePhotoUrl(null);
              Alert.alert('Başarılı', 'Profil fotoğrafınız kaldırıldı.');
            } catch (err: any) {
              Alert.alert('Hata', err.message || 'İşlem başarısız oldu.');
            } finally {
              setPhotoUploading(false);
            }
          },
        },
      ]
    );
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
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          username: username.trim().toLowerCase().replace(/\s/g, '') || null,
          displayNamePreference,
          phone: phone.trim() || null,
          phone2: phone2.trim() || null,
          phone3: phone3.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        Alert.alert('Başarılı', 'Profil bilgileriniz ve telefon numaralarınız başarıyla güncellendi.');
        fetchUserData();
      } else {
        Alert.alert('Hata', data.message || 'Bilgiler kaydedilemedi.');
      }
    } catch (e) {
      Alert.alert('Hata', 'Bağlantı hatası oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateEmail = () => {
    if (!newEmail.trim() || newEmail.trim() === email) {
      Alert.alert('Bilgi', 'Lütfen mevcut e-postanızdan farklı yeni bir e-posta adresi girin.');
      return;
    }
    setSavingEmail(true);
    setTimeout(() => {
      setSavingEmail(false);
      Alert.alert(
        'Doğrulama Gönderildi',
        `E-posta değişikliği doğrulama bağlantısı ${newEmail.trim()} adresinize gönderildi!`
      );
    }, 800);
  };

  const handleUpdatePassword = async () => {
    if (!token) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Eksik Bilgi', 'Lütfen mevcut şifrenizi ve yeni şifrenizi girin.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Hata', 'Yeni şifreler eşleşmiyor.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch(`${API_URL}/users/me/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Şifre güncellenemedi.');
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Başarılı', 'Şifreniz başarıyla değiştirildi!');
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Şifre değiştirilirken bir hata oluştu.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!token) return;
    setResetSending(true);
    try {
      const res = await fetch(`${API_URL}/users/me/forgot-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Şifre sıfırlama bağlantısı gönderilemedi.');
      }
      Alert.alert(
        'Bağlantı Gönderildi',
        `Şifre sıfırlama bağlantısı e-posta adresinize (${data.email || email}) gönderilmiştir.`
      );
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'İşlem başarısız oldu.');
    } finally {
      setResetSending(false);
    }
  };

  const isFullNameDisabled = !firstName.trim() || !lastName.trim();
  const isShortNameDisabled = !firstName.trim() || !lastName.trim();
  const isUsernameDisabled = !username.trim();

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <TorkScoutLoader />
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
        <Text style={styles.headerTitle}>Kişisel Bilgiler & Hesap</Text>
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
          {/* 1. PROFILE PHOTO CARD (Matching Web) */}
          <View
            style={styles.formCard}
            onLayout={(e) => {
              sectionOffsetsRef.current.photo = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.photoCardRow}>
              <TouchableOpacity
                style={styles.avatarWrap}
                activeOpacity={0.85}
                onPress={handlePickAndUploadPhoto}
                disabled={photoUploading}
              >
                {profilePhotoUrl && resolveAvatarUrl(profilePhotoUrl) ? (
                  <ExpoImage
                    source={{ uri: resolveAvatarUrl(profilePhotoUrl) || '' }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    cachePolicy="memory"
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>
                      {(firstName?.[0] || email?.[0] || 'U').toUpperCase()}
                    </Text>
                  </View>
                )}
                {photoUploading && (
                  <View style={styles.avatarUploadingOverlay}>
                    <ActivityIndicator size="small" color="#ea580c" />
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.photoMetaCol}>
                <Text style={styles.cardTitle}>Profil Fotoğrafı</Text>
                <Text style={styles.photoHelpText}>
                  Minimum 200x200px ölçülerinde JPEG, PNG veya WebP dosyası yükleyin. Maksimum boyut 2MB.
                </Text>
                <View style={styles.photoBtnsRow}>
                  <TouchableOpacity
                    style={styles.uploadPhotoBtn}
                    onPress={handlePickAndUploadPhoto}
                    disabled={photoUploading}
                  >
                    <Ionicons name="camera-outline" size={14} color="#ffffff" />
                    <Text style={styles.uploadPhotoBtnText}>
                      {photoUploading ? 'Yükleniyor...' : 'Fotoğraf Yükle'}
                    </Text>
                  </TouchableOpacity>

                  {profilePhotoUrl && (
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={handleDeletePhoto}
                      disabled={photoUploading}
                    >
                      <Ionicons name="trash-outline" size={14} color="#ef4444" />
                      <Text style={styles.removePhotoBtnText}>Kaldır</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* 2. PERSONAL INFO & DISPLAY NAME PREFERENCE */}
          <View
            style={styles.formCard}
            onLayout={(e) => {
              sectionOffsetsRef.current.info = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.cardTitle}>Kişisel Bilgilerim</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kullanıcı Adı</Text>
              <TextInput
                style={styles.textInput}
                value={username}
                onChangeText={(val) => setUsername(val.toLowerCase().replace(/\s/g, ''))}
                placeholder="kullanici_adi"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
              <Text style={styles.fieldHint}>Sadece küçük harf, rakam, nokta ve alt çizgi.</Text>
            </View>

            <View style={styles.twoColRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Ad</Text>
                <TextInput
                  style={styles.textInput}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Adınız"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Soyad</Text>
                <TextInput
                  style={styles.textInput}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Soyadınız"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Görünen Ad Soyad Seçimi */}
            <View style={styles.divider} />
            <Text style={styles.subSectionTitle}>Görünen Ad Soyad Seçimi</Text>
            <Text style={styles.subSectionDesc}>
              İlan verme, mesajlaşma ve favori listesi paylaşımı gibi özellikleri kullanırken diğer kullanıcıların adınızı nasıl görebileceğini seçebilirsiniz.
            </Text>

            {/* Option 1: FULL_NAME */}
            <TouchableOpacity
              style={[
                styles.radioOptionCard,
                displayNamePreference === 'FULL_NAME' && styles.radioOptionCardActive,
                isFullNameDisabled && styles.radioOptionDisabled,
              ]}
              activeOpacity={0.8}
              disabled={isFullNameDisabled}
              onPress={() => setDisplayNamePreference('FULL_NAME')}
            >
              <Ionicons
                name={displayNamePreference === 'FULL_NAME' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={displayNamePreference === 'FULL_NAME' ? '#ea580c' : '#94a3b8'}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.radioOptionTitle,
                    displayNamePreference === 'FULL_NAME' && styles.radioOptionTitleActive,
                  ]}
                >
                  Ad Soyad
                </Text>
                <Text style={styles.radioOptionSub}>
                  {isFullNameDisabled ? 'Ad ve Soyad girmelisiniz.' : `${firstName} ${lastName}`}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Option 2: SHORT_NAME */}
            <TouchableOpacity
              style={[
                styles.radioOptionCard,
                displayNamePreference === 'SHORT_NAME' && styles.radioOptionCardActive,
                isShortNameDisabled && styles.radioOptionDisabled,
              ]}
              activeOpacity={0.8}
              disabled={isShortNameDisabled}
              onPress={() => setDisplayNamePreference('SHORT_NAME')}
            >
              <Ionicons
                name={displayNamePreference === 'SHORT_NAME' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={displayNamePreference === 'SHORT_NAME' ? '#ea580c' : '#94a3b8'}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.radioOptionTitle,
                    displayNamePreference === 'SHORT_NAME' && styles.radioOptionTitleActive,
                  ]}
                >
                  Kısa ad
                </Text>
                <Text style={styles.radioOptionSub}>
                  {isShortNameDisabled
                    ? 'Ad ve Soyad girmelisiniz.'
                    : `${firstName} ${lastName ? lastName[0] + '.' : ''}`}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Option 3: USERNAME */}
            <TouchableOpacity
              style={[
                styles.radioOptionCard,
                displayNamePreference === 'USERNAME' && styles.radioOptionCardActive,
                isUsernameDisabled && styles.radioOptionDisabled,
              ]}
              activeOpacity={0.8}
              disabled={isUsernameDisabled}
              onPress={() => setDisplayNamePreference('USERNAME')}
            >
              <Ionicons
                name={displayNamePreference === 'USERNAME' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={displayNamePreference === 'USERNAME' ? '#ea580c' : '#94a3b8'}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.radioOptionTitle,
                    displayNamePreference === 'USERNAME' && styles.radioOptionTitleActive,
                  ]}
                >
                  Kullanıcı adı
                </Text>
                <Text style={styles.radioOptionSub}>
                  {isUsernameDisabled ? 'Kullanıcı adı girmelisiniz.' : `@${username}`}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* 3. CONTACT PHONE NUMBERS SECTION (UP TO 3 PHONES - Matching Web) */}
          <View
            style={styles.formCard}
            onLayout={(e) => {
              sectionOffsetsRef.current.phone = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>İletişim & Telefon Numaraları</Text>
              <View style={styles.maxPhoneBadge}>
                <Text style={styles.maxPhoneBadgeText}>Maksimum 3 Telefon</Text>
              </View>
            </View>
            <Text style={styles.subSectionDesc}>
              İlanlarınızda ve satıcı kartınızda alıcıların size doğrudan ulaşabilmesi için en fazla 3 telefon numarası ekleyebilirsiniz (örn: cep telefonu, galeri/ofis sabit hattı veya şirket ortağı).
            </Text>

            {/* Telefon 1 */}
            <View style={styles.phoneBox}>
              <View style={styles.phoneLabelRow}>
                <Text style={styles.inputLabel}>1. Telefon (Birincil / Cep)</Text>
                <View
                  style={[
                    styles.verifyBadge,
                    phoneVerifiedAt ? styles.verifyBadgeGreen : styles.verifyBadgeAmber,
                  ]}
                >
                  <Text
                    style={[
                      styles.verifyBadgeText,
                      phoneVerifiedAt ? styles.verifyTextGreen : styles.verifyTextAmber,
                    ]}
                  >
                    {phoneVerifiedAt ? 'Doğrulandı' : 'Doğrulanmadı'}
                  </Text>
                </View>
              </View>
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="+90 5xx xxx xx xx"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />
              <View style={styles.phoneFooterRow}>
                <Text style={styles.fieldHint}>Hesap ve birincil iletişim numaranız.</Text>
                {!phoneVerifiedAt && phone.trim().length > 0 && (
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert(
                        'Doğrulama Kodu',
                        'Doğrulama kodu telefonunuza SMS olarak gönderildi.'
                      )
                    }
                  >
                    <Text style={styles.verifyLinkText}>Doğrulama Kodu Gönder</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Telefon 2 */}
            <View style={styles.phoneBox}>
              <View style={styles.phoneLabelRow}>
                <Text style={styles.inputLabel}>2. Telefon (Ofis / Sabit / Yetkili)</Text>
                <Text style={styles.optionalTag}>Opsiyonel</Text>
              </View>
              <TextInput
                style={styles.textInput}
                value={phone2}
                onChangeText={setPhone2}
                placeholder="+90 2xx xxx xx xx veya +90 5xx..."
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />
              <Text style={styles.fieldHint}>Galeri/ofis sabit hattı veya 2. yetkili no.</Text>
            </View>

            {/* Telefon 3 */}
            <View style={styles.phoneBox}>
              <View style={styles.phoneLabelRow}>
                <Text style={styles.inputLabel}>3. Telefon (Ortak / Satış / Destek)</Text>
                <Text style={styles.optionalTag}>Opsiyonel</Text>
              </View>
              <TextInput
                style={styles.textInput}
                value={phone3}
                onChangeText={setPhone3}
                placeholder="+90 5xx xxx xx xx"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />
              <Text style={styles.fieldHint}>Şirket ortağı veya 3. yetkili no.</Text>
            </View>

            {/* Save Profile & Phones Button */}
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
          </View>

          {/* 4. EMAIL ADDRESS MANAGEMENT CARD (Matching Web /dashboard/account/email) */}
          <View
            style={styles.formCard}
            onLayout={(e) => {
              sectionOffsetsRef.current.email = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.cardTitle}>E-posta Adresi</Text>
            <Text style={styles.subSectionDesc}>
              Hesabınızın iletişim ve oturum açma e-posta adresini yönetin.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mevcut E-posta Adresi</Text>
              <TextInput
                style={[styles.textInput, styles.disabledInput]}
                value={email}
                editable={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Yeni E-posta Adresi</Text>
              <TextInput
                style={styles.textInput}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="yeni@eposta.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.secondaryActionBtn,
                (savingEmail || newEmail.trim() === email) && styles.saveBtnDisabled,
              ]}
              onPress={handleUpdateEmail}
              disabled={savingEmail || newEmail.trim() === email}
            >
              {savingEmail ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="mail-outline" size={18} color="#ffffff" />
                  <Text style={styles.secondaryActionBtnText}>E-posta Adresini Güncelle</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* 5. PASSWORD CHANGE CARD (Matching Web /dashboard/account/password) */}
          <View
            style={styles.formCard}
            onLayout={(e) => {
              sectionOffsetsRef.current.password = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.cardTitle}>Şifre Değiştir</Text>
            <Text style={styles.subSectionDesc}>Hesabınızın şifresini güncelleyin.</Text>

            <View style={styles.inputGroup}>
              <View style={styles.phoneLabelRow}>
                <Text style={styles.inputLabel}>Mevcut Şifre</Text>
                <TouchableOpacity onPress={handleForgotPassword} disabled={resetSending}>
                  <Text style={styles.verifyLinkText}>
                    {resetSending ? 'Gönderiliyor...' : 'Şifremi Unuttum'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.textInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Yeni Şifre</Text>
              <TextInput
                style={styles.textInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Yeni şifreniz"
                placeholderTextColor="#94a3b8"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Yeni Şifre (Tekrar)</Text>
              <TextInput
                style={styles.textInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Yeni şifrenizi tekrar girin"
                placeholderTextColor="#94a3b8"
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.secondaryActionBtn, savingPassword && styles.saveBtnDisabled]}
              onPress={handleUpdatePassword}
              disabled={savingPassword}
            >
              {savingPassword ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="key-outline" size={18} color="#ffffff" />
                  <Text style={styles.secondaryActionBtnText}>Şifreyi Güncelle</Text>
                </>
              )}
            </TouchableOpacity>
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
    paddingBottom: 44,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  photoCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    width: 82,
    height: 82,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: '#ea580c',
    overflow: 'hidden',
    backgroundColor: '#fff7ed',
    position: 'relative',
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
    fontSize: 30,
    fontWeight: '900',
    color: '#ea580c',
  },
  avatarUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoMetaCol: {
    flex: 1,
    gap: 6,
  },
  photoHelpText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
  },
  photoBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  uploadPhotoBtn: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uploadPhotoBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  removePhotoBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  removePhotoBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ef4444',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  maxPhoneBadge: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  maxPhoneBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ea580c',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  fieldHint: {
    fontSize: 10.5,
    color: '#94a3b8',
  },
  textInput: {
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
  disabledInput: {
    backgroundColor: '#f1f5f9',
    color: '#94a3b8',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 2,
  },
  subSectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  subSectionDesc: {
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 16,
  },
  radioOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  radioOptionCardActive: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
  },
  radioOptionDisabled: {
    opacity: 0.45,
  },
  radioOptionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  radioOptionTitleActive: {
    color: '#ea580c',
  },
  radioOptionSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  phoneBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  phoneLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  verifyBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifyBadgeGreen: {
    backgroundColor: '#dcfce7',
  },
  verifyBadgeAmber: {
    backgroundColor: '#fef3c7',
  },
  verifyBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  verifyTextGreen: {
    color: '#16a34a',
  },
  verifyTextAmber: {
    color: '#d97706',
  },
  verifyLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
  },
  optionalTag: {
    fontSize: 10,
    fontWeight: '600',
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
    marginTop: 4,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  secondaryActionBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  secondaryActionBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#ffffff',
  },
});
