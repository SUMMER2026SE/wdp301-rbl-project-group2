---
name: memory-curator
description: Use this skill to audit, deduplicate, organize, and index .agents/memory. It updates MEMORY_INDEX.md, finds stale or duplicate memory cards, and recommends promotion into rules, workflows, skills, or references.
---

# Memory Curator Skill

## Goal

Keep FOA agent memory small, searchable, current, and useful.

## When to use

Use weekly, before releases, after adding several lessons, or when the user asks to audit/refactor memory.

## Instructions

1. Scan `.agents/memory/`.
2. Check each card for frontmatter, tags, `applies_to`, severity, and actionability.
3. Detect duplicates and contradictions.
4. Consolidate repeated lessons into pattern cards.
5. Promote high-risk lessons into rules/skills/workflows.
6. Update `.agents/memory/MEMORY_INDEX.md`.
7. Report changes clearly.

## Script

```bash
python .agents/skills/memory-curator/scripts/update_memory_index.py .
```

This script updates the auto-generated section of `MEMORY_INDEX.md` without printing secrets.

## Constraints

- Do not delete memory cards unless the human approves.
- Prefer marking stale cards with `status: stale` and explaining why.
- Never store or print `.env` values, API keys, tokens, payment signatures, or customer private data.
