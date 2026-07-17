import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, FlatList, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

interface Option {
  id: string;
  name: string;
}

export default function VehicleQueryScreen() {
  const router = useRouter();

  // Selected values
  const [selectedBrand, setSelectedBrand] = useState<{ id: string; name: string } | null>(null);
  const [selectedModel, setSelectedModel] = useState<{ id: string; name: string } | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedBodyType, setSelectedBodyType] = useState<string>('');
  const [selectedEngine, setSelectedEngine] = useState<string>('');
  const [selectedFuelType, setSelectedFuelType] = useState<string>('');
  const [selectedTransmission, setSelectedTransmission] = useState<string>('');
  const [selectedTrim, setSelectedTrim] = useState<string>('');

  // Dropdown list data
  const [brands, setBrands] = useState<Option[]>([]);
  const [models, setModels] = useState<Option[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [bodyTypes, setBodyTypes] = useState<string[]>([]);
  const [engines, setEngines] = useState<string[]>([]);
  const [fuelTypes, setFuelTypes] = useState<string[]>([]);
  const [transmissions, setTransmissions] = useState<string[]>([]);
  const [trims, setTrims] = useState<string[]>([]);

  // UI state
  const [activeStep, setActiveStep] = useState<'brand' | 'model' | 'year' | 'bodyType' | 'engine' | 'fuelType' | 'transmission' | 'trim' | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchingVariant, setMatchingVariant] = useState(false);

  // Load Brands on mount
  useEffect(() => {
    fetchBrands();
  }, []);

  // Fetch cascades when selections change
  useEffect(() => {
    if (selectedBrand) fetchModels(selectedBrand.id);
    else { setModels([]); setSelectedModel(null); }
  }, [selectedBrand]);

  useEffect(() => {
    if (selectedBrand && selectedModel) fetchYears();
    else { setYears([]); setSelectedYear(''); }
  }, [selectedBrand, selectedModel]);

  useEffect(() => {
    if (selectedBrand && selectedModel && selectedYear) fetchBodyTypes();
    else { setBodyTypes([]); setSelectedBodyType(''); }
  }, [selectedBrand, selectedModel, selectedYear]);

  useEffect(() => {
    if (selectedBrand && selectedModel && selectedYear && selectedBodyType) fetchEngines();
    else { setEngines([]); setSelectedEngine(''); }
  }, [selectedBrand, selectedModel, selectedYear, selectedBodyType]);

  useEffect(() => {
    if (selectedBrand && selectedModel && selectedYear && selectedBodyType && selectedEngine) fetchFuelTypes();
    else { setFuelTypes([]); setSelectedFuelType(''); }
  }, [selectedBrand, selectedModel, selectedYear, selectedBodyType, selectedEngine]);

  useEffect(() => {
    if (selectedBrand && selectedModel && selectedYear && selectedBodyType && selectedEngine && selectedFuelType) fetchTransmissions();
    else { setTransmissions([]); setSelectedTransmission(''); }
  }, [selectedBrand, selectedModel, selectedYear, selectedBodyType, selectedEngine, selectedFuelType]);

  useEffect(() => {
    if (selectedBrand && selectedModel && selectedYear && selectedBodyType && selectedEngine && selectedFuelType && selectedTransmission) fetchTrims();
    else { setTrims([]); setSelectedTrim(''); }
  }, [selectedBrand, selectedModel, selectedYear, selectedBodyType, selectedEngine, selectedFuelType, selectedTransmission]);

  // Fetch API helpers
  const fetchBrands = async () => {
    try {
      const res = await fetch(`${API_URL}/vehicles/brands`);
      if (res.ok) {
        const data = await res.json();
        setBrands(data.map((b: any) => ({ id: b.id, name: b.name })));
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
        setModels(data.map((m: any) => ({ id: m.id, name: m.name })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchYears = async () => {
    if (!selectedBrand || !selectedModel) return;
    try {
      const res = await fetch(`${API_URL}/vehicle-filters/years?brand=${encodeURIComponent(selectedBrand.name)}&modelFamily=${encodeURIComponent(selectedModel.name)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setYears(data.data.map((y: any) => y.value.toString()));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBodyTypes = async () => {
    if (!selectedBrand || !selectedModel || !selectedYear) return;
    try {
      const res = await fetch(`${API_URL}/vehicle-filters/body-types?brand=${encodeURIComponent(selectedBrand.name)}&modelFamily=${encodeURIComponent(selectedModel.name)}&year=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setBodyTypes(data.data.map((b: any) => b.value));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEngines = async () => {
    if (!selectedBrand || !selectedModel || !selectedYear || !selectedBodyType) return;
    try {
      const res = await fetch(`${API_URL}/vehicle-filters/engines?brand=${encodeURIComponent(selectedBrand.name)}&modelFamily=${encodeURIComponent(selectedModel.name)}&year=${selectedYear}&bodyType=${selectedBodyType}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setEngines(data.data.map((e: any) => e.value));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFuelTypes = async () => {
    if (!selectedBrand || !selectedModel || !selectedYear || !selectedBodyType || !selectedEngine) return;
    try {
      const res = await fetch(`${API_URL}/vehicle-filters/fuel-types?brand=${encodeURIComponent(selectedBrand.name)}&modelFamily=${encodeURIComponent(selectedModel.name)}&year=${selectedYear}&bodyType=${selectedBodyType}&engine=${encodeURIComponent(selectedEngine)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setFuelTypes(data.data.map((f: any) => f.value));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTransmissions = async () => {
    if (!selectedBrand || !selectedModel || !selectedYear || !selectedBodyType || !selectedEngine || !selectedFuelType) return;
    try {
      const res = await fetch(`${API_URL}/vehicle-filters/transmissions?brand=${encodeURIComponent(selectedBrand.name)}&modelFamily=${encodeURIComponent(selectedModel.name)}&year=${selectedYear}&bodyType=${selectedBodyType}&engine=${encodeURIComponent(selectedEngine)}&fuelType=${selectedFuelType}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setTransmissions(data.data.map((t: any) => t.value));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTrims = async () => {
    if (!selectedBrand || !selectedModel || !selectedYear || !selectedBodyType || !selectedEngine || !selectedFuelType || !selectedTransmission) return;
    try {
      const res = await fetch(`${API_URL}/vehicle-filters/trims?brand=${encodeURIComponent(selectedBrand.name)}&modelFamily=${encodeURIComponent(selectedModel.name)}&year=${selectedYear}&bodyType=${selectedBodyType}&engine=${encodeURIComponent(selectedEngine)}&fuelType=${selectedFuelType}&transmission=${selectedTransmission}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setTrims(data.data.map((t: any) => t.value));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMatchAndNavigate = async () => {
    if (!selectedBrand || !selectedModel || !selectedYear || !selectedBodyType || !selectedEngine || !selectedFuelType || !selectedTransmission || !selectedTrim) {
      Alert.alert('Eksik Seçim', 'Lütfen tüm alanları seçin.');
      return;
    }
    setMatchingVariant(true);
    try {
      const url = `${API_URL}/vehicle-filters/match-variant?brand=${encodeURIComponent(selectedBrand.name)}&modelFamily=${encodeURIComponent(selectedModel.name)}&year=${selectedYear}&bodyType=${selectedBodyType}&engine=${encodeURIComponent(selectedEngine)}&fuelType=${selectedFuelType}&transmission=${selectedTransmission}&trim=${encodeURIComponent(selectedTrim)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success && data.variantId) {
        router.push({
          pathname: '/vehicle-report',
          params: { variantId: data.variantId }
        });
      } else {
        Alert.alert('Eşleşme Bulunamadı', 'Seçtiğiniz kriterlerde doğrulanmış bir araç varyantı bulunamadı.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Bağlantı Hatası', 'Sunucudan varyant bilgisi doğrulanamadı.');
    } finally {
      setMatchingVariant(false);
    }
  };

  const openSelector = (step: typeof activeStep) => {
    setActiveStep(step);
    setSearchQuery('');
    setModalVisible(true);
  };

  const selectOption = (val: any) => {
    if (activeStep === 'brand') {
      setSelectedBrand(val);
      setSelectedModel(null);
    } else if (activeStep === 'model') {
      setSelectedModel(val);
    } else if (activeStep === 'year') {
      setSelectedYear(val);
    } else if (activeStep === 'bodyType') {
      setSelectedBodyType(val);
    } else if (activeStep === 'engine') {
      setSelectedEngine(val);
    } else if (activeStep === 'fuelType') {
      setSelectedFuelType(val);
    } else if (activeStep === 'transmission') {
      setSelectedTransmission(val);
    } else if (activeStep === 'trim') {
      setSelectedTrim(val);
    }
    setModalVisible(false);
  };

  const getOptionsList = () => {
    let list: any[] = [];
    if (activeStep === 'brand') list = brands;
    else if (activeStep === 'model') list = models;
    else if (activeStep === 'year') list = years.map(y => ({ id: y, name: y }));
    else if (activeStep === 'bodyType') list = bodyTypes.map(b => ({ id: b, name: b }));
    else if (activeStep === 'engine') list = engines.map(e => ({ id: e, name: e }));
    else if (activeStep === 'fuelType') list = fuelTypes.map(f => ({ id: f, name: f }));
    else if (activeStep === 'transmission') list = transmissions.map(t => ({ id: t, name: t }));
    else if (activeStep === 'trim') list = trims.map(t => ({ id: t, name: t }));

    if (searchQuery.trim()) {
      return list.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return list;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Araç Kriterlerini Seçin</Text>
        <Text style={styles.subtitle}>Detaylı kronik arıza analizi için aracı filtreleyin</Text>

        <View style={styles.form}>
          {/* Brand Row */}
          <TouchableOpacity style={styles.pickerRow} onPress={() => openSelector('brand')}>
            <View style={styles.pickerLeft}>
              <Ionicons name="car-outline" size={20} color="#f97316" />
              <Text style={styles.pickerLabel}>Marka</Text>
            </View>
            <View style={styles.pickerRight}>
              <Text style={selectedBrand ? styles.selectedText : styles.placeholderText}>
                {selectedBrand ? selectedBrand.name : 'Seçin'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </View>
          </TouchableOpacity>

          {/* Model Row */}
          <TouchableOpacity
            style={[styles.pickerRow, !selectedBrand && styles.disabledRow]}
            onPress={() => selectedBrand && openSelector('model')}
            disabled={!selectedBrand}
          >
            <View style={styles.pickerLeft}>
              <Ionicons name="options-outline" size={20} color="#f97316" />
              <Text style={styles.pickerLabel}>Model</Text>
            </View>
            <View style={styles.pickerRight}>
              <Text style={selectedModel ? styles.selectedText : styles.placeholderText}>
                {selectedModel ? selectedModel.name : 'Seçin'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </View>
          </TouchableOpacity>

          {/* Year Row */}
          <TouchableOpacity
            style={[styles.pickerRow, !selectedModel && styles.disabledRow]}
            onPress={() => selectedModel && openSelector('year')}
            disabled={!selectedModel}
          >
            <View style={styles.pickerLeft}>
              <Ionicons name="calendar-outline" size={20} color="#f97316" />
              <Text style={styles.pickerLabel}>Model Yılı</Text>
            </View>
            <View style={styles.pickerRight}>
              <Text style={selectedYear ? styles.selectedText : styles.placeholderText}>
                {selectedYear ? selectedYear : 'Seçin'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </View>
          </TouchableOpacity>

          {/* Body Type Row */}
          <TouchableOpacity
            style={[styles.pickerRow, !selectedYear && styles.disabledRow]}
            onPress={() => selectedYear && openSelector('bodyType')}
            disabled={!selectedYear}
          >
            <View style={styles.pickerLeft}>
              <Ionicons name="body-outline" size={20} color="#f97316" />
              <Text style={styles.pickerLabel}>Kasa Tipi</Text>
            </View>
            <View style={styles.pickerRight}>
              <Text style={selectedBodyType ? styles.selectedText : styles.placeholderText}>
                {selectedBodyType ? selectedBodyType : 'Seçin'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </View>
          </TouchableOpacity>

          {/* Engine Row */}
          <TouchableOpacity
            style={[styles.pickerRow, !selectedBodyType && styles.disabledRow]}
            onPress={() => selectedBodyType && openSelector('engine')}
            disabled={!selectedBodyType}
          >
            <View style={styles.pickerLeft}>
              <Ionicons name="speedometer-outline" size={20} color="#f97316" />
              <Text style={styles.pickerLabel}>Motor / Hacim</Text>
            </View>
            <View style={styles.pickerRight}>
              <Text style={selectedEngine ? styles.selectedText : styles.placeholderText}>
                {selectedEngine ? selectedEngine : 'Seçin'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </View>
          </TouchableOpacity>

          {/* Fuel Row */}
          <TouchableOpacity
            style={[styles.pickerRow, !selectedEngine && styles.disabledRow]}
            onPress={() => selectedEngine && openSelector('fuelType')}
            disabled={!selectedEngine}
          >
            <View style={styles.pickerLeft}>
              <Ionicons name="water-outline" size={20} color="#f97316" />
              <Text style={styles.pickerLabel}>Yakıt Türü</Text>
            </View>
            <View style={styles.pickerRight}>
              <Text style={selectedFuelType ? styles.selectedText : styles.placeholderText}>
                {selectedFuelType ? selectedFuelType : 'Seçin'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </View>
          </TouchableOpacity>

          {/* Transmission Row */}
          <TouchableOpacity
            style={[styles.pickerRow, !selectedFuelType && styles.disabledRow]}
            onPress={() => selectedFuelType && openSelector('transmission')}
            disabled={!selectedFuelType}
          >
            <View style={styles.pickerLeft}>
              <Ionicons name="cog-outline" size={20} color="#f97316" />
              <Text style={styles.pickerLabel}>Şanzıman</Text>
            </View>
            <View style={styles.pickerRight}>
              <Text style={selectedTransmission ? styles.selectedText : styles.placeholderText}>
                {selectedTransmission ? selectedTransmission : 'Seçin'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </View>
          </TouchableOpacity>

          {/* Trim Row */}
          <TouchableOpacity
            style={[styles.pickerRow, !selectedTransmission && styles.disabledRow]}
            onPress={() => selectedTransmission && openSelector('trim')}
            disabled={!selectedTransmission}
          >
            <View style={styles.pickerLeft}>
              <Ionicons name="bookmark-outline" size={20} color="#f97316" />
              <Text style={styles.pickerLabel}>Donanım Paketi</Text>
            </View>
            <View style={styles.pickerRight}>
              <Text style={selectedTrim ? styles.selectedText : styles.placeholderText}>
                {selectedTrim ? selectedTrim : 'Seçin'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, !selectedTrim && styles.disabledSubmitBtn]}
          onPress={handleMatchAndNavigate}
          disabled={!selectedTrim || matchingVariant}
        >
          {matchingVariant ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.btnContent}>
              <Text style={styles.submitBtnText}>Rapor Oluştur</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Selector Modal Bottom Sheet styled */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seçim Yapın</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#f8fafc" />
              </TouchableOpacity>
            </View>

            {/* Search query inside picker modal */}
            {(activeStep === 'brand' || activeStep === 'model' || activeStep === 'trim') && (
              <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color="#64748b" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Ara..."
                  placeholderTextColor="#64748b"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f8fafc',
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  form: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    overflow: 'hidden',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  disabledRow: {
    opacity: 0.3,
  },
  pickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pickerLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '700',
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
  },
  placeholderText: {
    color: '#64748b',
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: '#f97316',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  disabledSubmitBtn: {
    backgroundColor: '#334155',
    opacity: 0.5,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 14,
  },
  optionRow: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  optionText: {
    color: '#cbd5e1',
    fontSize: 15,
  },
});
