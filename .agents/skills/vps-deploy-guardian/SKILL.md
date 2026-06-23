---
name: vps-deploy-guardian
description: Use this skill when preparing deployment to a self-managed VPS, writing deployment runbooks, smoke tests, rollback plans, environment variable checklists, or production safety reviews.
---

# Skill: vps-deploy-guardian

Use this skill when preparing deployment to self-managed VPS.

## Procedure

1. Identify deployment method from repo files.
2. Confirm branch/commit and clean working tree.
3. Run backend build/test where possible.
4. Run frontend lint/build where possible.
5. List env variable names only.
6. Confirm backup and rollback plan.
7. Prepare commands as a runbook.
8. Do not execute production deploy unless explicitly authorized.

## Smoke tests

After an approved deploy, verify:

- backend health endpoint
- frontend loads
- login works
- menu/product browsing works
- cart/checkout works
- PayOS callback endpoint reachable if relevant
- order status updates
- socket connection/events
- logs do not show new critical errors

## References

- `.agents/references/QUALITY_GATES.md`
