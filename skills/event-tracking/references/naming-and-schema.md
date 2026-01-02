# Naming and Schema

## Contents

- Naming rules
- Property rules
- Privacy / PII guardrails
- Event Plan template

## Naming rules

- **Event names**: `snake_case` (recommended)
  - Good: `signup_completed`, `purchase_completed`, `screen_viewed`
  - Avoid: spaces, mixed casing, unstable suffixes (timestamps, random IDs)
- **Property keys**: also `snake_case`
  - Good: `screen_name`, `payment_method`
  - Avoid: `camelCase` mixed with `snake_case` in the same project

## Property rules

- Prefer JSON primitives:
  - `string`, `number`, `boolean`
- Datetimes:
  - Prefer ISO 8601 strings or native date types supported by the platform SDK
- Avoid:
  - `null` (inconsistent across platforms)
  - nested objects/arrays unless you intentionally stringify them

## Privacy / PII guardrails

Default stance: **do not track PII** unless the user explicitly approves.

## Event Plan template

Create `event-plan.json` in `.clix/` directory (recommended) or project root:

**Recommended**: `.clix/event-plan.json` (organized, hidden, committable)
**Alternative**: `event-plan.json` in project root (simpler)

```json
{
  "conventions": {
    "event_name_case": "snake_case",
    "property_key_case": "snake_case"
  },
  "pii": {
    "allowed": [],
    "blocked": ["email", "phone", "name", "free_text"]
  },
  "events": [
    {
      "name": "signup_completed",
      "when": "after backend confirms account creation",
      "purpose": ["analytics", "campaigns"],
      "properties": {
        "method": { "type": "string", "required": true },
        "trial_days": { "type": "number", "required": false }
      }
    }
  ]
}
```

**Note**: The `conventions` and `pii` fields are optional metadata for
documentation purposes. The validation script only validates the `events` array
structure. These fields help document your team's naming conventions and PII
policies but are not enforced by the validator.
