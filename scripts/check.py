#!/usr/bin/env python3
"""Lint the NECX outreach repo. Exit code 1 on any failure.

Checks:
  1. Banned claims don't appear as approved wording.
  2. SKILL.md has valid frontmatter (name, description <= 1024 chars, no "claude"/"anthropic" in name).
  3. The ChatGPT Instructions block stays under 8,000 characters.
  4. Version numbers in plugin.json and marketplace.json match.
  5. No obvious private data (email addresses outside necx.org/example domains, phone numbers).
Run: python scripts/check.py
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PLAYBOOK = ROOT / "playbook" / "necx-outreach-playbook.md"
SKILL = ROOT / "plugins" / "necx-outreach" / "skills" / "necx-outreach-planner" / "SKILL.md"
GPT = ROOT / "chatgpt" / "custom-gpt-setup.md"
VIDEO_SKILL = ROOT / "plugins" / "necx-outreach" / "skills" / "necx-outreach-video" / "SKILL.md"
SKIP_DIRS = {"node_modules", "out", ".git", "necx-outreach-videos"}
PLUGIN = ROOT / "plugins" / "necx-outreach" / ".claude-plugin" / "plugin.json"
MARKET = ROOT / ".claude-plugin" / "marketplace.json"

# Phrases that must never appear in email/video copy. They may appear only on
# lines that mark them as banned (contain "banned", "never", "say", "replaced", "instead").
BANNED = [
    r"hud[- ]certified",
    r"hud[- ]approved",
    r"address(es)? (is|are) never shown",
    r"zero errors",
    r"guaranteed compliance",
    r"audit[- ]proof",
]
ALLOWED_CONTEXT = re.compile(r"banned|never|say |replaced|instead|correct|not |don't|doesn't", re.I)

ALLOWED_EMAIL_DOMAINS = ("necx.org", "example.com", "crm.example.com")
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})")
PHONE_RE = re.compile(r"\(?\b\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b")

errors: list[str] = []


def scan_banned(path: pathlib.Path) -> None:
    in_banned_section = False
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        # Lines under a "Banned claims" heading list the phrases on purpose.
        if line.lstrip().startswith("#"):
            in_banned_section = "banned" in line.lower()
            continue
        if in_banned_section:
            continue
        for pat in BANNED:
            if re.search(pat, line, re.I) and not ALLOWED_CONTEXT.search(line):
                errors.append(f"{path.relative_to(ROOT)}:{n}: banned claim /{pat}/ used as copy")


def scan_private(path: pathlib.Path) -> None:
    text = path.read_text(encoding="utf-8")
    for m in EMAIL_RE.finditer(text):
        if not m.group(1).lower().endswith(ALLOWED_EMAIL_DOMAINS):
            errors.append(f"{path.relative_to(ROOT)}: non-NECX email address found: {m.group(0)}")
    for m in PHONE_RE.finditer(text):
        errors.append(f"{path.relative_to(ROOT)}: phone number found: {m.group(0)}")


def check_skill() -> None:
    text = SKILL.read_text(encoding="utf-8")
    fm = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not fm:
        errors.append("SKILL.md: missing YAML frontmatter")
        return
    meta = {}
    for line in fm.group(1).splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip().strip('"')
    name, desc = meta.get("name", ""), meta.get("description", "")
    if not re.fullmatch(r"[a-z0-9-]{1,64}", name):
        errors.append(f"SKILL.md: name '{name}' must be kebab-case, max 64 chars")
    if re.search(r"claude|anthropic", name, re.I):
        errors.append("SKILL.md: name must not contain 'claude' or 'anthropic'")
    if not desc or len(desc) > 1024:
        errors.append(f"SKILL.md: description missing or over 1024 chars ({len(desc)})")
    if "<" in desc or ">" in desc:
        errors.append("SKILL.md: description must not contain angle brackets")


def check_gpt() -> None:
    blocks = GPT.read_text(encoding="utf-8").split("```")
    if len(blocks) < 3:
        errors.append("custom-gpt-setup.md: Instructions code block not found")
        return
    size = len(blocks[1])
    if size > 8000:
        errors.append(f"custom-gpt-setup.md: Instructions block is {size} chars (limit 8,000)")
    else:
        print(f"GPT Instructions block: {size} / 8000 chars")


def check_versions() -> None:
    pv = json.loads(PLUGIN.read_text())["version"]
    mk = json.loads(MARKET.read_text())
    mv = next(p["version"] for p in mk["plugins"] if p["name"] == "necx-outreach")
    if pv != mv:
        errors.append(f"version mismatch: plugin.json {pv} vs marketplace.json {mv}")


def main() -> int:
    for p in (PLAYBOOK, SKILL, VIDEO_SKILL, GPT):
        scan_banned(p)
    # our own files only: skip installed dependencies and render output
    for p in ROOT.rglob("*.md"):
        if not SKIP_DIRS.intersection(p.relative_to(ROOT).parts):
            scan_private(p)
    check_skill()
    check_gpt()
    check_versions()
    if errors:
        print("FAILED:")
        for e in errors:
            print("  -", e)
        return 1
    print("All checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
