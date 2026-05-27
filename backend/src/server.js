import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import authRoutes from './routes/auth.js'
import pitchRoutes from './routes/pitches.js'
import interestRoutes from './routes/interests.js'
import investorPitchRoutes from './routes/investor/pitches.js'
import investorInterestRoutes from './routes/investor/interests.js'
import fileRoutes from './routes/files.js'
import notificationRoutes from './routes/notifications.js'
import { errorHandler } from './middleware/errorHandler.js'

dotenv.config()

// Validate required env vars at startup — fail fast if missing
if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET is missing in .env')
  process.exit(1)
}

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const app = express()

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL }))
app.use(express.json())

// Health check — visit http://localhost:4000/api/health to confirm server is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Routes (added phase by phase)
app.use('/api/auth', authRoutes)
app.use('/api/pitches', pitchRoutes)
app.use('/api/interests', interestRoutes)
app.use('/api/investor/pitches', investorPitchRoutes)
app.use('/api/investor/interests', investorInterestRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/notifications', notificationRoutes)

// Error handler — MUST be last
app.use(errorHandler)

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
