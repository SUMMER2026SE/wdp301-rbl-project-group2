# Food Commerce Domain Rules

This project sells food online. Bugs can create real payment/order/customer damage.

## Server is the source of truth

Never trust the frontend for:

- product price
- discount
- delivery fee
- tax
- final order amount
- payment amount
- order status
- user role
- store/branch id ownership

The backend must recompute order totals using database values.

## Checkout/order invariants

For checkout and order creation, check existing project concepts first. If present, validate:

- product/food item exists and is active
- item is available/sellable
- quantity is valid
- store/branch is active
- opening hours/order receiving state
- delivery method/address/fee
- coupon/discount ownership and expiry
- payment method availability

## Status transitions

Do not update order status with arbitrary strings. Use existing status constants/enums. If none exist, propose adding a centralized state machine.

Default safe model:

```txt
pending_payment -> paid -> confirmed -> preparing -> ready -> delivering -> completed
pending_payment -> cancelled
paid -> refund_pending -> refunded
confirmed/preparing/ready -> cancelled_by_store
```

Use the repo's actual statuses if already defined.

## Idempotency

Required for:

- order creation retries
- PayOS webhook/callback handling
- payment status updates
- socket event delivery side effects
- cron jobs that update orders/payments

Prefer unique keys/indexes for payment order code, transaction id, or idempotency key.

## Auditability

High-risk actions should preserve history:

- payment status changes
- order status changes
- cancellation/refund reason
- staff/admin actor id
- timestamps

Do not overwrite important status/payment history if the existing model supports history.
