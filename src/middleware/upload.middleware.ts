import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const uploadDir = process.env.UPLOAD_DIR || "./uploads";
const maxFileSizeBytes = 5 * 1024 * 1024;

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);

// Ensures the local upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Stores uploaded files on local disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  // Generates a safe random filename while preserving the original extension
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const fileName = crypto.randomBytes(16).toString("hex") + ext;

    cb(null, fileName);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSizeBytes,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(ext)) {
      cb(
        new Error(
          "Unsupported file type. Allowed types: JPG, PNG, WebP, and PDF."
        )
      );
      return;
    }

    cb(null, true);
  },
});

export const uploadConfig = {
  maxFileSizeBytes,
  allowedMimeTypes: Array.from(allowedMimeTypes),
  allowedExtensions: Array.from(allowedExtensions),
};
