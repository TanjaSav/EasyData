import multer from "multer";
import path from "path";
import fs from "fs";
import {
  createStoredFileName,
  getAppStorageQuotaBytes,
  uploadDir,
} from "../services/file.service.js";
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
    const fileName = createStoredFileName(
      req.params.id as string,
      file.originalname
    );

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

export function validateUploadedFileMagic(filePath: string, mimetype: string) {
  const header = fs.readFileSync(filePath).subarray(0, 16);

  const matches =
    (mimetype === "image/png" &&
      header.length >= 8 &&
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47 &&
      header[4] === 0x0d &&
      header[5] === 0x0a &&
      header[6] === 0x1a &&
      header[7] === 0x0a) ||
    (mimetype === "image/jpeg" &&
      header.length >= 3 &&
      header[0] === 0xff &&
      header[1] === 0xd8 &&
      header[2] === 0xff) ||
    (mimetype === "application/pdf" && header.subarray(0, 4).toString() === "%PDF") ||
    (mimetype === "image/webp" &&
      header.length >= 12 &&
      header.subarray(0, 4).toString() === "RIFF" &&
      header.subarray(8, 12).toString() === "WEBP");

  if (!matches) {
    throw new Error("File content does not match the declared file type.");
  }
}

export const uploadConfig = {
  maxFileSizeBytes,
  appStorageQuotaBytes: getAppStorageQuotaBytes(),
  allowedMimeTypes: Array.from(allowedMimeTypes),
  allowedExtensions: Array.from(allowedExtensions),
};
