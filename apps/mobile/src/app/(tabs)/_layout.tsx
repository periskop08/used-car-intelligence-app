import React, { useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';

export default function TabsLayout() {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleOpenListings = (urgent: boolean) => {
    setMenuVisible(false);
    router.push({
      pathname: '/(tabs)/listings',
      params: { urgentOnly: urgent ? 'true' : 'false' },
    } as any);
  };

  const handleCreateListing = () => {
    setMenuVisible(false);
    router.push('/listings/create' as any);
  };

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e2e8f0',
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? 24 : 12,
            height: Platform.OS === 'ios' ? 88 : 72,
            elevation: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
          },
          tabBarItemStyle: {
            justifyContent: 'center',
            alignItems: 'center',
          },
          tabBarActiveTintColor: '#ea580c',
          tabBarInactiveTintColor: '#64748b',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            marginTop: 2,
          },
          headerStyle: {
            backgroundColor: '#ffffff',
          },
          headerTintColor: '#0f172a',
          headerTitleStyle: {
            fontWeight: '800',
          },
          headerShadowVisible: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            headerShown: false,
            tabBarLabel: 'Ana Sayfa',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="kesfet"
          options={{
            title: 'Keşfet',
            tabBarLabel: 'Keşfet',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'compass' : 'compass-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="listings"
          listeners={{
            tabPress: (e) => {
              // Prevent default navigation and open upward action popover
              e.preventDefault();
              setMenuVisible(true);
            },
          }}
          options={{
            headerShown: false,
            tabBarLabel: 'İlanlar',
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.centerTabBadge}>
                <Ionicons name="car-sport" size={24} color="#ffffff" />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="aracini-bul"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="vehicle-guide"
          options={{
            title: 'Araç Rehberi',
            href: null,
          }}
        />
        <Tabs.Screen
          name="packages"
          options={{
            headerShown: false,
            tabBarLabel: 'Paketler',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'gift' : 'gift-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            href: null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="club"
          options={{
            headerShown: false,
            tabBarLabel: 'Club',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profilim & Hesabım',
            href: null,
          }}
        />
      </Tabs>

      {/* ========================================================================= */}
      {/* 🌟 UPWARD SPRING POPUP MODAL (İLANLAR AÇILIR MENÜSÜ) 🌟 */}
      {/* ========================================================================= */}
      <Modal
        visible={menuVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuVisible(false)}>
          <Pressable style={styles.popoverCard} onPress={(e) => e.stopPropagation()}>
            {/* Handle Drag Bar */}
            <View style={styles.dragBar} />

            {/* Header */}
            <View style={styles.popoverHeader}>
              <View>
                <Text style={styles.popoverTitle}>İlan Menüsü</Text>
                <Text style={styles.popoverSub}>İşlem yapmak istediğiniz alanı seçin</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setMenuVisible(false)}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Option 1: ACİL İLANLAR */}
            <TouchableOpacity
              style={[styles.menuOptionCard, styles.urgentCardBorder]}
              activeOpacity={0.8}
              onPress={() => handleOpenListings(true)}
            >
              <View style={[styles.menuIconCircle, styles.urgentIconCircle]}>
                <Ionicons name="flame" size={24} color="#ef4444" />
              </View>
              <View style={styles.menuTextWrap}>
                <View style={styles.menuTitleRow}>
                  <Text style={styles.menuTitle}>Acil İlanlar</Text>
                  <View style={styles.opportunityBadge}>
                    <Text style={styles.opportunityBadgeText}>FIRSAT</Text>
                  </View>
                </View>
                <Text style={styles.menuDesc}>Fiyatı düşen ve acil satışlı araçları incele</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ef4444" />
            </TouchableOpacity>

            {/* Option 2: TÜM İLANLAR */}
            <TouchableOpacity
              style={styles.menuOptionCard}
              activeOpacity={0.8}
              onPress={() => handleOpenListings(false)}
            >
              <View style={[styles.menuIconCircle, styles.allIconCircle]}>
                <Ionicons name="car-sport" size={24} color="#ea580c" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Tüm İlanlar</Text>
                <Text style={styles.menuDesc}>Onaylı ve güncel tüm satılık araç listesi</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ea580c" />
            </TouchableOpacity>

            {/* Option 3: İLAN VER */}
            <TouchableOpacity
              style={[styles.menuOptionCard, styles.createCardBg]}
              activeOpacity={0.8}
              onPress={handleCreateListing}
            >
              <View style={[styles.menuIconCircle, styles.createIconCircle]}>
                <Ionicons name="add" size={26} color="#ffffff" />
              </View>
              <View style={styles.menuTextWrap}>
                <View style={styles.menuTitleRow}>
                  <Text style={[styles.menuTitle, { color: '#0f172a' }]}>İlan Ver</Text>
                  <View style={styles.fastBadge}>
                    <Text style={styles.fastBadgeText}>HIZLI YAYIN</Text>
                  </View>
                </View>
                <Text style={styles.menuDesc}>Aracını dakikalar içinde binlerce alıcıya ulaştır</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ea580c" />
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Vazgeç</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  centerTabBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ea580c',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -18,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  popoverCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  dragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 4,
  },
  popoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  popoverTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  popoverSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    gap: 14,
  },
  urgentCardBorder: {
    borderColor: '#fecdd3',
    backgroundColor: '#fff1f2',
  },
  createCardBg: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  menuIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgentIconCircle: {
    backgroundColor: '#ffe4e6',
  },
  allIconCircle: {
    backgroundColor: '#ffedd5',
  },
  createIconCircle: {
    backgroundColor: '#ea580c',
  },
  menuTextWrap: {
    flex: 1,
    gap: 3,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  menuDesc: {
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 16,
  },
  opportunityBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  opportunityBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  fastBadge: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fastBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  cancelBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#475569',
  },
});
