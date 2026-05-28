// export default router;

import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import {
  createApp,
  deleteApp,
  findExpiredApps,
  getAppMeta,
  listApps,
  updateRetentionPolicy,
} from "../services/app.service.js";
import {
  getAppSchema,
  createTable,
  alterTable,
  insertRow,
  getRows,
  updateRow,
  deleteRow,
  exportAppData,
} from "../services/table.service.js";
import {
  upload,
  uploadConfig,
  validateUploadedFileMagic,
} from "../middleware/upload.middleware.js";
import { requireAdminToken, requireAppToken } from "../middleware/auth.middleware.js";
import { rateLimit } from "../middleware/rate-limit.middleware.js";
import { writeAuditEvent } from "../services/audit.service.js";
import {
  createSignedFileUrl,
  deleteStoredFile,
  deleteStoredFilesForApp,
  getAppStorageQuotaBytes,
  getAppStorageUsageBytes,
  getSignedUrlTtlSeconds,
  resolveSignedFilePath,
} from "../services/file.service.js";

const router = Router();
export const legacyRowsRouter = Router();

const rowWriteRateLimit = rateLimit({
  keyPrefix: "row-write",
  windowMs: 60_000,
  max: 120,
});

const uploadRateLimit = rateLimit({
  keyPrefix: "upload",
  windowMs: 60_000,
  max: 30,
});

const mcpRateLimit = rateLimit({
  keyPrefix: "mcp",
  windowMs: 60_000,
  max: 120,
});

export { mcpRateLimit };


// Validates the request body for creating a new app
const createAppSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

// Validates the request body for creating a new table
const createTableSchema = z.object({
  tableName: z.string().min(1),
  confirmSensitiveData: z.boolean().optional(),
  columns: z.array(
    z.object({
      name: z.string().min(1),
      type: z.enum(["TEXT", "INTEGER", "REAL", "BOOLEAN"]),
    })
  ),
});

// Validates the request body for altering an existing table
const alterTableSchema = z.object({
  confirmSensitiveData: z.boolean().optional(),
  columns: z.array(
    z.object({
      name: z.string().min(1),
      type: z.enum(["TEXT", "INTEGER", "REAL", "BOOLEAN"]),
    })
  ),
});

const retentionPolicySchema = z.object({
  policy: z.enum(["end_of_school_year", "custom", "none"]),
  retainUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  note: z.string().min(1),
});

const uploadSingleFile = (req: Request, res: Response, next: NextFunction) => {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File too large",
        maxFileSizeBytes: uploadConfig.maxFileSizeBytes,
      });
    }

    return res.status(400).json({
      error: error.message,
    });
  });
};

// Lists all created apps
router.get("/", requireAdminToken, (req, res) => {
  const apps = listApps();

  return res.json({
    count: apps.length,
    apps,
  });
});

// Lists apps whose retention date has passed.
router.get("/retention/expired", requireAdminToken, (req, res) => {
  const expiredApps = findExpiredApps();

  return res.json({
    count: expiredApps.length,
    apps: expiredApps,
  });
});

// Deletes apps whose retention date has passed.
router.post("/retention/cleanup", requireAdminToken, (req, res) => {
  const expiredApps = findExpiredApps();
  const deletedApps = [];

  for (const app of expiredApps) {
    const deletedFiles = deleteStoredFilesForApp(app.id);
    deleteApp(app.id);
    deletedApps.push({ appId: app.id, deletedFiles });
    writeAuditEvent({
      action: "retention_cleanup_delete_app",
      appId: app.id,
      details: { deletedFiles },
    });
  }

  return res.json({
    checkedAt: new Date().toISOString(),
    deletedApps,
  });
});

// Creates a new app and returns its app id and API token
router.post("/", (req, res) => {
  const result = createAppSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: result.error.flatten(),
    });
  }

  const app = createApp(result.data.name, result.data.description);
  writeAuditEvent({ action: "create_app", appId: app.id });

  return res.status(201).json(app);
});


// Returns the current retention policy for a specific app.
router.get("/:id/retention", requireAppToken, (req, res) => {
  try {
    const app = getAppMeta(req.params.id as string);

    return res.json({
      appId: req.params.id as string,
      retentionPolicy: app.retentionPolicy,
    });
  } catch (error: any) {
    return res.status(404).json({
      error: error.message,
    });
  }
});

// Updates the retention policy for a specific app.
router.put("/:id/retention", requireAppToken, (req, res) => {
  const result = retentionPolicySchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Invalid retention policy",
      details: result.error.flatten(),
    });
  }

  try {
    const app = updateRetentionPolicy(req.params.id as string, result.data);
    writeAuditEvent({
      action: "update_retention_policy",
      appId: app.id,
      details: { retentionPolicy: app.retentionPolicy },
    });

    return res.json({
      appId: app.id,
      retentionPolicy: app.retentionPolicy,
    });
  } catch (error: any) {
    return res.status(404).json({
      error: error.message,
    });
  }
});

