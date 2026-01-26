---
title: Push Token Registration with Backend
impact: HIGH
tags: token, registration, backend, apns, fcm
platforms: both
---

# Push Token Registration with Backend

Properly register push notification tokens with your backend server to enable notification delivery to specific users.

## Table of Contents
- [Quick Pattern](#quick-pattern)
- [When to Apply](#when-to-apply)
- [Deep Dive](#deep-dive)
- [Common Pitfalls](#common-pitfalls)
- [Related Rules](#related-rules)
- [References](#references)

## Quick Pattern

**Incorrect: Token obtained but never sent to server**

```javascript
// iOS
const token = await messaging().getAPNSToken();
console.log("Got token:", token); // ❌ Logged but not registered
// Token never reaches backend - notifications can't be sent!
```

```kotlin
// Android
FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
    val token = task.result
    Log.d("FCM", "Token: $token") // ❌ Logged but not registered
    // Token never reaches backend!
}
```

**Correct: Token sent to backend and associated with user**

```javascript
// iOS/Android (React Native)
const token = await messaging().getToken();

// ✅ Register token with backend
await fetch('https://api.myapp.com/register-token', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    token: token,
    userId: currentUser.id,
    platform: Platform.OS, // 'ios' or 'android'
    deviceId: DeviceInfo.getUniqueId()
  })
});
```

## When to Apply

- **Setting up push notifications** for the first time
- **Notifications not reaching users** despite valid tokens
- **User logs in** (associate token with user ID)
- **User logs out** (disassociate token or delete)
- **App is reinstalled** (token may change on Android)

## Deep Dive

### Why This Matters

A push token uniquely identifies a device/app installation. Without registering the token with your backend:

- **You can't send notifications** to specific users
- **Notifications are lost** when tokens refresh
- **Can't target devices** by user ID, device type, etc.

### Token Lifecycle

```
1. App starts → Request token from OS
2. OS provides token → App receives token
3. App sends token → Backend stores token + userId
4. Token refreshes → App sends new token
5. Token becomes invalid → Backend removes token
```

### Step-by-Step Implementation

#### 1. Request Token from Platform

**iOS (Swift):**
```swift
import FirebaseMessaging

func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

    // Request APNS token
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
        if granted {
            DispatchQueue.main.async {
                application.registerForRemoteNotifications()
            }
        }
    }

    return true
}

// Receive APNS token
func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    // Firebase automatically converts APNS token to FCM token
    Messaging.messaging().apnsToken = deviceToken

    // Get FCM token
    Messaging.messaging().token { token, error in
        if let token = token {
            self.registerTokenWithBackend(token: token)
        }
    }
}
```

**Android (Kotlin):**
```kotlin
import com.google.firebase.messaging.FirebaseMessaging

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Get FCM token
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val token = task.result
                registerTokenWithBackend(token)
            } else {
                Log.e("FCM", "Failed to get token", task.exception)
            }
        }
    }
}
```

**React Native:**
```javascript
import messaging from '@react-native-firebase/messaging';

async function requestUserPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    const token = await messaging().getToken();
    await registerTokenWithBackend(token);
  }
}
```

#### 2. Send Token to Backend

**Client-Side (JavaScript):**
```javascript
async function registerTokenWithBackend(token) {
  const userId = await AsyncStorage.getItem('userId');

  const response = await fetch('https://api.myapp.com/register-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getAuthToken()}`
    },
    body: JSON.stringify({
      token: token,
      userId: userId,
      platform: Platform.OS,
      appVersion: DeviceInfo.getVersion(),
      deviceId: await DeviceInfo.getUniqueId(),
      timestamp: Date.now()
    })
  });

  if (!response.ok) {
    console.error('Failed to register token');
  } else {
    console.log('✅ Token registered successfully');
  }
}
```

#### 3. Store Token on Backend

**Backend (Node.js + PostgreSQL example):**
```javascript
app.post('/register-token', authenticateUser, async (req, res) => {
  const {token, userId, platform, deviceId} = req.body;

  try {
    // Upsert token (update if exists, insert if not)
    await db.query(`
      INSERT INTO push_tokens (user_id, token, platform, device_id, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (device_id)
      DO UPDATE SET
        token = $2,
        platform = $3,
        updated_at = NOW()
    `, [userId, token, platform, deviceId]);

    res.json({success: true});
  } catch (error) {
    console.error('Failed to save token:', error);
    res.status(500).json({error: 'Failed to save token'});
  }
});
```

**Database Schema:**
```sql
CREATE TABLE push_tokens (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  token TEXT NOT NULL,
  platform VARCHAR(10) NOT NULL, -- 'ios' or 'android'
  device_id VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_id (user_id),
  INDEX idx_token (token)
);
```

#### 4. Handle Token Refresh

**iOS:**
```swift
// AppDelegate.swift
extension AppDelegate: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }

        // ✅ Token refreshed - update backend
        registerTokenWithBackend(token: token)
    }
}
```

**Android:**
```kotlin
class MyFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)

        // ✅ New token issued - update backend
        registerTokenWithBackend(token)
    }

    private fun registerTokenWithBackend(token: String) {
        // Send to backend
    }
}
```

**React Native:**
```javascript
import messaging from '@react-native-firebase/messaging';

