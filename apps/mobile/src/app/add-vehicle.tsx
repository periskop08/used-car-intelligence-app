import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

interface Brand { id: string; name: string; }
interface Model { id: string; name: string; }

export default function AddVehicleScreen() {
  const router = useRouter();

  // Inputs
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  
  const [year, setYear] = useState('');
  const [engineCode, setEngineCode] = useState('');
  const [displacement, setDisplacement] = useState('');
  const [horsepower, setHorsepower] = useState('');
  const [torque, setTorque] = useState('');
  
  const [transmissionName, setTransmissionName] = useState('');
  const [transmissionType, setTransmissionType] = useState<'MANUAL' | 'AUTOMATIC'>('MANUAL');
  const [transmissionSpeeds, setTransmissionSpeeds] = useState('');
  
  const [trimName, setTrimName] = useState('');
  const [bodyType, setBodyType] = useState('HATCHBACK');
  const [fuelType, setFuelType] = useState('BENZINLI');

  // Lists
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  
  const [activeStep, setActiveStep] = useState<'brand' | 'model' | 'bodyType' | 'fuelType' | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) fetchModels(selectedBrand.id);
    else { setModels([]); setSelectedModel(null); }
  }, [selectedBrand]);

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

  const handleSubmit = async () => {
    if (!selectedBrand || !selectedModel || !year || !engineCode || !displacement || !horsepower || !torque || !transmissionName || !transmissionSpeeds || !trimName) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurun.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('Giriş Gerekli', 'Araç önermek için lütfen giriş yapın.');
        router.push('/login');
        return;
      }

      const res = await fetch(`${API_URL}/vehicles/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          brandId: selectedBrand.id,
          modelId: selectedModel.id,
          year: parseInt(year),
          bodyType,
          engineCode,
          displacement: parseInt(displacement),
          horsepower: parseInt(horsepower),
          torque: parseInt(torque),
          fuelType,
          transmissionName,
          transmissionType,
          transmissionSpeeds: parseInt(transmissionSpeeds),
          trimName,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert('Başarılı', 'Araç varyantı öneriniz kaydedildi. Admin onayından sonra listelenecektir.');
        router.back();
      } else {
        Alert.alert('Hata', data.message || 'Öneri kaydedilemedi.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Bağlantı Hatası', 'Sunucu ile bağlantı kurulamadı.');
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
    } else if (activeStep === 'model') {
      setSelectedModel(item);
    } else if (activeStep === 'bodyType') {
      setBodyType(item.id);
    } else if (activeStep === 'fuelType') {
      setFuelType(item.id);
    }
    setModalVisible(false);
  };

  const getOptionsList = () => {
    if (activeStep === 'brand') return brands.map(b => ({ id: b.id, name: b.name }));
    if (activeStep === 'model') return models.map(m => ({ id: m.id, name: m.name }));
    if (activeStep === 'bodyType') return [
      { id: 'HATCHBACK', name: 'Hatchback' },
      { id: 'SEDAN', name: 'Sedan' },
      { id: 'SUV', name: 'SUV' },
      { id: 'MINIVAN', name: 'Minivan' },
      { id: 'COUPE', name: 'Coupe' },
    ];
    if (activeStep === 'fuelType') return [
      { id: 'BENZINLI', name: 'Benzinli' },
      { id: 'DIZEL', name: 'Dizel' },
      { id: 'HIBRIT', name: 'Hibrit' },
      { id: 'ELEKTRIK', name: 'Elektrik' },
    ];
    return [];
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🚗 Araç Genel Bilgileri</Text>
        
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

        {/* Year */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Üretim Yılı</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: 2018"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
            value={year}
            onChangeText={setYear}
          />
        </View>

        {/* Body type */}
        <TouchableOpacity style={styles.pickerRow} onPress={() => openSelector('bodyType')}>
          <Text style={styles.pickerLabel}>Kasa Tipi</Text>
          <View style={styles.pickerRight}>
            <Text style={styles.selectedText}>{bodyType}</Text>
            <Ionicons name="chevron-down" size={16} color="#64748b" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>⚙️ Motor & Güç Özellikleri</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Motor Kodu / Sürümü</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: 1.5 dCi"
            placeholderTextColor="#64748b"
            value={engineCode}
            onChangeText={setEngineCode}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.label}>Hacim (cc)</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: 1461"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={displacement}
              onChangeText={setDisplacement}
            />
          </View>
          <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.label}>Beygir (HP)</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: 110"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={horsepower}
              onChangeText={setHorsepower}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.label}>Tork (Nm)</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: 260"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={torque}
              onChangeText={setTorque}
            />
          </View>
          
          <TouchableOpacity style={[styles.pickerRow, { flex: 1, borderBottomWidth: 0 }]} onPress={() => openSelector('fuelType')}>
            <Text style={styles.pickerLabel}>Yakıt</Text>
            <View style={styles.pickerRight}>
              <Text style={styles.selectedText}>{fuelType}</Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>⚙️ Şanzıman & Donanım</Text>

        <View style={styles.row}>
          <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.label}>Şanzıman Adı</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: EDC"
              placeholderTextColor="#64748b"
              value={transmissionName}
              onChangeText={setTransmissionName}
            />
          </View>
          <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.label}>Vites Sayısı</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: 6"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={transmissionSpeeds}
              onChangeText={setTransmissionSpeeds}
            />
          </View>
        </View>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.typeBtn, transmissionType === 'MANUAL' && styles.activeTypeBtn]}
            onPress={() => setTransmissionType('MANUAL')}
          >
            <Text style={[styles.typeBtnText, transmissionType === 'MANUAL' && styles.activeTypeBtnText]}>Manuel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, transmissionType === 'AUTOMATIC' && styles.activeTypeBtn]}
            onPress={() => setTransmissionType('AUTOMATIC')}
          >
            <Text style={[styles.typeBtnText, transmissionType === 'AUTOMATIC' && styles.activeTypeBtnText]}>Otomatik</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Donanım Paketi (Trim)</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: Icon"
            placeholderTextColor="#64748b"
            value={trimName}
            onChangeText={setTrimName}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Araç Önerisini Gönder</Text>}
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
    color: '#cbd5e1',
    fontSize: 14,
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
    fontSize: 13,
    fontWeight: '600',
  },
  pickerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  placeholderText: {
    color: '#64748b',
    fontSize: 13,
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
    fontSize: 13,
  },
  typeBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTypeBtn: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderColor: 'rgba(249, 115, 22, 0.25)',
  },
  typeBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
  },
  activeTypeBtnText: {
    color: '#f97316',
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
