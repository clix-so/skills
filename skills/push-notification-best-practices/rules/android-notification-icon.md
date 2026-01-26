---
title: Android Notification Icon Setup
impact: MEDIUM
tags: android, icon, notification, lollipop, monochrome
platforms: android
---

# Android Notification Icon Setup

Configure notification icons to display correctly on Android 5.0+.

## Quick Pattern

**Incorrect: Colored icon**
- Icon shows as gray/white square

**Correct: Transparent background + white icon**

```xml
<!-- AndroidManifest.xml -->
<meta-data
    android:name="com.google.firebase.messaging.default_notification_icon"
    android:resource="@drawable/ic_notification" />
<meta-data
    android:name="com.google.firebase.messaging.default_notification_color"
    android:resource="@color/notification_color" />
```

## Requirements

- Background: Transparent
- Icon: Pure white (#FFFFFF)
- Format: PNG
- Sizes: mdpi (24x24), hdpi (36x36), xhdpi (48x48), xxhdpi (72x72), xxxhdpi (96x96)

## Related Rules

- [android-notification-channel.md](./android-notification-channel.md)
