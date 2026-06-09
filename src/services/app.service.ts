import fs from "fs";
import path from "path";
import crypto from "crypto";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { type BillingPlan, type EasyDataApp, type RetentionPolicy } from "../types/app.types.js";
const DATA_DIR = process.env.DATA_DIR || "./data/apps";

const defaultAppStorageQuotaBytes = 50 * 1024 * 1024;
const defaultPaidStorageQuotaBytes = 1024 * 1024 * 1024;

function getDbPath(appId: string) {
  return path.join(DATA_DIR, appId + ".sqlite");
}

export function getFreeStorageQuotaBytes() {
  const configured = Number(process.env.APP_STORAGE_QUOTA_BYTES);

  if (Number.isInteger(configured) && configured > 0) {
    return configured;
  }

  return defaultAppStorageQuotaBytes;
}

export function getPaidStorageQuotaBytes() {
  const configured = Number(process.env.PAID_APP_STORAGE_QUOTA_BYTES);

  if (Number.isInteger(configured) && configured > 0) {
    return configured;
  }

  return defaultPaidStorageQuotaBytes;
}

function getStorageUpgradeCheckoutUrl(appId: string) {
  const configured = process.env.STORAGE_UPGRADE_CHECKOUT_URL;

  if (!configured) {
    return null;
  }

  const url = new URL(configured);
  url.searchParams.set("appId", appId);
  return url.toString();
}

export function createDefaultBillingPlan(appId: string): BillingPlan {
  return {
    plan: "free",
    paymentStatus: "not_required",
    storageQuotaBytes: getFreeStorageQuotaBytes(),
    checkoutUrl: getStorageUpgradeCheckoutUrl(appId),
  };
}

function saveAppMeta(app: EasyDataApp) {
  const db = new Database(getDbPath(app.id));
  db.prepare("UPDATE _easydata_meta SET value = ? WHERE key = ?").run(
    JSON.stringify(app),
    "app"
  );
  db.close();
}

export function createDefaultRetentionPolicy(now = new Date()): RetentionPolicy {
  const year = now.getUTCMonth() <= 5 ? now.getUTCFullYear() : now.getUTCFullYear() + 1;

  return {
    policy: "end_of_school_year",
    retainUntil: `${year}-06-30`,
    note: "Default recommendation: review and delete classroom data at the end of the school year unless there is a clear reason to keep it longer.",
  };
}

