import fs from "fs";
import path from "path";
import crypto from "crypto";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { type EasyDataApp, type RetentionPolicy } from "../types/app.types.js";
const DATA_DIR = process.env.DATA_DIR || "./data/apps";

function getDbPath(appId: string) {
  return path.join(DATA_DIR, `${appId}.sqlite`);
}

export function createDefaultRetentionPolicy(now = new Date()): RetentionPolicy {
  if (process.env.SANDBOX_MODE === "true") {
    // 24 hours sandbox retention
    const retainUntilDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return {
      policy: "custom",
      retainUntil: retainUntilDate.toISOString().slice(0, 10),
      note: "Sandbox environment limit: App database and uploaded files will be automatically deleted 24 hours after creation.",
    };
  }

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

  const db = new Database(getDbPath(appId));
  db.prepare("UPDATE _easydata_meta SET value = ? WHERE key = ?").run(
    JSON.stringify(updatedApp),
    "app"
  );
  db.close();

  return updatedApp;
}

export function deleteApp(appId: string) {
  const dbPath = getDbPath(appId);

  if (!fs.existsSync(dbPath)) {
    throw new Error("App database not found");
  }

  fs.unlinkSync(dbPath);

  // Clean up the generated single-page app HTML folder if it exists
  const generatedDir = path.join("public", "generated", appId);
  if (fs.existsSync(generatedDir)) {
    try {
      fs.rmSync(generatedDir, { recursive: true, force: true });
    } catch (err) {
      console.error(`Failed to delete generated directory ${generatedDir}:`, err);
    }
  }

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