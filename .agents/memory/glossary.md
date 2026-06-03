# FOA Glossary

Keep this file short and project-specific.

## Core terms

- **FOA**: Food ordering application / online food store platform.
- **Customer**: User placing orders.
- **Staff**: User handling order preparation/fulfillment.
- **Admin / Store manager**: User managing products, branches, users, and order operations.
- **Order source of truth**: MongoDB order document updated by backend services.
- **Payment source of truth**: Verified PayOS callback/webhook + backend reconciliation, not frontend redirect alone.

## Status terms

Do not invent status strings. Inspect existing constants/models first.

Record the canonical statuses here after repo onboarding:

```txt
TODO: fill after inspecting order model/status constants.
```
