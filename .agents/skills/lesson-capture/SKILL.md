---
name: lesson-capture
description: Use this skill after a bug, failed attempt, repeated review comment, new team rule, new invariant, or project-specific discovery to create a reusable FOA memory card and decide whether to promote it into rules, workflows, skills, or references.
---

# Lesson Capture Skill

## Goal

Turn newly discovered project knowledge into searchable, reusable memory.

## When to use

Use after:

- A bug fix.
- A failed agent attempt.
- A human correction.
- A repeated code review comment.
- A new convention or invariant.
- A production/staging incident.

## Instructions

1. Classify the memory:
   - lesson
   - pattern
   - incident
   - decision
   - module-index update
2. Write one atomic Markdown card under `.agents/memory/`.
3. Add frontmatter fields: `type`, `status`, `severity`, `tags`, `applies_to`, `created`, `updated`, `source`.
4. Keep it short and searchable.
5. Never store secrets, tokens, private customer data, or raw payment signatures.
6. Update `.agents/memory/MEMORY_INDEX.md` using the memory-curator script.
7. Propose promotion when severity is Critical/High or repeated.

## Optional script

```bash
python .agents/skills/lesson-capture/scripts/new_lesson.py . \
  --title "PayOS callback must be idempotent" \
  --severity high \
  --tags payos,payment,webhook,idempotency \
  --applies-to backend
```

## Output

```txt
Memory captured:
- path:
- reason:

Promotion:
- none | rule | skill | workflow | reference
- reason:
```
