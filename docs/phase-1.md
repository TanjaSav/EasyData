# Phase 1 — Foundation

## Goal

Set up the EasyData development environment and build the core REST API server with a SQLite backend.

The purpose of this phase was to create a working backend foundation that can later be controlled through MCP tools and used by Claude.

---

## Completed Work

### 1. Development Environment

The project was set up on an Ubuntu server with:

- Node.js
- Express
- TypeScript
- SQLite
- VS Code Remote SSH development workflow
---

### 2. Core REST API Server

A TypeScript Express server was created as the main EasyData backend.

Implemented base endpoints:


```http
GET /
GET /health
```
---

### 3. SQLite Backend

EasyData uses a simple SQLite-based architecture:

```one app = one SQLite database file```

Each app has its own `.sqlite` database file inside the data directory.

App metadata is stored in the internal `_easydata_meta` table.

---

### 4. App Management

Implemented app creation and admin-only app listing:
```POST /apps
GET  /apps  # admin-only
```

When an app is created, EasyData generates:

- app id
- app name
- optional description
- API token
- creation timestamp
- default retention policy

---

### 5. Token-Based Authentication

Implemented simple Bearer token authentication.

Protected app-specific endpoints require:

```Authorization: Bearer app_xxx
```

Requests without a valid token return an authorization error.

---

### 6. Schema and Table Management

Implemented database schema inspection and dynamic table creation:

```GET  /apps/:id/schema
POST /apps/:id/tables
PUT  /apps/:id/tables/:table
```

Supported column types:

- TEXT
- INTEGER
- REAL
- BOOLEAN

---

### 7. Row CRUD Operations

Implemented basic CRUD operations for table rows:

```GET    /apps/:id/tables/:table/rows
POST   /apps/:id/tables/:table/rows
PUT    /apps/:id/tables/:table/rows/:rowId
DELETE /apps/:id/tables/:table/rows/:rowId
```
---

### 8. Query Parameters

Implemented basic query support for row retrieval:

```?where=
?order=
?limit=
```

Example:
```
GET /apps/:id/tables/submissions/rows?limit=10
```
---

### 9. Local File Upload Flow

Implemented local file upload support based on the project requirements.

Endpoints:

```POST /apps/:id/upload-url
POST /apps/:id/files
GET  /apps/:id/files/:fileName/view?expires=...&signature=...
POST /apps/:id/files/:fileName/view-url
```

Files are stored in the local `uploads` folder, but they are viewed through signed app file URLs rather than public `/uploads` URLs.

---

### 10. Project Structure

The project was refactored into a cleaner structure:
```
src/
  middleware/
  routes/
  services/
  types/
  mcp/

tests/
public/
docs/
```
Main separation:

- routes — HTTP route definitions
- services — business logic and SQLite operations
- middleware — authentication and upload handling
- types — TypeScript types
- tests — automated API tests
- public — browser fetch demo
---

### 11. Automated Tests

Initial automated tests were added using:

- Vitest
- Supertest

Test coverage includes:

- app creation
- auth validation
- schema access
- table creation
- row insertion
- row querying

Tests can be run with:

```npm test
```
---

### 12. Browser Fetch Demo

Added a simple browser demo:

```/public/test-client.html
```

The demo verifies that the API can be called from a browser using `fetch()`.

It supports:

- creating an app
- creating a table
- inserting a row
- querying rows
---


## Implemented API Endpoints
```
POST   /apps
GET    /apps  # admin-only
GET    /apps/:id/schema

POST   /apps/:id/tables
PUT    /apps/:id/tables/:table

GET    /apps/:id/tables/:table/rows
POST   /apps/:id/tables/:table/rows
PUT    /apps/:id/tables/:table/rows/:rowId
DELETE /apps/:id/tables/:table/rows/:rowId

POST   /apps/:id/upload-url
POST   /apps/:id/files
GET    /apps/:id/files/:fileName/view?expires=...&signature=...
POST   /apps/:id/files/:fileName/view-url
```
## Validation

Phase 1 was tested with:

curl requests
browser fetch demo
automated tests
---

##  Result

Phase 1 successfully delivered a working EasyData backend.

The backend can:

- create database-backed apps
- generate API tokens
- create and modify tables
- insert, read, update, and delete rows
- upload files locally and serve them through signed URLs
- expose a browser-callable REST API
- pass automated API tests