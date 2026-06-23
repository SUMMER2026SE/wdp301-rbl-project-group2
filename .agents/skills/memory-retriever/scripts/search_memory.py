#!/usr/bin/env python3
"""Simple keyword search over .agents/memory markdown cards."""
from __future__ import annotations

import argparse
import re
from pathlib import Path

SECRET_PATTERNS = [
    re.compile(r"(?i)(api[_-]?key|secret|token|password)\s*[:=]\s*[^\s]+"),
]


def sanitize(line: str) -> str:
    for pattern in SECRET_PATTERNS:
        line = pattern.sub(r"\1=<redacted>", line)
    return line


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("repo", nargs="?", default=".")
    parser.add_argument("query", nargs="+", help="Keywords to search")
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    memory_dir = repo / ".agents" / "memory"
    terms = [t.lower() for q in args.query for t in q.split() if t.strip()]
    if not memory_dir.exists():
        raise SystemExit(f"Missing memory dir: {memory_dir}")

    results = []
    for path in sorted(memory_dir.rglob("*.md")):
        text = path.read_text(encoding="utf-8", errors="replace")
        lower = text.lower()
        score = sum(lower.count(term) for term in terms)
        if score:
            snippet = ""
            for line in text.splitlines():
                if any(term in line.lower() for term in terms):
                    snippet = sanitize(line.strip())[:220]
                    break
            results.append((score, path, snippet))

    for score, path, snippet in sorted(results, key=lambda item: (-item[0], str(item[1])))[:20]:
        print(f"[{score}] {path.relative_to(repo)}")
        if snippet:
            print(f"    {snippet}")
    if not results:
        print("No matching memory cards found.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
