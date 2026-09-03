import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
} from 'react-native';

export default function TabsLayout() {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  // Animations for the 3 floating bubbles
  const scaleAnim1 = useRef(new Animated.Value(0)).current;
  const scaleAnim2 = useRef(new Animated.Value(0)).current;
  const scaleAnim3 = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (menuVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.stagger(60, [
          Animated.spring(scaleAnim3, {
            toValue: 1,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim2, {
            toValue: 1,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim1, {
            toValue: 1,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      scaleAnim1.setValue(0);
      scaleAnim2.setValue(0);
      scaleAnim3.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [menuVisible]);

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
              // Open 3 floating bubbles above tab button
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
      {/* 🎈 3 FLOATING BUBBLES POPUP (BALONCUK MENÜ) 🎈 */}
      {/* ========================================================================= */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="none"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuVisible(false)}>
          {/* Dimmed backdrop animated view */}
          <Animated.View style={[styles.backdropBg, { opacity: fadeAnim }]} />

          {/* Centered Floating Bubbles Cluster */}
          <View style={styles.bubblesContainer}>
            {/* Bubble 1 (Top): İLAN VER */}
            <Animated.View
              style={{
                transform: [{ scale: scaleAnim1 }],
                opacity: scaleAnim1,
              }}
            >
              <TouchableOpacity
                style={[styles.bubblePill, styles.bubblePillCreate]}
                activeOpacity={0.85}
                onPress={handleCreateListing}
              >
                <View style={styles.bubbleIconCircleCreate}>
                  <Ionicons name="add" size={18} color="#ea580c" />
                </View>
                <Text style={styles.bubbleTextCreate}>İlan Ver</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Bubble 2 (Middle): TÜM İLANLAR */}
            <Animated.View
              style={{
                transform: [{ scale: scaleAnim2 }],
                opacity: scaleAnim2,
              }}
            >
              <TouchableOpacity
                style={[styles.bubblePill, styles.bubblePillAll]}
                activeOpacity={0.85}
                onPress={() => handleOpenListings(false)}
              >
                <View style={styles.bubbleIconCircleAll}>
                  <Ionicons name="car-sport" size={18} color="#ea580c" />
                </View>
                <Text style={styles.bubbleTextAll}>Tüm İlanlar</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Bubble 3 (Bottom): ACİL İLANLAR */}
            <Animated.View
              style={{
                transform: [{ scale: scaleAnim3 }],
                opacity: scaleAnim3,
              }}
            >
              <TouchableOpacity
                style={[styles.bubblePill, styles.bubblePillUrgent]}
                activeOpacity={0.85}
                onPress={() => handleOpenListings(true)}
              >
                <View style={styles.bubbleIconCircleUrgent}>
                  <Ionicons name="flame" size={18} color="#ef4444" />
                </View>
                <Text style={styles.bubbleTextUrgent}>Acil İlanlar</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Close Cross Floating Button */}
            <TouchableOpacity
              style={styles.bubbleCloseBtn}
              activeOpacity={0.8}
              onPress={() => setMenuVisible(false)}
            >
              <Ionicons name="close" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
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
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdropBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  bubblesContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 24,
    alignItems: 'center',
    gap: 12,
  },
  /* 🎈 BUBBLE PILLS STYLES 🎈 */
  bubblePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 8,
    paddingRight: 18,
    paddingVertical: 7,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  bubblePillCreate: {
    backgroundColor: '#ea580c',
    borderColor: '#fb923c',
    shadowColor: '#ea580c',
    shadowOpacity: 0.4,
  },
  bubblePillAll: {
    backgroundColor: '#ffffff',
    borderColor: '#fed7aa',
  },
  bubblePillUrgent: {
    backgroundColor: '#ffffff',
    borderColor: '#fecdd3',
  },
  /* ICON CIRCLES */
  bubbleIconCircleCreate: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleIconCircleAll: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleIconCircleUrgent: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff1f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  /* BUBBLE TEXTS */
  bubbleTextCreate: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  bubbleTextAll: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  bubbleTextUrgent: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#ef4444',
    letterSpacing: 0.2,
  },
  /* CLOSE BUTTON */
  bubbleCloseBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});
