# Platform Implementation Guides

Read this before Step 4 (Implementation). Each section covers the notification APIs, scheduling patterns, and gotchas for a specific platform.

---

## iOS (Swift / UNUserNotificationCenter)

### Core API

iOS uses `UNUserNotificationCenter` for all local notifications. Key classes:

- `UNMutableNotificationContent` — the notification payload (title, body, sound, badge)
- `UNTimeIntervalNotificationTrigger` — fires after a time interval
- `UNCalendarNotificationTrigger` — fires at a specific date/time
- `UNNotificationRequest` — wraps content + trigger with an identifier

### Permission Request

```swift
UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
    // Handle result
}
```

Request permission at a meaningful moment — after the user has experienced the app's value, not on first launch. A good pattern is to ask after the user completes their first meaningful action (e.g., finishes setting up a profile, completes a first task).

### Scheduling a Notification

```swift
let content = UNMutableNotificationContent()
content.title = "Your plan is ready, \(userName)!"
content.body = "Let's get started — your first session takes just 15 minutes."
content.sound = .default

// Fire in 2 hours
let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 7200, repeats: false)
let request = UNNotificationRequest(identifier: "first-workout-1", content: content, trigger: trigger)

UNUserNotificationCenter.current().add(request)
```

### Cancelling Notifications

```swift
// Cancel specific notifications by ID
UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["first-workout-1", "first-workout-2"])

// Cancel all pending (use sparingly)
UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
```

### Delivery Window (Quiet Hours) Pattern

To respect quiet hours, calculate the delivery time and defer if needed:

```swift
func scheduleWithDeliveryWindow(
    identifier: String,
    content: UNMutableNotificationContent,
    desiredFireDate: Date,
    windowStart: Int,  // hour 0-23
    windowEnd: Int     // hour 0-23
) {
    let calendar = Calendar.current
    let hour = calendar.component(.hour, from: desiredFireDate)

    var fireDate = desiredFireDate
    if hour < windowStart {
        // Too early — defer to window start today
        fireDate = calendar.date(bySettingHour: windowStart, minute: 0, second: 0, of: desiredFireDate)!
    } else if hour >= windowEnd {
        // Too late — defer to window start tomorrow
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: desiredFireDate)!
        fireDate = calendar.date(bySettingHour: windowStart, minute: 0, second: 0, of: tomorrow)!
    }

    let interval = fireDate.timeIntervalSinceNow
    guard interval > 0 else { return }

    let trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
    let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)
    UNUserNotificationCenter.current().add(request)
}
```

### iOS Gotchas

- Maximum 64 pending local notifications per app. Plan accordingly if you have many campaigns.
- Notification identifiers must be unique. Use the campaign message IDs from the JSON schema.
- Time interval triggers must be at least 60 seconds.
- `UNCalendarNotificationTrigger` uses `DateComponents` — useful for "every day at 9am" style recurring notifications.
- Test with the simulator: notifications appear in the notification center but don't show banners in simulator. Use a real device for full testing.
- Use `UNUserNotificationCenter.current().getPendingNotificationRequests` to debug what's scheduled.

### Recommended File Structure

```
YourApp/
├── Notifications/
│   ├── CampaignNotificationManager.swift    // Central scheduling + cancellation
│   ├── CampaignDefinitions.swift            // Campaign data (messages, timing)
│   └── NotificationPermissionHandler.swift  // Permission request logic
```

---

## Android (Kotlin / WorkManager + NotificationManager)

### Core API

Android uses `NotificationManager` to display notifications and `WorkManager` or `AlarmManager` to schedule them. For campaign-style delayed notifications, `WorkManager` is preferred because it survives app restarts and respects Doze mode.

Key classes:

- `NotificationCompat.Builder` — builds the notification
- `NotificationChannel` — required for Android 8+ (Oreo), groups notifications by type
- `WorkManager` + `OneTimeWorkRequest` — schedules delayed work
- `Worker` — the unit of work that fires the notification

### Notification Channel Setup

Required for Android 8+. Create channels at app startup (e.g., in `Application.onCreate()`):

```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
    val channel = NotificationChannel(
        "campaigns",
        "Engagement Campaigns",
        NotificationManager.IMPORTANCE_DEFAULT
    ).apply {
        description = "Personalized reminders and tips"
    }
    val manager = getSystemService(NotificationManager::class.java)
    manager.createNotificationChannel(channel)
}
```

### Permission Request (Android 13+)

```kotlin
// In AndroidManifest.xml
// <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

// At runtime (Android 13+)
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    ActivityCompat.requestPermissions(
        this,
        arrayOf(Manifest.permission.POST_NOTIFICATIONS),
        NOTIFICATION_PERMISSION_REQUEST_CODE
    )
}
```

### Scheduling with WorkManager