// Listen for token refresh
messaging().onTokenRefresh(async (token) => {
  console.log('Token refreshed:', token);
  await registerTokenWithBackend(token);
});
```

#### 5. Handle User Logout

```javascript
async function logout() {
  // Delete token from backend before logging out
  const token = await messaging().getToken();

  await fetch('https://api.myapp.com/delete-token', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getAuthToken()}`
    },
    body: JSON.stringify({token})
  });

  // Optional: Delete FCM token locally
  await messaging().deleteToken();

  // Clear user session
  await AsyncStorage.removeItem('userId');
}
```

### Sending Notifications from Backend

**Backend (Node.js + Firebase Admin SDK):**
```javascript
const admin = require('firebase-admin');

async function sendNotificationToUser(userId, title, body) {
  // Get user's tokens from database
  const tokens = await db.query(
    'SELECT token FROM push_tokens WHERE user_id = $1',
    [userId]
  );

  if (tokens.rows.length === 0) {
    console.log('No tokens found for user');
    return;
  }

  const tokenList = tokens.rows.map(row => row.token);

  // Send notification
  const message = {
    notification: {title, body},
    tokens: tokenList
  };

  const response = await admin.messaging().sendMulticast(message);

  // Handle failures (invalid tokens)
  if (response.failureCount > 0) {
    const failedTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        failedTokens.push(tokenList[idx]);
        console.error('Failed token:', tokenList[idx], resp.error);
      }
    });

    // Remove invalid tokens from database
    if (failedTokens.length > 0) {
      await db.query(
        'DELETE FROM push_tokens WHERE token = ANY($1)',
        [failedTokens]
      );
    }
  }
}
```

## Common Pitfalls

### 1. Not Handling Token Changes

**Problem:** Android tokens can change on app reinstall.

**Solution:** Always send token to backend on app start and token refresh.

### 2. Not Removing Invalid Tokens

**Problem:** Accumulating invalid tokens in database.

**Solution:**
- Listen for `DeviceNotRegistered` errors
- Remove invalid tokens from database
- See [token-invalidation.md](./token-invalidation.md)

### 3. Not Associating Token with User

**Problem:**
```javascript
// ❌ Token stored without user ID
await saveToken(token); // Can't send to specific users!
```

**Solution:**
```javascript
// ✅ Associate token with user
await saveToken(token, userId);
```

### 4. Sending Token Before User Login

**Problem:** Token registered before knowing which user it belongs to.

**Solution:** Register token after user authentication:

```javascript
async function onUserLogin(userId) {
  const token = await messaging().getToken();
  await registerTokenWithBackend(token, userId);
}
```

### 5. Not Handling Multiple Devices Per User

**Problem:** User has multiple devices, but only one token stored.

**Solution:** Use `device_id` as unique key, not `user_id`:

```sql
-- ✅ Multiple devices per user
CREATE UNIQUE INDEX ON push_tokens (device_id);

-- ❌ Only one device per user
CREATE UNIQUE INDEX ON push_tokens (user_id);
```

## Related Rules

- [token-refresh.md](./token-refresh.md) - Handle token refresh
- [token-invalidation.md](./token-invalidation.md) - Remove invalid tokens
- [ios-token-registration.md](./ios-token-registration.md) - iOS-specific token handling
- [android-google-services.md](./android-google-services.md) - Android FCM setup

## References

- [Firebase: Set Up a Firebase Cloud Messaging Client App](https://firebase.google.com/docs/cloud-messaging/android/client)
- [Expo: Push Notifications Setup](https://docs.expo.dev/push-notifications/push-notifications-setup/)
