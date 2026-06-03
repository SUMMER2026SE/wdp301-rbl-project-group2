# Module Index: Frontend State Map

## Entry Points
- Store folder: [store/](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/frontend/src/store)

## Important Files
- Cart Store: [cartStore.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/frontend/src/store/cartStore.ts)
- Auth Store: [authStore.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/frontend/src/store/authStore.ts)
- Chat Store: [supportChatStore.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/frontend/src/store/supportChatStore.ts)

## Invariants
- Zustand is used ONLY for client/UI state (cart draft, local filters, active chat windows, current UI configurations).
- Do not duplicate server responses in Zustand that are already cached by TanStack React Query.
- Never persist secret user authentication passwords/tokens in local state or localStorage if they are security boundaries.

## Related Skills/Rules
- `react-food-ui`
- `30-frontend-react19.md`

## Tests / Check Commands
- Frontend lint: `pnpm lint`
- Frontend build: `pnpm build`
