---
name: code-review-sentinel
description: Use this skill to review current git diff or a patch before merge; it checks security, correctness, maintainability, tests, payment/order/auth risks, frontend cache state, and deployment safety.
---

# Skill: code-review-sentinel

## Goal

Review a change like a senior maintainer: precise, evidence-based, and focused on risks that matter.

## Procedure

1. Inspect `git status` and `git diff` when available.
2. Classify touched areas.
3. Apply relevant domain skills.
4. Look for correctness bugs before style comments.
5. Check whether verification evidence matches risk level.
6. Produce findings with severity.

## Severity

- Critical: production/customer/payment/security breakage likely.
- High: serious bug or missing guardrail; fix before merge.
- Medium: maintainability, edge-case, or test gap.
- Low: style/naming/readability.

## Must check

- No secret/env/key leakage.
- Backend authorization and ownership checks.
- Zod/body/query/params validation.
- Mongo ObjectId validation and scoped queries.
- Payment webhook/callback idempotency.
- Order status transition validity.
- Upload MIME/size validation.
- Socket event room scoping and cleanup.
- React Query invalidation/update after mutation.
- Frontend does not treat validation as security boundary.

## Output

- Verdict: approve / approve with notes / block
- Findings by severity
- Missing verification
- Minimal fix suggestions
