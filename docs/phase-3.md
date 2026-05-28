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
GET  /uploads/:fileName
```

The `upload-url` endpoint returns upload instructions for generated browser apps:

- `uploadUrl`: the app-specific upload endpoint
- `method`: `POST`
- `fieldName`: `file`
- `limits`: allowed file types, extensions, and max file size

Uploaded files are stored in the server-side `uploads/` directory on the VPS. The API returns a URL such as `/uploads/example.png`, which can be saved into an app table column like `photo_url`.

## Upload Restrictions

Server uploads now enforce basic safety limits:

- maximum size: 5 MB
- allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- allowed extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`

Unsupported files such as JavaScript, HTML, SVG, executables, or oversized uploads are rejected with a `400` response.

## Demonstrated Teacher Workflow

A generated student submission app can now:

1. Ask EasyData for upload instructions with `POST /apps/:id/upload-url`.
2. Upload an image with `multipart/form-data` to `POST /apps/:id/files`.
3. Receive a file URL from EasyData.
4. Save that URL in SQLite using the row insert endpoint.
5. Display the uploaded image in the teacher-facing app.

## Validation

Automated tests cover:

- returning VPS upload instructions
- successful image upload
- saving an uploaded file URL into a row
- rejecting unsupported file types
- rejecting oversized files

Run validation with:

```bash
npm test -- --run
npm run typecheck
```

Latest validation:

- `npm test -- --run`: 12 tests passed
- `npm run typecheck`: passed

## Completed Deliverable

Phase 3 deliverable from the project brief:

> Photo/file upload works seamlessly in Claude-generated apps.

Current result:

- VPS upload discovery works through the REST API
- VPS upload discovery is exposed through the MCP `get_upload_url` tool
- generated apps can upload allowed files through `multipart/form-data`
- uploaded file URLs can be stored in app tables
- uploaded files can be viewed through `/uploads/:fileName`
- unsupported or oversized files are rejected

## Current Limitations

- Files are stored on the VPS server disk, so backups and disk usage must be managed on the VPS.
- Upload URLs are EasyData server endpoints, not third-party object storage URLs.
- Access control for viewing files is not yet time-limited.
- Storage quotas and cleanup rules still need to be defined before broad school use.

## Deferred Production Work

These items should be handled before broad school use, but they do not block Phase 4:

1. Add storage quotas per app or teacher.
2. Add backup and restore procedures for the VPS `uploads/` directory.
3. Add cleanup procedures for deleted or expired app data.
4. Decide whether uploaded files should stay publicly readable under `/uploads/:fileName` or require signed access.
5. Keep Cloudflare R2 or another S3-compatible object store as an optional future scaling path only if VPS disk storage becomes insufficient.

## Next Phase

The project should now move to Phase 4: ethics, security, and guardrails.

The first Phase 4 priorities are:

1. Validate table names, column names, and query identifiers before they are interpolated into SQL.
2. Add schema-level sensitivity warnings for fields such as `student_name`, `photo`, `health`, `location`, and `behavior`.
3. Add app deletion and row deletion documentation for right-to-deletion workflows.
4. Define data retention defaults for classroom apps.
