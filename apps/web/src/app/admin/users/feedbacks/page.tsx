'use client';

import React, { useEffect, useState } from 'react';
import AdminFeedbackOperationCenter from '../../components/AdminFeedbackOperationCenter';

export default function AdminFeedbacksPage() {
  const [token, setToken] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('accessToken') || '';
    setToken(savedToken);
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="pb-6 border-b border-white/10">
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Kullanıcı Geri Bildirim Operasyonu</h1>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Kullanıcılar tarafından iletilen hata bildirimleri, öneriler, veri eksikliği ve talep kartları.
        </p>
      </div>

      <AdminFeedbackOperationCenter token={token} />
    </div>
  );
}
