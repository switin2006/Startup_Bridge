// Notification routes — list + mark read
// Person A can extend this later (NotificationBell etc.)
import express from 'express'
import prisma from '../prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireApproved } from '../middleware/requireApproved.js'

const router = express.Router()

router.use(requireAuth, requireApproved)

// ────────────────────────────────────────────────────────────────
// GET /api/notifications?unread=true — current user's notifications
// ────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const where = { userId: req.user.id }
    if (req.query.unread === 'true') where.isRead = false

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    res.json({ notifications })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────
// PUT /api/notifications/:id/read — mark single notification read
// ────────────────────────────────────────────────────────────────
router.put('/:id/read', async (req, res, next) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    })
    if (!notification) return res.status(404).json({ error: 'Notification not found' })
    if (notification.userId !== req.user.id) return res.status(403).json({ error: 'Not your notification' })

    await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    })
    res.json({ message: 'Marked as read' })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────
// PUT /api/notifications/read-all — mark all notifications read
// ────────────────────────────────────────────────────────────────
router.put('/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    })
    res.json({ message: 'All notifications marked as read' })
  } catch (err) {
    next(err)
  }
})

export default router
