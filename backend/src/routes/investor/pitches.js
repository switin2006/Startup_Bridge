import express from 'express'
import prisma from '../../prisma.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { requireApproved } from '../../middleware/requireApproved.js'
import { requireRole } from '../../middleware/requireRole.js'

const router = express.Router()

// Investor pitch routes require auth + approved + investor role
router.use(requireAuth, requireApproved, requireRole(['investor']))

// ────────────────────────────────────────────────────────────────
// GET /api/investor/pitches — investor browses published pitches
// ────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { domain, q } = req.query

    const where = { status: 'published' }
    if (domain) where.domain = domain
    if (q) {
      where.title = { contains: q, mode: 'insensitive' }
    }

    const pitches = await prisma.pitch.findMany({
      where,
      select: {
        id: true,
        title: true,
        domain: true,
        fundingAmount: true,
        equityPercent: true,
        publishedAt: true,
        startup: { select: { id: true, name: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 50,
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
// GET /api/investor/pitches/:id — full detail for investor
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

    let hasInterest = false
    const interest = await prisma.interest.findUnique({
      where: {
        pitchId_investorId: {
          pitchId: pitch.id,
          investorId: req.user.id,
        },
      },
    })
    if (interest) hasInterest = true

    return res.json({ pitch: pitchResponse, hasInterest })
  } catch (err) {
    next(err)
  }
})

export default router
