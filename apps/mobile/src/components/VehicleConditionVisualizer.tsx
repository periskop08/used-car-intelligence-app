import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Svg, { Path, Rect, Ellipse } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

export const PART_LABELS: Record<string, string> = {
  FRONT_BUMPER: 'Ön Tampon',
  REAR_BUMPER: 'Arka Tampon',
  HOOD: 'Motor Kaputu',
  ROOF: 'Tavan',
  TRUNK: 'Bagaj Kapağı',
  LEFT_FRONT_FENDER: 'Sol Ön Çamurluk',
  RIGHT_FRONT_FENDER: 'Sağ Ön Çamurluk',
  LEFT_FRONT_DOOR: 'Sol Ön Kapı',
  RIGHT_FRONT_DOOR: 'Sağ Ön Kapı',
  LEFT_REAR_DOOR: 'Sol Arka Kapı',
  RIGHT_REAR_DOOR: 'Sağ Arka Kapı',
  LEFT_REAR_FENDER: 'Sol Arka Çamurluk',
  RIGHT_REAR_FENDER: 'Sağ Arka Çamurluk',
};

interface VehicleConditionVisualizerProps {
  paintedParts?: string[];
  changedParts?: string[];
  localPaintedParts?: string[];
  damageRecord?: string;
  tramerAmount?: number;
  maintenanceHistory?: string;
}

