# EasyData Operations Runbook

This runbook covers the current VPS-based deployment model.

## Deployment Shape

- Node.js/Express API and MCP server in one process
- SQLite database file per app under `DATA_DIR` or `./data/apps`
- uploaded files under `UPLOAD_DIR` or `./uploads`
- public static assets and generated apps under `public/`
- HTTPS terminated by the VPS reverse proxy or hosting platform

## Required Production Environment

Set these before public use:

```bash
PORT=3000
PUBLIC_BASE_URL=https://easydata.is
EASYDATA_ADMIN_TOKEN=change-this-to-a-long-random-secret
DATA_DIR=/var/lib/easydata/apps
UPLOAD_DIR=/var/lib/easydata/uploads
APP_STORAGE_QUOTA_BYTES=52428800
FILE_VIEW_URL_TTL_SECONDS=3600
```

Recommended optional variables:

```bash
PAID_APP_STORAGE_QUOTA_BYTES=1073741824
STORAGE_UPGRADE_CHECKOUT_URL=https://payments.example/checkout
```

## Start and Health Check

```bash
npm ci
npm run typecheck
npm test -- --run
npm start
```

Health endpoint:

```http
GET /health
```

MCP endpoint:

```http
POST /mcp
```

## Backup Policy

Back up these paths together:

- `DATA_DIR` SQLite files
- `UPLOAD_DIR` app-owned files
- `public/generated` published generated apps

Suggested schedule for pilot use:

- daily encrypted backup
- keep 30 daily restore points
- test restore at least once before teacher pilot
- delete backups when the app retention period requires deletion, unless a school policy requires a longer backup window

SQLite backup should copy a stable snapshot. For low traffic pilots, stopping the service during backup is acceptable. For live use, use SQLite's `.backup` mechanism or filesystem snapshots.

## Restore Procedure

1. Stop the EasyData service.
2. Restore `DATA_DIR`, `UPLOAD_DIR`, and `public/generated` from the same backup timestamp.
3. Ensure file ownership matches the service user.
4. Start the service.
5. Run `GET /health`.
6. Open a known generated app and verify row reads and signed file refreshes.

## Retention Cleanup

Operators can inspect expired apps:

```http
GET /apps/retention/expired
Authorization: Bearer {EASYDATA_ADMIN_TOKEN}
```

Delete expired apps:

```http
POST /apps/retention/cleanup
Authorization: Bearer {EASYDATA_ADMIN_TOKEN}
```

Run cleanup manually during the pilot. Automate it only after the school retention policy is confirmed.

## Monitoring

Minimum production checks:

- process is running
- `/health` returns `200`
- disk usage for `DATA_DIR`, `UPLOAD_DIR`, and `public/generated`
- HTTP 4xx/5xx rates
- upload quota failures
- audit log growth
- client errors under `data/client-errors`

## Security Review Checklist

Before public teacher testing:

- set a strong `EASYDATA_ADMIN_TOKEN`
- serve only over HTTPS
- confirm `.env`, `data/`, `uploads/`, and logs are not publicly served
- run `npm audit` and review findings
- run `npm run typecheck` and `npm test -- --run`
- validate generated app publishing does not allow public `/uploads` URLs or admin token references
- test deletion of rows, apps, and app-owned uploaded files

## Current Product Decisions

- Teacher identity: pilot uses app-scoped tokens and an operator/admin token. School SSO is future work.
- App sharing: generated app URLs can be shared, but edit/admin flows are token-based. Multi-teacher ownership is future work.
- Hosting: EasyData serves generated HTML directly from `/generated/{appId}/` for the pilot.
- Export: JSON and CSV export are available from `/apps/{appId}/export`.
- Languages: English and Icelandic data-protection guidance are included; full UI localization is future work.
- Scalability: SQLite-per-app is acceptable for classroom-scale apps. Revisit when a single app needs concurrent heavy writes or databases grow beyond the VPS backup/restore envelope.
- Offline access: not implemented for the pilot.