// Deletes an app database and its uploaded files.
router.delete("/:id", requireAppToken, (req, res) => {
  try {
    const deletedFiles = deleteStoredFilesForApp(req.params.id as string);
    const response = deleteApp(req.params.id as string);
    writeAuditEvent({
      action: "delete_app",
      appId: req.params.id as string,
      details: { deletedFiles },
    });

    return res.json({
      ...response,
      deletedFiles,
    });
  } catch (error: any) {
    return res.status(404).json({
      error: error.message,
    });
  }
});

// Exports app schema and row data before deletion or migration.
router.get("/:id/export", requireAppToken, (req, res) => {
  try {
    const app = getAppMeta(req.params.id as string);
    const { apiToken, ...safeApp } = app;

    return res.json({
      app: safeApp,
      data: exportAppData(req.params.id as string),
    });
  } catch (error: any) {
    return res.status(404).json({
      error: error.message,
    });
  }
});

// Returns the database schema for a specific app
router.get("/:id/schema", requireAppToken, (req, res) => {
  try {
    const schema = getAppSchema(req.params.id as string);

    return res.json({
      appId: req.params.id as string,
      schema,
    });
  } catch (error: any) {
    return res.status(404).json({
      error: error.message,
    });
  }
});

// Creates a new table inside an app database
router.post("/:id/tables", requireAppToken, (req, res) => {
  const result = createTableSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Invalid table definition",
      details: result.error.flatten(),
    });
  }

  try {
    const response = createTable(req.params.id as string, result.data);
    writeAuditEvent({
      action: "create_table",
      appId: req.params.id as string,
      tableName: result.data.tableName,
      details: { warnings: response.warnings },
    });

    return res.status(201).json(response);
  } catch (error: any) {
    const status = error.message === "App database not found" ? 404 : 400;

    return res.status(status).json({
      error: error.message,
    });
  }
});

// Adds new columns to an existing table
router.put("/:id/tables/:table", requireAppToken, (req, res) => {
  const result = alterTableSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Invalid alter table definition",
      details: result.error.flatten(),
    });
  }

  try {
    const response = alterTable(
      req.params.id as string,
      req.params.table as string,
      result.data.columns,
      result.data.confirmSensitiveData ?? false
    );
    writeAuditEvent({
      action: "alter_table",
      appId: req.params.id as string,
      tableName: req.params.table as string,
      details: { warnings: response.warnings },
    });

    return res.json(response);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message,
    });
  }
});

// Queries rows from a table with optional where, order, and limit parameters
router.get("/:id/tables/:table/rows", requireAppToken, (req, res) => {
  try {
    const rows = getRows(req.params.id as string, req.params.table as string, {
      ...(req.query.where && { where: req.query.where as string }),
      ...(req.query.order && { order: req.query.order as string }),
      ...(req.query.limit && { limit: req.query.limit as string }),
    });

    return res.json({
      appId: req.params.id as string,
      table: req.params.table as string,
      query: {
        where: req.query.where ?? null,
        order: req.query.order ?? null,
        limit: req.query.limit ?? null,
      },
      rows,
    });
  } catch (error: any) {
    return res.status(400).json({
      error: error.message,
    });
  }
});

// Inserts a new row into a table
router.post("/:id/tables/:table/rows", requireAppToken, rowWriteRateLimit, (req, res) => {
  try {
    const response = insertRow(req.params.id as string, req.params.table as string, req.body);
    writeAuditEvent({
      action: "insert_row",
      appId: req.params.id as string,
      tableName: req.params.table as string,
      rowId: String(response.rowId),
    });

    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message,
    });
  }
});

// Updates a specific row by id
router.put(
  "/:id/tables/:table/rows/:rowId",
  requireAppToken,
  rowWriteRateLimit,
  (req, res) => {
    try {
      const response = updateRow(
        req.params.id as string,
        req.params.table as string,
        req.params.rowId as string,
        req.body
      );

      writeAuditEvent({
        action: "update_row",
        appId: req.params.id as string,
        tableName: req.params.table as string,
        rowId: req.params.rowId as string,
      });

      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        error: error.message,
      });
    }
  }
);

// Compatibility update route for generated clients that use PATCH for edits.
router.patch(
  "/:id/tables/:table/rows/:rowId",
  requireAppToken,
  (req, res) => {
    try {
      const response = updateRow(
        req.params.id as string,
        req.params.table as string,
        req.params.rowId as string,
        req.body
      );

      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        error: error.message,
      });
    }
  }
);

// Deletes a specific row by id
router.delete(
  "/:id/tables/:table/rows/:rowId",
  requireAppToken,
  (req, res) => {
    try {
      const response = deleteRow(
        req.params.id as string,
        req.params.table as string,
        req.params.rowId as string
      );
      writeAuditEvent({
        action: "delete_row",
        appId: req.params.id as string,
        tableName: req.params.table as string,
        rowId: req.params.rowId as string,
        details: { deletedFiles: response.deletedFiles },
      });

      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        error: error.message,
      });
    }
  }
);

