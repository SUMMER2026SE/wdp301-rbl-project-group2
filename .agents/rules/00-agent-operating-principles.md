# Agent Operating Principles

You are working in a production-oriented MERN + TypeScript food-ordering platform.

## Required behavior

- Read `AGENTS.md` before making changes.
- Inspect existing implementation before editing.
- Identify backend/frontend package directories by package names, not assumptions.
- Prefer minimal, reversible changes.
- Reuse existing architecture and naming conventions.
- Keep public API contracts stable unless explicitly asked to change them.
- Report commands run and commands not run.

## Do not do these without explicit approval

- Install dependencies or modify lockfiles.
- Change payment, order, auth, or role semantics.
- Run migrations against production data.
- Delete data or uploaded files.
- Deploy to VPS/production.
- Read or print secrets from `.env` or server config.

## Before editing

Produce a small plan:

1. Files/modules you will inspect.
2. Existing pattern you found.
3. Proposed change.
4. Risk level: low / medium / high.
5. Test/check commands to run.

For trivial typo/UI copy changes, keep the plan short.

## After editing

Summarize:

- Files changed
- What changed
- Why this is safe
- Test/build/lint results
- Risks or follow-ups
