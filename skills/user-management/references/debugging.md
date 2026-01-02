# Debugging User Management

## Contents

- Quick triage
- Common causes
- Verification checklist

## Quick triage

1. Confirm `Clix.initialize(...)` is called before user operations.
2. Confirm `setUserId(...)` is called only after login success.
3. Confirm logout does **not** call `setUserId(null)`.
4. Confirm user properties are primitives and stable.

## Common causes

- **Not initialized**: calls before init completes.
- **Wrong timing**: calling `setUserId` before auth success.
- **Bad property values**: objects/arrays, inconsistent types.
- **PII leakage**: sending email/phone/name.

## Verification checklist

- Add temporary logs around login success and user calls (remove after).
- Verify in Clix dashboard:
  - user id shows as expected
  - properties appear and are filterable
  - message templates can resolve `user.*`