```kotlin
val data = workDataOf(
    "notification_id" to "first-workout-1",
    "title" to "Your plan is ready, $userName!",
    "body" to "Let's get started — your first session takes just 15 minutes."
)

val workRequest = OneTimeWorkRequestBuilder<CampaignNotificationWorker>()
    .setInitialDelay(2, TimeUnit.HOURS)
    .setInputData(data)
    .addTag("campaign-first-workout")
    .build()

WorkManager.getInstance(context).enqueueUniqueWork(
    "first-workout-1",
    ExistingWorkPolicy.REPLACE,
    workRequest
)
```

### Worker Implementation

```kotlin
class CampaignNotificationWorker(
    context: Context,
    params: WorkerParameters
) : Worker(context, params) {

    override fun doWork(): Result {
        val title = inputData.getString("title") ?: return Result.failure()
        val body = inputData.getString("body") ?: return Result.failure()
        val notificationId = inputData.getString("notification_id") ?: return Result.failure()

        // Check quiet hours
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        if (hour < 9 || hour >= 21) {
            // Reschedule for 9am
            // ... (reschedule logic)
            return Result.success()
        }

        // Check cancel condition (e.g., user already completed action)
        if (shouldCancelCampaign(notificationId)) {
            return Result.success()
        }

        showNotification(title, body, notificationId.hashCode())
        return Result.success()
    }
}
```

### Cancelling Campaigns

```kotlin
// Cancel all work with a campaign tag
WorkManager.getInstance(context).cancelAllWorkByTag("campaign-first-workout")

// Cancel specific work
WorkManager.getInstance(context).cancelUniqueWork("first-workout-1")
```

### Android Gotchas

- `WorkManager` has a minimum delay of ~15 minutes due to battery optimization. For shorter delays, use `AlarmManager` with `setExactAndAllowWhileIdle()`.
- Notification channels cannot be modified after creation (except name and description). Plan channel strategy carefully.
- On some OEM skins (Xiaomi, Huawei, Samsung), background work may be killed aggressively. Add a note for users to disable battery optimization for the app if notifications aren't arriving.
- `WorkManager` constraints: Don't add `NetworkType.CONNECTED` constraint for local notifications — they don't need internet.
- Notification IDs (the int passed to `notify()`) must be unique per active notification. Using `hashCode()` on the string ID is a common pattern.

### Recommended File Structure

```
app/src/main/java/com/yourapp/
├── notifications/
│   ├── CampaignNotificationManager.kt     // Central scheduling + cancellation
│   ├── CampaignNotificationWorker.kt      // Worker that fires notifications
│   ├── CampaignDefinitions.kt             // Campaign data
│   └── NotificationChannelSetup.kt        // Channel creation
```

---

## Flutter (Dart / flutter_local_notifications)

### Core Package

Use the `flutter_local_notifications` package. Add to `pubspec.yaml`:

```yaml
dependencies:
  flutter_local_notifications: ^18.0.0
  timezone: ^0.10.0
```

### Initialization

```dart
final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
    FlutterLocalNotificationsPlugin();

Future<void> initNotifications() async {
  const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
  const iosSettings = DarwinInitializationSettings(
    requestAlertPermission: false,  // We'll request later
    requestBadgePermission: false,
    requestSoundPermission: false,
  );

  const settings = InitializationSettings(
    android: androidSettings,
    iOS: iosSettings,
  );

  await flutterLocalNotificationsPlugin.initialize(settings);
}
```

### Permission Request

```dart
Future<bool> requestPermission() async {
  if (Platform.isIOS) {
    final result = await flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()
        ?.requestPermissions(alert: true, badge: true, sound: true);
    return result ?? false;
  } else if (Platform.isAndroid) {
    final plugin = flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    final result = await plugin?.requestNotificationsPermission();
    return result ?? false;
  }
  return false;
}
```

### Scheduling a Notification

```dart
import 'package:timezone/timezone.dart' as tz;

Future<void> scheduleNotification({
  required int id,
  required String title,
  required String body,
  required Duration delay,
  int windowStartHour = 9,
  int windowEndHour = 21,
}) async {
  var scheduledDate = tz.TZDateTime.now(tz.local).add(delay);

  // Respect delivery window
  if (scheduledDate.hour < windowStartHour) {
    scheduledDate = tz.TZDateTime(
      tz.local, scheduledDate.year, scheduledDate.month, scheduledDate.day,
      windowStartHour,
    );
  } else if (scheduledDate.hour >= windowEndHour) {
    final nextDay = scheduledDate.add(const Duration(days: 1));
    scheduledDate = tz.TZDateTime(
      tz.local, nextDay.year, nextDay.month, nextDay.day,
      windowStartHour,
    );
  }

  const androidDetails = AndroidNotificationDetails(
    'campaigns',
    'Engagement Campaigns',
    channelDescription: 'Personalized reminders and tips',
    importance: Importance.defaultImportance,
    priority: Priority.defaultPriority,
  );

  const details = NotificationDetails(
    android: androidDetails,
    iOS: DarwinNotificationDetails(),
  );

  await flutterLocalNotificationsPlugin.zonedSchedule(
    id,
    title,
    body,
    scheduledDate,
    details,
    androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
    matchDateTimeComponents: null,
  );
}
```

