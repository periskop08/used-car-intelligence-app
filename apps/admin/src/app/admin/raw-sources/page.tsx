'use client';

import React, { useEffect, useState } from 'react';

export default function RawSourcesPage() {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New source form state
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [sourceKind, setSourceKind] = useState('UNKNOWN');
  const [variantId, setVariantId] = useState('');
  const [language, setLanguage] = useState('tr');
  const [country, setCountry] = useState('TR');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchSources = () => {
    setLoading(true);
    fetch(`${API_URL}/admin-approvals/raw-sources`)
      .then((res) => {
        if (!res.ok) throw new Error('Yükleme hatası.');
        return res.json();
      })
      .then((data) => {
        setSources(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleCreateSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      alert('URL girmek zorunludur.');
      return;
    }

    setSubmitting(true);
    fetch(`${API_URL}/admin-approvals/raw-sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        title,
        rawText,
        sourceKind,
        vehicleVariantId: variantId || null,
        languageCode: language,
        countryCode: country,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Kaynak oluşturulamadı.');
        return res.json();
      })
      .then(() => {
        setSubmitting(false);
        alert('Manuel kaynak başarıyla oluşturuldu.');
        // Reset form
        setUrl('');
        setTitle('');
        setRawText('');
        setVariantId('');
        fetchSources();
      })
      .catch((err) => {
        setSubmitting(false);
        alert('Hata: ' + err.message);
      });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-200">RAW SOURCES</h1>
        <p className="text-sm text-slate-400 mt-1">Sistemdeki ham veri kaynaklarını yönetin ve manuel olarak yeni kaynaklar girin.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Manual source insert form */}
        <div className="border border-slate-800 bg-slate-950/20 p-6 rounded-2xl flex flex-col gap-4">
          <h2 className="text-lg font-bold text-slate-200">Manuel Güvenilir Kaynak Ekle</h2>
          <form onSubmit={handleCreateSource} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Kaynak URL'i</label>
              <input
                type="text"
                placeholder="https://example.com/source"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-200"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Başlık</label>
              <input
                type="text"
                placeholder="Örn. VW Golf Geri Çağırma Kampanyası"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-200"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Kaynak Özeti / Paragrafı</label>
              <textarea
                placeholder="Telif haklarına uygun kısa alıntı / özet giriniz..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 h-24 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Tür</label>
                <select
                  value={sourceKind}
                  onChange={(e) => setSourceKind(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-200"
                >
                  <option value="UNKNOWN">UNKNOWN</option>
                  <option value="OFFICIAL_RECALL">OFFICIAL RECALL</option>
                  <option value="MANUFACTURER">MANUFACTURER</option>
                  <option value="SERVICE_NOTE">SERVICE NOTE</option>
                  <option value="FORUM">FORUM</option>
                  <option value="COMPLAINT_PLATFORM">COMPLAINT PLATFORM</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Araç Varyant ID</label>
                <input
                  type="text"
                  placeholder="Opsiyonel Varyant ID"
                  value={variantId}
                  onChange={(e) => setVariantId(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-200"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Dil</label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 font-mono"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Ülke</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 font-mono"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold p-2.5 rounded-lg transition text-sm mt-2"
            >
              Kaynak Ekle (PENDING)
            </button>
          </form>
        </div>

        {/* Source List */}
        <div className="lg:col-span-2 border border-slate-800 bg-slate-950/10 p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-slate-200 mb-4">Sistemdeki Tüm Kaynaklar</h2>
          {loading ? (
            <p className="text-sm text-slate-400">Yükleniyor...</p>
          ) : error ? (
            <p className="text-sm text-red-500">Hata: {error}</p>
          ) : sources.length === 0 ? (
            <p className="text-sm text-slate-500">Hiç kaynak bulunamadı.</p>
          ) : (
            <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2">
              {sources.map((src) => (
                <div key={src.id} className="border border-slate-800/80 p-4 rounded-xl flex flex-col gap-1.5 bg-slate-900/5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">{src.title || 'Başlıksız Kaynak'}</h3>
                      <span className="text-[10px] text-slate-500 font-mono uppercase">{src.sourceKind}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        src.status === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : src.status === 'PENDING'
                          ? 'bg-orange-500/10 text-orange-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {src.status}
                    </span>
                  </div>
                  <a href={src.url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline break-all">
                    {src.url}
                  </a>
                  <p className="text-xs text-slate-400 font-mono bg-slate-900/30 p-2 rounded mt-1">{src.extractedSummary}</p>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                    <div>Dil/Pazar: <span className="text-slate-400 font-mono uppercase">{src.languageCode}/{src.countryCode}</span></div>
                    <div>Güven: <span className="text-slate-400">{src.confidenceScore}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
