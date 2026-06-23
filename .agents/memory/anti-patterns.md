# FOA Agent Anti-Patterns

These are mistakes agents must not repeat.

## Commerce/payment

- Trusting `price`, `total`, `discount`, `deliveryFee`, `paymentStatus`, `orderStatus`, or `role` from frontend payloads.
- Marking an order as paid from a frontend redirect success page alone.
- Handling PayOS callback/webhook without verification and idempotency.
- Updating payment/order state without atomic conditions.

## Backend

- Putting business logic directly inside Express routes.
- Skipping Zod validation for body/query/params.
- Querying MongoDB without actor/store/branch ownership scope.
- Using broad `updateMany`, `deleteMany`, or destructive commands without explicit approval.

## Frontend

- Duplicating React Query server state into Zustand.
- Forgetting query invalidation after mutations.
- Forgetting Socket.IO listener cleanup.
- Showing payment/order success before backend confirms state.

## VPS/ops

- Running production SSH, service restart, prune, delete, migration, or deploy commands without explicit human approval.
- Storing secrets in memory cards, docs, logs, screenshots, or git.
