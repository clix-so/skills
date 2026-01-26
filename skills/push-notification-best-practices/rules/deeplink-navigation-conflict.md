---
title: Deep Link Navigation Conflict Resolution
impact: MEDIUM
tags: deeplink, react-native, react-navigation, linking, android
platforms: both
---

# Deep Link Navigation Conflict Resolution

Resolve conflicts when both push notification SDKs and React Navigation attempt to handle deep links simultaneously.

## Table of Contents
- [Quick Pattern](#quick-pattern)
- [When to Apply](#when-to-apply)
- [Deep Dive](#deep-dive)
- [Common Pitfalls](#common-pitfalls)
- [Debugging Deep Link Conflicts](#debugging-deep-link-conflicts)
- [Related Rules](#related-rules)
- [References](#references)

## Quick Pattern

**Incorrect: Multiple systems handling the same deep link**

```
ERROR  Looks like you have configured linking in multiple places.
This is likely an error since deep links should only be handled in one place to avoid conflicts.
Make sure that:
- You don't have multiple NavigationContainers in the app each with 'linking' enabled
- Only a single instance of the root component is rendered
- You have set 'android:launchMode=singleTask' in the '<activity />' section
  of the 'AndroidManifest.xml' file to avoid launching multiple instances
```

**Correct: Single deep link handler with proper delegation**

```javascript
// ✅ Push SDK delegates to React Native Linking
import {Linking} from 'react-native';
import messaging from '@react-native-firebase/messaging';

messaging().onNotificationOpenedApp(remoteMessage => {
  const link = remoteMessage.data?.link;
  if (link) {
    // Delegate to Linking API - React Navigation will handle it
    Linking.openURL(link);
  }
});
```

```xml
<!-- AndroidManifest.xml -->
<activity
  android:name=".MainActivity"
  android:launchMode="singleTask"> <!-- ✅ Prevents multiple instances -->
</activity>
```

## When to Apply

- **Error message about "linking in multiple places"**
- **Deep links open multiple times** or duplicate screens
- **Push notifications with deep links cause navigation errors**
- **App instance duplicates** when tapping notifications
- **Integrating push SDK** with React Navigation or similar

## Deep Dive

### Why This Happens

When a push notification contains a deep link:

1. **Push SDK** receives notification click
2. **Push SDK** tries to open deep link automatically
3. **React Navigation** also detects deep link event
4. **Both try to navigate** → Conflict!

### Platform-Specific Behavior

**iOS:**
- Less prone to this issue
- `UNNotificationResponse` delivers deep link data cleanly
- SDK and React Navigation have clear separation

**Android:**
- More prone to conflicts
- Intent handling can trigger multiple times
- Multiple activity instances can be created

### Solution 1: Android launchMode=singleTask

**Problem:** Tapping notification creates new activity instance.

**AndroidManifest.xml:**
```xml
<application>
  <activity
    android:name=".MainActivity"
    android:launchMode="singleTask" <!-- ✅ Ensure single instance -->
    android:configChanges="keyboard|keyboardHidden|orientation|screenSize|uiMode">

    <!-- Deep link intent filter -->
    <intent-filter>
      <action android:name="android.intent.action.VIEW" />
      <category android:name="android.intent.category.DEFAULT" />
      <category android:name="android.intent.category.BROWSABLE" />
      <data android:scheme="myapp" />
    </intent-filter>
  </activity>
</application>
```

**What `singleTask` Does:**
- Ensures only **one instance** of MainActivity exists
- New Intents are delivered to existing instance via `onNewIntent()`
- Prevents duplicate screens and navigation conflicts

### Solution 2: Delegate Deep Link Handling to Linking API

Let React Navigation handle all deep links through the Linking API:

```javascript
import {Linking} from 'react-native';
import messaging from '@react-native-firebase/messaging';

// App in foreground - notification tapped
messaging().onNotificationOpenedApp(remoteMessage => {
  const link = remoteMessage.data?.link;

  if (link) {
    // ✅ Delegate to Linking API
    // React Navigation automatically handles this
    Linking.openURL(link);
  }
});

// App opened from terminated state via notification
messaging().getInitialNotification().then(remoteMessage => {
  if (remoteMessage?.data?.link) {
    // ✅ Delegate to Linking API
    Linking.openURL(remoteMessage.data.link);
  }
});
```

### Solution 3: Single NavigationContainer with Linking Config

Ensure only one NavigationContainer with linking enabled:

```javascript
// App.js
import {NavigationContainer} from '@react-navigation/native';

function App() {
  return (
    <NavigationContainer
      linking={{
        prefixes: ['myapp://', 'https://myapp.com'],
        config: {
          screens: {
            Home: '',
            Profile: 'profile/:userId',
            Notifications: 'notifications'
          }
        }
      }}>
      {/* Your navigation stack */}
    </NavigationContainer>
  );
}

// ❌ Don't create multiple NavigationContainers with linking
```

### Complete React Native Example

```javascript
import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {Linking} from 'react-native';
import messaging from '@react-native-firebase/messaging';

function App() {
  useEffect(() => {
    // Handle notification when app is in background
    const unsubscribe = messaging().onNotificationOpenedApp(remoteMessage => {
      const link = remoteMessage.data?.link;
      if (link) {
        Linking.openURL(link);
      }
    });

    // Handle notification when app was terminated
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage?.data?.link) {
          Linking.openURL(remoteMessage.data.link);
        }
      });

    return unsubscribe;
  }, []);

  return (
    <NavigationContainer
      linking={{
        prefixes: ['myapp://'],
        config: {
          screens: {
            Home: '',
            Profile: 'profile/:userId'
          }
        }
      }}>
      <RootNavigator />
    </NavigationContainer>
  );
}
```

### Deep Link Payload Example

**Server-side (Firebase Admin SDK):**
```javascript
const message = {
  notification: {
    title: 'New Message',
    body: 'You have a new message from John'
  },
  data: {
    link: 'myapp://profile/123', // Deep link URL
    userId: '123'
  },
  token: userToken
};

await admin.messaging().send(message);
```

### Alternative: Native Deep Link Handling

If you need more control, handle deep links natively and pass to JavaScript:

**Android (MainActivity.kt):**
```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // Extract deep link from Intent
    val link = intent.getStringExtra("link")

    if (link != null) {
        // Save to SharedPreferences for JS to retrieve
        getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
            .edit()
            .putString("pending_deep_link", link)
            .apply()
    }
}
```

**React Native (JavaScript):**
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

useEffect(() => {
  const checkPendingDeepLink = async () => {
    const pendingLink = await AsyncStorage.getItem('pending_deep_link');

    if (pendingLink) {
      await AsyncStorage.removeItem('pending_deep_link');
      // Navigate after JS engine is ready
      Linking.openURL(pendingLink);
    }
  };

  // Wait for navigation to be ready
  setTimeout(checkPendingDeepLink, 500);
}, []);
```

## Common Pitfalls

### 1. SDK Automatically Opening Deep Links

**Problem:** SDK opens deep link before React Navigation is ready.

**Solution:** Disable SDK's auto deep link handling if possible, or use delegation pattern.

### 2. Deep Link Triggered Twice

**Problem:**
- SDK opens deep link
- React Navigation also detects and opens it
- User sees duplicate screens

**Solution:** Use `Linking.openURL()` delegation pattern.

### 3. Missing launchMode in AndroidManifest

**Problem:** Each notification creates new activity instance.

**Solution:** Add `android:launchMode="singleTask"`.

### 4. Deep Links Don't Work When App Is Terminated

**Problem:** JavaScript engine not initialized when deep link arrives.

**Solution:** See [deeplink-terminated-state.md](./deeplink-terminated-state.md)

### 5. Multiple NavigationContainers

**Problem:**
```javascript
// ❌ Two NavigationContainers with linking
<NavigationContainer linking={...}>...</NavigationContainer>
<NavigationContainer linking={...}>...</NavigationContainer>
```

**Solution:** Use only one NavigationContainer with linking config.

## Debugging Deep Link Conflicts

### Enable Linking Debugging

```javascript
import {Linking} from 'react-native';

// Log all deep link events
Linking.addEventListener('url', (event) => {
  console.log('🔗 Deep link received:', event.url);
});

// Check initial URL
Linking.getInitialURL().then(url => {
  console.log('🔗 Initial URL:', url);
});
```

### Test Deep Links via ADB (Android)

```bash
# Test deep link handling
adb shell am start -W -a android.intent.action.VIEW \
  -d "myapp://profile/123" \
  com.yourapp

# Check for duplicate activity instances
adb shell dumpsys activity | grep "TaskRecord"
```

### Test Deep Links via Simulator (iOS)

```bash
# Simulate deep link
xcrun simctl openurl booted "myapp://profile/123"
```

## Related Rules

- [deeplink-terminated-state.md](./deeplink-terminated-state.md) - Handle deep links when app is terminated
- [message-foreground-handler.md](./message-foreground-handler.md) - Foreground notification handling

## References

- [React Navigation: Deep Linking](https://reactnavigation.org/docs/deep-linking/)
- [React Native: Linking API](https://reactnative.dev/docs/linking)
- [Android: Launch Modes](https://developer.android.com/guide/components/activities/tasks-and-back-stack#TaskLaunchModes)
