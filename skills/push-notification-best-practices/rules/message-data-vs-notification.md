---
title: FCM Data vs Notification Payload
impact: CRITICAL
tags: fcm, android, payload, background, onmessagereceived
platforms: android
---

# FCM Data vs Notification Payload

Understand the difference between `data` and `notification` payloads in Firebase Cloud Messaging and choose the right type for your use case.

## Table of Contents
- [Quick Pattern](#quick-pattern)
- [When to Apply](#when-to-apply)
- [Deep Dive](#deep-dive)
- [Common Pitfalls](#common-pitfalls)
- [Comparison Table](#comparison-table)
- [Related Rules](#related-rules)
- [References](#references)

## Quick Pattern

**Incorrect: Using notification payload expecting background handler**

```json
{
  "to": "FCM_TOKEN",
  "notification": {
    "title": "New Message",
    "body": "You have a new message"
  },
  "data": {
    "userId": "123",
    "messageId": "456"
  }
}
```

```kotlin
// ❌ onMessageReceived NOT called when app is in background
override fun onMessageReceived(remoteMessage: RemoteMessage) {
    // This won't execute in background!
    processMessage(remoteMessage.data)
}
```

**Correct: Using data-only payload for background processing**

```json
{
  "to": "FCM_TOKEN",
  "data": {
    "title": "New Message",
    "body": "You have a new message",
    "userId": "123",
    "messageId": "456"
  }
}
```

```kotlin
// ✅ onMessageReceived ALWAYS called (foreground + background)
override fun onMessageReceived(remoteMessage: RemoteMessage) {
    val data = remoteMessage.data
    val title = data["title"] ?: "Notification"
    val body = data["body"] ?: ""

    // Process and display notification
    showNotification(title, body, data)
}
```

## When to Apply

- **Need to process notifications in the background**
- **Custom notification display logic required**
- **Background data processing** (update database, sync, etc.)
- **onMessageReceived not called in background**
- **Need consistent behavior** across foreground/background states

## Deep Dive

### Payload Types

Firebase Cloud Messaging supports two types of message payloads:

#### 1. Notification Messages (`notification` payload)

**Behavior:**

| App State | System Behavior | onMessageReceived Called? |
|-----------|-----------------|---------------------------|
| **Foreground** | onMessageReceived called | ✅ Yes |
| **Background** | System displays notification automatically | ❌ No |
| **Terminated** | System displays notification automatically | ❌ No |

**Example:**
```json
{
  "to": "FCM_TOKEN",
  "notification": {
    "title": "Hello",
    "body": "World"
  }
}
```

**Use Case:**
- Simple notifications without custom logic
- Don't need background processing
- Accept default Android notification appearance

#### 2. Data Messages (`data`-only payload)

**Behavior:**

| App State | System Behavior | onMessageReceived Called? |
|-----------|-----------------|---------------------------|
| **Foreground** | onMessageReceived called | ✅ Yes |
| **Background** | onMessageReceived called | ✅ Yes |
| **Terminated** | onMessageReceived called | ✅ Yes |

**Example:**
```json
{
  "to": "FCM_TOKEN",
  "data": {
    "title": "Hello",
    "body": "World",
    "customKey": "customValue"
  }
}
```

**Use Case:**
- Need background processing
- Custom notification UI
- Update local database
- Require full control over notification display

#### 3. Combined Messages (`notification` + `data`)

**Behavior:**

| App State | System Behavior | onMessageReceived Called? |
|-----------|-----------------|---------------------------|
| **Foreground** | onMessageReceived called | ✅ Yes |
| **Background** | System displays notification, data in Intent | ❌ No |
| **Terminated** | System displays notification, data in Intent | ❌ No |

**Example:**
```json
{
  "to": "FCM_TOKEN",
  "notification": {
    "title": "Hello",
    "body": "World"
  },
  "data": {
    "userId": "123",
    "deepLink": "myapp://profile/123"
  }
}
```

**Use Case:**
- Background: System displays notification
- Foreground: Custom handling
- Data payload for deep linking when notification is tapped

### Firebase Official Documentation Quote

> "When your app is in the background, notification messages are displayed in the system tray, and `onMessageReceived` is not called."

Source: [Firebase Cloud Messaging Troubleshooting](https://firebase.google.com/docs/cloud-messaging/troubleshooting)

### Recommended Approach: Data-Only Messages

For most use cases, **data-only messages** provide the most flexibility:

```kotlin
class MyFirebaseMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        // ✅ Always called for data-only messages
        val data = remoteMessage.data

        if (data.isNotEmpty()) {
            val title = data["title"] ?: "Notification"
            val body = data["body"] ?: ""

            // Custom processing
            processData(data)

            // Display notification
            showNotification(title, body, data)
        }
    }

    private fun showNotification(title: String, body: String, data: Map<String, String>) {
        val channelId = "default_channel"

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .build()

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Create channel if needed (Android 8.0+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (notificationManager.getNotificationChannel(channelId) == null) {
                val channel = NotificationChannel(
                    channelId,
                    "Default Notifications",
                    NotificationManager.IMPORTANCE_HIGH
                )
                notificationManager.createNotificationChannel(channel)
            }
        }

        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }

    private fun processData(data: Map<String, String>) {
        // Update database, sync data, etc.
        val userId = data["userId"]
        val messageId = data["messageId"]

        // Process custom data
    }
}
```

### Handling Combined Messages

If using `notification` + `data` payload, handle notification taps to retrieve data:

```kotlin
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // ✅ Retrieve data when notification is tapped
        intent.extras?.let { extras ->
            // Data payload is available in Intent
            val userId = extras.getString("userId")
            val deepLink = extras.getString("deepLink")

            if (deepLink != null) {
                navigateToDeepLink(deepLink)
            }
        }
    }
}
```

### Server-Side Examples

**Firebase Admin SDK (Node.js):**

```javascript
const admin = require('firebase-admin');

// ❌ Notification message (background handler NOT called)
const notificationMessage = {
  notification: {
    title: 'Hello',
    body: 'World'
  },
  token: fcmToken
};

// ✅ Data-only message (background handler ALWAYS called)
const dataMessage = {
  data: {
    title: 'Hello',
    body: 'World',
    customKey: 'customValue'
  },
  token: fcmToken
};

await admin.messaging().send(dataMessage);
```

**Legacy FCM API:**

```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "FCM_TOKEN",
    "data": {
      "title": "Hello",
      "body": "World"
    }
  }'
```

## Common Pitfalls

### 1. Expecting Background Handler with Notification Payload

**Problem:**
```kotlin
// ❌ This won't work in background
override fun onMessageReceived(remoteMessage: RemoteMessage) {
    updateDatabase(remoteMessage.data)
}
```

```json
{
  "notification": {...} // ← Background handler won't be called!
}
```

**Solution:** Use data-only payload.

### 2. Not Displaying Notification for Data-Only Messages

**Problem:** Data-only messages don't automatically display notifications.

**Solution:** Manually create and show notification in `onMessageReceived`.

### 3. Priority Too Low for Background Processing

**Problem:** Even with data-only messages, background handlers may not run on Android 6.0+ Doze mode if priority is not `high`.

**Solution:**
```javascript
const message = {
  data: {...},
  android: {
    priority: 'high' // ← Required for Doze mode
  },
  token: fcmToken
};
```

See [android-priority-high.md](./android-priority-high.md) for details.

### 4. Forgetting to Handle Both Payload Types

```kotlin
override fun onMessageReceived(remoteMessage: RemoteMessage) {
    // ✅ Handle both notification and data payloads
    remoteMessage.notification?.let { notification ->
        showNotification(notification.title, notification.body)
    }

    if (remoteMessage.data.isNotEmpty()) {
        processDataPayload(remoteMessage.data)
    }
}
```

## Comparison Table

| Feature | Notification Payload | Data-Only Payload | Combined |
|---------|---------------------|-------------------|----------|
| Background handler called | ❌ No | ✅ Yes | ❌ No |
| Auto-display in background | ✅ Yes | ❌ No | ✅ Yes |
| Custom processing | ⚠️ Foreground only | ✅ Always | ⚠️ Foreground only |
| Custom UI | ❌ No | ✅ Yes | ⚠️ Foreground only |
| Deep linking | ⚠️ Via Intent | ✅ Yes | ✅ Yes (via Intent) |
| Use case | Simple notifications | Full control | Hybrid approach |

## Related Rules

- [android-priority-high.md](./android-priority-high.md) - Priority for Doze mode
- [message-background-handler.md](./message-background-handler.md) - Background handler setup
- [message-foreground-handler.md](./message-foreground-handler.md) - Foreground notification display

## References

- [Firebase: About FCM Messages](https://firebase.google.com/docs/cloud-messaging/concept-options)
- [Firebase: Receive Messages in Android App](https://firebase.google.com/docs/cloud-messaging/android/receive)
- [Firebase: Troubleshooting](https://firebase.google.com/docs/cloud-messaging/troubleshooting)
