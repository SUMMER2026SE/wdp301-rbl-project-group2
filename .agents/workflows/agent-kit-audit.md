# Workflow: agent-kit-audit

Goal: verify that the Antigravity agent kit is structurally healthy.

## Steps

1. Use the `agent-kit-maintainer` skill.
2. Run the deterministic audit script if available:

```bash
python .agents/skills/agent-kit-maintainer/scripts/audit_agent_kit.py .
```

3. Fix reported structural issues:
   - missing `SKILL.md`
   - missing `name` or `description`
   - skill name not matching directory
   - vague description
   - missing rules/workflows folders
   - oversized skill body that should move to references
4. Re-run the audit.
5. Report pass/fail and remaining warnings.

Do not install dependencies for this audit; the script must run with Python standard library only.
