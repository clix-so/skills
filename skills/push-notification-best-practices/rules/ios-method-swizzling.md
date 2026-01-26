---
title: iOS Method Swizzling Management
impact: MEDIUM
tags: ios, method-swizzling, firebase, delegate
platforms: ios
---

# iOS Method Swizzling Management

Manage Method Swizzling when using multiple SDKs that intercept notification events.

## Quick Pattern

**Incorrect: Multiple SDKs fighting for delegate**

```swift
// ❌ Firebase and other SDKs both using Method Swizzling
// Unpredictable behavior
```

**Correct: Disable Firebase swizzling, manual token handling**

```xml
<!-- Info.plist -->
<key>FirebaseAppDelegateProxyEnabled</key>
<false/>
```

```swift
func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Messaging.messaging().apnsToken = deviceToken
}
```

## Related Rules

- [ios-delegate-setup.md](./ios-delegate-setup.md)