// Generates a random API token for each app
function createToken(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(24).toString("hex")}`;
}

// Creates a new app with its own SQLite database
export function createApp(name: string, description?: string): EasyDataApp {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const id = uuidv4();
  const dbPath = getDbPath(id);

  const app: EasyDataApp = {
    id,
    name,
    description: description ?? "",
    apiToken: createToken("app"),
    createdAt: new Date().toISOString(),
    retentionPolicy: createDefaultRetentionPolicy(),
    billing: createDefaultBillingPlan(id),
  };

  const db = new Database(dbPath);

  // Stores app metadata inside the app database itself
  db.exec(`
    CREATE TABLE IF NOT EXISTS _easydata_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT INTO _easydata_meta (key, value)
    VALUES ('app', '${JSON.stringify(app).replace(/'/g, "''")}');
  `);

  db.close();

  return app;
}

// Reads app metadata from its SQLite database
export function getAppMeta(appId: string): EasyDataApp {
  const dbPath = getDbPath(appId);

  if (!fs.existsSync(dbPath)) {
    throw new Error("App database not found");
  }

  const db = new Database(dbPath);

  const row = db
    .prepare("SELECT value FROM _easydata_meta WHERE key = ?")
    .get("app") as { value: string } | undefined;

  db.close();

  if (!row) {
    throw new Error("App metadata not found");
  }

  const app = JSON.parse(row.value) as EasyDataApp;

  return {
    ...app,
    retentionPolicy: app.retentionPolicy ?? createDefaultRetentionPolicy(),
    billing: app.billing ?? createDefaultBillingPlan(appId),
  };
}

// Validates the provided Bearer token against the app token
export function validateAppToken(appId: string, token: string): boolean {
  const app = getAppMeta(appId);
  return app.apiToken === token;
}

// Lists all apps by reading metadata from SQLite files
export type ListedEasyDataApp = Omit<EasyDataApp, "apiToken"> & {
  hasApiToken: boolean;
};

export function updateRetentionPolicy(
  appId: string,
  retentionPolicy: RetentionPolicy
): EasyDataApp {
  const app = getAppMeta(appId);
  const updatedApp: EasyDataApp = {
    ...app,
    retentionPolicy,
  };

  saveAppMeta(updatedApp);

  return updatedApp;
}

export function createStorageUpgradeCheckout(appId: string) {
  const app = getAppMeta(appId);
  const checkoutUrl = getStorageUpgradeCheckoutUrl(appId);
  const billing: BillingPlan = {
    ...app.billing,
    plan: app.billing.plan === "paid_storage" ? app.billing.plan : "free",
    paymentStatus: app.billing.paymentStatus === "active" ? "active" : "payment_required",
    storageQuotaBytes:
      app.billing.paymentStatus === "active" ? getPaidStorageQuotaBytes() : getFreeStorageQuotaBytes(),
    checkoutUrl,
  };
  const updatedApp = { ...app, billing };

  saveAppMeta(updatedApp);

  return {
    appId,
    paymentRequired: billing.paymentStatus !== "active",
    checkoutUrl,
    billing,
  };
}

export function activatePaidStorage(
  appId: string,
  payment: { paymentProvider?: string | undefined; externalPaymentId?: string | undefined } = {}
) {
  const app = getAppMeta(appId);
  const billing: BillingPlan = {
    ...app.billing,
    plan: "paid_storage",
    paymentStatus: "active",
    storageQuotaBytes: getPaidStorageQuotaBytes(),
    checkoutUrl: getStorageUpgradeCheckoutUrl(appId),
    paidAt: new Date().toISOString(),
    ...(payment.paymentProvider && { paymentProvider: payment.paymentProvider }),
    ...(payment.externalPaymentId && { externalPaymentId: payment.externalPaymentId }),
  };
  const updatedApp = { ...app, billing };

  saveAppMeta(updatedApp);

  return updatedApp;
}

export function deleteApp(appId: string) {
  const dbPath = getDbPath(appId);

  if (!fs.existsSync(dbPath)) {
    throw new Error("App database not found");
  }

  fs.unlinkSync(dbPath);

  return {
    success: true,
    appId,
  };
}


export function findExpiredApps(now = new Date()) {
  return listApps().filter((app) => {
    const retainUntil = app.retentionPolicy?.retainUntil;

    if (!retainUntil || app.retentionPolicy.policy === "none") {
      return false;
    }

    return retainUntil < now.toISOString().slice(0, 10);
  });
}

export function cleanupExpiredApps(now = new Date()) {
  const expiredApps = findExpiredApps(now);
  const deletedApps = [];

  for (const app of expiredApps) {
    deleteApp(app.id);
    deletedApps.push(app.id);
  }

  return {
    checkedAt: now.toISOString(),
    deletedApps,
  };
}

export function listApps(): ListedEasyDataApp[] {
  if (!fs.existsSync(DATA_DIR)) {
    return [];
  }

  const files = fs
    .readdirSync(DATA_DIR)
    .filter((file) => file.endsWith(".sqlite"));

  const apps: ListedEasyDataApp[] = [];

  for (const file of files) {
    const appId = file.replace(".sqlite", "");

    try {
      const { apiToken, ...app } = getAppMeta(appId);
      apps.push({
        ...app,
        hasApiToken: Boolean(apiToken),
      });
    } catch {
      // Ignore broken or invalid database files
    }
  }

  return apps;
}