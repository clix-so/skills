# Personalization + Audience Mapping

## Contents

- How user properties are used
- Personalization (`user.*`)
- Audience filters
- Common mistakes

## How user properties are used

User properties power:

- **Message personalization** via `user.*`
- **Audience targeting** (filters on user/custom attributes)

## Personalization (`user.*`)

Use `user.*` variables in templates to personalize message content and links.
Missing values render as empty string.

## Audience filters

Audience builder can filter on:

- user id
- built-in attributes (like last session)
- custom attributes (your user properties)

## Common mistakes

- Storing PII (email/phone/name) as user properties by default.
- Sending inconsistent types for the same property (e.g., `"25"` vs `25`).
- Renaming keys without migrating campaign filters.
