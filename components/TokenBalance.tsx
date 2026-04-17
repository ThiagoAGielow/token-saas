'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface BalanceResponse {
  balance: number;
  daysRemaining: number | null;
}

export default function TokenBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/tokens')
      .then((r) => r.json() as Promise<BalanceResponse>)
      .then((data) => {
        setBalance(data.balance);
        setDaysRemaining(data.daysRemaining);
      })
      .catch(() => {
        // Silently fail — balance will show as "—"
      });
  }, []);

  const isLow = balance !== null && balance < 50;
  const formattedBalance = balance === null ? '—' : balance.toLocaleString();

  return (
    <div className="flex items-center gap-3">
      <div className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${
        isLow
          ? 'bg-amber-50 text-amber-900 border border-amber-200'
          : 'bg-slate-100 text-slate-900'
      }`}>
        <span>{formattedBalance} tokens</span>
        {daysRemaining !== null && (
          <span className="text-slate-500">· ~{daysRemaining}d</span>
        )}
      </div>
      {isLow && (
        <Link
          href="/dashboard/tokens"
          className="text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          Top up →
        </Link>
      )}
    </div>
  );
}
