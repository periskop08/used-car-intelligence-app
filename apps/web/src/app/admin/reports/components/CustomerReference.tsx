'use client';
import React from 'react';
import Link from 'next/link';

interface CustomerReferenceProps {
  customerNo: string;
  name?: string;
}

export const CustomerReference: React.FC<CustomerReferenceProps> = ({ customerNo, name }) => {
  return (
    <Link
      href={`/admin/reports/users/${encodeURIComponent(customerNo)}`}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 hover:border-orange-500/40 transition-all"
    >
      <span>{customerNo}</span>
      {name && <span className="font-sans text-slate-300 font-normal">• {name}</span>}
    </Link>
  );
};
