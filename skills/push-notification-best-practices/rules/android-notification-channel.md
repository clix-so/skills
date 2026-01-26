---
title: Android Notification Channel Setup (Android 8.0+)
impact: CRITICAL
tags: android, notification-channel, android-8, oreo
platforms: android
---

# Android Notification Channel Setup (Android 8.0+)

Create notification channels to enable push notifications on Android 8.0 (Oreo) and above. Without channels, notifications will not display.

## Table of Contents
- [Quick Pattern](#quick-pattern)
- [When to Apply](#when-to-apply)
- [Deep Dive](#deep-dive)
- [Common Pitfalls](#common-pitfalls)
- [Related Rules](#related-rules)
- [References](#references)

## Quick Pattern

**Incorrect: No notification channel created**

```kotlin
// ❌ Notification won't display on Android 8.0+
val notification = NotificationCompat.Builder(this, "default_channel")
    .setContentTitle("Title")
    .setContentText("Body")
    .build()

notificationManager.notify(0, notification)
// Result: Silent failure, no notification shown
```

**Correct: Channel created before sending notification**

```kotlin
// ✅ Create channel first (Android 8.0+)
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
    val channel = NotificationChannel(
        "default_channel",
        "Default Notifications",
        NotificationManager.IMPORTANCE_HIGH
    )
    notificationManager.createNotificationChannel(channel)
}

// ✅ Now notification will display
val notification = NotificationCompat.Builder(this, "default_channel")
    .setContentTitle("Title")
    .setContentText("Body")
    .build()

notificationManager.notify(0, notification)
```

## When to Apply

- **Notifications don't appear on Android 8.0+ devices**
- **Notifications work on Android 7.x but not Android 8.0+**
- **Logcat shows "No Channel found" error**
- **Setting up push notifications for the first time**
- **Adding new notification categories** (e.g., messages, promotions, alerts)

## Deep Dive

### Why This Matters

Android 8.0 (API level 26) introduced **Notification Channels** to give users fine-grained control over notifications. Before displaying any notification:

1. You must create at least one channel
2. Assign the notification to that channel
3. Users can customize each channel's behavior (sound, vibration, importance)

**Without a channel:**
- Notifications fail silently (no error to the app)
- No notification appears in the system tray
- No crash or exception thrown

### Channel Importance Levels

| Importance | Behavior | Use Case |
|------------|----------|----------|
| `IMPORTANCE_HIGH` | Makes sound + shows as heads-up | Time-sensitive alerts, messages |
| `IMPORTANCE_DEFAULT` | Makes sound + shows in notification tray | General notifications |
| `IMPORTANCE_LOW` | No sound + shows in notification tray | Non-urgent updates |
| `IMPORTANCE_MIN` | No sound + only shows in status bar | Silent background updates |
| `IMPORTANCE_NONE` | Hidden (not recommended) | - |

### Step-by-Step Implementation

#### 1. Create Notification Channel

Create in `MainActivity.onCreate()` or `Application.onCreate()`:

```kotlin
private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val channelId = "default_channel"
        val channelName = "Default Notifications"
        val importance = NotificationManager.IMPORTANCE_HIGH

        val channel = NotificationChannel(channelId, channelName, importance).apply {
            description = "App default push notifications"
            enableLights(true)
            lightColor = Color.BLUE
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 500, 250, 500)
            setShowBadge(true)
        }

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.createNotificationChannel(channel)
    }
}
```

#### 2. Call Channel Creation at App Start

```kotlin
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // ✅ Create channel when app starts
        createNotificationChannel()
    }
}
```

Or in `Application` class:

```kotlin
class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        // ✅ Create channel for entire app
        createNotificationChannel()
    }
}
```

#### 3. Use Channel ID in Notifications

```kotlin
private fun showNotification(title: String, body: String) {
    val channelId = "default_channel" // ← Must match channel created above

    val notification = NotificationCompat.Builder(this, channelId)
        .setSmallIcon(R.drawable.ic_notification)
        .setContentTitle(title)
        .setContentText(body)
        .setPriority(NotificationCompat.PRIORITY_HIGH) // For Android 7.x and below
        .setAutoCancel(true)
        .build()

    val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    notificationManager.notify(0, notification)
}
```

### Multiple Channels for Different Categories

Create separate channels for different notification types:

```kotlin
private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Channel 1: High-priority messages
        val messageChannel = NotificationChannel(
            "messages",
            "Messages",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "New message notifications"
            enableVibration(true)
            setShowBadge(true)
        }

        // Channel 2: Low-priority promotions
        val promoChannel = NotificationChannel(
            "promotions",
            "Promotions",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Promotional offers and updates"
            setShowBadge(false) // Don't show badge for promos
        }

        // Create both channels
        notificationManager.createNotificationChannel(messageChannel)
        notificationManager.createNotificationChannel(promoChannel)
    }
}
```

### Firebase Messaging Integration

```kotlin
class MyFirebaseMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        // Extract data
        val title = remoteMessage.notification?.title ?: "New Message"
        val body = remoteMessage.notification?.body ?: ""

        // Show notification with channel
        showNotification(title, body)
    }

    private fun showNotification(title: String, body: String) {
        val channelId = "default_channel"

        // ✅ Ensure channel exists (defensive)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (notificationManager.getNotificationChannel(channelId) == null) {
                val channel = NotificationChannel(
                    channelId,
                    "Default Notifications",
                    NotificationManager.IMPORTANCE_HIGH
                )
                notificationManager.createNotificationChannel(channel)
            }
        }

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .build()

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }
}
```

## Common Pitfalls

### 1. Channel ID Mismatch

**Problem:**
```kotlin
// Created channel with ID "default"
createNotificationChannel("default", "Default", ...)

// ❌ Using different ID "default_channel"
NotificationCompat.Builder(this, "default_channel")
```

**Solution:** Use consistent channel IDs throughout the app.

### 2. Creating Channel After Notification

**Problem:**
```kotlin
// ❌ Trying to show notification before channel exists
showNotification()

// Too late - notification already failed
createNotificationChannel()
```

**Solution:** Create channels at app startup, before any notifications.

### 3. Not Checking Android Version

**Problem:**
```kotlin
// ❌ Crashes on Android 7.x
val channel = NotificationChannel(...) // NotificationChannel doesn't exist on API < 26
```

**Solution:** Always wrap in version check:
```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
    // Channel code here
}
```

### 4. Ignoring User Channel Settings

**Problem:** Users can modify channel settings (disable sound, vibration, etc.) in Android settings. Your app code cannot override these user preferences.

**Solution:** Respect user settings. If users disable a channel, notifications will still display but without sound/vibration.

### 5. Recreating Channels Doesn't Update Settings

```kotlin
// ❌ This won't change existing channel settings
val channel = NotificationChannel("default", "New Name", IMPORTANCE_LOW)
notificationManager.createNotificationChannel(channel)
// User's previous settings are preserved
```

**Solution:** To change channel settings, you must:
1. Delete the old channel: `notificationManager.deleteNotificationChannel("default")`
2. Create a new channel with a **different ID**
3. Users must re-enable the new channel

## Related Rules

- [android-permission.md](./android-permission.md) - POST_NOTIFICATIONS permission (Android 13+)
- [android-notification-icon.md](./android-notification-icon.md) - Notification icon setup
- [android-messaging-service.md](./android-messaging-service.md) - FirebaseMessagingService implementation
- [message-foreground-handler.md](./message-foreground-handler.md) - Displaying foreground notifications

## References

- [Android: Create and Manage Notification Channels](https://developer.android.com/develop/ui/views/notifications/channels)
- [Android: Notification Importance Levels](https://developer.android.com/reference/android/app/NotificationManager#IMPORTANCE_DEFAULT)
