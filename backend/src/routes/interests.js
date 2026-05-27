// Interest routes — express interest, accept (pick winner), deny
// Implements A.11 group negotiation model:
// - Expressing interest auto-creates/joins a Negotiation room for the pitch
// - Accept = pick winner, deny all others, pitch goes in_negotiation
// Person B owns this file.
import express from 'express'
import prisma from '../prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireApproved } from '../middleware/requireApproved.js'
import { requireRole } from '../middleware/requireRole.js'
import { createNotification } from '../lib/notify.js'

const router = express.Router()

router.use(requireAuth, requireApproved)



// ────────────────────────────────────────────────────────────────
// GET /api/interests/received — startup sees interests on their pitches
// ────────────────────────────────────────────────────────────────
router.get('/received', requireRole(['startup']), async (req, res, next) => {
  try {
    const interests = await prisma.interest.findMany({
      where: {
        pitch: { startupId: req.user.id },
      },
      include: {
        investor: { select: { id: true, name: true, email: true } },
        pitch: { select: { id: true, title: true, domain: true, status: true } },
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

// ────────────────────────────────────────────────────────────────
// PUT /api/interests/:id/accept — startup picks a winner
//
// A.11 flow — single $transaction:
// 1. Picked Interest → accepted
// 2. All other pending interests in the room → denied
// 3. Negotiation.accepted_investor_id set, status → pending_admin_close
// 4. Final terms saved on Negotiation
// 5. Pitch.status → in_negotiation (off the feed)
//
// Body: { finalAmount, finalEquityPct, finalTermsNote }
// ────────────────────────────────────────────────────────────────
router.put('/:id/accept', requireRole(['startup']), async (req, res, next) => {
  try {
    const interest = await prisma.interest.findUnique({
      where: { id: req.params.id },
      include: { pitch: true },
    })

    if (!interest) return res.status(404).json({ error: 'Interest not found' })
    if (interest.pitch.startupId !== req.user.id) {
      return res.status(403).json({ error: 'Not your pitch' })
    }
    if (interest.status !== 'pending') {
      return res.status(409).json({ error: 'This interest has already been responded to' })
    }

    const { finalAmount, finalEquityPct, finalTermsNote } = req.body

    // The big transaction
    await prisma.$transaction(async (tx) => {
      // 1. Accept the picked interest
      await tx.interest.update({
        where: { id: interest.id },
        data: { status: 'accepted', respondedAt: new Date() },
      })

      // 2. Deny all other pending interests in this pitch
      await tx.interest.updateMany({
        where: {
          pitchId: interest.pitchId,
          id: { not: interest.id },
          status: 'pending',
        },
        data: { status: 'denied', respondedAt: new Date() },
      })

      // 3. Update the negotiation room
      await tx.negotiation.update({
        where: { pitchId: interest.pitchId },
        data: {
          acceptedInvestorId: interest.investorId,
          status: 'pending_admin_close',
          finalAmount: finalAmount ? BigInt(finalAmount) : interest.proposedAmount,
          finalEquityPct: finalEquityPct ? parseFloat(finalEquityPct) : interest.proposedEquityPct,
          finalTermsNote: finalTermsNote || null,
        },
      })

      // 4. Pitch goes in_negotiation (off the feed)
      await tx.pitch.update({
        where: { id: interest.pitchId },
        data: { status: 'in_negotiation' },
      })
    })

    // After commit: notify winner
    await createNotification(
      interest.investorId,
      'interest_accepted',
      'Interest Accepted!',
      `Your interest in "${interest.pitch.title}" has been accepted.`,
      `/investor/interests`
    )

    // Notify losers (other denied investors)
    const deniedInterests = await prisma.interest.findMany({
      where: {
        pitchId: interest.pitchId,
        id: { not: interest.id },
        status: 'denied',
      },
      select: { investorId: true },
    })
    for (const denied of deniedInterests) {
      await createNotification(
        denied.investorId,
        'interest_denied',
        'Interest Denied',
        `Another investor was chosen for "${interest.pitch.title}".`,
        '/investor/interests'
      )
    }

    res.json({ message: 'Interest accepted — negotiation pending admin close' })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────
// PUT /api/interests/:id/deny — startup removes one investor
// ────────────────────────────────────────────────────────────────
router.put('/:id/deny', requireRole(['startup']), async (req, res, next) => {
  try {
    const interest = await prisma.interest.findUnique({
      where: { id: req.params.id },
      include: { pitch: true },
    })

    if (!interest) return res.status(404).json({ error: 'Interest not found' })
    if (interest.pitch.startupId !== req.user.id) {
      return res.status(403).json({ error: 'Not your pitch' })
    }
    if (interest.status !== 'pending') {
      return res.status(409).json({ error: 'This interest has already been responded to' })
    }

    await prisma.interest.update({
      where: { id: interest.id },
      data: { status: 'denied', respondedAt: new Date() },
    })

    await createNotification(
      interest.investorId,
      'interest_denied',
      'Interest Denied',
      `Your interest in "${interest.pitch.title}" was not accepted.`,
      '/investor/interests'
    )

    res.json({ message: 'Interest denied' })
  } catch (err) {
    next(err)
  }
})

export default router
