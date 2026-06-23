# Skill Authoring Checklist

Use when creating or editing `.agents/skills/<skill>/SKILL.md`.

## Frontmatter

- `name` is lowercase kebab-case.
- `name` matches folder name.
- `description` explains when to use the skill.
- `description` contains concrete trigger keywords.
- `description` is specific, not vague.

Good description pattern:

```md
description: Use this skill when <task/context>; it helps with <specific domain> and enforces <key constraints/quality gates>.
```

## Body

A good skill body includes:

- Goal
- Procedure
- Constraints
- Verification/exit criteria
- Output format
- Relevant reference files when needed

## Keep skills small

Move long static content to:

```txt
.agents/references/
```

Move deterministic logic to:

```txt
.agents/skills/<skill>/scripts/
```

Move templates to:

```txt
.agents/skills/<skill>/templates/
```

## Avoid

- giant generic skills
- conflicting instructions
- hidden destructive commands
- secrets or real customer data
- depending on tools that are not installed
