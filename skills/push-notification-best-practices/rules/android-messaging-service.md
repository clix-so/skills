---
title: FirebaseMessagingService Implementation
impact: HIGH
tags: android, fcm, messaging-service, onmessagereceived
platforms: android
---

# FirebaseMessagingService Implementation

Implement FirebaseMessagingService to handle incoming FCM messages.

## Quick Pattern

**Incorrect: Service not registered or not implemented**

```xml
<!-- ❌ Missing service in AndroidManifest.xml -->
```

**Correct: Service implemented and registered**

```kotlin
class MyFirebaseMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        // Handle message
        showNotification(remoteMessage.data)
    }
    
    override fun onNewToken(token: String) {
        // Send token to backend
        registerTokenWithBackend(token)
    }
}
```

```xml
<service
    android:name=".MyFirebaseMessagingService"
    android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>
```

## When to Apply

- Setting up FCM for first time
- Messages not being received
- Need to handle background/foreground messages

## Related Rules

- [android-google-services.md](./android-google-services.md)
- [message-data-vs-notification.md](./message-data-vs-notification.md)
