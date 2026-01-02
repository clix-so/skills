#!/usr/bin/env bash
#
# Validate a Clix event tracking plan (event-plan.json).
#
# Usage:
#   bash skills/event-tracking/scripts/validate-event-plan.sh path/to/event-plan.json
#
# What it validates:
# - JSON is valid
# - event names and property keys are snake_case
# - required fields exist (name/when/purpose/properties)
#
set -euo pipefail

plan_path="${1:-}"
if [[ -z "$plan_path" ]]; then
  echo "Usage: bash skills/event-tracking/scripts/validate-event-plan.sh path/to/event-plan.json" >&2
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

events = data.get("events")
if not isinstance(events, list) or not events:
  errors.append("events must be a non-empty array")
else:
  seen_names = set()
  for i, ev in enumerate(events):
    name = ev.get("name")
    if not isinstance(name, str) or not snake.match(name):
      errors.append(f"events[{i}].name must be snake_case string")
    elif name in seen_names:
      errors.append(f"events[{i}].name is duplicated: '{name}'")
    else:
      seen_names.add(name)

    when = ev.get("when")
    if not isinstance(when, str) or not when.strip():
      errors.append(f"events[{i}].when must be a non-empty string")

    purpose = ev.get("purpose")
    if not isinstance(purpose, list) or not purpose:
      errors.append(f"events[{i}].purpose must be a non-empty array")
    else:
      allowed = {"analytics", "campaigns"}
      bad = [p for p in purpose if not isinstance(p, str) or p not in allowed]
      if bad:
        errors.append(
          f"events[{i}].purpose entries must be one of: analytics, campaigns"
        )

    props = ev.get("properties", {})
    if props is None:
      props = {}
    if not isinstance(props, dict):
      errors.append(f"events[{i}].properties must be an object")
    else:
      for key, spec in props.items():
        if not isinstance(key, str) or not snake.match(key):
          errors.append(f"events[{i}].properties key '{key}' must be snake_case")
        if not isinstance(spec, dict):
          errors.append(f"events[{i}].properties['{key}'] must be an object")
          continue
        t = spec.get("type")
        if t not in ("string", "number", "boolean", "datetime"):
          errors.append(
            f"events[{i}].properties['{key}'].type must be one of: string, number, boolean, datetime"
          )
        req = spec.get("required")
        if req is not None and not isinstance(req, bool):
          errors.append(f"events[{i}].properties['{key}'].required must be boolean if present")

if errors:
  print("❌ event-plan validation failed:")
  for e in errors:
    print(f"- {e}")
  sys.exit(1)

print("✅ event-plan validation passed")
PY
}

if command -v python3 >/dev/null 2>&1; then
  validate_with_python
  exit 0
fi

echo "Warning: python3 not found; only checking JSON validity with node if available." >&2
if command -v node >/dev/null 2>&1; then
  node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')); console.log('✅ JSON is valid');" "$plan_path"
  exit 0
fi

echo "Error: neither python3 nor node found; cannot validate." >&2
exit 2

