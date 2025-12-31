---
name: Clix Integration
description: Integrates Clix Mobile SDK into iOS, Android, Flutter, and React Native projects. Provides step-by-step guidance for installation, initialization, and verification. Use when the user asks to install, setup, or configure Clix analytics.
version: 1.0.0
license: MIT
---

# Clix SDK Integration Skill

This skill provides comprehensive guidance for integrating Clix analytics SDK into mobile applications. Follow the workflow below to ensure proper installation and configuration.

## Integration Strategy (MCP First)

This skill follows an **"MCP First"** strategy to ensure agents always use the latest verified SDK source code.

**Step 1: Check for MCP Capability**
- Check if the Clix MCP Server tools (`clix-mcp-server:search_sdk`, `clix-mcp-server:search_docs`) are available in your toolset.

**Step 2: Primary Path (MCP Available)**
- **MUST** use `clix-mcp-server:search_sdk` to fetch exact initialization code for the target platform (e.g., `clix-mcp-server:search_sdk(query="initialize", platform="android")`).
- Use these fetched results as the **Single Source of Truth** for implementation.
- Do **NOT** rely on static examples if MCP returns valid results.

**Step 3: Fallback Path (MCP Unavailable)**
- If checks for `clix-mcp-server` fail:
  1. **Ask the user**: "The Clix MCP Server is not detected. It provides the latest official SDK code. Would you like me to install it now?"
  2. **If User says YES**:
     - Run: `bash scripts/install-mcp.sh`
     - Instruct user to restart their agent/IDE to load the new server.
     - Stop here (let user restart).
  3. **If User says NO**:
     - Fall back to using the static patterns in `references/framework-patterns.md` and `examples/`.
     - Inform the user: "Proceeding with static fallback examples (may be outdated)."

## Interaction Guidelines for Agents

When using this skill (for example inside Claude Code, Codex, Cursor, or other AI IDEs), follow these behaviors:

- **Start with reconnaissance**
  - Inspect the project structure first (list key files like `package.json`, `Podfile`, `build.gradle`, `pubspec.yaml`, `AppDelegate.swift`, `MainActivity.kt`, etc.)
  - Clearly state what you detected (e.g., “This looks like a React Native project with iOS and Android”)
- **Ask clarifying questions when needed**
  - If multiple platforms are present, ask the user which one(s) to integrate first
  - If the structure is unusual, ask before making assumptions
- **Explain each step briefly**
  - Before making changes, say what you are about to do and why (install dependency, update entrypoint, add config, etc.)
  - Keep explanations short but concrete, so the user understands the impact
- **Handle errors gracefully**
  - If a command or change fails, show the error, explain likely causes, and suggest concrete next steps
  - Avoid getting stuck in loops—propose a fallback if automation fails
- **End with a verification summary**
  - Summarize what was installed/modified (files touched, dependencies added)
  - Point out any remaining manual steps (e.g., Xcode capabilities, Firebase config, running the app to test)

## Integration Workflow

### Phase 1: Prerequisite — Credentials (User Setup)

Before continuing, the user must ensure the following environment variables are available to the app at runtime:

- `CLIX_PROJECT_ID`
- `CLIX_PUBLIC_API_KEY`

**How to get credentials:**
- Ask the user to visit `https://console.clix.so/` and copy the values for their Clix project.

**How to set credentials:**
- Add them to a local `.env` file (recommended), or to your framework’s env configuration (see `references/framework-patterns.md`).
- Ensure `.env` is in `.gitignore`.

**Security warning:**
- Do **not** paste credentials into chat. Enter them directly into the user’s terminal/editor.

### Phase 2: Project Type Detection

**Step 2.1: Identify Platform**

Examine the codebase structure to determine platform:
- **iOS**: Look for `.xcodeproj`, `Podfile`, `Info.plist`, Swift/Objective-C files
- **Android**: Look for `build.gradle`, `AndroidManifest.xml`, Kotlin/Java files
- **Flutter**: Look for `pubspec.yaml`, `lib/main.dart`, plus `ios/` and `android/` folders
- **React Native**: Look for `package.json` with React Native dependencies, `android/` and `ios/` folders
- **Other**: If it’s not one of the above, stop and ask the user—this skill is mobile-only.

