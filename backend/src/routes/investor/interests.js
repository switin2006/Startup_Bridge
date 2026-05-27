import express from 'express'
import prisma from '../../prisma.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { requireApproved } from '../../middleware/requireApproved.js'
import { requireRole } from '../../middleware/requireRole.js'
import { createNotification } from '../../lib/notify.js'

const router = express.Router()

router.use(requireAuth, requireApproved, requireRole(['investor']))

// ────────────────────────────────────────────────────────────────
// POST /api/investor/interests — investor expresses interest
// ────────────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { pitchId, proposedAmount, proposedEquityPct, message } = req.body

    if (!pitchId || !proposedAmount || !proposedEquityPct || !message) {
      return res.status(400).json({
        error: 'pitchId, proposedAmount, proposedEquityPct and message are required',
      })
    }

    // Business rule: only one pending interest at a time (across all pitches)
    const existingPending = await prisma.interest.findFirst({
      where: { investorId: req.user.id, status: 'pending' },
    })
    if (existingPending) {
      return res.status(409).json({
        error: 'You already have a pending interest. Wait for a response before expressing interest in another pitch.',
      })
    }

    // Pitch must exist and be published
    const pitch = await prisma.pitch.findUnique({ where: { id: pitchId } })
    if (!pitch) return res.status(404).json({ error: 'Pitch not found' })
    if (pitch.status !== 'published') {
      return res.status(409).json({ error: 'This pitch is not open for interest' })
    }

    // Prevent duplicate interest
    const duplicate = await prisma.interest.findUnique({
      where: { pitchId_investorId: { pitchId, investorId: req.user.id } },
    })
    if (duplicate) {
      return res.status(409).json({ error: 'You have already expressed interest in this pitch' })
    }

    // Transaction: find/create negotiation room + create interest
    const interest = await prisma.$transaction(async (tx) => {
      let negotiation = await tx.negotiation.findUnique({ where: { pitchId } })
      if (!negotiation) {
        negotiation = await tx.negotiation.create({
          data: {
            pitchId,
            startupId: pitch.startupId,
            status: 'open',
          },
        })
      }

      return tx.interest.create({
        data: {
          investorId: req.user.id,
          pitchId,
          negotiationId: negotiation.id,
          proposedAmount: BigInt(proposedAmount),
          proposedEquityPct: parseFloat(proposedEquityPct),
          message,
        },
      })
    })

    // After commit: notify the startup
    await createNotification(
      pitch.startupId,
      'interest_new',
      'New Interest Received',
      `An investor has expressed interest in "${pitch.title}"`,
      '/startup/interests'
    )

    res.status(201).json({
      interest: {
        ...interest,
        proposedAmount: interest.proposedAmount.toString(),
      },
    })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────
// GET /api/investor/interests/mine — investor's submitted interests
// ────────────────────────────────────────────────────────────────
router.get('/mine', async (req, res, next) => {
  try {
    const interests = await prisma.interest.findMany({
      where: { investorId: req.user.id },
      include: {
        pitch: {
          select: { id: true, title: true, domain: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({
      interests: interests.map((i) => ({
        ...i,
        proposedAmount: i.proposedAmount.toString(),
      })),
    })
  } catch (err) {
    next(err)
  }
})

export default router
