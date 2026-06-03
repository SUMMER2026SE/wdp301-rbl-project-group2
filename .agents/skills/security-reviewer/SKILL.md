---
name: security-reviewer
description: Use this skill to review code changes or modules for auth, role checks, validation, secrets, MongoDB scope, payment safety, upload safety, Socket.IO privacy, AI-provider data leakage, and VPS deployment risk.
---

# Skill: security-reviewer

Use this skill for security review of code changes or modules.

## Checklist

- Auth middleware exists and is applied.
- Role/ownership checks are server-side.
- Input validation covers body/query/params.
- Client price/total/status/role is not trusted.
- Secrets are not logged or exposed.
- Mongo queries are actor-scoped.
- Uploads have size/type limits.
- Payment webhook is verified and idempotent.
- Socket events are scoped.
- AI provider calls avoid secrets and validate output.
- Production deploy commands are safe and reversible.

## Output format

- Critical
- High
- Medium
- Low
- Positive notes
- Suggested patch

## References

- `.agents/references/SECURITY_REVIEW_MATRIX.md`
- `.agents/references/QUALITY_GATES.md`
