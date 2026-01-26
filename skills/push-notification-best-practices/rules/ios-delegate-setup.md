---
title: UNUserNotificationCenter Delegate Setup
impact: CRITICAL
tags: ios, delegate, notifications, usernotificationcenter
platforms: ios
---

# UNUserNotificationCenter Delegate Setup

Configure the UNUserNotificationCenter delegate correctly to handle push notifications, custom actions, and notification presentation options.

## Table of Contents
- [Quick Pattern](#quick-pattern)
- [When to Apply](#when-to-apply)
- [Deep Dive](#deep-dive)
- [Common Pitfalls](#common-pitfalls)
- [Related Rules](#related-rules)
- [References](#references)

## Quick Pattern

**Incorrect: Delegate not set or set too late**

```swift
func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

    FirebaseApp.configure() // ❌ Firebase initialized first
    SomeSDK.initialize()    // ❌ Other SDKs initialized

    // ❌ Delegate set after other SDKs - may be overridden
    UNUserNotificationCenter.current().delegate = self

    return true
}
```

**Correct: Delegate set first, before any SDK initialization**

```swift
func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

    // ✅ Set delegate FIRST, before any SDK initialization
    UNUserNotificationCenter.current().delegate = self

    // Now safe to initialize other SDKs
    FirebaseApp.configure()
    SomeSDK.initialize()

    return true
}
```

## When to Apply

- **Push notification click events are not handled**
- **Custom notification actions don't trigger callbacks**
- **Foreground notifications don't display as expected**
- **Delegate methods (willPresent, didReceive) are never called**
- **Integrating multiple SDKs** that handle push notifications (Firebase, Braze, custom SDK)

## Deep Dive

### Why This Matters

The `UNUserNotificationCenter` delegate receives all notification-related events:
- When a notification is about to be displayed (foreground)
- When a user taps a notification
- When a user selects a custom action

If the delegate is not set, **none of these events will be handled**, resulting in:
- Notifications not showing in foreground
- Deep links not opening
- Analytics not tracking notification interactions
- Custom actions not executing

### 7 Common Reasons Delegate Methods Don't Get Called

#### 1. Delegate Not Set (Most Common)

**Problem:**
```swift
// ❌ Forgot to set delegate
func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    FirebaseApp.configure()
    return true
    // Missing: UNUserNotificationCenter.current().delegate = self
}
```

**Solution:**
```swift
// ✅ Set delegate in didFinishLaunchingWithOptions
func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    UNUserNotificationCenter.current().delegate = self
    FirebaseApp.configure()
    return true
}
```

#### 2. Method Swizzling Interference

**Problem:** Firebase, Braze, or other SDKs use Method Swizzling to intercept notification events.

**How It Works:**
```swift
// Your AppDelegate
func userNotificationCenter(...) {
    print("My handler") // ❌ Never executes if SDK "steals" the call
}

// SDK's swizzled method runs instead
```

**Detection:**
```swift
func userNotificationCenter(_ center: UNUserNotificationCenter,
                           didReceive response: UNNotificationResponse,
                           withCompletionHandler completionHandler: @escaping () -> Void) {
    print("🔔 Delegate called!") // Add this log or breakpoint
    // If this never prints, another SDK is intercepting
    completionHandler()
}
```

**Solution Option 1: Disable Firebase Swizzling**

`Info.plist`:
```xml
<key>FirebaseAppDelegateProxyEnabled</key>
<false/>
```

Then manually forward APNS token:
```swift
func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Messaging.messaging().apnsToken = deviceToken
}
```

**Solution Option 2: Set Delegate Before SDK Init**
```swift
func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // ✅ Set delegate FIRST
    UNUserNotificationCenter.current().delegate = self

    // Then initialize SDKs
    FirebaseApp.configure()

    return true
}
```

#### 3. CompletionHandler Not Called

**Problem:** If you don't call the completion handler, **future notifications are blocked**.

```swift
func userNotificationCenter(_ center: UNUserNotificationCenter,
                           didReceive response: UNNotificationResponse,
                           withCompletionHandler completionHandler: @escaping () -> Void) {
    handleNotification(response)
    // ❌ Forgot to call completionHandler()
}
```

**System Warning:**
```
UNUserNotificationCenter delegate received call but the completion handler was never called
```

**Solution:**
```swift
func userNotificationCenter(_ center: UNUserNotificationCenter,
                           didReceive response: UNNotificationResponse,
                           withCompletionHandler completionHandler: @escaping () -> Void) {
    // ✅ Option 1: Use defer to guarantee execution
    defer { completionHandler() }

    handleNotification(response)
}

// OR

func userNotificationCenter(_ center: UNUserNotificationCenter,
                           didReceive response: UNNotificationResponse,
                           withCompletionHandler completionHandler: @escaping () -> Void) {
    handleNotification(response)

    // ✅ Option 2: Call at the end
    completionHandler()
}
```

#### 4. Firebase + Custom SDK Delegate Conflict

**Problem:** Both Firebase Messaging and a custom SDK (e.g., Notifly, Clix) try to set delegates.

```swift
// ❌ Bad: SDK sets Firebase Messaging delegate
func setFirebaseMessaging(_ application: UIApplication) {
    Messaging.messaging().delegate = self // Conflicts with UNUserNotificationCenter
    UNUserNotificationCenter.current().delegate = self
}
```

**Solution:** Only set UNUserNotificationCenter delegate, not Messaging delegate:

```swift
// ✅ Good: Only set UNUserNotificationCenter delegate
func setFirebaseMessaging(_ application: UIApplication) {
    // Remove Messaging.messaging().delegate = self

    UNUserNotificationCenter.current().delegate = self

    let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]
    UNUserNotificationCenter.current().requestAuthorization(options: authOptions) { _, _ in
        DispatchQueue.main.async {
            application.registerForRemoteNotifications()
        }
    }
}
```

#### 5. iOS Version Compatibility

**Problem:** Using iOS 10+ APIs on iOS 9 devices.

**Solution:**
```swift
func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

    if #available(iOS 10.0, *) {
        // ✅ iOS 10+: Use UNUserNotificationCenter
        UNUserNotificationCenter.current().delegate = self
    } else {
        // Legacy iOS 9: Use UIApplication delegate methods
    }

    return true
}
```

#### 6. Invalid Payload (SDK-Specific)

**Problem:** Some SDKs (Notifly, Clix) require specific payload fields.

**Missing required field:**
```json
{
  "aps": {
    "alert": {"title": "Title", "body": "Body"}
  }
  // ❌ Missing: "notifly_message_type" or "gcm.message_id"
}
```

**Solution:** Include required fields in payload:
```json
{
  "aps": {
    "alert": {"title": "Title", "body": "Body"},
    "sound": "default"
  },
  "notifly_message_type": "push-notification",
  "gcm.message_id": "1234567890"
}
```

#### 7. Multiple Push Libraries Conflict

**Problem:** Multiple push notification libraries installed simultaneously:

- `react-native-push-notification`
- `@react-native-community/push-notification-ios`
- `@react-native-firebase/messaging`
- `react-native-notifications` (Wix)

**Solution:**
1. **Remove unused libraries:**
```bash
npm uninstall react-native-push-notification
npm uninstall @react-native-community/push-notification-ios
```

2. **Use only one library** for push notifications
3. **If needed, write custom native module** instead of mixing libraries

### Recommended Diagnostic Procedure

```swift
// 1. Add logging to verify delegate is called
func userNotificationCenter(_ center: UNUserNotificationCenter,
                           didReceive response: UNNotificationResponse,
                           withCompletionHandler completionHandler: @escaping () -> Void) {
    print("✅ userNotificationCenter didReceive called")
    print("Notification identifier: \(response.notification.request.identifier)")
    print("User info: \(response.notification.request.content.userInfo)")

    defer { completionHandler() }

    // Your logic here
}

func userNotificationCenter(_ center: UNUserNotificationCenter,
                           willPresent notification: UNNotification,
                           withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    print("✅ userNotificationCenter willPresent called")

    completionHandler([.banner, .sound, .badge])
}
```

## Common Pitfalls

### Early Return Blocks Subsequent Logic

```swift
// ❌ Bad: Early return prevents SDK logic from executing
func userNotificationCenter(...) {
    if someCondition {
        completionHandler()
        return // ← SDK logic below won't execute!
    }

    // Custom SDK processing
    customSDK.handleNotification(...)
}
```

```swift
// ✅ Good: Handle all cases
func userNotificationCenter(...) {
    defer { completionHandler() }

    if someCondition {
        handleSpecialCase()
    }

    // Always execute SDK logic
    customSDK.handleNotification(...)
}
```

### Delegate Set in Wrong Lifecycle Method

```swift
// ❌ Bad: Setting delegate in viewDidLoad (too late)
override func viewDidLoad() {
    super.viewDidLoad()
    UNUserNotificationCenter.current().delegate = self
}
```

```swift
// ✅ Good: Set in didFinishLaunchingWithOptions (early enough)
func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    UNUserNotificationCenter.current().delegate = self
    return true
}
```

## Related Rules

- [ios-apns-auth-key.md](./ios-apns-auth-key.md) - APNs authentication setup
- [ios-foreground-display.md](./ios-foreground-display.md) - Display notifications in foreground
- [ios-method-swizzling.md](./ios-method-swizzling.md) - Managing Method Swizzling
- [message-foreground-handler.md](./message-foreground-handler.md) - Cross-platform foreground handling

## References

- [Apple: UNUserNotificationCenterDelegate](https://developer.apple.com/documentation/usernotifications/unusernotificationcenterdelegate)
- [Firebase: Method Swizzling](https://firebase.google.com/docs/cloud-messaging/ios/client#method_swizzling_in)
