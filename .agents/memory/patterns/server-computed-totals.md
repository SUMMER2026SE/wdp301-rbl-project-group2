---
type: pattern
status: active
severity: critical
tags: [checkout, cart, order, payment, price, total]
applies_to: [backend, frontend]
created: 2026-05-26
updated: 2026-05-26
---

# Pattern: Server-computed totals only

## Use when

Any task touches cart, checkout, order creation, discount, delivery fee, PayOS amount, invoice, refund, or payment reconciliation.

## Rule

Frontend may send item IDs, quantities, address selection, coupon code, and payment method. It must not be trusted for final price, total, discount, delivery fee, payment status, or order status.

## Backend pattern

1. Load products/variants from MongoDB.
2. Check availability, branch/store state, and allowed ordering window.
3. Compute item subtotal, discount, delivery fee, service fee, and grand total on server.
4. Persist a pricing snapshot on the order.
5. Use the persisted backend total when creating PayOS payment.
6. On callback/webhook, reconcile against persisted order/payment metadata.

## Frontend pattern

Show estimated totals if needed, but clearly treat backend response as authoritative after checkout/order creation.

## Agent reminder

If a proposed change uses `req.body.total`, `req.body.amount`, `req.body.price`, or frontend-derived payment amount, stop and redesign.
