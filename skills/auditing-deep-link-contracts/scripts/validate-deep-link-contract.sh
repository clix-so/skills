#!/usr/bin/env bash
#
# Validate a deep link contract JSON file.
#
# Usage:
#   bash skills/auditing-deep-link-contracts/scripts/validate-deep-link-contract.sh \
#     path/to/deep-link-contract.json
#
set -euo pipefail

contract_path="${1:-}"
if [[ -z "$contract_path" ]]; then
  echo "Usage: bash skills/auditing-deep-link-contracts/scripts/validate-deep-link-contract.sh path/to/deep-link-contract.json" >&2
  exit 2
fi

if [[ ! -f "$contract_path" ]]; then
  echo "Error: contract file not found: $contract_path" >&2
  exit 2
fi

python3 - "$contract_path" <<'PY'
import json
import sys

path = sys.argv[1]

with open(path, "r", encoding="utf-8") as f:
  data = json.load(f)

errors = []

base = data.get("base")
routes = data.get("routes")

if not isinstance(base, str) or not base.strip():
  errors.append("base must be a non-empty string")

if not isinstance(routes, list) or not routes:
  errors.append("routes must be a non-empty array")
else:
  seen_names = set()
  for i, route in enumerate(routes):
    if not isinstance(route, dict):
      errors.append(f"routes[{i}] must be an object")
      continue

    name = route.get("name")
    if not isinstance(name, str) or not name.strip():
      errors.append(f"routes[{i}].name must be a non-empty string")
    elif name in seen_names:
      errors.append(f"routes[{i}].name is duplicated: '{name}'")
    else:
      seen_names.add(name)

    path_template = route.get("path")
    if not isinstance(path_template, str) or not path_template.strip():
      errors.append(f"routes[{i}].path must be a non-empty string")

    required = route.get("required_params", [])
    optional = route.get("optional_params", [])
    if required is None:
      required = []
    if optional is None:
      optional = []
    if not isinstance(required, list):
      errors.append(f"routes[{i}].required_params must be an array")
    if not isinstance(optional, list):
      errors.append(f"routes[{i}].optional_params must be an array")

    auth_required = route.get("auth_required")
    if auth_required is not None and not isinstance(auth_required, bool):
      errors.append(f"routes[{i}].auth_required must be boolean if present")

    states = route.get("supported_states", ["cold", "warm"])
    if not isinstance(states, list) or not states:
      errors.append(f"routes[{i}].supported_states must be a non-empty array")
    else:
      bad = [s for s in states if s not in ("cold", "warm")]
      if bad:
        errors.append(f"routes[{i}].supported_states must be ['cold','warm']")

if errors:
  print("Validation failed:")
  for e in errors:
    print(f"- {e}")
  sys.exit(1)

print("Validation passed")
PY
