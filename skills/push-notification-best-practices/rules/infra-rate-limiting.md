---
title: Push Notification Rate Limiting
impact: MEDIUM
tags: rate-limit, throttling, expo, fcm, apns, 429-error
platforms: both
---

# Push Notification Rate Limiting

Implement rate limiting and retry logic for push notification sending to avoid service throttling.

## Table of Contents
- [Quick Pattern](#quick-pattern)
- [When to Apply](#when-to-apply)
- [Deep Dive](#deep-dive)
- [Common Pitfalls](#common-pitfalls)
- [Related Rules](#related-rules)
- [References](#references)

## Quick Pattern

**Incorrect: Sending all at once**

```javascript
// ❌ Send all at once - may hit rate limit
for (const token of tokens) {
  await sendPush(token);
}
```

**Correct: Batch and throttle**

```javascript
// ✅ Batch and throttle
const BATCH_SIZE = 100;
const RATE_LIMIT = 600; // per second

for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
  const batch = tokens.slice(i, i + BATCH_SIZE);

  try {
    await admin.messaging().sendMulticast({
      tokens: batch.map(t => t.token),
      notification: {title, body}
    });
  } catch (error) {
    if (error.statusCode === 429) {
      await sleep(1000); // Retry after delay
    }
  }

  await sleep(BATCH_SIZE / RATE_LIMIT * 1000);
}
```

## When to Apply

- **Sending notifications to large audiences** (1000+ devices)
- **Receiving 429 Too Many Requests errors**
- **Building notification broadcast systems**
- **Setting up scheduled notification jobs**

## Deep Dive

### Rate Limits by Service

| Service | Limit | Scope | Notes |
|---------|-------|-------|-------|
| **Expo Push** | 600/sec | Per project | Hard limit, returns 429 |
| **FCM (per device)** | ~240/min | Per device token | Excessive = throttled |
| **FCM (topic)** | 3,000/sec | Per topic | Can request increase |
| **FCM (multicast)** | 500 tokens | Per request | Batch into 500-token groups |
| **APNs** | ~5,000/sec | Per provider certificate | Varies by Apple's discretion |
| **APNs (per device)** | ~3/hour | Per device | Excessive = ignored |

### Expo Push Service

```javascript
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

async function sendExpoPushNotifications(messages) {
  // Expo recommends chunking messages
  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log('Tickets:', ticketChunk);
    } catch (error) {
      if (error.statusCode === 429) {
        // Rate limited - wait and retry
        console.log('Rate limited, waiting 1 second...');
        await sleep(1000);

        // Retry this chunk
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log('Retry tickets:', ticketChunk);
      }
    }

    // Throttle between chunks (600/sec limit)
    await sleep(100); // ~100ms between 100-message chunks
  }
}

// Process receipts later
async function checkReceipts(ticketIds) {
  const receiptIdChunks = expo.chunkPushNotificationReceiptIds(ticketIds);

  for (const chunk of receiptIdChunks) {
    const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

    for (const [id, receipt] of Object.entries(receipts)) {
      if (receipt.status === 'error') {
        console.error(`Error for ${id}:`, receipt.message);

        if (receipt.details?.error === 'DeviceNotRegistered') {
          // Remove invalid token
        }
      }
    }
  }
}
```

### Firebase Cloud Messaging

```javascript
const admin = require('firebase-admin');

async function sendFCMNotifications(tokens, notification) {
  const BATCH_SIZE = 500; // FCM multicast limit
  const results = [];

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);

    const message = {
      notification,
      tokens: batch
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      results.push(response);

      // Handle failures
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`Failed: ${batch[idx]}`, resp.error?.code);

            // Handle rate limiting
            if (resp.error?.code === 'messaging/too-many-requests') {
              console.log('Rate limited, backing off...');
            }
          }
        });
      }
    } catch (error) {
      if (error.code === 429 || error.message.includes('QUOTA_EXCEEDED')) {
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, Math.floor(i / BATCH_SIZE)), 32000);
        console.log(`Rate limited, waiting ${delay}ms...`);
        await sleep(delay);

        // Retry batch
        i -= BATCH_SIZE;
      }
    }

    // Throttle between batches
    await sleep(100);
  }

  return results;
}
```

### Exponential Backoff Pattern

```javascript
async function sendWithRetry(sendFn, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await sendFn();
    } catch (error) {
      if (error.statusCode === 429 || error.code === 'RATE_LIMITED') {
        const delay = Math.min(1000 * Math.pow(2, attempt), 32000);
        const jitter = Math.random() * 1000;

        console.log(`Rate limited. Retry ${attempt + 1}/${maxRetries} after ${delay + jitter}ms`);
        await sleep(delay + jitter);
      } else {
        throw error;
      }
    }
  }

  throw new Error('Max retries exceeded');
}
```

### Queue-Based Sending

For high-volume systems, use a queue:

```javascript
const Queue = require('bull');

const notificationQueue = new Queue('notifications', {
  limiter: {
    max: 500, // 500 jobs
    duration: 1000 // per second
  }
});

// Add jobs
async function queueNotification(userId, notification) {
  await notificationQueue.add({
    userId,
    notification
  });
}

// Process jobs
notificationQueue.process(async (job) => {
  const { userId, notification } = job.data;
  const tokens = await getTokensForUser(userId);

  await admin.messaging().sendEachForMulticast({
    tokens,
    notification
  });
});
```

### Per-Device Rate Limiting

Avoid spamming individual users:

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

// Limit to 3 notifications per hour per user
const userNotificationLimit = new Map();

async function canSendToUser(userId) {
  const key = `notification:${userId}`;
  const count = userNotificationLimit.get(key) || 0;

  if (count >= 3) {
    console.log(`User ${userId} rate limited (${count} notifications this hour)`);
    return false;
  }

  userNotificationLimit.set(key, count + 1);

  // Reset after 1 hour
  setTimeout(() => {
    userNotificationLimit.delete(key);
  }, 60 * 60 * 1000);

  return true;
}
```

## Common Pitfalls

### 1. Not Handling 429 Errors

**Problem:** Ignoring rate limit errors causes notifications to be lost.

**Solution:** Implement retry with exponential backoff.

### 2. Sending Too Fast

**Problem:** Sending 10,000 notifications instantly.

**Solution:** Batch and throttle to stay within limits.

### 3. No Per-User Limits

**Problem:** Spamming users with excessive notifications.

**Solution:** Implement per-user rate limiting (e.g., 3/hour).

### 4. Not Using Batching APIs

**Problem:** Sending one request per token.

```javascript
// ❌ 10,000 separate requests
for (const token of tokens) {
  await admin.messaging().send({ token, notification });
}
```

**Solution:**

```javascript
// ✅ 20 batched requests
const chunks = chunkArray(tokens, 500);
for (const chunk of chunks) {
  await admin.messaging().sendEachForMulticast({ tokens: chunk, notification });
}
```

## Related Rules

- [token-registration.md](./token-registration.md) - Token management
- [token-invalidation.md](./token-invalidation.md) - Remove invalid tokens
- [message-background-handler.md](./message-background-handler.md) - Background processing

## References

- [Expo Push Notification Limits](https://docs.expo.dev/push-notifications/sending-notifications/#rate-limits)
- [Firebase Cloud Messaging Limits](https://firebase.google.com/docs/cloud-messaging/concept-options#throttling)
- [APNs Best Practices](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/sending_notification_requests_to_apns)
