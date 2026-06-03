# Testing and Quality Rules

## Backend

Backend scripts:

```bash
pnpm build
pnpm test
```

Before adding tests, inspect whether Jest config and dependencies exist. The provided package.json includes a `test` script but does not show `jest`, `ts-jest`, or `supertest`. Do not assume Supertest/Vitest are installed.

Prioritize tests for:

- order total calculation
- checkout validation
- PayOS webhook idempotency
- order status transitions
- auth/role access
- file upload validation
- Mongo query filters for user/store scope

## Frontend

Frontend scripts:

```bash
pnpm lint
pnpm build
```

The provided frontend package.json does not show a test runner. Do not add Vitest/React Testing Library tests unless the repo already has them or dependency installation is approved.

Prioritize manual QA/checklist for:

- product/menu browsing
- cart state
- checkout form validation
- payment redirect/return states
- order tracking
- admin/staff order status update
- socket realtime updates
- responsive mobile UI

## Quality standard

A patch is not done until the agent reports:

- changed files
- checks run
- checks not run and why
- risk level
- manual QA steps for affected user flows
