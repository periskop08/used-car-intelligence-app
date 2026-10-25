import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TURKEY_81_PROVINCES, getDistrictsForCity } from '@used-car-intelligence/shared';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

const formatNumberInput = (val: string | number): string => {
  if (val === '' || val === undefined || val === null) return '';
  const numStr = String(val).replace(/\D/g, '');
  if (!numStr) return '';
  return parseInt(numStr, 10).toLocaleString('tr-TR');
};

const parseNumberInput = (val: string): string => {
  return val.replace(/\D/g, '');
};

const TURKISH_CITIES = TURKEY_81_PROVINCES;

export default function EditListingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listing, setListing] = useState<any>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [mileage, setMileage] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [color, setColor] = useState('');
  const [tramerAmount, setTramerAmount] = useState('');
  const [heavyDamage, setHeavyDamage] = useState(false);
  const [exchangeable, setExchangeable] = useState(false);
  const [hasWarranty, setHasWarranty] = useState(false);
  const [status, setStatus] = useState<'ACTIVE' | 'PASSIVE'>('ACTIVE');

  // Picker Modal State (City & District)
  const [activePicker, setActivePicker] = useState<'city' | 'district' | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  const pickerData = useMemo(() => {
    let title = '';
    let list: string[] = [];

    if (activePicker === 'city') {
      title = 'Şehir Seçin (81 İl)';
      list = TURKISH_CITIES;
    } else if (activePicker === 'district') {
      title = city ? `${city} İlçeleri` : 'İlçe Seçin';
      list = city ? getDistrictsForCity(city) : [];
    }

    if (pickerSearch.trim()) {
      const q = pickerSearch.trim().toLocaleLowerCase('tr-TR');
      list = list.filter((item) => item.toLocaleLowerCase('tr-TR').includes(q));
    }

    return { title, list };
  }, [activePicker, pickerSearch, city]);

  const handleSelectPicker = (val: string) => {
    if (activePicker === 'city') {
      setCity(val);
      setDistrict('');
    } else if (activePicker === 'district') {
      setDistrict(val);
    }
    setActivePicker(null);
    setPickerSearch('');
  };

  useEffect(() => {
    if (!id) return;
    fetchListing();
  }, [id]);

  const fetchListing = async () => {
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));

      const res = await fetch(`${API_URL}/listings/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error('İlan bulunamadı');
      const data = await res.json();
      setListing(data);

      setTitle(data.title || '');
      setPrice(data.price ? String(data.price) : '');
      setMileage(data.mileage !== undefined && data.mileage !== null ? String(data.mileage) : '');
      setDescription(data.description || '');
      setCity(data.city || '');
      setDistrict(data.district || '');
      setColor(data.color || '');
      setTramerAmount(data.tramerAmount ? String(data.tramerAmount) : '0');
      setHeavyDamage(Boolean(data.heavyDamage));
      setExchangeable(Boolean(data.exchangeable));
      setHasWarranty(Boolean(data.hasWarranty));
      setStatus(data.status === 'PASSIVE' ? 'PASSIVE' : 'ACTIVE');
    } catch (err: any) {
      Alert.alert('Hata', 'İlan bilgileri yüklenemedi.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!price.trim()) {
      Alert.alert('Eksik Alan', 'Lütfen ilan fiyatını giriniz.');
      return;
    }

    setSaving(true);
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));

      if (!token) {
        Alert.alert('Hata', 'Oturum süreniz dolmuş, lütfen tekrar giriş yapın.');
        return;
      }

      const payload = {
        title: title.trim(),
        price: parseInt(parseNumberInput(price), 10) || 0,
        priceAmount: parseInt(parseNumberInput(price), 10) || 0,
        mileage: parseInt(parseNumberInput(mileage), 10) || 0,
        kilometers: parseInt(parseNumberInput(mileage), 10) || 0,
        description: description.trim(),
        city: city.trim(),
        district: district.trim(),
        color: color.trim(),
        tramerAmount: parseInt(parseNumberInput(tramerAmount), 10) || 0,
        heavyDamage,
        exchangeable,
        hasWarranty,
        status,
      };

      const res = await fetch(`${API_URL}/listings/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const resData = await res.json().catch(() => ({}));

      if (res.ok) {
        Alert.alert('Başarılı! 🎉', 'İlanınız başarıyla güncellendi.', [
          { text: 'Tamam', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Hata', resData.message || 'İlan güncellenirken bir sorun oluştu.');
      }
    } catch (err) {
      Alert.alert('Hata', 'Bağlantı hatası oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'İlanı Sil',
      'Bu ilanı tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const token =
                (await AsyncStorage.getItem('accessToken')) ||
                (await AsyncStorage.getItem('token'));

              const res = await fetch(`${API_URL}/me/listings/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });

              if (res.ok) {
                Alert.alert('Silindi', 'İlanınız başarıyla silindi.', [
                  { text: 'Tamam', onPress: () => router.back() },
                ]);
              } else {
                Alert.alert('Hata', 'İlan silinemedi.');
              }
            } catch (err) {
              Alert.alert('Hata', 'Silme işlemi sırasında bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={styles.loadingText}>İlan bilgileri yükleniyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İlanı Düzenle</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveBtnText}>Kaydet</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Araç Kimlik Kartı */}
          <View style={styles.vehicleIdentityCard}>
            <View style={styles.vehicleIdentityLeft}>
              <View style={styles.carIconBox}>
                <Ionicons name="car-sport" size={24} color="#ea580c" />
              </View>
              <View>
                <Text style={styles.vehicleIdentityTitle}>
                  {listing?.brand?.name} {listing?.model?.name} {listing?.year}
                </Text>
                <Text style={styles.vehicleIdentitySub}>
                  {listing?.trim?.name || listing?.engine?.name || 'Standart Paket'}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.statusBadge,
                status === 'ACTIVE'
                  ? { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }
                  : { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  status === 'ACTIVE' ? { color: '#16a34a' } : { color: '#dc2626' },
                ]}
              >
                {status === 'ACTIVE' ? 'Yayında' : 'Yayından Kaldırıldı'}
              </Text>
            </View>
          </View>

          {/* İLAN DURUMU TOGGLE (Yayında / Pasif) */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>İLAN YAYIN DURUMU</Text>
            <View style={styles.cardBox}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.switchTitle}>
                    {status === 'ACTIVE' ? 'İlan Yayında' : 'İlan Yayından Kaldırıldı'}
                  </Text>
                  <Text style={styles.switchSub}>
                    {status === 'ACTIVE'
                      ? 'İlanınız alıcılar tarafından görüntülenebilir ve aranabilir.'
                      : 'İlanınız gizlendi. İstediğiniz zaman tekrar yayına alabilirsiniz.'}
                  </Text>
                </View>
                <Switch
                  value={status === 'ACTIVE'}
                  onValueChange={(val) => setStatus(val ? 'ACTIVE' : 'PASSIVE')}
                  trackColor={{ false: '#cbd5e1', true: '#16a34a' }}
                />
              </View>
            </View>
          </View>

          {/* TEMEL BİLGİLER (Fiyat, KM, Başlık) */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>FİYAT VE KİLOMETRE</Text>
            <View style={styles.cardBox}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>İlan Başlığı</Text>
                <TextInput
                  style={styles.textInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Örn: İlk Sahibinden Hatasız Boyasız"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Fiyat (TL) *</Text>
                  <View style={styles.priceInputWrap}>
                    <TextInput
                      style={styles.priceInput}
                      value={formatNumberInput(price)}
                      onChangeText={(t) => setPrice(parseNumberInput(t))}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#94a3b8"
                    />
                    <Text style={styles.currencySuffix}>TL</Text>
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Kilometre (KM) *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formatNumberInput(mileage)}
                    onChangeText={(t) => setMileage(parseNumberInput(t))}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* KONUM & RENK */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>KONUM VE DETAYLAR</Text>
            <View style={styles.cardBox}>
              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Şehir (81 İl)</Text>
                  <TouchableOpacity
                    style={styles.selectorBtn}
                    onPress={() => {
                      setPickerSearch('');
                      setActivePicker('city');
                    }}
                  >
                    <Text
                      style={[styles.selectorBtnText, !!city && styles.selectorSelectedText]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {city || 'Şehir Seçin'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>İlçe</Text>
                  <TouchableOpacity
                    style={[styles.selectorBtn, !city && { opacity: 0.6 }]}
                    disabled={!city}
                    onPress={() => {
                      setPickerSearch('');
                      setActivePicker('district');
                    }}
                  >
                    <Text
                      style={[styles.selectorBtnText, !!district && styles.selectorSelectedText]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {district || (city ? 'İlçe Seçin' : 'Önce İl Seçin')}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Renk</Text>
                <TextInput
                  style={styles.textInput}
                  value={color}
                  onChangeText={setColor}
                  placeholder="Örn: Beyaz, Metalik Gri, Siyah..."
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>
          </View>

          {/* HASAR & TRAMER DURUMU */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>HASAR VE GARANTİ DURUMU</Text>
            <View style={styles.cardBox}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tramer Kaydı Tutarı (TL)</Text>
                <TextInput
                  style={styles.textInput}
                  value={formatNumberInput(tramerAmount)}
                  onChangeText={(t) => setTramerAmount(parseNumberInput(t))}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Ağır Hasarlı / Pert Kayıtlı</Text>
                  <Text style={styles.switchSub}>Araçta ağır hasar kaydı bulunuyor mu?</Text>
                </View>
                <Switch
                  value={heavyDamage}
                  onValueChange={setHeavyDamage}
                  trackColor={{ false: '#cbd5e1', true: '#ef4444' }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Takasa Uygun</Text>
                  <Text style={styles.switchSub}>Takas tekliflerini değerlendiriyor musunuz?</Text>
                </View>
                <Switch
                  value={exchangeable}
                  onValueChange={setExchangeable}
                  trackColor={{ false: '#cbd5e1', true: '#ea580c' }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Garantisi Devam Ediyor</Text>
                  <Text style={styles.switchSub}>Yetkili servis garantisi geçerli mi?</Text>
                </View>
                <Switch
                  value={hasWarranty}
                  onValueChange={setHasWarranty}
                  trackColor={{ false: '#cbd5e1', true: '#16a34a' }}
                />
              </View>
            </View>
          </View>

          {/* İLAN AÇIKLAMASI */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>İLAN AÇIKLAMASI</Text>
            <View style={styles.cardBox}>
              <TextInput
                style={styles.textArea}
                value={description}
                onChangeText={setDescription}
                placeholder="Aracınızın kondisyonu, bakım geçmişi, ekstraları ve alıcının bilmesi gereken detayları buraya yazabilirsiniz..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* KAYDET VE SİL BUTONLARI */}
          <View style={{ gap: 12, marginTop: 8, marginBottom: 40 }}>
            <TouchableOpacity
              style={[styles.mainSaveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                  <Text style={styles.mainSaveBtnText}>Değişiklikleri Kaydet</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
              <Text style={styles.deleteBtnText}>İlanı Tamamen Sil</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* PICKER MODAL SHEET */}
      <Modal
        visible={!!activePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setActivePicker(null);
          setPickerSearch('');
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerSheet}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{pickerData.title}</Text>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => {
                  setActivePicker(null);
                  setPickerSearch('');
                }}
              >
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={16} color="#94a3b8" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Ara..."
                placeholderTextColor="#94a3b8"
                value={pickerSearch}
                onChangeText={setPickerSearch}
                autoCorrect={false}
              />
              {pickerSearch.length > 0 && (
                <TouchableOpacity onPress={() => setPickerSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Option List */}
            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 8 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {pickerData.list.length > 0 ? (
                pickerData.list.map((item) => {
                  const isSelected =
                    (activePicker === 'city' && city === item) ||
                    (activePicker === 'district' && district === item);

                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.pickerOption, isSelected && styles.pickerOptionActive]}
                      onPress={() => handleSelectPicker(item)}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          isSelected && styles.pickerOptionTextActive,
                          { flexShrink: 1 },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={18} color="#ea580c" />
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#94a3b8' }}>Sonuç bulunamadı.</Text>
                </View>
              )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
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
  saveBtn: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  vehicleIdentityCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  vehicleIdentityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  carIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleIdentityTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  vehicleIdentitySub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  formSection: {
    gap: 6,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    paddingLeft: 4,
  },
  cardBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '800',
  },
  currencySuffix: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ea580c',
  },
  textArea: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    lineHeight: 18,
    minHeight: 110,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  switchSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  mainSaveBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  mainSaveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  deleteBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  deleteBtnText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '800',
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  selectorBtnText: {
    fontSize: 13,
    color: '#94a3b8',
    flexShrink: 1,
  },
  selectorSelectedText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 0,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  pickerOptionActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  pickerOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  pickerOptionTextActive: {
    color: '#ea580c',
    fontWeight: '700',
  },
});
