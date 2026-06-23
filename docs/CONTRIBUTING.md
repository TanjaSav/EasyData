# Contributing

Thanks for contributing to EasyData. The project is small by design, so changes should keep the teacher workflow simple and the operational surface understandable.

## Development

```bash
npm install
npm run typecheck
npm test -- --run
npm run dev
```

## Pull Request Checklist

Before opening a PR:

- Run `npm run typecheck`.
- Run `npm test -- --run`.
- Add or update tests for API, MCP, security, or data-protection behavior.
- Update docs when routes, MCP tools, environment variables, or teacher workflows change.
- Do not commit `.env`, generated local databases, uploaded files, logs, or real student data.

## Design Principles

- Prefer small REST/MCP surfaces over broad database access.
- Keep user data app-scoped.
- Validate identifiers before interpolating them into SQL.
- Parameterize row values.
- Treat generated apps as untrusted input and validate before publishing.
- Prefer plain teacher-facing language in docs.

## Reporting Security Issues

Do not open a public issue for a vulnerability involving authentication bypass, file access, data leakage, generated-app publishing, or student data. Contact the maintainers privately first. If no private process exists for a deployment, disable public access until the issue is understood.
