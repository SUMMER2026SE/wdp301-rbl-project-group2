#!/usr/bin/env python3
"""Safe static risk scan for common AI-agent mistakes.

This is intentionally conservative. It reports file path + line number + rule id,
not secret values.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

SKIP_DIRS = {".git", "node_modules", "dist", "build", ".next", "coverage", "uploads", "tmp", "logs"}
SKIP_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz", ".lock"}
MAX_FILE_SIZE = 512_000

RULES: list[tuple[str, re.Pattern[str], str]] = [
    ("SECRET_FILE", re.compile(r"(^|/)(\.env($|\.)|.*\.pem$|.*id_rsa.*|.*\.key$)", re.I), "secret-like file name"),
    ("SECRET_VALUE", re.compile(r"(PAYOS|JWT|CLOUDINARY|GROQ|GEMINI|SMTP|MONGO).*?(SECRET|KEY|TOKEN|URI)\s*=", re.I), "secret-like assignment"),
    ("DANGEROUS_DB", re.compile(r"\b(dropDatabase|deleteMany\s*\(|updateMany\s*\(|remove\s*\()", re.I), "broad/destructive MongoDB operation"),
    ("DANGEROUS_SHELL", re.compile(r"\b(docker\s+system\s+prune|rm\s+-rf|pm2\s+restart|systemctl\s+restart|ssh\s+)", re.I), "production/destructive shell command"),
    ("CLIENT_TOTAL", re.compile(r"(req\.body|body|payload)\.(total|amount|price|subtotal|deliveryFee|discount)", re.I), "client-provided money field"),
    ("BROAD_SOCKET", re.compile(r"io\.emit\s*\(", re.I), "global Socket.IO emit"),
    ("CONSOLE_LOG", re.compile(r"console\.log\s*\(", re.I), "console.log left in code"),
]

TEXT_SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".yml", ".yaml", ".env", ".example", ".sh", ".txt"}


def iter_files(root: Path):
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        parts = set(path.parts)
        if parts & SKIP_DIRS:
            continue
        if path.suffix.lower() in SKIP_SUFFIXES:
            continue
        try:
            if path.stat().st_size > MAX_FILE_SIZE:
                continue
        except OSError:
            continue
        if path.suffix.lower() not in TEXT_SUFFIXES and path.name not in {"Dockerfile", "docker-compose.yml", "docker-compose.yaml"}:
            continue
        yield path


def main() -> int:
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    findings: list[tuple[str, str, int, str]] = []

    for path in iter_files(root):
        rel = path.relative_to(root)
        rel_str = str(rel)
        for rule_id, pattern, message in RULES:
            if rule_id == "SECRET_FILE" and pattern.search(rel_str):
                findings.append((rule_id, rel_str, 0, message))
        try:
            lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
        except Exception:
            continue
        for idx, line in enumerate(lines, start=1):
            for rule_id, pattern, message in RULES:
                if rule_id == "SECRET_FILE":
                    continue
                if pattern.search(line):
                    findings.append((rule_id, rel_str, idx, message))

    print("Safe repository risk scan")
    print(f"Root: {root}")
    if not findings:
        print("PASS: no obvious risk signals found")
        return 0
    for rule_id, file, line, message in findings:
        loc = f"{file}:{line}" if line else file
        print(f"- [{rule_id}] {loc} — {message}")
    print("\nNote: findings are signals, not automatic proof of a bug. Review before changing code.")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
