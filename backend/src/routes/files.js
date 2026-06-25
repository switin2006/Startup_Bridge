// File routes — upload (multer + magic-byte check) and authenticated download
// Person B owns this file.
import express from 'express'
import fs from 'fs'
import path from 'path'
import prisma from '../prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireApproved } from '../middleware/requireApproved.js'
import { upload, validatePdf } from '../lib/upload.js'

const router = express.Router()

router.use(requireAuth, requireApproved)

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// ────────────────────────────────────────────────────────────────
// POST /api/files — upload a file
// Query: ?scope=pitch_deck | proof_of_funds | misc
// Returns { id } of the created File row.
// ────────────────────────────────────────────────────────────────
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const scope = req.query.scope || 'misc'

    // For pitch_deck and proof_of_funds, enforce PDF-only via magic-byte check
    if (['pitch_deck', 'proof_of_funds'].includes(scope)) {
      const isPdf = await validatePdf(req.file.path)
      if (!isPdf) {
        // Delete the invalid file
        fs.unlinkSync(req.file.path)
        return res.status(400).json({ error: 'Only PDF files are allowed for this upload type' })
      }
    }

    const file = await prisma.file.create({
      data: {
        ownerUserId: req.user.id,
        storageKey: req.file.filename,
        originalName: req.file.originalname,
        mime: req.file.mimetype,
        sizeBytes: BigInt(req.file.size),
        scope,
      },
    })

    res.status(201).json({ id: file.id })
  } catch (err) {
    next(err)
  }
})

// ────────────────────────────────────────────────────────────────
// GET /api/files/:id — stream file
// Auth: owner, or investor-with-interest viewing pitch deck, or admin
// ────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const file = await prisma.file.findUnique({ where: { id: req.params.id } })
    if (!file) return res.status(404).json({ error: 'File not found' })

    // Owner can always access
    let allowed = file.ownerUserId === req.user.id

    // Admin can access any file
    if (!allowed && req.user.role === 'admin') allowed = true

    // Investor with an active interest can access the pitch deck
    if (!allowed && req.user.role === 'investor' && file.scope === 'pitch_deck') {
      const pitch = await prisma.pitch.findFirst({ where: { deckFileId: file.id } })
      if (pitch) {
        const interest = await prisma.interest.findUnique({
          where: { pitchId_investorId: { pitchId: pitch.id, investorId: req.user.id } },
        })
        if (interest && interest.status !== 'denied') allowed = true
      }
    }

    if (!allowed) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const filePath = path.join(UPLOAD_DIR, file.storageKey)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' })
    }

    res.setHeader('Content-Type', file.mime)
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`)
    fs.createReadStream(filePath).pipe(res)
  } catch (err) {
    next(err)
  }
})

export default router
