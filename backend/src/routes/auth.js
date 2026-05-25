import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = express.Router()

// POST /api/auth/register
// Body: { name, email, password, role, contact_phone }
// Creates a User with status='pending'. Admin must approve before login works.
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role, contact_phone } = req.body

    // Basic validation (plain JS checks — no Zod in v1)
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password and role are required' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    // Admins are seeded only — you cannot self-register as admin
    if (!['investor', 'startup'].includes(role)) {
      return res.status(400).json({ error: 'Role must be investor or startup' })
    }

    // Email must be unique
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    // Hash the password — bcrypt auto-generates a unique salt per password (cost 10)
    const passwordHash = await bcrypt.hash(password, 10)

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        status: 'pending',
        contactPhone: contact_phone || null,
      },
    })

    res.status(201).json({ message: 'Registration successful — awaiting admin approval' })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/login
// Body: { email, password }
// Verifies credentials, checks status, returns a JWT valid for 7 days.
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    // Same generic message whether email or password is wrong (don't leak which)
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Status gate
    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Your account is awaiting admin approval' })
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended' })
    }

    // Sign the JWT — payload is minimal (no email, no name)
    const token = jwt.sign(
      { id: user.id, role: user.role, status: user.status },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    )

    // Never send the password hash to the client
    const { passwordHash, ...safeUser } = user
    res.json({ token, user: safeUser })
  } catch (err) {
    next(err)
  }
})

// GET /api/auth/me
// Requires a valid JWT. Returns the current user, freshly read from the DB.
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    const { passwordHash, ...safeUser } = user
    res.json({ user: safeUser })
  } catch (err) {
    next(err)
  }
})

export default router
