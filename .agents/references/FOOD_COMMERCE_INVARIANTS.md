# Food Commerce Invariants

These are non-negotiable invariants for an online food ordering system.

## Money

- Client-provided price, subtotal, discount, delivery fee, and total are never authoritative.
- Backend recomputes totals from database values and validated promotions/fees.
- Payment provider amount must match server-computed order amount.
- Payment success page/redirect is UX only, not proof of payment.

## Orders

- Order creation must be idempotent or protected from duplicate submission.
- Order status transitions must be explicit and validated.
- Payment status and fulfillment status should not be conflated unless the existing model intentionally does so.
- Staff/admin actions require role and ownership/scope checks.

## Menu / inventory

- Item must exist, be active, and be sellable at checkout time.
- Store/branch must be active and accepting orders.
- Quantity must be valid and within business limits.
- Any inventory/reservation update must be atomic when consistency matters.

## Realtime

- Socket events are notifications; database/API state is source of truth.
- Events must be room-scoped and must not leak private order/payment/customer data.

## Uploads

- Uploaded file MIME and size must be validated server-side.
- Cloudinary secrets stay server-side.
- `public_id` should be retained for cleanup/replacement.
