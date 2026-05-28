import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import api from '../../api'

const statusStyles = {
  open: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  pending_admin_close: 'bg-blue-100 text-blue-700 border border-blue-200',
  concluded: 'bg-purple-100 text-purple-700 border border-purple-200',
  failed: 'bg-red-100 text-red-700 border border-red-200',
}

function formatCurrency(amount) {
  const num = Number(amount)
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)} Cr`
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)} L`
  return `₹${num.toLocaleString('en-IN')}`
}

export default function Negotiations() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function fetchNegotiations() {
    try {
      const res = await api.get('/negotiations/mine')
      setData(res.data.negotiations || [])
    } catch (err) {
      console.error(err)
      setError('Failed to fetch negotiation rooms. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNegotiations()
  }, [])

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600 font-medium">Loading negotiations…</span>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-center max-w-lg mx-auto mt-12 shadow-sm">
          <p className="font-semibold">{error}</p>
          <Button variant="secondary" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">My Negotiations</h2>
        <p className="text-gray-500 mt-1">Track and manage your active and concluded investment negotiations.</p>
      </div>

      {data.length === 0 ? (
        <Card className="text-center py-12 max-w-lg mx-auto mt-6">
          <svg className="mx-auto h-12 w-12 text-gray-350 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-gray-600 font-semibold text-lg">No active negotiations found</p>
          <p className="text-sm text-gray-400 mt-1">Once you express interest in a pitch, the negotiation room will appear here.</p>
          <Button className="mt-5" onClick={() => navigate('/investor/feed')}>
            Browse Pitches
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((n) => (
            <Card key={n.id} className="border border-gray-150 shadow-sm hover:shadow-md transition">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                
                {/* Details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-bold text-gray-950">Pitch: {n.pitch.title}</h3>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${statusStyles[n.status]}`}>
                      {n.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">Opened on {new Date(n.openedAt).toLocaleDateString()}</p>
                  
                  {/* Startup Details */}
                  {n.startup && (
                    <div className="pt-2 text-xs text-gray-600 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-800">Startup:</span>
                        <span>{n.startup.name} ({n.startup.email})</span>
                      </div>
                      {n.startup.contactPhone && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-800">Contact Phone:</span>
                          <span>{n.startup.contactPhone}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Final Terms */}
                {n.finalAmount && n.finalEquityPct ? (
                  <div className="text-left sm:text-right bg-gray-50 p-4 rounded-xl border border-gray-100 sm:min-w-[200px]">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Agreed Final Deal</span>
                    <p className="text-base font-extrabold text-indigo-600 mt-1">
                      {formatCurrency(n.finalAmount)}
                    </p>
                    <p className="text-xs font-semibold text-gray-700 mt-0.5">
                      for {Number(n.finalEquityPct)}% equity
                    </p>
                  </div>
                ) : (
                  <div className="text-left sm:text-right bg-amber-50/50 p-4 rounded-xl border border-amber-100 sm:min-w-[200px]">
                    <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider block">Deal Status</span>
                    <p className="text-xs font-semibold text-amber-800 mt-1.5">
                      In active negotiation
                    </p>
                  </div>
                )}
              </div>

              {/* Note Details */}
              {n.finalTermsNote && (
                <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 italic">
                  <strong>Notes:</strong> "{n.finalTermsNote}"
                </div>
              )}

              {/* Chat action button */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                <Button
                  onClick={() => navigate(`/negotiation/${n.id}`)}
                  className="text-xs py-1.5 font-bold shadow-sm"
                >
                  Enter Negotiation Chat Room →
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  )
}
