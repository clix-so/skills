---
title: Push Token Refresh Handling
impact: HIGH
tags: token, refresh, onnewtoken, token-rotation
platforms: both
---

# Push Token Refresh Handling

Handle token refresh events to keep backend in sync with current device tokens.

## Quick Pattern

**Incorrect:**
```kotlin
override fun onNewToken(token: String) {
    Log.d("FCM", "New token: $token") // ❌ Not sent to backend
}
```

**Correct:**
```kotlin
override fun onNewToken(token: String) {
    Log.d("FCM", "New token: $token")
    // ✅ Update backend
    registerTokenWithBackend(token)
}
```

## When to Apply

- Tokens changing without notification delivery
- App reinstalls on Android
- Firebase SDK updates

## Related Rules

- [token-registration.md](./token-registration.md)
- [token-invalidation.md](./token-invalidation.md)
