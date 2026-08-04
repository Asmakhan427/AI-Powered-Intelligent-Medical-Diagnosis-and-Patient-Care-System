// ============================================
// Upload middleware - multer configuration
// --------------------------------------------
// Handles multipart/form-data uploads (medical report scans, avatars).
// - Disk storage under UPLOAD_DIR with collision-safe filenames.
// - MIME allow-list (images + PDF) and a size cap from env.
// - Ready-to-mount helpers: uploadSingle / uploadMultiple.
//
// Rejected files surface a 400 via the centralized error handler (multer's
// MulterError is caught there through the AppError translation path below).
// ============================================
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer, { FileFilterCallback, MulterError } from 'multer';
import { Request } from 'express';
import AppError from '../utils/AppError';
import { UPLOAD_DIR, MAX_UPLOAD_BYTES } from '../config/env';
import { ALLOWED_UPLOAD_MIME_TYPES } from '../utils/constants';

const uploadRoot = path.resolve(UPLOAD_DIR);

// Ensure the destination exists at boot (multer won't create it).
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    // <timestamp-free random>-<sanitized original>.<ext> — avoids collisions
    // without leaking the client's full original path.
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);
    const unique = crypto.randomBytes(8).toString('hex');
    cb(null, `${base || 'file'}-${unique}${ext}`);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  if ((ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Passing an error rejects the file; translated to 400 downstream.
    cb(new AppError(400, `Unsupported file type: ${file.mimetype}`));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 5,
  },
});

/**
 * Single-file upload. `field` defaults to "file".
 * Usage: router.post('/report', uploadSingle('scan'), handler)
 */
export const uploadSingle = (field = 'file') => upload.single(field);

/**
 * Multiple-file upload (same field). `maxCount` defaults to 5.
 * Usage: router.post('/reports', uploadMultiple('scans', 3), handler)
 */
export const uploadMultiple = (field = 'files', maxCount = 5) => upload.array(field, maxCount);

/**
 * Re-export so routes can translate multer's own size/count errors if they
 * want a custom message; the global error handler already renders MulterError
 * generically.
 */
export { MulterError };
export default upload;
