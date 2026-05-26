import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { createApp, listApps } from "../services/app.service.js";
import {
  getAppSchema,
  createTable,
  alterTable,
  insertRow,
  getRows,
  updateRow,
  deleteRow,
} from "../services/table.service.js";

// Creates an EasyData MCP server instance.
// A fresh instance is needed for each Streamable HTTP request.
export function createEasyDataMcpServer() {
  const server = new McpServer({
    name: "easydata-mcp",
    version: "0.1.0",
  });

  // Exposes a tool that returns all existing EasyData apps.
  // This is useful for checking what apps are already available.
  server.tool("list_apps", {}, async () => {
    const apps = listApps();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              count: apps.length,
              apps,
            },
            null,
            2
          ),
        },
      ],
    };
  });

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
    async ({ appId, tableName, columns }) => {
      const result = createTable(appId, {
        tableName,
        columns,
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
    async ({ appId, tableName, columns }) => {
      const result = alterTable(appId, tableName, columns);

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
        .describe("Optional filter in column:value format"),
      order: z
        .string()
        .optional()
        .describe("Optional order in column:asc or column:desc format"),
      limit: z.string().optional().describe("Optional row limit from 1 to 500"),
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
                note: "Local storage mode. Upload using multipart/form-data.",
              },
              null,
              2
            ),
          },
        ],
      };
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
