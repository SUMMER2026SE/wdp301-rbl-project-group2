# Module Index: Frontend API Query Map

## Entry Points
- API Client: [apiClient.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/frontend/src/lib/apiClient.ts) or equivalent under `src/services/`

## Important Files
- Services: Directory [services/](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/frontend/src/services) containing auth, chat, notification, order, payment, product, profile, settings, voucher services.
- Hooks: Directory [hooks/](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/frontend/src/hooks) containing TanStack Query custom wrappers.

## Invariants
- React Query manages server state cache.
- After mutations (e.g. place order, update profile), affected queries must be invalidated intentionally.
- Standard query keys must be stable.

## Related Skills/Rules
- `react-food-ui`
- `30-frontend-react19.md`

## Tests / Check Commands
- Frontend lint: `pnpm lint`
- Frontend build: `pnpm build`
