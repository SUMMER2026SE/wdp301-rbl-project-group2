# 85 — Agent Memory Governance

This project uses repository-backed agent memory under `.agents/memory/`.
This is the source of reusable team knowledge for Antigravity sessions.

## Read path — before work
For any non-trivial task, bug fix, payment/order/auth/upload/socket/database/deploy task, or task similar to previous work:

1. Read `AGENTS.md`.
2. Read `.agents/memory/MEMORY_INDEX.md`.
3. Retrieve relevant memory cards from:
   - `.agents/memory/lessons/`
   - `.agents/memory/patterns/`
   - `.agents/memory/incidents/`
   - `.agents/memory/decisions/`
   - `.agents/memory/module-index/`
4. State which memory cards influenced the plan.
5. If no relevant memory exists, say so explicitly.

## Write path — after work
After any bug fix, failed attempt, production incident, repeated review comment, new convention, or newly discovered project-specific pattern:

1. Capture the learning as a small memory card.
2. Use tags and `applies_to` so future retrieval works.
3. Update `.agents/memory/MEMORY_INDEX.md` using the memory-curator skill or script.
4. If the lesson is Critical/High severity or repeated twice, propose promoting it to a rule, workflow, or skill.

## Promotion policy
Promote memory when:

- Critical: immediately promote to rule and/or security checklist.
- High: promote if it can prevent money loss, data leak, auth bypass, order/payment corruption, or VPS outage.
- Repeated Medium: promote when it happens twice.
- Low: keep as a lesson/pattern unless it becomes common.

## Memory quality rules
Memory must be:

- Atomic: one lesson/pattern per file.
- Searchable: clear title, tags, component names, route names, model names, provider names.
- Actionable: include what to do next time, not just what happened.
- Verified: include evidence or commands when available.
- Safe: never store secrets, tokens, `.env` values, API keys, customer private data, payment signatures, or raw webhook secrets.

## Required task report memory section
For non-trivial tasks, the final report must include:

- Memory consulted
- New memory captured, if any
- Memory promotion proposed, if any
- Index updated: yes/no and why
