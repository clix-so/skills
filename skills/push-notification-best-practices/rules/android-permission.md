---
title: Android POST_NOTIFICATIONS Permission (Android 13+)
impact: CRITICAL
tags: android, permission, android-13, tiramisu, runtime-permission
platforms: android
---

# Android POST_NOTIFICATIONS Permission (Android 13+)

Request runtime notification permission on Android 13 (API 33) and above to display push notifications.

## Table of Contents
- [Quick Pattern](#quick-pattern)
- [When to Apply](#when-to-apply)
- [Deep Dive](#deep-dive)
- [Common Pitfalls](#common-pitfalls)
- [Backward Compatibility](#backward-compatibility)
- [Related Rules](#related-rules)
- [References](#references)

## Quick Pattern

**Incorrect: No runtime permission request on Android 13+**

```kotlin
// ❌ Notifications won't display on Android 13+
val notification = NotificationCompat.Builder(this, channelId)
    .setContentTitle("Title")
    .setContentText("Body")
    .build()

notificationManager.notify(0, notification)
// Silent failure on Android 13+ - no permission requested!
```

**Correct: Request runtime permission first**

```kotlin
// ✅ Request permission on Android 13+
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
        != PackageManager.PERMISSION_GRANTED) {

        ActivityCompat.requestPermissions(
            this,
            arrayOf(Manifest.permission.POST_NOTIFICATIONS),
            REQUEST_CODE_POST_NOTIFICATIONS
        )
    }
}
```

## When to Apply

- **Android 13 (API 33) or higher devices**
- **Notifications don't appear** despite valid channel and token
- **Setting up push notifications** for the first time
- **Migrating app** to target SDK 33+

## Deep Dive

### Why This Matters

Starting with Android 13 (API 33), **runtime permission is required** to post notifications. This is a major change:

**Android 12 and below:**
- Notifications work by default
- No runtime permission needed
- Users can disable in Settings

**Android 13 and above:**
- **Runtime permission required** (like Camera, Location)
- App must explicitly request permission
- Without permission: **Notifications silently blocked**

### Step-by-Step Implementation

#### 1. Add Permission to AndroidManifest.xml

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- ✅ Required for Android 13+ -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application>
        <!-- ... -->
    </application>
</manifest>
```

#### 2. Check Permission Status

```kotlin
import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat

fun hasNotificationPermission(): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED
    } else {
        // Android 12 and below - permission not required
        true
    }
}
```

#### 3. Request Permission

```kotlin
import android.Manifest
import android.os.Build
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    // ✅ Modern permission request API (Activity Result API)
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            Log.d("Permission", "✅ Notification permission granted")
            // Proceed with notification setup
        } else {
            Log.d("Permission", "❌ Notification permission denied")
            // Show explanation or disable notification features
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Request permission on Android 13+
        requestNotificationPermission()
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            when {
                ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED -> {
                    // Permission already granted
                    Log.d("Permission", "✅ Permission already granted")
                }

                shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS) -> {
                    // Show explanation why permission is needed
                    showPermissionRationale()
                }

                else -> {
                    // Request permission
                    requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                }
            }
        }
    }

    private fun showPermissionRationale() {
        AlertDialog.Builder(this)
            .setTitle("Notification Permission Required")
            .setMessage("Notification permission is required to receive important updates.")
            .setPositiveButton("Allow") { _, _ ->
                requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
}
```

#### 4. Legacy Permission Request (Old API)

If not using Activity Result API:

```kotlin
class MainActivity : AppCompatActivity() {

    companion object {
        private const val REQUEST_CODE_POST_NOTIFICATIONS = 1001
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    REQUEST_CODE_POST_NOTIFICATIONS
                )
            }
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)

        when (requestCode) {
            REQUEST_CODE_POST_NOTIFICATIONS -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    Log.d("Permission", "✅ Notification permission granted")
                } else {
                    Log.d("Permission", "❌ Notification permission denied")

                    // Check if user selected "Don't ask again"
                    if (!shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) {
                        // User permanently denied - redirect to Settings
                        showSettingsDialog()
                    }
                }
            }
        }
    }

    private fun showSettingsDialog() {
        AlertDialog.Builder(this)
            .setTitle("Notification Permission Required")
            .setMessage("Please enable notification permission in Settings.")
            .setPositiveButton("Open Settings") { _, _ ->
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", packageName, null)
                }
                startActivity(intent)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
}
```

### React Native Example

```javascript
import {PermissionsAndroid, Platform} from 'react-native';

