import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

/**
 * React Native ErrorBoundary
 * Catches JavaScript-level render and lifecycle exceptions in React component tree.
 * Note: Native / OS-level process crashes (Objective-C/Swift/Java/C++) cannot be caught by JS boundaries.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[TORQUE_SCOUT_MOBILE_ERROR_BOUNDARY]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
    try {
      router.replace('/(tabs)');
    } catch {
      // Fallback if router fails
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.iconContainer}>
              <Ionicons name="warning-outline" size={48} color="#f97316" />
            </View>

            <Text style={styles.title}>Bir Aksaklık Oluştu</Text>
            <Text style={styles.subtitle}>
              Sayfa yüklenirken beklenmeyen bir durum meydana geldi. Lütfen tekrar deneyin veya ana sayfaya dönün.
            </Text>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.8}
                onPress={this.handleRetry}
              >
                <Ionicons name="refresh" size={16} color="#ffffff" style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>Yeniden Dene</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.8}
                onPress={this.handleGoHome}
              >
                <Ionicons name="home-outline" size={16} color="#0f172a" style={styles.buttonIcon} />
                <Text style={styles.secondaryButtonText}>Ana Sayfaya Dön</Text>
              </TouchableOpacity>
            </View>

            {this.state.error && (
              <View style={styles.detailsContainer}>
                <TouchableOpacity
                  onPress={() => this.setState({ showDetails: !this.state.showDetails })}
                  style={styles.toggleButton}
                >
                  <Text style={styles.toggleText}>
                    {this.state.showDetails ? 'Detayları Gizle' : 'Hata Detaylarını Gör'}
                  </Text>
                  <Ionicons
                    name={this.state.showDetails ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color="#94a3b8"
                  />
                </TouchableOpacity>

                {this.state.showDetails && (
                  <View style={styles.debugBox}>
                    <Text style={styles.debugText}>
                      {this.state.error.message || 'Bilinmeyen JavaScript hatası'}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#ffedd5',
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 28,
    maxWidth: 320,
  },
  buttonGroup: {
    width: '100%',
    maxWidth: 280,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#ea580c',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 6,
  },
  detailsContainer: {
    marginTop: 32,
    width: '100%',
    maxWidth: 320,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  toggleText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  debugBox: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#0f172a',
    borderRadius: 12,
  },
  debugText: {
    fontSize: 10,
    color: '#fca5a5',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
