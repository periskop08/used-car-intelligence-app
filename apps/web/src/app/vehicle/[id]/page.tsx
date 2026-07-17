"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

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
  const [countdown, setCountdown] = useState<number | null>(null);
  
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

  const chatEndRef = useRef<HTMLDivElement>(null);

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
  const fetchVehicleDetails = () => {
    const token = localStorage.getItem("accessToken");
    const headers: any = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    fetch(`${API_URL}/vehicles/variants/${variantId}`, { headers })
      .then(res => {
        if (!res.ok) throw new Error("Araç detayları yüklenemedi.");
        return res.json();
      })
      .then(data => {
        setVehicle(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // If logged in, check if this vehicle is favorited
    if (token) {
      fetch(`${API_URL}/favorites`, { headers })
        .then(res => res.json())
        .then(favs => {
          if (Array.isArray(favs)) {
            const exists = favs.some((f: any) => f.variantId === variantId);
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
    fetchVehicleDetails();
  }, [variantId]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      handleGenerateReport(true);
      return;
    }
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

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
        if (data.finalDecision === 'INSUFFICIENT_DATA' && countdown === null) {
          setCountdown(30);
        }
      })
      .catch(err => {
        setReportError(err.message);
        setGeneratingReport(false);
      });
  };

  // Custom AI Chat Question
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuestion.trim()) return;

    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }

    const questionText = chatQuestion;
    setChatQuestion("");
    setSendingChat(true);
    setChatError("");

    // Append user message immediately
    setChatMessages(prev => [...prev, { sender: "user", text: questionText }]);

    fetch(`${API_URL}/reports/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ variantId, question: questionText }),
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
        fetchVehicleDetails();
      })
      .catch(err => {
        setReviewError(Array.isArray(err.message) ? err.message[0] : err.message);
        setSubmittingReview(false);
      });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="text-slate-400 font-bold text-lg animate-pulse">Araç verileri yükleniyor...</div>
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
    <div className="max-w-6xl w-full mx-auto px-6 py-12 flex flex-col gap-10">
      
      {/* Title Header & Favorite Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
            {vehicle.country} Spesifikasyonları
          </span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mt-3">
            {vehicle.brand} {vehicle.model} ({vehicle.year})
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            {vehicle.generation} • {vehicle.bodyType} • {vehicle.engine} • {vehicle.transmission} • {vehicle.trim}
          </p>
        </div>

        {/* Favorite Button */}
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleToggleFavorite}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm border transition ${
              isFavorited
                ? "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20"
                : "bg-slate-900 border-white/10 text-slate-300 hover:bg-white/5"
            }`}
          >
            ❤️ {isFavorited ? "Favorilerden Çıkar" : "Favorilere Ekle"}
          </button>
          {favoriteError && (
            <span className="text-[10px] text-red-400 font-bold max-w-[200px] text-right mt-1">{favoriteError}</span>
          )}
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Specs, Problems & Reviews Column */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* AI Report Card (Google AI Overview Style) */}
          <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-slate-900/40 border border-orange-500/20 p-6 rounded-3xl flex flex-col gap-5 shadow-orange-500/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500 via-amber-500 to-transparent"></div>
            
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider">Yapay Zeka Genel Değerlendirmesi</h2>
              </div>
              <span className="text-[9px] bg-orange-600/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                Google AI Overview Modu
              </span>
            </div>

            {reportError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl font-semibold">
                ⚠️ {reportError}
              </div>
            )}

            {!aiReport ? (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-4">
                <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                  Bu araç hakkında karar odaklı, avantajları, dezavantajları ve sık karşılaşılan durumları taranmış yapay zeka analiz raporunu derleyin.
                </p>
                <button
                  onClick={() => handleGenerateReport(false)}
                  disabled={generatingReport}
                  className="bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition text-center text-sm"
                >
                  {generatingReport ? "Rapor Oluşturuluyor..." : "AI Raporu Oluştur"}
                </button>
              </div>
            ) : countdown !== null ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-5">
                <div className="relative flex items-center justify-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500"></div>
                  <div className="absolute text-lg font-black text-orange-500">{countdown}</div>
                </div>
                <div className="flex flex-col gap-2 max-w-md">
                  <h3 className="text-sm font-bold text-slate-200 animate-pulse">Yapay Zeka Analizi Hazırlanıyor...</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Bu araç varyantı platformda ilk defa analiz ediliyor. Web taraması, kronik hata arşivleri ve geri çağırma listeleri taranıyor. Lütfen bekleyin, raporunuz hazırlanıyor...
                  </p>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 dark:bg-slate-800 max-w-xs overflow-hidden">
                  <div 
                    className="bg-orange-600 h-1.5 rounded-full transition-all duration-1000 ease-linear" 
                    style={{ width: `${((30 - countdown) / 30) * 100}%` }}
                  ></div>
                </div>
              </div>
            ) : aiReport.finalDecision === 'INSUFFICIENT_DATA' ? (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-4">
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl max-w-md">
                  <span className="text-2xl mb-2 block">⚠️</span>
                  <span className="text-xs font-bold text-amber-400 block mb-1">Analiz Tamamlanamadı</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Yapay zekamız web taramalarını tamamladı ancak bu araç varyantına dair yeterli miktarda doğrulanmış kronik hata veya servis kaydı bulamadı. Tekrar denemek için güncelleyebilirsiniz.
                  </p>
                </div>
                <button
                  onClick={() => handleGenerateReport(true)}
                  disabled={generatingReport}
                  className="bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-white font-bold py-2.5 px-5 rounded-xl transition text-center text-xs"
                >
                  {generatingReport ? "Yenileniyor..." : "Yeniden Analiz Et"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {/* Trim Package Compatibility Warning */}
                {aiReport.summary.trimWarning && (
                  <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-start gap-3">
                    <span className="text-xl">⚠️</span>
                    <div className="flex-1">
                      <span className="font-bold text-amber-400 block mb-1 text-xs">Donanım Paketi Uyumsuzluğu Uyarısı:</span>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {aiReport.summary.trimWarning}
                      </p>
                    </div>
                  </div>
                )}

                {/* Score indicators */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-center">
                    <span className="text-[10px] text-emerald-500 font-bold block mb-0.5">ALINABİLİRLİK</span>
                    <span className="text-2xl font-black text-emerald-400">
                      {aiReport.finalDecision === 'INSUFFICIENT_DATA' ? 'N/A' : `%${aiReport.buyabilityScore}`}
                    </span>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-center">
                    <span className="text-[10px] text-red-500 font-bold block mb-0.5">RİSK KATSAYISI</span>
                    <span className="text-2xl font-black text-red-400">
                      {aiReport.finalDecision === 'INSUFFICIENT_DATA' ? 'N/A' : `%${aiReport.riskScore}`}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 border border-white/5 p-4 rounded-2xl text-center flex flex-col justify-center h-full">
                    <span className="text-[10px] text-slate-400 font-bold block mb-0.5">FİNAL KARAR</span>
                    <span className={`text-xs font-black px-2 py-1 rounded font-mono border ${
                      aiReport.finalDecision === 'BUY' 
                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                        : aiReport.finalDecision === 'BUY_CAREFULLY' 
                        ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' 
                        : aiReport.finalDecision === 'RISKY' 
                        ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' 
                        : aiReport.finalDecision === 'AVOID' 
                        ? 'bg-red-500/20 border-red-500/30 text-red-400' 
                        : 'bg-slate-800 border-white/10 text-slate-400'
                    }`}>
                      {aiReport.finalDecision === 'BUY' 
                        ? 'ALINIR' 
                        : aiReport.finalDecision === 'BUY_CAREFULLY' 
                        ? 'KONTROLLÜ ALINIR' 
                        : aiReport.finalDecision === 'RISKY' 
                        ? 'RİSKLİ' 
                        : aiReport.finalDecision === 'AVOID' 
                        ? 'ÖNERİLMEZ' 
                        : 'VERİ YETERSİZ'}
                    </span>
                  </div>
                </div>

                {/* Score Explanations Legend */}
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 text-[11px] text-slate-400 leading-relaxed">
                  <span className="font-bold text-slate-300 block mb-1">💡 Skorlar Nasıl Yorumlanmalı?</span>
                  <p className="mb-1">
                    Yapay zekamız, bu araca ait onaylanmış durum sıklığı, yedek parça maliyetleri ve servis bültenlerine dayanarak iki ana kriter hesaplar:
                  </p>
                  <ul className="list-disc pl-4 flex flex-col gap-1 mt-1 text-[10px]">
                    <li><strong>Alınabilirlik Oranı:</strong> Aracın genel sorunsuzluk seviyesi ve piyasadaki tercih edilebilirlik tavsiyesidir. Yüksek olması iyidir.</li>
                    <li><strong>Risk Katsayısı:</strong> Aracın size uzun vadede açabileceği ağır arıza olasılığını ve maliyet risklerini temsil eder. Düşük olması iyidir.</li>
                  </ul>
                </div>

                {/* Structured Markdown comments */}
                <div className="flex flex-col gap-4 text-xs text-slate-300">
                  <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 flex flex-col gap-3">
                    {renderMarkdown(aiReport.summary.summary)}
                  </div>
                  
                  {aiReport.summary.shouldBuyComment && (
                    <div className="bg-orange-500/[0.03] border border-orange-500/10 p-4 rounded-2xl flex items-start gap-3">
                      <span className="text-lg">💡</span>
                      <div className="flex-1">
                        <span className="font-bold text-orange-400 block mb-1">Satın Alma Tavsiyesi ve Karar Gerekçesi:</span>
                        {renderMarkdown(aiReport.summary.shouldBuyComment)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Regenerate Action */}
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => handleGenerateReport(true)}
                    disabled={generatingReport}
                    className="bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl transition text-center text-xs"
                  >
                    {generatingReport ? "Yenileniyor..." : "Analizi Güncelle"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tech Specs */}
          <div className="glass p-6 rounded-2xl flex flex-col gap-4">
            <h2 className="text-lg font-bold text-slate-200 border-b border-white/5 pb-2">📋 Teknik Özellikler</h2>
            {vehicle.specs ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-2">
                <div className="bg-slate-900/40 p-3 rounded-xl">
                  <span className="text-xs text-slate-500 block">Maksimum Hız</span>
                  <span className="font-bold text-slate-200">{vehicle.specs.topSpeed} km/h</span>
                </div>
                <div className="bg-slate-900/40 p-3 rounded-xl">
                  <span className="text-xs text-slate-500 block">0-100 Hızlanma</span>
                  <span className="font-bold text-slate-200">{vehicle.specs.acceleration0to100} sn</span>
                </div>
                <div className="bg-slate-900/40 p-3 rounded-xl">
                  <span className="text-xs text-slate-500 block">Ort. Yakıt Tüketimi</span>
                  <span className="font-bold text-slate-200">{vehicle.specs.averageFuelConsumption} lt/100km</span>
                </div>
                <div className="bg-slate-900/40 p-3 rounded-xl">
                  <span className="text-xs text-slate-500 block">Bagaj Hacmi</span>
                  <span className="font-bold text-slate-200">{vehicle.specs.luggageCapacity} lt</span>
                </div>
                <div className="bg-slate-900/40 p-3 rounded-xl">
                  <span className="text-xs text-slate-500 block">Ağırlık</span>
                  <span className="font-bold text-slate-200">{vehicle.specs.weight} kg</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Teknik özellik verisi girilmemiş.</p>
            )}
          </div>

          {/* Chronic Problems */}
          <div className="glass p-6 rounded-2xl flex flex-col gap-4">
            <h2 className="text-lg font-bold text-slate-200 border-b border-white/5 pb-2">⚠️ Sık Karşılaşılan Durumlar</h2>
            {vehicle.problems.length > 0 ? (
              <div className="flex flex-col gap-4 mt-2">
                {/* Reassurance Banner */}
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                  <span className="text-xl">ℹ️</span>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-blue-400">Bilgilendirme</span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Bu bölümde ilgili motor, şanzıman, yıl, kasa tipi ve donanım kombinasyonunda kullanıcıların daha sık dile getirdiği veya satın alma öncesi kontrol edilmesi önerilen durumlar yer alır. <strong>Bu durumlar her araçta mutlaka görülecek anlamına gelmez ve tek başına araçtan vazgeçme sebebi olmamalıdır.</strong> Sağlıklı bir satın alma kararı için satıcıya aşağıdaki soruları sormanız ve ekspertiz muayenesinde checklist adımlarını özellikle inceletmeniz tavsiye edilir.
                    </p>
                  </div>
                </div>

                {vehicle.problems.map((p: any) => {
                  const isComplaint = p.problemType === 'USER_COMPLAINT';
                  return (
                    <div key={p.id} className={`bg-slate-950/20 border p-4 rounded-xl flex flex-col gap-2 ${
                      isComplaint ? 'border-amber-500/20 bg-amber-500/[0.02]' : 'border-white/5'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-200 text-sm">{p.title}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                            isComplaint ? 'bg-amber-600/20 text-amber-400' : 'bg-orange-600/20 text-orange-400'
                          }`}>
                            {isComplaint ? 'Kullanıcı Şikayeti' : 'Sık Karşılaşılan Durum'}
                          </span>
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                            Güven: {p.dataConfidence}
                          </span>
                          {p.sourceCount > 0 && (
                            <span className="text-[9px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded font-bold">
                              🔍 {p.sourceCount} Farklı Kaynaktan Analiz
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                          p.riskLevel === 'HIGH' ? 'bg-red-500/20 text-red-400' : p.riskLevel === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
                        }`}>{p.riskLevel} RİSK</span>
                      </div>
                      <p className="text-xs text-slate-400">{p.description}</p>
                      {p.symptoms && <p className="text-xs text-slate-500 font-medium">🚨 Belirtiler: {p.symptoms}</p>}
                      {p.checkRecommendation && <p className="text-xs text-slate-500 font-medium">🔍 Kontrol Önerisi: {p.checkRecommendation}</p>}
                      {p.metadata?.warningMsg && (
                        <div className="bg-amber-950/20 border border-amber-900/30 p-2.5 rounded-lg text-[11px] text-amber-400/90 mt-1 flex items-start gap-2">
                          <span>⚠️</span>
                          <span>{p.metadata.warningMsg}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Bu araç için onaylanmış bir durum kaydı bulunmamaktadır.</p>
            )}
          </div>

          {/* Premium Checklist & Seller Questions */}
          <div className="glass p-6 rounded-2xl flex flex-col gap-4">
            <h2 className="text-lg font-bold text-slate-200 border-b border-white/5 pb-2">💡 Premium Checklist & Sorular</h2>
            
            {!vehicle.premiumFeatures.isUnlocked ? (
              <div className="bg-orange-500/5 border border-orange-500/20 p-6 rounded-xl flex flex-col items-center text-center gap-3">
                <span className="text-3xl">🔒</span>
                <h3 className="font-bold text-slate-200">Premium İçerik Kilitli</h3>
                <p className="text-xs text-slate-400 max-w-md">
                  Satıcıya sorulacak detaylı sorular ve ekspertiz öncesi kontrol listesi sadece Standart ve Pro paket sahiplerine açıktır.
                </p>
                <a
                  href="/#packages"
                  className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-4 py-2 rounded-lg mt-2 transition"
                >
                  Paket Satın Al & Kilidi Aç
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-6 mt-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-300 mb-2">💬 Satıcıya Sorulacak Sorular</h3>
                  <div className="flex flex-col gap-3">
                    {vehicle.premiumFeatures.sellerQuestions.map((q: any) => {
                      const catInfo = categoryMap[q.category] || { label: q.category, desc: '' };
                      return (
                        <div key={q.id} className="bg-slate-900/30 p-3.5 rounded-xl border border-white/5 flex flex-col gap-1.5">
                          <span className="text-xs text-orange-400 font-bold block">SORU: {q.question}</span>
                          <div className="flex flex-col gap-1">
                            <span className="text-[11px] text-slate-400 font-semibold block">
                              Kategori: <strong className="text-slate-300">{catInfo.label}</strong> • Risk Seviyesi: <strong className="text-slate-300">{q.riskLevel}</strong>
                            </span>
                            {catInfo.desc && (
                              <span className="text-[10px] text-slate-500 italic block">
                                💡 Nedir: {catInfo.desc}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-300 bg-slate-950/20 p-2 rounded-lg border border-white/5 mt-0.5">Gerekçe: {q.reason}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-300 mb-2">📋 Ekspertiz Kontrol Listesi</h3>
                  <div className="flex flex-col gap-3">
                    {vehicle.premiumFeatures.inspectionChecklist.map((c: any) => {
                      const catInfo = categoryMap[c.category] || { label: c.category, desc: '' };
                      return (
                        <div key={c.id} className="bg-slate-900/30 p-3.5 rounded-xl border border-white/5 flex flex-col gap-1.5">
                          <span className="text-xs text-slate-200 font-bold block">{c.sortOrder}. {c.title} ({catInfo.label})</span>
                          {catInfo.desc && (
                            <span className="text-[10px] text-slate-500 italic block">
                              💡 Nedir: {catInfo.desc}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 block">Risk Seviyesi: <strong className="text-slate-300">{c.riskLevel}</strong></span>
                          <span className="text-xs text-slate-300 bg-slate-950/20 p-2 rounded-lg border border-white/5 mt-0.5">{c.description}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Reviews List */}
          <div className="glass p-6 rounded-2xl flex flex-col gap-4">
            <h2 className="text-lg font-bold text-slate-200 border-b border-white/5 pb-2">💬 Kullanıcı Yorumları ({vehicle.reviews.length})</h2>
            {vehicle.reviews.length > 0 ? (
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
        </div>

        {/* AI Report & Custom AI Chat Column */}
        <div className="flex flex-col gap-6">

          {/* AI Chat Box (Custom Question Box) */}
          <div className="glass p-6 rounded-3xl flex flex-col gap-4 shadow-2xl border border-white/5 bg-slate-900/40">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <span className="text-xl">💬</span>
              <div className="flex flex-col">
                <h2 className="text-sm font-bold text-slate-200">TorqueScout Yapay Zeka Danışmanı</h2>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Çevrimiçi • Rapor Verilerine Hakim
                </span>
              </div>
            </div>
            
            {/* Messages Listing */}
            <div className="max-h-80 overflow-y-auto flex flex-col gap-4 py-2 pr-1 custom-scrollbar">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                  <span className="text-3xl">🤖</span>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    Merhaba! Ben TorqueScout AI. Bu araçta sık karşılaşılan durumlar, muayene checklisti veya satın alma uygunluğu hakkında bana dilediğiniz soruyu sorabilirsiniz.
                  </p>
                  <span className="text-[10px] text-slate-500 italic">Örn: "Şanzımanı uzun vadede üzer mi?", "Motor performansı nasıldır?"</span>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-2.5 max-w-[85%] ${
                      msg.sender === 'user' ? 'self-end flex-row-reverse' : 'self-start'
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 select-none ${
                      msg.sender === 'user' ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30' : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      {msg.sender === 'user' ? '🧑‍💻' : '🤖'}
                    </div>
                    {/* Bubble */}
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-br from-orange-600/20 to-orange-700/5 border border-orange-500/20 text-slate-200 rounded-tr-none'
                        : 'bg-slate-900 border border-white/5 text-slate-300 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              {sendingChat && (
                <div className="flex gap-2.5 self-start">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 animate-pulse select-none">
                    🤖
                  </div>
                  <div className="p-3 rounded-2xl text-xs bg-slate-900 border border-white/5 text-slate-500 rounded-tl-none flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-75"></span>
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-150"></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {chatError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-2.5 rounded-xl font-semibold">
                ⚠️ {chatError}
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSendChat} className="flex gap-2 border-t border-white/5 pt-3">
              <input
                type="text"
                required
                value={chatQuestion}
                onChange={e => setChatQuestion(e.target.value)}
                placeholder="Bu araca dair aklınıza takılan soruyu yazın..."
                className="flex-1 bg-slate-950/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-orange-500/50 transition"
              />
              <button
                type="submit"
                disabled={sendingChat || !chatQuestion.trim()}
                className="bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition"
              >
                Sor
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