### Cancelling Notifications

```dart
// Cancel specific notification
await flutterLocalNotificationsPlugin.cancel(notificationId);

// Cancel all
await flutterLocalNotificationsPlugin.cancelAll();
```

### Flutter Gotchas

- Initialize timezone data with `tz.initializeTimeZones()` before scheduling.
- On Android, the `@mipmap/ic_launcher` must exist; otherwise notifications silently fail.
- `zonedSchedule` requires the `timezone` package and proper timezone initialization.
- The notification ID is an `int` — use a consistent mapping from your string campaign message IDs to integers (e.g., hash or sequential).
- iOS requires the `UIBackgroundModes` audio capability for some notification features. Check `Info.plist`.
- Test on both platforms — behavior differs significantly between iOS and Android.

### Recommended File Structure

```
lib/
├── notifications/
│   ├── campaign_notification_manager.dart    // Central scheduling + cancellation
│   ├── campaign_definitions.dart             // Campaign data
│   └── notification_permission.dart          // Permission handling
```

---

## React Native (Notifee / Expo Notifications)

### Which Library?

- **Notifee** (`@notifee/react-native`) — full-featured, works with bare React Native projects
- **Expo Notifications** (`expo-notifications`) — simpler API, works with Expo managed and bare workflows

Ask the user which they prefer. If they're using Expo, use `expo-notifications`. Otherwise, default to Notifee.

### Notifee Setup

```bash
npm install @notifee/react-native
cd ios && pod install
```

### Scheduling with Notifee

```typescript
import notifee, { TimestampTrigger, TriggerType } from "@notifee/react-native";

async function scheduleCampaignMessage(id: string, title: string, body: string, fireDate: Date) {
  // Create a channel (Android)
  const channelId = await notifee.createChannel({
    id: "campaigns",
    name: "Engagement Campaigns",
  });

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: fireDate.getTime(),
  };

  await notifee.createTriggerNotification(
    {
      id,
      title,
      body,
      android: { channelId },
    },
    trigger
  );
}
```

### Expo Notifications Setup

```bash
npx expo install expo-notifications
```

```typescript
import * as Notifications from "expo-notifications";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function scheduleCampaignMessage(
  id: string,
  title: string,
  body: string,
  delaySeconds: number
) {
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, sound: true },
    trigger: { type: "timeInterval", seconds: delaySeconds, repeats: false },
  });
}
```

### Permission Request

```typescript
// Notifee
import notifee from "@notifee/react-native";
const settings = await notifee.requestPermission();

// Expo
import * as Notifications from "expo-notifications";
const { status } = await Notifications.requestPermissionsAsync();
```

### Cancelling

```typescript
// Notifee — cancel by ID
await notifee.cancelTriggerNotification("first-workout-1");
// Cancel all campaign notifications by getting all triggers and filtering
const triggers = await notifee.getTriggerNotificationIds();

// Expo — cancel by identifier
await Notifications.cancelScheduledNotificationAsync("first-workout-1");
// Cancel all
await Notifications.cancelAllScheduledNotificationsAsync();
```

### React Native Gotchas

- Notifee requires a native rebuild after installation (`cd ios && pod install`).
- Expo managed workflow: `expo-notifications` handles most platform differences, but some advanced features (like notification categories/actions) require bare workflow.
- Android requires explicit channel creation; iOS ignores channels.
- Background/killed state: Notifee handles this well. Expo notifications work but may need `expo-task-manager` for background handling.
- Test with `adb shell dumpsys alarm` (Android) to verify scheduled alarms.

### Recommended File Structure

```
src/
├── notifications/
│   ├── campaignNotificationManager.ts    // Central scheduling + cancellation
│   ├── campaignDefinitions.ts            // Campaign data
│   └── notificationPermission.ts         // Permission handling
```

---

## Cross-Platform Implementation Principles

Regardless of platform, every implementation should follow these patterns:

1. **Idempotent scheduling**: Calling `scheduleCampaign()` multiple times with the same campaign should not create duplicate notifications. Use unique identifiers and replace-if-exists semantics.

2. **Persistent cancel tracking**: When a campaign is cancelled (user completed the action), persist this fact (e.g., in UserDefaults/SharedPreferences/AsyncStorage) so it survives app restarts.

3. **Campaign state machine**: Each campaign for each user is in one of these states: `not_started`, `active`, `completed` (goal achieved), `expired` (all messages sent, no conversion), `cancelled` (user opted out).

4. **Testability**: Make the "current time" injectable so you can test notification scheduling without waiting real hours/days. A `TimeProvider` protocol/interface is a clean pattern for this.

5. **Analytics hooks**: Even though these are local notifications, track when messages are scheduled, delivered, and when the user opens the app from a notification. This data helps refine campaigns later.
