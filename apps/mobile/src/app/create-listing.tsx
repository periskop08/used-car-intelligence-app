import React, { useState, useEffect } from 'react';
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
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (e) {
  console.warn('ImagePicker could not be loaded:', e);
}

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

const TURKISH_CITIES = [
  'İstanbul',
  'Ankara',
  'İzmir',
  'Bursa',
  'Antalya',
  'Adana',
  'Konya',
  'Gaziantep',
  'Kayseri',
  'Kocaeli',
  'Samsun',
  'Mersin',
  'Eskişehir',
  'Trabzon',
  'Diyarbakır',
  'Muğla',
  'Denizli',
  'Sakarya',
  'Tekirdağ',
  'Balıkesir',
  'Manisa',
  'Aydın',
  'Hatay',
];

const FUEL_TYPES = [
  { label: 'Benzin', val: 'PETROL' },
  { label: 'Dizel', val: 'DIESEL' },
  { label: 'Benzin & LPG', val: 'LPG' },
  { label: 'Hibrit', val: 'HYBRID' },
  { label: 'Elektrik', val: 'ELECTRIC' },
];

const TRANSMISSIONS = [
  { label: 'Otomatik', val: 'AUTOMATIC' },
  { label: 'Manuel', val: 'MANUAL' },
  { label: 'Yarı Otomatik', val: 'SEMI_AUTOMATIC' },
];

const BODY_TYPES = [
  { label: 'Sedan', val: 'SEDAN' },
  { label: 'Hatchback', val: 'HATCHBACK' },
  { label: 'SUV', val: 'SUV' },
  { label: 'Coupe', val: 'COUPE' },
  { label: 'Station Wagon', val: 'STATION_WAGON' },
  { label: 'Cabrio', val: 'CABRIO' },
];

const DRIVETRAINS = [
  { label: 'Önden Çekiş', val: 'FWD' },
  { label: 'Arkadan İtiş', val: 'RWD' },
  { label: 'Dört Çeker (4x4)', val: 'AWD' },
];

const VEHICLE_STATUSES = [
  { label: 'İkinci El', val: 'USED' },
  { label: 'Sıfır', val: 'NEW' },
  { label: 'İthal Sıfır', val: 'IMPORTED_NEW' },
];

const SELLER_TYPES = [
  { label: 'Sahibinden', val: 'OWNER' },
  { label: 'Galeriden', val: 'DEALER' },
  { label: 'Yetkili Bayiden', val: 'AUTHORIZED_DEALER' },
];

const CAR_COLORS = [
  'Beyaz',
  'Siyah',
  'Gri',
  'Gümüş',
  'Kırmızı',
  'Mavi',
  'Sarı',
  'Yeşil',
  'Kahverengi',
  'Lacivert',
];

const CAR_BODY_PARTS = [
  { key: 'FRONT_BUMPER', label: 'Ön Tampon' },
  { key: 'REAR_BUMPER', label: 'Arka Tampon' },
  { key: 'HOOD', label: 'Motor Kaputu' },
  { key: 'ROOF', label: 'Tavan' },
  { key: 'TRUNK', label: 'Bagaj Kapağı' },
  { key: 'LEFT_FRONT_FENDER', label: 'Sol Ön Çamurluk' },
  { key: 'RIGHT_FRONT_FENDER', label: 'Sağ Ön Çamurluk' },
  { key: 'LEFT_FRONT_DOOR', label: 'Sol Ön Kapı' },
  { key: 'RIGHT_FRONT_DOOR', label: 'Sağ Ön Kapı' },
  { key: 'LEFT_REAR_DOOR', label: 'Sol Arka Kapı' },
  { key: 'RIGHT_REAR_DOOR', label: 'Sağ Arka Kapı' },
  { key: 'LEFT_REAR_FENDER', label: 'Sol Arka Çamurluk' },
  { key: 'RIGHT_REAR_FENDER', label: 'Sağ Arka Çamurluk' },
];

interface Brand {
  id: string;
  name: string;
}

interface VehicleModel {
  id: string;
  name: string;
}

