# Workflow: post-incident-review

Use after production/staging incidents, payment mismatches, order corruption, auth/security issues, upload exposure, Socket.IO privacy leaks, deploy outages, or any high-impact bug.

## Steps

1. Create incident card from `.agents/memory/incidents/0000-template.md`.
2. Fill summary, impact, timeline, root cause, fix, and verification.
3. Create or update a lesson card.
4. Create or update a pattern card if the fix should become a reusable recipe.
5. Promote Critical/High learnings into `.agents/rules`, `.agents/skills`, or `.agents/workflows`.
6. Update `.agents/memory/MEMORY_INDEX.md`.
7. Report follow-up tasks.

## Safety

Do not store secrets, raw payment signatures, private customer data, or full production logs.
