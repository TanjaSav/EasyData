# EasyData

EasyData is a small open-source platform for creating database-backed classroom apps without asking teachers to manage a database console, API keys, or server infrastructure.

An AI assistant connects to EasyData through MCP, creates an app database, defines tables, publishes a single-file HTML app, and gives the teacher a working URL.

## Current Status

The current milestone implements:

- Express REST API with one SQLite database per app
- MCP server over stdio and Streamable HTTP
- app-scoped API tokens
- table creation and alteration
- row CRUD with constrained filtering, ordering, and limits
- generated app publishing under `/generated/{appId}/`
- local VPS file uploads with signed expiring view URLs
- app storage quotas and paid-storage activation hooks
- sensitivity warnings for student data fields
- retention metadata, export, row deletion, and app deletion
- audit logging, rate limiting, and generated-app validation
- documentation for Claude, ChatGPT, and Gemini connection paths

Cloudflare R2-style object storage is not required for the current VPS deployment. It remains a future scaling option.

## Quick Start

```bash
npm install
npm run typecheck
npm test -- --run
npm run dev
```

The HTTP server defaults to port `3000`.

```http
GET http://localhost:3000/health
POST http://localhost:3000/mcp
```

## Environment

Useful environment variables:

- `PORT`: HTTP port, default `3000`
- `DATA_DIR`: SQLite app database directory, default `./data/apps`
- `UPLOAD_DIR`: local uploaded file directory, default `./uploads`
- `PUBLIC_BASE_URL`: public origin used for generated app URLs, default `https://easydata.is`
- `EASYDATA_ADMIN_TOKEN`: required for admin-only routes such as `GET /apps`
- `APP_STORAGE_QUOTA_BYTES`: free per-app storage quota, default `52428800`
- `PAID_APP_STORAGE_QUOTA_BYTES`: paid per-app quota, default `1073741824`
- `STORAGE_UPGRADE_CHECKOUT_URL`: optional payment checkout base URL
- `FILE_VIEW_URL_TTL_SECONDS`: signed file view URL TTL, default `3600`

## REST API

Canonical browser endpoints:

```http
POST   /apps
GET    /apps                         # admin-only
GET    /apps/:id/schema
POST   /apps/:id/tables
PUT    /apps/:id/tables/:table
GET    /apps/:id/tables/:table/rows
POST   /apps/:id/tables/:table/rows
PUT    /apps/:id/tables/:table/rows/:rowId
DELETE /apps/:id/tables/:table/rows/:rowId
GET    /apps/:id/export
GET    /apps/:id/export?format=csv
POST   /apps/:id/upload-url
POST   /apps/:id/files
POST   /apps/:id/files/:fileName/view-url
GET    /apps/:id/files/:fileName/view?expires=...&signature=...
```

App-specific routes require:

```http
Authorization: Bearer {appApiToken}
```

## MCP

Run stdio MCP locally:

```bash
npm run mcp
```

The HTTP server exposes Streamable HTTP MCP at:

```http
POST /mcp
```

Documented tools are in [`docs/mcp-tools.md`](docs/mcp-tools.md).

## Data Protection

EasyData is intended for classroom use and includes basic guardrails:

- sensitive schema detection with explicit confirmation
- default end-of-school-year retention metadata
- row and app deletion
- JSON and CSV export before deletion
- signed file URLs instead of public upload paths
- no analytics or behavioral tracking in the platform code

Teacher-facing guidance is in [`docs/data-protection-guide.md`](docs/data-protection-guide.md) and [`docs/data-protection-guide.is.md`](docs/data-protection-guide.is.md).

## Operations

Deployment, backup, restore, and launch notes are in [`docs/operations.md`](docs/operations.md).

## License

MIT. See [`LICENSE`](LICENSE).
