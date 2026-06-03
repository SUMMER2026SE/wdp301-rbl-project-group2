---
type: pattern
status: active
severity: critical
tags: [order, status, state-machine, staff, customer]
applies_to: [backend, frontend]
created: 2026-05-26
updated: 2026-05-26
---

# Pattern: Order status transitions are a state machine

## Use when

Any task touches order status, staff/admin order management, customer cancel, delivery progress, payment status, refunds, or realtime order updates.

## Rule

Never invent status strings in controllers/components. Inspect existing order model/constants first.

## Backend pattern

1. Centralize allowed transitions in a service or constants module.
2. Enforce role/ownership server-side.
3. Use atomic transition updates where possible.
4. Record important timestamps, actor, and reason.
5. Keep payment status and fulfillment status conceptually separate unless the current schema intentionally combines them.
6. Emit realtime events after the state change is persisted.

## Frontend pattern

Frontend may render available actions from backend-provided state/permissions. Do not let the UI be the only enforcement layer.
