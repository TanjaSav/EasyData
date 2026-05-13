import fs from "fs";
import path from "path";
import crypto from "crypto";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { EasyDataApp } from "../types/app.types";
import { CreateTableInput } from "../types/table.types";

const DATA_DIR = process.env.DATA_DIR || "./data/apps";

function createToken(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(24).toString("hex")}`;
}

export function createApp(name: string, description?: string): EasyDataApp {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const id = uuidv4();
  const dbPath = path.join(DATA_DIR, `${id}.sqlite`);

  const app: EasyDataApp = {
    id,
    name,
    description,
    apiToken: createToken("app"),
    createdAt: new Date().toISOString(),
  };

  const db = new Database(dbPath);

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

export function getAppSchema(appId: string) {
  const dbPath = path.join(DATA_DIR, `${appId}.sqlite`);

  if (!fs.existsSync(dbPath)) {
    throw new Error("App database not found");
  }

  const db = new Database(dbPath);

  const tables = db
    .prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type='table'
      AND name NOT LIKE 'sqlite_%'
    `)
    .all();

  const schema = tables.map((table: any) => {
    const columns = db
      .prepare(`PRAGMA table_info(${table.name})`)
      .all();

    return {
      table: table.name,
      columns,
    };
  });

  db.close();

  return schema;
}


export function createTable(
  appId: string,
  input: CreateTableInput
) {
  const dbPath = path.join(DATA_DIR, `${appId}.sqlite`);

  if (!fs.existsSync(dbPath)) {
    throw new Error("App database not found");
  }

  const db = new Database(dbPath);

  const columnsSql = input.columns
    .map((column) => `${column.name} ${column.type}`)
    .join(", ");

  const sql = `
    CREATE TABLE IF NOT EXISTS ${input.tableName} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ${columnsSql}
    )
  `;

  db.exec(sql);

  db.close();

  return {
    success: true,
    table: input.tableName,
  };
}

export function insertRow(
  appId: string,
  tableName: string,
  data: Record<string, unknown>
) {
  const dbPath = path.join(DATA_DIR, `${appId}.sqlite`);

  if (!fs.existsSync(dbPath)) {
    throw new Error("App database not found");
  }

  const db = new Database(dbPath);

  const columns = Object.keys(data);
  const values = Object.values(data);

  if (columns.length === 0) {
    db.close();
    throw new Error("No data provided");
  }

  const placeholders = columns.map(() => "?").join(", ");

  const sql = `
    INSERT INTO ${tableName} (${columns.join(", ")})
    VALUES (${placeholders})
  `;

  const result = db.prepare(sql).run(...values);

  db.close();

  return {
    success: true,
    table: tableName,
    rowId: result.lastInsertRowid,
  };
}

export function getRows(
  appId: string,
  tableName: string,
  options?: {
    where?: string;
    order?: string;
    limit?: string;
  }
) {
  const dbPath = path.join(DATA_DIR, `${appId}.sqlite`);

  if (!fs.existsSync(dbPath)) {
    throw new Error("App database not found");
  }

  const db = new Database(dbPath);

  let sql = `SELECT * FROM ${tableName}`;
  const params: unknown[] = [];

  if (options?.where) {
    const [column, value] = options.where.split(":");

    if (!column || value === undefined) {
      db.close();
      throw new Error("Invalid where format. Use column:value");
    }

    sql += ` WHERE ${column} = ?`;
    params.push(value);
  }

  if (options?.order) {
    const [column, directionRaw] = options.order.split(":");
    const direction = directionRaw?.toUpperCase() === "DESC" ? "DESC" : "ASC";

    if (!column) {
      db.close();
      throw new Error("Invalid order format. Use column:asc or column:desc");
    }

    sql += ` ORDER BY ${column} ${direction}`;
  }

  if (options?.limit) {
    const limit = Number(options.limit);

    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      db.close();
      throw new Error("Invalid limit. Use number from 1 to 500");
    }

    sql += ` LIMIT ?`;
    params.push(limit);
  }

  const rows = db.prepare(sql).all(...params);

  db.close();

  return rows;
}

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

export function validateAppToken(appId: string, token: string): boolean {
  const app = getAppMeta(appId);
  return app.apiToken === token;
}

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
      const app = getAppMeta(appId);
      apps.push(app);
    } catch {
      // ignore broken db files
    }
  }

  return apps;
}

export function updateRow(
  appId: string,
  tableName: string,
  rowId: string,
  data: Record<string, unknown>
) {
  const dbPath = path.join(DATA_DIR, `${appId}.sqlite`);

  if (!fs.existsSync(dbPath)) {
    throw new Error("App database not found");
  }

  const columns = Object.keys(data);
  const values = Object.values(data);

  if (columns.length === 0) {
    throw new Error("No data provided");
  }

  const db = new Database(dbPath);

  const setSql = columns.map((column) => `${column} = ?`).join(", ");

  const sql = `
    UPDATE ${tableName}
    SET ${setSql}
    WHERE id = ?
  `;

  const result = db.prepare(sql).run(...values, rowId);

  db.close();

  return {
    success: true,
    table: tableName,
    rowId,
    changes: result.changes,
  };
}

export function deleteRow(
  appId: string,
  tableName: string,
  rowId: string
) {
  const dbPath = path.join(DATA_DIR, `${appId}.sqlite`);

  if (!fs.existsSync(dbPath)) {
    throw new Error("App database not found");
  }

  const db = new Database(dbPath);

  const sql = `
    DELETE FROM ${tableName}
    WHERE id = ?
  `;

  const result = db.prepare(sql).run(rowId);

  db.close();

  return {
    success: true,
    table: tableName,
    rowId,
    changes: result.changes,
  };
}

export function alterTable(
  appId: string,
  tableName: string,
  columns: CreateTableInput["columns"]
) {
  const dbPath = path.join(DATA_DIR, `${appId}.sqlite`);

  if (!fs.existsSync(dbPath)) {
    throw new Error("App database not found");
  }

  if (columns.length === 0) {
    throw new Error("No columns provided");
  }

  const db = new Database(dbPath);

  for (const column of columns) {
    const sql = `
      ALTER TABLE ${tableName}
      ADD COLUMN ${column.name} ${column.type}
    `;

    db.exec(sql);
  }

  db.close();

  return {
    success: true,
    table: tableName,
    addedColumns: columns,
  };
}