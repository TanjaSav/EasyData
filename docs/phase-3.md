# Phase 3 — File Uploads

## Status

Phase 3 is complete for the current internship milestone.

The project now has a working VPS-based upload flow that can be used by Claude-generated apps and tested end-to-end with the existing EasyData API. This satisfies the Phase 3 demonstration goal: students can upload an image or PDF, EasyData stores it on the server, returns a file URL, and the generated app can save that URL into SQLite.

Cloud object storage is not required for the current deployment. Uploaded files are intentionally stored on the VPS server disk. Future object storage such as Cloudflare R2 is only an optional scaling path if server disk storage becomes insufficient.

## Goal

Phase 3 adds a working file upload path for EasyData apps. The current implementation stores uploaded files on the VPS server disk, which matches the current deployment model.

## Implemented VPS Storage Flow

EasyData exposes these endpoints:

```http
POST /apps/:id/upload-url
POST /apps/:id/files
GET  /apps/:id/files/:fileName/view?expires=...&signature=...
POST /apps/:id/files/:fileName/view-url
```

The `upload-url` endpoint returns upload instructions for generated browser apps:

- `uploadUrl`: the app-specific upload endpoint
- `method`: `POST`
- `fieldName`: `file`
- `limits`: allowed file types, extensions, max file size, app storage quota, and current app storage usage

Uploaded files are stored in the server-side `uploads/` directory on the VPS. New files are named with the owning `appId` and are not served through public static `/uploads` URLs. The upload response returns both a stable `fileName` and a signed, expiring `viewUrl` such as `/apps/:id/files/:fileName/view?expires=...&signature=...`. Generated apps should store the stable `fileName` in SQLite, then request a fresh view URL when rendering older records.

## Upload Restrictions

Server uploads now enforce basic safety limits:

- maximum size per file: 5 MB
- default storage quota per app: 50 MB
- configurable storage quota with `APP_STORAGE_QUOTA_BYTES`
- configurable signed view URL TTL with `FILE_VIEW_URL_TTL_SECONDS`
- allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- allowed extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`

Unsupported files such as JavaScript, HTML, SVG, executables, or oversized uploads are rejected with a `400` response.

## Demonstrated Teacher Workflow

A generated student submission app can now:

1. Ask EasyData for upload instructions with `POST /apps/:id/upload-url`.
2. Upload an image with `multipart/form-data` to `POST /apps/:id/files`.
3. Receive a stable `fileName` and temporary `viewUrl` from EasyData.
4. Save the stable `fileName` in SQLite.
5. Display the uploaded image with the returned temporary `viewUrl`.
6. Later, when rendering existing records, call `POST /apps/:id/files/:fileName/view-url` with the app token to get a fresh signed view URL.

## Validation

Automated tests cover:

- returning VPS upload instructions
- successful image upload
- saving an uploaded file URL into a row
- rejecting unsupported file types
- rejecting oversized files
- rejecting over-quota files
- rejecting files whose content does not match their declared type
- signed file access and signed URL refresh

Run validation with:

```bash
npm test -- --run
npm run typecheck
```

Latest validation:

- `npm test -- --run`: 25 tests passed
- `npm run typecheck`: passed

## Completed Deliverable

Phase 3 deliverable from the project brief:

> Photo/file upload works seamlessly in Claude-generated apps.

Current result:

- VPS upload discovery works through the REST API
- VPS upload discovery is exposed through the MCP `get_upload_url` tool
- generated apps can upload allowed files through `multipart/form-data`
- stable uploaded file names can be stored in app tables
- fresh signed view URLs can be generated from stored file names
- uploaded files can be viewed through signed app file URLs
- unsigned or expired file view requests are rejected
- unsupported, oversized, or over-quota files are rejected

