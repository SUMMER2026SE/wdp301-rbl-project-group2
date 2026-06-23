# Workflow: spec-first

Goal: turn a vague request into a small, reviewable implementation spec before code changes.

Use for:

- new feature
- checkout/order/payment changes
- auth/role changes
- multi-file refactors
- production/deploy work

## Steps

1. Read `AGENTS.md` and relevant rules.
2. Identify user role(s): customer, staff, admin, store manager, anonymous user.
3. Define the desired behavior in 3-7 acceptance criteria.
4. List explicit non-goals.
5. Identify existing source files/routes/components/models to inspect.
6. Identify risks: payment, auth, data integrity, realtime, upload, deploy.
7. Split into atomic slices.
8. Define verification commands and manual QA path.

## Output

- Feature/spec summary
- Acceptance criteria
- Non-goals
- Relevant skills
- Files to inspect first
- Atomic plan
- Verification plan
- Open questions only if blocking

Do not edit code during this workflow unless the user explicitly asks to continue after the spec.
