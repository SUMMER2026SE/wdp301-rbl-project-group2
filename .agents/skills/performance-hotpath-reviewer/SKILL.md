---
name: performance-hotpath-reviewer
description: Use this skill when reviewing or changing slow APIs, MongoDB queries, list endpoints, dashboard analytics, menu browsing, order history, realtime fanout, React rendering, or any performance-sensitive path.
---

# Skill: performance-hotpath-reviewer

## Goal

Improve performance without guessing and without changing behavior unnecessarily.

## Backend checks

1. Identify hot path and expected cardinality.
2. Check MongoDB filters, indexes, projection, pagination, and `.lean()` usage.
3. Avoid unbounded `find()` on menu/order/customer data.
4. Avoid N+1 query patterns.
5. Batch independent async operations where safe.
6. Keep payment/order consistency more important than speed.

## Frontend checks

1. Use React Query for server data; avoid duplicating server state in Zustand.
2. Avoid unnecessary large re-renders from global store reads.
3. Keep expensive chart/dashboard transforms memoized where useful.
4. Do not refetch broad lists when a targeted invalidation/update is enough.
5. Validate Socket.IO listener cleanup.

## Evidence

Prefer concrete evidence:

- query shape
- expected document count
- index used or recommended
- before/after complexity
- build/lint/test result

## Constraints

- Do not add indexes blindly; check duplicate/size risk first.
- Do not optimize by weakening validation/auth.
- Do not introduce cache inconsistency for order/payment state.
