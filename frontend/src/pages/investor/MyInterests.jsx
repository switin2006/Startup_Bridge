// MyInterests — investor's submitted interests with status badges.
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import Card from '../../components/ui/Card'
import api from '../../api'

const statusStyles = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-green-100 text-green-700',
  denied: 'bg-red-100 text-red-700',
}

function formatCurrency(amount) {
  const num = Number(amount)
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)} Cr`
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)} L`
  return `₹${num.toLocaleString('en-IN')}`
}

export default function MyInterests() {
  const [interests, setInterests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api.get('/investor/interests/mine')
        setInterests(res.data.interests)
      } catch (err) {
        console.error('Failed to fetch interests:', err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Interests</h2>
        <p className="text-gray-500 mt-1">Track the status of your investment proposals</p>
      </div>

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Loading…</div>
      ) : interests.length === 0 ? (
        <Card>
          <div className="text-center py-6">
            <p className="text-gray-500">You haven't expressed interest in any pitches yet.</p>
            <Link to="/investor/feed" className="mt-3 inline-block text-sm text-indigo-600 hover:underline">
              Browse pitches →
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {interests.map((interest) => (
            <Card key={interest.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      to={`/investor/pitches/${interest.pitch.id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition"
                    >
                      {interest.pitch.title}
                    </Link>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[interest.status]}`}>
                      {interest.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{interest.pitch.domain}</p>
                </div>

                <div className="text-right text-sm">
                  <p className="text-gray-400">Your offer</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(interest.proposedAmount)} for {Number(interest.proposedEquityPct)}%
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-600">{interest.message}</p>
              </div>

              <div className="mt-2 text-xs text-gray-400">
                Submitted {new Date(interest.createdAt).toLocaleDateString()}
                {interest.respondedAt && ` • Responded ${new Date(interest.respondedAt).toLocaleDateString()}`}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  )
}
