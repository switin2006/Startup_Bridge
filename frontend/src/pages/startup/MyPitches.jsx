import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import api from '../../api'

const statusStyles = {
  draft: 'bg-gray-100 text-gray-700 border border-gray-200',
  published: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  in_negotiation: 'bg-blue-100 text-blue-700 border border-blue-200',
  closed: 'bg-purple-100 text-purple-700 border border-purple-200',
  withdrawn: 'bg-red-100 text-red-700 border border-red-200',
}

const domainColors = {
  FinTech: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  EdTech: 'bg-blue-50 text-blue-700 border border-blue-200',
  HealthTech: 'bg-rose-50 text-rose-700 border border-rose-200',
  D2C: 'bg-amber-50 text-amber-700 border border-amber-200',
  SaaS: 'bg-violet-50 text-violet-700 border border-violet-200',
  Other: 'bg-gray-50 text-gray-700 border border-gray-200',
}

function formatCurrency(amount) {
  const num = Number(amount)
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)} Cr`
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)} L`
  return `₹${num.toLocaleString('en-IN')}`
}

export default function MyPitches() {
  const [pitches, setPitches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(null) // Holds pitch.id of currently executing action
  const navigate = useNavigate()

  async function fetchPitches() {
    try {
      const res = await api.get('/startup/pitches')
      setPitches(res.data)
    } catch (err) {
      console.error(err)
      setError('Failed to fetch your pitches. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPitches()
  }, [])

  // Publish pitch draft
  const handlePublish = async (pitchId) => {
    if (!window.confirm('Are you sure you want to publish this pitch? Investors will see it immediately on their feeds.')) return
    setActionLoading(pitchId)
    try {
      // POST to /api/pitches/:id/publish
      await api.post(`/startup/pitches/${pitchId}/publish`)
      alert('Pitch published successfully!')
      fetchPitches()
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.error || 'Failed to publish pitch.')
    } finally {
      setActionLoading(null)
    }
  }

  // Withdraw published pitch
  const handleWithdraw = async (pitchId) => {
    if (!window.confirm('Are you sure you want to withdraw this pitch? All received pending interests will be automatically denied.')) return
    setActionLoading(pitchId)
    try {
      // POST to /api/pitches/:id/withdraw
      await api.post(`/startup/pitches/${pitchId}/withdraw`)
      alert('Pitch withdrawn successfully.')
      fetchPitches()
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.error || 'Failed to withdraw pitch.')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600 font-medium">Loading your pitches…</span>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">My Fundraising Pitches</h2>
          <p className="text-gray-500 mt-1">Track states, view offers, and execute actions on your active pitches.</p>
        </div>
        <Button onClick={() => navigate('/startup/create')} className="shadow-sm">
          + Create New Pitch
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm border border-red-200 rounded-xl font-medium shadow-sm">
          {error}
        </div>
      )}

      {pitches.length === 0 ? (
        <Card className="text-center py-12 max-w-lg mx-auto mt-6">
          <svg className="mx-auto h-12 w-12 text-gray-350 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-gray-600 font-semibold text-lg">No fundraising pitches found</p>
          <p className="text-sm text-gray-400 mt-1">Pitch drafts created by you will appear here.</p>
          <Button className="mt-5" onClick={() => navigate('/startup/create')}>
            + Create First Pitch
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pitches.map((pitch) => (
            <Card key={pitch.id} className="hover:shadow-md transition-shadow flex flex-col justify-between border border-gray-150">
              <div>
                {/* Meta details */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${domainColors[pitch.domain] || domainColors.Other}`}>
                    {pitch.domain}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${statusStyles[pitch.status]}`}>
                    {pitch.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Pitch Details */}
                <h3 className="text-lg font-bold text-gray-900 line-clamp-1 mb-1">{pitch.title}</h3>
                <p className="text-xs text-gray-400 mb-4">Created on {new Date(pitch.createdAt).toLocaleDateString()}</p>
                
                <div className="grid grid-cols-2 gap-3 mb-4 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                  <div>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Target Raise</span>
                    <span className="text-sm font-bold text-gray-950">{formatCurrency(pitch.fundingAmount)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Equity Off</span>
                    <span className="text-sm font-bold text-gray-950">{Number(pitch.equityPercent)}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-6">
                  <span className="text-xs font-semibold text-gray-500 bg-indigo-50/60 text-indigo-700 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                    {pitch._count?.interests || 0} Offers
                  </span>
                  {pitch.deckFile && (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Deck PDF
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 border-t border-gray-100 pt-4 mt-auto">
                <Button
                  variant="secondary"
                  className="flex-1 text-xs py-1.5 font-semibold"
                  onClick={() => navigate(`/startup/pitches/${pitch.id}`)}
                >
                  View Details
                </Button>
                
                {pitch.status === 'draft' && (
                  <Button
                    className="flex-1 text-xs py-1.5 font-bold shadow-sm hover:shadow"
                    onClick={() => handlePublish(pitch.id)}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === pitch.id ? 'Publishing…' : 'Publish'}
                  </Button>
                )}

                {(pitch.status === 'draft' || pitch.status === 'published') && (
                  <Button
                    variant="danger"
                    className="text-xs py-1.5 font-bold px-3"
                    onClick={() => handleWithdraw(pitch.id)}
                    disabled={actionLoading !== null}
                    title="Withdraw pitch from feed"
                  >
                    Withdraw
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  )
}