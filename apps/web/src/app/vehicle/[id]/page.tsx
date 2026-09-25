"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import QuotaBadge from "@/components/QuotaBadge";
import VehicleReportShell from "../../vehicle-report/components/VehicleReportShell";
import IsiCepteListingRecommendationWidget from "@/app/listings/components/IsiCepteListingRecommendationWidget";
import VehicleExactListingsWidget from "@/app/listings/components/VehicleExactListingsWidget";
import SafeSection from "@/components/SafeSection";
import { ComprehensiveVehicleReport } from "@used-car-intelligence/shared";
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileCheck,
  Search,
  ShieldCheck,
  Database,
  Sparkles,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const REPORT_PIPELINE_STEPS = [
  {
    id: 1,
    title: "1. Teknik Veri ve Katalog Doğrulaması",
    desc: "Motor, şanzıman, güç (HP), tork ve donanım paketleri resmi üretici kataloglarıyla eşleştiriliyor.",
    icon: Database,
  },
  {
    id: 2,
    title: "2. Kronik Arıza & Mekanik Risk Analizi",
    desc: "Motor bloğu, şanzıman mekatroniği, yakıt sistemi, yürüyen aksam ve elektronik arıza kayıtları taranıyor.",
    icon: Search,
  },
  {
    id: 3,
    title: "3. Global Geri Çağırma (Recall) Bültenleri",
    desc: "Üretici servis aksiyonları, bültenler ve küresel güvenlik geri çağırmaları inceleniyor.",
    icon: ShieldCheck,
  },
  {
    id: 4,
    title: "4. Türkiye Pazarı ve İşletme Maliyeti",
    desc: "Resmi MTV dilimi, gerçek tüketim ortalamaları ve periyodik parça/bakım projeksiyonu hesaplanıyor.",
    icon: FileCheck,
  },
  {
    id: 5,
    title: "5. AI Uzman Karar Sentezi & Ekspertiz Rehberi",
    desc: "Satın alma tavsiyeleri, ekspertiz öncelikli kontrol noktaları ve nihai rapor üretiliyor.",
    icon: Sparkles,
  },
];

const categoryMap: Record<string, { label: string; desc: string }> = {
  ENGINE: { label: 'Motor', desc: 'Aracın çalışmasını ve çekiş gücünü sağlayan ana motor ünitesi.' },
  TRANSMISSION: { label: 'Şanzıman (Vites Kutusu)', desc: 'Motorun ürettiği gücü tekerleklere aktaran, vites geçişlerini sağlayan sistem.' },
  ELECTRONICS: { label: 'Elektronik & Elektrik', desc: 'Aydınlatma, beyin (ECU), sensörler ve kablolama gibi elektriksel tüm aksamlar.' },
  SUSPENSION: { label: 'Süspansiyon & Alt Takım', desc: 'Yol tutuşunu sağlayan amortisör, rotil ve salıncak gibi yürüyen aksam parçaları.' },
  BRAKE: { label: 'Fren Sistemi', desc: 'Aracın güvenle yavaşlamasını ve durmasını sağlayan disk, balata ve fren hidroliği grubu.' },
  BODY: { label: 'Kaporta & Şasi', desc: 'Aracın dış metal sacı, kapıları, tavanı ve aracın güvenliğini sağlayan taşıyıcı şasi iskeleti.' },
  PAINT: { label: 'Boya & Kaplama', desc: 'Araçtaki boya kalınlıkları, sonradan yapılan lokal boyalar ve macun düzeltme durumları.' },
  INTERIOR: { label: 'İç Mekan & Kabin', desc: 'Koltuklar, direksiyon, tuş takımları, klima ve ön konsol aksamı.' },
  TIRES: { label: 'Lastikler & Jantlar', desc: 'Lastiklerin diş derinlikleri, üretim yılı (ömrü) ve jantların düzgünlüğü.' },
  TEST_DRIVE: { label: 'Test Sürüşü Kontrolü', desc: 'Yolda sürüş yaparken vites geçişleri, sağa/sola çekme, gelen sesler ve hızlanma durumu.' },
  MAINTENANCE: { label: 'Periyodik Bakım', desc: 'Motor yağı, filtreler ve triger kayışı gibi ağır bakımların zamanında yapılıp yapılmadığı.' },
  DOCUMENTS: { label: 'Belgeler & Muayene', desc: 'Tramer hasar kaydı geçmişi, muayene geçerlilik süresi, ruhsat ve yedek anahtar durumu.' },
  GENERAL: { label: 'Genel Kontroller', desc: 'Aracın genel durumuyla alakalı diğer temel fiziksel kontroller.' }
};

