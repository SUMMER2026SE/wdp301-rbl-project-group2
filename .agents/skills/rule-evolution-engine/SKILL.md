---
name: rule-evolution-engine
description: Use this skill when a lesson, bug, incident, or repeated review comment should be promoted into a durable Antigravity rule, workflow, skill, or reference. It keeps the agent kit evolving without becoming messy.
---

# Rule Evolution Engine Skill

## Goal

Convert repeated or high-risk learnings into durable agent behavior.

## Promotion targets

- `.agents/rules/`: always-on guardrails.
- `.agents/workflows/`: repeatable step-by-step processes.
- `.agents/skills/`: task-specific expertise and optional scripts/references.
- `.agents/references/`: deeper docs/checklists/templates.
- `.agents/memory/patterns/`: reusable implementation recipes.

## Instructions

1. Read the source lesson/incident/pattern.
2. Check whether existing rules/skills/workflows already cover it.
3. Choose the smallest durable target.
4. Make a minimal update.
5. Add a backlink from the source memory card to the promoted target.
6. Update `MEMORY_INDEX.md`.
7. Run agent kit audit if available:
   `python .agents/skills/agent-kit-maintainer/scripts/audit_agent_kit.py .`

## Promotion thresholds

- Critical: promote immediately.
- High: promote if related to money, privacy, auth, production, or data integrity.
- Medium: promote after repeated occurrence.
- Low: keep as a lesson unless it becomes common.

## Constraints

- Do not create duplicate rules.
- Do not make global rules from one-off preferences.
- Do not weaken existing security/payment/deploy guardrails.
