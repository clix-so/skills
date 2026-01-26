---
title: Notification Service Extension Build
impact: MEDIUM
tags: ios, extension, uiapplication, build-error
platforms: ios
---

# Notification Service Extension Build

Fix build errors when Notification Service Extension tries to use UIApplication.shared.

## Quick Pattern

**Incorrect:**
```swift
// ❌ Crashes in extension
UIApplication.shared.registerForRemoteNotifications()
```

**Correct:**
```swift
#if !targetEnvironment(appExtension)
UIApplication.shared.registerForRemoteNotifications()
#endif
```

## Related Rules

- [ios-delegate-setup.md](./ios-delegate-setup.md)
