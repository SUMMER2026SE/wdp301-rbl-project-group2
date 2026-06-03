# Workflow: capture-lesson

Use after discovering a bug, repeated review comment, failed agent attempt, new human rule, new project convention, or a pitfall that future work should avoid.

## Steps

1. Decide whether the learning is worth persisting.
2. Classify it:
   - lesson
   - pattern
   - incident
   - decision
   - module-index update
3. Create or update the smallest relevant Markdown card under `.agents/memory/`.
4. Include searchable tags and `applies_to` frontmatter.
5. Do not store secrets, tokens, customer private data, or raw payment signatures.
6. Run or ask to run:
   `python .agents/skills/memory-curator/scripts/update_memory_index.py .`
7. Decide whether promotion is needed:
   - Critical/High: propose rule/skill/workflow update.
   - Repeated Medium: propose promotion.
   - Low: keep as lesson/pattern.

## Output format

```txt
Memory captured:
- path:
- type:
- tags:
- why future agents need this:

Promotion proposal:
- none | rule | skill | workflow | reference
- reason:
```
