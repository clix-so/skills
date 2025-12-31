# Clix SDK API Reference

Complete API documentation for Clix SDK across all platforms.

## Core Initialization

### Configuration

All platforms use a configuration object with these fields:

- `projectId` (required): Your Clix project ID
- `apiKey` (optional): Public API key for analytics-only mode
- `endpoint` (optional): Custom API endpoint URL
- `logLevel` (optional): Logging verbosity level
- `debug` (optional): Enable debug mode

### Initialization Methods

**iOS:**

```swift
Clix.initialize(config: ClixConfig)
```

**Android:**

```kotlin
Clix.initialize(context: Application, config: ClixConfig)
```

**React Native:**

```typescript
Clix.initialize(config);
```

## User Management

### Set User ID

Identify a user with a unique identifier:

**All Platforms:**

```swift/kotlin/typescript/javascript
Clix.setUserId("user-123")
```

### Remove User ID

Clear user identification:

**All Platforms:**

```swift/kotlin/typescript/javascript
Clix.removeUserId()
```

### Set User Property

Set a single user property:

**All Platforms:**

```swift/kotlin/typescript/javascript
Clix.setUserProperty("plan", "premium")
```

### Set Multiple User Properties

Set multiple properties at once:

**All Platforms:**

```swift/kotlin/typescript/javascript
Clix.setUserProperties({
  "plan": "premium",
  "trial_days": 7
})
```

### Remove User Property

Remove a user property:

**All Platforms:**

```swift/kotlin/typescript/javascript
Clix.removeUserProperty("plan")
```

## Event Tracking

### Track Event

Track a custom event:

**All Platforms:**

```swift/kotlin/typescript/javascript
Clix.trackEvent("button_clicked", {
  "button_name": "signup",
  "location": "header"
})
```

## Device Information

### Get Device ID

Retrieve the device identifier:

**All Platforms:**

```swift/kotlin/typescript/javascript
const deviceId = await Clix.getDeviceId()
```

### Get Push Token

Retrieve push notification token:

**All Platforms:**

```swift/kotlin/typescript
const token = await Clix.Notification.getToken()
```

## Error Handling

All SDK methods include error handling:

**iOS:**

```swift
do {
    try Clix.initialize(config: config)
} catch {
    print("Clix initialization failed: \(error)")
}
```

**Android:**

```kotlin
try {
    Clix.initialize(this, config)
} catch (e: Exception) {
    Log.e("Clix", "Initialization failed", e)
}
```

**JavaScript/TypeScript:**

```typescript
try {
  await Clix.initialize(config);
} catch (error) {
  console.error("Clix initialization failed:", error);
}
```

## Platform-Specific Notes

### iOS

- Requires iOS 14+
- Swift 5.5+ for async/await support
- Thread-safe implementation
- Supports both CocoaPods and Swift Package Manager

### Android

- Requires Android API 21+ (Android 5.0)
- Kotlin coroutines for async operations
- Lifecycle-aware operations
- Supports Gradle dependency management

### React Native

- Requires React Native 0.60+
- Native module bridge for iOS/Android
- Unified JavaScript API
- Supports TurboModules

## SDK Versioning

SDK versions follow semantic versioning (major.minor.patch).

Check current version:

- **iOS**: Check Podfile.lock or Package.resolved
- **Android**: Check build.gradle dependencies
- **JavaScript**: Check package.json or package-lock.json

## Rate Limiting

SDK automatically handles rate limiting:

- Events are batched and sent efficiently
- Failed requests are retried with exponential backoff
- Network errors are handled gracefully

## Privacy & Security

- All data is encrypted in transit (HTTPS)
- No sensitive user data is collected by default
- GDPR and CCPA compliant
- User data can be deleted on request

## Support

For detailed API documentation, visit:

- iOS: https://github.com/clix-so/clix-ios-sdk
- Android: https://github.com/clix-so/clix-android-sdk
- React Native: https://github.com/clix-so/clix-react-native-sdk
