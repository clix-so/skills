#!/usr/bin/env bash
#
# Generate llms.txt for Clix Agent Skills
#
# Scans the skills directory and generates a comprehensive llms.txt file
# with all skill files indexed for semantic search.
#
# Usage: ./scripts/generate-llms.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/skills"
OUTPUT="$REPO_ROOT/llms.txt"
BASE_URL="https://raw.githubusercontent.com/clix-so/skills/refs/heads/main/skills"

# Convert kebab-case filename to Title Case
title_case() {
  local name="${1%.*}" # remove extension
  echo "$name" | tr '-' ' ' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1'
}

# Extract 'name:' from SKILL.md YAML frontmatter
extract_skill_name() {
  local file="$1"
  awk '/^---$/{n++; next} n==1 && /^name:/{sub(/^name:[[:space:]]*/, ""); print; exit}' "$file"
}

# Start output
{
  echo "<!-- Clix Agent Skills llms.txt -->"
  echo ""
  echo "# Clix Agent Skills"
  echo ""
  echo "This file contains a comprehensive index of all Clix Agent Skills files."
  echo "Each entry includes the file path, type, and description for semantic search."
  echo ""
  echo "---"
  echo ""

  # Process each skill directory (sorted)
  for skill_dir in "$SKILLS_DIR"/*/; do
    [ -d "$skill_dir" ] || continue
    skill_name="$(basename "$skill_dir")"
    skill_md="$skill_dir/SKILL.md"

    [ -f "$skill_md" ] || continue

    # Skill header
    display_name="$(extract_skill_name "$skill_md")"
    [ -z "$display_name" ] && display_name="$skill_name"

    echo "## $display_name"
    echo ""
    echo "- [$display_name]($BASE_URL/$skill_name/SKILL.md): Main skill documentation"
    echo ""

    # References
    if [ -d "$skill_dir/references" ]; then
      refs=()
      while IFS= read -r -d '' f; do
        refs+=("$f")
      done < <(find "$skill_dir/references" -name '*.md' -print0 | sort -z)
      if [ ${#refs[@]} -gt 0 ]; then
        echo "### References"
        echo ""
        for f in "${refs[@]}"; do
          rel_path="${f#"$skill_dir/"}"
          fname="$(basename "$f")"
          title="$(title_case "$fname") (Reference)"
          echo "- [$title]($BASE_URL/$skill_name/$rel_path): Reference documentation for $skill_name skill"
        done
        echo ""
      fi
    fi

    # Examples
    if [ -d "$skill_dir/examples" ]; then
      examples=()
      while IFS= read -r -d '' f; do
        examples+=("$f")
      done < <(find "$skill_dir/examples" -type f -print0 | sort -z)
      if [ ${#examples[@]} -gt 0 ]; then
        echo "### Examples"
        echo ""
        for f in "${examples[@]}"; do
          rel_path="${f#"$skill_dir/"}"
          fname="$(basename "$f")"
          title="$(title_case "$fname") (Example)"
          echo "- [$title]($BASE_URL/$skill_name/$rel_path): Code example for $skill_name skill"
        done
        echo ""
      fi
    fi

    # Scripts
    if [ -d "$skill_dir/scripts" ]; then
      scripts=()
      while IFS= read -r -d '' f; do
        scripts+=("$f")
      done < <(find "$skill_dir/scripts" -type f -print0 | sort -z)
      if [ ${#scripts[@]} -gt 0 ]; then
        echo "### Scripts"
        echo ""
        for f in "${scripts[@]}"; do
          rel_path="${f#"$skill_dir/"}"
          fname="$(basename "$f")"
          title="$(title_case "$fname") (Script)"
          echo "- [$title]($BASE_URL/$skill_name/$rel_path): Utility script for $skill_name skill"
        done
        echo ""
      fi
    fi

    # Rules
    if [ -d "$skill_dir/rules" ]; then
      rules=()
      while IFS= read -r -d '' f; do
        rules+=("$f")
      done < <(find "$skill_dir/rules" -name '*.md' -print0 | sort -z)
      if [ ${#rules[@]} -gt 0 ]; then
        echo "### Rules"
        echo ""
        for f in "${rules[@]}"; do
          rel_path="${f#"$skill_dir/"}"
          fname="$(basename "$f")"
          title="$(title_case "$fname") (Rule)"
          echo "- [$title]($BASE_URL/$skill_name/$rel_path): Rule for $skill_name skill"
        done
        echo ""
      fi
    fi

    echo "---"
    echo ""
  done
} > "$OUTPUT"

skill_count=$(find "$SKILLS_DIR" -maxdepth 1 -mindepth 1 -type d | wc -l | tr -d ' ')
file_count=$(grep -c '^\- \[' "$OUTPUT" || true)

echo "Generated llms.txt at: $OUTPUT"
echo "  Skills: $skill_count"
echo "  Files: $file_count"
