---
title: FCM Priority High for Doze Mode
impact: HIGH
tags: android, fcm, priority, doze-mode, background
platforms: android
---

# FCM Priority High for Doze Mode

Set FCM message priority to `high` to ensure background message handlers execute on Android devices in Doze mode.

## Table of Contents
- [Quick Pattern](#quick-pattern)
- [When to Apply](#when-to-apply)
- [Deep Dive](#deep-dive)
- [Common Pitfalls](#common-pitfalls)
- [Related Rules](#related-rules)
- [References](#references)

## Quick Pattern

**Incorrect: Default or normal priority**

```javascript
// ❌ Background handler won't run in Doze mode
const message = {
  notification: {title: 'Title', body: 'Body'},
  data: {key: 'value'},
  // Missing: android.priority = 'high'
  token: fcmToken
};

await admin.messaging().send(message);
```

```
Error: android.app.BackgroundServiceStartNotAllowedException:
Not allowed to start service Intent: app is in background
```

**Correct: Priority set to high**

```javascript
// ✅ Background handler runs even in Doze mode
const message = {
  data: {title: 'Title', body: 'Body'},
  android: {
    priority: 'high' // ✅ Required for Doze mode
  },
  token: fcmToken
};

await admin.messaging().send(message);
```

## When to Apply

- **Background message handler not called** on Android
- **Doze mode blocks notifications**
- **Error logs mention BackgroundServiceStartNotAllowedException**
- **Notifications work when app is active** but fail in background

## Deep Dive

### Why This Matters

Android 6.0+ introduced **Doze mode** to save battery. When device is idle:
- Network access is disabled
- Wake locks ignored
- Background services restricted
- **Standard priority messages are blocked**

Only **high priority** FCM messages can bypass Doze mode restrictions.

### Firebase Official Guidance

> "Background messages only work if the message priority is set to 'high'"

Source: [Firebase Cloud Messaging Troubleshooting](https://firebase.google.com/docs/cloud-messaging/troubleshooting)

### Priority Levels

| Priority | Behavior | Doze Mode |
|----------|----------|-----------|
| `high` | Immediate delivery, wakes device | ✅ Works |
| `normal` | Delayed delivery | ❌ Blocked |
| `default` | Same as normal | ❌ Blocked |

### Server-Side Implementation

**Firebase Admin SDK (Node.js):**

```javascript
const admin = require('firebase-admin');

const message = {
  data: {
    title: 'New Message',
    body: 'You have a new message'
  },
  android: {
    priority: 'high' // ✅ Critical for Doze mode
  },
  token: deviceToken
};

await admin.messaging().send(message);
```

**Legacy FCM API:**

```json
{
  "to": "DEVICE_TOKEN",
  "priority": "high",
  "data": {
    "title": "New Message",
    "body": "You have a new message"
  }
}
```

### Use data-only Payload

Combine with data-only messages for reliable background processing:

```javascript
const message = {
  // ✅ data-only ensures onMessageReceived is called
  data: {
    title: 'Title',
    body: 'Body',
    action: 'open_chat'
  },
  android: {
    priority: 'high' // ✅ Ensures delivery in Doze mode
  },
  token: fcmToken
};
```

See [message-data-vs-notification.md](./message-data-vs-notification.md) for details.

## Common Pitfalls

### 1. Overusing High Priority

**Problem:** Using `high` for all notifications.

**Consequence:** Google may classify app as spam, reducing delivery rates.

**Best Practice:**
- Use `high` only for time-sensitive messages (chats, calls, alerts)
- Use `normal` for newsletters, promotions, general updates

### 2. Using notification Payload with High Priority

**Problem:**
```javascript
// ⚠️ Suboptimal: notification payload with high priority
const message = {
  notification: {...},
  android: {priority: 'high'}
};
```

While this works, background handler still won't be called. Prefer data-only messages.

### 3. Client-Side Priority Setting

**Problem:** Trying to set priority in client app.

**Reality:** Priority is **server-side only** and cannot be controlled from the app.

## Related Rules

- [message-data-vs-notification.md](./message-data-vs-notification.md) - Use data-only messages
- [message-background-handler.md](./message-background-handler.md) - Implement background handler
- [android-messaging-service.md](./android-messaging-service.md) - FirebaseMessagingService setup

## References

- [Firebase: Message Priority](https://firebase.google.com/docs/cloud-messaging/concept-options#setting-the-priority-of-a-message)
- [Android: Optimize for Doze and App Standby](https://developer.android.com/training/monitoring-device-state/doze-standby)
