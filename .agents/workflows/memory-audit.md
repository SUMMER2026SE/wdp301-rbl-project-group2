# Workflow: memory-audit

Use weekly, before large releases, or after several lessons have accumulated.

## Steps

1. Read `.agents/memory/MEMORY_INDEX.md`.
2. Scan all memory cards.
3. Detect duplicates, stale cards, contradictions, missing tags, and cards that are too long.
4. Consolidate repeated lessons into a pattern.
5. Promote important/repeated patterns into `.agents/rules`, `.agents/skills`, or `.agents/workflows`.
6. Archive or mark stale memory instead of deleting it unless approved.
7. Run:
   `python .agents/skills/memory-curator/scripts/update_memory_index.py .`
8. Report changes and promotion decisions.

## Output format

```txt
Audit summary:
- cards scanned:
- duplicates:
- stale/conflicting:
- promoted:
- index updated:

Next recommendations:
- ...
```
