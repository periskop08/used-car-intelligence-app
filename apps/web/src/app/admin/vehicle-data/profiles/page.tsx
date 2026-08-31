'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminVehicleProfilesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/vehicle-data/discovery');
  }, [router]);

  return (
    <div className="p-8 text-center text-slate-400 font-medium">
      Aracını Bul Yönetimi sayfasına yönlendiriliyorsunuz...
    </div>
  );
}
