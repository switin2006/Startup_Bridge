// Investor Feed — browse published pitches as cards.
// Filters: domain dropdown, search query.
import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import PitchCard from '../../components/investor/PitchCard'
import api from '../../api'

const DOMAINS = ['FinTech', 'EdTech', 'HealthTech', 'D2C', 'SaaS', 'Other']

export default function Feed() {
  const [pitches, setPitches] = useState([])
  const [loading, setLoading] = useState(true)
  const [domain, setDomain] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        const params = {}
        if (domain) params.domain = domain
        if (search) params.q = search
        const res = await api.get('/investor/pitches', { params })
        setPitches(res.data.pitches)
      } catch (err) {
        console.error('Failed to fetch pitches:', err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [domain, search])

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Browse Pitches</h2>
        <p className="text-gray-500 mt-1">Discover startup opportunities and express your interest</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search pitches…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm w-64"
        />
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        >
          <option value="">All domains</option>
          {DOMAINS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Pitch grid */}
      {loading ? (
        <div className="text-gray-400 py-12 text-center">Loading pitches…</div>
      ) : pitches.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No pitches found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pitches.map((pitch) => (
            <PitchCard key={pitch.id} pitch={pitch} />
          ))}
        </div>
      )}
    </Layout>
  )
}
