import express from 'express'
import { z } from 'zod'
import prisma from '../../prisma.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { requireApproved } from '../../middleware/requireApproved.js'
import { requireRole } from '../../middleware/requireRole.js'
import { createNotification } from '../../lib/notify.js'

const router = express.Router()

router.use(requireAuth, requireApproved, requireRole(['investor']))

// ────────────────────────────────────────────────────────────────
// Zod schema — validates & coerces express-interest input
// ────────────────────────────────────────────────────────────────
const expressInterestSchema = z.object({
  pitchId: z.string().uuid('pitchId must be a valid UUID'),
  proposedAmount: z.union([
    z.string().regex(/^\d+$/, 'proposedAmount must be a numeric string'),
    z.number().int().positive(),
  ]).refine(val => BigInt(val) > 0n, { message: 'proposedAmount must be positive' }),
  proposedEquityPct: z.number({ coerce: true })
    .gt(0, 'proposedEquityPct must be greater than 0')
    .lte(100, 'proposedEquityPct must be at most 100'),
  message: z.string()
    .min(1, 'message is required')
    .max(2000, 'message cannot exceed 2000 characters'),
})

// ────────────────────────────────────────────────────────────────
// POST /api/investor/interests — investor expresses interest
//
// TOCTOU fix: ALL checks + creates run inside a single $transaction
// so concurrent requests can't double-create interests or rooms.
// ────────────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    // Zod validation
    const parsed = expressInterestSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      })
    }

    const { pitchId, proposedAmount, proposedEquityPct, message } = parsed.data

    // Everything inside one transaction — eliminates the TOCTOU race
    const { interest, pitchTitle, startupId } = await prisma.$transaction(async (tx) => {
      // 1. Business rule: only one pending interest at a time
      const existingPending = await tx.interest.findFirst({
        where: { investorId: req.user.id, status: 'pending' },
      })
      if (existingPending) {
        throw Object.assign(
          new Error('You already have a pending interest. Wait for a response before expressing interest in another pitch.'),
          { statusCode: 409 }
        )
      }

      // 2. Pitch must exist and be published
      const pitch = await tx.pitch.findUnique({ where: { id: pitchId } })
      if (!pitch) {
        throw Object.assign(new Error('Pitch not found'), { statusCode: 404 })
      }
      if (pitch.status !== 'published') {
        throw Object.assign(
          new Error('This pitch is not open for interest'),
          { statusCode: 409 }
        )
      }

      // 3. Prevent duplicate interest
      const duplicate = await tx.interest.findUnique({
        where: { pitchId_investorId: { pitchId, investorId: req.user.id } },
      })
      if (duplicate) {
        throw Object.assign(
          new Error('You have already expressed interest in this pitch'),
          { statusCode: 409 }
        )
      }

      // 4. Find or create the negotiation room (atomic — no TOCTOU gap)
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

      // 5. Create the interest
      const created = await tx.interest.create({
        data: {
          investorId: req.user.id,
          pitchId,
          negotiationId: negotiation.id,
          proposedAmount: BigInt(proposedAmount),
          proposedEquityPct: parseFloat(proposedEquityPct),
          message,
        },
      })

      return { interest: created, pitchTitle: pitch.title, startupId: pitch.startupId }
    })

    // After commit: notify the startup
    await createNotification(
      startupId,
      'interest_new',
      'New Interest Received',
      `An investor has expressed interest in "${pitchTitle}"`,
      '/startup/interests'
    )

    res.status(201).json({
      interest: {
        ...interest,
        proposedAmount: interest.proposedAmount.toString(),
      },
    })
  } catch (err) {
    // Handle our custom statusCode errors from inside the transaction
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message })
    }
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
