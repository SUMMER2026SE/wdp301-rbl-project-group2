# Workflow: promote-lesson

Use when a lesson should become a durable guardrail.

## Promotion rules

- Critical lesson → rule or workflow immediately.
- High-risk payment/order/auth/upload/socket/VPS lesson → rule or skill unless already covered.
- Repeated medium lesson → pattern first, then rule if still repeated.
- Simple implementation recipe → pattern or reference.

## Steps

1. Read the lesson card.
2. Check if an existing rule/skill/workflow/reference already covers it.
3. Choose target:
   - `.agents/rules/` for always-on guardrails.
   - `.agents/skills/` for task-specific expertise.
   - `.agents/workflows/` for step-by-step process.
   - `.agents/references/` or `.agents/memory/patterns/` for deeper docs.
4. Update the target file minimally.
5. Add a backlink from the lesson to the promoted file.
6. Run memory index update.
7. Run agent kit audit if skill/rule/workflow changed.

## Output format

```txt
Promoted lesson:
- source:
- target:
- reason:
- verification:
```
