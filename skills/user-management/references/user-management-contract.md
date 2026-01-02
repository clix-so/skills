# Clix User Management Contract

## Contents

- Core concepts
- SDK surface (conceptual)
- User properties types
- Platform notes
- Pitfalls

## Core concepts

- **Anonymous user**: default when no user ID is set.
- **Identified user**: after setting user ID; historical activity is linked.
- **Multi-device**: user identity can be consistent across devices when using
  the same user ID.

## SDK surface (conceptual)

- `setUserId(userId)`
- `removeUserId()`
- `setUserProperty(key, value)`
- `setUserProperties(map)`
- `removeUserProperty(key)`
- `removeUserProperties(keys)`

## User properties types

Prefer JSON primitives:

- **string**
- **number**
- **boolean**

Avoid:

- `null` (inconsistent behavior)
- nested objects/arrays unless you intentionally stringify them
- PII unless explicitly approved

## Platform notes

- **iOS**: async + sync APIs exist; async is recommended.
- **Android**: suspend functions; internal device service maps user ID to a user
  property on the device backend.
- **React Native**: Promise-based APIs.
- **Flutter**: async APIs; user property model infers type and stringifies
  unsupported values.

## Pitfalls

- Calling `setUserId(null)` on logout (don’t).
- Setting user ID before login is confirmed (causes wrong attribution).
- Sending PII as user properties by default.
- Using unstable identifiers (email/phone) as user ID when an internal ID
  exists.
