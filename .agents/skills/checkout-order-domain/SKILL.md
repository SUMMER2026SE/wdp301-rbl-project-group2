---
name: checkout-order-domain
description: Use this skill for cart, checkout, order creation, order status transitions, cancellation, refund, fulfillment, and any business logic that affects food-order money flow.
---

# Skill: checkout-order-domain

Use this skill for cart, checkout, order creation, order status, cancellation, refund, and fulfillment flows.

## Procedure

1. Inspect existing order/cart/payment models and statuses.
2. Map current flow before editing.
3. Ensure backend computes authoritative totals.
4. Validate item availability and quantities.
5. Validate user/customer/store/branch ownership.
6. Keep payment state separate from fulfillment state if current model allows.
7. Enforce valid status transitions.
8. Make retry/webhook paths idempotent.
9. Emit socket events only after durable state changes.
10. Add tests/checklist for changed flow.

## Do not

- Trust frontend total/price/status.
- Mark paid from redirect success only.
- Skip auth/role checks for staff/admin actions.
- Overwrite payment/order history casually.

## References

- `.agents/references/FOOD_COMMERCE_INVARIANTS.md`
- `.agents/references/QUALITY_GATES.md`
