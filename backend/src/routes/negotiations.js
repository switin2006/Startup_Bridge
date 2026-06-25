import express from 'express'
import prisma from '../prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireApproved } from '../middleware/requireApproved.js'

const router = express.Router()

router.use(requireAuth, requireApproved)

// Helper to serialize BigInt in negotiation details
function serializeNegotiation(n) {
  if (!n) return null
  return {
    ...n,
    finalAmount: n.finalAmount ? n.finalAmount.toString() : null,
    pitch: n.pitch ? {
      ...n.pitch,
      fundingAmount: n.pitch.fundingAmount.toString()
    } : null,
    interests: n.interests ? n.interests.map(i => ({
      ...i,
      proposedAmount: i.proposedAmount.toString(),
      investor: i.investor ? { id: i.investor.id, name: i.investor.name, email: i.investor.email } : null
    })) : []
  }
}

// ────────────────────────────────────────────────────────────────
// GET /api/negotiations/mine — user's negotiations
// ────────────────────────────────────────────────────────────────
router.get('/mine', async (req, res, next) => {
  try {
    const userId = req.user.id
    let where = {}

    if (req.user.role === 'startup') {
      where = { startupId: userId }
    } else if (req.user.role === 'investor') {
      where = {
        interests: {
          some: {
            investorId: userId,
            status: { in: ['pending', 'accepted'] }
          }
        }
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' })
    }

    const negotiations = await prisma.negotiation.findMany({
      where,
      include: {
        pitch: true,
        startup: { select: { id: true, name: true, email: true } },
        acceptedInvestor: { select: { id: true, name: true, email: true } }
      },
      orderBy: { openedAt: 'desc' }
    })

    res.json({
      negotiations: negotiations.map(n => serializeNegotiation(n))
    })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────
// GET /api/negotiations/:id — details
// ────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const negotiation = await prisma.negotiation.findUnique({
      where: { id: req.params.id },
      include: {
        pitch: true,
        startup: { select: { id: true, name: true, email: true } },
        acceptedInvestor: { select: { id: true, name: true, email: true } },
        interests: {
          include: {
            investor: { select: { id: true, name: true, email: true } }
          }
        }
      }
    })

    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation room not found' })
    }

    // Auth check
    let allowed = req.user.role === 'admin'
    if (!allowed && req.user.role === 'startup') {
      allowed = negotiation.startupId === req.user.id
    }
    if (!allowed && req.user.role === 'investor') {
      allowed = negotiation.interests.some(
        i => i.investorId === req.user.id && (i.status === 'pending' || i.status === 'accepted')
      )
    }

    if (!allowed) {
      return res.status(403).json({ error: 'Access denied to this negotiation' })
    }

    res.json({
      negotiation: serializeNegotiation(negotiation)
    })
  } catch (err) {
    next(err)
  }
})

export default router
