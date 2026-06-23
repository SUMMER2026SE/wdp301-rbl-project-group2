---
name: spec-first-planner
description: Use this skill when a task is vague, multi-step, risky, or affects payment, order, auth, database, deployment, or several frontend/backend files; it creates acceptance criteria and atomic implementation slices before coding.
---

# Skill: spec-first-planner

## Goal

Turn a request into a compact engineering spec that a senior developer can review before implementation.

## Procedure

1. Read `AGENTS.md` and relevant rules.
2. Identify user roles and affected business flow.
3. Write 3-7 acceptance criteria.
4. Define non-goals so scope does not creep.
5. Inspect existing patterns before proposing new structure.
6. Split implementation into atomic slices.
7. Define verification: automated checks and manual QA.
8. Flag high-risk areas early.

## Use references

- `.agents/references/AGENT_TASK_TEMPLATE.md`
- `.agents/references/FOOD_COMMERCE_INVARIANTS.md`
- `.agents/references/QUALITY_GATES.md`

## Output

- Spec summary
- Acceptance criteria
- Non-goals
- Existing patterns to inspect
- Atomic implementation plan
- Verification plan
- Risks

## Constraints

- Do not edit code while planning unless explicitly asked.
- Do not invent payment/order/auth semantics.
- Do not ask many questions; ask only one blocking question if needed.
