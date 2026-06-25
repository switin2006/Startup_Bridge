import express from 'express'
import { z } from 'zod'
import prisma from '../prisma.js'

import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { requireApproved } from '../middleware/requireApproved.js'
import { createNotification } from '../lib/notify.js'

// ────────────────────────────────────────────────────────────────
// Zod schemas
// ────────────────────────────────────────────────────────────────
const acceptInterestSchema = z.object({
  finalAmount: z.union([
    z.string().regex(/^\d+$/, 'finalAmount must be a numeric string'),
    z.number().int().positive()
  ]).optional().refine(
    val => val === undefined || BigInt(val) > 0n,
    { message: 'finalAmount must be a positive number' }
  ),
  finalEquityPct: z.number({ coerce: true })
    .gt(0, 'finalEquityPct must be greater than 0')
    .lte(100, 'finalEquityPct must be at most 100')
    .optional(),
  finalTermsNote: z.string().max(2000, 'finalTermsNote cannot exceed 2000 characters').optional()
})

const denyInterestSchema = z.object({
  reason: z.string().max(500).optional()
})

const router = express.Router()

router.use(requireAuth, requireApproved, requireRole(['startup']))

// Helper to serialize BigInt
function serializePitch(pitch) {
  if (!pitch) return null
  return {
    ...pitch,
    fundingAmount: pitch.fundingAmount.toString(),
    ...(pitch.deckFile && {
      deckFile: {
        ...pitch.deckFile,
        sizeBytes: pitch.deckFile.sizeBytes ? pitch.deckFile.sizeBytes.toString() : undefined
      }
    }),
    ...(pitch.interests && {
      interests: pitch.interests.map(i => ({
        ...i,
        proposedAmount: i.proposedAmount.toString(),
        investor: i.investor ? { id: i.investor.id, name: i.investor.name, email: i.investor.email } : undefined
      }))
    })
  }
}

