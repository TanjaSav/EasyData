import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
  getAppMeta,
  getFreeStorageQuotaBytes,
  getPaidStorageQuotaBytes,
} from "./app.service.js";

export const uploadDir = process.env.UPLOAD_DIR || "./uploads";

const defaultSignedUrlTtlSeconds = 60 * 60;

function getUploadDirPath() {
  return path.resolve(uploadDir);
}

export function getAppStorageQuotaBytes(appId?: string) {
  if (!appId) {
    return getFreeStorageQuotaBytes();
  }

  const app = getAppMeta(appId);

  if (app.billing.paymentStatus === "active" && app.billing.plan === "paid_storage") {
    return getPaidStorageQuotaBytes();
  }

  return getFreeStorageQuotaBytes();
}

export function getSignedUrlTtlSeconds() {
  const configured = Number(process.env.FILE_VIEW_URL_TTL_SECONDS);

  if (Number.isInteger(configured) && configured > 0) {
    return configured;
  }

  return defaultSignedUrlTtlSeconds;
}

export function createStoredFileName(appId: string, originalName: string) {
  const ext = path.extname(originalName).toLowerCase();
  return `${appId}-${crypto.randomBytes(16).toString("hex")}${ext}`;
}

export function getAppStorageUsageBytes(appId: string) {
  if (!fs.existsSync(uploadDir)) {
    return 0;
  }

  const prefix = `${appId}-`;
  let total = 0;

  for (const fileName of fs.readdirSync(uploadDir)) {
    if (!fileName.startsWith(prefix)) {
      continue;
    }

    const filePath = path.join(uploadDir, fileName);
    const stat = fs.statSync(filePath);

    if (stat.isFile()) {
      total += stat.size;
    }
  }

  return total;
}

export function deleteStoredFile(fileName: string) {
  const filePath = path.join(uploadDir, fileName);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}


export function deleteStoredFilesForApp(appId: string) {
  if (!fs.existsSync(uploadDir)) {
    return 0;
  }

  const prefix = `${appId}-`;
  let deletedCount = 0;

  for (const fileName of fs.readdirSync(uploadDir)) {
    if (!fileName.startsWith(prefix)) {
      continue;
    }

    const filePath = path.join(uploadDir, fileName);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      fs.unlinkSync(filePath);
      deletedCount += 1;
    }
  }

  return deletedCount;
}

function signFileUrl(appId: string, fileName: string, expiresAt: number) {
  const app = getAppMeta(appId);

  return crypto
    .createHmac("sha256", app.apiToken)
    .update(`${appId}:${fileName}:${expiresAt}`)
    .digest("hex");
}

export function createSignedFileUrl(appId: string, fileName: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + getSignedUrlTtlSeconds();
  const signature = signFileUrl(appId, fileName, expiresAt);

  return `/apps/${appId}/files/${encodeURIComponent(
    fileName
  )}/view?expires=${expiresAt}&signature=${signature}`;
}

export function resolveSignedFilePath(
  appId: string,
  fileName: string,
  expiresRaw: unknown,
  signatureRaw: unknown
) {
  if (!fileName.startsWith(`${appId}-`) || fileName.includes("/") || fileName.includes("\\")) {
    throw new Error("File not found");
  }

  const expiresAt = Number(expiresRaw);
  const signature = String(signatureRaw ?? "");

  if (!Number.isInteger(expiresAt) || !signature) {
    throw new Error("Missing or invalid file access signature");
  }

  if (expiresAt < Math.floor(Date.now() / 1000)) {
    throw new Error("File access link has expired");
  }

  const expected = signFileUrl(appId, fileName, expiresAt);
  const provided = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (
    provided.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(provided, expectedBuffer)
  ) {
    throw new Error("Invalid file access signature");
  }

  const uploadRoot = getUploadDirPath();
  const filePath = path.resolve(uploadRoot, fileName);

  if (!filePath.startsWith(`${uploadRoot}${path.sep}`) || !fs.existsSync(filePath)) {
    throw new Error("File not found");
  }

  return filePath;
}
