# Implementation Patterns

## Contents

- When to call setUserId
- When to remove user id
- Property update patterns
- Error handling

## When to call setUserId

Call `setUserId(userId)`:

- after login/signup succeeds (not on button tap)
- after you have a stable identifier (prefer internal user id)
- ideally once per session change (dedupe repeated calls)

## When to remove user id

Prefer the docs-recommended logout behavior:

- On logout: **do nothing with Clix**.

Only use `removeUserId()` if you have a strong reason and you understand the
impact on shared devices and re-engagement.

## Property update patterns

- Set properties from controlled sources (backend flags, billing state).
- Use small, stable values (enums/known strings).
- Avoid frequent writes in tight loops.

## Error handling

- Treat user management operations as potentially failing:
  - wrap async calls in try/catch
  - log enough context to debug (user id, property keys—not values if sensitive)
