# EasyData MCP Tools

EasyData exposes an MCP server so AI assistants can create and manage small database-backed applications without direct database access. The tools wrap the same core services used by the REST API: app provisioning, schema inspection, table management, row CRUD, and local file upload discovery.

The server can run over stdio from `src/mcp/server.ts`, and the HTTP API can create a fresh MCP server instance for each `POST /mcp` request.

## Data Model

Each EasyData app has its own SQLite database file in `data/apps`. Every app receives an `appId` and an `apiToken` when it is created. Tables created through MCP automatically receive an integer `id` primary key column.

Supported user-defined column types:

- `TEXT`
- `INTEGER`
- `REAL`
- `BOOLEAN`

Tool responses are returned as JSON-formatted text content so assistants can read the result and continue the workflow.

## Tools

### `list_apps`

Returns all EasyData apps currently available on the server.

Inputs: none

Returns:

- `count`: number of apps
- `apps`: app metadata objects, including `id`, `name`, `description`, `apiToken`, and `createdAt`

Use when an assistant needs to find an existing app before creating or modifying tables.

### `create_app`

Creates a new EasyData app with its own SQLite database and API token.

Inputs:

- `name`: string, required
- `description`: string, optional

Returns the created app metadata:

- `id`
- `name`
- `description`
- `apiToken`
- `createdAt`

Use this first when a teacher asks for a new database-backed app.

### `get_schema`

Returns the current SQLite schema for one app.

Inputs:

- `appId`: string, required

Returns:

- `appId`
- `schema`: list of tables and column metadata from SQLite `PRAGMA table_info`

Use before altering an existing app or when the assistant needs to understand what tables and columns already exist.

### `create_table`

Creates a table inside an app database.

Inputs:

- `appId`: string, required
- `tableName`: string, required
- `columns`: array of column definitions

Column definition:

- `name`: string, required
- `type`: one of `TEXT`, `INTEGER`, `REAL`, `BOOLEAN`

Returns:

- `success`: boolean
- `table`: created table name

EasyData adds `id INTEGER PRIMARY KEY AUTOINCREMENT` automatically. Do not include an `id` column in the input.

### `alter_table`

Adds new columns to an existing table.

Inputs:

- `appId`: string, required
- `tableName`: string, required
- `columns`: array of column definitions to add

Returns:

- `success`: boolean
- `table`: updated table name
- `addedColumns`: columns that were added

Use when the teacher asks to track an additional field after the app already exists.

### `insert_row`

Inserts one row into a table.

Inputs:

- `appId`: string, required
- `tableName`: string, required
- `data`: object whose keys match table column names

Returns:

- `success`: boolean
- `table`: table name
- `rowId`: inserted row id

Use for adding records such as submissions, inventory items, attendance entries, or scores.

### `query_rows`

Reads rows from a table with optional filtering, ordering, and limiting.

Inputs:

- `appId`: string, required
- `tableName`: string, required
- `where`: string, optional, format `column:value`
- `order`: string, optional, format `column:asc` or `column:desc`
- `limit`: string, optional, integer from `1` to `500`

Returns:

- `appId`
- `table`
- `query`: normalized query options
- `rows`: matching rows

Examples:

- `where: "student_name:Alex"`
- `order: "createdAt:desc"`
- `limit: "50"`

### `update_row`

Updates a row by its `id`.

Inputs:

- `appId`: string, required
- `tableName`: string, required
- `rowId`: string, required
- `data`: object containing the fields to update

Returns:

- `success`: boolean
- `table`: table name
- `rowId`
- `changes`: number of rows changed

Use for corrections, grading updates, status changes, and other edits to existing records.

### `delete_row`

Deletes a row by its `id`.

Inputs:

- `appId`: string, required
- `tableName`: string, required
- `rowId`: string, required

Returns:

- `success`: boolean
- `table`: table name
- `rowId`
- `changes`: number of rows deleted

Use when a teacher asks to remove a record or when data must be deleted.

### `get_upload_url`

Returns the local file upload endpoint for an app.

Inputs:

- `appId`: string, required

Returns:

- `appId`
- `uploadUrl`: `/apps/{appId}/files`
- `method`: `POST`
- `fieldName`: `file`
- `note`: local storage mode instructions

The current implementation uses local uploads with `multipart/form-data`. Uploaded files are served from `/uploads/{fileName}`.

## Typical Assistant Workflow

1. Call `create_app` for the requested teacher app.
2. Call `create_table` for each required table.
3. Call `get_schema` to verify the database structure.
4. Generate a single-file HTML app that uses `fetch()` against the EasyData REST endpoints.
5. Embed the created `appId` and `apiToken` when the generated page should work immediately.
6. Use `query_rows`, `insert_row`, `update_row`, or `delete_row` for data operations requested in conversation.
7. Use `get_upload_url` when the app needs file uploads.

## Current Limitations

- Query filtering supports one equality filter in `column:value` format.
- Ordering supports one column and `asc` or `desc` direction.
- `limit` is capped at 500 rows.
- File uploads use local disk storage, not presigned object storage yet.
- Table names and column names should be generated from trusted assistant logic and kept simple: lowercase letters, numbers, and underscores.

## Connecting to ChatGPT, Claude, and Gemini

For setup steps, see:
- [Connect EasyData MCP to ChatGPT and Claude](chatgpt-claude-mcp.md)
- [Connect EasyData MCP to Gemini](gemini-mcp.md)
