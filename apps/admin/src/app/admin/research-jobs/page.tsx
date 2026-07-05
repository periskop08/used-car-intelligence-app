'use client';

import React, { useEffect, useState } from 'react';

export default function ResearchJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New job state
  const [variantId, setVariantId] = useState('');
  const [userId, setUserId] = useState('');
  const [language, setLanguage] = useState('tr');
  const [priority, setPriority] = useState('MEDIUM');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchJobs = () => {
    setLoading(true);
    fetch(`${API_URL}/research/jobs`)
      .then((res) => {
        if (!res.ok) throw new Error('Yükleme başarısız.');
        return res.json();
      })
      .then((data) => {
        setJobs(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantId || !userId) {
      alert('Varyant ID ve Kullanıcı ID zorunludur.');
      return;
    }

    setSubmitting(true);
    fetch(`${API_URL}/research/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variantId,
        userId,
        languageCode: language,
        priority,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setSubmitting(false);
        if (data.success) {
          alert('İş başarıyla kuyruğa eklendi. ID: ' + data.jobId);
          fetchJobs();
        } else {
          alert('Hata: ' + data.message);
        }
      })
      .catch((err) => {
        setSubmitting(false);
        alert('İş oluşturulurken hata: ' + err.message);
      });
  };

  const handleProcessNext = () => {
    setSubmitting(true);
    fetch(`${API_URL}/research/process-next`, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        setSubmitting(false);
        if (data.processed) {
          alert('Kuyruktaki bir iş başarıyla işlendi!');
          fetchJobs();
        } else {
          alert('Kuyrukta beklenecek uygun iş bulunamadı veya işleme başarısız oldu.');
        }
      })
      .catch((err) => {
        setSubmitting(false);
        alert('Kuyruk işlenirken hata: ' + err.message);
      });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-200">RESEARCH JOBS</h1>
          <p className="text-sm text-slate-400 mt-1">Araç araştırması için oluşturulmuş kuyruk işlerini izleyin.</p>
        </div>
        <button
          onClick={handleProcessNext}
          disabled={submitting}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded-xl transition text-sm disabled:opacity-50"
        >
          {submitting ? 'Çalıştırılıyor...' : '⚙️ Kuyruğu Manuel Çalıştır'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New Job Form */}
        <div className="border border-slate-800 bg-slate-950/20 p-6 rounded-2xl flex flex-col gap-4">
          <h2 className="text-lg font-bold text-slate-200">Yeni Araştırma Talebi</h2>
          <form onSubmit={handleCreateJob} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Araç Varyant ID</label>
              <input
                type="text"
                placeholder="Varyant UUID girin"
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-200"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Kullanıcı ID (Talebi Yapan)</label>
              <input
                type="text"
                placeholder="User UUID girin"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-200"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Dil</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-200"
              >
                <option value="tr">Türkçe (tr)</option>
                <option value="en">English (en)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Öncelik</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-200"
              >
                <option value="LOW">Düşük (LOW)</option>
                <option value="MEDIUM">Orta (MEDIUM)</option>
                <option value="HIGH">Yüksek (HIGH)</option>
                <option value="CRITICAL">Kritik (CRITICAL)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold p-2.5 rounded-lg transition text-sm mt-2"
            >
              Kuyruğa Ekle
            </button>
          </form>
        </div>

        {/* Jobs List */}
        <div className="lg:col-span-2 border border-slate-800 bg-slate-950/10 p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-slate-200 mb-4">Mevcut İş Listesi</h2>
          {loading ? (
            <p className="text-sm text-slate-400">Yükleniyor...</p>
          ) : error ? (
            <p className="text-sm text-red-500">Hata: {error}</p>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-slate-500">Hiç araştırma işi bulunamadı.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-3 px-2">Varyant</th>
                    <th className="py-3 px-2">Kapsam</th>
                    <th className="py-3 px-2">Dil</th>
                    <th className="py-3 px-2">Öncelik</th>
                    <th className="py-3 px-2">Deneme</th>
                    <th className="py-3 px-2">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b border-slate-800/40 hover:bg-slate-800/10 transition">
                      <td className="py-3 px-2">
                        <div className="font-semibold text-slate-200">
                          {job.variant?.brand?.name} {job.variant?.model?.name}
                        </div>
                        <div className="text-xs text-slate-500">{job.vehicleVariantId}</div>
                      </td>
                      <td className="py-3 px-2 font-mono text-xs text-slate-400">{job.researchScope}</td>
                      <td className="py-3 px-2 uppercase text-xs font-mono text-slate-400">{job.languageCode}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-bold ${
                            job.priority === 'CRITICAL'
                              ? 'bg-red-950 text-red-400 border border-red-500/20'
                              : job.priority === 'HIGH'
                              ? 'bg-orange-950 text-orange-400 border border-orange-500/20'
                              : 'bg-slate-850 text-slate-400 border border-slate-800'
                          }`}
                        >
                          {job.priority}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-slate-400">{job.attemptCount}/{job.maxAttempts}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            job.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : job.status === 'RUNNING'
                              ? 'bg-sky-500/10 text-sky-400 animate-pulse'
                              : job.status === 'FAILED'
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {job.status}
                        </span>
                        {job.errorMessage && (
                          <div className="text-[10px] text-red-500 max-w-[200px] truncate mt-1" title={job.errorMessage}>
                            {job.errorMessage}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
