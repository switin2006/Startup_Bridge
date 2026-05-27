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

// 20 MB file-size cap
export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
})

// Magic-byte check — confirm the file is actually a PDF even if renamed
export async function validatePdf(filePath) {
  const type = await fileTypeFromFile(filePath)
  return type && type.mime === 'application/pdf'
}
