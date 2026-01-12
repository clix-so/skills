#!/usr/bin/env bash
#
# Validate that a newly generated skill is installed at the same scope as this skill:
# it must live under the same parent "skills" directory as the installed `skill-creator`.
#
# Rationale:
# - If `skill-creator` is installed at project level (e.g. .cursor/skills/skill-creator),
#   the generated skill should also be project level (e.g. .cursor/skills/<new-skill>).
# - If `skill-creator` is installed at user/global level (e.g. ~/.cursor/skills/skill-creator),
#   the generated skill should also be user/global (e.g. ~/.cursor/skills/<new-skill>).
#
# Usage:
#   bash skills/skill-creator/scripts/validate-same-scope.sh <skill-creator-dir> <new-skill-dir>
#
set -euo pipefail

creator_dir="${1:-}"
new_skill_dir="${2:-}"

if [[ -z "$creator_dir" || -z "$new_skill_dir" ]]; then
  echo "Usage: bash skills/skill-creator/scripts/validate-same-scope.sh <skill-creator-dir> <new-skill-dir>" >&2
  exit 2
fi

if [[ ! -d "$creator_dir" ]]; then
  echo "Error: skill-creator directory not found: $creator_dir" >&2
  exit 2
fi

if [[ ! -d "$new_skill_dir" ]]; then
  echo "Error: new skill directory not found: $new_skill_dir" >&2
  exit 2
fi

creator_parent="$(dirname "$creator_dir")"
new_parent="$(dirname "$new_skill_dir")"

creator_parent_base="$(basename "$creator_parent")"
new_parent_base="$(basename "$new_parent")"

if [[ "$creator_parent_base" != "skills" && "$creator_parent_base" != "skill" && "$creator_parent_base" != ".skills" ]]; then
  echo "ERROR: skill-creator must live under a skills directory (skills/ or skill/ or .skills/)." >&2
  echo "  creator_dir: $creator_dir" >&2
  exit 1
fi

if [[ "$new_parent_base" != "skills" && "$new_parent_base" != "skill" && "$new_parent_base" != ".skills" ]]; then
  echo "ERROR: new skill must live under a skills directory (skills/ or skill/ or .skills/)." >&2
  echo "  new_skill_dir: $new_skill_dir" >&2
  exit 1
fi

if [[ "$creator_parent" != "$new_parent" ]]; then
  echo "ERROR: scope mismatch. Expected new skill to be installed next to skill-creator under the same skills directory." >&2
  echo "  skill_creator_parent: $creator_parent" >&2
  echo "  new_skill_parent:     $new_parent" >&2
  exit 1
fi

echo "OK: skill scope matches (same parent skills directory)"