interface Variant {
  id: string;
  year?: number;
  engine?: { code?: string; displacement?: number; displacementCc?: number; powerHp?: number };
  transmission?: { name?: string; type?: string };
  trim?: { name?: string };
  fuelType?: string;
  bodyType?: string;
  specs?: any;
}

export default function CreateListingScreen() {
  const router = useRouter();

  // Vehicle cascade
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);

  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedModel, setSelectedModel] = useState<VehicleModel | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('');

  // Basic Details
  const [title, setTitle] = useState('');
  const [priceAmount, setPriceAmount] = useState('');
  const [kilometers, setKilometers] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [fuelType, setFuelType] = useState('PETROL');
  const [transmission, setTransmission] = useState('AUTOMATIC');
  const [bodyType, setBodyType] = useState('SEDAN');
  const [color, setColor] = useState('Beyaz');
  const [description, setDescription] = useState('');

  // Technical Specs (Fully Editable)
  const [engineDisplacement, setEngineDisplacement] = useState('');
  const [enginePower, setEnginePower] = useState('');
  const [drivetrain, setDrivetrain] = useState('FWD');

  // Condition, Paint & Tramer
  const [tramerAmount, setTramerAmount] = useState('0');
  const [damageRecord, setDamageRecord] = useState('');
  const [paintedParts, setPaintedParts] = useState<string[]>([]);
  const [changedParts, setChangedParts] = useState<string[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState('');

  // Extended Details
  const [vehicleStatus, setVehicleStatus] = useState('USED');
  const [sellerType, setSellerType] = useState('OWNER');
  const [hasWarranty, setHasWarranty] = useState(false);
  const [heavyDamage, setHeavyDamage] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  // Photos
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Modals & Submitting
  const [brandModalVisible, setBrandModalVisible] = useState(false);
  const [modelModalVisible, setModelModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchModels(selectedBrand.id);
    } else {
      setModels([]);
      setSelectedModel(null);
      setVariants([]);
      setSelectedVariant(null);
    }
  }, [selectedBrand]);

  useEffect(() => {
    if (selectedModel) {
      fetchVariants(selectedModel.id);
    } else {
      setVariants([]);
      setSelectedVariant(null);
    }
  }, [selectedModel]);

  const fetchBrands = async () => {
    try {
      const res = await fetch(`${API_URL}/vehicles/brands`);
      if (res.ok) {
        const data = await res.json();
        const sorted = Array.isArray(data)
          ? [...data].sort((a, b) => a.name.localeCompare(b.name, 'tr'))
          : [];
        setBrands(sorted);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchModels = async (brandId: string) => {
    try {
      const res = await fetch(`${API_URL}/vehicles/models?brandId=${brandId}`);
      if (res.ok) {
        const data = await res.json();
        const sorted = Array.isArray(data)
          ? [...data].sort((a, b) => a.name.localeCompare(b.name, 'tr'))
          : [];
        setModels(sorted);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVariants = async (modelId: string) => {
    try {
      const res = await fetch(`${API_URL}/vehicles/variants?modelId=${modelId}`);
      if (res.ok) {
        const data = await res.json();
        setVariants(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const pickImagesFromGallery = async () => {
    try {
      if (!ImagePicker) {
        Alert.alert('Hata', 'Fotoğraf seçici modülü yüklenemedi.');
        return;
      }
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'İzin Gerekli',
          'Fotoğraf yüklemek için galeri erişim izni vermelisiniz.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'Images',
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newUris = result.assets.map((a: any) => a.uri);
        setSelectedImages((prev) => [...prev, ...newUris]);
      }
    } catch (e: any) {
      console.error('Gallery pick error:', e);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu.');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const togglePartState = (partKey: string, targetType: 'painted' | 'changed') => {
    if (targetType === 'painted') {
      if (paintedParts.includes(partKey)) {
        setPaintedParts((prev) => prev.filter((k) => k !== partKey));
      } else {
        setPaintedParts((prev) => [...prev, partKey]);
        setChangedParts((prev) => prev.filter((k) => k !== partKey));
      }
    } else if (targetType === 'changed') {
      if (changedParts.includes(partKey)) {
        setChangedParts((prev) => prev.filter((k) => k !== partKey));
      } else {
        setChangedParts((prev) => [...prev, partKey]);
        setPaintedParts((prev) => prev.filter((k) => k !== partKey));
      }
    }
  };

  const handleSubmit = async () => {
    const rawPrice = parseNumberInput(priceAmount);
    const rawKm = parseNumberInput(kilometers);

    if (!title.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen ilan başlığını yazın.');
      return;
    }
    if (!rawPrice || isNaN(Number(rawPrice)) || Number(rawPrice) <= 0) {
      Alert.alert('Eksik Bilgi', 'Lütfen geçerli bir fiyat girin.');
      return;
    }
    if (!rawKm || isNaN(Number(rawKm))) {
      Alert.alert('Eksik Bilgi', 'Lütfen kilometre bilgisini girin.');
      return;
    }
    if (!selectedBrand) {
      Alert.alert('Eksik Bilgi', 'Lütfen araç markasını seçin.');
      return;
    }
    if (!selectedModel) {
      Alert.alert('Eksik Bilgi', 'Lütfen araç modelini seçin.');
      return;
    }
    if (!city) {
      Alert.alert('Eksik Bilgi', 'Lütfen bulunduğunuz şehri seçin.');
      return;
    }

    setSubmitting(true);
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));

      if (!token) {
        Alert.alert(
          'Giriş Yapın',
          'İlan yayınlamak için lütfen önce giriş yapın.',
          [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'Giriş Yap', onPress: () => router.push('/login' as any) },
          ]
        );
        setSubmitting(false);
        return;
      }

      const yearNum = Number(parseNumberInput(selectedYear)) || 2020;
      const rawDisplacement = parseNumberInput(engineDisplacement);
      const rawPower = parseNumberInput(enginePower);
      const rawTramer = parseNumberInput(tramerAmount);

      const payload: any = {
        title: title.trim(),
        description: description.trim() || 'Temiz ve bakımlı araç.',
        priceAmount: Number(rawPrice),
        kilometers: Number(rawKm),
        modelYear: yearNum,
        city: city.trim(),
        district: district.trim() || undefined,
        fuelType,
        transmission,
        bodyType,
        color,
        vehicleStatus,
        sellerType,
        hasWarranty,
        heavyDamage,
        isUrgent,
        engineDisplacement: rawDisplacement ? Number(rawDisplacement) : undefined,
        enginePower: rawPower ? Number(rawPower) : undefined,
        drivetrain,
        tramerAmount: rawTramer ? Number(rawTramer) : 0,
        damageRecord: damageRecord.trim() || undefined,
        paintedParts,
        changedParts,
        maintenanceHistory: maintenanceHistory.trim() || undefined,
      };

      if (selectedVariant) {
        payload.vehicleVariantId = selectedVariant.id;
      }

      // 1. Create Listing
      const createRes = await fetch(`${API_URL}/listings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.message || 'İlan oluşturulurken bir hata oluştu.');
      }

      const createdListing = await createRes.json();
      const listingId = createdListing.id;

      // 2. Upload Selected Images
      if (selectedImages.length > 0 && listingId) {
        for (const uri of selectedImages) {
          try {
            const formData = new FormData();
            const filename = uri.split('/').pop() || 'photo.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            formData.append('file', {
              uri,
              name: filename,
              type,
            } as any);

            await fetch(`${API_URL}/listings/${listingId}/media`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            });
          } catch (imgErr) {
            console.warn('Image upload partial error:', imgErr);
          }
        }
      }

      // 3. Publish / Activate status
      await fetch(`${API_URL}/listings/${listingId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'ACTIVE' }),
      }).catch(() => {});

      Alert.alert(
        'İlanınız Başarıyla Yayınlandı! 🎉',
        'İlanınız onaylandı ve vitrinde listelenmeye başladı.',
        [
          {
            text: 'İlanları Gör',
            onPress: () => router.push('/(tabs)/listings' as any),
          },
        ]
      );
    } catch (e: any) {
      console.error('Submit listing error:', e);
      Alert.alert('Hata', e.message || 'İlan yayınlanırken bir sorun oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* TOP NAVBAR */}
        <View style={styles.navbar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#0f172a" />
            <Text style={styles.backBtnText}>Geri</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>İlan Ver</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. ARAÇ SEÇİMİ CARD */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="car-sport" size={18} color="#ea580c" />
              <Text style={styles.cardTitle}>Araç Seçimi</Text>
            </View>

            {/* Marka Seçimi */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Marka *</Text>
              <TouchableOpacity
                style={styles.selectorBtn}
                onPress={() => setBrandModalVisible(true)}
              >
                <Text
                  style={[
                    styles.selectorBtnText,
                    !!selectedBrand && styles.selectorSelectedText,
                  ]}
                >
                  {selectedBrand ? selectedBrand.name : 'Marka Seçin'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Model Seçimi */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Model *</Text>
              <TouchableOpacity
                style={[
                  styles.selectorBtn,
                  !selectedBrand && { opacity: 0.5 },
                ]}
                disabled={!selectedBrand}
                onPress={() => setModelModalVisible(true)}
              >
                <Text
                  style={[
                    styles.selectorBtnText,
                    !!selectedModel && styles.selectorSelectedText,
                  ]}
                >
                  {selectedModel ? selectedModel.name : 'Model Seçin'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Yıl Girişi */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Model Yılı (Örn: 2021) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Örn: 2021"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={selectedYear}
                onChangeText={(t) => setSelectedYear(parseNumberInput(t))}
                maxLength={4}
              />
            </View>
          </View>

          {/* 2. TEMEL İLAN DETAYLARI CARD */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text" size={18} color="#ea580c" />
              <Text style={styles.cardTitle}>İlan Detayları</Text>
            </View>

            {/* Başlık */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>İlan Başlığı *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Örn: Sahibinden Masrafsız Hatasız Golf"
                placeholderTextColor="#94a3b8"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Fiyat & Kilometre Row */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Fiyat (TL) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Örn: 850.000"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={priceAmount}
                  onChangeText={(t) => setPriceAmount(formatNumberInput(t))}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Kilometre (KM) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Örn: 120.000"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={kilometers}
                  onChangeText={(t) => setKilometers(formatNumberInput(t))}
                />
              </View>
            </View>

            {/* Şehir & İlçe */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Şehir *</Text>
                <TouchableOpacity
                  style={styles.selectorBtn}
                  onPress={() => setCityModalVisible(true)}
                >
                  <Text
                    style={[
                      styles.selectorBtnText,
                      !!city && styles.selectorSelectedText,
                    ]}
                    numberOfLines={1}
                  >
                    {city || 'İl Seçin'}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>İlçe</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Örn: Kadıköy"
                  placeholderTextColor="#94a3b8"
                  value={district}
                  onChangeText={setDistrict}
                />
              </View>
            </View>

            {/* Açıklama */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Açıklama</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Aracın durumu, periyodik bakımları ve ekstraları..."
                placeholderTextColor="#94a3b8"
                multiline={true}
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          {/* 3. TEKNİK ÖZELLİKLER & MOTOR DETAYLARI CARD */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="speedometer" size={18} color="#ea580c" />
              <Text style={styles.cardTitle}>Motor & Teknik Özellikler</Text>
            </View>

            {/* Motor Hacmi & Motor Gücü Row (Düzenlenebilir) */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Motor Hacmi (CC)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Örn: 1498"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={engineDisplacement}
                  onChangeText={(t) => setEngineDisplacement(parseNumberInput(t))}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Motor Gücü (HP)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Örn: 150"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={enginePower}
                  onChangeText={(t) => setEnginePower(parseNumberInput(t))}
                />
              </View>
            </View>

            {/* Çekiş */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Çekiş</Text>
              <View style={styles.chipsWrap}>
                {DRIVETRAINS.map((d) => (
                  <TouchableOpacity
                    key={d.val}
                    style={[
                      styles.chipPill,
                      drivetrain === d.val && styles.chipPillActive,
                    ]}
                    onPress={() => setDrivetrain(d.val)}
                  >
                    <Text
                      style={[
                        styles.chipPillText,
                        drivetrain === d.val && styles.chipPillTextActive,
                      ]}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Yakıt Tipi */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Yakıt Tipi</Text>
              <View style={styles.chipsWrap}>
                {FUEL_TYPES.map((f) => (
                  <TouchableOpacity
                    key={f.val}
                    style={[
                      styles.chipPill,
                      fuelType === f.val && styles.chipPillActive,
                    ]}
                    onPress={() => setFuelType(f.val)}
                  >
                    <Text
                      style={[
                        styles.chipPillText,
                        fuelType === f.val && styles.chipPillTextActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Vites Tipi */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Vites Tipi</Text>
              <View style={styles.chipsWrap}>
                {TRANSMISSIONS.map((t) => (
                  <TouchableOpacity
                    key={t.val}
                    style={[
                      styles.chipPill,
                      transmission === t.val && styles.chipPillActive,
                    ]}
                    onPress={() => setTransmission(t.val)}
                  >
                    <Text
                      style={[
                        styles.chipPillText,
                        transmission === t.val && styles.chipPillTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Kasa Tipi */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kasa Tipi</Text>
              <View style={styles.chipsWrap}>
                {BODY_TYPES.map((b) => (
                  <TouchableOpacity
                    key={b.val}
                    style={[
                      styles.chipPill,
                      bodyType === b.val && styles.chipPillActive,
                    ]}
                    onPress={() => setBodyType(b.val)}
                  >
                    <Text
                      style={[
                        styles.chipPillText,
                        bodyType === b.val && styles.chipPillTextActive,
                      ]}
                    >
                      {b.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Renk */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Renk</Text>
              <View style={styles.chipsWrap}>
                {CAR_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.chipPill,
                      color === c && styles.chipPillActive,
                    ]}
                    onPress={() => setColor(c)}
                  >
                    <Text
                      style={[
                        styles.chipPillText,
                        color === c && styles.chipPillTextActive,
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* 4. BOYA, DEĞİŞEN VE TRAMER BİLGİSİ CARD */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="build" size={18} color="#ea580c" />
              <Text style={styles.cardTitle}>Boya, Değişen ve Tramer Bilgisi</Text>
            </View>

            {/* Tramer Tutarı & Hasar Açıklaması Row */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Tramer Kaydı (TL)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Örn: 5.000"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={tramerAmount}
                  onChangeText={(t) => setTramerAmount(formatNumberInput(t))}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Hasar Açıklaması</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Örn: Çamurluk boyalı"
                  placeholderTextColor="#94a3b8"
                  value={damageRecord}
                  onChangeText={setDamageRecord}
                />
              </View>
            </View>

            {/* 13 Kaporta Parçası Seçimi */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Boya & Değişen Parçaları İşaretleyin:</Text>
              <View style={styles.partsGrid}>
                {CAR_BODY_PARTS.map((part) => {
                  const isPainted = paintedParts.includes(part.key);
                  const isChanged = changedParts.includes(part.key);
                  return (
                    <View key={part.key} style={styles.partCard}>
                      <Text style={styles.partTitle} numberOfLines={1}>
                        {part.label}
                      </Text>
                      <View style={styles.partButtonsRow}>
                        <TouchableOpacity
                          style={[
                            styles.partStatusBtn,
                            isPainted && styles.partStatusBtnPainted,
                          ]}
                          onPress={() => togglePartState(part.key, 'painted')}
                        >
                          <Text
                            style={[
                              styles.partStatusBtnText,
                              isPainted && styles.partStatusBtnTextPainted,
                            ]}
                          >
                            Boyalı
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.partStatusBtn,
                            isChanged && styles.partStatusBtnChanged,
                          ]}
                          onPress={() => togglePartState(part.key, 'changed')}
                        >
                          <Text
                            style={[
                              styles.partStatusBtnText,
                              isChanged && styles.partStatusBtnTextChanged,
                            ]}
                          >
                            Değişen
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Bakım Geçmişi & Notlar */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bakım Geçmişi & Notlar</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaSmall]}
                placeholder="Son yağ bakımı, triger kayışı değişimi vb. detaylar..."
                placeholderTextColor="#94a3b8"
                multiline={true}
                numberOfLines={3}
                value={maintenanceHistory}
                onChangeText={setMaintenanceHistory}
              />
            </View>
          </View>

          {/* 5. FOTOĞRAFLAR CARD */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="images" size={18} color="#ea580c" />
              <Text style={styles.cardTitle}>Fotoğraflar</Text>
            </View>

            <TouchableOpacity
              style={styles.addPhotosBtn}
              onPress={pickImagesFromGallery}
            >
              <Ionicons name="camera" size={24} color="#ea580c" />
              <Text style={styles.addPhotosBtnText}>
                Galeriden Fotoğraf Seç ({selectedImages.length})
              </Text>
            </TouchableOpacity>

            {selectedImages.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photosScroll}
              >
                {selectedImages.map((uri, idx) => (
                  <View key={idx} style={styles.imageThumbWrap}>
                    <Image source={{ uri }} style={styles.imageThumb} />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => removeImage(idx)}
                    >
                      <Ionicons name="close" size={14} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* 6. DURUM & EKSTRALAR CARD */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark" size={18} color="#ea580c" />
              <Text style={styles.cardTitle}>Durum & Ekstralar</Text>
            </View>

            {/* Araç Durumu */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Araç Durumu</Text>
              <View style={styles.chipsWrap}>
                {VEHICLE_STATUSES.map((s) => (
                  <TouchableOpacity
                    key={s.val}
                    style={[
                      styles.chipPill,
                      vehicleStatus === s.val && styles.chipPillActive,
                    ]}
                    onPress={() => setVehicleStatus(s.val)}
                  >
                    <Text
                      style={[
                        styles.chipPillText,
                        vehicleStatus === s.val && styles.chipPillTextActive,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Satıcı Türü */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kimden</Text>
              <View style={styles.chipsWrap}>
                {SELLER_TYPES.map((st) => (
                  <TouchableOpacity
                    key={st.val}
                    style={[
                      styles.chipPill,
                      sellerType === st.val && styles.chipPillActive,
                    ]}
                    onPress={() => setSellerType(st.val)}
                  >
                    <Text
                      style={[
                        styles.chipPillText,
                        sellerType === st.val && styles.chipPillTextActive,
                      ]}
                    >
                      {st.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Checkboxes */}
            <TouchableOpacity
              style={[styles.checkboxRow, hasWarranty && styles.checkboxRowActive]}
              onPress={() => setHasWarranty(!hasWarranty)}
            >
              <Ionicons
                name={hasWarranty ? 'checkbox' : 'square-outline'}
                size={20}
                color={hasWarranty ? '#ea580c' : '#94a3b8'}
              />
              <Text style={styles.checkboxText}>Garantili Araç</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkboxRow, heavyDamage && styles.checkboxRowActive]}
              onPress={() => setHeavyDamage(!heavyDamage)}
            >
              <Ionicons
                name={heavyDamage ? 'checkbox' : 'square-outline'}
                size={20}
                color={heavyDamage ? '#ea580c' : '#94a3b8'}
              />
              <Text style={styles.checkboxText}>Ağır Hasar Kaydı Var</Text>
            </TouchableOpacity>

            {/* Acil İlan Toggle */}
            <TouchableOpacity
              style={[styles.urgentCard, isUrgent && styles.urgentCardActive]}
              onPress={() => setIsUrgent(!isUrgent)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons
                  name="flame"
                  size={24}
                  color={isUrgent ? '#ef4444' : '#94a3b8'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.urgentTitle, isUrgent && { color: '#ef4444' }]}>
                    Acil Satış Olarak Yayınla
                  </Text>
                  <Text style={styles.urgentSub}>
                    İlanınız vitrinlerde alev rozetiyle öne çıkarılır.
                  </Text>
                </View>
              </View>
              <Ionicons
                name={isUrgent ? 'checkbox' : 'square-outline'}
                size={22}
                color={isUrgent ? '#ef4444' : '#cbd5e1'}
              />
            </TouchableOpacity>
          </View>

          {/* SUBMIT BUTTON */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            disabled={submitting}
            onPress={handleSubmit}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>İlanı Yayınla</Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* BRAND MODAL */}
        <Modal
          visible={brandModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setBrandModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Marka Seçin</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setBrandModalVisible(false)}
                >
                  <Ionicons name="close" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={{ maxHeight: 400 }}
                contentContainerStyle={{ padding: 14, gap: 8 }}
              >
                {brands.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    style={[
                      styles.pickerOption,
                      selectedBrand?.id === b.id && styles.pickerOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedBrand(b);
                      setBrandModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        selectedBrand?.id === b.id && styles.pickerOptionTextActive,
                      ]}
                    >
                      {b.name}
                    </Text>
                    {selectedBrand?.id === b.id && (
                      <Ionicons name="checkmark-circle" size={18} color="#ea580c" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* MODEL MODAL */}
        <Modal
          visible={modelModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModelModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedBrand ? `${selectedBrand.name} Modelleri` : 'Model Seçin'}
                </Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setModelModalVisible(false)}
                >
                  <Ionicons name="close" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={{ maxHeight: 400 }}
                contentContainerStyle={{ padding: 14, gap: 8 }}
              >
                {models.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.pickerOption,
                      selectedModel?.id === m.id && styles.pickerOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedModel(m);
                      setModelModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        selectedModel?.id === m.id && styles.pickerOptionTextActive,
                      ]}
                    >
                      {m.name}
                    </Text>
                    {selectedModel?.id === m.id && (
                      <Ionicons name="checkmark-circle" size={18} color="#ea580c" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* CITY MODAL */}
        <Modal
          visible={cityModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setCityModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Şehir Seçin</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setCityModalVisible(false)}
                >
                  <Ionicons name="close" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={{ maxHeight: 400 }}
                contentContainerStyle={{ padding: 14, gap: 8 }}
              >
                {TURKISH_CITIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.pickerOption,
                      city === c && styles.pickerOptionActive,
                    ]}
                    onPress={() => {
                      setCity(c);
                      setCityModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        city === c && styles.pickerOptionTextActive,
                      ]}
                    >
                      {c}
                    </Text>
                    {city === c && (
                      <Ionicons name="checkmark-circle" size={18} color="#ea580c" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  navbar: {
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: 60,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13.5,
    color: '#0f172a',
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  textAreaSmall: {
    minHeight: 65,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectorBtnText: {
    fontSize: 13.5,
    color: '#94a3b8',
    fontWeight: '600',
  },
  selectorSelectedText: {
    color: '#0f172a',
    fontWeight: '800',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipPillActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  chipPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  chipPillTextActive: {
    color: '#ea580c',
    fontWeight: '900',
  },
  partsGrid: {
    gap: 8,
  },
  partCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  partTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1e293b',
    flex: 1,
  },
  partButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  partStatusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  partStatusBtnPainted: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  partStatusBtnChanged: {
    backgroundColor: '#ffe4e6',
    borderColor: '#f43f5e',
  },
  partStatusBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  partStatusBtnTextPainted: {
    color: '#b45309',
    fontWeight: '900',
  },
  partStatusBtnTextChanged: {
    color: '#e11d48',
    fontWeight: '900',
  },
  addPhotosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#ea580c',
    borderRadius: 14,
    paddingVertical: 16,
  },
  addPhotosBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ea580c',
  },
  photosScroll: {
    gap: 10,
    marginTop: 6,
  },
  imageThumbWrap: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f1f5f9',
  },
  imageThumb: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  checkboxRowActive: {
    backgroundColor: 'transparent',
  },
  checkboxText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  urgentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginTop: 6,
  },
  urgentCardActive: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  urgentTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#334155',
  },
  urgentSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: '#ea580c',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3,
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
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickerOptionActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  pickerOptionText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
  },
  pickerOptionTextActive: {
    color: '#ea580c',
    fontWeight: '900',
  },
});
