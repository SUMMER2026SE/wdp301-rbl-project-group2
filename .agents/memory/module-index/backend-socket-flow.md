# Module Index: Backend Socket Flow

## Entry Points
- Server: [index.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/index.ts)

## Important Files
- Middlewares: Socket handshake parsing in `src/index.ts`
- Emits: [order.service.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/services/order.service.ts), [payment.controller.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/controllers/payment.controller.ts)

## Invariants
- Connections must be authenticated via handshake token/cookies.
- Sockets join custom rooms scoped to `user:${userId}` to avoid global leaks of private notifications.
- Chat sockets join authorized `support:conversation:${conversationId}` rooms.

## Related Skills/Rules
- `socketio-realtime-guardian`
- `22-socketio-realtime.md`

## Tests / Check Commands
- Backend build: `pnpm build`
