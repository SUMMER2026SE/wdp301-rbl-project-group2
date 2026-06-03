---
name: payos-payment-guardian
description: Use this skill for PayOS payment creation, redirect handling, callback/webhook verification, reconciliation, idempotency, and order-payment status updates.
---

# Skill: payos-payment-guardian

Use this skill for PayOS payment creation, callback, webhook, reconciliation, and order-payment status updates.

## Procedure

1. Find existing PayOS config/client wrapper.
2. Find payment/order model fields and indexes.
3. Verify amount is server-computed.
4. Persist pending payment/order before redirect.
5. Verify webhook/callback signature using existing utility or SDK.
6. Handle duplicate webhook delivery idempotently.
7. Update payment status and order status through allowed transition only.
8. Log minimal non-sensitive metadata.
9. Add or update tests/checklist.

## Required output when reviewing payment code

- Where amount is calculated
- Where payment/order is persisted
- How webhook authenticity is verified
- How duplicate callbacks are handled
- Which statuses can change
- What tests or QA steps cover it

## References

- `.agents/references/FOOD_COMMERCE_INVARIANTS.md`
- `.agents/references/SECURITY_REVIEW_MATRIX.md`
