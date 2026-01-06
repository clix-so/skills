#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Validate a Clix personalization template (Liquid-style) with lightweight checks.

Usage:
  validate-template.sh <template-file>

Checks:
  - Balanced {{ ... }} and {% ... %} delimiters
  - Properly nested {% if %}/{% endif %} and {% for %}/{% endfor %} blocks

Notes:
  - This is a best-effort validator; it cannot guarantee that variables exist.
  - If Clix shows a rendering error, always trust Message Logs as the source of truth.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" || "${1:-}" == "" ]]; then
  usage
  exit 0
fi

file="$1"

if [[ ! -f "$file" ]]; then
  echo "Error: file not found: $file" >&2
  exit 2
fi

errors=0

echo "Validating: $file"

brace_counts="$(
  awk '
    {
      c_open_curly += gsub(/\{\{/, "&");
      c_close_curly += gsub(/\}\}/, "&");
      c_open_tag += gsub(/\{%/, "&");
      c_close_tag += gsub(/%\}/, "&");
    }
    END {
      printf("%d %d %d %d\n", c_open_curly, c_close_curly, c_open_tag, c_close_tag);
    }
  ' "$file"
)"

read -r open_curly close_curly open_tag close_tag <<<"$brace_counts"

if [[ "$open_curly" -ne "$close_curly" ]]; then
  echo "Error: unbalanced mustache braces: '{{'=$open_curly vs '}}'=$close_curly" >&2
  errors=$((errors + 1))
fi

if [[ "$open_tag" -ne "$close_tag" ]]; then
  echo "Error: unbalanced tag braces: '{%'=$open_tag vs '%}'=$close_tag" >&2
  errors=$((errors + 1))
fi

awk_exit=0
awk '
  function trim(s) { sub(/^[ \t\r\n]+/, "", s); sub(/[ \t\r\n]+$/, "", s); return s }
  function push(x) { stack[++sp] = x }
  function top() { return stack[sp] }
  function pop() { if (sp > 0) return stack[sp--]; return "" }

  BEGIN { sp = 0; errors = 0 }

  {
    line = $0
    while (match(line, /\{%[ \t]*[^%]*%\}/)) {
      tag = substr(line, RSTART, RLENGTH)
      inner = tag
      gsub(/^\{%[ \t]*/, "", inner)
      gsub(/[ \t]*%\}$/, "", inner)
      inner = trim(inner)

      # Tag name is first token.
      split(inner, parts, /[ \t]+/)
      name = parts[1]

      if (name == "if") {
        push("if")
      } else if (name == "for") {
        push("for")
      } else if (name == "endif") {
        if (top() != "if") {
          printf("Error: found endif but top of stack is '%s'\n", top()) > "/dev/stderr"
          errors++
        } else {
          pop()
        }
      } else if (name == "endfor") {
        if (top() != "for") {
          printf("Error: found endfor but top of stack is '%s'\n", top()) > "/dev/stderr"
          errors++
        } else {
          pop()
        }
      } else if (name == "else" || name == "elsif") {
        if (top() != "if") {
          printf("Error: found %s outside of if block\n", name) > "/dev/stderr"
          errors++
        }
      }

      # Move forward in line after the matched tag.
      line = substr(line, RSTART + RLENGTH)
    }
  }

  END {
    if (sp > 0) {
      printf("Error: unclosed blocks remaining on stack (count=%d)\n", sp) > "/dev/stderr"
      errors++
    }
    exit(errors > 0 ? 1 : 0)
  }
' "$file" || awk_exit=$?

if [[ "$awk_exit" -ne 0 ]]; then
  errors=$((errors + 1))
fi

if [[ "$errors" -ne 0 ]]; then
  echo "❌ Validation failed ($errors issue(s))." >&2
  exit 1
fi

echo "✅ Template structure looks OK."

