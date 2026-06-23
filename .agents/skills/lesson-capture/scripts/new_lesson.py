#!/usr/bin/env python3
"""Create a new FOA memory lesson card safely."""
from __future__ import annotations

import argparse
import datetime as dt
import re
from pathlib import Path


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value or "lesson"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("repo", nargs="?", default=".")
    parser.add_argument("--title", required=True)
    parser.add_argument("--severity", default="medium", choices=["critical", "high", "medium", "low"])
    parser.add_argument("--tags", default="")
    parser.add_argument("--applies-to", default="backend,frontend")
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    lessons_dir = repo / ".agents" / "memory" / "lessons"
    lessons_dir.mkdir(parents=True, exist_ok=True)
    today = dt.date.today().isoformat()
    slug = slugify(args.title)
    path = lessons_dir / f"{today}-{slug}.md"
    counter = 2
    while path.exists():
        path = lessons_dir / f"{today}-{slug}-{counter}.md"
        counter += 1

    tags = ", ".join([t.strip() for t in args.tags.split(",") if t.strip()])
    applies = ", ".join([t.strip() for t in args.applies_to.split(",") if t.strip()])

    content = f"""---
type: lesson
status: active
severity: {args.severity}
tags: [{tags}]
applies_to: [{applies}]
created: {today}
updated: {today}
source: human|bugfix|review|incident|agent-failure
promote_if_repeated: true
---

# Lesson: {args.title}

## Trigger

TODO: What happened? Include route/model/component names if relevant.

## Root cause

TODO: Why did it happen?

## Correct pattern next time

TODO: What should the agent/dev do next time?

## Evidence / verification

TODO: Commands, tests, PR, or manual QA evidence. Do not include secrets or private customer data.

## Should this be promoted?

- [ ] Keep as lesson
- [ ] Promote to `.agents/rules`
- [ ] Promote to `.agents/skills`
- [ ] Promote to `.agents/workflows`
- [ ] Promote to `.agents/references`

Reason: TODO
"""
    path.write_text(content, encoding="utf-8")
    print(path.relative_to(repo))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
