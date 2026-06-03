# GitHub Reference Notes — Ideas Adopted

This kit is custom for the FOA food-ordering platform. It does not copy public repo content verbatim. The ideas below were adapted after reviewing public GitHub repositories and official Antigravity/Agent Skills documentation.

## Repositories / docs reviewed

- `agentsmd/agents.md` — AGENTS.md as a predictable README-like context file for coding agents.
- Google Antigravity Skills docs/codelab — skills as folder packages with `SKILL.md`, frontmatter, optional scripts/references/assets, and progressive disclosure.
- `agentskills/agentskills` — standard skill shape: folder + `SKILL.md`, metadata, instructions, optional scripts/references/assets.
- `addyosmani/agent-skills` — lifecycle-oriented commands: spec, plan, build, test, review, ship; skills should be specific, verifiable, minimal.
- `balamuru/antigravity-dev-skills` — Antigravity-specific idea of skills as roles, persistent artifacts, and atomic execute/verify loops.
- `gohypergiant/agent-skills` — explicit skill prompting, project-scoped install, skill audit loop, and frontmatter quality checks.
- `supabase/agent-skills` — official team skill packaging and "use when" routing descriptions.
- `roboflow/supervision` `AGENTS.md` — senior contributor behavior: plan before changes, align with repo conventions, commit/PR discipline.
- `continuedev/awesome-rules` — rules as clear, actionable markdown instructions with YAML/frontmatter conventions in the broader ecosystem.
- `github/awesome-copilot` — catalog pattern for specialist agents and MCP/tool permission awareness.
- `VoltAgent/awesome-agent-skills` — curated skill lists are useful for discovery, but they are not a substitute for security review.

## Ideas adopted

1. **Spec before code** for risky or multi-file work.
2. **Plan → atomic slice → verify → report** instead of large opaque edits.
3. **Progressive disclosure**: keep rules short, put deep checklists in `.agents/references`, load details only when relevant.
4. **Strong skill descriptions** so Antigravity can route skills reliably.
5. **Deterministic scripts inside skills** for structural audits and safe scans.
6. **Task artifacts** for medium/high-risk tasks so humans can review intent before code.
7. **Skill governance**: audit skills after edits, keep names stable, avoid giant vague skills.
8. **Explicit tool permission policy** for terminal, MCP, GitHub, logs, DB, SSH, deploy.
9. **Review severity model**: Critical / High / Medium / Low.
10. **Living rules**: capture repeated team corrections into rules/workflows/skills.

## Important caution

Do not blindly install large public skill packs into a production repo. Public skill catalogs are great for ideas, but project-specific rules should be reviewed, minimized, and security-checked before use.