// Returns the local upload endpoint for the selected app
router.post("/:id/upload-url", requireAppToken, (req, res) => {
  return res.json({
    appId: req.params.id as string,
    uploadUrl: `/apps/${req.params.id as string}/files`,
    method: "POST",
    fieldName: "file",
    note: "Local storage mode. Upload the file using multipart/form-data.",
    limits: {
      maxFileSizeBytes: uploadConfig.maxFileSizeBytes,
      allowedMimeTypes: uploadConfig.allowedMimeTypes,
      allowedExtensions: uploadConfig.allowedExtensions,
      appStorageQuotaBytes: getAppStorageQuotaBytes(),
      currentStorageUsageBytes: getAppStorageUsageBytes(req.params.id as string),
    },
  });
});

// Handles file upload for the selected app
router.post(
  "/:id/files",
  requireAppToken,
  uploadRateLimit,
  uploadSingleFile,
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
      });
    }

    try {
      validateUploadedFileMagic(req.file.path, req.file.mimetype);
    } catch (error: any) {
      deleteStoredFile(req.file.filename);

      return res.status(400).json({
        error: error.message,
      });
    }

    const appId = req.params.id as string;
    const storageUsageBytes = getAppStorageUsageBytes(appId);
    const appStorageQuotaBytes = getAppStorageQuotaBytes();

    if (storageUsageBytes > appStorageQuotaBytes) {
      deleteStoredFile(req.file.filename);

      return res.status(413).json({
        error: "App storage quota exceeded",
        appStorageQuotaBytes,
        currentStorageUsageBytes: storageUsageBytes - req.file.size,
        attemptedFileSizeBytes: req.file.size,
      });
    }

    const fileName = req.file.filename;
    const viewUrl = createSignedFileUrl(appId, fileName);

    writeAuditEvent({
      action: "upload_file",
      appId,
      details: { fileName, size: req.file.size, mimetype: req.file.mimetype },
    });

    return res.status(201).json({
      success: true,
      appId,
      fileName,
      viewUrl,
      url: viewUrl,
      fileUrl: viewUrl,
      file_url: viewUrl,
      path: viewUrl,
      storage: {
        appStorageQuotaBytes,
        currentStorageUsageBytes: storageUsageBytes,
      },
      file: {
        originalName: req.file.originalname,
        fileName,
        viewUrl,
        url: viewUrl,
      },
    });
  }
);



// Creates a fresh signed view URL for an existing stored file.
// Apps should store fileName in SQLite and call this endpoint when rendering.
router.post("/:id/files/:fileName/view-url", requireAppToken, (req, res) => {
  try {
    const appId = req.params.id as string;
    const fileName = req.params.fileName as string;
    const viewUrl = createSignedFileUrl(appId, fileName);

    resolveSignedFilePath(
      appId,
      fileName,
      new URLSearchParams(viewUrl.split("?")[1]).get("expires"),
      new URLSearchParams(viewUrl.split("?")[1]).get("signature")
    );

    return res.json({
      appId,
      fileName,
      viewUrl,
      url: viewUrl,
      expiresInSeconds: getSignedUrlTtlSeconds(),
    });
  } catch (error: any) {
    return res.status(404).json({
      error: error.message,
    });
  }
});

// Serves uploaded files only through signed, expiring URLs.
router.get("/:id/files/:fileName/view", (req, res) => {
  try {
    const filePath = resolveSignedFilePath(
      req.params.id as string,
      req.params.fileName as string,
      req.query.expires,
      req.query.signature
    );

    return res.sendFile(filePath);
  } catch (error: any) {
    return res.status(403).json({
      error: error.message,
    });
  }
});

// Compatibility routes for generated clients that use /api/rows/:appId/:table.
legacyRowsRouter.get("/:id/:table", requireAppToken, (req, res) => {
  try {
    const rows = getRows(req.params.id as string, req.params.table as string, {
      ...(req.query.where && { where: req.query.where as string }),
      ...(req.query.order && { order: req.query.order as string }),
      ...(req.query.limit && { limit: req.query.limit as string }),
    });

    return res.json({
      appId: req.params.id as string,
      table: req.params.table as string,
      query: {
        where: req.query.where ?? null,
        order: req.query.order ?? null,
        limit: req.query.limit ?? null,
      },
      rows,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

legacyRowsRouter.post("/:id/:table", requireAppToken, (req, res) => {
  try {
    const response = insertRow(req.params.id as string, req.params.table as string, req.body);
    writeAuditEvent({
      action: "insert_row",
      appId: req.params.id as string,
      tableName: req.params.table as string,
      rowId: String(response.rowId),
    });

    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

legacyRowsRouter.put("/:id/:table/:rowId", requireAppToken, (req, res) => {
  try {
    const response = updateRow(
      req.params.id as string,
      req.params.table as string,
      req.params.rowId as string,
      req.body
    );

    return res.json(response);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

legacyRowsRouter.patch("/:id/:table/:rowId", requireAppToken, (req, res) => {
  try {
    const response = updateRow(
      req.params.id as string,
      req.params.table as string,
      req.params.rowId as string,
      req.body
    );

    return res.json(response);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

legacyRowsRouter.delete("/:id/:table/:rowId", requireAppToken, (req, res) => {
  try {
    const response = deleteRow(
      req.params.id as string,
      req.params.table as string,
      req.params.rowId as string
    );

    return res.json(response);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
