# Debugging Event Tracking

## Contents

- Quick triage
- Common causes
- Verification checklist

## Quick triage

1. Confirm `Clix.initialize(...)` is called before any tracking.
2. Confirm the event is fired exactly once (no render loops).
3. Confirm properties are primitive and non-null.
4. If using campaigns: confirm console trigger matches event name + property
   keys exactly.

## Common causes

- **Not initialized**: tracking called before init completes.
- **Duplicate events**: track call placed in render/recomposition or repeated
  listeners.
- **Bad property types**: objects/arrays, inconsistent types, nulls.
- **Mismatch with campaigns**: name/key mismatch, different casing.

## Verification checklist

- Add temporary logs around the tracking call (and remove after verification)
- Use a stable test flow to reproduce (single tap, single request)
- Verify in Clix console that events appear (and that campaigns fire when
  expected)
