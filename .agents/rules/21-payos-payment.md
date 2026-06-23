# PayOS Payment Rules

Backend uses `@payos/node`.

Payment code is high risk. Do not change payment semantics casually.

## Payment creation

- Backend must compute the amount from database values.
- Do not accept amount, subtotal, discount, delivery fee, or total from frontend as authoritative.
- Persist order/payment record before sending user to payment page.
- Store provider identifiers needed for reconciliation.
- Use existing transaction/payment schema if present.

## Callback/webhook handling

- Verify PayOS callback/webhook authenticity using official SDK or existing verification utility.
- Treat webhooks as at-least-once delivery: duplicate events can happen.
- Use idempotent update conditions, e.g. update only if current status permits transition.
- Never mark an order paid based only on frontend redirect success.
- Log minimal metadata only; do not log secrets or full sensitive payloads.

## Status handling

- Keep payment status separate from order fulfillment status if the model supports it.
- Example payment statuses: `pending`, `paid`, `failed`, `cancelled`, `refunded`.
- Map PayOS statuses carefully to internal statuses.
- Preserve payment history if existing schema supports it.

## Testing/QA

For payment-related changes, include at least one of:

- unit test for amount calculation
- webhook idempotency test
- manual QA checklist for create payment -> callback -> order paid
- explicit explanation why test could not be added
