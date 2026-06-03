---
type: pattern
status: active
severity: critical
tags: [vps, deploy, production, rollback, backup]
applies_to: [ops, backend, frontend]
created: 2026-05-26
updated: 2026-05-26
---

# Pattern: VPS deployment requires backup, rollback, and smoke tests

## Use when

Any task touches production deployment, VPS, Nginx, PM2, Docker, systemd, environment variables, database migration, or build scripts.

## Required runbook sections

- Current branch and commit.
- Services affected.
- Build/check commands.
- Env variable names only, not values.
- Database backup/migration plan if applicable.
- Deployment steps.
- Smoke tests.
- Rollback plan.
- Monitoring/log checks.

## Forbidden without explicit human approval

- SSH to production.
- Restart production services.
- Run migrations against production.
- `docker system prune`, destructive `rm -rf`, volume deletion, database drop/update/delete broad commands.
- Reading or printing `.env` values.
