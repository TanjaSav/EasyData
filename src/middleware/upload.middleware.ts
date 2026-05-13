import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const uploadDir = process.env.UPLOAD_DIR || "./uploads";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);

    const fileName =
      crypto.randomBytes(16).toString("hex") + ext;

    cb(null, fileName);
  },
});

export const upload = multer({
  storage,
});
