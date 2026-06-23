import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { createApp, getAppMeta, getPaidStorageQuotaBytes, listApps } from "../services/app.service.js";
import {
  getGeneratedAppFullUrl,
  writeGeneratedApp,
} from "../services/generated-app.service.js";
import { getClientErrors } from "../services/client-error.service.js";
import {
  createGameTemplate,
  getTemplate,
  getPublishedAppSource,
  listPublishedAppVersions,
  patchPublishedApp,
  rollbackPublishedApp,
  runPublishedAppHealthCheck,
  savePublishedAppVersion,
  validateEasyDataHtml,
} from "../services/published-app-observability.service.js";
import {
  getAppSchema,
  createTable,
  alterTable,
  insertRow,
  getRows,
  updateRow,
  deleteRow,
} from "../services/table.service.js";
import {
  getAppStorageQuotaBytes,
  getAppStorageUsageBytes,
} from "../services/file.service.js";
import path from "path";
import Database from "better-sqlite3";

// Creates an EasyData MCP server instance.
// A fresh instance is needed for each Streamable HTTP request.
export function createEasyDataMcpServer() {
  const server = new McpServer({
    name: "easydata-mcp",
    version: "0.1.0",
  });

  // Exposes a query resource that scans all EasyData SQLite databases for matching text.
  // The Chrome extension uses this to retrieve relevant context.
  server.resource(
    "Query EasyData Databases",
    new ResourceTemplate("easydata://query?q={q}", { list: undefined }),
    async (uri, { q }) => {
      const queryStr = String(q || "");
      const DATA_DIR = process.env.DATA_DIR || "./data/apps";
      
      const apps = listApps();
      const results: any[] = [];

      for (const app of apps) {
        try {
          const schema = getAppSchema(app.id);
          for (const tableInfo of schema) {
            const textColumns = tableInfo.columns
              .filter((c: any) => c.type === "TEXT")
              .map((c: any) => c.name);

            if (textColumns.length === 0) continue;

            const whereClauses = textColumns.map(col => `${col} LIKE ?`).join(" OR ");
            const dbPath = path.join(DATA_DIR, `${app.id}.sqlite`);
            const db = new Database(dbPath);
            
            const matchingRows = db
              .prepare(`SELECT * FROM ${tableInfo.table} WHERE ${whereClauses} LIMIT 10`)
              .all(...textColumns.map(() => `%${queryStr}%`));
              
            db.close();

            if (matchingRows.length > 0) {
              results.push({
                appName: app.name,
                appId: app.id,
                table: tableInfo.table,
                rows: matchingRows
              });
            }
          }
        } catch (err) {
          // Ignore errors for individual apps
        }
      }

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    }
  );

  // list_apps is intentionally not exposed over teacher-facing MCP.
  // Use the admin-protected REST GET /apps endpoint for server administration.


  // Exposes a tool that creates a new EasyData app.
  // Claude can use this when a teacher asks for a new database-backed app.
  server.tool(
    "create_app",
    {
      name: z.string().min(1).describe("The name of the new app"),
      description: z
        .string()
        .optional()
        .describe("Optional description of the app purpose"),
    },
    async ({ name, description }) => {
      const app = createApp(name, description);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(app, null, 2),
          },
        ],
      };
    }
  );

  // Exposes a tool that returns the SQLite schema for a specific EasyData app.
  // Claude can use this before modifying an existing app or table.
  server.tool(
    "get_schema",
    {
      appId: z.string().min(1).describe("The EasyData app id"),
    },
    async ({ appId }) => {
      const schema = getAppSchema(appId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                appId,
                schema,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Exposes a tool that creates a new table inside an EasyData app.
  // Claude can use this after deciding what data structure the teacher needs.
  server.tool(
    "create_table",
    {
      appId: z.string().min(1).describe("The EasyData app id"),
      tableName: z.string().min(1).describe("The name of the table to create"),
      confirmSensitiveData: z
        .boolean()
        .optional()
        .describe("Set to true only after the teacher has reviewed and confirmed warnings about collecting sensitive student data"),
      columns: z
        .array(
          z.object({
            name: z.string().min(1).describe("The column name"),
            type: z
              .enum(["TEXT", "INTEGER", "REAL", "BOOLEAN"])
              .describe("The SQLite column type"),
          })
        )
        .describe("The list of columns for the new table"),
    },
    async ({ appId, tableName, columns, confirmSensitiveData }) => {
      const result = createTable(appId, {
        tableName,
        columns,
        confirmSensitiveData,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // Exposes a tool that adds new columns to an existing table.
  // Claude can use this when the teacher wants to extend the app structure.
  server.tool(
    "alter_table",
    {
      appId: z.string().min(1).describe("The EasyData app id"),
      tableName: z
        .string()
        .min(1)
        .describe("The table that will receive new columns"),
      confirmSensitiveData: z
        .boolean()
        .optional()
        .describe("Set to true only after the teacher has reviewed and confirmed warnings about collecting sensitive student data"),
      columns: z
        .array(
          z.object({
            name: z.string().min(1).describe("The column name"),
            type: z
              .enum(["TEXT", "INTEGER", "REAL", "BOOLEAN"])
              .describe("The SQLite column type"),
          })
        )
        .describe("The new columns that should be added"),
    },
    async ({ appId, tableName, columns, confirmSensitiveData }) => {
      const result = alterTable(
        appId,
        tableName,
        columns,
        confirmSensitiveData ?? false
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // Exposes a tool that inserts a row into an existing table.
  // Claude can use this to store teacher or student-submitted data.
  server.tool(
    "insert_row",
    {
      appId: z.string().min(1).describe("The EasyData app id"),
      tableName: z
        .string()
        .min(1)
        .describe("The table where the row will be inserted"),
      data: z
        .record(z.string(), z.unknown())
        .describe("The row data as a JSON object with column names as keys"),
    },
    async ({ appId, tableName, data }) => {
      const result = insertRow(appId, tableName, data);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // Exposes a tool that queries rows from an existing table.
  // Claude can use this when the teacher asks to view stored data.
  server.tool(
    "query_rows",
    {
      appId: z.string().min(1).describe("The EasyData app id"),
      tableName: z.string().min(1).describe("The table to query"),
      where: z
        .string()
        .optional()
        .describe("Optional equality filter in the format column:value. Only one column can be filtered, and only exact equality is supported"),
      order: z
        .string()
        .optional()
        .describe("Optional sort order in the format column:asc or column:desc. Only one column can be sorted"),
      limit: z
        .string()
        .optional()
        .describe("Optional maximum number of rows to return, from 1 to 500, provided as a string"),
    },
    async ({ appId, tableName, where, order, limit }) => {
      const query: { where?: string; order?: string; limit?: string } = {};
      if (where !== undefined) query.where = where;
      if (order !== undefined) query.order = order;
      if (limit !== undefined) query.limit = limit;

      const rows = getRows(appId, tableName, query);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                appId,
                table: tableName,
                query: {
                  where: where ?? null,
                  order: order ?? null,
                  limit: limit ?? null,
                },
                rows,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Exposes a tool that updates an existing row by id.
  // Claude can use this when a teacher asks to correct or modify stored data.
  server.tool(
    "update_row",
    {
      appId: z.string().min(1).describe("The EasyData app id"),
      tableName: z.string().min(1).describe("The table where the row exists"),
      rowId: z.string().min(1).describe("The row id to update"),
      data: z
        .record(z.string(), z.unknown())
        .describe("The fields to update as a JSON object"),
    },
    async ({ appId, tableName, rowId, data }) => {
      const result = updateRow(appId, tableName, rowId, data);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // Exposes a tool that deletes an existing row by id.
  // Claude can use this when a teacher asks to remove a record.
  server.tool(
    "delete_row",
    {
      appId: z.string().min(1).describe("The EasyData app id"),
      tableName: z.string().min(1).describe("The table where the row exists"),
      rowId: z.string().min(1).describe("The row id to delete"),
    },
    async ({ appId, tableName, rowId }) => {
      const result = deleteRow(appId, tableName, rowId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // Exposes a tool that returns the local upload endpoint.
  // Claude can use this before uploading files into EasyData.
  server.tool(
    "get_upload_url",
    {
      appId: z.string().min(1).describe("The EasyData app id"),
    },
    async ({ appId }) => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                appId,
                uploadUrl: `/apps/${appId}/files`,
                method: "POST",
                fieldName: "file",
                note: "Local storage mode. Upload using multipart/form-data. Store the returned fileName in SQLite, not the signed viewUrl. Use POST /apps/{appId}/files/{fileName}/view-url with Authorization to refresh an expiring view URL when rendering.",
                limits: {
                  appStorageQuotaBytes: getAppStorageQuotaBytes(appId),
                  currentStorageUsageBytes: getAppStorageUsageBytes(appId),
                },
                billing: {
                  ...getAppMeta(appId).billing,
                  storageQuotaBytes: getAppStorageQuotaBytes(appId),
                },
                upgrade: {
                  plan: "paid_storage",
                  storageQuotaBytes: getPaidStorageQuotaBytes(),
                  checkoutUrl: getAppMeta(appId).billing.checkoutUrl ?? null,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Exposes a tool that publishes Claude-generated single-file HTML.
  // Claude can call this after creating an app and tables, then return fullUrl.
  server.tool(
    "publish_app",
    {
      appId: z
        .string()
        .uuid()
        .describe("The EasyData app id returned by create_app"),
      html: z
        .string()
        .min(1)
        .describe(
          "A complete single-file HTML app to publish as index.html. Browser fetch() calls must use relative EasyData REST URLs: GET/POST /apps/{appId}/tables/{tableName}/rows, PUT /apps/{appId}/tables/{tableName}/rows/{rowId}, DELETE /apps/{appId}/tables/{tableName}/rows/{rowId}. Include Authorization: Bearer {apiToken}. Do not use /api, /api/apps, /api/{appId}, or PATCH."
        ),
    },
    async ({ appId, html }) => {
      const appUrl = writeGeneratedApp(appId, html);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                appId,
                appUrl,
                fullUrl: getGeneratedAppFullUrl(appUrl),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );


  server.tool(
    "get_published_app_source",
    {
      appId: z.string().min(1).describe("The EasyData app id"),
    },
    async ({ appId }) => {
      const source = getPublishedAppSource(appId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(source, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "validate_easydata_html",
    {
      appId: z.string().min(1).describe("The EasyData app id"),
      html: z.string().min(1).describe("The HTML to validate before publishing"),
    },
    async ({ appId, html }) => {
      const result = validateEasyDataHtml(appId, html);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "run_app_health_check",
    {
      appId: z.string().min(1).describe("The EasyData app id"),
    },
    async ({ appId }) => {
      const result = runPublishedAppHealthCheck(appId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "test_rest_call",
    {
      appId: z.string().min(1).describe("The EasyData app id"),
      method: z.enum(["GET", "POST", "PUT", "DELETE"]).describe("The REST method to test"),
      path: z.string().min(1).describe("The EasyData REST path, for example /apps/{appId}/tables/scores/rows"),
      body: z.record(z.string(), z.unknown()).optional().describe("Optional JSON request body"),
    },
    async ({ appId, method, path: requestPath, body }) => {
      const prefix = `/apps/${appId}/tables/`;
      if (!requestPath.startsWith(prefix)) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: 400,
                  response: {
                    error: "Only /apps/{appId}/tables/{table}/rows paths are supported by test_rest_call.",
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const suffix = requestPath.slice(prefix.length);
      const match = suffix.match(/^([^/]+)\/rows(?:\/([^/?#]+))?/);
      if (!match?.[1]) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ status: 400, response: { error: "Invalid rows path" } }, null, 2),
            },
          ],
        };
      }

      const tableName = match[1];
      const rowId = match[2];
      let status = 200;
      let response: unknown;

      try {
        if (method === "GET") {
          const url = new URL(`https://easydata.local${requestPath}`);
          response = {
            appId,
            table: tableName,
            rows: getRows(appId, tableName, {
              ...(url.searchParams.get("where") && { where: url.searchParams.get("where") as string }),
              ...(url.searchParams.get("order") && { order: url.searchParams.get("order") as string }),
              ...(url.searchParams.get("limit") && { limit: url.searchParams.get("limit") as string }),
            }),
          };
        } else if (method === "POST") {
          status = 201;
          response = insertRow(appId, tableName, body ?? {});
        } else if (method === "PUT") {
          if (!rowId) throw new Error("PUT requires a row id in the path");
          response = updateRow(appId, tableName, rowId, body ?? {});
        } else {
          if (!rowId) throw new Error("DELETE requires a row id in the path");
          response = deleteRow(appId, tableName, rowId);
        }
      } catch (error: any) {
        status = 400;
        response = { error: error.message };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ status, response }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "publish_app_versioned",
    {
      appId: z.string().uuid().describe("The EasyData app id returned by create_app"),
      html: z.string().min(1).describe("A complete single-file HTML app to publish as index.html"),
    },
    async ({ appId, html }) => {
      let backupVersionId: string | null = null;
      try {
        backupVersionId = savePublishedAppVersion(appId, "before publish").versionId;
      } catch {
        backupVersionId = null;
      }
      const validation = validateEasyDataHtml(appId, html);
      if (!validation.valid) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ appId, published: false, validation }, null, 2),
            },
          ],
        };
      }
      const appUrl = writeGeneratedApp(appId, html);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                appId,
                appUrl,
                fullUrl: getGeneratedAppFullUrl(appUrl),
                backupVersionId,
                validation,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "list_app_versions",
    {
      appId: z.string().min(1).describe("The EasyData app id"),
    },
    async ({ appId }) => {
      const result = listPublishedAppVersions(appId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "rollback_app",
    {
      appId: z.string().min(1).describe("The EasyData app id"),
      versionId: z.string().min(1).describe("The version id to restore"),
    },
    async ({ appId, versionId }) => {
      const result = rollbackPublishedApp(appId, versionId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "patch_published_app",
    {
      appId: z.string().min(1).describe("The EasyData app id"),
      replacements: z
        .array(
          z.object({
            find: z.string().min(1).describe("Exact text to find"),
            replace: z.string().describe("Replacement text"),
          })
        )
        .min(1)
        .describe("Exact string replacements. The tool fails if any find text is not present."),
    },
    async ({ appId, replacements }) => {
      const result = patchPublishedApp(appId, replacements);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );


  server.tool(
    "get_client_errors",
    {
      appId: z.string().min(1).describe("The EasyData app id"),
      since: z.string().optional().describe("Optional ISO timestamp; only errors at or after this time are returned"),
      limit: z.number().int().positive().max(200).optional().describe("Maximum number of errors to return"),
    },
    async ({ appId, since, limit }) => {
      const result = getClientErrors(appId, since, limit ?? 50);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "get_template",
    {
      kind: z.string().min(1).describe("Template kind, for example shared-highscore-game"),
    },
    async ({ kind }) => {
      const result = getTemplate(kind);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "create_game_template",
    {
      appId: z.string().min(1).describe("The EasyData app id"),
      tableName: z.string().min(1).optional().describe("Scores table name; defaults to scores"),
      template: z.string().optional().describe("Template kind; defaults to shared-highscore-game"),
    },
    async ({ appId, tableName, template }) => {
      const result = createGameTemplate({
        appId,
        ...(tableName && { tableName }),
        ...(template && { template }),
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  return server;
}

// Starts the MCP server over stdio when this file is run directly.
// The HTTP server imports createEasyDataMcpServer instead of using this entry point.
async function main() {
  const transport = new StdioServerTransport();
  const server = createEasyDataMcpServer();
  await server.connect(transport);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  main().catch((error) => {
    console.error("Failed to start EasyData MCP server:", error);
    process.exit(1);
  });
}
