---
name: repo-risk-scanner
description: Use this skill to run a safe local repository scan for risky patterns such as committed env files, secret-like strings, dangerous production commands, missing validation around payment/order/upload/socket code, and broad MongoDB operations.
---

# Skill: repo-risk-scanner

## Goal

Find obvious risk signals before merge without reading secret values.

## Command

```bash
python .agents/skills/repo-risk-scanner/scripts/safe_repo_scan.py .
```

The script uses Python standard library only and skips heavy folders such as `node_modules`, `dist`, `build`, `.git`, and uploads.

## How to use results

- Treat findings as prompts for human/agent review, not automatic proof of a bug.
- Never print secret values; report file path and line number only.
- For payment/order/auth/upload findings, use the relevant guardian skill before editing.

## Constraints

- Do not run destructive commands.
- Do not inspect production systems.
- Do not upload scan output containing sensitive paths/logs to third-party services.
