---
title: Deep Link in Terminated State
impact: MEDIUM
tags: deeplink, terminated, cold-start, sharedpreferences
platforms: android
---

# Deep Link in Terminated State

Handle deep links when app is completely terminated (cold start).

## Quick Pattern

**Problem:** JavaScript engine not ready when deep link arrives

**Solution:**

**Native (Android):**
```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    val deepLink = intent.getStringExtra("link")
    if (deepLink != null) {
        getSharedPreferences("app_prefs", MODE_PRIVATE)
            .edit()
            .putString("pending_deep_link", deepLink)
            .apply()
    }
}
```

**JavaScript:**
```javascript
useEffect(() => {
  const checkPendingDeepLink = async () => {
    const link = await AsyncStorage.getItem('pending_deep_link');
    if (link) {
      await AsyncStorage.removeItem('pending_deep_link');
      Linking.openURL(link);
    }
  };
  setTimeout(checkPendingDeepLink, 500);
}, []);
```

## Related Rules

- [deeplink-navigation-conflict.md](./deeplink-navigation-conflict.md)
