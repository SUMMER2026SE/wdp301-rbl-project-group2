# Module Index: Backend PayOS Flow

## Entry Points
- Routes: [payment.route.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/routes/payment.route.ts)
- Controllers: [payment.controller.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/controllers/payment.controller.ts)

## Important Files
- Config: [payos.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/config/payos.ts)
- Services: [payos.service.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/services/payos.service.ts)

## Invariants
- PayOS webhooks must be verified using the checksum keys or PayOS SDK verification methods.
- Webhook callbacks must be idempotent. Repeating events must be handled safely without altering database state repeatedly.
- Never set order status to paid based solely on frontend redirects. Webhooks are the authoritative source of payment status updates.

## Related Skills/Rules
- `payos-payment-guardian`
- `21-payos-payment.md`

## Tests / Check Commands
- Backend build: `pnpm build`
- Run Jest tests: `pnpm test`
