# Phase 3 — File Uploads

## Goal

Phase 3 adds a working file upload path for EasyData apps. The current implementation uses local server storage so the project can demonstrate student photo and document uploads before adding Cloudflare R2 or another object storage provider.

## Implemented Local Storage Flow

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

Uploaded files are stored in the local `uploads/` directory. The API returns a public local URL such as `/uploads/example.png`, which can be saved into an app table column like `photo_url`.

## Upload Restrictions

Local uploads now enforce basic safety limits:

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

- returning local upload instructions
- successful image upload
- saving an uploaded file URL into a row
- rejecting unsupported file types
- rejecting oversized files

Run validation with:

```bash
npm test
npm run typecheck
```

## Current Limitations

- Files are stored on the server disk, so backups and disk usage must be managed by the server owner.
- Upload URLs are local endpoints, not presigned object storage URLs.
- Access control for viewing files is not yet time-limited.
- Production deployments should move to Cloudflare R2 or similar object storage before broad school use.

## Next Step

After local upload validation, the next production-oriented step is replacing local storage with Cloudflare R2 presigned upload URLs while keeping the same MCP-facing `get_upload_url` tool shape.
