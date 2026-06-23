---
name: memory-retriever
description: Use this skill before non-trivial tasks to retrieve relevant FOA project memory from .agents/memory, including lessons, patterns, incidents, decisions, and module maps. Especially useful for repeated bugs, payment/order/auth/upload/socket/database/deploy work, or tasks similar to previous work.
---

# Memory Retriever Skill

## Goal

Load only the relevant long-term project memory before planning or editing code.

## When to use

Use this skill for:

- Any task that is not a tiny typo fix.
- Bug fixes and debugging.
- Order, checkout, PayOS, auth, upload, Socket.IO, MongoDB, VPS/deploy work.
- Tasks where the user says "lần trước", "tương tự", "nhớ", "đừng lặp lại", "audit lại", or "nguyên tắc mới".

## Instructions

1. Read `.agents/memory/MEMORY_INDEX.md`.
2. Identify task keywords and tags.
3. Read only relevant memory cards.
4. Report which memory was consulted before making a plan.
5. If relevant memory is missing, add a note to capture memory after the task.

## Optional script

Use this script for quick keyword search:

```bash
python .agents/skills/memory-retriever/scripts/search_memory.py . "payos webhook idempotent"
```

## Output

```txt
Memory consulted:
- .agents/memory/patterns/...

Applied memory:
- ...

Missing memory to capture later:
- ...
```

## Constraints

- Do not read `.env` or secrets.
- Do not dump large memory files into the response.
- Do not treat stale memory as truth if the code contradicts it. Inspect code and report the conflict.
