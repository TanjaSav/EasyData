# Phase 4 — Ethics, Security, and Guardrails

## Status

Phase 4 is the active project phase.

Phase 1 delivered the core API. Phase 2 delivered MCP integration. Phase 3 delivered a working VPS-based file upload flow. The next priority is making the platform safer for real educational data before broader teacher testing.

## Goal

Phase 4 focuses on responsible use of EasyData in schools. The platform should help teachers avoid collecting unnecessary or sensitive student data, reduce security risk in generated apps, and support basic data protection workflows such as deletion and retention.

This phase does not need to solve every production compliance issue, but it should add meaningful guardrails and document the remaining responsibilities clearly.

## Scope

Phase 4 covers:

- stronger validation for table names, column names, and query identifiers
- schema-level warnings for sensitive or high-risk data fields
- right-to-deletion support and documentation
- data retention defaults and cleanup planning
- security review of API and MCP tool behavior
- plain-language teacher guidance for educational data use

It does not cover final public launch, demo video, or complete hosted onboarding. Cloudflare R2 or another object store is not required for the current VPS deployment and remains only an optional future scaling path.

## Current Risks To Address

### SQL Identifier Safety

Row values are parameterized, but table names, column names, `where` columns, and `order` columns are currently interpolated into SQL strings.

Phase 4 should add strict identifier validation:

- allow only letters, numbers, and underscores
- require identifiers to start with a letter
- reject reserved internal table names such as `_easydata_meta`
- apply validation consistently in REST routes, services, and MCP tools

### Sensitive Schema Detection

EasyData should warn when an app schema appears to collect sensitive or unnecessary student data.

Initial warning patterns:

- photos and media: `photo`, `image`, `video`, `face`
- health: `health`, `medical`, `diagnosis`, `allergy`, `medication`
- location: `location`, `gps`, `address`, `home_address`
- behavior: `behavior`, `discipline`, `incident`
- identity: `student_name`, `email`, `phone`, `kennitala`, `national_id`
- special categories: `religion`, `ethnicity`, `disability`, `special_needs`

The first implementation can return warnings in `create_table` and `alter_table` responses instead of blocking the request.

### Retention

Apps should not keep student data indefinitely by default.

Phase 4 should define:

- a default retention recommendation, such as end of school year
- metadata fields for retention policy
- a documented cleanup workflow
- future API behavior for expiration and deletion

### Right To Deletion

The API already supports row deletion. Phase 4 should make the workflow explicit:

- document how a teacher deletes a student record
- add app-level deletion if missing
- consider export-before-delete guidance
- add tests for deletion paths

### File Privacy

Uploaded files are stored on the VPS and are publicly readable under `/uploads/:fileName`.

Phase 4 should document this limitation and decide whether to:

- keep public `/uploads` access for the current demo deployment
- add hard-to-guess filenames and clearer warnings
- add signed or token-protected file access later if teacher data requires stricter privacy

## Implementation Plan

1. Add a shared identifier validation helper.
2. Apply it to table creation, table alteration, row insertion, row querying, row updates, and row deletion.
3. Add sensitivity analysis for table and column definitions.
4. Return warnings from REST and MCP schema-changing operations.
5. Add tests for rejected unsafe identifiers.
6. Add tests for schema sensitivity warnings.
7. Add app deletion or document the current row-level deletion workflow.
8. Draft teacher-facing data guidance in plain language.

## Proposed API Behavior

For a sensitive but allowed schema, EasyData should return a successful response with warnings:

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

For unsafe identifiers, EasyData should reject the request:

```json
{
  "error": "Invalid identifier",
  "details": "Table and column names may contain only letters, numbers, and underscores, and must start with a letter."
}
```

## Validation Targets

Phase 4 should be considered complete when:

- unsafe table and column names are rejected
- unsafe query identifiers are rejected
- `create_table` and `alter_table` return sensitivity warnings
- tests cover security validation and warning behavior
- teacher-facing data guidance exists in `docs/`
- right-to-deletion behavior is documented
- `npm test -- --run` passes
- `npm run typecheck` passes

## Deliverable

The Phase 4 deliverable is a safer EasyData prototype that can be shown to teachers with clear limits:

- it warns before collecting sensitive student data
- it rejects unsafe schema/query identifiers
- it documents deletion and retention responsibilities
- it keeps the existing Claude/MCP app-building workflow intact
