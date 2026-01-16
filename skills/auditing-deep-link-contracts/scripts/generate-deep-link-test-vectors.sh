#!/usr/bin/env bash
#
# Generate deep link test vectors from a contract JSON.
#
# Usage:
#   bash skills/auditing-deep-link-contracts/scripts/generate-deep-link-test-vectors.sh \
#     path/to/deep-link-contract.json \
#     path/to/deep-link-test-vectors.json
#
set -euo pipefail

contract_path="${1:-}"
output_path="${2:-}"

if [[ -z "$contract_path" || -z "$output_path" ]]; then
  echo "Usage: bash skills/auditing-deep-link-contracts/scripts/generate-deep-link-test-vectors.sh path/to/deep-link-contract.json path/to/deep-link-test-vectors.json" >&2
  exit 2
fi

if [[ ! -f "$contract_path" ]]; then
  echo "Error: contract file not found: $contract_path" >&2
  exit 2
fi

python3 - "$contract_path" "$output_path" <<'PY'
import json
import sys
from urllib.parse import urlencode

contract_path = sys.argv[1]
output_path = sys.argv[2]

with open(contract_path, "r", encoding="utf-8") as f:
  data = json.load(f)

base = data.get("base", "").rstrip("/")
routes = data.get("routes", [])

def build_path(path_template, params):
  path = path_template
  for key, value in params.items():
    path = path.replace("{" + key + "}", value)
  return path

test_vectors = []

for route in routes:
  name = route.get("name", "route")
  path_template = route.get("path", "/")
  required = route.get("required_params", [])
  optional = route.get("optional_params", [])
  auth_required = bool(route.get("auth_required", False))
  states = route.get("supported_states", ["cold", "warm"])

  required_values = {k: f"sample_{k}" for k in required}
  optional_values = {k: f"sample_{k}" for k in optional}

  # Valid minimal
  url = base + build_path(path_template, required_values)
  test_vectors.append({
    "name": f"{name}_valid_minimal",
    "url": url,
    "state": "cold",
    "auth": "logged_in",
    "expected": "open_target_screen"
  })

  # Valid with optional params
  if optional_values:
    url_with_optional = url + "?" + urlencode(optional_values)
    test_vectors.append({
      "name": f"{name}_valid_with_optional",
      "url": url_with_optional,
      "state": "warm",
      "auth": "logged_in",
      "expected": "open_target_screen"
    })

  # Missing required param
  if required:
    missing_params = required_values.copy()
    missing_params.pop(required[0], None)
    url_missing = base + build_path(path_template, missing_params)
    test_vectors.append({
      "name": f"{name}_missing_required",
      "url": url_missing,
      "state": "cold",
      "auth": "logged_in",
      "expected": "fallback_or_error"
    })

  # Logged out behavior
  if auth_required:
    url_auth = url
    test_vectors.append({
      "name": f"{name}_logged_out",
      "url": url_auth,
      "state": "warm",
      "auth": "logged_out",
      "expected": "login_or_fallback"
    })

  # State coverage
  for state in states:
    test_vectors.append({
      "name": f"{name}_state_{state}",
      "url": url,
      "state": state,
      "auth": "logged_in",
      "expected": "open_target_screen"
    })

with open(output_path, "w", encoding="utf-8") as f:
  json.dump({"vectors": test_vectors}, f, indent=2)

print(f"Wrote {len(test_vectors)} test vectors to {output_path}")
PY
