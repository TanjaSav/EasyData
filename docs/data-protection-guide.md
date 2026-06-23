# EasyData Data Protection Guide for Teachers

EasyData is designed for small classroom apps, but teachers should still collect as little student data as possible.

## Sensitive Data Warnings

When a table includes fields such as `student_name`, `photo`, `health`, `address`, `behavior`, `disability`, or `national_id`, EasyData returns a warning. Schema creation or alteration requires `confirmSensitiveData: true` when these warnings are present, so the teacher or assistant must explicitly confirm that the field is necessary.

Recommended response to a warning:

1. Remove the field if it is not needed.
2. Use a less identifying field when possible, such as a student ID instead of a full name.
3. Set a clear retention period before collecting the data.

## Retention

Every new app gets a default retention recommendation: review and delete classroom data at the end of the school year.

Apps expose retention metadata through:

```http
GET /apps/:id/retention
PUT /apps/:id/retention
```

Use `custom` retention when a project needs a specific review date. Use `none` only when the app does not store student data or when retention is managed somewhere else.

## Deletion

Teachers can export app data before deletion through:

```http
GET /apps/:id/export
GET /apps/:id/export?format=csv
```

Teachers can delete individual records through:

```http
DELETE /apps/:id/tables/:table/rows/:rowId
```

Teachers can delete a whole app through:

```http
DELETE /apps/:id
```

Deleting an app removes the app database and uploaded files owned by that app. Deleting an individual row removes the database record and any app-owned files referenced by `*_file_name` columns in that row.

## Practical Rule

If the app stores student data, decide these three things before sharing it with students:

1. What exact data is needed?
2. Who can access it?
3. When will it be deleted?

## Operational Safeguards

EasyData also includes basic rate limiting, audit logging for important changes, app export before deletion, and stricter file validation using file signatures.
