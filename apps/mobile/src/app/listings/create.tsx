import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

interface Brand { id: string; name: string; }
interface Model { id: string; name: string; }
interface Variant { id: string; year: number; engine: { code: string }; transmission: { name: string } }

export default function CreateListingScreen() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [mileage, setMileage] = useState('');
  const [year, setYear] = useState('');
  const [description, setDescription] = useState('');

  // Dropdown states
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);

  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  // Modal selector helpers
  const [activeStep, setActiveStep] = useState<'brand' | 'model' | 'variant' | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) fetchModels(selectedBrand.id);
    else { setModels([]); setSelectedModel(null); }
  }, [selectedBrand]);

  useEffect(() => {
    if (selectedModel) fetchVariants(selectedModel.id);
    else { setVariants([]); setSelectedVariant(null); }
  }, [selectedModel]);

  const fetchBrands = async () => {
    try {
      const res = await fetch(`${API_URL}/vehicles/brands`);
      if (res.ok) {
        const data = await res.json();
        setBrands(data);
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
        setModels(data);
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
        setVariants(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async () => {
    if (!title || !price || !mileage || !year || !description || !selectedVariant) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurun ve araç modelini seçin.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('Giriş Gerekli', 'İlan yayınlamak için lütfen giriş yapın.');
        router.push('/login');
        return;
      }

      const res = await fetch(`${API_URL}/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          price: parseFloat(price),
          mileage: parseInt(mileage),
          year: parseInt(year),
          description,
          vehicleVariantId: selectedVariant.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert('Başarılı', 'İlanınız başarıyla yayınlandı.');
        router.replace('/(tabs)/listings');
      } else {
        Alert.alert('Hata', data.message || 'İlan oluşturulamadı.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Bağlantı Hatası', 'İlan gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  const openSelector = (step: typeof activeStep) => {
    setActiveStep(step);
    setModalVisible(true);
  };

  const selectOption = (item: any) => {
    if (activeStep === 'brand') {
      setSelectedBrand(item);
      setSelectedModel(null);
      setSelectedVariant(null);
    } else if (activeStep === 'model') {
      setSelectedModel(item);
      setSelectedVariant(null);
    } else if (activeStep === 'variant') {
      setSelectedVariant(item);
      setYear(item.year.toString());
    }
    setModalVisible(false);
  };

  const getOptionsList = () => {
    if (activeStep === 'brand') return brands.map(b => ({ id: b.id, name: b.name }));
    if (activeStep === 'model') return models.map(m => ({ id: m.id, name: m.name }));
    if (activeStep === 'variant') return variants.map(v => ({ id: v.id, name: `${v.year} - ${v.engine.code} - ${v.transmission.name}` }));
    return [];
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🚗 Araç Seçimi</Text>
        
        {/* Brand */}
        <TouchableOpacity style={styles.pickerRow} onPress={() => openSelector('brand')}>
          <Text style={styles.pickerLabel}>Marka</Text>
          <View style={styles.pickerRight}>
            <Text style={selectedBrand ? styles.selectedText : styles.placeholderText}>
              {selectedBrand ? selectedBrand.name : 'Seçin'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#64748b" />
          </View>
        </TouchableOpacity>

        {/* Model */}
        <TouchableOpacity
          style={[styles.pickerRow, !selectedBrand && styles.disabledRow]}
          onPress={() => selectedBrand && openSelector('model')}
          disabled={!selectedBrand}
        >
          <Text style={styles.pickerLabel}>Model</Text>
          <View style={styles.pickerRight}>
            <Text style={selectedModel ? styles.selectedText : styles.placeholderText}>
              {selectedModel ? selectedModel.name : 'Seçin'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#64748b" />
          </View>
        </TouchableOpacity>

        {/* Variant */}
        <TouchableOpacity
          style={[styles.pickerRow, !selectedModel && styles.disabledRow]}
          onPress={() => selectedModel && openSelector('variant')}
          disabled={!selectedModel}
        >
          <Text style={styles.pickerLabel}>Varyant / Motor</Text>
          <View style={styles.pickerRight}>
            <Text style={selectedVariant ? styles.selectedText : styles.placeholderText} numberOfLines={1}>
              {selectedVariant ? `${selectedVariant.engine.code} (${selectedVariant.transmission.name})` : 'Seçin'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#64748b" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📝 İlan Detayları</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>İlan Başlığı</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: Sahibinden temiz Golf 7.5"
            placeholderTextColor="#64748b"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.label}>Fiyat (TL)</Text>
            <TextInput
              style={styles.input}
              placeholder="Fiyat girin"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
          </View>
          <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.label}>Kilometre</Text>
            <TextInput
              style={styles.input}
              placeholder="Km girin"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={mileage}
              onChangeText={setMileage}
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Açıklama</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Araç durumunu, bakım durumunu vb. buraya yazın..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>İlanı Yayınla</Text>}
      </TouchableOpacity>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seçim Yapın</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#f8fafc" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={getOptionsList()}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.optionRow} onPress={() => selectOption(item)}>
                  <Text style={styles.optionText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    color: '# cbd5e1',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  disabledRow: {
    opacity: 0.3,
  },
  pickerLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  pickerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 160,
  },
  placeholderText: {
    color: '#64748b',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputContainer: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '700',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#f97316',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  optionRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  optionText: {
    color: '#cbd5e1',
    fontSize: 15,
  },
});
