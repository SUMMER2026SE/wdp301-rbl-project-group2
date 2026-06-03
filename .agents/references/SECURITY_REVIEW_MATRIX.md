# Security Review Matrix

## Critical

Block merge/deploy when:

- secret/key/token is committed or printed
- payment can be marked paid from client input or redirect only
- unauthorized users can access another user's order/customer data
- admin/staff role can be forged from client payload
- production destructive command is executed without approval

## High

Fix before merge when:

- PayOS webhook/callback is not verified
- webhook handling is not idempotent
- upload lacks MIME/size validation
- Mongo query lacks actor/store/branch scope
- Socket.IO broadcasts private order/payment data globally
- order status transition can skip required states

## Medium

Track or fix soon when:

- missing pagination on list endpoint
- missing projection for private fields
- weak error handling
- missing frontend cleanup for socket listener
- broad cache invalidation causes stale/flicker risk

## Low

Style or maintainability:

- unclear naming
- duplicated code
- missing comments for non-obvious business rules
- inconsistent response shape
