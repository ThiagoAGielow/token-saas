'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface BalanceResponse {
  wallet?: { balance?: number };
  daysRemaining?: number | null;
}

interface TokenBalanceProps {
  /** Pre-fetched balance from the server layout — skips the client fetch when provided */
  initialBalance?: number;
}

export default function TokenBalance({ initialBalance }: TokenBalanceProps = {}) {
  const [balance, setBalance] = useState<number | null>(initialBalance ?? null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    // If the layout already supplied a balance, skip the fetch entirely
    if (initialBalance !== undefined) return;

    fetch('/api/tokens')
      .then((r) => r.json() as Promise<BalanceResponse>)
      .then((data) => {
        setBalance(data.wallet?.balance ?? null);
        setDaysRemaining(data.daysRemaining ?? null);
      })
      .catch(() => {
        // Silently fail — balance will show as "—"
      });
  }, [initialBalance]);

  const isLow = balance !== null && balance < 50;
  const formattedBalance = balance == null ? '—' : balance.toLocaleString();

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
