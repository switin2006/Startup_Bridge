// Pitch card component — used in the investor Feed.
// Shows: title, domain badge, funding amount, equity %, startup name.
// Never shows problem/solution/deck (those are RBAC-gated).
import { Link } from 'react-router-dom'

const domainColors = {
  FinTech: 'bg-emerald-100 text-emerald-700',
  EdTech: 'bg-blue-100 text-blue-700',
  HealthTech: 'bg-rose-100 text-rose-700',
  D2C: 'bg-amber-100 text-amber-700',
  SaaS: 'bg-violet-100 text-violet-700',
  Other: 'bg-gray-100 text-gray-700',
}

function formatCurrency(amount) {
  const num = Number(amount)
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)} Cr`
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)} L`
  return `₹${num.toLocaleString('en-IN')}`
}

export default function PitchCard({ pitch }) {
  const colorClass = domainColors[pitch.domain] || domainColors.Other

  return (
    <Link
      to={`/investor/pitches/${pitch.id}`}
      className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-indigo-200 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colorClass}`}>
          {pitch.domain}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
        {pitch.title}
      </h3>

      <p className="text-sm text-gray-500 mb-4">
        by {pitch.startup?.name || 'Unknown'}
      </p>

      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-gray-400">Funding</span>
          <p className="font-semibold text-gray-900">{formatCurrency(pitch.fundingAmount)}</p>
        </div>
        <div className="h-8 w-px bg-gray-200" />
        <div>
          <span className="text-gray-400">Equity</span>
          <p className="font-semibold text-gray-900">{Number(pitch.equityPercent)}%</p>
        </div>
      </div>
    </Link>
  )
}