**Step 2.2: Verify Detection**

Confirm platform detection with user if ambiguous:
- Multiple platforms detected (e.g., React Native has both iOS and Android)
- Unusual project structure
- Hybrid applications

### Phase 3: SDK Installation

**Step 3.1: Install SDK Package**

Install the appropriate SDK based on detected platform:

**iOS (Swift Package Manager):**
```swift
// Add to Package.swift or Xcode: https://github.com/clix-so/clix-ios-sdk
```

**iOS (CocoaPods):**
```ruby
# Add to Podfile
pod 'Clix', :git => 'https://github.com/clix-so/clix-ios-sdk.git'
```

**Android (Gradle):**
```kotlin
// Add to build.gradle.kts
implementation("so.clix:clix-android-sdk:latest")
```

**React Native:**
```bash
npm install @clix-so/react-native-sdk
# or
yarn add @clix-so/react-native-sdk
```

**Flutter:**
- Add the Clix Flutter SDK dependency in `pubspec.yaml`:
  ```yaml
  dependencies:
    clix_flutter: ^0.0.1
    firebase_core: ^3.6.0
    firebase_messaging: ^15.1.3
  ```
- If MCP tools (`search_docs`, `search_sdk`) are available, use them to confirm the latest package version and setup steps.

**Step 3.2: Verify Installation**

- Check that package appears in dependency files (`package.json`, `Podfile.lock`, `build.gradle`)
- Verify import/require statements work
- Check for installation errors

### Phase 4: SDK Initialization

**Step 4.1: Locate Entry Point**

Find the appropriate initialization location:
- **iOS**: `AppDelegate.swift` or `@main` app file
- **Android**: `Application.kt` or `Application.java` class
- **Flutter**: `lib/main.dart`
- **React Native**: Root component or `index.js`

**Step 4.2: Initialize SDK**

Add initialization code following platform-specific patterns (see examples/ directory):

**Key Requirements:**
- Initialize early in application lifecycle
- Use environment variables for credentials (never hardcode)
- Handle initialization errors gracefully
- Follow framework-specific best practices

**Step 4.3: Configure SDK**

Set up SDK configuration:
- Use `CLIX_PROJECT_ID` from environment variables
- Use `CLIX_PUBLIC_API_KEY` from environment variables
- Set appropriate environment (production/staging/development)
- Configure logging level if needed
- Enable/disable features as required

### Phase 5: Integration Verification

**Step 5.1: Code Review**

Verify integration completeness:
- SDK is imported/required correctly
- Initialization code is in correct location
- Credentials are loaded from environment variables
- Error handling is implemented
- No hardcoded credentials

**Step 5.2: Verify Integration**

Run validation checks:
- Execute `scripts/validate-sdk.sh` if available
- Check that SDK initializes without errors
- Verify environment variables are accessible
- Verify SDK is properly imported and initialized

**Step 5.3: Documentation**

Create or update documentation:
- Add integration notes to README.md
- Document environment variables needed
- Note any framework-specific considerations
- Update `.env.example` if it exists

## Framework-Specific Patterns

### iOS (Swift)

**Initialization Pattern:**
```swift
import Clix

@main
struct MyApp: App {
    init() {
        // Load credentials from your app configuration (do NOT hardcode).
        // Example: store values in Info.plist keys.
        let projectId = Bundle.main.object(forInfoDictionaryKey: "CLIX_PROJECT_ID") as? String ?? ""
        let apiKey = Bundle.main.object(forInfoDictionaryKey: "CLIX_PUBLIC_API_KEY") as? String

        let config = ClixConfig(projectId: projectId, apiKey: apiKey)
        Clix.initialize(config: config)
    }
}
```

**Key Points:**
- Initialize in `@main` app struct or `AppDelegate`
- Use environment variables, never hardcode
- Handle optional API key for analytics-only mode

### Android (Kotlin)

