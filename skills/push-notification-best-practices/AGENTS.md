# Push Notification Best Practices

**Version 1.0.0**
Clix
January 2026

> This document is optimized for AI agents and LLMs. Rules are prioritized by performance impact.

---

## Abstract

Comprehensive push notification setup and troubleshooting guide for mobile applications (iOS/Android). Contains 26 rules across 7 categories, prioritized by impact from critical (iOS/Android setup) to incremental (infrastructure patterns). Includes decision trees for permission timing and payload selection, anti-patterns reference, and platform support matrix. Each rule includes detailed explanations, real-world examples comparing incorrect vs. correct implementations, platform-specific code snippets, and common pitfalls to guide push notification integration and debugging.

---

## Table of Contents

1. [iOS Setup](#1-ios-setup) - **CRITICAL**
   - 1.1 [APNs Authentication Key Setup](#11-apns-authentication-key-setup)
   - 1.2 [UNUserNotificationCenter Delegate Setup](#12-unusernotificationcenter-delegate-setup)
   - 1.3 [iOS Notification Permission Request](#13-ios-notification-permission-request)
   - 1.4 [iOS APNS Token Registration](#14-ios-apns-token-registration)
   - 1.5 [iOS Foreground Notification Display](#15-ios-foreground-notification-display)
   - 1.6 [iOS Method Swizzling Management](#16-ios-method-swizzling-management)
   - 1.7 [Notification Service Extension Build](#17-notification-service-extension-build)

2. [Android Setup](#2-android-setup) - **CRITICAL**
   - 2.1 [Android Notification Channel Setup](#21-android-notification-channel-setup)
   - 2.2 [Android POST_NOTIFICATIONS Permission](#22-android-post_notifications-permission)
   - 2.3 [Firebase google-services.json Setup](#23-firebase-google-servicesjson-setup)
   - 2.4 [FirebaseMessagingService Implementation](#24-firebasemessagingservice-implementation)
   - 2.5 [FCM Priority High for Doze Mode](#25-fcm-priority-high-for-doze-mode)
   - 2.6 [Android Notification Icon Setup](#26-android-notification-icon-setup)

3. [Token Management](#3-token-management) - **HIGH**
   - 3.1 [Push Token Registration with Backend](#31-push-token-registration-with-backend)
   - 3.2 [Push Token Refresh Handling](#32-push-token-refresh-handling)
   - 3.3 [Invalid Token Cleanup](#33-invalid-token-cleanup)

4. [Message Handling](#4-message-handling) - **HIGH**
   - 4.1 [FCM Data vs Notification Payload](#41-fcm-data-vs-notification-payload)
   - 4.2 [Background Message Handler](#42-background-message-handler)
   - 4.3 [Foreground Message Handler](#43-foreground-message-handler)

5. [Deep Linking](#5-deep-linking) - **MEDIUM**
   - 5.1 [Deep Link Navigation Conflict Resolution](#51-deep-link-navigation-conflict-resolution)
   - 5.2 [Deep Link in Terminated State](#52-deep-link-in-terminated-state)

6. [Infrastructure](#6-infrastructure) - **MEDIUM**
   - 6.1 [Firewall Port Configuration](#61-firewall-port-configuration)
   - 6.2 [Firebase Installation ID Backup Exclusion](#62-firebase-installation-id-backup-exclusion)
   - 6.3 [Push Notification Rate Limiting](#63-push-notification-rate-limiting)

7. [Best Practices](#7-best-practices) - **HIGH**
   - 7.1 [Permission Request Timing Optimization](#71-permission-request-timing-optimization)
   - 7.2 [Push Notification Testing and Debugging](#72-push-notification-testing-and-debugging)

---

## 1. iOS Setup

**Impact: CRITICAL**

APNs configuration, delegate setup, permission requests, and token registration for iOS push notifications.

### 1.1 APNs Authentication Key Setup

**Impact: CRITICAL**

Configure Apple Push Notification service (APNS) authentication to enable iOS push notifications through Firebase Cloud Messaging.

**Incorrect:**

```
Error: [UNAUTHENTICATED] Auth error from APNS or Web Push Service
```

- Push notifications fail silently on iOS
- Firebase Console shows "Invalid APNs credentials"

**Correct:**

```swift
// Xcode: Signing & Capabilities → Push Notifications (enabled)
// Firebase Console: APNs key uploaded with correct Key ID and Team ID
// Result: iOS push notifications delivered successfully
```

**Setup Steps:**
1. Generate APNs Authentication Key (.p8) from Apple Developer Console
2. Record Key ID (10 characters)
3. Find Team ID in Membership page
4. Upload .p8 file to Firebase Console → Project Settings → Cloud Messaging
5. Enable Push Notifications capability in Xcode

---

### 1.2 UNUserNotificationCenter Delegate Setup

**Impact: CRITICAL**

Configure the UNUserNotificationCenter delegate correctly to handle push notifications, custom actions, and notification presentation options.

**Incorrect:**

```swift
// ❌ Delegate set too late or not set
func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    FirebaseApp.configure()
    // Delegate not set - notifications won't be handled properly
    return true
}
```

**Correct:**

```swift
// ✅ Set delegate BEFORE configuring Firebase
func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    UNUserNotificationCenter.current().delegate = self
    FirebaseApp.configure()
    return true
}
```

---

### 1.3 iOS Notification Permission Request

**Impact: CRITICAL**

Request user permission to display notifications before registering for remote notifications on iOS.

**Incorrect:**

```swift
// ❌ This will fail silently
application.registerForRemoteNotifications() // Skipped permission request!
```

**Correct:**

```swift
// ✅ Request permission first
UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
    if granted {
        DispatchQueue.main.async {
            application.registerForRemoteNotifications()
        }
    }
}
```

**Acceptance Rates by Timing:**
| Timing | Acceptance Rate |
|--------|-----------------|
| Immediate (app launch) | 15-20% |
| After onboarding | 40-50% |
| User-initiated action | 70-80% |

---

### 1.4 iOS APNS Token Registration

**Impact: HIGH**

Implement proper APNS token registration handlers to receive and process device tokens.

**Correct:**

```swift
func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    print("APNS Token: \(token)")
    Messaging.messaging().apnsToken = deviceToken
}

func application(_ application: UIApplication,
                 didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("Failed to register: \(error)")
}
```

---

### 1.5 iOS Foreground Notification Display

**Impact: HIGH**

Configure presentation options to display notifications when app is in foreground.

**Correct:**

```swift
func userNotificationCenter(_ center: UNUserNotificationCenter,
                          willPresent notification: UNNotification,
                          withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    completionHandler([.banner, .sound, .badge])
}
```

---

### 1.6 iOS Method Swizzling Management

**Impact: MEDIUM**

Manage Method Swizzling when using multiple SDKs that intercept notification events.

**Disable Swizzling in Info.plist:**

```xml
<key>FirebaseAppDelegateProxyEnabled</key>
<false/>
```

---

### 1.7 Notification Service Extension Build

**Impact: MEDIUM**

Fix build errors when Notification Service Extension tries to use UIApplication.shared.

**Solution:** Never use UIApplication in extension targets. Use shared containers or UserDefaults with App Groups.

---

## 2. Android Setup

**Impact: CRITICAL**

FCM configuration, notification channels, POST_NOTIFICATIONS permission, and FirebaseMessagingService for Android push notifications.

### 2.1 Android Notification Channel Setup

**Impact: CRITICAL**

Create notification channels to enable push notifications on Android 8.0 (Oreo) and above.

**Incorrect:**

```kotlin
// ❌ Notification won't display on Android 8.0+
val notification = NotificationCompat.Builder(this, "default_channel")
    .setContentTitle("Title")
    .build()
notificationManager.notify(0, notification)
// Result: Silent failure, no notification shown
```

**Correct:**

```kotlin
// ✅ Create channel first
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
    val channel = NotificationChannel(
        "default_channel",
        "Default Notifications",
        NotificationManager.IMPORTANCE_HIGH
    )
    notificationManager.createNotificationChannel(channel)
}
```

---

### 2.2 Android POST_NOTIFICATIONS Permission

**Impact: CRITICAL**

Request runtime notification permission on Android 13 (API 33) and above.

**AndroidManifest.xml:**

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

**Runtime Request:**

```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
        != PackageManager.PERMISSION_GRANTED) {
        ActivityCompat.requestPermissions(this,
            arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1001)
    }
}
```

---

### 2.3 Firebase google-services.json Setup

**Impact: CRITICAL**

Configure Firebase Cloud Messaging by adding google-services.json and applying the required Gradle plugin.

**Setup:**
1. Download google-services.json from Firebase Console
2. Place in app/ directory
3. Apply plugin in build.gradle:

```groovy
plugins {
    id 'com.google.gms.google-services'
}
```

---

### 2.4 FirebaseMessagingService Implementation

**Impact: HIGH**

Implement FirebaseMessagingService to handle incoming FCM messages.

```kotlin
class MyFirebaseMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        // Handle message
    }

    override fun onNewToken(token: String) {
        // Send token to backend
    }
}
```

---

### 2.5 FCM Priority High for Doze Mode

**Impact: HIGH**

Set FCM message priority to `high` to ensure background message handlers execute on Android devices in Doze mode.

**Server-side:**

```javascript
const message = {
    data: { title: 'Hello', body: 'World' },
    android: { priority: 'high' },
    token: fcmToken
};
```

---

### 2.6 Android Notification Icon Setup

**Impact: MEDIUM**

Configure notification icons to display correctly on Android 5.0+.

**Requirements:**
- White icon on transparent background
- No colors (Android renders as white silhouette)
- Recommended sizes: 24dp (mdpi) to 96dp (xxxhdpi)

---

## 3. Token Management

**Impact: HIGH**

Token registration, refresh handling, and invalidation for reliable push delivery.

### 3.1 Push Token Registration with Backend

**Impact: HIGH**

Properly register push notification tokens with your backend server.

**Correct:**

```javascript
const token = await messaging().getToken();
await fetch('https://api.myapp.com/register-token', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        token: token,
        userId: currentUser.id,
        platform: Platform.OS,
        deviceId: DeviceInfo.getUniqueId()
    })
});
```

---

### 3.2 Push Token Refresh Handling

**Impact: HIGH**

Handle token refresh events to keep backend in sync.

```javascript
messaging().onTokenRefresh(async (token) => {
    await registerTokenWithBackend(token);
});
```

---

### 3.3 Invalid Token Cleanup

**Impact: MEDIUM**

Remove invalid tokens from database when receiving DeviceNotRegistered errors.

```javascript
if (error.code === 'messaging/registration-token-not-registered') {
    await removeTokenFromDatabase(token);
}
```

---

## 4. Message Handling

**Impact: HIGH**

Data vs notification payloads, background/foreground handlers, and message processing.

### 4.1 FCM Data vs Notification Payload

**Impact: CRITICAL**

Understand the difference between `data` and `notification` payloads.

| Payload Type | Background Handler Called | Auto-display |
|--------------|---------------------------|--------------|
| data-only | ✅ Yes | ❌ No |
| notification | ❌ No | ✅ Yes |
| notification + data | ❌ No | ✅ Yes |

**Use data-only for background processing:**

```json
{
    "data": {
        "title": "Hello",
        "body": "World",
        "customKey": "value"
    },
    "token": "FCM_TOKEN"
}
```

---

### 4.2 Background Message Handler

**Impact: HIGH**

Implement background message handlers that work reliably in all app states.

```javascript
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    // Process message quickly (< 30 seconds)
    console.log('Background message:', remoteMessage);
});
```

---

### 4.3 Foreground Message Handler

**Impact: HIGH**

Handle and display notifications when app is in foreground.

```javascript
messaging().onMessage(async (remoteMessage) => {
    // Display local notification or in-app alert
});
```

---

## 5. Deep Linking

**Impact: MEDIUM**

Navigation from notifications, React Navigation conflicts, and terminated state handling.

### 5.1 Deep Link Navigation Conflict Resolution

**Impact: MEDIUM**

Resolve conflicts when both push notification SDKs and React Navigation attempt to handle deep links.

**Solution:** Disable automatic deep link handling in FCM and handle manually.

---

### 5.2 Deep Link in Terminated State

**Impact: MEDIUM**

Handle deep links when app is completely terminated (cold start).

```javascript
const initialNotification = await messaging().getInitialNotification();
if (initialNotification) {
    navigateToScreen(initialNotification.data.screen);
}
```

---

## 6. Infrastructure

**Impact: MEDIUM**

Firewall configuration, rate limiting, and Firebase Installation ID management.

### 6.1 Firewall Port Configuration

**Impact: MEDIUM**

Open required ports in corporate firewalls for push notification delivery.

| Service | Ports |
|---------|-------|
| APNs | 443, 2195, 2196 |
| FCM | 443, 5228-5230 |

---

### 6.2 Firebase Installation ID Backup Exclusion

**Impact: MEDIUM**

Exclude Firebase Installation data from backups to prevent token conflicts after device restore.

**Android:** Add to backup rules
**iOS:** Exclude from iCloud backup

---

### 6.3 Push Notification Rate Limiting

**Impact: MEDIUM**

Implement rate limiting and retry logic for push notification sending.

| Service | Limit |
|---------|-------|
| Expo Push | 600/sec per project |
| FCM (multicast) | 500 tokens per request |
| FCM (topic) | 3,000/sec per topic |

---

## 7. Best Practices

**Impact: HIGH**

Permission timing optimization and testing/debugging techniques.

### 7.1 Permission Request Timing Optimization

**Impact: HIGH**

Optimize the timing of notification permission requests to maximize user acceptance rates.

| Timing | Acceptance Rate | Recommendation |
|--------|-----------------|----------------|
| Immediate (app launch) | 15-20% | Avoid |
| After onboarding | 40-50% | Acceptable |
| User-initiated action | 70-80% | Best |

**Pre-Permission UI Pattern:**
Show custom UI explaining value before system dialog.

---

### 7.2 Push Notification Testing and Debugging

**Impact: HIGH**

Tools and techniques for testing push notifications during development.

**Testing Methods:**
1. Firebase Console → Cloud Messaging → Send test message
2. Node.js script with Firebase Admin SDK
3. cURL with FCM HTTP v1 API

**Debugging Checklist:**
- iOS: Check APNs key, delegate setup, permission status
- Android: Check google-services.json, notification channel, POST_NOTIFICATIONS permission

---

## References

- https://firebase.google.com/docs/cloud-messaging
- https://developer.apple.com/documentation/usernotifications
- https://docs.expo.dev/push-notifications/overview
- https://firebase.google.com/docs/cloud-messaging/troubleshooting
