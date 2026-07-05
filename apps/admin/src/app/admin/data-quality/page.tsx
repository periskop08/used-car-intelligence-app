'use client';

import React, { useEffect, useState } from 'react';

export default function DataQualityPage() {
  const [data, setData] = useState<any>({
    problems: [],
    recalls: [],
    questions: [],
    checklists: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('problems');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchItems = () => {
    setLoading(true);
    fetch(`${API_URL}/admin-approvals/data-quality`)
      .then((res) => {
        if (!res.ok) throw new Error('Yükleme hatası.');
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
    fetchItems();
  }, []);

  const handleAction = (entityType: string, id: string, action: 'APPROVED' | 'PENDING' | 'REJECTED' | 'ARCHIVED') => {
    let reason = '';
    if (action === 'REJECTED' || action === 'ARCHIVED') {
      const input = prompt('Değişiklik gerekçesini giriniz:');
      if (input === null) return; // cancelled
      reason = input || 'Belirtilmedi';
    }

    fetch(`${API_URL}/admin-approvals/${entityType}/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: action,
        rejectedReason: reason,
        adminUserId: 'admin-demo-id',
      }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((err) => { throw new Error(err.message); });
        return res.json();
      })
      .then(() => {
        alert(`Kayıt başarıyla ${action} statüsüne geçirildi.`);
        fetchItems();
      })
      .catch((err) => {
        alert('İşlem başarısız: ' + err.message);
      });
  };

  const getFilteredItems = (tab: string) => {
    const items = data[tab] || [];
    if (statusFilter === 'ALL') return items;
    return items.filter((item: any) => item.status === statusFilter);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'PENDING': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'REJECTED': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'ARCHIVED': return 'bg-slate-800 text-slate-400 border border-slate-700';
      default: return 'bg-slate-800 text-slate-300';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-200">DATA QUALITY MONITOR</h1>
          <p className="text-sm text-slate-400 mt-1">Sistem tarafından otomatik yayınlanan (APPROVED) veya kanıt bekleyen (PENDING) verileri denetleyin.</p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 bg-slate-950/40 p-1.5 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-slate-500 px-2">DURUM:</span>
          {['ALL', 'APPROVED', 'PENDING', 'REJECTED', 'ARCHIVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                statusFilter === st
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2 border-b border-slate-800 pb-px">
        {[
          { key: 'problems', label: '⚠️ Kronik Sorunlar' },
          { key: 'recalls', label: '📢 Geri Çağırmalar' },
          { key: 'questions', label: '💬 Satıcı Soruları' },
          { key: 'checklists', label: '🔧 Kontrol Noktaları' },
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
            {tab.label} <span className="ml-1 text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{getFilteredItems(tab.key).length}</span>
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
              {getFilteredItems('problems').length === 0 ? (
                <p className="text-sm text-slate-500">Gösterilecek kayıt bulunamadı.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {getFilteredItems('problems').map((item: any) => (
                    <div key={item.id} className="border border-slate-800 p-4 rounded-xl flex flex-col gap-2 bg-slate-900/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-orange-500 font-bold uppercase">
                              {item.variant?.brand?.name} {item.variant?.model?.name} ({item.variant?.year})
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                              {item.problemType}
                            </span>
                          </div>
                          <h3 className="text-md font-bold text-slate-200 mt-1">{item.title}</h3>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction('common-problem', item.id, 'APPROVED')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Yayınla (APPROVED)
                          </button>
                          <button
                            onClick={() => handleAction('common-problem', item.id, 'ARCHIVED')}
                            className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Arşivle
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400">{item.description}</p>

                      {/* Decission Metadata Panel */}
                      <div className="border border-slate-800/40 bg-slate-950/20 p-3 rounded-lg text-xs flex flex-col gap-1 mt-2">
                        <div className="font-bold text-slate-400">Karar & Kanıt Gerekçeleri:</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-500 font-mono">
                          <div>Yayıncı: <span className="text-slate-300">{item.metadata?.publishedBy || 'SYSTEM'}</span></div>
                          <div>Karar Sebebi: <span className="text-slate-300">{item.metadata?.publishedReason || 'N/A'}</span></div>
                          <div>Benzersiz Domain: <span className="text-slate-300">{item.metadata?.uniqueDomainCount || 0}</span></div>
                          <div>Güven Skoru: <span className="text-slate-300">{item.dataConfidence}</span></div>
                        </div>
                        {item.metadata?.warningMsg && (
                          <div className="text-amber-500/80 mt-1">⚠️ Uyarı Kartı Metni: {item.metadata.warningMsg}</div>
                        )}
                        {item.metadata?.adminOverride && (
                          <div className="text-sky-400/80 mt-1">🔧 Admin Tarafından Düzenlendi ({item.metadata.overrideReason})</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'recalls' && (
            <div className="flex flex-col gap-4">
              {getFilteredItems('recalls').length === 0 ? (
                <p className="text-sm text-slate-500">Gösterilecek kayıt bulunamadı.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {getFilteredItems('recalls').map((item: any) => (
                    <div key={item.id} className="border border-slate-800 p-4 rounded-xl flex flex-col gap-2 bg-slate-900/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-orange-500 font-bold uppercase">
                              {item.variant?.brand?.name} {item.variant?.model?.name} ({item.variant?.year})
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          </div>
                          <h3 className="text-md font-bold text-slate-200 mt-1">{item.title}</h3>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction('recall', item.id, 'APPROVED')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Yayınla (APPROVED)
                          </button>
                          <button
                            onClick={() => handleAction('recall', item.id, 'ARCHIVED')}
                            className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Arşivle
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400">{item.description}</p>
                      
                      <div className="border border-slate-800/40 bg-slate-950/20 p-3 rounded-lg text-xs flex flex-col gap-1 mt-2">
                        <div className="font-bold text-slate-400">Karar & Kanıt Gerekçeleri:</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-500 font-mono">
                          <div>Yayıncı: <span className="text-slate-300">{item.metadata?.publishedBy || 'SYSTEM'}</span></div>
                          <div>Karar Sebebi: <span className="text-slate-300">{item.metadata?.publishedReason || 'N/A'}</span></div>
                          <div>Güven Skoru: <span className="text-slate-300">{item.dataConfidence}</span></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="flex flex-col gap-4">
              {getFilteredItems('questions').length === 0 ? (
                <p className="text-sm text-slate-500">Gösterilecek kayıt bulunamadı.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {getFilteredItems('questions').map((item: any) => (
                    <div key={item.id} className="border border-slate-800 p-4 rounded-xl flex flex-col gap-2 bg-slate-900/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-orange-500 font-bold uppercase">{item.variant?.brand?.name} {item.variant?.model?.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          </div>
                          <h3 className="text-md font-bold text-slate-200 mt-1">Soru: {item.question}</h3>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction('seller-question', item.id, 'APPROVED')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Yayınla
                          </button>
                          <button
                            onClick={() => handleAction('seller-question', item.id, 'ARCHIVED')}
                            className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Arşivle
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400">Gerekçe: {item.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'checklists' && (
            <div className="flex flex-col gap-4">
              {getFilteredItems('checklists').length === 0 ? (
                <p className="text-sm text-slate-500">Gösterilecek kayıt bulunamadı.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {getFilteredItems('checklists').map((item: any) => (
                    <div key={item.id} className="border border-slate-800 p-4 rounded-xl flex flex-col gap-2 bg-slate-900/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-orange-500 font-bold uppercase">{item.variant?.brand?.name} {item.variant?.model?.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          </div>
                          <h3 className="text-md font-bold text-slate-200 mt-1">{item.title}</h3>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction('inspection-checklist', item.id, 'APPROVED')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Yayınla
                          </button>
                          <button
                            onClick={() => handleAction('inspection-checklist', item.id, 'ARCHIVED')}
                            className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Arşivle
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400">{item.description}</p>
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
