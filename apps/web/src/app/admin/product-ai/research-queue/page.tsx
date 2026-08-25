'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminResearchQueuePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/product-ai/operations?tab=queue');
  }, [router]);

  return (
    <div className="p-8 text-center text-slate-400 font-mono text-xs">
      AI Operasyonları / Kuyruk sekmesine yönlendiriliyorsunuz...
    </div>
  );
}
