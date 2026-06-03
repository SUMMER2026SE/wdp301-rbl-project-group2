# Workflow: security-review

Goal: review a patch or module for security issues.

## Scope checklist

Backend:

- Auth middleware applied correctly
- Role/ownership checks enforced server-side
- Zod validation on body/query/params
- ObjectId validation
- No trust in client price/total/status/role
- No secret/token/password logging
- CORS/cookie behavior safe for production
- Upload limits and MIME allowlists
- Payment webhook verification/idempotency
- AI provider input/output boundaries
- Mongo queries scoped to current actor

Frontend:

- No secret env variables exposed
- No sensitive token/payment data persisted unnecessarily
- API errors shown safely
- Socket listeners cleaned up
- Form validation present but not treated as security boundary

VPS/deploy:

- No `.env` values committed or printed
- No destructive commands
- Backup/rollback considered

## Output

Return findings grouped as:

- Critical
- High
- Medium
- Low
- Positive notes
- Recommended patch

## Severity format

Report findings as Critical / High / Medium / Low. A Critical or High finding must include a minimal fix proposal.
