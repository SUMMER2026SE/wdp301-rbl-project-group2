#!/usr/bin/env python3
"""Update .agents/memory/MEMORY_INDEX.md from memory cards.

Safe by design: reads markdown metadata and headings only; does not print secrets.
"""
from __future__ import annotations

import argparse
import datetime as dt
import re
from pathlib import Path
from typing import Dict, List, Tuple

START = "<!-- AUTO-GENERATED:START -->"
END = "<!-- AUTO-GENERATED:END -->"

FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n", re.S)
HEADING_RE = re.compile(r"^#\s+(.+)$", re.M)

SKIP_NAMES = {"README.md", "MEMORY_INDEX.md", "anti-patterns.md", "glossary.md"}


def parse_frontmatter(text: str) -> Dict[str, str]:
    match = FRONTMATTER_RE.match(text)
    if not match:
        return {}
    data: Dict[str, str] = {}
    for raw_line in match.group(1).splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        key, value = line.split(":", 1)
        data[key.strip()] = value.strip().strip('"').strip("'")
    return data


def heading(text: str, fallback: str) -> str:
    match = HEADING_RE.search(text)
    return match.group(1).strip() if match else fallback


def collect_cards(memory_dir: Path) -> List[Tuple[str, str, Dict[str, str]]]:
    cards: List[Tuple[str, str, Dict[str, str]]] = []
    for path in sorted(memory_dir.rglob("*.md")):
        rel = path.relative_to(memory_dir).as_posix()
        if path.name in SKIP_NAMES:
            continue
        if path.name.startswith("0000-template"):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        meta = parse_frontmatter(text)
        title = heading(text, path.stem.replace("-", " ").title())
        cards.append((rel, title, meta))
    return cards


def render(cards: List[Tuple[str, str, Dict[str, str]]]) -> str:
    today = dt.date.today().isoformat()
    lines = [f"_Generated on {today} from `.agents/memory` cards._", ""]
    if not cards:
        lines.append("_No memory cards found yet._")
        return "\n".join(lines)

    groups: Dict[str, List[Tuple[str, str, Dict[str, str]]]] = {}
    for rel, title, meta in cards:
        card_type = meta.get("type", "uncategorized").strip("[]") or "uncategorized"
        groups.setdefault(card_type, []).append((rel, title, meta))

    for card_type in sorted(groups):
        lines.append(f"### {card_type.title()}")
        lines.append("")
        lines.append("| Severity | Status | Tags | Applies to | Card |")
        lines.append("|---|---|---|---|---|")
        for rel, title, meta in groups[card_type]:
            severity = meta.get("severity", "")
            status = meta.get("status", "")
            tags = meta.get("tags", "")
            applies = meta.get("applies_to", "")
            lines.append(f"| {severity} | {status} | `{tags}` | `{applies}` | [{title}]({rel}) |")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def replace_section(index_text: str, generated: str) -> str:
    if START not in index_text or END not in index_text:
        raise SystemExit(f"Missing markers {START} / {END} in MEMORY_INDEX.md")
    before, rest = index_text.split(START, 1)
    _, after = rest.split(END, 1)
    return before + START + "\n" + generated + END + after


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("repo", nargs="?", default=".", help="Repository root")
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    memory_dir = repo / ".agents" / "memory"
    index_path = memory_dir / "MEMORY_INDEX.md"
    if not memory_dir.exists():
        raise SystemExit(f"Missing memory dir: {memory_dir}")
    if not index_path.exists():
        raise SystemExit(f"Missing index file: {index_path}")

    cards = collect_cards(memory_dir)
    generated = render(cards)
    index_text = index_path.read_text(encoding="utf-8", errors="replace")
    index_path.write_text(replace_section(index_text, generated), encoding="utf-8")
    print(f"Updated {index_path.relative_to(repo)} with {len(cards)} memory cards.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
