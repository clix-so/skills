---
title: APNs Authentication Key Setup
impact: CRITICAL
tags: ios, apns, authentication, firebase
platforms: ios
---

# APNs Authentication Key Setup

Configure Apple Push Notification service (APNS) authentication to enable iOS push notifications through Firebase Cloud Messaging.

## Table of Contents
- [Quick Pattern](#quick-pattern)
- [When to Apply](#when-to-apply)
- [Deep Dive](#deep-dive)
- [Common Pitfalls](#common-pitfalls)
- [Related Rules](#related-rules)
- [References](#references)

## Quick Pattern

**Incorrect: APNs key not configured or expired**

```
Error: [UNAUTHENTICATED] Auth error from APNS or Web Push Service
```

- Push notifications fail silently on iOS
- Firebase Console shows "Invalid APNs credentials"
- Production builds cannot receive notifications

**Correct: Valid APNs authentication key registered**

```swift
// Xcode: Signing & Capabilities → Push Notifications (enabled)
// Firebase Console: APNs key uploaded with correct Key ID and Team ID
// Result: iOS push notifications delivered successfully
```

## When to Apply

- **Setting up iOS push notifications for the first time**
- **Push notifications fail with UNAUTHENTICATED error**
- **Firebase Console indicates invalid APNs credentials**
- **Production builds don't receive notifications** (development builds work)
- **Migrating from .p12 certificates to .p8 authentication keys**

## Deep Dive

### Why This Matters

iOS push notifications require Apple's Push Notification service (APNS). Firebase Cloud Messaging uses your APNs authentication key to send notifications to iOS devices. Without a valid key:

- **All iOS push notifications fail**
- **No error visible to end users** (silent failure)
- **Development/testing may work** but production will fail

### Step-by-Step Setup

#### 1. Generate APNs Authentication Key

Visit [Apple Developer Console](https://developer.apple.com/account/resources/authkeys/list):

1. Navigate to **Keys** section
2. Click **+** button to create new key
3. Check **Apple Push Notifications service (APNs)**
4. Enter a **Key Name** (e.g., "MyApp Push Notifications")
5. Click **Continue** → **Register**
6. **Record the Key ID** (e.g., `ABC1234DEF`) - you'll need this
7. **Download the .p8 file** - **IMPORTANT**: Can only download once!

#### 2. Find Your Team ID

In Apple Developer Console:
1. Go to **Membership** page
2. Copy your **Team ID** (10-character alphanumeric)

#### 3. Upload to Firebase Console

Visit [Firebase Console](https://console.firebase.google.com/):

1. Select your project
2. Go to **Project Settings** (⚙️ icon)
3. Navigate to **Cloud Messaging** tab
4. Scroll to **Apple app configuration** section
5. Click **Upload** button
6. Select the `.p8` file you downloaded
7. Enter **Key ID** (from step 1.6)
8. Enter **Team ID** (from step 2.2)
9. Click **Upload**

#### 4. Enable Push Notifications in Xcode

Open your Xcode project:

1. Select your app target
2. Go to **Signing & Capabilities** tab
3. Click **+ Capability**
4. Select **Push Notifications**
5. Verify the capability is enabled (no warnings)

### Development vs Production Environments

Apple maintains separate APNs environments:

| Environment | When Used | Server |
|-------------|-----------|--------|
| **Development** | Debug builds from Xcode | `api.sandbox.push.apple.com` |
| **Production** | TestFlight, App Store, Release builds | `api.push.apple.com` |

**Key Insight**: The same APNs authentication key works for **both** environments. Firebase automatically routes notifications to the correct server based on your app's build configuration.

### Verifying Setup

**Test with Firebase Console:**

1. Go to **Cloud Messaging** in Firebase Console
2. Click **Send test message**
3. Enter a test FCM token
4. Send notification
5. Verify delivery on iOS device

**Check Xcode logs:**

```swift
func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    print("✅ APNS Token registered: \(token)")
}

func application(_ application: UIApplication,
                 didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("❌ APNS registration failed: \(error)")
}
```

## Common Pitfalls

### 1. Using Expired or Wrong Key

**Problem:**
```
[UNAUTHENTICATED] Auth error from APNS or Web Push Service
```

**Solution:**
- Verify Key ID matches the .p8 file uploaded
- Check Team ID is correct
- Ensure key hasn't been revoked in Apple Developer Console
- Generate new key if needed (old one can be deleted)

### 2. Wrong Environment

**Problem:** Development builds receive notifications, production builds don't.

**Solution:**
- Verify you're testing with a **production build** (not debug)
- Use TestFlight or archive build for testing
- Check build configuration in Xcode

### 3. Missing Push Notifications Capability

**Problem:** No error, but notifications never arrive.

**Solution:**
```
Xcode → Signing & Capabilities → + Capability → Push Notifications
```

Verify capability is present and no warnings appear.

### 4. Forgot to Download .p8 File

**Problem:** Created key but never downloaded the .p8 file.

**Solution:**
- Apple only allows **one-time download** of .p8 files
- If lost, you must **delete the old key** and **create a new one**
- Download immediately and store securely

### 5. Using .p12 Certificate Instead of .p8 Key

**Problem:** Following outdated tutorials using .p12 certificates.

**Solution:**
- Apple **deprecated .p12 certificates** in favor of .p8 authentication keys
- .p8 keys **don't expire** (unlike certificates which expire yearly)
- Migrate to .p8 for better reliability

## Related Rules

- [ios-delegate-setup.md](./ios-delegate-setup.md) - Configure notification delegate
- [ios-permission-request.md](./ios-permission-request.md) - Request user permission
- [ios-token-registration.md](./ios-token-registration.md) - Register APNS tokens
- [android-google-services.md](./android-google-services.md) - Android equivalent (FCM setup)

## References

- [Apple Developer: Creating APNs Authentication Key](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/establishing_a_token-based_connection_to_apns)
- [Firebase: FCM Setup for iOS](https://firebase.google.com/docs/cloud-messaging/ios/client)
