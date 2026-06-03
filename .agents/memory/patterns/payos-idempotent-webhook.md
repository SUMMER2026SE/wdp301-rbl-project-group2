---
type: pattern
status: active
severity: critical
tags: [payos, payment, webhook, callback, idempotency, order]
applies_to: [backend]
created: 2026-05-26
updated: 2026-05-26
---

# Pattern: PayOS callback/webhook must be verified and idempotent

## Use when

Any task touches PayOS payment creation, success/cancel redirect, callback, webhook, order paid status, payment reconciliation, or payment logs.

## Required behavior

- Do not mark an order paid from frontend redirect alone.
- Verify PayOS callback/webhook according to the provider method already used in the repo.
- Make update idempotent: repeated callbacks must not duplicate side effects.
- Match the callback to an existing order/payment record.
- Update order/payment state with atomic conditions.
- Emit Socket.IO notifications only after MongoDB update succeeds.
- Never log secrets, signatures, raw tokens, or sensitive customer/payment data.

## Suggested update shape

Use a conditional update such as:

```txt
where orderId matches AND paymentStatus is not already paid
then set paymentStatus paid, paidAt, transaction reference
```

Adapt to the actual schema after inspecting the repo.
