---
title: Invalid Token Cleanup
impact: MEDIUM
tags: token, invalidation, devicenotregistered, cleanup
platforms: both
---

# Invalid Token Cleanup

Remove invalid tokens from database when receiving DeviceNotRegistered errors.

## Quick Pattern

**Incorrect:**
```javascript
// ❌ Ignoring DeviceNotRegistered errors
try {
  await admin.messaging().send(message);
} catch (error) {
  console.error(error); // Token stays in DB
}
```

**Correct:**
```javascript
// ✅ Remove invalid tokens
try {
  await admin.messaging().send(message);
} catch (error) {
  if (error.code === 'messaging/registration-token-not-registered') {
    await db.deleteToken(token);
  }
}
```

## Related Rules

- [token-registration.md](./token-registration.md)
- [token-refresh.md](./token-refresh.md)
