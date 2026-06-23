# Workflow: implement-feature

Goal: implement a feature safely and consistently.

## Steps

1. Restate the feature and affected user roles.
2. Search existing implementation for similar features.
3. Identify backend/frontend package paths.
4. Build a plan with files to inspect/edit.
5. For backend changes:
   - define API contract
   - add/update Zod validation
   - update controller/service/model as needed
   - enforce auth/role checks
   - keep server as source of truth
6. For frontend changes:
   - add/update API function or React Query hook
   - add/update form schema if needed
   - add/update UI with loading/error/empty states
   - invalidate affected queries after mutation
7. For order/payment features:
   - verify total calculation is backend-owned
   - verify idempotency
   - verify status transitions
8. Run checks when possible:
   - backend: `pnpm build`, `pnpm test`
   - frontend: `pnpm lint`, `pnpm build`
9. Summarize patch and risks.

## Output

- Feature summary
- Files changed
- API contract changes
- DB/model changes
- Env changes if any
- Tests/checks run
- Manual QA checklist

## Artifact note

For medium/high-risk features, first run `spec-first` or produce an equivalent task artifact using `.agents/references/AGENT_TASK_TEMPLATE.md`.
