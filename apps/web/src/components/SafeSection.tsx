"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export interface SafeSectionTelemetryPayload {
  level: 'WARN_CRASH_ISOLATED';
  componentName: string;
  route: string;
  entityId?: string;
  errorMessage: string;
  errorDigest?: string;
  timestamp: string;
}

interface SafeSectionProps {
  title?: string;
  componentName?: string;
  entityId?: string;
  route?: string;
  fallback?: ReactNode;
  children: ReactNode;
  className?: string;
  onTelemetry?: (payload: SafeSectionTelemetryPayload) => void;
}

interface SafeSectionState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Real React Error Boundary for isolated dynamic fragile widgets.
 * Catches JavaScript render exceptions in wrapped tree without letting the entire page crash.
 * Emits non-sensitive telemetry on catch so errors are never silently masked.
 */
export default class SafeSection extends Component<SafeSectionProps, SafeSectionState> {
  constructor(props: SafeSectionProps) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): SafeSectionState {
    return {
      hasError: true,
      errorMessage: error?.message || "Bilinmeyen bileşen hatası",
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const componentName = this.props.componentName || this.props.title || "SafeSectionWidget";
    const route = typeof window !== 'undefined' ? window.location.pathname : (this.props.route || 'unknown');
    const entityId = this.props.entityId;

    const telemetry: SafeSectionTelemetryPayload = {
      level: 'WARN_CRASH_ISOLATED',
      componentName,
      route,
      entityId,
      errorMessage: error?.message || "Unknown error",
      errorDigest: (error as any)?.digest,
      timestamp: new Date().toISOString(),
    };

    // Log structured telemetry for observability (no sensitive user data)
    console.warn(
      `[TORQUE_SCOUT_WIDGET_TELEMETRY] Widget "${componentName}" caught render error at ${route}:`,
      JSON.stringify(telemetry),
      errorInfo?.componentStack?.slice(0, 300)
    );

    if (this.props.onTelemetry) {
      try {
        this.props.onTelemetry(telemetry);
      } catch (e) {
        // Never let telemetry callback failure crash the boundary
      }
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const sectionTitle = this.props.title || "Bu Bölüm";

      return (
        <div
          className={`w-full rounded-2xl border border-amber-500/25 bg-[#0b1329]/80 p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 text-left ${this.props.className || ""}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-amber-200">
                {sectionTitle} Yüklenirken Bir Sorun Oluştu
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-md">
                Geçici bir veri uyumsuzluğu nedeniyle bu içerik görüntülenemedi. Sayfanın diğer bölümleri çalışmaya devam etmektedir.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-white/10 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Tekrar Dene</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
