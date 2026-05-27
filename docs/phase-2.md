# Phase 2 — MCP Integration

## Goal

Phase 2 connects EasyData to the Model Context Protocol so an AI assistant can act as the database administrator for a teacher. The assistant should be able to create an app, define tables, inspect schemas, and perform row operations through tools instead of asking the teacher to use a terminal or database console.

The result is the bridge between the Phase 1 REST API and the natural-language app creation workflow described in the project brief.

## Scope

Phase 2 covers:

- MCP server setup with the TypeScript MCP SDK
- Tool definitions for EasyData app and table operations
- stdio transport for desktop assistant clients
- Streamable HTTP support through the Express server
- Claude Desktop validation over HTTPS
- documentation for the exposed tools

It does not cover production object storage, GDPR guardrails, retention policies, or the final hosted launch flow. Those belong to later phases.

## Implemented Architecture

The MCP implementation lives in `src/mcp/server.ts`.

The server exposes `createEasyDataMcpServer()`, which creates a fresh MCP server instance and registers the EasyData tools. A fresh instance is important for the HTTP transport because each `POST /mcp` request should get an isolated server/transport lifecycle.

Supported transports:

- stdio: used when `src/mcp/server.ts` is run directly
- Streamable HTTP: exposed by the main Express app at `POST /mcp`

Launcher script:

```bash
./start-mcp.sh
```

The launcher changes into the project directory and starts:

```bash
./node_modules/.bin/tsx src/mcp/server.ts
```

This keeps the project TypeScript-first and avoids compiling source files into JavaScript.

## Implemented Tools

The MCP server currently exposes ten tools:

- `list_apps`
- `create_app`
- `get_schema`
- `create_table`
- `alter_table`
- `insert_row`
- `query_rows`
- `update_row`
- `delete_row`
- `get_upload_url`

Full tool inputs and outputs are documented in `docs/mcp-tools.md`.

## Tool Design Notes

The tools intentionally mirror the REST API and service layer from Phase 1. This keeps behavior consistent whether an app is created by a browser, an assistant, or a test.

Key decisions:

- App creation returns the API token so generated HTML can work immediately.
- Tables use a simple column model with four supported SQLite types.
- Every table gets an automatic `id` primary key.
- Row operations accept plain JSON objects.
- Queries use constrained string formats for `where`, `order`, and `limit`.
- Upload discovery returns the local upload endpoint instead of pretending to provide presigned URLs.

## Claude Desktop Integration

Claude Desktop was connected to the EasyData MCP server over HTTPS.

Final working setup:

- Claude Desktop on Windows
- EasyData server running on Ubuntu
- HTTPS connection to the EasyData MCP endpoint
- Streamable HTTP transport exposed by Express at `POST /mcp`
- stdio transport still available for local or command-based MCP clients through `start-mcp.sh`

Earlier SSH-based testing was useful while bringing the server up, but the current integration path is HTTPS, not PuTTY `plink`.

## Validation

Phase 2 was validated with:

- MCP Inspector
- Claude Desktop tool execution
- manual end-to-end tool workflows
- existing Vitest/Supertest API tests for the underlying service behavior

Validated assistant actions:

1. List existing apps.
2. Create a new EasyData app.
3. Create database tables.
4. Retrieve schema information.
5. Insert rows.
6. Query rows.
7. Update rows.
8. Delete rows.
9. Add columns to an existing table.
10. Retrieve the local upload endpoint.

Example natural-language request:

```text
Create a Student Photo Gallery app with a submissions table.
```

Expected assistant workflow:

1. Call `create_app`.
2. Call `create_table` with fields such as `student_name`, `photo_url`, `caption`, and `submitted_at`.
3. Call `get_schema` to verify the table.
4. Generate a single-file HTML frontend using the returned `appId` and `apiToken`.

## Current Result

Phase 2 successfully demonstrates that an assistant can create and manage complete EasyData database structures through MCP tools. The teacher-facing workflow is now possible: the teacher describes an app, the assistant creates the data model, and the assistant can generate a browser app that talks to EasyData through the REST API.

## Known Limitations

- Authentication is still app-token based; there is no teacher identity or school SSO yet.
- MCP tools do not yet implement schema-level privacy warnings.
- File upload support is local disk based, not Cloudflare R2 or another object store.
- Query support is intentionally simple and does not yet support compound filters.
- The service layer still needs stronger identifier validation before untrusted public use.

## Next Steps

Recommended follow-up work:

1. Add schema sensitivity warnings for names such as `photo`, `health`, `location`, or `student_name`.
2. Add safer validation for table names and column names.
3. Add object storage support and replace local upload discovery with real presigned upload URLs.
4. Add app export and deletion flows.
5. Expand MCP validation tests so tool registration and tool execution are covered automatically.
6. Document Claude Desktop configuration examples for Windows, macOS, and Linux.
