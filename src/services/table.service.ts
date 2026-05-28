import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import type { CreateTableInput } from "../types/table.types.js";
import { validateIdentifier, validateIdentifiers } from "./identifier.service.js";
import { deleteStoredFile } from "./file.service.js";
import { analyzeSensitiveColumns } from "./sensitivity.service.js";

const DATA_DIR = process.env.DATA_DIR || "./data/apps";

// Builds the SQLite database path for a specific app
function getDbPath(appId: string) {
  return path.join(DATA_DIR, `${appId}.sqlite`);
}

// Ensures the selected app database exists before running table operations
function ensureAppDb(appId: string) {
  const dbPath = getDbPath(appId);

  if (!fs.existsSync(dbPath)) {
    throw new Error("App database not found");
  }

  return dbPath;
}

// Returns the current database schema for an app
export function getAppSchema(appId: string) {
  const dbPath = ensureAppDb(appId);
  const db = new Database(dbPath);

  const tables = db
    .prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type='table'
      AND name NOT LIKE 'sqlite_%'
      AND name != '_easydata_meta'
    `)
    .all();

  const schema = tables.map((table: any) => {
    validateIdentifier(table.name, "Table name");
    const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();

    return {
      table: table.name,
      columns,
    };
  });

  db.close();
  return schema;
}

// Creates a new table inside the selected app database
export function createTable(appId: string, input: CreateTableInput) {
  validateIdentifier(input.tableName, "Table name");
  validateIdentifiers(input.columns.map((column) => column.name), "Column name");
  const warnings = analyzeSensitiveColumns(input.columns);

  if (warnings.length > 0 && !input.confirmSensitiveData) {
    throw new Error("Sensitive schema requires confirmSensitiveData: true");
  }

  const dbPath = ensureAppDb(appId);
  const db = new Database(dbPath);

  // Values are parameterized elsewhere; identifiers are strictly validated here.
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
    warnings,
  };
}

// Adds new columns to an existing table
export function alterTable(
  appId: string,
  tableName: string,
  columns: CreateTableInput["columns"],
  confirmSensitiveData = false
) {
  validateIdentifier(tableName, "Table name");
  validateIdentifiers(columns.map((column) => column.name), "Column name");
  const warnings = analyzeSensitiveColumns(columns);

  if (warnings.length > 0 && !confirmSensitiveData) {
    throw new Error("Sensitive schema requires confirmSensitiveData: true");
  }

  const dbPath = ensureAppDb(appId);

  if (columns.length === 0) {
    throw new Error("No columns provided");
  }

  const db = new Database(dbPath);

  for (const column of columns) {
    db.exec(`
      ALTER TABLE ${tableName}
      ADD COLUMN ${column.name} ${column.type}
    `);
  }

  db.close();

  return {
    success: true,
    table: tableName,
    addedColumns: columns,
    warnings,
  };
}

// Inserts a new row into the selected table
export function insertRow(
  appId: string,
  tableName: string,
  data: Record<string, unknown>
) {
  validateIdentifier(tableName, "Table name");

  const dbPath = ensureAppDb(appId);
  const db = new Database(dbPath);

  const columns = Object.keys(data);
  validateIdentifiers(columns, "Column name");
  const values = Object.values(data);

  if (columns.length === 0) {
    db.close();
    throw new Error("No data provided");
  }

  // Bind row values separately so user data is not interpolated into SQL.
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

// Reads rows with optional where, order, and limit query parameters
export function getRows(
  appId: string,
  tableName: string,
  options?: {
    where?: string;
    order?: string;
    limit?: string;
  }
) {
  validateIdentifier(tableName, "Table name");

  const dbPath = ensureAppDb(appId);
  const db = new Database(dbPath);

  let sql = `SELECT * FROM ${tableName}`;
  const params: unknown[] = [];

  if (options?.where) {
    const [column, value] = options.where.split(":");

    if (!column || value === undefined) {
      db.close();
      throw new Error("Invalid where format. Use column:value");
    }

    validateIdentifier(column, "Where column");

    // Keep filter values parameterized while allowing a simple column:value query format.
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

    validateIdentifier(column, "Order column");

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

// Updates an existing row by its id
export function updateRow(
  appId: string,
  tableName: string,
  rowId: string,
  data: Record<string, unknown>
) {
  validateIdentifier(tableName, "Table name");

  const dbPath = ensureAppDb(appId);

  const columns = Object.keys(data);
  validateIdentifiers(columns, "Column name");
  const values = Object.values(data);

  if (columns.length === 0) {
    throw new Error("No data provided");
  }

  const db = new Database(dbPath);

  // Build the SET clause dynamically, then bind the provided values in order.
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


export function exportAppData(appId: string) {
  const dbPath = ensureAppDb(appId);
  const db = new Database(dbPath);
  const schema = getAppSchema(appId);
  const tables: Record<string, unknown[]> = {};

  for (const table of schema) {
    validateIdentifier(table.table, "Table name");
    tables[table.table] = db.prepare(`SELECT * FROM ${table.table}`).all();
  }

  db.close();

  return {
    appId,
    exportedAt: new Date().toISOString(),
    schema,
    tables,
  };
}

// Deletes a row by its id
export function deleteRow(appId: string, tableName: string, rowId: string) {
  validateIdentifier(tableName, "Table name");

  const dbPath = ensureAppDb(appId);
  const db = new Database(dbPath);

  const row = db
    .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
    .get(rowId) as Record<string, unknown> | undefined;

  const result = db
    .prepare(`DELETE FROM ${tableName} WHERE id = ?`)
    .run(rowId);

  db.close();

  let deletedFiles = 0;

  if (row && result.changes > 0) {
    for (const [key, value] of Object.entries(row)) {
      if (!key.endsWith("file_name") || typeof value !== "string") {
        continue;
      }

      if (value.startsWith(`${appId}-`)) {
        deleteStoredFile(value);
        deletedFiles += 1;
      }
    }
  }

  return {
    success: true,
    table: tableName,
    rowId,
    changes: result.changes,
    deletedFiles,
  };
}