export default function VehicleConditionVisualizer({
  paintedParts = [],
  changedParts = [],
  localPaintedParts = [],
  damageRecord,
  tramerAmount = 0,
  maintenanceHistory,
}: VehicleConditionVisualizerProps) {
  const [selectedPart, setSelectedPart] = useState<string | null>(null);

  const painted = Array.isArray(paintedParts) ? paintedParts : [];
  const changed = Array.isArray(changedParts) ? changedParts : [];
  const local = Array.isArray(localPaintedParts) ? localPaintedParts : [];

  const getPartStatus = (partKey: string): 'CHANGED' | 'PAINTED' | 'LOCAL' | 'ORIGINAL' => {
    if (changed.includes(partKey)) return 'CHANGED';
    if (painted.includes(partKey)) return 'PAINTED';
    if (local.includes(partKey)) return 'LOCAL';
    return 'ORIGINAL';
  };

  const getPartColors = (partKey: string) => {
    const status = getPartStatus(partKey);
    const isSelected = selectedPart === partKey;

    switch (status) {
      case 'CHANGED':
        // Değişen: Canlı Kırmızı
        return {
          fill: '#fca5a5',
          stroke: isSelected ? '#7f1d1d' : '#dc2626',
          strokeWidth: isSelected ? '3' : '2',
        };
      case 'PAINTED':
        // Boyalı: Canlı Mavi (Sarı ve Kırmızıdan %100 ayrışan ve sektör standardı olan renk)
        return {
          fill: '#93c5fd',
          stroke: isSelected ? '#1e3a8a' : '#2563eb',
          strokeWidth: isSelected ? '3' : '2',
        };
      case 'LOCAL':
        // Lokal Boyalı: Canlı Sarı / Altın Sarısı
        return {
          fill: '#fde047',
          stroke: isSelected ? '#713f12' : '#ca8a04',
          strokeWidth: isSelected ? '3' : '2',
        };
      case 'ORIGINAL':
      default:
        // Orijinal: Temiz Beyaz & Gri Çizgiler
        return {
          fill: '#ffffff',
          stroke: isSelected ? '#0f172a' : '#94a3b8',
          strokeWidth: isSelected ? '2.5' : '1.5',
        };
    }
  };

  const isAllOriginal = changed.length === 0 && painted.length === 0 && local.length === 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="shield-checkmark" size={18} color="#ea580c" />
          <Text style={styles.title}>BOYA, DEĞİŞEN VE EKSPERTİZ BİLGİSİ</Text>
        </View>
      </View>

      {/* Legend Badges Row (Solid colorful boxes) */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#ffffff', borderColor: '#94a3b8' }]} />
          <Text style={styles.legendText}>Orijinal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#facc15', borderColor: '#ca8a04' }]} />
          <Text style={[styles.legendText, { color: '#854d0e', fontWeight: '800' }]}>Lokal Boyalı</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#3b82f6', borderColor: '#1d4ed8' }]} />
          <Text style={[styles.legendText, { color: '#1d4ed8', fontWeight: '800' }]}>Boyalı</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#ef4444', borderColor: '#b91c1c' }]} />
          <Text style={[styles.legendText, { color: '#b91c1c', fontWeight: '800' }]}>Değişen</Text>
        </View>
      </View>

      {/* 2D Car Blueprint Silhouette */}
      <View style={styles.blueprintWrap}>
        <Svg width={200} height={380} viewBox="0 0 200 380" style={styles.svg}>
          {/* Static Tires */}
          <Rect x="23" y="55" width="14" height="32" rx="4" fill="#334155" />
          <Rect x="163" y="55" width="14" height="32" rx="4" fill="#334155" />
          <Rect x="23" y="280" width="14" height="32" rx="4" fill="#334155" />
          <Rect x="163" y="280" width="14" height="32" rx="4" fill="#334155" />

          {/* FRONT BUMPER */}
          <Path
            d="M 50 35 Q 100 20 150 35 L 142 45 Q 100 35 58 45 Z"
            {...getPartColors('FRONT_BUMPER')}
            onPress={() => setSelectedPart('FRONT_BUMPER')}
          />

          {/* HOOD */}
          <Path
            d="M 58 45 Q 100 35 142 45 L 135 110 L 65 110 Z"
            {...getPartColors('HOOD')}
            onPress={() => setSelectedPart('HOOD')}
          />

          {/* LEFT FRONT FENDER */}
          <Path
            d="M 50 35 L 58 45 L 65 110 L 38 110 C 34 85 36 55 50 35 Z"
            {...getPartColors('LEFT_FRONT_FENDER')}
            onPress={() => setSelectedPart('LEFT_FRONT_FENDER')}
          />

          {/* RIGHT FRONT FENDER */}
          <Path
            d="M 150 35 C 164 55 166 85 162 110 L 135 110 L 142 45 Z"
            {...getPartColors('RIGHT_FRONT_FENDER')}
            onPress={() => setSelectedPart('RIGHT_FRONT_FENDER')}
          />

          {/* LEFT FRONT DOOR */}
          <Path
            d="M 38 110 L 65 110 L 65 180 L 38 180 Z"
            {...getPartColors('LEFT_FRONT_DOOR')}
            onPress={() => setSelectedPart('LEFT_FRONT_DOOR')}
          />

          {/* RIGHT FRONT DOOR */}
          <Path
            d="M 135 110 L 162 110 L 162 180 L 135 180 Z"
            {...getPartColors('RIGHT_FRONT_DOOR')}
            onPress={() => setSelectedPart('RIGHT_FRONT_DOOR')}
          />

          {/* ROOF */}
          <Rect
            x="65"
            y="110"
            width="70"
            height="140"
            rx="8"
            {...getPartColors('ROOF')}
            onPress={() => setSelectedPart('ROOF')}
          />

          {/* LEFT REAR DOOR */}
          <Path
            d="M 38 180 L 65 180 L 65 250 L 38 250 Z"
            {...getPartColors('LEFT_REAR_DOOR')}
            onPress={() => setSelectedPart('LEFT_REAR_DOOR')}
          />

          {/* RIGHT REAR DOOR */}
          <Path
            d="M 135 180 L 162 180 L 162 250 L 135 250 Z"
            {...getPartColors('RIGHT_REAR_DOOR')}
            onPress={() => setSelectedPart('RIGHT_REAR_DOOR')}
          />

          {/* LEFT REAR FENDER */}
          <Path
            d="M 38 250 L 65 250 L 60 330 L 53 340 C 36 320 34 280 38 250 Z"
            {...getPartColors('LEFT_REAR_FENDER')}
            onPress={() => setSelectedPart('LEFT_REAR_FENDER')}
          />

          {/* TRUNK */}
          <Path
            d="M 65 250 L 135 250 L 140 330 Q 100 340 60 330 Z"
            {...getPartColors('TRUNK')}
            onPress={() => setSelectedPart('TRUNK')}
          />

          {/* RIGHT REAR FENDER */}
          <Path
            d="M 135 250 L 162 250 C 166 280 164 320 147 340 L 140 330 Z"
            {...getPartColors('RIGHT_REAR_FENDER')}
            onPress={() => setSelectedPart('RIGHT_REAR_FENDER')}
          />

          {/* REAR BUMPER */}
          <Path
            d="M 53 340 Q 100 350 147 340 L 152 350 Q 100 365 48 350 Z"
            {...getPartColors('REAR_BUMPER')}
            onPress={() => setSelectedPart('REAR_BUMPER')}
          />

          {/* Headlights & Taillights */}
          <Ellipse cx="61" cy="41" rx="5" ry="2.5" fill="#facc15" opacity="0.9" />
          <Ellipse cx="139" cy="41" rx="5" ry="2.5" fill="#facc15" opacity="0.9" />
          <Rect x="52" y="342" width="10" height="3" rx="0.5" fill="#ef4444" opacity="0.9" />
          <Rect x="138" y="342" width="10" height="3" rx="0.5" fill="#ef4444" opacity="0.9" />
        </Svg>
      </View>

      {/* Selected Part Toast / Feedback */}
      {selectedPart && (
        <View style={styles.selectedPartBox}>
          <Text style={styles.selectedPartLabel}>
            Seçilen Parça: <Text style={styles.selectedPartName}>{PART_LABELS[selectedPart] || selectedPart}</Text>
          </Text>
          <Text style={[styles.selectedPartStatus, {
            color:
              getPartStatus(selectedPart) === 'CHANGED'
                ? '#dc2626'
                : getPartStatus(selectedPart) === 'PAINTED'
                ? '#2563eb'
                : getPartStatus(selectedPart) === 'LOCAL'
                ? '#b45309'
                : '#16a34a',
          }]}>
            {getPartStatus(selectedPart) === 'CHANGED'
              ? 'DEĞİŞEN PARÇA'
              : getPartStatus(selectedPart) === 'PAINTED'
              ? 'BOYALI PARÇA'
              : getPartStatus(selectedPart) === 'LOCAL'
              ? 'LOKAL BOYALI'
              : 'ORİJİNAL PARÇA'}
          </Text>
        </View>
      )}

      {/* Overall Status Text */}
      {isAllOriginal ? (
        <View style={styles.originalBadge}>
          <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
          <Text style={styles.originalBadgeText}>
            Aracın tüm parçaları orijinaldir. Değişen ve boyalı parçası bulunmamaktadır.
          </Text>
        </View>
      ) : (
        <View style={styles.partsSummaryBox}>
          {changed.length > 0 && (
            <View style={styles.partGroup}>
              <Text style={styles.partGroupTitleRed}>🔴 Değişen Parçalar ({changed.length})</Text>
              <View style={styles.pillWrap}>
                {changed.map((p) => (
                  <View key={p} style={[styles.pill, styles.pillRed]}>
                    <Text style={[styles.pillText, { color: '#dc2626' }]}>
                      {PART_LABELS[p] || p}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {painted.length > 0 && (
            <View style={styles.partGroup}>
              <Text style={styles.partGroupTitleBlue}>🔵 Boyalı Parçalar ({painted.length})</Text>
              <View style={styles.pillWrap}>
                {painted.map((p) => (
                  <View key={p} style={[styles.pill, styles.pillBlue]}>
                    <Text style={[styles.pillText, { color: '#1d4ed8' }]}>
                      {PART_LABELS[p] || p}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {local.length > 0 && (
            <View style={styles.partGroup}>
              <Text style={styles.partGroupTitleYellow}>🟡 Lokal Boyalı Parçalar ({local.length})</Text>
              <View style={styles.pillWrap}>
                {local.map((p) => (
                  <View key={p} style={[styles.pill, styles.pillYellow]}>
                    <Text style={[styles.pillText, { color: '#854d0e' }]}>
                      {PART_LABELS[p] || p}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Tramer Row */}
      <View style={styles.tramerRow}>
        <View>
          <Text style={styles.tramerLabel}>Tramer Hasar Tutarı</Text>
          <Text style={styles.tramerVal}>
            {tramerAmount ? `${Number(tramerAmount).toLocaleString('tr-TR')} TL` : '0 TL (Kayıt Yok)'}
          </Text>
        </View>
        {tramerAmount > 0 && (
          <View style={styles.tramerBadge}>
            <Text style={styles.tramerBadgeText}>Hasar Kayıtlı</Text>
          </View>
        )}
      </View>

      {/* Damage Record Note */}
      {!!damageRecord && (
        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Hasar Kaydı Detayları:</Text>
          <Text style={styles.noteText}>{damageRecord}</Text>
        </View>
      )}

      {/* Maintenance History */}
      {!!maintenanceHistory && (
        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Bakım &amp; Ekspertiz Notları:</Text>
          <Text style={styles.noteText}>{maintenanceHistory}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  blueprintWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  svg: {
    alignSelf: 'center',
  },
  selectedPartBox: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedPartLabel: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '600',
  },
  selectedPartName: {
    fontWeight: '800',
    color: '#0f172a',
  },
  selectedPartStatus: {
    fontSize: 11,
    fontWeight: '900',
  },
  originalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 12,
    borderRadius: 10,
  },
  originalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
    flex: 1,
    lineHeight: 16,
  },
  partsSummaryBox: {
    gap: 10,
  },
  partGroup: {
    gap: 5,
  },
  partGroupTitleRed: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#dc2626',
  },
  partGroupTitleBlue: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  partGroupTitleYellow: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#854d0e',
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  pillRed: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  pillBlue: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
  },
  pillYellow: {
    backgroundColor: '#fef9c3',
    borderColor: '#fde047',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  tramerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  tramerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  tramerVal: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  tramerBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  tramerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b45309',
  },
  noteBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 4,
  },
  noteTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  noteText: {
    fontSize: 12,
    color: '#0f172a',
    lineHeight: 16,
  },
});
