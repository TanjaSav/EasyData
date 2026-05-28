# Phase 4 — Ethics, Security, and Guardrails

## Status

Phase 4 is complete for the current project milestone. Remaining work is production operations such as backup policy, external review, and deployment-specific monitoring.

Phase 1 delivered the core API. Phase 2 delivered MCP integration. Phase 3 delivered a working VPS-based file upload flow. Phase 4 adds the guardrails needed before broader teacher testing.

## Goal

Phase 4 focuses on responsible use of EasyData in schools. The platform should help teachers avoid collecting unnecessary or sensitive student data, reduce security risk in generated apps, and support basic data protection workflows such as deletion and retention.

This phase does not need to solve every production compliance issue, but it should add meaningful guardrails and document the remaining responsibilities clearly.

## Scope

Phase 4 covers:

- stronger validation for table names, column names, and query identifiers
- schema-level warnings for sensitive or high-risk data fields
- right-to-deletion support and documentation
- data retention defaults and cleanup planning
- export before delete and retention cleanup endpoints
- rate limiting and audit logging
- stronger file validation
- security review of API, MCP tool behavior, and generated app publishing
- plain-language teacher guidance for educational data use, including Icelandic guidance

It does not cover final public launch, demo video, or complete hosted onboarding. Cloudflare R2 or another object store is not required for the current VPS deployment and remains only an optional future scaling path.

## Implemented Guardrails

### SQL Identifier Safety

Status: implemented.

Row values are parameterized, and table names, column names, `where` columns, and `order` columns are now validated before being interpolated into SQL strings.

The validation rules are:

- allow only letters, numbers, and underscores
- require identifiers to start with a letter
- reject reserved internal table names such as `_easydata_meta`
- apply validation consistently in REST routes, services, and MCP tools

### Sensitive Schema Detection

Status: implemented.

EasyData now warns when an app schema appears to collect sensitive or unnecessary student data.

Initial warning patterns:

- photos and media: `photo`, `image`, `video`, `face`
- health: `health`, `medical`, `diagnosis`, `allergy`, `medication`
- location: `location`, `gps`, `address`, `home_address`
- behavior: `behavior`, `discipline`, `incident`
- identity: `student_name`, `email`, `phone`, `kennitala`, `national_id`
- special categories: `religion`, `ethnicity`, `disability`, `special_needs`

Schemas with warnings now require `confirmSensitiveData: true`; successful responses still include the warning details.

### Retention

Status: implemented.

Apps should not keep student data indefinitely by default. New apps now receive default retention metadata, and app retention can be read or updated through the API.

Implemented behavior:

- default retention recommendation: end of school year
- retention metadata stored per app
- `GET /apps/:id/retention` and `PUT /apps/:id/retention`
- teacher-facing retention guidance in `docs/data-protection-guide.md`

### Right To Deletion

Status: implemented.

The API supports row deletion and app-level deletion. App deletion removes the SQLite database and uploaded files owned by that app. The teacher workflow is documented in `docs/data-protection-guide.md`.

Implemented behavior:

- row deletion is available through `DELETE /apps/:id/tables/:table/rows/:rowId`
- app-level deletion is available through `DELETE /apps/:id`
- app deletion removes the app database and uploaded files owned by the app
- deletion paths are covered by tests

### File Privacy

Status: implemented in Phase 3 hardening.

Uploaded files are stored on the VPS, but they are no longer publicly served through `/uploads/:fileName`. New files are app-owned, viewed through signed expiring URLs, and counted toward the app storage quota. App deletion removes uploaded files owned by that app.

Implemented behavior:

- signed expiring file URLs
- app storage quotas
- magic-byte file validation
- row deletion cleanup for files referenced by `*_file_name` columns
- app deletion cleanup for app-owned files

Remaining production work:

- define backup and restore procedures for `uploads/`
- decide whether long-term deployments need private object storage

## Implementation Summary

1. Add a shared identifier validation helper.
2. Apply it to table creation, table alteration, row insertion, row querying, row updates, and row deletion.
3. Add sensitivity analysis for table and column definitions.
4. Return warnings from REST and MCP schema-changing operations.
5. Add tests for rejected unsafe identifiers.
6. Add tests for schema sensitivity warnings.
7. Add app deletion or document the current row-level deletion workflow.
8. Draft teacher-facing data guidance in plain language.
9. Add export before delete.
10. Add rate limiting and audit logging.
11. Add retention cleanup endpoints.
12. Add generated app publishing guardrails.

## API Behavior

For a sensitive but confirmed schema, EasyData returns a successful response with warnings:

```json
{
  "success": true,
  "table": "submissions",
  "warnings": [
    {
      "field": "student_photo",
      "category": "photos and media",
      "message": "This field may contain student images. Collect only if needed and define a retention period."
    }
  ]
}
```

For unsafe identifiers, EasyData rejects the request:

```json
{
  "error": "Invalid identifier",
  "details": "Table and column names may contain only letters, numbers, and underscores, and must start with a letter."
}
```

## Validation

Phase 4 is considered complete for the current milestone because:

- unsafe table and column names are rejected — done
- unsafe query identifiers are rejected — done
- `create_table` and `alter_table` return sensitivity warnings — done
- tests cover security validation and warning behavior — done
- teacher-facing data guidance exists in `docs/` — done
- right-to-deletion behavior is documented — done
- `npm test -- --run` passes — done
- `npm run typecheck` passes — done
- export before delete exists — done
- rate limiting and audit logging exist — done
- Icelandic teacher guidance exists — done
- generated app guardrails reject public upload URLs and admin credential references — done

Latest validation: `npm run typecheck` passed and `npm test -- --run` passed with 25 tests.

## Deliverable

The Phase 4 deliverable is a safer EasyData prototype that can be shown to teachers with clear limits:

- it warns before collecting sensitive student data
- it rejects unsafe schema/query identifiers
- it documents deletion and retention responsibilities
- it keeps the existing Claude/MCP app-building workflow intact
