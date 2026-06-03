# Module Index: Backend Order Flow

## Entry Points
- Routes: [order.route.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/routes/order.route.ts)
- Services: [order.service.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/services/order.service.ts)

## Important Files
- Models: [order.model.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/models/order.model.ts) and [cart.model.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/models/cart.model.ts)
- Validators: [order.validator.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/validators/order.validator.ts)

## Invariants
- Prices, subtotals, and delivery fees must be calculated strictly on the server using database sources.
- Order transitions must strictly adhere to the state machine defined in `VALID_TRANSITIONS` in `order.service.ts`.
- Subtotal free-delivery thresholds must be checked dynamically from store settings.

## Related Skills/Rules
- `checkout-order-domain`
- `10-food-commerce-domain.md`

## Tests / Check Commands
- Backend build: `pnpm build`
- Run Jest tests: `pnpm test`
