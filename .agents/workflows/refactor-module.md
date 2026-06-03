# Workflow: refactor-module

Goal: improve structure without changing behavior.

## Rules

- Do not refactor payment/order/auth modules broadly without approval.
- Keep public API behavior unchanged.
- Prefer small mechanical changes.
- Add characterization tests first if test infra exists.
- Run build/lint/tests after refactor.

## Steps

1. Identify current behavior and public contracts.
2. Identify files affected.
3. Propose small refactor plan.
4. Move/extract code with minimal logic changes.
5. Keep naming consistent.
6. Run checks.
7. Summarize behavior preservation.

## Output

- Refactor goal
- Behavior preserved
- Files changed
- Checks run
- Remaining risks
