# Workflow: retrieve-memory

Use before non-trivial implementation, bug fixing, review, refactor, payment/order/auth/upload/socket/database/deploy work, or whenever the task resembles previous work.

## Steps

1. Read `AGENTS.md`.
2. Read `.agents/rules/85-memory-governance.md`.
3. Read `.agents/memory/MEMORY_INDEX.md`.
4. Identify task tags: area, module, provider, risk level, affected stack.
5. Read matching memory cards from `.agents/memory/lessons`, `.agents/memory/patterns`, `.agents/memory/incidents`, `.agents/memory/decisions`, and `.agents/memory/module-index`.
6. Report:
   - Memory cards consulted.
   - Applicable rules/patterns.
   - Conflicts or stale memory, if any.
   - Missing memory that should be created after the task.
7. Only then produce a plan or edit code.

## Output format

```txt
Memory consulted:
- path: reason

Applicable constraints:
- ...

Potential missing memory:
- ...
```
