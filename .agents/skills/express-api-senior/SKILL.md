---
name: express-api-senior
description: Use this skill when adding, reviewing, or refactoring Express TypeScript backend APIs, controllers, services, route validators, auth middleware, or API response contracts.
---

# Skill: express-api-senior

Use this skill when adding, reviewing, or refactoring backend Express + TypeScript APIs.

## Context

Backend package:

- Express 4.21.x
- TypeScript 5.9.x
- Mongoose 8.2.x
- Zod 4.x
- pnpm 9.15.4
- Node 22.x

## Procedure

1. Locate backend package by package name `backend`.
2. Inspect existing route/controller/service/model conventions.
3. Define contract:
   - method/path
   - auth/role
   - params/query/body schemas
   - response shape
   - error cases
4. Add or update Zod validator.
5. Keep route thin.
6. Keep controller HTTP-focused.
7. Put business logic in service.
8. Scope Mongo queries by authenticated actor.
9. Add pagination/projection for list endpoints.
10. Run backend checks when possible:

```bash
pnpm build
pnpm test
```

## Senior guardrails

- Never trust client-supplied role/user id/price/total/status.
- Validate ObjectId params.
- Do not leak stack traces or private fields.
- Do not add dependencies unless approved.
- Do not bypass existing auth middleware.
