# MongoDB + Mongoose Rules

Backend uses Mongoose `8.2.x`.

## Query safety

- Validate ObjectId strings before querying by id.
- Use pagination for list endpoints.
- Use filters that respect current user's role/scope.
- Do not expose deleted/inactive/private records unless explicitly intended.
- Use projection to avoid leaking private fields.

## Indexing

For food-commerce systems, inspect existing indexes. Add indexes where justified for frequent queries:

- user orders: `{ userId, createdAt }`
- store/branch orders: `{ storeId, status, createdAt }`
- payment lookup: `{ paymentOrderCode }` or provider transaction id
- product/menu slug: `{ slug }`
- active items: `{ isActive, categoryId }`
- unique fields such as email/phone/slug when business rules require uniqueness

Do not add unique indexes without checking existing duplicate data risk.

## Atomicity

- Use atomic updates for status transitions and inventory changes.
- For order/payment state, include current status in update filter to prevent invalid transitions.
- If MongoDB deployment supports transactions, use them for multi-document changes that must commit together.
- If transactions are unavailable, design idempotent compensation and clear error handling.

## Deletion policy

Prefer soft delete if the domain needs audit/history.

Never run broad destructive operations without explicit approval:

```js
deleteMany({})
updateMany({})
dropDatabase()
dropCollection()
```

## Mongoose performance

- Use `.lean()` for read-only responses when no virtuals/methods are needed.
- Avoid large document population chains.
- Prefer explicit populate selection.
- Avoid unbounded aggregation pipelines.
