// Pitch routes — CRUD, publish, withdraw
// Person B owns this file.
import express from 'express'
import prisma from '../prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireApproved } from '../middleware/requireApproved.js'
import { requireRole } from '../middleware/requireRole.js'
import { createNotification } from '../lib/notify.js'

const router = express.Router()

// All pitch routes require auth + approved
router.use(requireAuth, requireApproved)


// ────────────────────────────────────────────────────────────────
// GET /api/pitches/mine — startup's own pitches (full detail)
// ────────────────────────────────────────────────────────────────
router.get('/mine', requireRole(['startup']), async (req, res, next) => {
  try {
    const pitches = await prisma.pitch.findMany({
      where: { startupId: req.user.id },
      include: {
        deckFile: { select: { id: true, originalName: true } },
        _count: { select: { interests: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({
      pitches: pitches.map(p => ({
        ...p,
        fundingAmount: p.fundingAmount.toString()
      }))
    })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────
// GET /api/pitches/:id — full detail
// RBAC: owner OR admin OR investor-with-interest. Otherwise 403.
// ────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const pitch = await prisma.pitch.findUnique({
      where: { id: req.params.id },
      include: {
        startup: { select: { id: true, name: true, contactPhone: true } },
        deckFile: { select: { id: true, originalName: true } },
      },
    })

    if (!pitch) return res.status(404).json({ error: 'Pitch not found' })

    const pitchResponse = { ...pitch, fundingAmount: pitch.fundingAmount.toString() }

    // Owner can always see their own pitch
    if (pitch.startupId === req.user.id) return res.json({ pitch: pitchResponse })

    return res.status(403).json({ error: 'Access denied' })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────
// POST /api/pitches — startup creates a draft pitch
// Business rule (A.11): startup cannot create while any of their
// Negotiations is open / pending_admin_close.
// ────────────────────────────────────────────────────────────────
router.post('/', requireRole(['startup']), async (req, res, next) => {
  try {
    const { title, problem, solution, fundingAmount, equityPercent, domain, deckFileId } = req.body

    if (!title || !problem || !solution || !fundingAmount || !equityPercent || !domain) {
      return res.status(400).json({ error: 'title, problem, solution, fundingAmount, equityPercent and domain are required' })
    }

    // Business rule: no new pitch while an active negotiation exists
    const activeNegotiation = await prisma.negotiation.findFirst({
      where: {
        startupId: req.user.id,
        status: { in: ['open', 'pending_admin_close'] },
      },
    })
    if (activeNegotiation) {
      return res.status(409).json({
        error: 'You cannot create a new pitch while you have an active negotiation',
      })
    }

    const pitch = await prisma.pitch.create({
      data: {
        startupId: req.user.id,
        title,
        problem,
        solution,
        fundingAmount: BigInt(fundingAmount),
        equityPercent: parseFloat(equityPercent),
        domain,
        deckFileId: deckFileId || null,
        status: 'draft',
      },
    })

    // BigInt -> string for JSON serialization
    res.status(201).json({
      pitch: { ...pitch, fundingAmount: pitch.fundingAmount.toString() },
    })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────
// PUT /api/pitches/:id — edit (only if draft or published with no accepted interests)
// ────────────────────────────────────────────────────────────────
router.put('/:id', requireRole(['startup']), async (req, res, next) => {
  try {
    const pitch = await prisma.pitch.findUnique({ where: { id: req.params.id } })
    if (!pitch) return res.status(404).json({ error: 'Pitch not found' })
    if (pitch.startupId !== req.user.id) return res.status(403).json({ error: 'Not your pitch' })
    if (!['draft', 'published'].includes(pitch.status)) {
      return res.status(409).json({ error: 'Cannot edit a pitch that is in negotiation, closed or withdrawn' })
    }

    // If published, check no accepted interest exists
    if (pitch.status === 'published') {
      const acceptedInterest = await prisma.interest.findFirst({
        where: { pitchId: pitch.id, status: 'accepted' },
      })
      if (acceptedInterest) {
        return res.status(409).json({ error: 'Cannot edit — an interest has been accepted' })
      }
    }

    const { title, problem, solution, fundingAmount, equityPercent, domain, deckFileId } = req.body

    const updated = await prisma.pitch.update({
      where: { id: pitch.id },
      data: {
        ...(title && { title }),
        ...(problem && { problem }),
        ...(solution && { solution }),
        ...(fundingAmount && { fundingAmount: BigInt(fundingAmount) }),
        ...(equityPercent && { equityPercent: parseFloat(equityPercent) }),
        ...(domain && { domain }),
        ...(deckFileId !== undefined && { deckFileId: deckFileId || null }),
      },
    })

    res.json({ pitch: { ...updated, fundingAmount: updated.fundingAmount.toString() } })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────
// POST /api/pitches/:id/publish — sets published + published_at
// ────────────────────────────────────────────────────────────────
router.post('/:id/publish', requireRole(['startup']), async (req, res, next) => {
  try {
    const pitch = await prisma.pitch.findUnique({ where: { id: req.params.id } })
    if (!pitch) return res.status(404).json({ error: 'Pitch not found' })
    if (pitch.startupId !== req.user.id) return res.status(403).json({ error: 'Not your pitch' })
    if (pitch.status !== 'draft') {
      return res.status(409).json({ error: 'Only draft pitches can be published' })
    }

    const updated = await prisma.pitch.update({
      where: { id: pitch.id },
      data: { status: 'published', publishedAt: new Date() },
    })

    res.json({ pitch: { ...updated, fundingAmount: updated.fundingAmount.toString() } })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────
// POST /api/pitches/:id/withdraw — sets withdrawn, auto-denies pending interests
// ────────────────────────────────────────────────────────────────
router.post('/:id/withdraw', requireRole(['startup']), async (req, res, next) => {
  try {
    const pitch = await prisma.pitch.findUnique({
      where: { id: req.params.id },
      include: {
        interests: { where: { status: 'pending' }, select: { id: true, investorId: true } },
      },
    })
    if (!pitch) return res.status(404).json({ error: 'Pitch not found' })
    if (pitch.startupId !== req.user.id) return res.status(403).json({ error: 'Not your pitch' })
    if (!['draft', 'published'].includes(pitch.status)) {
      return res.status(409).json({ error: 'Cannot withdraw a pitch that is already in negotiation or closed' })
    }

    // Transaction: withdraw pitch + deny all pending interests
    await prisma.$transaction(async (tx) => {
      await tx.pitch.update({
        where: { id: pitch.id },
        data: { status: 'withdrawn' },
      })

      if (pitch.interests.length > 0) {
        await tx.interest.updateMany({
          where: { pitchId: pitch.id, status: 'pending' },
          data: { status: 'denied', respondedAt: new Date() },
        })
      }
    })

    // After commit: notify denied investors
    for (const interest of pitch.interests) {
      await createNotification(
        interest.investorId,
        'interest_denied',
        'Pitch Withdrawn',
        `The pitch "${pitch.title}" has been withdrawn by the startup.`,
        '/investor/interests'
      )
    }

    res.json({ message: 'Pitch withdrawn' })
  } catch (err) {
    next(err)
  }
})

export default router
