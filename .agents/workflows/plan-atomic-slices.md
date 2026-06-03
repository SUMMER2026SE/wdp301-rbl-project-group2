# Workflow: plan-atomic-slices

Goal: convert a feature/fix into small safe slices.

## Slice rules

Each slice should be:

- understandable in one review
- reversible
- verifiable with build/lint/test/manual QA
- limited to one layer when possible

Preferred order for full-stack work:

1. Existing pattern discovery
2. Backend contract/schema/validation
3. Backend service/model/query
4. Backend tests/checks if available
5. Frontend API/query/store integration
6. Frontend UI states
7. Realtime/socket updates if needed
8. Security review
9. QA order flow if relevant

## Output

For each slice:

- purpose
- files likely touched
- risk level: low / medium / high
- verification
- rollback note
