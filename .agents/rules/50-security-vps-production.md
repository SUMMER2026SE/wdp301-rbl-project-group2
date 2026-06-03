# Security + VPS Production Rules

The project is hosted on a self-managed VPS.

## Secrets

Never read, print, modify, or commit:

- `.env` values
- JWT secrets
- PayOS keys/checksum secrets
- Cloudinary secrets
- SMTP credentials
- AI provider keys
- SSH private keys
- database URIs

The agent may list required env variable names from `.env.example`, code references, or documentation, but not values.

## Production commands

Do not run without explicit approval:

- SSH into production
- deploy production
- restart production services
- modify Nginx config
- run database migrations/backfills
- prune Docker images/volumes
- delete files/uploads/backups

Forbidden by default:

```bash
rm -rf
docker system prune
docker volume prune
mongo dropDatabase
mongo dropCollection
```

## Deployment checklist

Before proposing deploy:

1. Confirm clean git status or list uncommitted changes.
2. Run backend build/test if possible.
3. Run frontend lint/build if possible.
4. Confirm env variable names, not values.
5. Confirm database backup/rollback plan.
6. Confirm payment webhook endpoint and frontend return/cancel URLs if payment changed.
7. Confirm health check endpoint.
8. Propose rollback command/commit.

## Backend hardening reminders

- Production CORS allowlist.
- Secure cookies if cookies are used.
- HTTP security headers if middleware exists or is approved.
- Rate limits for auth, OTP, payment, upload, and AI endpoints if infrastructure supports it.
- Request body limits.
- Upload limits.
- Safe error responses.
