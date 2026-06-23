# Workflow: post-task-report

Goal: produce a review-ready completion report after an AI-assisted task.

## Required report

1. What changed
2. Why it changed
3. Files changed by area: backend, frontend, agent docs, deploy, tests
4. Commands run with results
5. Commands not run with reasons
6. Manual QA performed or recommended
7. Security/payment/order/upload/socket risks checked
8. Remaining risks
9. Suggested next step, if any

## Evidence expectations

Do not say "works" without evidence. Prefer:

- `pnpm build` passed in backend
- `pnpm test` passed or unavailable because dependency/config missing
- `pnpm lint` passed in frontend
- `pnpm build` passed in frontend
- manual checkout scenario verified
- webhook idempotency reasoning described
