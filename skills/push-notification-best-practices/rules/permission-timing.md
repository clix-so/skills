---
title: Permission Request Timing Optimization
impact: HIGH
tags: permission, ux, acceptance-rate, timing
platforms: both
---

# Permission Request Timing Optimization

Optimize the timing of notification permission requests to maximize user acceptance rates.

## Table of Contents
- [Quick Pattern](#quick-pattern)
- [When to Apply](#when-to-apply)
- [Deep Dive](#deep-dive)
- [Common Pitfalls](#common-pitfalls)
- [Related Rules](#related-rules)
- [References](#references)

## Quick Pattern

**Incorrect: Immediate permission request on app launch**

```swift
// ❌ 15-20% acceptance rate
func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

    // User doesn't understand why they need notifications
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
        // Most users will deny
    }

    return true
}
```

**Correct: Context-aware permission request**

```swift
// ✅ 70-80% acceptance rate
class NotificationPermissionManager {

    func requestPermissionAfterUserAction() {
        // 1. Show pre-permission screen explaining value
        showPrePermissionScreen { userWantsNotifications in
            if userWantsNotifications {
                // 2. Now request actual permission
                UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
                    if granted {
                        DispatchQueue.main.async {
                            UIApplication.shared.registerForRemoteNotifications()
                        }
                    }
                }
            }
        }
    }

    private func showPrePermissionScreen(completion: @escaping (Bool) -> Void) {
        // Custom UI explaining notification benefits
        let alert = UIAlertController(
            title: "Stay Updated",
            message: "Get notified about important updates and messages.",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Enable Notifications", style: .default) { _ in
            completion(true)
        })
        alert.addAction(UIAlertAction(title: "Not Now", style: .cancel) { _ in
            completion(false)
        })
        // Present alert
    }
}
```

## When to Apply

- **Setting up permission request flow** for the first time
- **Low notification acceptance rates** (below 50%)
- **Users complaining about permission prompts**
- **Designing onboarding experience**
- **A/B testing permission timing**

## Deep Dive

### Acceptance Rate Statistics

| Request Timing | Acceptance Rate | User Experience |
|---------------|-----------------|-----------------|
| Immediate (app launch) | 15-20% | Poor - no context |
| After splash screen | 20-30% | Poor - still no context |
| After onboarding | 40-50% | Moderate - some understanding |
| After explaining value | 50-60% | Good - understands benefits |
| User-initiated action | 70-80% | Excellent - user chose to enable |

### Best Practices

#### 1. Pre-Permission Screen Pattern

Show a custom UI **before** the system permission dialog:

```javascript
// React Native example
import messaging from '@react-native-firebase/messaging';
import { Alert } from 'react-native';

async function requestNotificationPermission() {
  // Step 1: Show pre-permission screen
  return new Promise((resolve) => {
    Alert.alert(
      '🔔 Never Miss an Update',
      'Get notified when:\n• You receive new messages\n• Your order status changes\n• Special offers are available',
      [
        {
          text: 'Enable Notifications',
          onPress: async () => {
            // Step 2: Request actual permission
            const authStatus = await messaging().requestPermission();
            resolve(authStatus === messaging.AuthorizationStatus.AUTHORIZED);
          }
        },
        {
          text: 'Maybe Later',
          style: 'cancel',
          onPress: () => resolve(false)
        }
      ]
    );
  });
}
```

#### 2. Trigger on User Action

Request permission when user performs a related action:

```javascript
// When user subscribes to a topic
async function subscribeToTopic(topic) {
  const hasPermission = await checkNotificationPermission();

  if (!hasPermission) {
    // Contextual request - user understands why
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert('Notifications Disabled', 'You won\'t receive updates for this topic.');
      return;
    }
  }

  await messaging().subscribeToTopic(topic);
}

// When user enables a notification preference
async function enableOrderUpdates() {
  await requestNotificationPermissionWithContext(
    'Order Updates',
    'Get real-time updates about your order status, shipping, and delivery.'
  );
}
```

#### 3. Defer Until Value Demonstrated

Wait until the user has experienced the app's value:

```javascript
// Track user engagement
const engagementThreshold = 3; // e.g., 3 successful orders

async function checkEngagementAndPrompt(orderCount) {
  if (orderCount >= engagementThreshold) {
    const hasAsked = await AsyncStorage.getItem('notificationPromptShown');
    if (!hasAsked) {
      await AsyncStorage.setItem('notificationPromptShown', 'true');
      await requestNotificationPermissionWithContext(
        'Stay in the Loop',
        'You\'ve placed several orders! Enable notifications to track deliveries in real-time.'
      );
    }
  }
}
```

### Handling Denial

Once denied, you **cannot** re-request. Guide users to Settings:

```swift
func handleDeniedPermission() {
    let alert = UIAlertController(
        title: "Notifications Disabled",
        message: "To receive updates, please enable notifications in Settings.",
        preferredStyle: .alert
    )

    alert.addAction(UIAlertAction(title: "Open Settings", style: .default) { _ in
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    })

    alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))

    present(alert, animated: true)
}
```

```kotlin
// Android
fun handleDeniedPermission(context: Context) {
    AlertDialog.Builder(context)
        .setTitle("Notifications Disabled")
        .setMessage("To receive updates, please enable notifications in Settings.")
        .setPositiveButton("Open Settings") { _, _ ->
            val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
            }
            context.startActivity(intent)
        }
        .setNegativeButton("Cancel", null)
        .show()
}
```

### iOS Provisional Authorization (iOS 12+)

For non-critical notifications, use provisional authorization:

```swift
// No permission dialog - notifications delivered quietly
if #available(iOS 12.0, *) {
    let options: UNAuthorizationOptions = [.alert, .sound, .badge, .provisional]

    UNUserNotificationCenter.current().requestAuthorization(options: options) { granted, _ in
        // granted is always true for provisional
        // User can promote to prominent notifications later
    }
}
```

**Provisional notifications:**
- Delivered quietly to Notification Center
- No banner or sound
- User decides to keep or disable after seeing them

## Common Pitfalls

### 1. Asking Immediately on First Launch

**Problem:** Users deny because they don't understand the value.

**Solution:** Wait until user takes a relevant action or explain value first.

### 2. Not Tracking Permission State

**Problem:** Repeatedly showing pre-permission screen even after user decided.

**Solution:**
```javascript
async function smartPermissionRequest() {
  const settings = await messaging().getNotificationSettings();

  if (settings.authorizationStatus === messaging.AuthorizationStatus.NOT_DETERMINED) {
    // Can show pre-permission screen
    return requestWithPrePermission();
  } else if (settings.authorizationStatus === messaging.AuthorizationStatus.DENIED) {
    // Must redirect to Settings
    return redirectToSettings();
  }
  // Already authorized - no action needed
}
```

### 3. Ignoring User's "Not Now" Choice

**Problem:** Immediately asking again if user taps "Not Now" on pre-permission screen.

**Solution:** Respect the choice and wait for a natural re-engagement moment.

### 4. Not Providing Settings Redirect

**Problem:** After denial, user has no way to enable later.

**Solution:** Add "Enable Notifications" option in app settings with link to system Settings.

## Related Rules

- [ios-permission-request.md](./ios-permission-request.md) - iOS permission implementation
- [android-permission.md](./android-permission.md) - Android 13+ runtime permission
- [ios-delegate-setup.md](./ios-delegate-setup.md) - Delegate setup before registration

## References

- [Apple Human Interface Guidelines: Notifications](https://developer.apple.com/design/human-interface-guidelines/notifications)
- [OneSignal: Push Notification Opt-In Best Practices](https://onesignal.com/blog/push-notification-opt-in-best-practices/)
- [Clevertap: Push Notification Opt-In Rate Benchmarks](https://clevertap.com/blog/push-notification-opt-in-rate/)
