# Agent Task Artifact Template

Use this for medium/high-risk tasks or changes touching more than 3 files.

```md
# Task Artifact: <short title>

## Goal

<What we are trying to achieve.>

## In scope

- ...

## Out of scope

- ...

## Relevant skills

- ...

## Existing patterns found

- <files/modules inspected>
- <current conventions>

## Atomic implementation slices

1. <slice> — verification: <command/manual check>
2. <slice> — verification: <command/manual check>

## Verification plan

- Backend: `pnpm build`, `pnpm test` if available
- Frontend: `pnpm lint`, `pnpm build`
- Manual QA: ...

## Risk notes

- Payment/order/auth/upload/socket/deploy/data risks

## Done evidence

- Files changed:
- Commands run:
- Commands not run:
- Remaining risks:
```
