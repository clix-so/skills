#!/usr/bin/env bash
#
# Generate a permission UX audit report template.
#
# Usage:
#   bash skills/permission-settings-ux-auditor/scripts/generate-permission-ux-audit-report.sh path/to/report.md
#
set -euo pipefail

output_path="${1:-}"
if [[ -z "$output_path" ]]; then
  echo "Usage: bash skills/permission-settings-ux-auditor/scripts/generate-permission-ux-audit-report.sh path/to/report.md" >&2
  exit 2
fi

cat >"$output_path" <<'MD'
# Permission Settings UX Audit

## Scope
- Platforms:
- Entry points:
- Current prompt timing:
- Primer present:
- Settings path:

## Findings

### 1) Finding title
- **Issue**:
- **Impact**:
- **Recommendation**:
- **Platform notes**:

### 2) Finding title
- **Issue**:
- **Impact**:
- **Recommendation**:
- **Platform notes**:

## Fix checklist
- [ ] Update prompt timing to match a user action
- [ ] Add or improve in-app primer copy
- [ ] Add clear settings path for denied users
- [ ] Validate denial handling and fallback UX
MD

echo "Report template written to: $output_path"
