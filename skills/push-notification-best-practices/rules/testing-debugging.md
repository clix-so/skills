---
title: Push Notification Testing and Debugging
impact: HIGH
tags: testing, debugging, firebase-console, payload-test, troubleshooting
platforms: both
---

# Push Notification Testing and Debugging

Tools and techniques for testing push notifications during development and debugging delivery issues in production.

## Table of Contents
- [Quick Pattern](#quick-pattern)
- [When to Apply](#when-to-apply)
- [Deep Dive](#deep-dive)
- [Common Pitfalls](#common-pitfalls)
- [Related Rules](#related-rules)
- [References](#references)

## Quick Pattern

**Incorrect: Guessing why notifications don't arrive**

```bash
# ❌ Sending to production without testing
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -d '{"to": "FCM_TOKEN", ...}'
# No feedback, notification doesn't arrive, no idea why
```

**Correct: Systematic testing and debugging**

```bash
# ✅ Step 1: Verify token is valid
# Firebase Console → Cloud Messaging → Send test message

# ✅ Step 2: Check delivery reports
# Firebase Console → Cloud Messaging → Reports

# ✅ Step 3: Use Firebase Admin SDK with error handling
const response = await admin.messaging().send(message);
console.log('Message ID:', response);
// Returns message ID if successful, throws error with details if not
```

## When to Apply

- **Notifications not appearing** despite valid setup
- **Intermittent delivery failures**
- **Testing push notifications locally**
- **Debugging production notification issues**
- **Validating payload format**

## Deep Dive

### Testing Tools

#### 1. Firebase Console Test Message

The simplest way to test push notifications:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Cloud Messaging**
4. Click **Send your first message** or **New notification**
5. Enter notification details
6. Click **Send test message**
7. Enter your device's FCM token
8. Click **Test**

**Getting FCM Token:**

```javascript
// React Native
import messaging from '@react-native-firebase/messaging';

const token = await messaging().getToken();
console.log('FCM Token:', token);
// Copy this token and paste into Firebase Console
```

```swift
// iOS
Messaging.messaging().token { token, error in
    if let token = token {
        print("FCM Token: \(token)")
    }
}
```

```kotlin
// Android
FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
    if (task.isSuccessful) {
        Log.d("FCM", "Token: ${task.result}")
    }
}
```

#### 2. Payload Testing Tool

Create a simple Node.js script for testing:

```javascript
// test-push.js
const admin = require('firebase-admin');

// Initialize with service account
admin.initializeApp({
  credential: admin.credential.cert('./service-account.json')
});

async function testPush(token, type = 'data') {
  const message = type === 'data'
    ? {
        // Data-only message (background handler called)
        data: {
          title: 'Test Notification',
          body: 'This is a test message',
          timestamp: Date.now().toString()
        },
        android: { priority: 'high' },
        apns: { headers: { 'apns-priority': '10' } },
        token
      }
    : {
        // Notification message (system displays)
        notification: {
          title: 'Test Notification',
          body: 'This is a test message'
        },
        token
      };

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Success! Message ID:', response);
  } catch (error) {
    console.error('❌ Error:', error.code, error.message);

    // Detailed error handling
    if (error.code === 'messaging/invalid-registration-token') {
      console.log('→ Token is invalid. Device may have uninstalled the app.');
    } else if (error.code === 'messaging/registration-token-not-registered') {
      console.log('→ Token is not registered. App was uninstalled or token expired.');
    }
  }
}

// Usage
const token = process.argv[2];
const type = process.argv[3] || 'data';

if (!token) {
  console.log('Usage: node test-push.js <FCM_TOKEN> [data|notification]');
  process.exit(1);
}

testPush(token, type);
```

Run with:
```bash
node test-push.js "YOUR_FCM_TOKEN" data
node test-push.js "YOUR_FCM_TOKEN" notification
```

#### 3. cURL Testing

Test directly with FCM HTTP v1 API:

```bash
# Get access token first
ACCESS_TOKEN=$(gcloud auth print-access-token)

# Send test notification
curl -X POST \
  "https://fcm.googleapis.com/v1/projects/YOUR_PROJECT_ID/messages:send" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "token": "FCM_TOKEN",
      "data": {
        "title": "Test",
        "body": "Test message"
      },
      "android": {
        "priority": "high"
      },
      "apns": {
        "headers": {
          "apns-priority": "10"
        }
      }
    }
  }'
```

### Debugging Techniques

#### 1. Check Token Validity

```javascript
// Validate token before sending
async function validateToken(token) {
  try {
    // Dry run - doesn't actually send
    await admin.messaging().send({
      token,
      data: { test: 'true' }
    }, true); // dryRun = true

    console.log('✅ Token is valid');
    return true;
  } catch (error) {
    console.log('❌ Token is invalid:', error.code);
    return false;
  }
}
```

#### 2. Check Device Logs

**iOS (Xcode):**
```
1. Connect device to Mac
2. Open Xcode → Window → Devices and Simulators
3. Select device → Open Console
4. Filter by your app name or "APNS"
5. Look for:
   - "Received remote notification"
   - "Failed to register for remote notifications"
   - "APNs token" messages
```

**Android (Logcat):**
```bash
# Filter FCM messages
adb logcat | grep -i "fcm\|firebase\|notification"

# Or use Android Studio Logcat with filter:
# tag:FirebaseMessaging OR tag:NotificationManager
```

**React Native:**
```javascript
// Enable verbose logging
import messaging from '@react-native-firebase/messaging';

messaging().onMessage(async (remoteMessage) => {
  console.log('Foreground message:', JSON.stringify(remoteMessage, null, 2));
});

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Background message:', JSON.stringify(remoteMessage, null, 2));
});
```

#### 3. Firebase Console Reports

Check delivery statistics:

1. Firebase Console → Cloud Messaging → Reports
2. View:
   - **Sends**: Messages sent from server
   - **Delivered**: Messages delivered to device
   - **Opens**: Notifications tapped by user

**Common issues visible in reports:**
- High sends but low delivered → Token issues
- Delivered but no opens → Notification not visible (check channel/permission)

#### 4. APNs Feedback Service

Check for invalid iOS tokens:

```javascript
// Firebase Admin SDK handles this automatically
// But you can check for specific errors:

const response = await admin.messaging().sendMulticast({
  tokens: tokenList,
  notification: { title, body }
});

response.responses.forEach((resp, idx) => {
  if (!resp.success) {
    const error = resp.error;

    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      // Remove this token from database
      removeTokenFromDatabase(tokenList[idx]);
    }
  }
});
```

### Debugging Checklist

#### iOS Not Receiving Notifications

| Check | How | Solution |
|-------|-----|----------|
| APNs key uploaded | Firebase Console → Project Settings → Cloud Messaging | Upload .p8 key |
| Push capability enabled | Xcode → Signing & Capabilities | Add Push Notifications |
| Delegate set before registration | Review AppDelegate code | Move delegate setup to top |
| Permission granted | Settings app → Your App → Notifications | Request permission properly |
| Foreground handler implemented | Check UNUserNotificationCenterDelegate | Implement willPresent |
| Using correct environment | Debug = sandbox, Release = production | Check build configuration |

#### Android Not Receiving Notifications

| Check | How | Solution |
|-------|-----|----------|
| google-services.json present | Check app/ directory | Download from Firebase Console |
| Notification channel created | Check logcat for "No Channel found" | Create channel at app start |
| POST_NOTIFICATIONS permission | Check Android 13+ devices | Request runtime permission |
| Priority set to high | Check payload | Use `priority: 'high'` for background |
| Battery optimization disabled | Settings → Battery → Your App | Exclude from optimization |
| Data saver disabled | Settings → Network → Data Saver | Exclude from data saver |

### Expo Debugging

```javascript
import * as Notifications from 'expo-notifications';

// Check permissions
const { status } = await Notifications.getPermissionsAsync();
console.log('Permission status:', status);

// Get token
const token = await Notifications.getExpoPushTokenAsync({
  projectId: 'your-project-id'
});
console.log('Expo Push Token:', token.data);

// Test with Expo Push API
const response = await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: token.data,
    title: 'Test',
    body: 'Hello from Expo!'
  })
});
const result = await response.json();
console.log('Push result:', result);
```

### Payload Validation

Validate your payload structure:

```javascript
function validateFCMPayload(payload) {
  const errors = [];

  // Check token
  if (!payload.token && !payload.topic && !payload.condition) {
    errors.push('Missing target: token, topic, or condition required');
  }

  // Check data values are strings
  if (payload.data) {
    for (const [key, value] of Object.entries(payload.data)) {
      if (typeof value !== 'string') {
        errors.push(`data.${key} must be string, got ${typeof value}`);
      }
    }
  }

  // Check notification payload
  if (payload.notification) {
    if (!payload.notification.title && !payload.notification.body) {
      errors.push('notification requires title or body');
    }
  }

  // Check priority for Android background
  if (payload.data && !payload.notification) {
    if (!payload.android?.priority || payload.android.priority !== 'high') {
      errors.push('data-only messages need android.priority: "high" for background delivery');
    }
  }

  return errors.length ? errors : null;
}
```

## Common Pitfalls

### 1. Testing on Simulator

**Problem:** iOS Simulator doesn't support push notifications.

**Solution:** Use physical device for testing.

### 2. Wrong Environment

**Problem:** Using development token with production APNs or vice versa.

**Solution:** Match token environment with APNs environment (sandbox vs production).

### 3. Not Checking Error Responses

**Problem:** Ignoring error responses from FCM.

**Solution:** Always check and log error codes.

### 4. Testing Without Proper Logging

**Problem:** No visibility into what's happening.

**Solution:** Add comprehensive logging at each step.

## Related Rules

- [message-data-vs-notification.md](./message-data-vs-notification.md) - Payload type differences
- [ios-apns-auth-key.md](./ios-apns-auth-key.md) - APNs configuration
- [android-notification-channel.md](./android-notification-channel.md) - Channel setup
- [token-invalidation.md](./token-invalidation.md) - Handle invalid tokens

## References

- [Firebase: Test FCM Messages](https://firebase.google.com/docs/cloud-messaging/server#send_to_a_topic)
- [Firebase: Debug FCM Messages](https://firebase.google.com/docs/cloud-messaging/understand-delivery)
- [Apple: Testing Notifications](https://developer.apple.com/documentation/usernotifications/testing_notifications_using_the_push_notification_console)
