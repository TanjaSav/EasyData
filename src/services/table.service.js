import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
const DATA_DIR = process.env.DATA_DIR || "./data/apps";
// Builds the SQLite database path for a specific app
function getDbPath(appId) {
    return path.join(DATA_DIR, `${appId}.sqlite`);
}
// Ensures the selected app database exists before running table operations
function ensureAppDb(appId) {
    const dbPath = getDbPath(appId);
    if (!fs.existsSync(dbPath)) {
        throw new Error("App database not found");
    }
    return dbPath;
}
// Returns the current database schema for an app
export function getAppSchema(appId) {
    const dbPath = ensureAppDb(appId);
    const db = new Database(dbPath);
    const tables = db
        .prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type='table'
      AND name NOT LIKE 'sqlite_%'
    `)
        .all();
    const schema = tables.map((table) => {
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
export function createTable(appId, input) {
    const dbPath = ensureAppDb(appId);
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
// Adds new columns to an existing table
export function alterTable(appId, tableName, columns) {
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
    };
}
// Inserts a new row into the selected table
export function insertRow(appId, tableName, data) {
    const dbPath = ensureAppDb(appId);
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
// Reads rows with optional where, order, and limit query parameters
export function getRows(appId, tableName, options) {
    const dbPath = ensureAppDb(appId);
    const db = new Database(dbPath);
    let sql = `SELECT * FROM ${tableName}`;
    const params = [];
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
// Updates an existing row by its id
export function updateRow(appId, tableName, rowId, data) {
    const dbPath = ensureAppDb(appId);
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
// Deletes a row by its id
export function deleteRow(appId, tableName, rowId) {
    const dbPath = ensureAppDb(appId);
    const db = new Database(dbPath);
    const result = db
        .prepare(`DELETE FROM ${tableName} WHERE id = ?`)
        .run(rowId);
    db.close();
    return {
        success: true,
        table: tableName,
        rowId,
        changes: result.changes,
    };
}
//# sourceMappingURL=table.service.js.map