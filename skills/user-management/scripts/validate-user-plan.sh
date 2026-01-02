#!/usr/bin/env bash
#
# Validate a Clix user management plan (user-plan.json).
#
# Usage:
#   bash skills/user-management/scripts/validate-user-plan.sh path/to/user-plan.json
#
set -euo pipefail

plan_path="${1:-}"
if [[ -z "$plan_path" ]]; then
  echo "Usage: bash skills/user-management/scripts/validate-user-plan.sh path/to/user-plan.json" >&2
  exit 2
fi

if [[ ! -f "$plan_path" ]]; then
  echo "Error: file not found: $plan_path" >&2
  exit 2
fi

validate_with_python() {
  python3 - "$plan_path" <<'PY'
import json
import re
import sys

path = sys.argv[1]
snake = re.compile(r"^[a-z][a-z0-9_]*$")

with open(path, "r", encoding="utf-8") as f:
  data = json.load(f)

errors = []

logout_policy = data.get("logout_policy")
if logout_policy not in (None, "do_not_set_user_id_null"):
  errors.append("logout_policy must be 'do_not_set_user_id_null' if present")

user_id = data.get("user_id")
if not isinstance(user_id, dict):
  errors.append("user_id must be an object")
else:
  src = user_id.get("source")
  ex = user_id.get("example")
  if not isinstance(src, str) or not src.strip():
    errors.append("user_id.source must be a non-empty string")
  if ex is not None and (not isinstance(ex, str) or not ex.strip()):
    errors.append("user_id.example must be a non-empty string if present")

props = data.get("properties")
if not isinstance(props, dict) or not props:
  errors.append("properties must be a non-empty object")
else:
  for key, spec in props.items():
    if not isinstance(key, str) or not snake.match(key):
      errors.append(f"properties key '{key}' must be snake_case")
      continue
    if not isinstance(spec, dict):
      errors.append(f"properties['{key}'] must be an object")
      continue
    t = spec.get("type")
    if t is None:
      errors.append(f"properties['{key}'].type is required")
    elif t not in ("string", "number", "boolean"):
      errors.append(f"properties['{key}'].type must be one of: string, number, boolean")
    req = spec.get("required")
    if req is not None and not isinstance(req, bool):
      errors.append(f"properties['{key}'].required must be boolean if present")

if errors:
  print("user-plan validation failed:")
  for e in errors:
    print(f"- {e}")
  sys.exit(1)

print("user-plan validation passed")
PY
}

if command -v python3 >/dev/null 2>&1; then
  validate_with_python
  exit 0
fi

echo "Warning: python3 not found; only checking JSON validity with node if available." >&2
if command -v node >/dev/null 2>&1; then
  node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')); console.log('JSON is valid');" "$plan_path"
  exit 0
fi

echo "Error: neither python3 nor node found; cannot validate." >&2
exit 2

