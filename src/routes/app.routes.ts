// export default router;

import { Router } from "express";
import { z } from "zod";
import { createApp, listApps } from "../services/app.service";
import {
  getAppSchema,
  createTable,
  alterTable,
  insertRow,
  getRows,
  updateRow,
  deleteRow,
} from "../services/table.service";
import { upload } from "../middleware/upload.middleware";
import { requireAppToken } from "../middleware/auth.middleware";

const router = Router();

// Validates the request body for creating a new app
const createAppSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

// Validates the request body for creating a new table
const createTableSchema = z.object({
  tableName: z.string().min(1),
  columns: z.array(
    z.object({
      name: z.string().min(1),
      type: z.enum(["TEXT", "INTEGER", "REAL", "BOOLEAN"]),
    })
  ),
});

// Validates the request body for altering an existing table
const alterTableSchema = z.object({
  columns: z.array(
    z.object({
      name: z.string().min(1),
      type: z.enum(["TEXT", "INTEGER", "REAL", "BOOLEAN"]),
    })
  ),
});

// Lists all created apps
router.get("/", (req, res) => {
  const apps = listApps();

  return res.json({
    count: apps.length,
    apps,
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

  return res.status(201).json(app);
});

// Returns the database schema for a specific app
router.get("/:id/schema", requireAppToken, (req, res) => {
  try {
    const schema = getAppSchema(req.params.id);

    return res.json({
      appId: req.params.id,
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
    const response = createTable(req.params.id, result.data);

    return res.status(201).json(response);
  } catch (error: any) {
    return res.status(404).json({
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
      req.params.id,
      req.params.table,
      result.data.columns
    );

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
    const rows = getRows(req.params.id, req.params.table, {
      where: req.query.where as string | undefined,
      order: req.query.order as string | undefined,
      limit: req.query.limit as string | undefined,
    });

    return res.json({
      appId: req.params.id,
      table: req.params.table,
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
router.post("/:id/tables/:table/rows", requireAppToken, (req, res) => {
  try {
    const response = insertRow(req.params.id, req.params.table, req.body);

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
  (req, res) => {
    try {
      const response = updateRow(
        req.params.id,
        req.params.table,
        req.params.rowId,
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
        req.params.id,
        req.params.table,
        req.params.rowId
      );

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
    appId: req.params.id,
    uploadUrl: `/apps/${req.params.id}/files`,
    method: "POST",
    fieldName: "file",
    note: "Local storage mode. Upload the file using multipart/form-data.",
  });
});

// Handles file upload for the selected app
router.post(
  "/:id/files",
  requireAppToken,
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
      });
    }

    return res.status(201).json({
      success: true,
      appId: req.params.id,
      file: {
        originalName: req.file.originalname,
        fileName: req.file.filename,
        url: `/uploads/${req.file.filename}`,
      },
    });
  }
);

export default router;