const parseBoldText = (content: string) => {
  const parts = content.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-extrabold text-white">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const renderMarkdown = (text: string) => {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="flex flex-col gap-2">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // Bullet point
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
          const content = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-2 ml-2 my-0.5">
              <span className="text-orange-500 select-none">•</span>
              <span className="text-xs text-slate-300 leading-relaxed">{parseBoldText(content)}</span>
            </div>
          );
        }

        // Standard paragraph
        return (
          <p key={idx} className="text-xs text-slate-300 leading-relaxed my-0.5">
            {parseBoldText(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

export default function VehicleDetail() {
  const params = useParams();
  const router = useRouter();
  const variantId = params.id as string;

  // States
  const [vehicle, setVehicle] = useState<any>(null);
  const [aiReport, setAiReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // AI report generation states
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState("");
  const [pipelineStep, setPipelineStep] = useState<number>(1);
  
  // Auth state
  const [user, setUser] = useState<any>(null);

  // Favorites states
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteError, setFavoriteError] = useState("");

  // AI Chat states
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [sendingChat, setSendingChat] = useState(false);
  const [chatError, setChatError] = useState("");
  const [chatQuota, setChatQuota] = useState<{
    isUnlimited: boolean;
    remaining: number;
    totalLimit: number;
    loading: boolean;
  }>({
    isUnlimited: false,
    remaining: 3,
    totalLimit: 3,
    loading: true,
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchChatQuota = async () => {
    try {
      const token = typeof window !== "undefined" ? (localStorage.getItem("accessToken") || localStorage.getItem("token")) : null;
      const res = await fetch(`${API_URL}/subscriptions/summary`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        const right = data?.rights?.aiChat;
        const isUnlimited = Boolean(data?.isUnlimited || right?.isUnlimited);
        setChatQuota({
          isUnlimited,
          remaining: right?.remaining ?? 3,
          totalLimit: right?.totalLimit ?? 3,
          loading: false,
        });
      }
    } catch {
      setChatQuota(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchChatQuota();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, sendingChat]);

  // Reviews states
  const [comment, setComment] = useState("");
  const [usageDuration, setUsageDuration] = useState(12);
  const [isOwner, setIsOwner] = useState(true);
  const [recommend, setRecommend] = useState(true);
  const [ratings, setRatings] = useState({
    reliability: 5,
    fuelConsumption: 5,
    comfort: 5,
    partCost: 5,
    maintenanceCost: 5,
    resaleEase: 5,
    overall: 5,
  });
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Fetch variant detail & favorites on load
  const fetchVehicleDetails = (id: string) => {
    if (!id) return;

    if (typeof window !== "undefined") {
      try {
        const cachedVeh = sessionStorage.getItem(`ts_veh_${id}`);
        if (cachedVeh) {
          setVehicle(JSON.parse(cachedVeh));
          setLoading(false);
        }
      } catch {}
    }

    const token = typeof window !== "undefined" ? (localStorage.getItem("accessToken") || localStorage.getItem("token")) : null;
    const headers: any = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    fetch(`${API_URL}/vehicles/variants/${id}`, { headers })
      .then(res => {
        if (!res.ok) throw new Error("Araç detayları yüklenemedi.");
        return res.json();
      })
      .then(data => {
        setVehicle(data);
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem(`ts_veh_${id}`, JSON.stringify(data));
          } catch {}
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // If logged in, check if this vehicle is favorited
    if (token) {
      fetch(`${API_URL}/favorites`, { headers })
        .then(res => res.json())
        .then(favs => {
          if (Array.isArray(favs)) {
            const exists = favs.some((f: any) => f.variantId === id);
            setIsFavorited(exists);
          }
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Structured Vehicle Report State (New Engine)
  const [structuredReport, setStructuredReport] = useState<ComprehensiveVehicleReport | null>(null);
  const [loadingStructuredReport, setLoadingStructuredReport] = useState<boolean>(false);

  const getAuthHeaders = (): any => {
    const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
    const headers: any = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  const safeFetchJson = async (res: Response): Promise<any> => {
    if (!res || res.status === 204) return null;
    try {
      const text = await res.text();
      if (!text || !text.trim()) return null;
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  };

  const extractReportData = (data: any): ComprehensiveVehicleReport | null => {
    if (!data) return null;
    let payload = data.reportData !== undefined ? data.reportData : data;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        return null;
      }
    }
    if (payload && typeof payload === "object" && (payload.executiveSummary || payload.vehicleIdentity || payload.finalVerdict)) {
      return {
        ...payload,
        reportId: data.id || payload.reportId || payload.id,
        likeCount: data.likeCount ?? payload.likeCount ?? 0,
        dislikeCount: data.dislikeCount ?? payload.dislikeCount ?? 0,
      } as ComprehensiveVehicleReport;
    }
    return null;
  };

  const fetchStructuredReport = async (force = false) => {
    if (!variantId) return;

    if (force) {
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem(`ts_rep_${variantId}`);
        } catch {}
      }
      setStructuredReport(null);
      setPipelineStep(1);
    } else if (typeof window !== "undefined") {
      try {
        const cachedRep = sessionStorage.getItem(`ts_rep_${variantId}`);
        if (cachedRep) {
          const parsedCached = JSON.parse(cachedRep);
          if (parsedCached) {
            setStructuredReport(parsedCached);
          }
        }
      } catch {}
    }

    setLoadingStructuredReport(true);

    try {
      const headers = getAuthHeaders();

      if (!force) {
        const res = await fetch(`${API_URL}/vehicle-reports/by-variant/${variantId}/current`, {
          headers,
        });
        if (res.ok) {
          const data = await safeFetchJson(res);
          const parsed = extractReportData(data);
          if (
            parsed && 
            data.status === "COMPLETED" && 
            data.provider !== "DETERMINISTIC_FALLBACK" &&
            (data.reportData?.status || data.status) !== "SAFE_FALLBACK"
          ) {
            setStructuredReport(parsed);
            if (typeof window !== "undefined") {
              try {
                sessionStorage.setItem(`ts_rep_${variantId}`, JSON.stringify(parsed));
              } catch {}
            }
            setLoadingStructuredReport(false);
            setReportError("");
            return;
          }
        }

        // Veritabanında tamamlanmış güncel rapor bulunamadıysa:
        // Stale client sessionStorage önbelleğini temizle ve analizi başlat
        if (typeof window !== "undefined") {
          try {
            sessionStorage.removeItem(`ts_rep_${variantId}`);
          } catch {}
        }
        setStructuredReport(null);
        setPipelineStep(1);
      }

      const genRes = await fetch(`${API_URL}/vehicle-reports`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          mode: "TORQUE_SCOUT_VEHICLE_REPORT",
          variantId,
          entryPoint: "VEHICLE_SEARCH",
          idempotencyKey: `vr_${variantId}_${Date.now()}`,
          forceRefresh: force,
        }),
      });

      if (genRes.ok) {
        const genData = await safeFetchJson(genRes);
        const reportId = genData?.reportId || genData?.id;
        if (reportId) {
          const detailRes = await fetch(`${API_URL}/vehicle-reports/${reportId}`, {
            headers,
          });
          if (detailRes.ok) {
            const detailData = await safeFetchJson(detailRes);
            const parsedDetail = extractReportData(detailData);
            if (parsedDetail) {
              setStructuredReport(parsedDetail);
              if (typeof window !== "undefined") {
                try {
                  sessionStorage.setItem(`ts_rep_${variantId}`, JSON.stringify(parsedDetail));
                } catch {}
              }
              setLoadingStructuredReport(false);
              setReportError("");
              return;
            }
          }
        }
      } else {
        const errData = await safeFetchJson(genRes);
        if (errData?.message && errData?.statusCode !== 404) {
          setReportError(errData.message);
        }
      }
    } catch (e: any) {
      console.error("Fetch structured vehicle report error", e);
    } finally {
      setLoadingStructuredReport(false);
    }
  };

  useEffect(() => {
    if (variantId) {
      fetchVehicleDetails(variantId);
      fetchStructuredReport(false);
    }
  }, [variantId]);

  // Poll report status silently in the background
  const checkReportStatusSilently = async () => {
    if (!variantId || structuredReport) return;
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_URL}/vehicle-reports/by-variant/${variantId}/current`, { headers });
      if (res.ok) {
        const data = await safeFetchJson(res);
        const parsed = extractReportData(data);
        if (parsed) {
          setStructuredReport(parsed);
          setLoadingStructuredReport(false);
          setReportError("");
        }
      }
    } catch (e) {}
  };

  // Advance pipeline step while report is loading (giving confidence to user)
  useEffect(() => {
    if (structuredReport) return;
    const stepTimer = setInterval(() => {
      setPipelineStep((prev) => (prev < 5 ? prev + 1 : 5));
    }, 3200);
    return () => clearInterval(stepTimer);
  }, [structuredReport]);

  // Poll report status silently while waiting
  useEffect(() => {
    if (structuredReport || !variantId) return;

    const pollTimer = setInterval(() => {
      checkReportStatusSilently();
    }, 2800);

    return () => clearInterval(pollTimer);
  }, [variantId, structuredReport]);

  // Toggle Favorite
  const handleToggleFavorite = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }

    setFavoriteError("");

    fetch(`${API_URL}/favorites/toggle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ variantId }),
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.message || "Favori işlemi başarısız.");
          });
        }
        return res.json();
      })
      .then(data => {
        setIsFavorited(data.favorited);
      })
      .catch(err => {
        setFavoriteError(err.message);
      });
  };

  // Generate Report
  const handleGenerateReport = (force = false) => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }

    setGeneratingReport(true);
    setReportError("");

    fetch(`${API_URL}/reports/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ variantId, languageCode: "tr", force }),
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.message || "Rapor oluşturma başarısız.");
          });
        }
        return res.json();
      })
      .then(data => {
        setAiReport(data);
        setGeneratingReport(false);
        if (data.finalDecision === 'INSUFFICIENT_DATA') {
          if (!force) {
            handleGenerateReport(true); // immediately trigger background research
          }
        } else {
          fetchVehicleDetails(variantId);
        }
      })
      .catch(err => {
        setReportError(err.message);
        setGeneratingReport(false);
      });
  };

  // Custom AI Chat Question
  const handleSendChat = (e?: React.FormEvent, customQuestion?: string) => {
    if (e) e.preventDefault();
    const questionToSend = (customQuestion || chatQuestion).trim();
    if (!questionToSend || sendingChat) return;

    const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    if (!chatQuota.isUnlimited && chatQuota.remaining <= 0) {
      setChatError("Mesaj hakkınız tükendi. Lütfen ek paket satın alın.");
      return;
    }

    setChatQuestion("");
    setSendingChat(true);
    setChatError("");

    // Append user message immediately
    setChatMessages(prev => [...prev, { sender: "user", text: questionToSend }]);

    fetch(`${API_URL}/reports/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ variantId, question: questionToSend }),
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.message || "Yapay zeka yanıt veremedi.");
          });
        }
        return res.json();
      })
      .then(data => {
        setChatMessages(prev => [...prev, { sender: "ai", text: data.response }]);
        setSendingChat(false);
        fetchChatQuota();
      })
      .catch(err => {
        setChatError(err.message);
        setSendingChat(false);
      });
  };

  // Submit Review
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }

    setReviewError("");
    setReviewSuccess("");
    setSubmittingReview(true);

    fetch(`${API_URL}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        variantId,
        comment,
        usageDuration: Number(usageDuration),
        isOwner,
        recommend,
        rating: ratings,
      }),
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.message || "Yorum gönderilemedi.");
          });
        }
        return res.json();
      })
      .then(data => {
        setReviewSuccess(data.message);
        setComment("");
        setSubmittingReview(false);
        // Refresh details to load new pending reviews list (or wait approval)
        fetchVehicleDetails(variantId);
      })
      .catch(err => {
        setReviewError(Array.isArray(err.message) ? err.message[0] : err.message);
        setSubmittingReview(false);
      });
  };

  const isPageLoading = loading;

  if (isPageLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-center gap-4 min-h-[50vh]">
        <div className="relative flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
        <p className="text-xs text-slate-400">Araç özellikleri yükleniyor...</p>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="text-red-400 font-bold text-lg">⚠️ Araç bulunamadı veya onaylanmamış.</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen px-2 md:px-4 py-3 flex justify-center items-start gap-4 xl:gap-5 min-[1600px]:gap-6">
      
      {/* SOL GOOGLE ADS REKLAM KOLONU (1280px ve üzeri ekranlarda temiz boşluk olarak kalır) */}
      <div className="hidden xl:block w-[160px] min-[1600px]:w-[200px] min-[1920px]:w-[280px] shrink-0 sticky top-16 h-[600px]" />

      {/* MERKEZ ANA İÇERİK KONTEYNERİ (1220px Ortalanmış Geniş) */}
      <div className="w-full max-w-[1220px] flex flex-col gap-4 shrink-0">
        
        {/* Title Header & Favorite Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-2.5">
          <div>
            <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
              {typeof vehicle.country === 'object' ? vehicle.country?.name : (vehicle.country || 'Türkiye')} Spesifikasyonları
            </span>
            <h1 className="text-lg md:text-xl font-black tracking-tight text-white mt-1">
              {typeof vehicle.brand === 'object' ? vehicle.brand?.name : vehicle.brand} {typeof vehicle.model === 'object' ? vehicle.model?.name : vehicle.model} ({vehicle.year})
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
              {typeof vehicle.generation === 'object' ? vehicle.generation?.name : (vehicle.generation || '')} • {typeof vehicle.bodyType === 'object' ? vehicle.bodyType?.name : (vehicle.bodyType || '')} • {typeof vehicle.engine === 'object' ? (vehicle.engine?.code || vehicle.engine?.name || '') : (vehicle.engine || '')} • {typeof vehicle.transmission === 'object' ? vehicle.transmission?.name : (vehicle.transmission || '')} • {typeof vehicle.trim === 'object' ? vehicle.trim?.name : (vehicle.trim || '')}
            </p>
          </div>

          {/* Favorite Button */}
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleToggleFavorite}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border transition ${
                isFavorited
                  ? "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20"
                  : "bg-slate-900 border-white/10 text-slate-300 hover:bg-white/5"
              }`}
            >
              ❤️ {isFavorited ? "Favorilerden Çıkar" : "Favorilere Ekle"}
            </button>
            {favoriteError && (
              <span className="text-[10px] text-red-400 font-bold max-w-[200px] text-right mt-0.5">{favoriteError}</span>
            )}
          </div>
        </div>

      {/* Quota Badge Header */}
      <QuotaBadge feature="aiReports" className="mb-6" />

      {/* Grid Layout */}
      {aiReport?.summary?.trimWarning ? (
        <div className="bg-[#0b0f19]/60 border border-red-500/20 p-8 md:p-12 rounded-3xl flex flex-col items-center justify-center text-center gap-6 shadow-2xl shadow-red-500/5 max-w-4xl mx-auto w-full mt-4">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 text-4xl animate-bounce">
            ⚠️
          </div>
          <div className="flex flex-col gap-3 max-w-2xl">
            <h2 className="text-2xl md:text-3xl font-black text-red-400 tracking-tight">Böyle Bir Araç Yoktur!</h2>
            <p className="text-sm text-slate-300 leading-relaxed mt-2">
              {aiReport.summary.trimWarning}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Lütfen filtreleme kriterlerini (Marka, Model, Yıl, Kasa, Motor, Şanzıman, Paket) gerçekte üretilmiş olan kombinasyonlara göre seçiniz.
            </p>
          </div>
          <a
            href="/"
            className="mt-4 bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-3 rounded-xl transition text-sm shadow-lg shadow-orange-500/20"
          >
            Filtreleri Düzelt ➔
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8">
        
        {/* Specs, Problems & Reviews Column */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          
          {/* AI Report Card (TorqueScout Vehicle Report Shell) */}
          <SafeSection title="Araç Ekspertiz Raporu">
            {structuredReport ? (
              <VehicleReportShell 
                report={structuredReport} 
              />
            ) : (
              <div className="bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md space-y-6">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500 via-amber-500 to-transparent"></div>

                {/* Header & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                      </span>
                      <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider">
                        TorqueScout Araç İstihbarat Motoru
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-white">
                      Detaylı Uzman Raporu Hazırlanıyor...
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Seçilen model ve motor kombinasyonuna ait tüm veriler resmi ve bağımsız kaynaklardan taranıyor.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 px-3.5 py-2 rounded-2xl shrink-0 self-start sm:self-center">
                    <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                    <span className="text-xs font-bold text-slate-300">
                      Adım {pipelineStep} / 5
                    </span>
                  </div>
                </div>

                {/* Progress Bar & Animated Car */}
                <div className="space-y-2 py-1">
                  <div className="flex justify-between items-center text-[11px] font-semibold text-slate-400">
                    <span>Analiz İlerlemesi</span>
                    <span className="text-orange-400 font-bold">%{Math.min(98, pipelineStep * 20 - 2)}</span>
                  </div>
                  <div className="w-full relative h-7 flex items-end">
                    <div className="w-full h-1.5 bg-slate-800/90 rounded-full relative overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-orange-600 via-amber-500 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${Math.min(98, pipelineStep * 20 - 2)}%` }}
                      />
                    </div>
                    <div
                      className="absolute bottom-1 text-xl transition-all duration-700 ease-out"
                      style={{
                        left: `calc(${Math.min(98, pipelineStep * 20 - 2)}% - 12px)`,
                        transform: "scaleX(-1)",
                      }}
                    >
                      🚗
                    </div>
                  </div>
                </div>

                {/* Pipeline Steps (with green checkmarks!) */}
                <div className="space-y-3 pt-2">
                  {REPORT_PIPELINE_STEPS.map((step) => {
                    const isDone = pipelineStep > step.id;
                    const isCurrent = pipelineStep === step.id;

                    return (
                      <div
                        key={step.id}
                        className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all duration-500 ${
                          isDone
                            ? "bg-emerald-950/20 border-emerald-500/25"
                            : isCurrent
                            ? "bg-orange-950/25 border-orange-500/40 shadow-lg shadow-orange-950/30"
                            : "bg-slate-950/40 border-slate-800/50 opacity-60"
                        }`}
                      >
                        {/* Step State Icon */}
                        <div className="mt-0.5 shrink-0">
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-in zoom-in-50 duration-300" />
                          ) : isCurrent ? (
                            <div className="relative flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center text-[10px] text-slate-500 font-bold">
                              {step.id}
                            </div>
                          )}
                        </div>

                        {/* Step Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-xs font-bold ${
                                isDone
                                  ? "text-emerald-300"
                                  : isCurrent
                                  ? "text-white"
                                  : "text-slate-400"
                              }`}
                            >
                              {step.title}
                            </span>
                            {isDone ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                                <span>✓</span>
                                <span>Tamamlandı</span>
                              </span>
                            ) : isCurrent ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 rounded-full shrink-0 animate-pulse">
                                <span>İnceleniyor...</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-600 px-2 py-0.5 rounded-full shrink-0">
                                Sırada
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-[11px] mt-0.5 leading-relaxed ${
                              isDone
                                ? "text-emerald-400/70"
                                : isCurrent
                                ? "text-slate-300"
                                : "text-slate-500"
                            }`}
                          >
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {reportError && (
                  <div className="bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs p-4 rounded-2xl font-semibold mt-3 flex flex-col items-center gap-3 max-w-md mx-auto">
                    <div className="flex items-center gap-2 text-center">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{reportError}</span>
                    </div>
                    <a
                      href="/dashboard/support/feedback?category=VEHICLE_QUERY_AI_REPORT"
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-lg active:scale-95"
                    >
                      <span>💬 Geri Bildirim Gönder</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </SafeSection>



          {/* User Reviews List */}
          <SafeSection title="Kullanıcı Yorumları">
            <div className="glass p-6 rounded-2xl flex flex-col gap-4">
              <h2 className="text-lg font-bold text-slate-200 border-b border-white/5 pb-2">💬 Kullanıcı Yorumları ({Array.isArray(vehicle.reviews) ? vehicle.reviews.length : 0})</h2>
              {Array.isArray(vehicle.reviews) && vehicle.reviews.length > 0 ? (
                <div className="flex flex-col gap-4 mt-2">
                  {vehicle.reviews.map((rev: any) => (
                    <div key={rev.id} className="bg-slate-950/20 border border-white/5 p-4 rounded-xl flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 text-xs">{rev.email}</span>
                        <span className="text-xs text-slate-500 font-medium">Süre: {rev.usageDuration} Ay • {rev.isOwner ? 'Sahibi' : 'Kullanıcısı'}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed italic">"{rev.comment}"</p>
                      {rev.rating && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 pt-2 border-t border-white/5 text-[10px] text-slate-400">
                          <span>Dayanıklılık: {rev.rating.reliability}/5⭐</span>
                          <span>Yakıt: {rev.rating.fuelConsumption}/5⭐</span>
                          <span>Konfor: {rev.rating.comfort}/5⭐</span>
                          <span>Parça Maliyeti: {rev.rating.partCost}/5⭐</span>
                          <span>Bakım: {rev.rating.maintenanceCost}/5⭐</span>
                          <span>Satış Kolaylığı: {rev.rating.resaleEase}/5⭐</span>
                          <span className="font-bold text-slate-300">Genel Skor: {rev.rating.overall}/5⭐</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Henüz yorum yapılmamış.</p>
              )}

              {/* Write a Review form */}
              <div className="mt-6 border-t border-white/5 pt-6">
                <h3 className="text-sm font-bold text-slate-200 mb-4">✍️ Araç Hakkında Yorum Yaz (Günde 1 Sınır)</h3>
                
                {reviewError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl font-semibold mb-4">
                    ⚠️ {reviewError}
                  </div>
                )}
                {reviewSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl font-semibold mb-4">
                    🎉 {reviewSuccess}
                  </div>
                )}

                <form onSubmit={handleSubmitReview} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Yorumunuz (En az 20, en fazla 1000 karakter)</label>
                    <textarea
                      required
                      rows={4}
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Aracın konforu, yakıt tüketimi, kullanıcı deneyimleri hakkındaki görüşlerinizi yazın..."
                      className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-400 uppercase">Kullanım Süresi (Ay)</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={usageDuration}
                        onChange={e => setUsageDuration(Number(e.target.value))}
                        className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 mt-6">
                      <input
                        type="checkbox"
                        id="isOwner"
                        checked={isOwner}
                        onChange={e => setIsOwner(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="isOwner" className="text-xs font-semibold text-slate-300">Araç Sahibiyim</label>
                    </div>

                    <div className="flex items-center gap-2 mt-6">
                      <input
                        type="checkbox"
                        id="recommend"
                        checked={recommend}
                        onChange={e => setRecommend(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="recommend" className="text-xs font-semibold text-slate-300">Tavsiye Ediyorum</label>
                    </div>
                  </div>

                  {/* Star Ratings Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    {Object.keys(ratings).map((key) => (
                      <div key={key} className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">{key === 'reliability' ? 'Güvenilirlik' : key === 'fuelConsumption' ? 'Yakıt' : key === 'comfort' ? 'Konfor' : key === 'partCost' ? 'Parça' : key === 'maintenanceCost' ? 'Bakım' : key === 'resaleEase' ? 'Satış' : 'Genel'}</span>
                        <select
                          value={ratings[key as keyof typeof ratings]}
                          onChange={e => setRatings(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                          className="bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-slate-200 outline-none"
                        >
                          <option value="5">5 ⭐ (Mükemmel)</option>
                          <option value="4">4 ⭐ (İyi)</option>
                          <option value="3">3 ⭐ (Orta)</option>
                          <option value="2">2 ⭐ (Kötü)</option>
                          <option value="1">1 ⭐ (Kritik)</option>
                        </select>
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs mt-2 transition"
                  >
                    {submittingReview ? "Yorum Gönderiliyor..." : "Yorumu Gönder"}
                  </button>
                </form>
              </div>
            </div>
          </SafeSection>
        </div>

        {/* AI Report & Custom AI Chat Column */}
        <div className="lg:col-span-5 flex flex-col gap-6 self-start">

          {/* AI Chat Box (Custom Question Box - Reference Design) */}
          <div className="relative overflow-hidden rounded-[24px] border border-sky-500/25 bg-[#081225]/95 backdrop-blur-xl p-4 sm:p-5 lg:p-6 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              {/* Status indicator */}
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_10px_#34d399]"></span>
                </span>
                <span className="text-xs sm:text-sm font-medium text-emerald-300/95 tracking-wide select-none">
                  {Boolean(structuredReport || aiReport || vehicle?.aiReport)
                    ? "Çevrimiçi • Rapor verilerine hakim"
                    : "Çevrimiçi • Araç verilerine hazır"}
                </span>
              </div>

              {/* Entitlement Badge */}
              <div className="rounded-2xl border border-teal-500/35 bg-[#08222c]/80 px-3.5 py-1.5 flex flex-col items-center justify-center text-center select-none shadow-sm shrink-0 min-w-[92px]">
                <span className="text-teal-300 font-bold text-xs sm:text-[13px] leading-tight">
                  {chatQuota.isUnlimited ? "Sınırsız" : `${chatQuota.remaining}`}
                </span>
                <span className="text-teal-400/90 font-medium text-[10px] sm:text-[11px] leading-tight mt-0.5">
                  {chatQuota.isUnlimited ? "Mesaj Hakkı" : "Mesaj Kaldı"}
                </span>
              </div>
            </div>

            {/* Subtle Divider */}
            <div className="border-t border-sky-500/15 w-full my-4 sm:my-5" />

            {/* Center Title or Message History */}
            {chatMessages.length === 0 ? (
              <div className="flex flex-col">
                <h3 className="text-center text-base sm:text-lg font-bold text-slate-100 mb-4 sm:mb-5 tracking-tight">
                  Bu araç hakkında ne öğrenmek istersiniz?
                </h3>

                {/* 2x2 Suggestion Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mb-4 sm:mb-5">
                  {[
                    "Şanzıman uzun vadede üzer mi?",
                    "Bu motorun kronik sorunu var mı?",
                    "Yakıt tüketimi gerçek kullanımda nasıl?",
                    "Satın almadan önce neye baktırmalıyım?",
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={sendingChat || (!chatQuota.isUnlimited && chatQuota.remaining <= 0)}
                      onClick={() => handleSendChat(undefined, q)}
                      className="group relative flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-[#0c182e]/80 hover:bg-[#112444] border border-sky-500/15 hover:border-sky-400/40 transition-all duration-200 cursor-pointer text-left shadow-sm hover:shadow-md hover:shadow-sky-950/40 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="w-7 h-7 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          <circle cx="9" cy="10" r="0.8" fill="currentColor"/>
                          <circle cx="12" cy="10" r="0.8" fill="currentColor"/>
                          <circle cx="15" cy="10" r="0.8" fill="currentColor"/>
                        </svg>
                      </div>
                      <span className="text-[11px] sm:text-xs font-medium text-slate-200 group-hover:text-white px-2 flex-1 leading-snug">
                        {q}
                      </span>
                      <svg className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col mb-4">
                {/* Messages Listing */}
                <div className="max-h-96 overflow-y-auto flex flex-col gap-3 py-2 pr-1 custom-scrollbar">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-2.5 max-w-[88%] ${
                        msg.sender === "user" ? "self-end flex-row-reverse" : "self-start"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 select-none font-bold ${
                          msg.sender === "user"
                            ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                            : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                        }`}
                      >
                        {msg.sender === "user" ? "Siz" : "TS"}
                      </div>
                      <div
                        className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-md ${
                          msg.sender === "user"
                            ? "bg-gradient-to-br from-orange-600/20 to-orange-700/5 border border-orange-500/25 text-slate-100 rounded-tr-none"
                            : "bg-[#071326] border border-sky-500/20 text-slate-200 rounded-tl-none"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {sendingChat && (
                    <div className="flex gap-2.5 self-start">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs bg-sky-500/20 text-sky-400 border border-sky-500/30 animate-pulse font-bold">
                        TS
                      </div>
                      <div className="p-3 rounded-2xl text-xs bg-[#071326] border border-sky-500/20 text-slate-400 rounded-tl-none flex items-center gap-1.5 shadow-md">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                        <span className="text-[11px] text-slate-500 ml-1 font-medium">Analiz ediliyor...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Suggested Questions compact chips after conversation begins */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2.5 mt-2 border-t border-white/5">
                  <span className="text-[10px] text-slate-400 mr-1">Önerilen sorular:</span>
                  {[
                    "Şanzıman uzun vadede üzer mi?",
                    "Bu motorun kronik sorunu var mı?",
                    "Yakıt tüketimi gerçek kullanımda nasıl?",
                    "Satın almadan önce neye baktırmalıyım?",
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={sendingChat || (!chatQuota.isUnlimited && chatQuota.remaining <= 0)}
                      onClick={() => handleSendChat(undefined, q)}
                      className="text-[11px] px-2.5 py-1 rounded-xl bg-[#0c182e] hover:bg-[#102242] border border-sky-500/20 text-slate-300 hover:text-white transition flex items-center gap-1 active:scale-95 disabled:opacity-50"
                    >
                      <span className="text-orange-400 text-[9px]">●</span>
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quota Exhausted Warning */}
            {!chatQuota.loading && !chatQuota.isUnlimited && chatQuota.remaining <= 0 && (
              <div className="mb-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-amber-200">
                <span>Mesaj hakkınız tükendi. Lütfen ek paket satın alın.</span>
                <a
                  href="/pricing"
                  className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition whitespace-nowrap text-xs"
                >
                  Paketleri İncele
                </a>
              </div>
            )}

            {/* Error Message */}
            {chatError && (
              <div className="mb-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-2.5 rounded-2xl font-medium flex items-center justify-between">
                <span>⚠️ {chatError}</span>
                <button
                  type="button"
                  onClick={() => setChatError("")}
                  className="text-red-400 hover:text-red-300 text-xs underline ml-2"
                >
                  Kapat
                </button>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSendChat} className="flex flex-row items-center gap-2.5">
              <div className="relative flex-1 flex items-center bg-[#060e1d]/90 border border-slate-700/60 focus-within:border-sky-500/50 rounded-2xl px-3.5 py-2.5 sm:py-3 transition shadow-inner min-w-0">
                <svg className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  <circle cx="9" cy="10" r="0.8" fill="currentColor"/>
                  <circle cx="12" cy="10" r="0.8" fill="currentColor"/>
                  <circle cx="15" cy="10" r="0.8" fill="currentColor"/>
                </svg>
                <input
                  type="text"
                  value={chatQuestion}
                  disabled={sendingChat || (!chatQuota.isUnlimited && chatQuota.remaining <= 0)}
                  onChange={e => setChatQuestion(e.target.value)}
                  placeholder="Bu araç hakkında sorunuzu yazın..."
                  className="flex-1 bg-transparent border-0 outline-none text-slate-100 text-xs sm:text-sm placeholder:text-slate-500 disabled:opacity-50 min-w-0"
                />
              </div>

              <button
                type="submit"
                disabled={sendingChat || (!chatQuota.isUnlimited && chatQuota.remaining <= 0) || !chatQuestion.trim()}
                className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:to-amber-500 text-white font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 text-xs sm:text-sm tracking-wide"
              >
                {sendingChat ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Soruluyor...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-white rotate-45" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                    <span>Sor</span>
                  </>
                )}
              </button>
            </form>

            {/* Helper Text */}
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 mt-2">
              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <span>Yanıtlar araç raporu verilerine göre hazırlanır.</span>
            </div>
          </div>

          {/* İŞİ CEPTE ÖNERİYOR */}
          <SafeSection title="İş Cepte Önerileri">
            <IsiCepteListingRecommendationWidget
              vehicleBrand={vehicle?.brand || "Bu Araç"}
              className="w-full max-w-[320px] mx-auto lg:mx-0"
            />
          </SafeSection>

          {/* BU ARACIN İLANLARI */}
          <SafeSection title="Bu Aracın İlanları">
            <VehicleExactListingsWidget
              variantId={variantId}
              className="w-full max-w-[320px] mx-auto lg:mx-0"
            />
          </SafeSection>
        </div>

        </div>
      )}

      </div>

      {/* SAĞ GOOGLE ADS REKLAM KOLONU (1280px ve üzeri ekranlarda temiz boşluk olarak kalır) */}
      <div className="hidden xl:block w-[160px] min-[1600px]:w-[200px] min-[1920px]:w-[280px] shrink-0 static h-[600px]" />

    </div>
  );
}
