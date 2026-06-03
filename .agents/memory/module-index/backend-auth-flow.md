# Module Index: Backend Auth Flow

## Entry Points
- Routes: [auth.route.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/routes/auth.route.ts)
- Controllers: [auth.controller.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/controllers/auth.controller.ts)

## Important Files
- Middlewares: [authenticate.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/middlewares/authenticate.ts)
- Models: [user.model.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/models/user.model.ts) and [refresh-token.model.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/models/refresh-token.model.ts)
- Token Utils: [jwt.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/utils/jwt.ts)

## Invariants
- Access token is verified using standard JWT validation.
- Roles (`ADMIN`, `STAFF`, `CUSTOMER`) must be verified server-side.
- Refresh tokens are stored in the database for revoking sessions on logout.

## Related Skills/Rules
- `express-api-senior`
- `50-security-vps-production.md` (Security of secrets)

## Tests / Check Commands
- Backend build: `pnpm build`
- Run Jest tests: `pnpm test` (if auth tests exist)
