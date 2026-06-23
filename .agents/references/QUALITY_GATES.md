# Quality Gates

## Default commands

Backend package `backend`:

```bash
pnpm build
pnpm test
```

Frontend package `fe-foa`:

```bash
pnpm lint
pnpm build
```

## When commands are unavailable

Report the reason clearly:

- dependency missing
- config missing
- package path unknown
- command failed due to pre-existing errors
- user asked not to run commands

Do not pretend a command passed.

## Risk-based verification

High-risk changes need more than a build:

- Payment: callback/webhook verification and idempotency scenario
- Order: status transition and duplicate submission scenario
- Auth: unauthorized and wrong-role scenario
- Upload: invalid MIME and oversize file scenario
- Socket: room scoping and listener cleanup scenario
- Deploy: rollback and smoke-test plan

## Final response evidence

Always include:

- files changed
- checks run
- checks not run
- risk review performed
