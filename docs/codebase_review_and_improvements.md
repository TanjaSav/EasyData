# EasyData Codebase Review & Best Practices Recommendations

This document contains a structured code review of the EasyData MCP & REST backend. It outlines architectural improvements, coding standards, and performance tuning recommendations.

---

## 🏗️ 1. Architecture & Connection Management

### Current Implementation
Database connection initiation is scattered across `app.service.ts`, `table.service.ts`, and `mcp/server.ts` using direct instantiations:
```typescript
const db = new Database(dbPath);
```

### Proposed Improvement
Create a centralized database manager (`db.service.ts`) to handle database connections. This ensures:
- **Consistent Configuration**: Automatically enables performance-enhancing SQLite features on startup.
- **Connection Caching**: Keeps database file handles warm during rapid sequential requests, reducing disk I/O overhead.

```typescript
import Database from "better-sqlite3";
import path from "path";

const connections = new Map<string, Database.Database>();

export function getDbConnection(appId: string): Database.Database {
  if (connections.has(appId)) {
    return connections.get(appId)!;
  }

  const dbPath = path.join(process.env.DATA_DIR || "./data/apps", `${appId}.sqlite`);
  const db = new Database(dbPath);
  
  // Enable Write-Ahead Logging for concurrent read/write support
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  connections.set(appId, db);
  return db;
}
```

---

## ⚙️ 2. Environment Configuration

### Current Implementation
Fallback configuration paths and defaults are duplicated throughout multiple service layers:
```typescript
const DATA_DIR = process.env.DATA_DIR || "./data/apps";
```

### Proposed Improvement
Consolidate configuration variables into a single, validated `config.ts` module using Zod. This catches environment errors at boot rather than runtime.

```typescript
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const configSchema = z.object({
  port: z.coerce.number().default(3000),
  dataDir: z.string().default("./data/apps"),
  uploadDir: z.string().default("./uploads"),
  sandboxMode: z.coerce.boolean().default(false),
  appStorageQuotaBytes: z.coerce.number().default(52428800), // 50MB
  fileViewUrlTtlSeconds: z.coerce.number().default(3600),     // 1 Hour
});

export const config = configSchema.parse({
  port: process.env.PORT,
  dataDir: process.env.DATA_DIR,
  uploadDir: process.env.UPLOAD_DIR,
  sandboxMode: process.env.SANDBOX_MODE === "true",
  appStorageQuotaBytes: process.env.APP_STORAGE_QUOTA_BYTES,
  fileViewUrlTtlSeconds: process.env.FILE_VIEW_URL_TTL_SECONDS,
});
```

---

## ⚡ 3. SQLite Concurrency & Performance

> [!TIP]
> SQLite blocks database writes when standard journal modes are used. Enabling **WAL (Write-Ahead Log)** mode allows readers to read data while writes are actively occurring in a separate file, greatly increasing throughput for concurrent web requests.

### Performance Tuning Action Items:
1. **Enable WAL Mode**: Execute `PRAGMA journal_mode = WAL` on connection startup (shown in section 1).
2. **Prepared Statement Caching**: Reuse prepared SQL statement references for inserts and updates to avoid parsing query plans repeatedly:
   ```typescript
   // Inside getDbConnection setup:
   const stmt = db.prepare("SELECT value FROM _easydata_meta WHERE key = ?");
   ```

---

## 🛠️ 4. Validation & Error Handling Middleware

### Current Implementation
Validation is manually run using Zod inline inside routes or service methods:
```typescript
const result = createTable(appId, { ... });
```
This forces developers to wrap logic blocks inside `try/catch` and returns raw errors without standardized API wrappers.

### Proposed Improvement
Extract input validation into generic Express middleware:

```typescript
import { Request, Response, NextFunction } from "express";
import { AnyZodObject } from "zod";

export const validateBody = (schema: AnyZodObject) => 
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      res.status(400).json({
        error: "Validation failed",
        details: error.errors,
      });
    }
  };
```

Apply this middleware directly to Express route hooks for cleaner declarations:
```typescript
router.post("/tables", validateBody(createTableSchema), (req, res) => { ... });
```

---

## 🔒 5. File System and Storage Limits

### Current Implementation
The `uploads` folder is checked on every read operation. Large quantities of files can slow down operations if standard sync directory listings are run inside tight request scopes.

### Proposed Improvement
- Maintain a database table or column keeping track of **current storage usage** rather than looping over all file statistics on disk on each file request (`fs.statSync` inside a loops is slow).
- Implement standard file-cleanup rules during standard database drops:
```typescript
// Ensure cleanup triggers correctly in error paths
export function safeDeleteApp(appId: string) {
  try {
    deleteStoredFilesForApp(appId);
    deleteApp(appId);
  } catch (error) {
    console.error(`Purging app assets failed: ${appId}`, error);
  }
}
```
