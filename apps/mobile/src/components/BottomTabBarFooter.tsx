import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function BottomTabBarFooter() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 12);
  const tabBarHeight = 60 + bottomInset;
  const defaultCloseBottom = bottomInset + 27;

  const [menuVisible, setMenuVisible] = useState(false);
  const centerBadgeRef = useRef<any>(null);
  const [closeBtnBottom, setCloseBtnBottom] = useState<number>(defaultCloseBottom);

  const openMenu = () => {
    if (centerBadgeRef.current && typeof centerBadgeRef.current.measureInWindow === 'function') {
      centerBadgeRef.current.measureInWindow((_x: number, y: number, _w: number, h: number) => {
        if (typeof y === 'number' && typeof h === 'number' && y > 0) {
          const winH = Dimensions.get('window').height;
          const exactBottom = Math.max(20, Math.round(winH - (y + h)));
          setCloseBtnBottom(exactBottom);
        } else {
          setCloseBtnBottom(defaultCloseBottom);
        }
        setMenuVisible(true);
      });
    } else {
      setCloseBtnBottom(defaultCloseBottom);
      setMenuVisible(true);
    }
  };

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
  }, [menuVisible, fadeAnim, scaleAnim1, scaleAnim2, scaleAnim3]);

  const handleOpenListings = (urgent: boolean) => {
    setMenuVisible(false);
    router.navigate({
      pathname: '/(tabs)/listings',
      params: {
        urgentOnly: urgent ? 'true' : 'false',
        promptCategory: urgent ? undefined : String(Date.now()),
      },
    } as any);
  };

  const handleCreateListing = () => {
    setMenuVisible(false);
    router.push('/create-listing' as any);
  };

  const isKesfetGroup =
    pathname.includes('kesfet') ||
    pathname.includes('isicepte') ||
    pathname.includes('vehicle-guide') ||
    pathname.includes('aracini-bul');

  return (
    <>
      <View style={[styles.tabBar, { paddingBottom: bottomInset, height: tabBarHeight }]}>
        {/* 1. Ana Sayfa */}
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.75}
          onPress={() => router.navigate('/(tabs)' as any)}
        >
          <Ionicons name="home-outline" size={22} color="#64748b" />
          <Text style={styles.tabLabel}>Ana Sayfa</Text>
        </TouchableOpacity>

        {/* 2. Keşfet */}
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.75}
          onPress={() => router.navigate('/(tabs)/kesfet' as any)}
        >
          <Ionicons
            name={isKesfetGroup ? 'compass' : 'compass-outline'}
            size={22}
            color={isKesfetGroup ? '#ea580c' : '#64748b'}
          />
          <Text style={[styles.tabLabel, isKesfetGroup && styles.tabLabelActive]}>Keşfet</Text>
        </TouchableOpacity>

        {/* 3. İlanlar (Center Orange Badge) */}
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.85}
          onPress={openMenu}
        >
          <View
            ref={centerBadgeRef}
            collapsable={false}
            style={[styles.centerTabBadge, menuVisible && { opacity: 0 }]}
          >
            <Ionicons name="car-sport" size={24} color="#ffffff" />
          </View>
          <Text style={styles.tabLabel}>İlanlar</Text>
        </TouchableOpacity>

        {/* 4. Paketler */}
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.75}
          onPress={() => router.navigate('/(tabs)/packages' as any)}
        >
          <Ionicons name="gift-outline" size={22} color="#64748b" />
          <Text style={styles.tabLabel}>Paketler</Text>
        </TouchableOpacity>

        {/* 5. Club */}
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.75}
          onPress={() => router.navigate('/(tabs)/club' as any)}
        >
          <Ionicons name="shield-checkmark-outline" size={22} color="#64748b" />
          <Text style={styles.tabLabel}>Club</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="none"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuVisible(false)}>
          <Animated.View style={[styles.backdropBg, { opacity: fadeAnim }]} />
          <View style={[styles.bubblesContainer, { bottom: closeBtnBottom }]}>
            <Animated.View style={{ transform: [{ scale: scaleAnim1 }], opacity: scaleAnim1 }}>
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

            <Animated.View style={{ transform: [{ scale: scaleAnim2 }], opacity: scaleAnim2 }}>
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

            <Animated.View style={{ transform: [{ scale: scaleAnim3 }], opacity: scaleAnim3 }}>
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
  tabBar: {
    flexDirection: 'row',
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
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#ea580c',
  },
  centerTabBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ea580c',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -22,
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
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  bubblesContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 24,
    alignItems: 'center',
    gap: 12,
  },
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
