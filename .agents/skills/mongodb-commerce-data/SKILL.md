---
name: mongodb-commerce-data
description: Use this skill when changing MongoDB/Mongoose schemas, indexes, queries, repositories, data migrations, or order/payment/inventory persistence logic.
---

# Skill: mongodb-commerce-data

Use this skill when changing MongoDB/Mongoose schemas, queries, indexes, or data migration logic.

## Procedure

1. Inspect existing model/schema and indexes.
2. Identify query patterns and actor scope.
3. Validate ObjectId input.
4. Add indexes only when justified by query pattern.
5. Avoid unique indexes until duplicate-data risk is checked.
6. Use atomic updates for payment/order/inventory status.
7. Use `.lean()` for read-only responses when suitable.
8. Avoid unbounded list queries.
9. Do not run destructive operations without explicit approval.

## Commerce data guardrails

- Preserve order/payment history.
- Keep status transitions valid.
- Keep customer/admin/staff data scoped.
- Avoid exposing private fields.
- Treat payment transaction ids/order codes as uniqueness-critical.
