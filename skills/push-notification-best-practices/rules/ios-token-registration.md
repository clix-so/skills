---
title: iOS APNS Token Registration
impact: HIGH
tags: ios, apns, token, registration
platforms: ios
---

# iOS APNS Token Registration

Implement proper APNS token registration handlers to receive and process device tokens.

## Quick Pattern

**Incorrect: Token received but not handled**

```swift
// ❌ Missing implementation
func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    // Empty - token is lost!
}
```

**Correct: Token processed and sent to backend**

```swift
// ✅ Token handled properly
func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    print("APNS Token: \(token)")
    
    // Send to Firebase
    Messaging.messaging().apnsToken = deviceToken
    
    // Register with backend
    registerTokenWithBackend(token: token)
}

func application(_ application: UIApplication,
                 didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("Failed to register: \(error)")
}
```

## When to Apply

- Setting up APNS for first time
- Token not being sent to backend
- Firebase not receiving APNS tokens
- Push notifications not working despite valid credentials

## Deep Dive

See [native-ios.md](../../extracted-push-notifications/troubleshooting-guides/native-ios.md) for complete implementation details.

### Key Points

1. **Call registerForRemoteNotifications() after permission granted**
2. **Handle both success and failure callbacks**
3. **Convert Data to hex string for backend**
4. **Forward to Firebase if using FCM**

## Related Rules

- [ios-permission-request.md](./ios-permission-request.md)
- [token-registration.md](./token-registration.md)

