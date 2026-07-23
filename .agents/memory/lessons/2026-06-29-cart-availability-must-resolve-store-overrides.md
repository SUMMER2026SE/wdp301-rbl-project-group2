---
type: lesson
status: active
severity: medium
tags: [cart, checkout, product, store, availability]
applies_to: [backend, frontend]
created: 2026-06-29
updated: 2026-06-29
source: "Cart grayscale bug when a product was active in the selected store but stale/global cart product id was unavailable"
---

# Lesson: Cart Availability Must Resolve Store Overrides

When the selected store changes, cart availability cannot be decided only from the persisted `productId`.

This project supports global products plus store-specific override rows. A cart item may still reference a global product or another store's override while the current store has the same menu item active. Frontend cart sync and backend checkout validation must resolve the current store's override by stable menu identity, such as category plus name, before marking the item unavailable or rejecting checkout.

Use the selected store's visible product list for cart UI state, and let server-side order resolution switch from stale/global product ids to the current store override before price and availability validation.
