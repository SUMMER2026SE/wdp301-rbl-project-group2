# Workflow: add-api-endpoint

Goal: add or modify an Express API endpoint without breaking architecture/security.

## Steps

1. Find existing route/controller/service/model pattern.
2. Define endpoint contract:
   - method
   - path
   - auth/role requirement
   - body/query/params schema
   - response shape
   - error cases
3. Add/update Zod validator.
4. Add route using existing middleware pattern.
5. Add controller with HTTP-only concerns.
6. Add service business logic.
7. Add repository/model query if needed.
8. Validate ObjectId params.
9. Add pagination/projection for list endpoints.
10. Add tests or explain why not possible.
11. Run `pnpm build` and `pnpm test` from backend package when possible.

## Special checks

For checkout/order/payment endpoint:

- server recomputes amount
- no trust in client price/status/role
- idempotency considered
- status transition validated
- payment callback verified if relevant

## Output

- Endpoint contract
- Files changed
- Validation added
- Auth/role behavior
- Test/build result
