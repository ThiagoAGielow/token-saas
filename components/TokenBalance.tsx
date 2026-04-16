'use client';

// TODO: replace with real data from API/context
const MOCK_BALANCE = 650;
const MOCK_MONTHLY_ALLOWANCE = 2000;
const MOCK_AVG_DAILY_USAGE = 32; // tokens per day

export default function TokenBalance({ compact = false }) {
  const balance = MOCK_BALANCE;
  const monthlyAllowance = MOCK_MONTHLY_ALLOWANCE;
  const avgDailyUsage = MOCK_AVG_DAILY_USAGE;

  const percentUsed = Math.round(((monthlyAllowance - balance) / monthlyAllowance) * 100);
  const percentRemaining = 100 - percentUsed;
  const daysRemaining = avgDailyUsage > 0 ? Math.floor(balance / avgDailyUsage) : null;
  const isLow = balance < 100;
  const isCritical = balance < 50;

  if (compact) {
    return (
      <div className="p-4 rounded-xl bg-[#1a1a1a] border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Token Balance</span>
          {isLow && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
              Low
            </span>
          )}
        </div>

        <div className="flex items-end gap-1 mb-3">
          <span className={`text-2xl font-bold tabular-nums ${isCritical ? 'text-red-400' : isLow ? 'text-orange-400' : 'text-amber-400'}`}>
            {balance.toLocaleString()}
          </span>
          <span className="text-gray-500 text-sm mb-0.5">tokens</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCritical ? 'bg-red-500' : isLow ? 'bg-orange-500' : 'bg-amber-400'
            }`}
            style={{ width: `${percentRemaining}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{percentRemaining}% remaining</span>
          {daysRemaining !== null && (
            <span className={`text-xs font-medium ${isLow ? 'text-orange-400' : 'text-gray-400'}`}>
              ~{daysRemaining}d left
            </span>
          )}
        </div>

        {isLow && (
          <a
            href="/dashboard/tokens"
            className="mt-3 block w-full text-center text-xs font-semibold py-1.5 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/20 hover:bg-amber-400/20 transition-colors"
          >
            Top up tokens
          </a>
        )}
      </div>
    );
  }

  // Full size variant
  return (
    <div className={`p-6 rounded-xl border ${isCritical ? 'bg-red-500/5 border-red-500/20' : isLow ? 'bg-orange-500/5 border-orange-500/20' : 'bg-amber-400/5 border-amber-400/20'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-gray-400 mb-1">Current Token Balance</p>
          <div className="flex items-end gap-2">
            <span className={`text-5xl font-black tabular-nums ${isCritical ? 'text-red-400' : isLow ? 'text-orange-400' : 'text-amber-400'}`}>
              {balance.toLocaleString()}
            </span>
            <span className="text-gray-500 text-lg mb-1">tokens</span>
          </div>
        </div>
        {isLow && (
          <div className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${isCritical ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30'}`}>
            {isCritical ? 'Critical' : 'Low Balance'}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>{(monthlyAllowance - balance).toLocaleString()} used this month</span>
          <span>{monthlyAllowance.toLocaleString()} monthly allowance</span>
        </div>
        <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isCritical ? 'bg-red-500' : isLow ? 'bg-orange-500' : 'bg-gradient-to-r from-amber-500 to-amber-300'
            }`}
            style={{ width: `${percentRemaining}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-gray-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {daysRemaining !== null ? (
            <span className={isLow ? 'text-orange-400 font-medium' : ''}>
              ~{daysRemaining} days remaining at current usage
            </span>
          ) : (
            <span>No usage data yet</span>
          )}
        </div>
        <span className="text-gray-500 text-xs">{avgDailyUsage} tokens/day avg</span>
      </div>

      {isLow && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${isCritical ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-orange-500/10 border border-orange-500/20 text-orange-300'}`}>
          <strong>Warning:</strong> {isCritical ? 'Your balance is critically low. Services may be interrupted soon.' : 'Your balance is running low. Consider topping up to avoid interruption.'}
        </div>
      )}
    </div>
  );
}
