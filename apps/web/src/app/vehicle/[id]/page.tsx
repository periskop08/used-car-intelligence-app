"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

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
  const handleGenerateReport = () => {
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
      body: JSON.stringify({ variantId, languageCode: "tr" }),
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
            <h2 className="text-lg font-bold text-slate-200 border-b border-white/5 pb-2">⚠️ Bilinen Kronik Arızalar</h2>
            {vehicle.problems.length > 0 ? (
              <div className="flex flex-col gap-4 mt-2">
                {vehicle.problems.map((p: any) => (
                  <div key={p.id} className="bg-slate-950/20 border border-white/5 p-4 rounded-xl flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 text-sm">{p.title}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                        p.riskLevel === 'HIGH' ? 'bg-red-500/20 text-red-400' : p.riskLevel === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
                      }`}>{p.riskLevel} RİSK</span>
                    </div>
                    <p className="text-xs text-slate-400">{p.description}</p>
                    {p.symptoms && <p className="text-xs text-slate-500 font-medium">🚨 Belirtiler: {p.symptoms}</p>}
                    {p.checkRecommendation && <p className="text-xs text-slate-500 font-medium">🔍 Kontrol Önerisi: {p.checkRecommendation}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Bu araç için onaylanmış bir kronik arıza bulunmamaktadır.</p>
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
                    {vehicle.premiumFeatures.sellerQuestions.map((q: any) => (
                      <div key={q.id} className="bg-slate-900/30 p-3 rounded-xl border border-white/5">
                        <span className="text-xs text-orange-400 font-bold block mb-1">SORU: {q.question}</span>
                        <span className="text-xs text-slate-400 font-semibold block mb-1">Kategori: {q.category} • Risk: {q.riskLevel}</span>
                        <span className="text-xs text-slate-400">Gerekçe: {q.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-300 mb-2">📋 Ekspertiz Kontrol Listesi</h3>
                  <div className="flex flex-col gap-3">
                    {vehicle.premiumFeatures.inspectionChecklist.map((c: any) => (
                      <div key={c.id} className="bg-slate-900/30 p-3 rounded-xl border border-white/5">
                        <span className="text-xs text-slate-200 font-bold block mb-1">{c.sortOrder}. {c.title} ({c.category})</span>
                        <span className="text-xs text-slate-400 block mb-1">Risk Seviyesi: {c.riskLevel}</span>
                        <span className="text-xs text-slate-400">{c.description}</span>
                      </div>
                    ))}
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
                    placeholder="Aracın konforu, yakıt tüketimi, kronik problemleri hakkındaki deneyimlerinizi yazın..."
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
          
          {/* AI Report Card */}
          <div className="glass p-6 rounded-3xl flex flex-col gap-6 shadow-2xl">
            <h2 className="text-lg font-black text-slate-200">🤖 AI Karar Desteği</h2>

            {reportError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl font-semibold">
                ⚠️ {reportError}
              </div>
            )}

            {!aiReport ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
                <p className="text-xs text-slate-400">
                  Bu araç hakkında karar odaklı AI analiz raporu oluşturun. Alınabilirlik yüzdesini ve risk katsayısını öğrenin.
                </p>
                <button
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition text-center text-sm"
                >
                  {generatingReport ? "Rapor Oluşturuluyor..." : "AI Raporu Oluştur"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Scores */}
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                    <span className="text-[10px] text-emerald-500 font-bold block">ALINABİLİRLİK</span>
                    <span className="text-3xl font-black text-emerald-400">%{aiReport.buyabilityScore}</span>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
                    <span className="text-[10px] text-red-500 font-bold block">RİSK KATSAYISI</span>
                    <span className="text-3xl font-black text-red-400">%{aiReport.riskScore}</span>
                  </div>
                </div>

                {/* Decision Badge */}
                <div className="bg-slate-900/60 p-4 rounded-xl flex items-center justify-between border border-white/5">
                  <span className="text-xs text-slate-400 font-bold">FİNAL KARAR:</span>
                  <span className={`text-xs font-black px-2 py-1 rounded font-mono ${
                    aiReport.finalDecision === 'BUY' ? 'bg-emerald-500/25 text-emerald-400' : aiReport.finalDecision === 'BUY_CAREFULLY' ? 'bg-blue-500/25 text-blue-400' : 'bg-red-500/25 text-red-400'
                  }`}>{aiReport.finalDecision}</span>
                </div>

                {/* AI Text Summary */}
                <div className="flex flex-col gap-2 mt-2">
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Yapay Zeka Yorumu</h3>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/20 p-3 rounded-xl border border-white/5">
                    {aiReport.summary.summary}
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed font-semibold italic mt-1">
                    💡 Tavsiye: {aiReport.summary.shouldBuyComment}
                  </p>
                </div>

                {/* Regenerate Action */}
                <button
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="w-full bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-white font-bold py-2.5 rounded-xl transition text-center text-xs mt-4"
                >
                  {generatingReport ? "Yenileniyor..." : "Raporu Yenile"}
                </button>
              </div>
            )}
          </div>

          {/* AI Chat Box (Custom Question Box) */}
          <div className="glass p-6 rounded-3xl flex flex-col gap-4 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-200">💬 Yapay Zekaya Soru Sor</h2>
            
            {/* Messages Listing */}
            <div className="max-h-60 overflow-y-auto flex flex-col gap-3 py-2">
              {chatMessages.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Bu araç hakkında merak ettiğiniz bir şeyi sorun (Örn: DSG sorun çıkarır mı?).</p>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className={`p-3 rounded-2xl max-w-[85%] text-xs ${
                    msg.sender === 'user'
                      ? 'bg-orange-600/10 border border-orange-500/20 self-end text-slate-200'
                      : 'bg-slate-900 border border-white/5 self-start text-slate-300'
                  }`}>
                    {msg.text}
                  </div>
                ))
              )}
              {sendingChat && (
                <span className="text-[10px] text-slate-500 italic animate-pulse">Yapay zeka yanıt yazıyor...</span>
              )}
            </div>

            {chatError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-2 rounded-xl font-semibold">
                ⚠️ {chatError}
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                required
                value={chatQuestion}
                onChange={e => setChatQuestion(e.target.value)}
                placeholder="Şanzıman sağlam mı?..."
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
              />
              <button
                type="submit"
                disabled={sendingChat || !chatQuestion.trim()}
                className="bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs"
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
