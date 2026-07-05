'use client';

import React, { useEffect, useState } from 'react';

export default function ApprovalsPage() {
  const [data, setData] = useState<any>({
    problems: [],
    recalls: [],
    questions: [],
    checklists: [],
    rawSources: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('problems');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchPending = () => {
    setLoading(true);
    fetch(`${API_URL}/admin-approvals/pending`)
      .then((res) => {
        if (!res.ok) throw new Error('Hatalı yanıt alındı.');
        return res.json();
      })
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = (entityType: string, id: string, action: 'APPROVED' | 'REJECTED') => {
    let reason = '';
    if (action === 'REJECTED') {
      const input = prompt('Reddetme gerekçesini giriniz:');
      if (input === null) return; // cancelled
      reason = input || 'Belirtilmedi';
    }

    fetch(`${API_URL}/admin-approvals/${entityType}/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: action,
        rejectedReason: reason,
        adminUserId: 'admin-demo-id', // Simulated fallback
      }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((err) => { throw new Error(err.message); });
        return res.json();
      })
      .then(() => {
        alert(`Kayıt başarıyla ${action === 'APPROVED' ? 'onaylandı' : 'reddedildi'}.`);
        fetchPending();
      })
      .catch((err) => {
        alert('İşlem başarısız: ' + err.message);
      });
  };

  const getItemsCount = (tab: string) => {
    return data[tab]?.length || 0;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-200">APPROVAL CENTER</h1>
        <p className="text-sm text-slate-400 mt-1">Yapay zeka tarafından toplanan ve onay bekleyen içerikleri inceleyin.</p>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2 border-b border-slate-800 pb-px">
        {[
          { key: 'problems', label: '⚠️ Kronik Sorunlar' },
          { key: 'recalls', label: '📢 Geri Çağırmalar' },
          { key: 'questions', label: '💬 Satıcı Soruları' },
          { key: 'checklists', label: '🔧 Kontrol Noktaları' },
          { key: 'rawSources', label: '🌐 Ham Kaynaklar' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition -mb-px rounded-t-lg ${
              activeTab === tab.key
                ? 'border-orange-500 text-orange-500 bg-orange-950/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label} <span className="ml-1 text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{getItemsCount(tab.key)}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Yükleniyor...</p>
      ) : error ? (
        <p className="text-sm text-red-500">Hata: {error}</p>
      ) : (
        <div className="border border-slate-800 bg-slate-950/10 p-6 rounded-2xl">
          {/* Active Tab View */}
          {activeTab === 'problems' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-slate-200">Onay Bekleyen Kronik Sorunlar</h2>
              {data.problems.length === 0 ? (
                <p className="text-sm text-slate-500">Onay bekleyen kronik sorun kaydı yok.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {data.problems.map((item: any) => (
                    <div key={item.id} className="border border-slate-800 p-4 rounded-xl flex flex-col gap-2 bg-slate-900/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs text-orange-500 font-bold uppercase">{item.variant?.brand?.name} {item.variant?.model?.name} ({item.variant?.year})</span>
                          <h3 className="text-md font-bold text-slate-200 mt-1">{item.title}</h3>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction('common-problem', item.id, 'APPROVED')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Onayla
                          </button>
                          <button
                            onClick={() => handleAction('common-problem', item.id, 'REJECTED')}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Reddet
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400">{item.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-500 mt-2">
                        <div>Etkilenen Yıllar: <span className="text-slate-400 font-mono">{item.affectedYears}</span></div>
                        <div>Motor/Şanzıman: <span className="text-slate-400 font-mono">{item.affectedEngine} / {item.affectedTransmission}</span></div>
                        <div>Belirtiler: <span className="text-slate-400">{item.symptoms}</span></div>
                        <div>Risk: <span className="text-orange-400 font-bold">{item.riskLevel}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'recalls' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-slate-200">Onay Bekleyen Geri Çağırma Kayıtları (Recalls)</h2>
              {data.recalls.length === 0 ? (
                <p className="text-sm text-slate-500">Onay bekleyen geri çağırma kaydı yok.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {data.recalls.map((item: any) => (
                    <div key={item.id} className="border border-slate-800 p-4 rounded-xl flex flex-col gap-2 bg-slate-900/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs text-orange-500 font-bold uppercase">{item.variant?.brand?.name} {item.variant?.model?.name} ({item.variant?.year})</span>
                          <h3 className="text-md font-bold text-slate-200 mt-1">{item.title}</h3>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction('recall', item.id, 'APPROVED')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Onayla
                          </button>
                          <button
                            onClick={() => handleAction('recall', item.id, 'REJECTED')}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Reddet
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400">{item.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-500 mt-2">
                        <div>Kampanya No: <span className="text-slate-400 font-mono">{item.manufacturerCampaignNumber || 'Bilinmiyor'}</span></div>
                        <div>Safety Risk: <span className="text-red-400 font-bold">{item.safetyRisk || 'Bilinmiyor'}</span></div>
                        <div>Remedy: <span className="text-slate-400">{item.remedy || 'Bilinmiyor'}</span></div>
                        <div>VIN Check Gerekli: <span className="text-slate-400">{item.vinCheckRequired ? 'Evet' : 'Hayır'}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-slate-200">Onay Bekleyen Satıcı Soruları</h2>
              {data.questions.length === 0 ? (
                <p className="text-sm text-slate-500">Onay bekleyen soru kaydı yok.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {data.questions.map((item: any) => (
                    <div key={item.id} className="border border-slate-800 p-4 rounded-xl flex flex-col gap-2 bg-slate-900/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs text-orange-500 font-bold uppercase">{item.variant?.brand?.name} {item.variant?.model?.name}</span>
                          <h3 className="text-md font-bold text-slate-200 mt-1">Soru: {item.question}</h3>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction('seller-question', item.id, 'APPROVED')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Onayla
                          </button>
                          <button
                            onClick={() => handleAction('seller-question', item.id, 'REJECTED')}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Reddet
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400">Gerekçe: {item.reason}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 mt-2">
                        <div>Kategori: <span className="text-slate-400 font-bold">{item.category}</span></div>
                        <div>Öncelik: <span className="text-orange-400 font-bold">{item.priority}</span></div>
                        <div>Risk: <span className="text-slate-400">{item.riskLevel}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'checklists' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-slate-200">Onay Bekleyen Kontrol Noktaları</h2>
              {data.checklists.length === 0 ? (
                <p className="text-sm text-slate-500">Onay bekleyen kontrol noktası yok.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {data.checklists.map((item: any) => (
                    <div key={item.id} className="border border-slate-800 p-4 rounded-xl flex flex-col gap-2 bg-slate-900/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs text-orange-500 font-bold uppercase">{item.variant?.brand?.name} {item.variant?.model?.name}</span>
                          <h3 className="text-md font-bold text-slate-200 mt-1">{item.title}</h3>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction('inspection-checklist', item.id, 'APPROVED')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Onayla
                          </button>
                          <button
                            onClick={() => handleAction('inspection-checklist', item.id, 'REJECTED')}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Reddet
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400">{item.description}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 mt-2">
                        <div>Kategori: <span className="text-slate-400 font-bold">{item.category}</span></div>
                        <div>Öncelik: <span className="text-orange-400 font-bold">{item.priority}</span></div>
                        <div>Risk: <span className="text-slate-400">{item.riskLevel}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'rawSources' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-slate-200">Onay Bekleyen Ham Kaynaklar</h2>
              {data.rawSources.length === 0 ? (
                <p className="text-sm text-slate-500">Onay bekleyen ham kaynak yok.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {data.rawSources.map((item: any) => (
                    <div key={item.id} className="border border-slate-800 p-4 rounded-xl flex flex-col gap-2 bg-slate-900/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs text-orange-500 font-bold uppercase">{item.variant?.brand?.name} {item.variant?.model?.name}</span>
                          <h3 className="text-md font-bold text-slate-200 mt-1">{item.title || 'Başlıksız Kaynak'}</h3>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction('raw-source', item.id, 'APPROVED')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Onayla
                          </button>
                          <button
                            onClick={() => handleAction('raw-source', item.id, 'REJECTED')}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Reddet
                          </button>
                        </div>
                      </div>
                      <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline break-all">
                        {item.url}
                      </a>
                      <p className="text-sm text-slate-400 font-mono mt-2 bg-slate-900/50 p-2.5 rounded-lg">{item.extractedSummary}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 mt-2">
                        <div>Dil/Pazar: <span className="text-slate-400 font-mono uppercase">{item.languageCode} / {item.countryCode}</span></div>
                        <div>Kaynak Türü: <span className="text-slate-400">{item.sourceKind}</span></div>
                        <div>Güvenilirlik Puanı: <span className="text-slate-400">{item.confidenceScore}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
