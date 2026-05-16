import fs from "fs";
import path from "path";
import crypto from "crypto";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { type EasyDataApp } from "../types/app.types.js";
const DATA_DIR = process.env.DATA_DIR || "./data/apps";

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
  const dbPath = path.join(DATA_DIR, `${id}.sqlite`);

  const app: EasyDataApp = {
    id,
    name,
    description: description ?? "",
    apiToken: createToken("app"),
    createdAt: new Date().toISOString(),
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
  const dbPath = path.join(DATA_DIR, `${appId}.sqlite`);

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

  return JSON.parse(row.value) as EasyDataApp;
}

// Validates the provided Bearer token against the app token
export function validateAppToken(appId: string, token: string): boolean {
  const app = getAppMeta(appId);
  return app.apiToken === token;
}

// Lists all apps by reading metadata from SQLite files
export function listApps(): EasyDataApp[] {
  if (!fs.existsSync(DATA_DIR)) {
    return [];
  }

  const files = fs
    .readdirSync(DATA_DIR)
    .filter((file) => file.endsWith(".sqlite"));

  const apps: EasyDataApp[] = [];

  for (const file of files) {
    const appId = file.replace(".sqlite", "");

    try {
      apps.push(getAppMeta(appId));
    } catch {
      // Ignore broken or invalid database files
    }
  }

  return apps;
}