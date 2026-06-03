# Agent Memory and Learning Rule

Rules and skills are living documents. If the team corrects the agent about the same issue repeatedly, convert that lesson into a rule, workflow, or skill update.

## When to update agent knowledge

Suggest an update when:

- the same mistake happens twice
- a project-specific convention is discovered
- a production incident reveals a missing guardrail
- a new recurring workflow appears
- a library/API pattern in this repo differs from public examples

## Where to store learnings

Use the smallest durable place:

- Project-wide invariant: `.agents/rules/*.md`
- Repeatable task procedure: `.agents/workflows/*.md`
- Domain specialist behavior: `.agents/skills/<name>/SKILL.md`
- Detailed checklist/example: `.agents/references/*.md`
- Temporary task state: chat or an explicitly requested task artifact

## Do not store

Never store:

- secrets
- customer data
- production credentials
- private payment payloads
- raw logs with tokens/cookies
- personal data copied from database dumps

## Skill update protocol

When updating a skill:

1. Keep `name` stable unless intentionally renaming the skill.
2. Improve `description` with concrete trigger keywords.
3. Add or update verification/exit criteria.
4. Keep the body concise.
5. Move long checklists/examples into `.agents/references/`.
6. Run the agent kit audit workflow if available.
