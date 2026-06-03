# Workflow: qa-order-flow

Goal: QA the core food-ordering path.

## Backend checks

- Product/menu item active state
- Price source from database
- Cart quantity validation
- Coupon/discount validation if present
- Delivery fee calculation if present
- Order total calculation
- PayOS payment creation
- PayOS callback/webhook verification
- Payment idempotency
- Order status transition
- Socket event emission

## Frontend checks

- Browse menu/product detail
- Add/remove/update cart quantity
- Checkout form validation
- Create payment
- Redirect/return/cancel payment UI states
- Order detail/tracking page
- Realtime order update
- Mobile layout
- Error/empty/loading states

## Output

- Pass/fail checklist
- Bugs found
- Suggested fixes
- Missing tests
- Risk level before release
