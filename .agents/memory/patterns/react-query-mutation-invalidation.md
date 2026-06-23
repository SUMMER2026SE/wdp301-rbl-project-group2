---
type: pattern
status: active
severity: medium
tags: [react, react-query, mutation, invalidation, zustand]
applies_to: [frontend]
created: 2026-05-26
updated: 2026-05-26
---

# Pattern: React Query owns server state

## Use when

Any task touches frontend API calls, list/detail pages, mutations, order updates, menu/product data, dashboard data, or realtime invalidation.

## Rule

Use TanStack React Query for server state. Use Zustand only for client/UI state such as modal state, local cart draft if applicable, UI filters, temporary selections, or session UI preferences.

## Mutation pattern

1. Validate form with React Hook Form + Zod where applicable.
2. Call API through the existing client layer.
3. On success, invalidate relevant query keys or update cache carefully.
4. Show toast/UX state.
5. Do not duplicate canonical server response into Zustand unless there is a deliberate offline/local reason.

## Socket pattern

Socket events should generally trigger query invalidation/refetch for affected order/user/store queries.
