# Workflow: fix-bug

Goal: fix root cause, not symptoms.

## Steps

1. Reproduce or reason from provided error/log.
2. Locate relevant backend/frontend package.
3. Search code for the failing path.
4. Identify root cause.
5. Propose minimal patch.
6. Add regression test if test infra exists and bug is logic-related.
7. Run relevant checks.
8. Report changed files and root cause.

## Output

- Symptom
- Root cause
- Fix
- Files changed
- Regression coverage
- Checks run/not run
- Remaining risk

## Bug-fix discipline

If the bug is in payment/order/auth/upload/socket code, use the relevant guardian skill and include a regression scenario even if test infrastructure is missing.
