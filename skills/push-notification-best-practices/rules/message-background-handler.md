---
title: Background Message Handler
impact: HIGH
tags: background, handler, data-message, priority
platforms: both
---

# Background Message Handler

Implement background message handlers that work reliably in all app states.

## Quick Pattern

**Incorrect:**
```javascript
// ❌ notification payload - background handler not called
const message = {
  notification: {title: 'Title'},
  token: token
};
```

**Correct:**
```javascript
// ✅ data-only + priority high
const message = {
  data: {title: 'Title', body: 'Body'},
  android: {priority: 'high'},
  token: token
};
```

## When to Apply

- Background messages not being processed
- Doze mode blocks notifications
- Need to update app state without user interaction

## Related Rules

- [message-data-vs-notification.md](./message-data-vs-notification.md)
- [android-priority-high.md](./android-priority-high.md)
