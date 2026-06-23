# Phase 5 — Documentation and Launch

## Status

Phase 5 is ready for a pilot launch, with remaining items that require deployment credentials, teacher scheduling, or institutional approval.

## Completed

- Landing page exists in `public/index.html`.
- Claude/ChatGPT MCP setup guide exists in `docs/chatgpt-claude-mcp.md`.
- Gemini MCP and extension guides exist in `docs/gemini-mcp.md`, `docs/teacher_gemini_setup_guide.md`, `docs/gemini_app_creation_guide.md`, and `docs/gemini_extension_user_guide.md`.
- API/MCP tool reference exists in `docs/mcp-tools.md`.
- Teacher data-protection guidance exists in English and Icelandic.
- Demo media and Chrome Web Store submission assets exist under `public/assets/` and `store-submission/`.
- Generated app hosting is implemented under `/generated/{appId}/`.
- JSON and CSV export are implemented.
- MIT license, README, contribution guide, code of conduct, and issue templates are present.
- Operations runbook exists in `docs/operations.md`.

## Launch Decisions

- License: MIT.
- Current hosted storage: VPS local disk with signed file view URLs.
- Future storage path: Cloudflare R2 or compatible object storage if VPS storage or backup windows become limiting.
- Current teacher identity: app-scoped tokens plus operator-admin token.
- Future teacher identity: school SSO or email-based identity after pilot requirements are confirmed.
- Current app sharing: share generated app URLs; edit/admin access remains token-based.
- Future app sharing: explicit multi-teacher ownership and roles.
- Current export: JSON and CSV via authenticated API.
- Current languages: English plus Icelandic data-protection guidance.
- Offline-first: out of scope for pilot.

## Pilot Checklist

Before MMS/community teacher testing:

1. Deploy from a clean checkout.
2. Set production environment variables from `docs/operations.md`.
3. Configure HTTPS and verify `PUBLIC_BASE_URL`.
4. Run `npm run typecheck` and `npm test -- --run`.
5. Create one sample app through MCP.
6. Publish one generated app and run `run_app_health_check`.
7. Upload and display one image through a generated app.
8. Export the sample app as JSON and CSV.
9. Delete a sample row and verify app-owned file cleanup.
10. Back up and restore `DATA_DIR`, `UPLOAD_DIR`, and `public/generated` once.
11. Confirm school retention expectations for pilot data.
12. Record which teachers test which use cases and what data categories they use.

## Remaining External Work

These are not code gaps in the current prototype, but they must be completed for a real public launch:

- external security/privacy review
- formal Icelandic school GDPR compliance mapping
- production monitoring/alert ownership
- backup retention approval
- teacher pilot feedback from at least three real use cases
- final MMS presentation materials
