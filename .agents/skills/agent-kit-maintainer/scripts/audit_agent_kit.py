#!/usr/bin/env python3
"""Audit an Antigravity .agents kit without external dependencies.

Checks:
- .agents/rules, .agents/workflows, .agents/skills exist
- each skill folder has SKILL.md
- SKILL.md has YAML-like frontmatter with name and description
- name matches directory
- description is not vague
- warns when SKILL.md is large enough to consider references/
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

MIN_DESCRIPTION_LEN = 80
MAX_SKILL_LINES = 180
VAGUE_WORDS = {"tools", "helper", "misc", "general", "stuff", "utilities"}


def parse_frontmatter(text: str) -> dict[str, str]:
    if not text.startswith("---\n"):
        return {}
    end = text.find("\n---", 4)
    if end == -1:
        return {}
    raw = text[4:end].strip().splitlines()
    data: dict[str, str] = {}
    for line in raw:
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        data[key.strip()] = value.strip().strip('"\'')
    return data


def main() -> int:
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    agents = root / ".agents"
    errors: list[str] = []
    warnings: list[str] = []

    for sub in ["rules", "workflows", "skills"]:
        if not (agents / sub).is_dir():
            errors.append(f"missing .agents/{sub}/")

    skills_dir = agents / "skills"
    if skills_dir.is_dir():
        for skill_dir in sorted(p for p in skills_dir.iterdir() if p.is_dir()):
            skill_md = skill_dir / "SKILL.md"
            if not skill_md.exists():
                errors.append(f"{skill_dir.relative_to(root)} missing SKILL.md")
                continue
            text = skill_md.read_text(encoding="utf-8")
            fm = parse_frontmatter(text)
            name = fm.get("name", "")
            desc = fm.get("description", "")
            if not name:
                errors.append(f"{skill_md.relative_to(root)} missing frontmatter name")
            elif name != skill_dir.name:
                errors.append(f"{skill_md.relative_to(root)} name '{name}' does not match folder '{skill_dir.name}'")
            if not desc:
                errors.append(f"{skill_md.relative_to(root)} missing frontmatter description")
            else:
                if len(desc) < MIN_DESCRIPTION_LEN:
                    warnings.append(f"{skill_md.relative_to(root)} description may be too short for reliable routing")
                lowered = set(re.findall(r"[a-z]+", desc.lower()))
                if lowered & VAGUE_WORDS:
                    warnings.append(f"{skill_md.relative_to(root)} description contains vague words: {sorted(lowered & VAGUE_WORDS)}")
            line_count = len(text.splitlines())
            if line_count > MAX_SKILL_LINES:
                warnings.append(f"{skill_md.relative_to(root)} has {line_count} lines; consider moving details to references/")

    print("Antigravity agent kit audit")
    print(f"Root: {root}")
    if errors:
        print("\nERRORS:")
        for item in errors:
            print(f"- {item}")
    if warnings:
        print("\nWARNINGS:")
        for item in warnings:
            print(f"- {item}")
    if not errors and not warnings:
        print("\nPASS: no issues found")
    elif not errors:
        print("\nPASS WITH WARNINGS")
    else:
        print("\nFAIL")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
