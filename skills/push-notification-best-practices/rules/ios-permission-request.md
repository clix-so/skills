---
title: iOS Notification Permission Request
impact: CRITICAL
tags: ios, permission, authorization, usernotifications
platforms: ios
---

# iOS Notification Permission Request

Request user permission to display notifications before registering for remote notifications on iOS.

## Table of Contents
- [Quick Pattern](#quick-pattern)
- [When to Apply](#when-to-apply)
- [Deep Dive](#deep-dive)
- [Common Pitfalls](#common-pitfalls)
- [Related Rules](#related-rules)
- [References](#references)

## Quick Pattern

**Incorrect: Registering without permission request**

```swift
// ❌ This will fail silently
func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

    // Skipped permission request!
    application.registerForRemoteNotifications()

    return true
}
```

**Correct: Request permission before registering**

```swift
// ✅ Request permission first
func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
        if granted {
            DispatchQueue.main.async {
                // ✅ Register only after permission granted
                application.registerForRemoteNotifications()
            }
        }
    }

    return true
}
```

## When to Apply

- **Setting up push notifications** for the first time
- **No permission dialog appears** when app launches
- **Notifications not appearing** despite having valid token
- **App Settings show notifications disabled**

## Deep Dive

### Why This Matters

iOS requires **explicit user permission** before displaying notifications. Without permission:

- **registerForRemoteNotifications() silently fails**
- **No APNS token is generated**
- **Notifications are blocked** at system level
- **User never sees notifications**

### Permission Flow

```
1. Request authorization → 2. User grants/denies → 3. Register for remote notifications → 4. Receive APNS token
```

### Authorization Options

```swift
let options: UNAuthorizationOptions = [
    .alert,   // ✅ Show notification banners
    .sound,   // ✅ Play notification sounds
    .badge,   // ✅ Update app icon badge
    .carPlay, // ⚠️ Only if supporting CarPlay
    .provisional // ⚠️ iOS 12+ quiet notifications
]
```

**Common combinations:**
- **Standard**: `.alert, .sound, .badge`
- **Silent**: `.badge` only
- **Provisional** (iOS 12+): `.provisional, .alert, .sound, .badge`

### Step-by-Step Implementation

#### 1. Request Authorization

```swift
import UIKit
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

        // ✅ Request notification permission
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error {
                print("❌ Permission request failed: \(error)")
                return
            }

            if granted {
                print("✅ Notification permission granted")
                DispatchQueue.main.async {
                    application.registerForRemoteNotifications()
                }
            } else {
                print("⚠️ User denied notification permission")
            }
        }

        return true
    }
}
```

#### 2. Check Current Authorization Status

```swift
func checkNotificationPermission() {
    UNUserNotificationCenter.current().getNotificationSettings { settings in
        switch settings.authorizationStatus {
        case .notDetermined:
            // User hasn't been asked yet - can request permission
            print("🔔 Permission not determined - can request")

        case .denied:
            // User explicitly denied - must go to Settings
            print("❌ Permission denied - redirect to Settings")
            self.showSettingsAlert()

        case .authorized:
            // User granted permission
            print("✅ Permission authorized")

        case .provisional:
            // iOS 12+ provisional authorization
            print("⚠️ Provisional authorization")

        case .ephemeral:
            // iOS 14+ ephemeral authorization (App Clips)
            print("⏱ Ephemeral authorization")

        @unknown default:
            break
        }
    }
}
```

#### 3. Redirect to Settings if Denied

Once denied, user must enable notifications in Settings app:

```swift
func showSettingsAlert() {
    let alert = UIAlertController(
        title: "Notifications Required",
        message: "Please enable notifications in Settings to receive push notifications.",
        preferredStyle: .alert
    )

    alert.addAction(UIAlertAction(title: "Open Settings", style: .default) { _ in
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    })

    alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))

    // Present alert (ensure you have view controller reference)
    self.window?.rootViewController?.present(alert, animated: true)
}
```

#### 4. Provisional Authorization (iOS 12+)

Deliver notifications quietly without asking permission upfront:

```swift
// iOS 12+ only
if #available(iOS 12.0, *) {
    let options: UNAuthorizationOptions = [.alert, .sound, .badge, .provisional]

    UNUserNotificationCenter.current().requestAuthorization(options: options) { granted, error in
        // With .provisional, granted is always true
        // Notifications delivered quietly to Notification Center

        DispatchQueue.main.async {
            application.registerForRemoteNotifications()
        }
    }
}
```

**Provisional notifications:**
- Delivered **quietly** (no sound/banner)
- Appear in **Notification Center** only
- User can promote to prominent later

### Complete Example with React Native

```swift
// AppDelegate.swift (React Native)
import UserNotifications
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

        // Set delegate first
        UNUserNotificationCenter.current().delegate = self

        // Request permission
        requestNotificationPermission(application: application)

        return true
    }

    func requestNotificationPermission(application: UIApplication) {
        let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]

        UNUserNotificationCenter.current().requestAuthorization(options: authOptions) { granted, error in
            if let error = error {
                print("Error requesting notification permission: \(error)")
                return
            }

            guard granted else {
                print("User denied notification permission")
                return
            }

            print("Notification permission granted")

            // Must register on main thread
            DispatchQueue.main.async {
                application.registerForRemoteNotifications()
            }
        }
    }

    // Called when APNS token is received
    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("✅ APNS Token: \(token)")

        // Forward to Firebase
        Messaging.messaging().apnsToken = deviceToken
    }

    // Called if registration fails
    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("❌ Failed to register for remote notifications: \(error)")
    }
}
```

### Timing of Permission Request

**Acceptance Rate by Timing:**

| Timing | Acceptance Rate | Recommendation |
|--------|-----------------|----------------|
| Immediate (app launch) | 15-20% | Avoid |
| After splash screen | 20-30% | Avoid |
| After onboarding | 40-50% | Acceptable |
| After explaining value | 50-60% | Good |
| User-initiated action | 70-80% | Best |

**Option 1: Request immediately on app launch**
```swift
// Acceptance rate: 15-20%
// Pros: Simple, works for most apps
// Cons: May surprise users, lower grant rate

func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    requestNotificationPermission(application: application)
    return true
}
```

**Option 2: Request after onboarding**
```swift
// Acceptance rate: 40-50%
// Pros: Higher grant rate, user understands value
// Cons: More complex, delayed notification setup

func completeOnboarding() {
    // User finished onboarding, now request permission
    requestNotificationPermission(application: UIApplication.shared)
}
```

**Option 3: Request when user enables feature (RECOMMENDED)**
```swift
// Acceptance rate: 70-80%
// Pros: Contextual, very high grant rate
// Cons: User may miss out on notifications initially

@IBAction func enableNotificationsButtonTapped() {
    requestNotificationPermission(application: UIApplication.shared)
}
```

### Pre-Permission UI Pattern

Show a custom screen **before** the system dialog to explain value:

```swift
class PrePermissionViewController: UIViewController {

    @IBAction func enableNotificationsTapped(_ sender: UIButton) {
        // User chose to enable - now show system dialog
        requestSystemPermission()
    }

    @IBAction func notNowTapped(_ sender: UIButton) {
        // User chose not to enable - respect their choice
        // Don't show system dialog, ask again later at appropriate moment
        dismiss(animated: true)
    }

    private func requestSystemPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            DispatchQueue.main.async {
                if granted {
                    UIApplication.shared.registerForRemoteNotifications()
                }
                self.dismiss(animated: true)
            }
        }
    }
}
```

**Benefits of Pre-Permission UI:**
- Filters out users who would deny anyway
- Provides context and value proposition
- Preserves the one-time system dialog for users who want notifications
- If user taps "Not Now", you can ask again later (system dialog not wasted)

## Common Pitfalls

### 1. Requesting Permission Multiple Times

**Problem:** Once user makes a decision, `requestAuthorization` won't show dialog again.

```swift
// ❌ Second call does nothing if user already decided
UNUserNotificationCenter.current().requestAuthorization(...) // Shows dialog
UNUserNotificationCenter.current().requestAuthorization(...) // No dialog, returns cached result
```

**Solution:** Check status before requesting:

```swift
UNUserNotificationCenter.current().getNotificationSettings { settings in
    if settings.authorizationStatus == .notDetermined {
        // Can request permission
        self.requestAuthorization()
    } else {
        // Already decided - redirect to Settings if needed
    }
}
```

### 2. Not Calling on Main Thread

**Problem:**
```swift
UNUserNotificationCenter.current().requestAuthorization(...) { granted, error in
    // ❌ This callback may be on background thread
    application.registerForRemoteNotifications() // Crash!
}
```

**Solution:**
```swift
UNUserNotificationCenter.current().requestAuthorization(...) { granted, error in
    if granted {
        DispatchQueue.main.async {
            // ✅ Always call on main thread
            application.registerForRemoteNotifications()
        }
    }
}
```

### 3. Forgetting to Handle Denial

**Problem:** User denies permission, app doesn't guide them.

**Solution:** Show alert directing to Settings app.

### 4. Not Setting Delegate Before Requesting

**Problem:** Permission granted but delegate not set → notifications not handled.

**Solution:**
```swift
// ✅ Set delegate BEFORE requesting permission
UNUserNotificationCenter.current().delegate = self
UNUserNotificationCenter.current().requestAuthorization(...)
```

### 5. Requesting Too Early (Poor UX)

**Problem:** Asking for permission before explaining why.

**Best Practice:**
1. Show value proposition first
2. Explain what notifications user will receive
3. Then request permission

## Related Rules

- [ios-delegate-setup.md](./ios-delegate-setup.md) - Set up notification delegate
- [ios-token-registration.md](./ios-token-registration.md) - Register APNS token
- [ios-apns-auth-key.md](./ios-apns-auth-key.md) - Configure APNs authentication

## References

- [Apple: Asking Permission to Use Notifications](https://developer.apple.com/documentation/usernotifications/asking_permission_to_use_notifications)
- [Apple: UNAuthorizationOptions](https://developer.apple.com/documentation/usernotifications/unauthorizationoptions)
