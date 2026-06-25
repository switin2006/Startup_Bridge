import express from 'express'
import prisma from '../prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireApproved } from '../middleware/requireApproved.js'
import { createNotification } from '../lib/notify.js'

const router = express.Router()

router.use(requireAuth, requireApproved)

// ────────────────────────────────────────────────────────────────
// GET /api/messages — retrieve messages in a negotiation room
// Query: ?negotiationId=xxx&since=timestamp
// ────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { negotiationId, since } = req.query

    if (!negotiationId) {
      return res.status(400).json({ error: 'negotiationId is required' })
    }

    const negotiation = await prisma.negotiation.findUnique({
      where: { id: negotiationId },
      include: { interests: true }
    })

    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation room not found' })
    }

    // Check auth
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

    const where = { negotiationId }
    if (since) {
      where.createdAt = { gt: new Date(since) }
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: { select: { id: true, name: true, role: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    res.json({ messages })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────
// POST /api/messages — post a message inside a negotiation room
// ────────────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { negotiationId, content } = req.body

    if (!negotiationId || !content || !content.trim()) {
      return res.status(400).json({ error: 'negotiationId and non-empty content are required' })
    }

    const negotiation = await prisma.negotiation.findUnique({
      where: { id: negotiationId },
      include: {
        pitch: true,
        interests: true
      }
    })

    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation room not found' })
    }

    // Check auth
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
      return res.status(403).json({ error: 'Access denied' })
    }

    const message = await prisma.message.create({
      data: {
        negotiationId,
        senderId: req.user.id,
        content: content.trim()
      },
      include: {
        sender: { select: { id: true, name: true, role: true } }
      }
    })

    // Send notifications to other participants asynchronously
    try {
      if (req.user.role === 'startup') {
        // Founder messaged -> Notify all active investors in the room
        for (const interest of negotiation.interests) {
          if (interest.status === 'pending' || interest.status === 'accepted') {
            await createNotification(
              interest.investorId,
              'message_new',
              'New Message from Founder',
              `Founder of "${negotiation.pitch.title}" sent a message in the chat room.`,
              `/negotiation/${negotiation.id}`
            )
          }
        }
      } else if (req.user.role === 'investor') {
        // Investor messaged -> Notify the startup founder
        await createNotification(
          negotiation.startupId,
          'message_new',
          'New Message from Investor',
          `${req.user.name} sent a message in the negotiation room for "${negotiation.pitch.title}".`,
          `/negotiation/${negotiation.id}`
        )
      }
    } catch (notifyErr) {
      console.error('[NOTIFY-ERR] Failed to send message notifications:', notifyErr)
    }

    res.status(201).json({ message })
  } catch (err) {
    next(err)
  }
})

export default router
