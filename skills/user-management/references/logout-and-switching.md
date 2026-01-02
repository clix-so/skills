# Logout and User Switching

## Contents

- Golden rule
- Recommended patterns
- What to avoid

## Golden rule

**Do not call `setUserId(null)` on logout.**

Instead:

- On logout: do nothing with Clix (only clear your app session).
- On next login: call `setUserId(newUserId)` to switch profiles.

## Recommended patterns

- **Login success boundary**:
  - after auth succeeds (and you have a stable user id)
  - after tokens/session are stored (if applicable)
  - then call `setUserId(userId)`

- **Shared device**:
  - keep an internal notion of “current user”
  - do not try to “reset” Clix user on logout

## What to avoid

- `setUserId(null)` or “clear user” calls on logout.
- setting user ID based on unverified inputs (typed email in login form).