// ======================
// DASHBOARD
// ======================
router.get('/dashboard', async (req, res, next) => {
  try {
    const startupId = req.user.id

    const totalPitches = await prisma.pitch.count({
      where: { startupId }
    })

    const published = await prisma.pitch.count({
      where: { startupId, status: 'published' }
    })

    const interests = await prisma.interest.count({
      where: { pitch: { startupId } }
    })

    const negotiations = await prisma.negotiation.count({
      where: { startupId }
    })

    const recentPitches = await prisma.pitch.findMany({
      where: { startupId },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    res.json({
      stats: {
        totalPitches,
        published,
        interests,
        negotiations
      },
      recentPitches: recentPitches.map(p => serializePitch(p))
    })
  } catch (err) {
    next(err)
  }
})

// ======================
// CREATE PITCH
// ======================
router.post('/pitches', async (req, res, next) => {
  try {
    const startupId = req.user.id
    const { title, problem, solution, fundingAmount, equityPercent, domain, deckFileId } = req.body

    if (!title || !problem || !solution || !fundingAmount || !equityPercent || !domain) {
      return res.status(400).json({ error: 'title, problem, solution, fundingAmount, equityPercent, and domain are required' })
    }

    // deckFileId ownership check: file must belong to this user and be a pitch_deck
    if (deckFileId) {
      const deckFile = await prisma.file.findUnique({ where: { id: deckFileId } })
      if (!deckFile || deckFile.ownerUserId !== startupId) {
        return res.status(403).json({ error: 'You do not own this file' })
      }
      if (deckFile.scope !== 'pitch_deck') {
        return res.status(400).json({ error: 'File must be a pitch_deck upload' })
      }
    }

    // Business rule: no new pitch while an active negotiation exists
    const activeNegotiation = await prisma.negotiation.findFirst({
      where: {
        startupId,
        status: { in: ['open', 'pending_admin_close'] }
      }
    })

    if (activeNegotiation) {
      return res.status(409).json({ error: 'You cannot create a new pitch while you have an active negotiation' })
    }

    const pitch = await prisma.pitch.create({
      data: {
        startupId,
        title,
        problem,
        solution,
        fundingAmount: BigInt(fundingAmount),
        equityPercent: parseFloat(equityPercent),
        domain,
        deckFileId: deckFileId || null,
        status: 'draft'
      }
    })

    res.status(201).json(serializePitch(pitch))
  } catch (err) {
    next(err)
  }
})

// ======================
// GET MY PITCHES
// ======================
router.get('/pitches', async (req, res, next) => {
  try {
    const pitches = await prisma.pitch.findMany({
      where: { startupId: req.user.id },
      include: {
        deckFile: { select: { id: true, originalName: true } },
        _count: { select: { interests: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json(pitches.map(p => ({
      ...p,
      fundingAmount: p.fundingAmount.toString()
    })))
  } catch (err) {
    next(err)
  }
})

// ======================
// GET SINGLE PITCH
// ======================
router.get('/pitches/:id', async (req, res, next) => {
  try {
    const pitch = await prisma.pitch.findFirst({
      where: {
        id: req.params.id,
        startupId: req.user.id
      },
      include: {
        deckFile: true,
        interests: {
          include: {
            investor: true
          }
        }
      }
    })

    if (!pitch) {
      return res.status(404).json({ error: 'Pitch not found' })
    }

    res.json(serializePitch(pitch))
  } catch (err) {
    next(err)
  }
})

// ======================
// UPDATE PITCH
// ======================
router.put('/pitches/:id', async (req, res, next) => {
  try {
    const pitch = await prisma.pitch.findFirst({
      where: {
        id: req.params.id,
        startupId: req.user.id
      }
    })

    if (!pitch) {
      return res.status(404).json({ error: 'Pitch not found' })
    }

    if (!['draft', 'published'].includes(pitch.status)) {
      return res.status(409).json({ error: 'Cannot edit a pitch that is in negotiation, closed or withdrawn' })
    }

    // If published, check no accepted interest exists
    if (pitch.status === 'published') {
      const acceptedInterest = await prisma.interest.findFirst({
        where: { pitchId: pitch.id, status: 'accepted' }
      })
      if (acceptedInterest) {
        return res.status(409).json({ error: 'Cannot edit — an interest has been accepted' })
      }
    }

    const { title, problem, solution, fundingAmount, equityPercent, domain, deckFileId } = req.body

    // deckFileId ownership check: file must belong to this user and be a pitch_deck
    if (deckFileId) {
      const deckFile = await prisma.file.findUnique({ where: { id: deckFileId } })
      if (!deckFile || deckFile.ownerUserId !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this file' })
      }
      if (deckFile.scope !== 'pitch_deck') {
        return res.status(400).json({ error: 'File must be a pitch_deck upload' })
      }
    }

    const dataToUpdate = {}
    if (title !== undefined) dataToUpdate.title = title
    if (problem !== undefined) dataToUpdate.problem = problem
    if (solution !== undefined) dataToUpdate.solution = solution
    if (fundingAmount !== undefined) dataToUpdate.fundingAmount = BigInt(fundingAmount)
    if (equityPercent !== undefined) dataToUpdate.equityPercent = parseFloat(equityPercent)
    if (domain !== undefined) dataToUpdate.domain = domain
    if (deckFileId !== undefined) dataToUpdate.deckFileId = deckFileId || null

    const updated = await prisma.pitch.update({
      where: { id: pitch.id },
      data: dataToUpdate
    })

    res.json(serializePitch(updated))
  } catch (err) {
    next(err)
  }
})

// ======================
// DELETE PITCH
// ======================
router.delete('/pitches/:id', async (req, res, next) => {
  try {
    const pitch = await prisma.pitch.findFirst({
      where: {
        id: req.params.id,
        startupId: req.user.id
      }
    })

    if (!pitch) {
      return res.status(404).json({ error: 'Pitch not found' })
    }

    if (!['draft', 'withdrawn'].includes(pitch.status)) {
      return res.status(409).json({ error: 'Cannot delete an active pitch' })
    }

    await prisma.pitch.delete({
      where: { id: req.params.id }
    })

    res.json({ message: 'Deleted' })
  } catch (err) {
    next(err)
  }
})

// ======================
// PUBLISH PITCH
// ======================
router.post('/pitches/:id/publish', async (req, res, next) => {
  try {
    const pitch = await prisma.pitch.findFirst({ where: { id: req.params.id, startupId: req.user.id } })
    if (!pitch) return res.status(404).json({ error: 'Pitch not found' })
    if (pitch.status !== 'draft') return res.status(409).json({ error: 'Only draft pitches can be published' })
    const updated = await prisma.pitch.update({
      where: { id: pitch.id },
      data: { status: 'published', publishedAt: new Date() },
    })
    res.json(updated)
  } catch (err) { next(err) }
})

// ======================
// WITHDRAW PITCH
// ======================
router.post('/pitches/:id/withdraw', async (req, res, next) => {
  try {
    const pitch = await prisma.pitch.findFirst({
      where: { id: req.params.id, startupId: req.user.id },
      include: { interests: { where: { status: 'pending' }, select: { id: true, investorId: true } } },
    })
    if (!pitch) return res.status(404).json({ error: 'Pitch not found' })
    if (!['draft', 'published'].includes(pitch.status)) {
      return res.status(409).json({ error: 'Cannot withdraw a pitch already in negotiation or closed' })
    }
    await prisma.$transaction(async (tx) => {
      await tx.pitch.update({ where: { id: pitch.id }, data: { status: 'withdrawn' } })
      if (pitch.interests.length > 0) {
        await tx.interest.updateMany({
          where: { pitchId: pitch.id, status: 'pending' },
          data: { status: 'denied', respondedAt: new Date() },
        })
      }
    })
    for (const interest of pitch.interests) {
      await createNotification(
        interest.investorId, 'interest_denied', 'Pitch Withdrawn',
        `The pitch "${pitch.title}" has been withdrawn.`, '/investor/interests'
      )
    }
    res.json({ message: 'Pitch withdrawn' })
  } catch (err) { next(err) }
})

// ======================
// ACCEPT INTEREST (Finalize Deal & Enter Pending Close)
// ======================
router.post('/interests/:id/accept', async (req, res, next) => {
  try {
    // Zod validation with range checks
    const parsed = acceptInterestSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
      })
    }

    const interest = await prisma.interest.findUnique({
      where: { id: req.params.id },
      include: { pitch: true }
    })

    if (!interest || interest.pitch.startupId !== req.user.id) {
      return res.status(403).json({ error: 'Access Denied / Not your interest' })
    }

    if (interest.status !== 'pending') {
      return res.status(409).json({ error: 'This interest has already been responded to' })
    }

    const { finalAmount, finalEquityPct, finalTermsNote } = parsed.data

    // Perform transaction matching the group negotiation model (Phase 5)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Accept the chosen interest
      await tx.interest.update({
        where: { id: interest.id },
        data: { status: 'accepted', respondedAt: new Date() }
      })

      // 2. Deny all other pending interests on this pitch
      await tx.interest.updateMany({
        where: {
          pitchId: interest.pitchId,
          id: { not: interest.id },
          status: 'pending'
        },
        data: { status: 'denied', respondedAt: new Date() }
      })

      // 3. Update the negotiation room to pending close and save final agreed terms
      const updatedNegotiation = await tx.negotiation.update({
        where: { pitchId: interest.pitchId },
        data: {
          acceptedInvestorId: interest.investorId,
          status: 'pending_admin_close',
          finalAmount: finalAmount ? BigInt(finalAmount) : interest.proposedAmount,
          finalEquityPct: finalEquityPct ? parseFloat(finalEquityPct) : interest.proposedEquityPct,
          finalTermsNote: finalTermsNote || null
        }
      })

      // 4. Update the Pitch status
      await tx.pitch.update({
        where: { id: interest.pitchId },
        data: { status: 'in_negotiation' }
      })

      return updatedNegotiation
    })

    // 5. Send notifications
    await createNotification(
      interest.investorId,
      'interest_accepted',
      'Interest Accepted!',
      `Your interest in "${interest.pitch.title}" has been accepted under finalized terms.`,
      '/investor/interests'
    )

    // Notify other denied investors
    const deniedInterests = await prisma.interest.findMany({
      where: {
        pitchId: interest.pitchId,
        id: { not: interest.id },
        status: 'denied'
      },
      select: { investorId: true }
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

    res.json({
      negotiation: {
        ...result,
        finalAmount: result.finalAmount.toString()
      }
    })
  } catch (err) {
    next(err)
  }
})

// ======================
// DENY/REJECT INTEREST
// ======================
router.post('/interests/:id/deny', async (req, res, next) => {
  try {
    // Zod validation
    const parsed = denyInterestSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
      })
    }

    const interest = await prisma.interest.findUnique({
      where: { id: req.params.id },
      include: { pitch: true }
    })

    if (!interest || interest.pitch.startupId !== req.user.id) {
      return res.status(403).json({ error: 'Access Denied / Not your interest' })
    }

    if (interest.status !== 'pending') {
      return res.status(409).json({ error: 'This interest has already been responded to' })
    }

    await prisma.interest.update({
      where: { id: interest.id },
      data: {
        status: 'denied',
        respondedAt: new Date()
      }
    })

    // Send notification to investor
    await createNotification(
      interest.investorId,
      'interest_denied',
      'Interest Rejected',
      `Your interest in "${interest.pitch.title}" was not accepted.`,
      '/investor/interests'
    )

    res.json({ message: 'Interest rejected successfully' })
  } catch (err) {
    next(err)
  }
})

// ======================
// NEGOTIATIONS
// ======================
router.get('/negotiations', async (req, res, next) => {
  try {
    const negotiations = await prisma.negotiation.findMany({
      where: { startupId: req.user.id },
      include: {
        pitch: true,
        acceptedInvestor: true
      },
      orderBy: { openedAt: 'desc' }
    })

    res.json(negotiations.map(n => ({
      ...n,
      finalAmount: n.finalAmount ? n.finalAmount.toString() : null,
      pitch: n.pitch ? {
        ...n.pitch,
        fundingAmount: n.pitch.fundingAmount.toString()
      } : null
    })))
  } catch (err) {
    next(err)
  }
})

export default router