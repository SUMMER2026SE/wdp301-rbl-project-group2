# Workflow: review-current-diff

Goal: review current changes before human merge.

## Steps

1. Read `AGENTS.md` and relevant rules.
2. Inspect `git status` and `git diff`.
3. Classify changed areas:
   - backend API
   - MongoDB/model/query
   - frontend UI/state
   - payment/order
   - socket/realtime
   - upload/media
   - AI provider
   - deploy/config
   - agent kit/docs
4. Use relevant skills.
5. Report findings by severity:
   - Critical: must fix before merge
   - High: should fix before merge
   - Medium: acceptable with clear follow-up
   - Low: style/maintainability
6. Check verification evidence.

## Output

- Summary verdict: approve / approve with notes / block
- Findings with file references
- Missing tests/checks
- Suggested minimal fixes