async function requestNotificationPermission() {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('✅ Notification permission granted');
      return true;
    } else {
      console.log('❌ Notification permission denied');
      return false;
    }
  }

  // Android 12 and below - no permission needed
  return true;
}

// Usage
async function setupNotifications() {
  const hasPermission = await requestNotificationPermission();

  if (hasPermission) {
    // Proceed with FCM token registration
    const token = await messaging().getToken();
    await registerTokenWithBackend(token);
  }
}
```

### Timing Best Practices

**Option 1: Request on app launch**
```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // Request immediately
    requestNotificationPermission()
}
```

**Option 2: Request after onboarding**
```kotlin
fun completeOnboarding() {
    // User finished tutorial
    requestNotificationPermission()
}
```

**Option 3: Request contextually**
```kotlin
fun enablePushNotifications() {
    // User explicitly enables notifications
    requestNotificationPermission()
}
```

### Handling Permanent Denial

When user selects "Don't ask again":

```kotlin
if (!shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) {
    // Permanently denied - must go to Settings
    val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
        data = Uri.fromParts("package", packageName, null)
    }
    startActivity(intent)
}
```

## Common Pitfalls

### 1. Forgetting to Add Permission to Manifest

**Problem:**
```kotlin
// ❌ Permission request will fail without manifest entry
ActivityCompat.requestPermissions(
    this,
    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
    REQUEST_CODE
)
```

**Solution:** Always add to `AndroidManifest.xml` first.

### 2. Not Checking Android Version

**Problem:**
```kotlin
// ❌ Crashes on Android 12 and below
ActivityCompat.requestPermissions(
    this,
    arrayOf(Manifest.permission.POST_NOTIFICATIONS), // Doesn't exist on API < 33
    REQUEST_CODE
)
```

**Solution:** Wrap in version check:
```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    // Request permission
}
```

### 3. Assuming Permission is Granted

**Problem:**
```kotlin
// ❌ No permission check
showNotification() // Fails silently on Android 13+
```

**Solution:** Always check permission status:
```kotlin
if (hasNotificationPermission()) {
    showNotification()
} else {
    requestNotificationPermission()
}
```

### 4. Not Handling Denial Gracefully

**Problem:** App doesn't work when permission denied.

**Solution:**
- Disable notification-dependent features
- Show in-app messages instead
- Provide Settings shortcut

### 5. Requesting Too Many Permissions at Once

**Problem:**
```kotlin
// ❌ Overwhelming user
requestPermissions(
    arrayOf(
        Manifest.permission.POST_NOTIFICATIONS,
        Manifest.permission.CAMERA,
        Manifest.permission.LOCATION
    ),
    REQUEST_CODE
)
```

**Best Practice:** Request permissions contextually, one at a time.

## Backward Compatibility

Ensure app works on all Android versions:

```kotlin
fun setupNotifications() {
    when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU -> {
            // Android 13+: Request runtime permission
            requestNotificationPermission()
        }

        Build.VERSION.SDK_INT >= Build.VERSION_CODES.O -> {
            // Android 8-12: Create notification channel
            createNotificationChannel()
        }

        else -> {
            // Android 7 and below: No special setup needed
            Log.d("Notifications", "No special setup required")
        }
    }
}
```

## Related Rules

- [android-notification-channel.md](./android-notification-channel.md) - Create notification channels
- [android-google-services.md](./android-google-services.md) - Firebase setup
- [ios-permission-request.md](./ios-permission-request.md) - iOS permission equivalent

## References

- [Android: Notification Runtime Permission](https://developer.android.com/develop/ui/views/notifications/notification-permission)
- [Android 13 Behavior Changes](https://developer.android.com/about/versions/13/behavior-changes-13#runtime-permission)
