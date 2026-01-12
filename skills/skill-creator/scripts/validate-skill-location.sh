#!/usr/bin/env bash
#
# Validate that a generated skill folder is placed in the correct "skills" directory.
#
# Usage:
#   bash skills/skill-creator/scripts/validate-skill-location.sh <skill-folder> [--mode repo|client] [--client <name>]
#
# Modes:
# - repo  : expects the skill folder to live under: skills/<skill-folder-name>/
# - client: expects the skill folder to live under a client skills directory:
#           (.*)/skills/<skill-folder-name>/  OR  (.*)/skill/<skill-folder-name>/ (OpenCode)
#
# If --client is provided in client mode, this script will also check that the path
# contains the expected client directory segment (best-effort).
#
set -euo pipefail

skill_dir="${1:-}"
mode="repo"
client=""

shift || true
while [[ "${1:-}" != "" ]]; do
  case "$1" in
    --mode)
      if [[ -z "${2:-}" || "${2:-}" == "-"* ]]; then
        echo "Error: --mode requires a value" >&2
        exit 2
      fi
      mode="${2:-}"
      shift 2
      ;;
    --client)
      if [[ -z "${2:-}" || "${2:-}" == "-"* ]]; then
        echo "Error: --client requires a value" >&2
        exit 2
      fi
      client="${2:-}"
      shift 2
      ;;
    -h|--help)
      cat <<'EOF'
Validate skill folder location.

Usage:
  bash skills/skill-creator/scripts/validate-skill-location.sh <skill-folder> [--mode repo|client] [--client <name>]

Examples:
  bash skills/skill-creator/scripts/validate-skill-location.sh skills/personalization --mode repo
  bash skills/skill-creator/scripts/validate-skill-location.sh .cursor/skills/personalization --mode client --client cursor
EOF
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$skill_dir" ]]; then
  echo "Error: missing <skill-folder> argument" >&2
  exit 2
fi

if [[ ! -d "$skill_dir" ]]; then
  echo "Error: directory not found: $skill_dir" >&2
  exit 2
fi

skills_parent="$(basename "$(dirname "$skill_dir")")"

case "$mode" in
  repo)
    if [[ "$skills_parent" != "skills" ]]; then
      echo "ERROR: Invalid location: expected skill folder under 'skills/<name>/' but got parent '$skills_parent'." >&2
      echo "   Path: $skill_dir" >&2
      exit 1
    fi
    ;;
  client)
    # Client installs usually use "skills/" (most clients), "skill/" (OpenCode),
    # or ".skills/" (Letta).
    if [[ "$skills_parent" != "skills" && "$skills_parent" != "skill" && "$skills_parent" != ".skills" ]]; then
      echo "ERROR: Invalid location: expected skill folder under '<client>/(skills|skill|.skills)/<name>/' but got parent '$skills_parent'." >&2
      echo "   Path: $skill_dir" >&2
      exit 1
    fi

    if [[ -n "$client" ]]; then
      # Best-effort path segment checks (not exhaustive, but catches common mistakes).
      case "${client,,}" in
        cursor)
          [[ "$skill_dir" == *"/.cursor/skills/"* || "$skill_dir" == ".cursor/skills/"* ]] || {
            echo "ERROR: Expected Cursor skill path to include '.cursor/skills/'" >&2
            echo "   Path: $skill_dir" >&2
            exit 1
          }
          ;;
        claude|claude-code)
          [[ "$skill_dir" == *"/.claude/skills/"* || "$skill_dir" == ".claude/skills/"* ]] || {
            echo "ERROR: Expected Claude skill path to include '.claude/skills/'" >&2
            echo "   Path: $skill_dir" >&2
            exit 1
          }
          ;;
        codex)
          [[ "$skill_dir" == *"/.codex/skills/"* || "$skill_dir" == ".codex/skills/"* ]] || {
            echo "ERROR: Expected Codex skill path to include '.codex/skills/'" >&2
            echo "   Path: $skill_dir" >&2
            exit 1
          }
          ;;
        opencode)
          [[ "$skill_dir" == *"/.opencode/skill/"* || "$skill_dir" == ".opencode/skill/"* ]] || {
            echo "ERROR: Expected OpenCode skill path to include '.opencode/skill/'" >&2
            echo "   Path: $skill_dir" >&2
            exit 1
          }
          # OpenCode uses singular "skill", reject "skills" for this client.
          [[ "$skill_dir" != *"/.opencode/skills/"* && "$skill_dir" != ".opencode/skills/"* ]] || {
            echo "ERROR: Expected OpenCode skill path to include '.opencode/skill/' (singular), not '.opencode/skills/'" >&2
            echo "   Path: $skill_dir" >&2
            exit 1
          }
          ;;
        vscode)
          [[ "$skill_dir" == *"/.vscode/skills/"* || "$skill_dir" == ".vscode/skills/"* ]] || {
            echo "ERROR: Expected VS Code skill path to include '.vscode/skills/'" >&2
            echo "   Path: $skill_dir" >&2
            exit 1
          }
          ;;
        amp)
          [[ "$skill_dir" == *"/.amp/skills/"* || "$skill_dir" == ".amp/skills/"* ]] || {
            echo "ERROR: Expected Amp skill path to include '.amp/skills/'" >&2
            echo "   Path: $skill_dir" >&2
            exit 1
          }
          ;;
        goose)
          [[ "$skill_dir" == *"/.goose/skills/"* || "$skill_dir" == ".goose/skills/"* ]] || {
            echo "ERROR: Expected Goose skill path to include '.goose/skills/'" >&2
            echo "   Path: $skill_dir" >&2
            exit 1
          }
          ;;
        github|copilot)
          [[ "$skill_dir" == *"/.github/skills/"* || "$skill_dir" == ".github/skills/"* ]] || {
            echo "ERROR: Expected GitHub Copilot skill path to include '.github/skills/'" >&2
            echo "   Path: $skill_dir" >&2
            exit 1
          }
          ;;
        gemini)
          [[ "$skill_dir" == *"/.gemini/skills/"* || "$skill_dir" == ".gemini/skills/"* ]] || {
            echo "ERROR: Expected Gemini skill path to include '.gemini/skills/'" >&2
            echo "   Path: $skill_dir" >&2
            exit 1
          }
          ;;
        kiro)
          [[ "$skill_dir" == *"/.kiro/skills/"* || "$skill_dir" == ".kiro/skills/"* ]] || {
            echo "ERROR: Expected Kiro skill path to include '.kiro/skills/'" >&2
            echo "   Path: $skill_dir" >&2
            exit 1
          }
          ;;
        amazonq)
          [[ "$skill_dir" == *"/.amazonq/skills/"* || "$skill_dir" == ".amazonq/skills/"* ]] || {
            echo "ERROR: Expected AmazonQ skill path to include '.amazonq/skills/'" >&2
            echo "   Path: $skill_dir" >&2
            exit 1
          }
          ;;
        letta)
          # Letta uses a root-level `.skills/` directory.
          [[ "$skill_dir" == *"/.skills/"* || "$skill_dir" == ".skills/"* ]] || {
            echo "ERROR: Expected Letta skill path to include '.skills/'" >&2
            echo "   Path: $skill_dir" >&2
            exit 1
          }
          ;;
        *)
          # Unknown client; skip strict segment check.
          ;;
      esac
    fi
    ;;
  *)
    echo "Error: --mode must be 'repo' or 'client' (got '$mode')" >&2
    exit 2
    ;;
esac

echo "OK: skill location looks OK ($mode)"

