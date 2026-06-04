'use client'

// ─── OverviewClient ──────────────────────────────────────────────────────────
// Only the interactive "Cost Before Action" widget needs client-side state.
// Everything else on the overview page is server-rendered.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'

function IconGlobe() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
}
function IconLink() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
}
function IconMail() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
}
function IconSparkle() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3l1.5 3.5L10 8l-3.5 1.5L5 13l-1.5-3.5L0 8l3.5-1.5L5 3zm14 11l1 2.5L22.5 17l-2.5 1L19 20.5l-1-2.5L15.5 17l2.5-1L19 14zm-7-9l.75 1.75L14.5 7.5l-1.75.75L12 10l-.75-1.75L9.5 7.5l1.75-.75L12 5z" /></svg>
}

const ACTION_COSTS = [
  { label: 'Create a Website',    cost: 50, icon: <IconGlobe /> },
  { label: 'Connect a Domain',    cost: 20, icon: <IconLink /> },
  { label: 'Set Up an Email',     cost: 10, icon: <IconMail /> },
  { label: 'AI Content Rewrite',  cost:  3, icon: <IconSparkle /> },
]

export default function OverviewClient({ tokenBalance }: { tokenBalance: number }) {
  const [selected, setSelected] = useState(ACTION_COSTS[0]!)
  const canAfford = tokenBalance >= selected.cost

  return (
    <div className="p-5 rounded-xl bg-[#111] border border-white/10">
      <h3 className="font-semibold text-white mb-4">Cost Before Action</h3>
      <p className="text-xs text-gray-500 mb-3">Select an action to see its token cost</p>

      <div className="space-y-1.5 mb-4">
        {ACTION_COSTS.map((action) => (
          <button key={action.label} onClick={() => setSelected(action)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all border ${selected.label === action.label ? 'bg-blue-500/15 border-blue-500/30 text-white' : 'border-transparent hover:border-white/10 text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <span className="flex items-center gap-2">
              <span className={selected.label === action.label ? 'text-blue-400' : 'text-gray-500'}>{action.icon}</span>
              <span>{action.label}</span>
            </span>
            <span className={`font-bold tabular-nums ${selected.label === action.label ? 'text-amber-400' : 'text-gray-500'}`}>{action.cost}</span>
          </button>
        ))}
      </div>

      <div className={`p-3 rounded-lg border ${canAfford ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">Token cost</span>
          <span className="text-sm font-bold text-amber-400">−{selected.cost} tokens</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Balance after</span>
          <span className={`text-sm font-bold tabular-nums ${canAfford ? 'text-white' : 'text-red-400'}`}>
            {(tokenBalance - selected.cost).toLocaleString()}
          </span>
        </div>
        <div className={`text-xs font-semibold text-center py-1 rounded ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
          {canAfford ? 'You can afford this action' : 'Insufficient tokens'}
        </div>
      </div>
    </div>
  )
}
