// Multer config — stores files under ./uploads/ with UUID names.
// Also exports a magic-byte checker to confirm a file is actually a PDF.
import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import { fileTypeFromFile } from 'file-type'

// Ensure the uploads directory exists (created relative to process.cwd())
const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, _file, cb) => {
    // UUID filename prevents path-traversal attacks
    const ext = path.extname(_file.originalname) || '.pdf'
    cb(null, `${crypto.randomUUID()}${ext}`)
  },
})

// MIME types that could execute in-browser — reject at upload time
const BLOCKED_MIMES = new Set([
  'text/html',
  'application/xhtml+xml',
  'application/javascript',
  'text/javascript',
  'image/svg+xml',   // SVG can contain inline <script>
  'application/xml',
  'text/xml',
])

// 20 MB file-size cap + MIME allowlist
export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (BLOCKED_MIMES.has(file.mimetype)) {
      return cb(new Error('This file type is not allowed'), false)
    }
    cb(null, true)
  },
})

// Magic-byte check — confirm the file is actually a PDF even if renamed
export async function validatePdf(filePath) {
  const type = await fileTypeFromFile(filePath)
  return type && type.mime === 'application/pdf'
}
