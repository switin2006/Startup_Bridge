// PitchView — full pitch detail page for investors.
// RBAC: if the investor has no interest, the backend returns 403
// and we show the "Express Interest" form instead.
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import Layout from '../../components/Layout'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import api from '../../api'

function formatCurrency(amount) {
  const num = Number(amount)
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)} Cr`
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)} L`
  return `₹${num.toLocaleString('en-IN')}`
}

const domainColors = {
  FinTech: 'bg-emerald-100 text-emerald-700',
  EdTech: 'bg-blue-100 text-blue-700',
  HealthTech: 'bg-rose-100 text-rose-700',
  D2C: 'bg-amber-100 text-amber-700',
  SaaS: 'bg-violet-100 text-violet-700',
  Other: 'bg-gray-100 text-gray-700',
}

export default function PitchView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pitch, setPitch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasInterest, setHasInterest] = useState(false)
  const [globalPending, setGlobalPending] = useState(false)
  const [showInterestForm, setShowInterestForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm()

  useEffect(() => {
    async function fetchPitch() {
      try {
        const [resPitch, resInterests] = await Promise.all([
          api.get(`/investor/pitches/${id}`),
          api.get('/investor/interests/mine').catch(() => ({ data: { interests: [] } }))
        ])
        setPitch(resPitch.data.pitch)
        setHasInterest(resPitch.data.hasInterest)
        
        const pending = resInterests.data.interests.some(i => i.status === 'pending')
        setGlobalPending(pending)
      } catch (err) {
        setServerError('Failed to load pitch details')
      } finally {
        setLoading(false)
      }
    }
    fetchPitch()
  }, [id])

  async function onSubmitInterest(data) {
    setServerError('')
    setSubmitting(true)
    try {
      await api.post('/investor/interests', {
        pitchId: id,
        proposedAmount: data.proposedAmount,
        proposedEquityPct: data.proposedEquityPct,
        message: data.message,
      })
      setSuccess('Interest submitted! The startup will review your proposal.')
      setShowInterestForm(false)
      setHasInterest(true)
    } catch (err) {
      setServerError(err.response?.data?.error || 'Failed to submit interest')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="text-gray-400 py-12 text-center">Loading…</div>
      </Layout>
    )
  }



  // Full pitch detail
  const colorClass = domainColors[pitch.domain] || domainColors.Other

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-indigo-600 hover:underline mb-4 inline-block"
        >
          ← Back
        </button>

        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg">{success}</div>
        )}
        {serverError && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{serverError}</div>
        )}

        <Card>
          <div className="flex items-start justify-between mb-4">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colorClass}`}>
              {pitch.domain}
            </span>
            <span className="text-xs text-gray-400">
              {pitch.publishedAt && new Date(pitch.publishedAt).toLocaleDateString()}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">{pitch.title}</h2>
          <p className="text-sm text-gray-500 mb-6">by {pitch.startup?.name}</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <span className="text-xs text-gray-400">Funding Required</span>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(pitch.fundingAmount)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <span className="text-xs text-gray-400">Equity Offered</span>
              <p className="text-lg font-semibold text-gray-900">{Number(pitch.equityPercent)}%</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Problem</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{pitch.problem}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Solution</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{pitch.solution}</p>
            </div>
          </div>

          {pitch.deckFile && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <a
                href={`/api/files/${pitch.deckFile.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Pitch Deck ({pitch.deckFile.originalName})
              </a>
            </div>
          )}

          {!hasInterest && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Interested?</h3>
              {!showInterestForm ? (
                <Button 
                  onClick={() => {
                    if (globalPending) {
                      setServerError('You already have a pending interest on another pitch. Please wait for the startup to respond before making new offers.')
                    } else {
                      setServerError('')
                      setShowInterestForm(true)
                    }
                  }}
                >
                  Express Interest
                </Button>
              ) : (
                <form onSubmit={handleSubmit(onSubmitInterest)} className="space-y-4">
                  <Input
                    label="Proposed investment (₹)"
                    type="number"
                    placeholder="e.g. 5000000"
                    {...register('proposedAmount', { required: 'Amount is required', min: { value: 1, message: 'Must be positive' } })}
                    error={errors.proposedAmount?.message}
                  />
                  <Input
                    label="Proposed equity (%)"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 8.5"
                    {...register('proposedEquityPct', { required: 'Equity is required', min: { value: 0.01, message: 'Must be positive' }, max: { value: 100, message: 'Max 100%' } })}
                    error={errors.proposedEquityPct?.message}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Intro message to the startup
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="Tell the startup why you're interested and what you bring to the table…"
                      {...register('message', { required: 'Message is required' })}
                    />
                    {errors.message && (
                      <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Submitting…' : 'Submit Interest'}
                    </Button>
                    <Button variant="secondary" type="button" onClick={() => setShowInterestForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
          {hasInterest && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">You have already expressed interest in this pitch.</span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  )
}
