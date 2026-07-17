import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

interface Brand { id: string; name: string; }
interface Model { id: string; name: string; }
interface Variant { id: string; year: number; engine: { code: string }; transmission: { name: string }; brand: { name: string }; model: { name: string } }

interface VehicleDetails {
  variant: Variant;
  ratings: {
    overall: number;
    engine: number;
    transmission: number;
    electronics: number;
    chassis: number;
  };
  chronicFaultsCount: number;
}

export default function ComparisonScreen() {
  const [vehicleA, setVehicleA] = useState<VehicleDetails | null>(null);
  const [vehicleB, setVehicleB] = useState<VehicleDetails | null>(null);

  // Selector state
  const [selectingFor, setSelectingFor] = useState<'A' | 'B' | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);

  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);

  const [activeStep, setActiveStep] = useState<'brand' | 'model' | 'variant' | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) fetchModels(selectedBrand.id);
    else setModels([]);
  }, [selectedBrand]);

  useEffect(() => {
    if (selectedModel) fetchVariants(selectedModel.id);
    else setVariants([]);
  }, [selectedModel]);

  const fetchBrands = async () => {
    try {
      const res = await fetch(`${API_URL}/vehicles/brands`);
      if (res.ok) setBrands(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchModels = async (brandId: string) => {
    try {
      const res = await fetch(`${API_URL}/vehicles/models?brandId=${brandId}`);
      if (res.ok) setModels(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVariants = async (modelId: string) => {
    try {
      const res = await fetch(`${API_URL}/vehicles/variants?modelId=${modelId}`);
      if (res.ok) setVariants(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVehicleDetails = async (variantId: string, slot: 'A' | 'B') => {
    setLoadingDetails(true);
    try {
      // 1. Fetch variant basic data
      const variantRes = await fetch(`${API_URL}/vehicles/variants/${variantId}`);
      const variantData = await variantRes.json();

      // 2. Fetch AI report to extract rating scores
      const reportRes = await fetch(`${API_URL}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId, languageCode: 'tr' }),
      });
      const reportData = await reportRes.json();

      const details: VehicleDetails = {
        variant: variantData,
        ratings: reportData.rating || { overall: 0, engine: 0, transmission: 0, electronics: 0, chassis: 0 },
        chronicFaultsCount: reportData.chronicFaults?.length || 0,
      };

      if (slot === 'A') setVehicleA(details);
      else setVehicleB(details);

    } catch (e) {
      console.error(e);
      Alert.alert('Hata', 'Araç verileri yüklenemedi.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const openSelector = (slot: 'A' | 'B') => {
    setSelectingFor(slot);
    setSelectedBrand(null);
    setSelectedModel(null);
    setActiveStep('brand');
    setModalVisible(true);
  };

  const selectOption = (item: any) => {
    if (activeStep === 'brand') {
      setSelectedBrand(item);
      setActiveStep('model');
    } else if (activeStep === 'model') {
      setSelectedModel(item);
      setActiveStep('variant');
    } else if (activeStep === 'variant') {
      setModalVisible(false);
      if (selectingFor) {
        fetchVehicleDetails(item.id, selectingFor);
      }
    }
  };

  const getOptionsList = () => {
    if (activeStep === 'brand') return brands.map(b => ({ id: b.id, name: b.name }));
    if (activeStep === 'model') return models.map(m => ({ id: m.id, name: m.name }));
    if (activeStep === 'variant') return variants.map(v => ({ id: v.id, name: `${v.year} - ${v.engine.code} - ${v.transmission.name}` }));
    return [];
  };

  return (
    <View style={styles.container}>
      {/* Side-by-side Selectors */}
      <View style={styles.selectorRow}>
        <TouchableOpacity style={styles.selectorBtn} onPress={() => openSelector('A')}>
          <Ionicons name="car" size={24} color="#f97316" />
          <Text style={styles.selectorBtnText} numberOfLines={2}>
            {vehicleA ? `${vehicleA.variant.brand.name} ${vehicleA.variant.model.name}` : 'A Aracını Seç'}
          </Text>
          {vehicleA && <Text style={styles.selectorBtnSub}>{vehicleA.variant.year}</Text>}
        </TouchableOpacity>

        <View style={styles.vsBox}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <TouchableOpacity style={styles.selectorBtn} onPress={() => openSelector('B')}>
          <Ionicons name="car" size={24} color="#3b82f6" />
          <Text style={styles.selectorBtnText} numberOfLines={2}>
            {vehicleB ? `${vehicleB.variant.brand.name} ${vehicleB.variant.model.name}` : 'B Aracını Seç'}
          </Text>
          {vehicleB && <Text style={styles.selectorBtnSub}>{vehicleB.variant.year}</Text>}
        </TouchableOpacity>
      </View>

      {/* Comparison results */}
      {loadingDetails ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>Veriler karşılaştırılıyor...</Text>
        </View>
      ) : vehicleA || vehicleB ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Comparison Table */}
          <View style={styles.tableCard}>
            <Text style={styles.tableCardTitle}>📊 Karşılaştırma Tablosu</Text>

            {/* Row overall */}
            <View style={styles.tableRow}>
              <Text style={styles.leftCol}>{vehicleA ? `${vehicleA.ratings.overall}/5` : '-'}</Text>
              <Text style={styles.centerCol}>Genel Puan</Text>
              <Text style={styles.rightCol}>{vehicleB ? `${vehicleB.ratings.overall}/5` : '-'}</Text>
            </View>

            {/* Row engine */}
            <View style={styles.tableRow}>
              <Text style={styles.leftCol}>{vehicleA ? `${vehicleA.ratings.engine}/5` : '-'}</Text>
              <Text style={styles.centerCol}>Motor Puanı</Text>
              <Text style={styles.rightCol}>{vehicleB ? `${vehicleB.ratings.engine}/5` : '-'}</Text>
            </View>

            {/* Row transmission */}
            <View style={styles.tableRow}>
              <Text style={styles.leftCol}>{vehicleA ? `${vehicleA.ratings.transmission}/5` : '-'}</Text>
              <Text style={styles.centerCol}>Şanzıman Puanı</Text>
              <Text style={styles.rightCol}>{vehicleB ? `${vehicleB.ratings.transmission}/5` : '-'}</Text>
            </View>

            {/* Row electronics */}
            <View style={styles.tableRow}>
              <Text style={styles.leftCol}>{vehicleA ? `${vehicleA.ratings.electronics}/5` : '-'}</Text>
              <Text style={styles.centerCol}>Elektronik Puanı</Text>
              <Text style={styles.rightCol}>{vehicleB ? `${vehicleB.ratings.electronics}/5` : '-'}</Text>
            </View>

            {/* Row faults */}
            <View style={styles.tableRow}>
              <Text style={[styles.leftCol, { color: '#ef4444' }]}>{vehicleA ? vehicleA.chronicFaultsCount : '-'}</Text>
              <Text style={styles.centerCol}>Kronik Arıza Sayısı</Text>
              <Text style={[styles.rightCol, { color: '#ef4444' }]}>{vehicleB ? vehicleB.chronicFaultsCount : '-'}</Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Ionicons name="git-compare" size={48} color="#64748b" />
          <Text style={styles.emptyText}>Karşılaştırmaya başlamak için yukarıdan iki araç seçin.</Text>
        </View>
      )}

      {/* Picker Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeStep === 'brand' ? 'Marka Seçin' : activeStep === 'model' ? 'Model Seçin' : 'Varyant Seçin'}
              </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 12,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  selectorBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    minHeight: 110,
    justifyContent: 'center',
  },
  selectorBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  selectorBtnSub: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  vsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    color: '#f97316',
    fontSize: 11,
    fontWeight: '900',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  tableCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  tableCardTitle: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  leftCol: {
    flex: 1,
    color: '#f97316',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'left',
  },
  centerCol: {
    flex: 2,
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  rightCol: {
    flex: 1,
    color: '#3b82f6',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'right',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 240,
    lineHeight: 18,
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
