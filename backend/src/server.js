import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import { errorHandler } from './middleware/errorHandler.js'

dotenv.config()

// Validate required env vars at startup — fail fast if missing
if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET is missing in .env')
  process.exit(1)
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

// Error handler — MUST be last
app.use(errorHandler)

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
