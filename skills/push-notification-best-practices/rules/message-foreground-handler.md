---
title: Foreground Message Handler
impact: HIGH
tags: foreground, onmessagereceived, willpresent
platforms: both
---

# Foreground Message Handler

Handle and display notifications when app is in foreground.

## Quick Pattern

**iOS:**
```swift
func userNotificationCenter(_ center: UNUserNotificationCenter,
                           willPresent notification: UNNotification,
                           withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    completionHandler([.banner, .sound, .badge])
}
```

**Android:**
```kotlin
override fun onMessageReceived(remoteMessage: RemoteMessage) {
    showNotification(remoteMessage.data["title"], remoteMessage.data["body"])
}
```

## When to Apply

- Foreground notifications not displaying
- Need custom notification UI in foreground

## Related Rules

- [ios-foreground-display.md](./ios-foreground-display.md)
- [android-messaging-service.md](./android-messaging-service.md)
