# Workflow: deploy-vps

Goal: prepare a safe VPS deployment plan. Do not deploy unless explicitly instructed.

## Pre-deploy checks

1. Confirm branch and commit.
2. Check working tree status.
3. Identify backend/frontend package paths.
4. Run backend checks if possible:
   - `pnpm build`
   - `pnpm test`
5. Run frontend checks if possible:
   - `pnpm lint`
   - `pnpm build`
6. Identify deployment method from repo docs/scripts:
   - PM2
   - Docker Compose
   - systemd
   - Nginx static hosting
   - Coolify/CapRover
   - custom script
7. List env variable names required, not values.
8. Check whether DB migration/backfill is needed.
9. Confirm backup and rollback plan.
10. Confirm health check and smoke tests.

## Output only unless authorized

Produce:

- Deployment plan
- Exact commands as a proposed runbook
- Rollback plan
- Smoke test checklist
- Risks/blockers

Do not execute production SSH/deploy commands without explicit approval.
