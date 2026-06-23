---
type: pattern
status: active
severity: high
tags: [socketio, realtime, order, privacy, rooms]
applies_to: [backend, frontend]
created: 2026-05-26
updated: 2026-05-26
---

# Pattern: Socket.IO events must be scoped to rooms

## Use when

Any task touches realtime order updates, notifications, staff dashboard, admin dashboard, customer order tracking, or Socket.IO event listeners.

## Backend pattern

- Authenticate socket connections if private data is involved.
- Join scoped rooms such as `user:{userId}`, `order:{orderId}`, `store:{storeId}`, or `branch:{branchId}`.
- Prefer room emits over global `io.emit` for private/order/payment data.
- Keep payloads small and avoid sensitive data.
- Emit only after database writes succeed.

## Frontend pattern

- Subscribe on mount or route entry.
- Cleanup listeners on unmount.
- Use events to invalidate/refetch React Query data rather than duplicating server state in Zustand.
