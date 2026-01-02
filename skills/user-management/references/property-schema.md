# User Property Schema + PII Guardrails

## Contents

- Naming rules
- Allowed types
- PII guardrails
- User Plan template

## Naming rules

- **Property keys**: `snake_case` recommended.
- Prefer stable keys that won’t be renamed every sprint.

## Allowed types

- `string`
- `number`
- `boolean`

If you must send complex objects: stringify intentionally and document it.

## PII guardrails

Default stance: **do not store PII in user properties** unless explicitly
approved.

Common PII/sensitive values to avoid:

- email, phone number, full name
- free-text fields (notes, messages)
- government IDs, payment card details

Prefer stable internal IDs:

- `user_id` (your system’s id) instead of email/phone

## User Plan template

Create `.clix/user-plan.json` (recommended) or `user-plan.json` in project root:

```json
{
  "conventions": {
    "property_key_case": "snake_case"
  },
  "pii": {
    "allowed": [],
    "blocked": ["email", "phone", "name", "free_text"]
  },
  "user_id": {
    "source": "auth response",
    "example": "user_12345"
  },
  "logout_policy": "do_not_set_user_id_null",
  "properties": {
    "subscription_tier": { "type": "string", "required": false },
    "premium": { "type": "boolean", "required": false },
    "age": { "type": "number", "required": false }
  }
}
```

**Note**: The validation script validates `logout_policy`, `user_id`, and
`properties`. The `conventions` and `pii` fields are optional metadata.