**Initialization Pattern:**
```kotlin
import so.clix.core.Clix
import so.clix.core.ClixConfig

class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        // Load credentials from BuildConfig (do NOT hardcode).
        val config = ClixConfig.Builder()
            .projectId(BuildConfig.CLIX_PROJECT_ID)
            .apiKey(BuildConfig.CLIX_PUBLIC_API_KEY)
            .build()
        
        Clix.initialize(this, config)
    }
}
```

**Key Points:**
- Initialize in `Application.onCreate()`
- Use `Application` context, not Activity context
- Register Application class in `AndroidManifest.xml`

### React Native

**Initialization Pattern:**
```typescript
import { Clix } from '@clix/react-native-sdk';
import Config from 'react-native-config';

// In App.tsx or index.js
Clix.initialize({
  projectId: Config.CLIX_PROJECT_ID || '',
  apiKey: Config.CLIX_PUBLIC_API_KEY,
});
```

**Key Points:**
- Initialize in root component
- Use `react-native-config` (or similar) for environment variables
- Link native dependencies if needed

### Flutter

**Initialization Pattern:**
```dart
import 'package:clix/clix.dart';

Future<void> main() async {
  // Load credentials from build-time configuration (do NOT hardcode).
  // Example:
  // flutter run --dart-define=CLIX_PROJECT_ID=... --dart-define=CLIX_PUBLIC_API_KEY=...
  const projectId = String.fromEnvironment('CLIX_PROJECT_ID');
  const apiKey = String.fromEnvironment('CLIX_PUBLIC_API_KEY');

  await Clix.initialize(
    ClixConfig(
      projectId: projectId,
      apiKey: apiKey,
    ),
  );

  runApp(const MyApp());
}
```

**Key Points:**
- Initialize before `runApp`
- Use `--dart-define` (or your chosen secret mechanism), never hardcode

## Error Handling

**Common Issues:**

1. **Missing Credentials**
   - Error: SDK fails to initialize
   - Solution: Verify `.env` file exists and contains required variables
   - Check: Environment variable names match exactly

2. **Wrong Initialization Location**
   - Error: SDK not tracking events
   - Solution: Ensure initialization happens before any SDK usage
   - Check: Initialization is in app entry point, not a component

3. **Environment Variables Not Loading**
   - Error: `undefined` or empty values
   - Solution: Verify env loading mechanism (dotenv, framework config, etc.)
   - Check: Variable names match framework requirements (prefixes)

## Best Practices

1. **Never hardcode credentials** - Always use environment variables
2. **Initialize early** - SDK should initialize before app starts or as early as possible
3. **Handle errors gracefully** - Wrap initialization in try-catch blocks
4. **Use appropriate environment** - Set production/staging/development based on build
5. **Verify integration** - Use validation scripts to verify SDK is properly integrated
6. **Document changes** - Update README and configuration files
7. **Version control** - Add `.env` to `.gitignore`, commit `.env.example`

## Progressive Disclosure

- **Level 1**: This SKILL.md file (always loaded)
- **Level 2**: `references/` directory (loaded when needed for specific topics)
- **Level 3**: `examples/` directory (loaded when framework-specific examples needed)
- **Level 4**: `scripts/` directory (executed directly, not loaded into context)

## References

For detailed information, see:
- `references/sdk-reference.md` - Complete SDK API documentation
- `references/framework-patterns.md` - Framework-specific integration patterns
- `references/error-handling.md` - Common errors and troubleshooting
- `references/mcp-integration.md` - Optional: MCP server usage guide (for tool-augmented mode)

## Examples

Working code examples available in `examples/` directory:
- `ios-integration.swift` - iOS integration (UIKit/SwiftUI)
- `android-integration.kt` - Android integration (Application)
- `flutter-integration.dart` - Flutter integration (main.dart)
- `react-native-integration.tsx` - React Native integration (App.tsx)

## Scripts

Utility scripts available in `scripts/` directory:
- `validate-sdk.sh` - Validate SDK installation and initialization (bash, deterministic)

Run scripts with `--help` first to see usage. Do not read source code unless customization is absolutely necessary.
