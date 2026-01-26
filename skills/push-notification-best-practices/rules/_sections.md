# Section Definitions

This file defines the rule categories for push notification best practices. Rules are automatically assigned to sections based on their filename prefix.

---

## 1. iOS Setup (ios)
**Impact:** CRITICAL
**Description:** APNs configuration, delegate setup, permission requests, and token registration for iOS push notifications.

## 2. Android Setup (android)
**Impact:** CRITICAL
**Description:** FCM configuration, notification channels, POST_NOTIFICATIONS permission, and FirebaseMessagingService for Android push notifications.

## 3. Token Management (token)
**Impact:** HIGH
**Description:** Token registration, refresh handling, and invalidation for reliable push delivery.

## 4. Message Handling (message)
**Impact:** HIGH
**Description:** Data vs notification payloads, background/foreground handlers, and message processing.

## 5. Deep Linking (deeplink)
**Impact:** MEDIUM
**Description:** Navigation from notifications, React Navigation conflicts, and terminated state handling.

## 6. Infrastructure (infra)
**Impact:** MEDIUM
**Description:** Firewall configuration, rate limiting, and Firebase Installation ID management.

## 7. Best Practices (permission)
**Impact:** HIGH
**Description:** Permission timing optimization and testing/debugging techniques.
