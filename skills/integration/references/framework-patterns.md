# Framework-Specific Integration Patterns (Mobile)

This document provides detailed patterns for integrating the Clix SDK into **mobile** frameworks and platforms:

- iOS (Swift)
- Android (Kotlin)
- Flutter
- React Native

Examples below are derived strictly from the official SDK source code (via Clix MCP `search_sdk`), with credentials shown as placeholders (`YOUR_PROJECT_ID`, `YOUR_PUBLIC_API_KEY`).

---

---

> **Note: Fallback Source**
> This document serves as a **fallback** when the Clix MCP Server is unavailable.
> Agents should **prioritize** using `search_sdk` to fetch the latest live patterns from the official SDK repositories before relying on these static examples.

---

## iOS (Swift)

### AppDelegate Pattern (UIKit)

**Reference**: `ClixConfig.swift` (from `clix-ios-sdk`)

```swift
import UIKit
import Clix

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Initialize ClixConfig with params
        let config = ClixConfig(
            projectId: ProcessInfo.processInfo.environment["CLIX_PROJECT_ID"] ?? "",
            apiKey: ProcessInfo.processInfo.environment["CLIX_PUBLIC_API_KEY"] ?? "",
            logLevel: .info // Optional: .debug, .info, .error
        )
        
        // Pass config to initialize
        try? Clix.initialize(config: config)
        
        return true
    }
}
```

### SwiftUI Pattern

```swift
import SwiftUI
import Clix

@main
struct MyApp: App {
    init() {
        let config = ClixConfig(
            projectId: ProcessInfo.processInfo.environment["CLIX_PROJECT_ID"] ?? "",
            apiKey: ProcessInfo.processInfo.environment["CLIX_PUBLIC_API_KEY"] ?? ""
        )
        try? Clix.initialize(config: config)
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

## Android (Kotlin)

**Reference**: `ClixConfig.kt` (from `clix-android-sdk`)

### Application Class Pattern

```kotlin
import android.app.Application
import so.clix.core.Clix
import so.clix.core.ClixConfig
import so.clix.utils.logging.ClixLogLevel

class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        val projectId = BuildConfig.CLIX_PROJECT_ID ?: ""
        val apiKey = BuildConfig.CLIX_PUBLIC_API_KEY ?: ""
        
        // Use Builder Pattern if available, or data class constructor
        val config = ClixConfig(
            projectId = projectId,
            apiKey = apiKey,
            logLevel = ClixLogLevel.INFO
        )
        
        Clix.initialize(this, config)
    }
}
```

## React Native

**Reference**: `index.js` (from `clix-react-native-sdk`)

### Root Component Pattern

```typescript
// App.tsx
import React, { useEffect } from 'react';
import { Clix } from '@clix-so/react-native-sdk'; // Note user scope @clix-so
import Config from 'react-native-config';

export default function App() {
  useEffect(() => {
    // Initialize takes a config object
    Clix.initialize({
      projectId: Config.CLIX_PROJECT_ID || '',
      apiKey: Config.CLIX_PUBLIC_API_KEY,
      // logLevel: 'info' // Optional
    });
  }, []);

  return (
    // Your app components
  );
}
```

## Flutter

**Reference**: `clix_config.dart` (from `clix-flutter-sdk`)

### Main Function Pattern

```dart
import 'package:clix_flutter/clix_flutter.dart';
import 'package:flutter/material.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  const projectId = String.fromEnvironment('CLIX_PROJECT_ID');
  const apiKey = String.fromEnvironment('CLIX_PUBLIC_API_KEY');

  // Initialize with ClixConfig object
  await Clix.initialize(
    ClixConfig(
      projectId: projectId,
      apiKey: apiKey,
      logLevel: ClixLogLevel.info,
    ),
  );

  runApp(const MyApp());
}
```

## Common Patterns

### Error Handling

Always wrap initialization in try-catch (Swift) or catch errors (Promise-based platforms):

```typescript
// React Native / Flutter
try {
  await Clix.initialize(config);
} catch (error) {
  console.error('Clix initialization failed:', error);
}
```

### Conditional Initialization

Only initialize in production or specific environments:

```typescript
if (!__DEV__) {
  Clix.initialize(config);
}
```
### Credentials

- Use placeholders like `YOUR_PROJECT_ID` and `YOUR_PUBLIC_API_KEY` in examples
- In real apps, load credentials from safe configuration (config files, build config, secret managers)
- Avoid hardcoding real credentials directly in source code or examples checked into version control
