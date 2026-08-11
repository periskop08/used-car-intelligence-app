'use client';

import React, { useEffect, useState } from 'react';
import VehicleProfileEditor from '../../components/VehicleProfileEditor';
import { API_BASE_URL } from '@/utils/apiConfig';

export default function AdminVehicleProfilesPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);

  const fetchProfiles = () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('accessToken');

    fetch(`${API_BASE_URL}/admin/vehicle-profiles`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Ortak araç profilleri yüklenemedi.');
        return res.json();
      })
      .then((data) => setProfiles(Array.isArray(data) ? data : []))
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleSaveProfile = async (payload: any) => {
    const token = localStorage.getItem('accessToken');
    const url = editingProfile
      ? `${API_BASE_URL}/admin/vehicle-profiles/${editingProfile.id}`
      : `${API_BASE_URL}/admin/vehicle-profiles`;
    const method = editingProfile ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Araç profili kaydedilemedi.');
    }

    setIsEditorOpen(false);
    setEditingProfile(null);
    fetchProfiles();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Ortak Araç Yönetimi</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Rehber ve Aracını Bul modüllerinin ortak editoryal ve jenerik profil kartları yönetimi.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingProfile(null);
            setIsEditorOpen(true);
          }}
          className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
        >
          + Yeni Ortak Araç Profili
        </button>
      </div>

      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Ortak araç profilleri yükleniyor...</div>
        ) : error ? (
          <div className="p-6 text-center text-rose-400 font-bold text-xs">{error}</div>
        ) : profiles.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-xs">Henüz ortak araç profili tanımlanmamış.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5">
                <tr>
                  <th className="p-4">Marka / Model</th>
                  <th className="p-4">Başlık / Tanım</th>
                  <th className="p-4">Modüller</th>
                  <th className="p-4 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.03] transition">
                    <td className="p-4 font-bold text-white">
                      {p.brandName} {p.modelName} ({p.yearStart}-{p.yearEnd || 'günümüz'})
                    </td>
                    <td className="p-4 text-slate-300">{p.title || p.summary || '-'}</td>
                    <td className="p-4 font-mono">
                      <div className="flex gap-2">
                        {p.isGuideVisible && <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-[10px] rounded font-bold">REHBER</span>}
                        {p.isDiscoveryVisible && <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] rounded font-bold">KEŞFET</span>}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          setEditingProfile(p);
                          setIsEditorOpen(true);
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-orange-500 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                      >
                        Düzenle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isEditorOpen && (
        <VehicleProfileEditor
          initialData={editingProfile}
          onSave={handleSaveProfile}
          onCancel={() => {
            setIsEditorOpen(false);
            setEditingProfile(null);
          }}
          defaultShowInGuide={true}
          defaultShowInDiscovery={true}
        />
      )}
    </div>
  );
}
