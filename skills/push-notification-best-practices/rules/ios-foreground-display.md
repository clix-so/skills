---
title: iOS Foreground Notification Display
impact: HIGH
tags: ios, foreground, presentation-options, willpresent
platforms: ios
---

# iOS Foreground Notification Display

Configure presentation options to display notifications when app is in foreground.

## Quick Pattern

**Incorrect:**
```swift
func userNotificationCenter(_ center: UNUserNotificationCenter,
                           willPresent notification: UNNotification,
                           withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    completionHandler([]) // ❌ No notification shown
}
```

**Correct:**
```swift
func userNotificationCenter(_ center: UNUserNotificationCenter,
                           willPresent notification: UNNotification,
                           withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    completionHandler([.banner, .sound, .badge]) // ✅ Shows notification
}
```

## When to Apply

- Foreground notifications not appearing
- Need to show alerts while app is active

## Related Rules

- [ios-delegate-setup.md](./ios-delegate-setup.md)
- [message-foreground-handler.md](./message-foreground-handler.md)
