---
title: Firebase google-services.json Setup
impact: CRITICAL
tags: android, firebase, fcm, google-services, configuration
platforms: android
---

# Firebase google-services.json Setup

Configure Firebase Cloud Messaging by adding `google-services.json` and applying the required Gradle plugin.

## Table of Contents
- [Quick Pattern](#quick-pattern)
- [When to Apply](#when-to-apply)
- [Deep Dive](#deep-dive)
- [Common Pitfalls](#common-pitfalls)
- [Troubleshooting](#troubleshooting)
- [Related Rules](#related-rules)
- [References](#references)

## Quick Pattern

**Incorrect: Missing google-services.json or plugin**

```gradle
// ❌ build.gradle - Plugin not applied
plugins {
    id 'com.android.application'
    // Missing: id 'com.google.gms.google-services'
}

dependencies {
    implementation 'com.google.firebase:firebase-messaging'
    // Configuration won't work without plugin!
}
```

```
app/
├── src/
└── build.gradle
    ❌ Missing: google-services.json
```

**Correct: google-services.json in place with plugin applied**

```gradle
// ✅ build.gradle - Plugin applied
plugins {
    id 'com.android.application'
    id 'com.google.gms.google-services' // ✅ Required!
}

dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging'
}
```

```
app/
├── src/
├── google-services.json  ✅ Present in app/ directory
└── build.gradle
```

## When to Apply

- **Setting up push notifications** for the first time
- **FCM token is null** or not generated
- **Build error**: "File google-services.json is missing"
- **No push notifications** received despite valid setup
- **Migrating** from other push notification services to FCM

## Deep Dive

### Why This Matters

`google-services.json` contains your Firebase project configuration:
- **Project ID**
- **Application ID**
- **API Keys**
- **FCM Sender ID**

Without this file:
- **FCM won't initialize**
- **No device tokens generated**
- **Push notifications completely broken**

### Step-by-Step Setup

#### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** or select existing project
3. Enter project name
4. Enable Google Analytics (optional)
5. Click **Create project**

#### 2. Add Android App to Firebase

1. In Firebase Console, click **Add app** → **Android**
2. Enter your **Android package name** (e.g., `com.myapp`)
   - **Must match** `applicationId` in `app/build.gradle`
   - Find in: `android { defaultConfig { applicationId "com.myapp" } }`
3. Enter app nickname (optional)
4. Enter SHA-1 certificate (optional, required for some features)
5. Click **Register app**

#### 3. Download google-services.json

1. Click **Download google-services.json**
2. **Move file to `app/` directory** of your Android project:

```
YourProject/
├── app/
│   ├── google-services.json  ← Place here!
│   ├── build.gradle
│   └── src/
├── build.gradle
└── settings.gradle
```

**IMPORTANT:** File must be in `app/` directory, **not** project root!

#### 4. Add Google Services Plugin

**Project-level `build.gradle`:**

```gradle
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.1.0'
        classpath 'com.google.gms:google-services:4.4.0' // ✅ Add this
    }
}
```

Or if using `settings.gradle` (newer Gradle):

```gradle
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
```

**App-level `build.gradle`:**

```gradle
plugins {
    id 'com.android.application'
    id 'com.google.gms.google-services' // ✅ Apply plugin
}

android {
    namespace 'com.myapp'
    compileSdk 34

    defaultConfig {
        applicationId "com.myapp" // ← Must match Firebase project
        minSdk 21
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }
}

dependencies {
    // ✅ Use BOM for version management
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging'
    implementation 'com.google.firebase:firebase-analytics' // Optional
}
```

#### 5. Sync and Build

```bash
# Sync Gradle files
./gradlew --refresh-dependencies

# Clean and build
./gradlew clean
./gradlew build
```

### Verifying Setup

#### Check FCM Token Generation

```kotlin
import com.google.firebase.messaging.FirebaseMessaging
import android.util.Log

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // ✅ Verify FCM token is generated
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val token = task.result
                Log.d("FCM", "✅ Token: $token")
                // Token generated successfully!
            } else {
                Log.e("FCM", "❌ Failed to get token", task.exception)
                // Check google-services.json and plugin setup
            }
        }
    }
}
```

#### Verify in Logcat

Look for logs like:

```
✅ Success:
D/FirebaseApp: Initialized Firebase

✅ Token generated:
D/FirebaseMessaging: Token: eABCD123...

❌ Failure:
E/FirebaseApp: Default FirebaseApp failed to initialize
E/FirebaseMessaging: Token retrieval failed
```

### Firebase BOM (Bill of Materials)

Use BOM to manage Firebase SDK versions:

```gradle
dependencies {
    // ✅ With BOM - automatic version management
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging' // No version needed
    implementation 'com.google.firebase:firebase-analytics'

    // ❌ Without BOM - manual version management
    // implementation 'com.google.firebase:firebase-messaging:23.3.1'
    // implementation 'com.google.firebase:firebase-analytics:21.5.0'
}
```

**Benefits:**
- Consistent versions across Firebase libraries
- Easier updates (change BOM version only)
- Prevents version conflicts

### Multiple Build Variants

If you have multiple build variants (dev, staging, prod):

```
app/
├── google-services.json (default)
├── src/
│   ├── dev/
│   │   └── google-services.json (dev variant)
│   ├── staging/
│   │   └── google-services.json (staging variant)
│   └── prod/
│       └── google-services.json (prod variant)
└── build.gradle
```

Plugin automatically selects correct file based on build variant.

### React Native Setup

```bash
# Install Firebase
npm install @react-native-firebase/app @react-native-firebase/messaging

# Download google-services.json from Firebase Console
# Place in: android/app/google-services.json
```

**android/build.gradle:**
```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

**android/app/build.gradle:**
```gradle
apply plugin: 'com.android.application'
apply plugin: 'com.google.gms.google-services' // ✅ Add this line
```

### Expo Setup

Expo handles Firebase configuration differently:

```javascript
// app.json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json" // ✅ Specify path
    }
  }
}
```

```bash
# Build with EAS
eas build --platform android
```

## Common Pitfalls

### 1. File in Wrong Directory

**Problem:**
```
project/
├── google-services.json  ❌ Wrong location!
└── app/
    └── build.gradle
```

**Solution:** Move to `app/` directory:
```
project/
└── app/
    ├── google-services.json  ✅ Correct location
    └── build.gradle
```

### 2. Package Name Mismatch

**Problem:**
```gradle
// build.gradle
applicationId "com.myapp.debug" // ❌ Doesn't match Firebase

// Firebase Console: Registered as "com.myapp"
```

**Error:**
```
Default FirebaseApp failed to initialize because no default options were found
```

**Solution:** Ensure `applicationId` exactly matches Firebase project:

```gradle
applicationId "com.myapp" // ✅ Must match Firebase
```

Or register multiple package names in Firebase Console.

### 3. Plugin Not Applied

**Problem:**
```gradle
// ❌ Plugin dependency added but not applied
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}

// Missing: apply plugin: 'com.google.gms.google-services'
```

**Solution:**
```gradle
plugins {
    id 'com.android.application'
    id 'com.google.gms.google-services' // ✅ Apply plugin
}
```

### 4. Plugin Applied Before Android Plugin

**Problem:**
```gradle
// ❌ Wrong order
plugins {
    id 'com.google.gms.google-services' // Applied first
    id 'com.android.application'
}
```

**Solution:**
```gradle
// ✅ Correct order
plugins {
    id 'com.android.application' // Android plugin first
    id 'com.google.gms.google-services' // Google services second
}
```

### 5. Using Wrong google-services.json

**Problem:** Using development file in production build, or vice versa.

**Solution:**
- Use build variants
- Verify Firebase project matches app environment
- Check `project_id` in JSON file

### 6. File Committed to Git

**Problem:** `google-services.json` contains sensitive data.

**Best Practice:**
```bash
# .gitignore
google-services.json # ✅ Don't commit to version control
```

Use environment variables or CI/CD secrets to inject file during builds.

## Troubleshooting

### Error: "File google-services.json is missing"

**Cause:** Plugin can't find configuration file.

**Solution:**
1. Verify file is in `app/` directory
2. File name is exactly `google-services.json` (case-sensitive)
3. Sync Gradle files
4. Clean and rebuild

### Error: "No matching client found"

**Cause:** `applicationId` doesn't match Firebase project.

**Solution:**
1. Check `applicationId` in `app/build.gradle`
2. Check package names in Firebase Console
3. Ensure they match exactly

### Token is Always Null

**Cause:** Firebase not initialized properly.

**Solution:**
1. Verify `google-services.json` is present
2. Check plugin is applied
3. Look for Firebase initialization errors in Logcat

## Related Rules

- [android-notification-channel.md](./android-notification-channel.md) - Create notification channels
- [android-permission.md](./android-permission.md) - Request notification permission
- [android-messaging-service.md](./android-messaging-service.md) - Implement messaging service
- [token-registration.md](./token-registration.md) - Register tokens with backend

## References

- [Firebase: Add Firebase to Android](https://firebase.google.com/docs/android/setup)
- [Firebase: Set Up FCM Client](https://firebase.google.com/docs/cloud-messaging/android/client)
- [Google Services Plugin](https://developers.google.com/android/guides/google-services-plugin)
