---
name: agent-kit-maintainer
description: Use this skill when creating, editing, auditing, or organizing Antigravity rules, workflows, skills, SKILL.md frontmatter, agent references, or prompt templates for this repository.
---

# Skill: agent-kit-maintainer

## Goal

Keep the `.agents` system useful, small, discoverable, and safe.

## Principles

- Skills should be specific, actionable, verifiable, and minimal.
- Skill `description` must include when to use the skill and concrete trigger keywords.
- Long checklists/examples belong in `.agents/references/`, not always-loaded rules.
- Rules are always-on guardrails; keep them short and non-negotiable.
- Workflows are explicit repeatable processes; keep them step-based.
- Avoid importing large public skill libraries blindly.

## Audit command

Run when possible:

```bash
python .agents/skills/agent-kit-maintainer/scripts/audit_agent_kit.py .
```

The script uses Python standard library only.

## Checklist

1. Does every skill folder contain `SKILL.md`?
2. Does every `SKILL.md` have YAML frontmatter?
3. Does frontmatter include `name` and `description`?
4. Does `name` match folder name?
5. Is `description` concrete enough to route the skill?
6. Is the body concise and step-based?
7. Are high-risk constraints explicit?
8. Are references used for long details?
9. Are secrets/customer data absent?

## Output

- Changes made
- Audit pass/fail
- Remaining warnings
- Suggested next improvement
