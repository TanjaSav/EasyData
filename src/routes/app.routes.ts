import { Router } from "express";
import { z } from "zod";
import {
  createApp,
  getAppSchema,
  createTable,
  insertRow,
  getRows,
  listApps,
  updateRow,
  deleteRow,
  alterTable,
} from "../services/app.service";
import { upload } from "../middleware/upload.middleware";
import { requireAppToken } from "../middleware/auth.middleware";

const router = Router();

const createAppSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const alterTableSchema = z.object({
  columns: z.array(
    z.object({
      name: z.string().min(1),
      type: z.enum(["TEXT", "INTEGER", "REAL", "BOOLEAN"]),
    })
  ),
});

const createTableSchema = z.object({
  tableName: z.string().min(1),
  columns: z.array(
    z.object({
      name: z.string().min(1),
      type: z.enum(["TEXT", "INTEGER", "REAL", "BOOLEAN"]),
    })
  ),
});

router.get("/", (req, res) => {
  const apps = listApps();

  return res.json({
    count: apps.length,
    apps,
  });
});

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

router.post("/:id/upload-url", requireAppToken, (req, res) => {
  return res.json({
    appId: req.params.id,
    uploadUrl: `/apps/${req.params.id}/files`,
    method: "POST",
    fieldName: "file",
    note: "Local storage mode. Upload the file using multipart/form-data.",
  });
});

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

export default router;