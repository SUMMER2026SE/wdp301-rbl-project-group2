# Module Index: Frontend Routing Map

## Entry Points
- App Router: [App.tsx](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/frontend/src/App.tsx)

## Important Files
- Guards: [RequireAuth.tsx](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/frontend/src/components/guards/RequireAuth.tsx) and [RequireRole.tsx](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/frontend/src/components/guards/RequireRole.tsx)
- Layouts: [MainLayout.tsx](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/frontend/src/components/layout/MainLayout.tsx), [AdminLayout.tsx](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/frontend/src/components/layout/AdminLayout.tsx), [StaffLayout.tsx](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/frontend/src/components/layout/StaffLayout.tsx)

## Invariants
- Guests can browse food menu items and add items to cart, but checking out `/checkout` requires logging in.
- Dashboards `/staff/*` and `/admin/*` are strictly guarded by the active user's roles.

## Related Skills/Rules
- `react-food-ui`
- `30-frontend-react19.md`

## Tests / Check Commands
- Frontend lint: `pnpm lint`
- Frontend build: `pnpm build`
