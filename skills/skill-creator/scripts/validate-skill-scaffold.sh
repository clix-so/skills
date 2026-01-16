#!/usr/bin/env bash
#
# Validate a Clix Agent Skill scaffold (folder structure + frontmatter).
#
# Usage:
#   bash skills/skill-creator/scripts/validate-skill-scaffold.sh path/to/skill-folder
#
# Validates:
# - SKILL.md and LICENSE.txt exist
# - references/ and scripts/ exist and are non-empty
# - SKILL.md has YAML frontmatter with required keys
# - SKILL.md contains an MCP-first section that references `clix-mcp-server`
#
set -euo pipefail

skill_dir="${1:-}"
if [[ -z "$skill_dir" ]]; then
  echo "Usage: bash skills/skill-creator/scripts/validate-skill-scaffold.sh path/to/skill-folder" >&2
  exit 2
fi

if [[ ! -d "$skill_dir" ]]; then
  echo "Error: directory not found: $skill_dir" >&2
  exit 2
fi

validate_with_python() {
  python3 - "$skill_dir" <<'PY'
import os
import re
import sys

skill_dir = sys.argv[1]
skill_name = None

errors = []

def require_file(name: str):
  p = os.path.join(skill_dir, name)
  if not os.path.isfile(p):
    errors.append(f"missing required file: {name}")
  return p

def require_non_empty_dir(name: str):
  p = os.path.join(skill_dir, name)
  if not os.path.isdir(p):
    errors.append(f"missing required directory: {name}/")
    return
  entries = [e for e in os.listdir(p) if not e.startswith(".")]
  if len(entries) == 0:
    errors.append(f"required directory is empty: {name}/")

skill_md_path = require_file("SKILL.md")
require_file("LICENSE.txt")
require_non_empty_dir("references")
require_non_empty_dir("scripts")

frontmatter = None
try:
  with open(skill_md_path, "r", encoding="utf-8") as f:
    content = f.read()
except Exception as e:
  errors.append(f"failed to read SKILL.md: {e}")
  content = ""

m = re.match(r"^---\n([\s\S]*?)\n---\n", content)
if not m:
  errors.append("SKILL.md must start with YAML frontmatter delimited by ---")
else:
  frontmatter = m.group(1)
  # IMPORTANT: avoid substring false-positives:
  # - "display-name:" contains "name:"
  # - "short-description:" contains "description:"
  # So we must match keys at beginning-of-line only.
  def has_key(key: str) -> bool:
    return re.search(rf"^{re.escape(key)}\s*", frontmatter, re.M) is not None

  required_keys = [
    "name:",
    "display-name:",
    "short-description:",
    "description:",
    "user-invocable:",
  ]
  for k in required_keys:
    if not has_key(k):
      errors.append(f"frontmatter missing key: {k.rstrip(':')}")

  name_match = re.search(r"^name:\s*(.+)$", frontmatter, re.M)
  if name_match:
    skill_name = name_match.group(1).strip()

  inv_match = re.search(r"^user-invocable:\s*(.+)$", frontmatter, re.M)
  if inv_match:
    val = inv_match.group(1).strip().lower()
    if val not in ("true", "false"):
      errors.append("frontmatter user-invocable must be true or false")

if skill_name and skill_name.startswith("clix-"):
  if "clix-mcp-server" not in content:
    errors.append("SKILL.md must reference 'clix-mcp-server' (MCP-first requirement)")

if errors:
  print("ERROR: skill scaffold validation failed:")
  for e in errors:
    print(f"- {e}")
  sys.exit(1)

print("OK: skill scaffold validation passed")
PY
}

if command -v python3 >/dev/null 2>&1; then
  validate_with_python
  exit 0
fi

echo "Warning: python3 not found; falling back to basic checks with node if available." >&2
if command -v node >/dev/null 2>&1; then
  node - "$skill_dir" <<'NODE'
const fs = require("fs");
const path = require("path");

const skillDir = process.argv[1];
const errors = [];

function hasFrontmatterKey(frontmatter, key) {
  // Match key at beginning of line only (avoid substring collisions):
  // - "display-name:" contains "name:"
  // - "short-description:" contains "description:"
  const re = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "m");
  return re.test(frontmatter);
}

function requireFile(name) {
  const p = path.join(skillDir, name);
  if (!fs.existsSync(p) || !fs.statSync(p).isFile()) errors.push(`missing required file: ${name}`);
  return p;
}

function requireNonEmptyDir(name) {
  const p = path.join(skillDir, name);
  if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) {
    errors.push(`missing required directory: ${name}/`);
    return;
  }
  const entries = fs.readdirSync(p).filter((e) => !e.startsWith("."));
  if (entries.length === 0) errors.push(`required directory is empty: ${name}/`);
}

const skillMd = requireFile("SKILL.md");
requireFile("LICENSE.txt");
requireNonEmptyDir("references");
requireNonEmptyDir("scripts");

let content = "";
try {
  content = fs.readFileSync(skillMd, "utf8");
} catch (e) {
  errors.push(`failed to read SKILL.md: ${String(e)}`);
}

let skillName = null;

// Frontmatter validation (best-effort; mirrors Python validator behavior).
if (!content.startsWith("---\n")) {
  errors.push("SKILL.md must start with YAML frontmatter (---)");
} else {
  const m = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) {
    errors.push("SKILL.md must start with YAML frontmatter delimited by ---");
  } else {
    const frontmatter = m[1];
    const required = ["name:", "display-name:", "short-description:", "description:", "user-invocable:"];
    for (const k of required) {
      if (!hasFrontmatterKey(frontmatter, k)) {
        errors.push(`frontmatter missing key: ${k.replace(/:$/, "")}`);
      }
    }

    const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
    if (nameMatch) {
      skillName = (nameMatch[1] || "").trim();
    }

    const invMatch = frontmatter.match(/^user-invocable:\s*(.+)$/m);
    if (invMatch) {
      const val = (invMatch[1] || "").trim().toLowerCase();
      if (!["true", "false"].includes(val)) errors.push("frontmatter user-invocable must be true or false");
    }
  }
}
if (skillName && skillName.startsWith("clix-")) {
  if (!content.includes("clix-mcp-server")) {
    errors.push("SKILL.md must reference 'clix-mcp-server'");
  }
}

if (errors.length) {
  console.log("ERROR: skill scaffold validation failed:");
  for (const e of errors) console.log(`- ${e}`);
  process.exit(1);
}

console.log("OK: skill scaffold validation passed");
NODE
  exit 0
fi

echo "Error: neither python3 nor node found; cannot validate." >&2
exit 2

