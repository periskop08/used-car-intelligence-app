"use client";

import React, { Suspense } from "react";
import { ListingsView } from "../components/ListingsView";

export default function UrgentListingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center text-xs text-slate-400">Yükleniyor...</div>}>
      <ListingsView isUrgentPage={true} />
    </Suspense>
  );
}
